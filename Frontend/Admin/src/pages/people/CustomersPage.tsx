import { useState, useEffect } from 'react'
import { Users, Plus, Search, Phone, Mail, MapPin, Edit, Trash2, Save, Eye, Building, ShieldCheck, IndianRupee, FileText, CreditCard, Printer, Download } from 'lucide-react'
import { Button, Input, Textarea, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { getInvoicesForCustomer, getUnpaidInvoicesForCustomer, calcInvoiceGrandTotal, settleInvoicePayment, addPaymentReceiptRecord, getReceiptsForCustomer, POSInvoiceRecord, syncBackendInvoicesToSharedDB, syncBackendReceiptsToSharedDB } from '@/data/sharedData'
import { customerService } from '@/services/customerService'
import { invoiceService } from '@/services/invoiceService'
import { downloadInvoicePDF, buildPaymentReceiptVoucherHTML } from '@/utils/pdfGenerator'

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  type: 'INDIVIDUAL' | 'DOCTOR' | 'HOSPITAL' | 'CLINIC'
  streetAddress: string
  city: string
  state: string
  pincode: string
  gstin: string
  drugLicenseNo: string
  creditLimit: number
  outstandingBalance: number
  totalOrders: number
  totalSpend: number
  status: 'ACTIVE' | 'INACTIVE'
  notes: string
}

const seedCustomers: Customer[] = []

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  type: '' as Customer['type'],
  streetAddress: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  drugLicenseNo: '',
  creditLimit: '' as any,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  notes: ''
}

export function CustomersPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers)

  useEffect(() => {
    Promise.all([
      customerService.fetchCustomers().catch(() => null),
      invoiceService.fetchInvoices().catch(() => null),
      invoiceService.fetchAllReceipts().catch(() => null)
    ]).then(([custRes, invRes, recRes]) => {
      // 1. Process backend invoices
      if (invRes && invRes.data && Array.isArray(invRes.data)) {
        const syncedInvoices: POSInvoiceRecord[] = invRes.data.map((inv: any) => {
          const gTotal = inv.total_amount || 0
          const pAmount = inv.paid_amount !== undefined ? inv.paid_amount : (inv.payment_status === 'PAID' ? gTotal : 0)
          const issuedDate = inv.issuedAt || (inv.createdAt ? inv.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10))

          return {
            id: inv._id || inv.id,
            invoiceNumber: inv.order_number || inv.invoiceNumber,
            customer: inv.customer_name || inv.customer || 'Walk-in Customer',
            customerAddress: inv.shipping_address ? `${inv.shipping_address.address_line}, ${inv.shipping_address.city}` : 'N/A',
            customerGST: '—',
            customerPhone: '+91 98765 43210',
            paymentMethod: inv.payment_method || 'Cash',
            paymentStatus: inv.payment_status === 'PAID' ? 'PAID' : (inv.payment_status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID'),
            issuedAt: issuedDate,
            dueDate: issuedDate,
            paidAmount: pAmount,
            shippingCost: inv.shipping_cost || 0,
            notes: inv.notes || '',
            items: (inv.items || []).map((item: any, idx: number) => ({
              id: String(idx + 1),
              product: item.product_id?.name || item.product || 'Item ' + (idx + 1),
              hsn: '30049099',
              batch: item.batch || 'BAT-2026-001',
              qty: item.qty || 1,
              unit: item.unit || 'Pcs',
              unitPrice: Number(item.unit_price || item.product_id?.price || 0),
              discount: item.discount || 0,
              gstRate: item.gstRate || 12
            }))
          }
        })
        syncBackendInvoicesToSharedDB(syncedInvoices)
      }

      // 2. Process backend receipts
      if (recRes && recRes.data && Array.isArray(recRes.data)) {
        const syncedReceipts = recRes.data.map((r: any) => ({
          id: r._id || r.id,
          receiptNumber: r.receipt_number || r.receiptNumber,
          invoiceNumber: r.invoice_number || r.invoiceNumber,
          customer: r.customer_name || r.customer,
          amountCollected: r.amount_collected || r.amountCollected || 0,
          paymentMethod: r.payment_method || r.paymentMethod || 'Cash',
          timestamp: r.createdAt ? r.createdAt.replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16),
          notes: r.notes || ''
        }))
        syncBackendReceiptsToSharedDB(syncedReceipts)
      }

      // 3. Process Customers with dynamically calculated spend and order counts
      if (custRes && custRes.data && Array.isArray(custRes.data)) {
        const fetched: Customer[] = custRes.data.map((c: any) => {
          const custInvoices = getInvoicesForCustomer(c.name)
          const calcTotalSpend = custInvoices.reduce((acc, inv) => acc + calcInvoiceGrandTotal(inv), 0)
          const calcTotalOrders = custInvoices.length

          return {
            id: c._id || c.id,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            type: (c.type as any) || 'INDIVIDUAL',
            streetAddress: c.address || '',
            city: c.city || 'City',
            state: 'State',
            pincode: c.zip || '000000',
            gstin: c.tax_id || '—',
            drugLicenseNo: '—',
            creditLimit: c.credit_limit || 0,
            outstandingBalance: c.outstanding_balance !== undefined ? c.outstanding_balance : (c.balance || 0),
            totalOrders: calcTotalOrders,
            totalSpend: calcTotalSpend,
            status: c.status || 'ACTIVE',
            notes: ''
          }
        })

        setCustomers(prev => {
          const existingIds = new Set(prev.map(cust => cust.phone))
          const newCusts = fetched.filter(cust => !existingIds.has(cust.phone))
          return [...newCusts, ...prev]
        })
      }
    }).catch(err => console.warn('Could not fetch backend customer data:', err))
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  // Receive Customer Credit Payment Modal state
  const [payCustModal, setPayCustModal] = useState<Customer | null>(null)
  const [selectedInvoiceNum, setSelectedInvoiceNum] = useState<string>('')
  const [payCustAmount, setPayCustAmount] = useState<number>(0)
  const [payCustMethod, setPayCustMethod] = useState<string>('Cash')
  const [payCustRef, setPayCustRef] = useState<string>('')

  const [settlementReceiptModal, setSettlementReceiptModal] = useState<{
    receiptNumber: string
    invoiceNumber: string
    customer: string
    customerPhone?: string
    amountCollected: number
    paymentMethod: string
    timestamp: string
    remainingDue?: number
    notes?: string
  } | null>(null)

  const handleOpenPayCust = (cust: Customer, preselectInvNum?: string) => {
    setPayCustModal(cust)
    const unpaidInvoices = getUnpaidInvoicesForCustomer(cust.name)
    const targetInv = preselectInvNum
      ? unpaidInvoices.find(i => i.invoiceNumber === preselectInvNum)
      : unpaidInvoices[0]

    if (targetInv) {
      const grand = calcInvoiceGrandTotal(targetInv)
      const due = Math.max(0, grand - targetInv.paidAmount)
      setSelectedInvoiceNum(targetInv.invoiceNumber)
      setPayCustAmount(parseFloat(due.toFixed(2)))
    } else {
      setSelectedInvoiceNum('')
      setPayCustAmount(cust.outstandingBalance)
    }

    setPayCustMethod('Cash')
    setPayCustRef(`REC-2026-${Math.floor(100 + Math.random() * 900)}`)
  }

  const handleInvoiceDropdownChange = (invNum: string) => {
    setSelectedInvoiceNum(invNum)
    if (!invNum || !payCustModal) {
      setPayCustAmount(payCustModal?.outstandingBalance || 0)
      return
    }
    const target = getUnpaidInvoicesForCustomer(payCustModal.name).find(i => i.invoiceNumber === invNum)
    if (target) {
      const grand = calcInvoiceGrandTotal(target)
      const due = Math.max(0, grand - target.paidAmount)
      setPayCustAmount(parseFloat(due.toFixed(2)))
    }
  }

  const handleConfirmPayCust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payCustModal) return

    const amount = Math.max(0, Number(payCustAmount) || 0)
    if (amount <= 0) {
      showToast('Please enter a valid payment amount greater than 0', 'error')
      return
    }

    let realReceiptNum = payCustRef
    try {
      const res = await customerService.payCredit(payCustModal.id, amount, payCustMethod, selectedInvoiceNum || undefined)
      if (res && res.data && (res.data.receipt?.receipt_number || res.data.receipt_number)) {
        realReceiptNum = res.data.receipt?.receipt_number || res.data.receipt_number
      }
    } catch (err) {
      console.warn('Backend customer pay credit warning:', err)
    }

    if (selectedInvoiceNum) {
      settleInvoicePayment(selectedInvoiceNum, amount)
    }

    const receiptObj = {
      receiptNumber: realReceiptNum || payCustRef || `REC-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: selectedInvoiceNum || 'ACCOUNT-CREDIT',
      customer: payCustModal.name,
      customerPhone: payCustModal.phone,
      amountCollected: amount,
      paymentMethod: payCustMethod,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      remainingDue: Math.max(0, payCustModal.outstandingBalance - amount),
      notes: `Credit balance collected via ${payCustMethod}`
    }

    addPaymentReceiptRecord({
      id: Date.now().toString(),
      receiptNumber: receiptObj.receiptNumber,
      invoiceNumber: receiptObj.invoiceNumber,
      customer: receiptObj.customer,
      amountCollected: amount,
      paymentMethod: payCustMethod,
      timestamp: receiptObj.timestamp,
      notes: receiptObj.notes
    })

    setCustomers(prev =>
      prev.map(c => {
        if (c.id === payCustModal.id || c.name.toLowerCase().trim() === payCustModal.name.toLowerCase().trim()) {
          const newBal = Math.max(0, c.outstandingBalance - amount)
          return { ...c, outstandingBalance: newBal }
        }
        return c
      })
    )

    showToast(
      `Received ₹${amount.toLocaleString('en-IN')} from ${payCustModal.name}! ${
        selectedInvoiceNum ? `Updated Invoice ${selectedInvoiceNum}. ` : ''
      }Receipt Ref: ${receiptObj.receiptNumber}`,
      'success',
      'Credit Payment Collected'
    )
    setPayCustModal(null)
    setSettlementReceiptModal(receiptObj)
  }

  const customerSchema: ValidationSchema<typeof emptyForm> = {
    name: { required: 'Customer name is required' },
    phone: {
      required: 'Phone number is required',
      phone: 'Must be a valid 10-digit Indian number starting with 6-9'
    },
    email: { email: 'Invalid email address' },
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(form, customerSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pincode.includes(searchTerm) ||
    c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleCustomerStatus = async (cust: Customer) => {
    const newStatus = cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await customerService.updateCustomer(cust.id, { status: newStatus as any })
      showToast(`Customer "${cust.name}" status updated to ${newStatus}`, 'success')
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, status: newStatus } : c))
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer status', 'error')
    }
  }

  const openAdd = () => { setForm(emptyForm); setErrors({}); setIsAddOpen(true) }
  const openEdit = (c: Customer) => {
    setSelected(c)
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      type: c.type,
      streetAddress: c.streetAddress,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      gstin: c.gstin === '—' ? '' : c.gstin,
      drugLicenseNo: c.drugLicenseNo === '—' ? '' : c.drugLicenseNo,
      creditLimit: c.creditLimit,
      status: c.status || 'ACTIVE',
      notes: c.notes
    })
    setErrors({})
    setIsEditOpen(true)
  }
  const openDelete = (c: Customer) => { setSelected(c); setIsDeleteOpen(true) }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await customerService.createCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email,
        type: form.type as any,
        street_address: form.streetAddress,
        city: form.city,
        state: form.state,
        zip: form.pincode
      })
    } catch (err) {
      console.warn('Backend create customer warning:', err)
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      type: form.type,
      streetAddress: form.streetAddress,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      gstin: form.gstin || '—',
      drugLicenseNo: form.drugLicenseNo || '—',
      creditLimit: form.creditLimit,
      outstandingBalance: 0,
      totalOrders: 0,
      totalSpend: 0,
      status: form.status,
      notes: form.notes
    }
    setCustomers(p => [newCustomer, ...p])
    showToast(`Customer "${form.name}" registered successfully`, 'success')
    setIsAddOpen(false)
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!validate()) return
    setCustomers(p => p.map(c => {
      if (c.id === selected.id) {
        return {
          ...c,
          name: form.name,
          phone: form.phone,
          email: form.email,
          type: form.type,
          streetAddress: form.streetAddress,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          gstin: form.gstin || '—',
          drugLicenseNo: form.drugLicenseNo || '—',
          creditLimit: Number(form.creditLimit) || 0,
          notes: form.notes
        }
      }
      return c
    }))
    showToast(`Customer profile "${form.name}" updated`, 'success')
    setIsEditOpen(false)
  }

  const handleDelete = () => {
    if (!selected) return
    setCustomers(p => p.filter(c => c.id !== selected.id))
    showToast(`Customer "${selected.name}" removed`, 'info')
    setIsDeleteOpen(false)
  }
  const typeColors: Record<string, string> = {
    DOCTOR: 'bg-orbit-primary/5 dark:bg-orbit-primary/20 text-orbit-primary dark:text-orbit-primary-light border-orbit-primary/20 dark:border-orbit-primary/30',
    HOSPITAL: 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    CLINIC: 'bg-cyan-50 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
    INDIVIDUAL: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }

  const renderFormFields = () => (
    <div className="space-y-4">
      {/* Name & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name / Entity Name *"
          value={form.name}
          onChange={e => {
            setForm(p => ({ ...p, name: e.target.value }))
            setErrors(p => ({ ...p, name: undefined }))
          }}
          error={errors.name}
          placeholder="e.g. Dr. Ramesh Patel or St. Jude Hospital"
          required
        />
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Customer Category *</label>
          <select
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
            className={`w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 ${form.type === '' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}
          >
            <option value="" disabled hidden>Select customer category...</option>
            <option value="INDIVIDUAL">INDIVIDUAL (Retail Patient)</option>
            <option value="DOCTOR">DOCTOR (Prescribing Physician)</option>
            <option value="HOSPITAL">HOSPITAL (Institutional Account)</option>
            <option value="CLINIC">CLINIC (Healthcare Center)</option>
          </select>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone Number *"
          value={form.phone}
          maxLength={10}
          onChange={e => {
            const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10)
            setForm(p => ({ ...p, phone: sanitized }))
            setErrors(p => ({ ...p, phone: undefined }))
          }}
          error={errors.phone}
          placeholder="e.g. 9876543210"
          required
        />
        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={e => {
            setForm(p => ({ ...p, email: e.target.value }))
            setErrors(p => ({ ...p, email: undefined }))
          }}
          error={errors.email}
          placeholder="contact@entity.com"
        />
      </div>

      {/* DETAILED ADDRESS SECTION */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-orbit-primary-light" /> Detailed Address &amp; Location
        </span>

        <Input
          label="Street Address / Building / Suite *"
          value={form.streetAddress}
          onChange={e => setForm(p => ({ ...p, streetAddress: e.target.value }))}
          placeholder="e.g. Suite 402, Sunshine Medical Center, SV Road"
          required
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="City *"
            value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            placeholder="Mumbai"
            required
          />
          <Input
            label="State *"
            value={form.state}
            onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
            placeholder="Maharashtra"
            required
          />
          <Input
            label="Pincode *"
            value={form.pincode}
            onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
            placeholder="400058"
            required
          />
        </div>
      </div>

      {/* TAX & COMPLIANCE SECTION */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-orbit-primary-light" /> Tax &amp; Drug Compliance (Optional for Retail)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="GSTIN (Tax ID)"
            value={form.gstin}
            onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))}
            placeholder="e.g. 27AAACP1234A1Z5"
          />
          <Input
            label="Drug License (DL) Number"
            value={form.drugLicenseNo}
            onChange={e => setForm(p => ({ ...p, drugLicenseNo: e.target.value }))}
            placeholder="e.g. MH-MUM-20B-48291"
          />
        </div>
      </div>

      {/* Credit & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Input
          label="Allowed Credit Limit (₹)"
          type="number"
          value={form.creditLimit}
          onChange={e => setForm(p => ({ ...p, creditLimit: Number(e.target.value) }))}
          placeholder="10000"
        />
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Customer / Patient Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Special instructions or discount notes..."
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-slate-900 dark:text-slate-100 px-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
          />
        </div>
      </div>
    </div>
  )

  const PAGE_SIZE = 6
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customer &amp; Patient Directory</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Complete profiles with detailed addresses, GSTIN tax IDs, drug licenses, and credit accounts
          </p>
        </div>
        <Button onClick={openAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5">
          <Plus className="w-4 h-4" /> Add Detailed Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search by name, phone, pincode, city, or GSTIN..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="space-y-4">
        {paginated.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map(cust => (
              <div key={cust.id} className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-6 space-y-4 hover:border-orbit-primary/50 transition-all shadow-sm flex flex-col justify-between group">
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{cust.name}</h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeColors[cust.type] ?? typeColors.INDIVIDUAL}`}>
                        {cust.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={cust.status !== 'INACTIVE'}
                        onChange={() => handleToggleCustomerStatus(cust)}
                        activeText="Active"
                        inactiveText="Blocked"
                        size="sm"
                      />
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {cust.outstandingBalance > 0 && (
                          <button onClick={() => handleOpenPayCust(cust)} title="Receive Credit Payment" className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors font-bold">
                            <IndianRupee className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setViewCustomer(cust)} title="View Profile" className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(cust)} title="Edit Customer" className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDelete(cust)} title="Delete Customer" className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Contact & Address */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-orbit-primary-light shrink-0" />
                      <span className="font-semibold">{cust.phone}</span>
                    </div>
                    {cust.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Customers Found"
            description="There are no registered customers matching your search criteria."
            actionLabel="Add Customer"
            onAction={openAdd}
          />
        )}

        {/* Pagination */}
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm">
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* ── Add Customer Modal ── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="xl" title="Register New Customer" subtitle="Enter name, phone, detailed address, pincode, and tax details">
        <form noValidate onSubmit={handleAdd} className="space-y-5">
          {renderFormFields()}
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save Customer Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Customer Modal ── */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="xl" title="Edit Customer Profile" subtitle={`Updating: ${selected?.name}`}>
        <form noValidate onSubmit={handleEdit} className="space-y-5">
          {renderFormFields()}
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Update Customer Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Customer Profile Modal ── */}
      {viewCustomer && (
        <Modal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} size="lg" title={`Customer Profile: ${viewCustomer.name}`} subtitle={`Category: ${viewCustomer.type}`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block">PHONE &amp; EMAIL</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{viewCustomer.phone}</p>
                <p className="text-slate-500">{viewCustomer.email || 'No email registered'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">PURCHASE STATS</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">₹{viewCustomer.totalSpend.toLocaleString()} Total Spend</p>
                <p className="text-slate-500">{viewCustomer.totalOrders} total completed orders</p>
              </div>
            </div>

            {/* Address Box */}
            <div className="bg-orbit-primary/5/50 dark:bg-orbit-primary/50/5 p-4 rounded-xl border border-orbit-primary/20 dark:border-orbit-primary/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light block mb-1">Full Shipping &amp; Billing Address</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{viewCustomer.streetAddress}</p>
              <p className="text-slate-600 dark:text-slate-300">{viewCustomer.city}, {viewCustomer.state} – <strong className="font-mono text-slate-900 dark:text-slate-100">{viewCustomer.pincode}</strong></p>
            </div>

            {/* Tax & Drug License details */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block">GSTIN / TAX ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">{viewCustomer.gstin}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">DRUG LICENSE (DL)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">{viewCustomer.drugLicenseNo}</span>
              </div>
            </div>

            {viewCustomer.notes && (
              <div>
                <span className="text-slate-400 font-bold block mb-1">PATIENT / CUSTOMER NOTES</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800">{viewCustomer.notes}</p>
              </div>
            )}

            {/* Customer Invoices & Credit Ledger History */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center justify-between">
                <span>Invoices &amp; Credit Ledger History</span>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">({getInvoicesForCustomer(viewCustomer.name).length} Invoices)</span>
              </h4>
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {getInvoicesForCustomer(viewCustomer.name).length > 0 ? (
                  getInvoicesForCustomer(viewCustomer.name).map(inv => {
                    const grand = calcInvoiceGrandTotal(inv)
                    const due = Math.max(0, grand - inv.paidAmount)
                    return (
                      <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{inv.invoiceNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{inv.issuedAt} • {inv.items.length} items • {inv.paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">₹{grand.toFixed(2)}</p>
                          {due > 0.01 ? (
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <span className="text-[10px] font-bold text-rose-600 font-mono">Due: ₹{due.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const c = viewCustomer
                                  setViewCustomer(null)
                                  handleOpenPayCust(c, inv.invoiceNumber)
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition-colors"
                              >
                                Settle Bill
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">✓ Fully Paid</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="p-4 text-center text-slate-400 text-xs">No invoices recorded for this customer yet.</p>
                )}
              </div>
            </div>

            {/* Payment Receipts Issued Log */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>Payment Receipts Issued (`REC-2026-XXX`)</span>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">({getReceiptsForCustomer(viewCustomer.name).length} Receipts)</span>
              </h4>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl overflow-hidden divide-y divide-emerald-100 dark:divide-emerald-900/30">
                {getReceiptsForCustomer(viewCustomer.name).length > 0 ? (
                  getReceiptsForCustomer(viewCustomer.name).map(r => (
                    <div key={r.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                          {r.receiptNumber} <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">(Ref: {r.invoiceNumber})</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.timestamp} • {r.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">₹{r.amountCollected.toFixed(2)}</p>
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">✓ Voucher Logged</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-3.5 text-center text-slate-400 text-xs">No payment receipt vouchers recorded for this customer yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setViewCustomer(null)}>Close Profile</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Remove Customer" subtitle="This will remove the customer record">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Remove <span className="font-bold text-slate-900 dark:text-slate-100">{selected?.name}</span> from directory?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Remove</Button>
        </div>
      </Modal>

      {/* Collect Credit Payment Modal */}
      {payCustModal && (
        <Modal
          isOpen={!!payCustModal}
          onClose={() => setPayCustModal(null)}
          title={`Collect Credit Payment — ${payCustModal.name}`}
          subtitle={`Customer Type: ${payCustModal.type}`}
          size="md"
        >
          <form onSubmit={handleConfirmPayCust} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Limit:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">₹{payCustModal.creditLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-orbit-border font-bold text-xs">
                <span className="text-rose-600 dark:text-rose-400">Total Outstanding Balance Due:</span>
                <span className="text-rose-600 dark:text-rose-400 font-mono text-sm">₹{payCustModal.outstandingBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Unpaid / Partial Invoice Dropdown Selector */}
            {getUnpaidInvoicesForCustomer(payCustModal.name).length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Unpaid / Partial Invoice to Settle <span className="text-orbit-primary-light font-semibold">(Recommended)</span>
                </label>
                <select
                  value={selectedInvoiceNum}
                  onChange={e => handleInvoiceDropdownChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                >
                  <option value="">-- General Credit Account Settlement (No Specific Invoice) --</option>
                  {getUnpaidInvoicesForCustomer(payCustModal.name).map(inv => {
                    const grand = calcInvoiceGrandTotal(inv)
                    const due = Math.max(0, grand - inv.paidAmount)
                    return (
                      <option key={inv.id} value={inv.invoiceNumber}>
                        {inv.invoiceNumber} — Dated: {inv.issuedAt} (Balance Due: ₹{due.toFixed(2)})
                      </option>
                    )
                  })}
                </select>
                {selectedInvoiceNum ? (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Selected {selectedInvoiceNum}. Recording payment will settle this bill directly!
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Select a specific invoice to auto-fill its due balance and update its status.
                  </p>
                )}
              </div>
            )}

            <Input
              label="Payment Amount Collected (₹)"
              type="number"
              step="0.01"
              value={payCustAmount}
              onChange={e => setPayCustAmount(parseFloat(e.target.value) || 0)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Collection Mode
              </label>
              <select
                value={payCustMethod}
                onChange={e => setPayCustMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/Cheque)</option>
              </select>
            </div>

            <Input
              label="Payment Receipt / Reference #"
              value={payCustRef}
              onChange={e => setPayCustRef(e.target.value)}
              placeholder="e.g. REC-2026-088"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-orbit-border">
              <Button type="button" variant="outline" onClick={() => setPayCustModal(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold shadow-lg shadow-emerald-600/30">
                <ShieldCheck className="w-4 h-4" /> Collect &amp; Issue Receipt
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Settlement Receipt Voucher Modal ── */}
      {settlementReceiptModal && (
        <Modal
          isOpen={!!settlementReceiptModal}
          onClose={() => setSettlementReceiptModal(null)}
          size="lg"
          title={`Customer Payment Receipt: ${settlementReceiptModal.receiptNumber}`}
          subtitle={`Official settlement slip for ${settlementReceiptModal.customer}`}
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Amount Collected &amp; Received</span>
              <span className="font-mono font-black text-3xl text-emerald-600 dark:text-emerald-400 block my-1">
                ₹{settlementReceiptModal.amountCollected.toFixed(2)}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Payment Method: <strong>{settlementReceiptModal.paymentMethod}</strong> • {settlementReceiptModal.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">CUSTOMER</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{settlementReceiptModal.customer}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">INVOICE / REF</span>
                <span className="font-mono font-bold text-orbit-primary-light">{settlementReceiptModal.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">REMAINING OUTSTANDING BALANCE</span>
                <span className={`font-mono font-bold ${(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{(settlementReceiptModal.remainingDue || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">ACCOUNT STATUS</span>
                <span className={`font-bold ${(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'PARTIAL OUTSTANDING' : 'FULLY SETTLED (ZERO DUE)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const html = buildPaymentReceiptVoucherHTML(settlementReceiptModal)
                  const w = window.open('', '_blank')
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600) }
                }}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt Slip
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const html = buildPaymentReceiptVoucherHTML(settlementReceiptModal)
                  await downloadInvoicePDF(html, `${settlementReceiptModal.receiptNumber}.pdf`)
                  showToast(`Receipt ${settlementReceiptModal.receiptNumber}.pdf downloaded!`, 'success')
                }}
                className="bg-orbit-primary text-white gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF Receipt
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSettlementReceiptModal(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}

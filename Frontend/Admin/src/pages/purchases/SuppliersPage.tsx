import { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  CreditCard,
  Tag,
  Eye,
  Power,
  Grid,
  List,
  IndianRupee,
  AlertCircle,
  FileText,
  BadgeCheck,
  Printer,
  Download,
  Clock,
  PackageCheck,
  Coins
} from 'lucide-react'
import { Button, Input, Select, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { supplierService } from '@/services/supplierService'
import { purchaseOrderService } from '@/services/purchaseOrderService'
import { invoiceService } from '@/services/invoiceService'
import { downloadInvoicePDF, buildPaymentReceiptVoucherHTML } from '@/utils/pdfGenerator'
import { getStoredSupplierCategories } from './SupplierCategoriesPage'

// ─── Supplier Data Model ──────────────────────────────────────────────────────

export type SupplierCategory =
  | 'Finished Formulations'
  | 'API & Raw Materials'
  | 'Surgical & Consumables'
  | 'Nutraceuticals'
  | 'Cold Chain Biologics'

export type PaymentTerms = 'NET_15' | 'NET_30' | 'NET_45' | 'COD' | 'ADVANCE'

export type Supplier = {
  id: string
  supplierCode: string
  name: string
  category: SupplierCategory | string
  contactPerson: string
  designation?: string
  phone: string
  alternatePhone?: string
  email: string
  gstin: string
  drugLicenseNo?: string
  address: string
  city: string
  state: string
  pincode: string
  paymentTerms: PaymentTerms
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  creditLimit: number
  outstandingBalance: number
  status: 'ACTIVE' | 'INACTIVE'
  rating: number
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    supplierCode: 'SUP-2026-001',
    name: 'TeSt',
    category: 'Finished Formulations',
    contactPerson: 'Akhil r',
    designation: 'Sales Manager',
    phone: '8454545454',
    email: 'akhil1842002@gmail.com',
    gstin: '—',
    address: 'Mumbai, Maharashtra',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    paymentTerms: 'NET_30',
    creditLimit: 500000,
    outstandingBalance: 0,
    status: 'ACTIVE',
    rating: 4.5
  }
]

// ─── Default Form Values ──────────────────────────────────────────────────────

const defaultFormData: Omit<Supplier, 'id'> = {
  supplierCode: '',
  name: '',
  category: '' as SupplierCategory,
  contactPerson: '',
  designation: '',
  phone: '',
  alternatePhone: '',
  email: '',
  gstin: '',
  drugLicenseNo: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  paymentTerms: '' as PaymentTerms,
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  creditLimit: '' as any,
  outstandingBalance: '' as any,
  status: 'ACTIVE',
  rating: 5
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SuppliersPage() {
  const { showToast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>(seedSuppliers)
  const [rawPOs, setRawPOs] = useState<any[]>([])
  const [rawReceipts, setRawReceipts] = useState<any[]>([])

  // Vendor PO Settlement Modal state
  const [settlePoModal, setSettlePoModal] = useState<any | null>(null)
  const [settleAmount, setSettleAmount] = useState<string>('')
  const [settleMethod, setSettleMethod] = useState<string>('Bank Transfer')
  const [settleNotes, setSettleNotes] = useState<string>('')
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false)

  // Vendor Receipt Voucher Modal state
  const [vendorReceiptModal, setVendorReceiptModal] = useState<{ receipt: any; remainingDue: number } | null>(null)

  const loadData = () => {
    Promise.allSettled([
      supplierService.fetchSuppliers(),
      purchaseOrderService.fetchPurchaseOrders(),
      invoiceService.fetchAllReceipts()
    ]).then(([supRes, poRes, recRes]) => {
      let poList: any[] = []
      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        poList = Array.isArray(poRes.value.data) ? poRes.value.data : []
        setRawPOs(poList)
      }

      if (recRes.status === 'fulfilled' && recRes.value?.data) {
        const recList = Array.isArray(recRes.value.data) ? recRes.value.data : []
        setRawReceipts(recList)
      }

      const supplierDueMap = new Map<string, number>()
      poList.forEach((po: any) => {
        if (po.status !== 'CANCELLED') {
          const grandTotal = Number(po.total_amount || po.grandTotal || 0)
          const paidAmount = Number(po.paid_amount || po.amountPaid || 0)
          const due = Math.max(0, grandTotal - paidAmount)
          const supName = (po.supplier_name || po.supplier || '').toLowerCase().trim()
          if (supName) {
            supplierDueMap.set(supName, (supplierDueMap.get(supName) || 0) + due)
          }
        }
      })

      if (supRes.status === 'fulfilled' && supRes.value?.data && supRes.value.data.length > 0) {
        const fetched: Supplier[] = supRes.value.data.map((s: any) => {
          const supNameLower = (s.name || '').toLowerCase().trim()
          const dueBal = supplierDueMap.get(supNameLower) || 0
          return {
            id: s._id || s.id,
            supplierCode: s.supplier_code || `SUP-2026-${s._id?.slice(-3) || '001'}`,
            name: s.name,
            category: 'Finished Formulations',
            contactPerson: s.contact_person || 'N/A',
            designation: 'Sales Manager',
            phone: s.phone || 'N/A',
            alternatePhone: '',
            email: s.email || '',
            gstin: s.tax_id || '—',
            drugLicenseNo: '—',
            address: s.address || 'Mumbai',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            paymentTerms: (s.payment_terms as any) || 'NET_30',
            bankName: 'HDFC Bank',
            accountNumber: '•••• 8829',
            ifscCode: 'HDFC0001234',
            creditLimit: 500000,
            outstandingBalance: dueBal,
            status: 'ACTIVE',
            rating: 4.5
          }
        })
        setSuppliers(prev => {
          const updated = prev.map(p => {
            const dueBal = supplierDueMap.get(p.name.toLowerCase().trim()) || 0
            return { ...p, outstandingBalance: dueBal }
          })
          const existing = new Set(updated.map(sup => sup.name.toLowerCase().trim()))
          const newItems = fetched.filter(sup => !existing.has(sup.name.toLowerCase().trim()))
          return [...newItems, ...updated]
        })
      } else {
        setSuppliers(prev => prev.map(p => {
          const dueBal = supplierDueMap.get(p.name.toLowerCase().trim()) || 0
          return { ...p, outstandingBalance: dueBal }
        }))
      }
    }).catch(err => console.warn('Could not fetch backend suppliers/POs:', err))
  }

  useEffect(() => {
    loadData()
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID')
  const [currentPage, setCurrentPage] = useState(1)

  // Dynamic Supplier Categories State
  const [supplierCategories, setSupplierCategories] = useState<string[]>([])
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catErr, setCatErr] = useState('')

  useEffect(() => {
    const cats = getStoredSupplierCategories()
    setSupplierCategories(cats.map(c => c.name))
  }, [])

  const handleQuickAddCat = (e: React.FormEvent) => {
    e.preventDefault()
    setCatErr('')
    const trimmed = newCatName.trim()
    if (!trimmed) {
      setCatErr('Category name is required')
      return
    }
    if (supplierCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatErr(`Category "${trimmed}" already exists!`)
      showToast(`Category "${trimmed}" already exists!`, 'error')
      return
    }
    const updated = [trimmed, ...supplierCategories]
    setSupplierCategories(updated)
    setFormData(p => ({ ...p, category: trimmed as any }))
    setNewCatName('')
    setNewCatDesc('')
    setCatErr('')
    setIsAddCatModalOpen(false)
    showToast(`Supplier Category "${trimmed}" created & auto-selected!`, 'success')
  }

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const supplierPOs = useMemo(() => {
    if (!viewSupplier) return []
    const sName = viewSupplier.name.toLowerCase().trim()
    return rawPOs.filter((po: any) => {
      const pName = (po.supplier_name || po.supplierName || po.supplier || '').toLowerCase().trim()
      return pName.includes(sName) || sName.includes(pName)
    })
  }, [viewSupplier, rawPOs])

  const supplierReceipts = useMemo(() => {
    if (!viewSupplier) return []
    const sName = viewSupplier.name.toLowerCase().trim()
    const poNums = new Set(supplierPOs.map((po: any) => po.po_number || po.poNumber))
    return rawReceipts.filter((r: any) => {
      const cName = (r.customer_name || r.customer || r.supplierName || '').toLowerCase().trim()
      return cName.includes(sName) || sName.includes(cName) || poNums.has(r.invoice_number || r.invoiceNumber)
    })
  }, [viewSupplier, supplierPOs, rawReceipts])

  const supplierTotalSpend = useMemo(() => {
    return supplierPOs.reduce((acc: number, po: any) => acc + Number(po.total_amount || po.grandTotal || po.totalAmount || 0), 0)
  }, [supplierPOs])

  const supplierCompletedCount = useMemo(() => {
    return supplierPOs.filter((po: any) => po.status === 'RECEIVED' || po.status === 'CLOSED').length
  }, [supplierPOs])

  const supplierPendingCount = useMemo(() => {
    return supplierPOs.filter((po: any) => po.status === 'ORDERED' || po.status === 'PENDING').length
  }, [supplierPOs])

  const handlePrintVendorReceipt = (r: any) => {
    const remainingDue = r.remainingDue !== undefined ? r.remainingDue : 0
    const html = buildPaymentReceiptVoucherHTML({
      receiptNumber: r.receiptNumber || r.receipt_number,
      invoiceNumber: r.invoiceNumber || r.invoice_number,
      customer: r.customer || r.customer_name || r.supplierName || viewSupplier?.name || 'Vendor Supplier',
      amountCollected: Number(r.amountCollected || r.amount_collected || 0),
      paymentMethod: r.paymentMethod || r.payment_method || 'Bank Transfer',
      timestamp: r.timestamp || new Date().toLocaleString(),
      notes: r.notes,
      remainingDue,
      isVendor: true
    })
    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.write(html)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => printWin.print(), 300)
    }
  }

  const handleDownloadVendorReceiptPDF = async (r: any) => {
    const remainingDue = r.remainingDue !== undefined ? r.remainingDue : 0
    const html = buildPaymentReceiptVoucherHTML({
      receiptNumber: r.receiptNumber || r.receipt_number,
      invoiceNumber: r.invoiceNumber || r.invoice_number,
      customer: r.customer || r.customer_name || r.supplierName || viewSupplier?.name || 'Vendor Supplier',
      amountCollected: Number(r.amountCollected || r.amount_collected || 0),
      paymentMethod: r.paymentMethod || r.payment_method || 'Bank Transfer',
      timestamp: r.timestamp || new Date().toLocaleString(),
      notes: r.notes,
      remainingDue,
      isVendor: true
    })
    await downloadInvoicePDF(html, `${r.receiptNumber || r.receipt_number}_Voucher.pdf`)
  }

  const handleSettlePOPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settlePoModal) return
    const payAmt = parseFloat(settleAmount)
    if (isNaN(payAmt) || payAmt <= 0) {
      showToast('Please enter a valid payment amount greater than 0', 'error')
      return
    }

    try {
      setIsSubmittingSettle(true)
      const res = await purchaseOrderService.payPurchaseOrder(settlePoModal.id, {
        amount_paid: payAmt,
        payment_method: settleMethod,
        notes: settleNotes
      })

      if (res && res.success) {
        showToast(`Payment of ₹${payAmt} recorded for PO #${settlePoModal.poNumber}`, 'success')

        const remainingDue = Math.max(0, settlePoModal.dueAmount - payAmt)

        // Update local POs
        setRawPOs(prev => prev.map(po => {
          const poId = po._id || po.id
          if (poId === settlePoModal.id || po.po_number === settlePoModal.poNumber) {
            const newPaid = (po.paid_amount || 0) + payAmt
            return {
              ...po,
              paid_amount: newPaid,
              payment_status: newPaid >= (po.total_amount || 0) - 0.01 ? 'PAID' : 'PARTIAL'
            }
          }
          return po
        }))

        // Update supplier balance
        setSuppliers(prev => prev.map(s => {
          if (s.name.toLowerCase().trim() === settlePoModal.supplierName.toLowerCase().trim()) {
            return { ...s, outstandingBalance: Math.max(0, s.outstandingBalance - payAmt) }
          }
          return s
        }))

        const receiptData = res.receipt || {
          receiptNumber: `REC-PO-2026-${Math.floor(100 + Math.random() * 900)}`,
          invoiceNumber: settlePoModal.poNumber,
          customer: settlePoModal.supplierName,
          amountCollected: payAmt,
          paymentMethod: settleMethod,
          timestamp: new Date().toLocaleString(),
          notes: settleNotes || `Vendor payment settlement for PO #${settlePoModal.poNumber}`
        }

        setRawReceipts(prev => [receiptData, ...prev])

        setVendorReceiptModal({
          receipt: receiptData,
          remainingDue
        })

        setSettlePoModal(null)
        setSettleAmount('')
        setSettleNotes('')
      } else {
        showToast(res?.message || 'Error recording vendor payment', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to settle purchase order payment', 'error')
    } finally {
      setIsSubmittingSettle(false)
    }
  }

  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>(defaultFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof defaultFormData, string>>>({})

  const supplierSchema: ValidationSchema<typeof defaultFormData> = {
    supplierCode: { required: 'Supplier code is required' },
    name: { required: 'Supplier name is required' },
    contactPerson: { required: 'Contact person is required' },
    phone: {
      required: 'Phone number is required',
      phone: 'Must be a valid 10-digit Indian number starting with 6-9'
    },
    alternatePhone: {
      custom: (val) => {
        if (val && !/^[6-9]\d{9}$/.test(val.trim())) {
          return 'Must be a valid 10-digit Indian number starting with 6-9'
        }
        return undefined
      }
    },
    email: { email: 'Invalid email address' },
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, supplierSchema)
    setErrors(newErrors)
    return isValid
  }

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = suppliers.length
    const active = suppliers.filter(s => s.status === 'ACTIVE').length
    const inactive = suppliers.filter(s => s.status === 'INACTIVE').length
    const totalPayables = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0)
    return { total, active, inactive, totalPayables }
  }, [suppliers])

  // Filtered List
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.gstin.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter
      const matchCategory = categoryFilter === 'ALL' || s.category === categoryFilter

      return matchSearch && matchStatus && matchCategory
    })
  }, [suppliers, searchTerm, statusFilter, categoryFilter])

  // Pagination
  const PAGE_SIZE = 6
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSuppliers.slice(start, start + PAGE_SIZE)
  }, [filteredSuppliers, currentPage])

  // Quick Active/Inactive Toggle
  const handleToggleStatus = (supplier: Supplier) => {
    const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setSuppliers(prev =>
      prev.map(s => (s.id === supplier.id ? { ...s, status: newStatus } : s))
    )
    showToast(
      `Supplier "${supplier.name}" status updated to ${newStatus}`,
      newStatus === 'ACTIVE' ? 'success' : 'info'
    )
  }

  // Open Handlers
  const handleOpenAdd = () => {
    const nextCode = `SUP-2026-${String(suppliers.length + 1).padStart(3, '0')}`
    setFormData({ ...defaultFormData, supplierCode: nextCode })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    const { id, ...rest } = supplier
    setFormData(rest)
    setErrors({})
    setIsEditOpen(true)
  }

  const handleOpenDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteOpen(true)
  }

  // Submit Handlers
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await supplierService.createSupplier({
        name: formData.name,
        contact_person: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: `${formData.address}, ${formData.city}`,
        tax_id: formData.gstin,
        payment_terms: formData.paymentTerms
      })
    } catch (err) {
      console.warn('Backend create supplier warning:', err)
    }

    const newSupplier: Supplier = {
      id: Date.now().toString(),
      ...formData
    }

    setSuppliers(prev => [newSupplier, ...prev])
    showToast(`Supplier "${formData.name}" added successfully!`, 'success')
    setIsAddOpen(false)
  }

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) return
    if (!validate()) return

    setSuppliers(prev =>
      prev.map(s => (s.id === selectedSupplier.id ? { ...s, ...formData } : s))
    )
    showToast(`Supplier "${formData.name}" details updated`, 'success')
    setIsEditOpen(false)
  }

  const handleDeleteSupplier = () => {
    if (!selectedSupplier) return
    setSuppliers(prev => prev.filter(s => s.id !== selectedSupplier.id))
    showToast(`Supplier "${selectedSupplier.name}" removed from directory`, 'info')
    setIsDeleteOpen(false)
  }

  // Reusable Form Fields Helper
  const renderSupplierForm = () => (
    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
      {/* 1. Company Information */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-orbit-border space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-2 border-b border-orbit-border pb-2">
          <Building2 className="w-4 h-4" /> 1. Company Identification &amp; Category
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Supplier Code"
            value={formData.supplierCode}
            onChange={e => {
              setFormData(p => ({ ...p, supplierCode: e.target.value }))
              setErrors(p => ({ ...p, supplierCode: undefined }))
            }}
            error={errors.supplierCode}
            placeholder="e.g. SUP-2026-006"
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Company / Vendor Name"
              value={formData.name}
              onChange={e => {
                setFormData(p => ({ ...p, name: e.target.value }))
                setErrors(p => ({ ...p, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. Pfizer Healthcare Ltd"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <Select
              label="Supply Category"
              placeholder="Select Supply Category"
              value={formData.category}
              onChange={e => setFormData(p => ({ ...p, category: e.target.value as SupplierCategory }))}
              options={supplierCategories.map(c => ({ label: c, value: c }))}
              onQuickAdd={() => setIsAddCatModalOpen(true)}
              quickAddLabel="+ Add Supplier Category"
              required
            />
          </div>
          <div className="pb-1">
            <ToggleSwitch
              label="Supplier Status"
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(p => ({ ...p, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>
        </div>
      </div>

      {/* 2. Primary Contact Person */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-orbit-border space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-2 border-b border-orbit-border pb-2">
          <Phone className="w-4 h-4" /> 2. Contact Representative Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person Name"
            value={formData.contactPerson}
            onChange={e => {
              setFormData(p => ({ ...p, contactPerson: e.target.value }))
              setErrors(p => ({ ...p, contactPerson: undefined }))
            }}
            error={errors.contactPerson}
            placeholder="e.g. Priya Sharma"
            required
          />
          <Input
            label="Designation / Role"
            value={formData.designation}
            onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))}
            placeholder="e.g. Key Account Manager"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Primary Phone"
            value={formData.phone}
            maxLength={10}
            onChange={e => {
              const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10)
              setFormData(p => ({ ...p, phone: sanitized }))
              setErrors(p => ({ ...p, phone: undefined }))
            }}
            error={errors.phone}
            placeholder="e.g. 9876543210"
            required
          />
          <Input
            label="Alternate Phone"
            value={formData.alternatePhone}
            maxLength={10}
            onChange={e => {
              const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10)
              setFormData(p => ({ ...p, alternatePhone: sanitized }))
              setErrors(p => ({ ...p, alternatePhone: undefined }))
            }}
            error={errors.alternatePhone}
            placeholder="e.g. 9123456789"
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={e => {
              setFormData(p => ({ ...p, email: e.target.value }))
              setErrors(p => ({ ...p, email: undefined }))
            }}
            error={errors.email}
            placeholder="orders@supplier.com"
            required
          />
        </div>
      </div>

      {/* 3. Tax & License */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-orbit-border space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-2 border-b border-orbit-border pb-2">
          <ShieldCheck className="w-4 h-4" /> 3. GSTIN &amp; Regulatory Drug License
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="GSTIN Number"
            value={formData.gstin}
            onChange={e => setFormData(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
            placeholder="27AAAAA0000A1Z5"
          />
          <Input
            label="Drug License Number (20B/21B)"
            value={formData.drugLicenseNo}
            onChange={e => setFormData(p => ({ ...p, drugLicenseNo: e.target.value }))}
            placeholder="20B/21B-MH-MUM-12345"
          />
        </div>
      </div>

      {/* 4. Address Details */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-orbit-border space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-2 border-b border-orbit-border pb-2">
          <MapPin className="w-4 h-4" /> 4. Registered Office &amp; Address
        </h4>
        <Input
          label="Street Address"
          value={formData.address}
          onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
          placeholder="Building, Street, Industrial Estate"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="City"
            value={formData.city}
            onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
            placeholder="Mumbai"
          />
          <Input
            label="State"
            value={formData.state}
            onChange={e => setFormData(p => ({ ...p, state: e.target.value }))}
            placeholder="Maharashtra"
          />
          <Input
            label="Pincode"
            value={formData.pincode}
            onChange={e => setFormData(p => ({ ...p, pincode: e.target.value }))}
            placeholder="400001"
          />
        </div>
      </div>

      {/* 5. Financials & Banking */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-orbit-border space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-2 border-b border-orbit-border pb-2">
          <CreditCard className="w-4 h-4" /> 5. Banking Details &amp; Credit Limits
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Terms
            </label>
            <select
              value={formData.paymentTerms}
              onChange={e => setFormData(p => ({ ...p, paymentTerms: e.target.value as PaymentTerms }))}
              className={`w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 ${formData.paymentTerms === '' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}
            >
              <option value="" disabled hidden>Select payment terms...</option>
              <option value="NET_15">Net 15 Days</option>
              <option value="NET_30">Net 30 Days</option>
              <option value="NET_45">Net 45 Days</option>
              <option value="COD">Cash On Delivery (COD)</option>
              <option value="ADVANCE">Advance Payment</option>
            </select>
          </div>
          <Input
            label="Credit Limit (₹)"
            type="number"
            value={formData.creditLimit}
            onChange={e => setFormData(p => ({ ...p, creditLimit: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
          />
          <Input
            label="Outstanding Balance (₹)"
            type="number"
            value={formData.outstandingBalance}
            onChange={e => setFormData(p => ({ ...p, outstandingBalance: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Bank Name"
            value={formData.bankName}
            onChange={e => setFormData(p => ({ ...p, bankName: e.target.value }))}
            placeholder="e.g. HDFC Bank"
          />
          <Input
            label="Account Number"
            value={formData.accountNumber}
            onChange={e => setFormData(p => ({ ...p, accountNumber: e.target.value }))}
            placeholder="50200012345678"
          />
          <Input
            label="IFSC Code"
            value={formData.ifscCode}
            onChange={e => setFormData(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
            placeholder="HDFC0000060"
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Supplier Directory &amp; Vendor Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Pharmaceutical distributors, active/inactive vendor directory, GSTIN compliance, and credit balance records
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5"
        >
          <Plus className="w-4 h-4" /> Add New Supplier
        </Button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Vendors</span>
            <Building2 className="w-4 h-4 text-orbit-primary-light" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{metrics.total}</p>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Suppliers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{metrics.active}</p>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inactive Vendors</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-2">{metrics.inactive}</p>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Payables</span>
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-2">₹{metrics.totalPayables.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">

        {/* Compact Search Input */}
        <div className="relative w-full md:w-72">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search supplier, code, GSTIN, city..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-orbit-border">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-orbit-surface text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> Active ({metrics.active})
            </button>
            <button
              onClick={() => { setStatusFilter('INACTIVE'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> Inactive ({metrics.inactive})
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {supplierCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 p-0.5">
            <button
              onClick={() => setViewMode('GRID')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'GRID' ? 'bg-white dark:bg-orbit-surface text-orbit-primary-light dark:text-orbit-primary-light shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Table View"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'TABLE' ? 'bg-white dark:bg-orbit-surface text-orbit-primary-light dark:text-orbit-primary-light shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Grid View vs Table View */}
      {viewMode === 'GRID' ? (
        filteredSuppliers.length === 0 ? (
          <EmptyState
            title="No Suppliers Found"
            description="There are no active or registered suppliers matching your search criteria."
            actionLabel="Add New Supplier"
            onAction={handleOpenAdd}
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedSuppliers.map(sup => (
            <div
              key={sup.id}
              className={`bg-white dark:bg-orbit-surface border rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all relative ${
                sup.status === 'INACTIVE'
                  ? 'border-slate-200 dark:border-orbit-border opacity-75 grayscale-[0.2]'
                  : 'border-slate-200 dark:border-orbit-border hover:border-orbit-primary/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light border border-orbit-primary/20 dark:border-orbit-primary/30">
                      {sup.supplierCode}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      ★ {sup.rating}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mt-1.5 line-clamp-1">
                    {sup.name}
                  </h3>
                  <p className="text-xs text-orbit-primary-light dark:text-orbit-primary-light font-medium">
                    {sup.contactPerson} <span className="text-slate-400 font-normal">({sup.designation})</span>
                  </p>
                </div>

                <ToggleSwitch
                  checked={sup.status === 'ACTIVE'}
                  onChange={() => handleToggleStatus(sup)}
                  size="sm"
                />
              </div>

              {/* Category Pill */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-orbit-border">
                <Tag className="w-3 h-3 text-slate-400" />
                {sup.category}
              </div>

              {/* Contact Details */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-orbit-border">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.city}, {sup.state}</span>
                </div>
              </div>

              {/* Tax & Financial Strip */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-orbit-border text-[11px] grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">GSTIN</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sup.gstin || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Balance Payable</span>
                  <span className={`font-mono font-bold ${sup.outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                    ₹{sup.outstandingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-orbit-border text-xs">
                <button
                  onClick={() => setViewSupplier(sup)}
                  className="inline-flex items-center gap-1 text-orbit-primary-light dark:text-orbit-primary-light font-semibold hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    title="Edit Supplier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(sup)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove Supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
        )
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
                <tr>
                  <th className="px-6 py-4">Code &amp; Supplier Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Contact Person</th>
                  <th className="px-6 py-4">GSTIN / Drug Lic.</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Outstanding</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
                {paginatedSuppliers.length === 0 ? (
                  <EmptyState
                    colSpan={8}
                    title="No Suppliers Found"
                    description="There are no active or registered suppliers matching your search criteria."
                    actionLabel="Add New Supplier"
                    onAction={handleOpenAdd}
                  />
                ) : (
                  paginatedSuppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light">
                          {sup.supplierCode}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{sup.name}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {sup.category}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{sup.contactPerson}</p>
                      <p className="text-[11px] text-slate-400">{sup.phone}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <p className="text-slate-800 dark:text-slate-200 font-semibold">{sup.gstin || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{sup.drugLicenseNo || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {sup.city}, {sup.state}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-xs whitespace-nowrap">
                      ₹{sup.outstandingBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ToggleSwitch
                        checked={sup.status === 'ACTIVE'}
                        onChange={() => handleToggleStatus(sup)}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewSupplier(sup)}
                          className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg"
                          title="Edit Supplier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(sup)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                          title="Remove Supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Showing {paginatedSuppliers.length} of {filteredSuppliers.length} suppliers
        </span>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSuppliers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ─── Add Supplier Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        size="4xl"
        title="Add New Supplier"
        subtitle="Register a new pharmaceutical vendor, distributor, or manufacturer"
      >
        <form noValidate onSubmit={handleCreateSupplier} className="space-y-4">
          {renderSupplierForm()}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Register Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit Supplier Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        size="4xl"
        title="Edit Supplier"
        subtitle={`Updating details for: ${selectedSupplier?.name}`}
      >
        <form noValidate onSubmit={handleUpdateSupplier} className="space-y-4">
          {renderSupplierForm()}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Quick Add Supplier Category Modal ─────────────────────────────── */}
      <Modal
        isOpen={isAddCatModalOpen}
        onClose={() => setIsAddCatModalOpen(false)}
        size="md"
        title="Quick Add Supplier Category"
        subtitle="Add a new category classification to supplier dropdown"
      >
        <form noValidate onSubmit={handleQuickAddCat} className="space-y-4">
          <Input
            label="Category Name"
            value={newCatName}
            onChange={(e) => {
              setNewCatName(e.target.value)
              setCatErr('')
            }}
            error={catErr}
            placeholder="e.g. Biologicals & Serums"
            required
          />
          <Input
            label="Brief Description (Optional)"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
            placeholder="e.g. Temperature controlled vaccines and blood products"
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save &amp; Select
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── View Supplier Details Drawer Modal ─────────────────────────────── */}
      {viewSupplier && (
        <Modal
          isOpen={!!viewSupplier}
          onClose={() => setViewSupplier(null)}
          size="4xl"
          title={`Supplier Profile: ${viewSupplier.name}`}
          subtitle={`Supplier Code: ${viewSupplier.supplierCode}`}
        >
          <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
            {/* Header Card */}
            <div className="bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{viewSupplier.name}</h3>
                <p className="text-xs text-orbit-primary-light dark:text-orbit-primary-light font-semibold mt-0.5">{viewSupplier.category}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{viewSupplier.address}, {viewSupplier.city}, {viewSupplier.state}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleStatus(viewSupplier)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    viewSupplier.status === 'ACTIVE'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {viewSupplier.status}
                </button>
              </div>
            </div>

            {/* 4 Procurement KPI Cards for Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Procurement Spend</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">₹{supplierTotalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{supplierPOs.length} Total POs</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed POs</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{supplierCompletedCount} Received</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Stock in inventory</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Active POs</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{supplierPendingCount} Pending</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Shipment in transit</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Balance Payable</span>
                <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">₹{viewSupplier.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Pending supplier dues</span>
              </div>
            </div>

            {/* Contact & Tax Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Contact Representative</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">{viewSupplier.contactPerson}</p>
                <p className="text-orbit-primary-light font-medium">{viewSupplier.designation || 'Sales Representative'}</p>
                <p className="text-slate-600 dark:text-slate-300 font-mono">Phone: {viewSupplier.phone}</p>
                <p className="text-slate-600 dark:text-slate-300 truncate">Email: {viewSupplier.email}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax &amp; Drug Compliance</span>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[10px]">GSTIN Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{viewSupplier.gstin || 'Not Provided'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[10px]">Drug License No:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{viewSupplier.drugLicenseNo || 'Not Provided'}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financials &amp; Bank Info</span>
                <p className="text-slate-600 dark:text-slate-300 font-medium">Terms: <strong>{viewSupplier.paymentTerms}</strong></p>
                <p className="text-slate-600 dark:text-slate-300 font-mono">Bank: {viewSupplier.bankName || 'HDFC Bank'}</p>
                <p className="text-slate-600 dark:text-slate-300 font-mono">IFSC: {viewSupplier.ifscCode || 'HDFC0001234'}</p>
                <p className="text-slate-600 dark:text-slate-300 font-mono">Credit Limit: ₹{viewSupplier.creditLimit.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* ── Purchase Orders & Procurement Ledger Table ── */}
            <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-orbit-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-orbit-primary-light" /> Purchase Orders Ledger ({supplierPOs.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">Live purchase order breakdown, amounts paid, and outstanding dues</p>
                </div>
              </div>

              {supplierPOs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-orbit-border bg-slate-50/50 dark:bg-slate-900/40 text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2.5">PO Number &amp; Date</th>
                        <th className="px-4 py-2.5">Items &amp; PO Status</th>
                        <th className="px-4 py-2.5">Grand Total</th>
                        <th className="px-4 py-2.5">Paid / Due Amount</th>
                        <th className="px-4 py-2.5">Payment Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
                      {supplierPOs.map((po: any) => {
                        const grandTotal = Number(po.total_amount || po.grandTotal || po.totalAmount || 0)
                        const paidAmount = Number(po.paid_amount || po.amountPaid || 0)
                        const dueAmount = Math.max(0, grandTotal - paidAmount)
                        const poNum = po.po_number || po.poNumber || `PO-${po._id?.slice(-6) || '000'}`
                        const pStatus = po.payment_status || (paidAmount >= grandTotal - 0.01 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID')

                        return (
                          <tr key={po._id || po.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-mono font-bold text-orbit-primary-light">{poNum}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{po.order_date || po.orderDate || po.date || 'Today'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{po.items?.length || po.itemsCount || 1} line items</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {po.status || 'ORDERED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              ₹{grandTotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px]">
                              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Paid: ₹{paidAmount.toFixed(2)}</p>
                              {dueAmount > 0.01 && <p className="text-rose-600 dark:text-rose-400 font-bold">Due: ₹{dueAmount.toFixed(2)}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                pStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                pStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                'bg-rose-50 text-rose-700 border-rose-300'
                              }`}>
                                {pStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {dueAmount > 0.01 ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSettlePoModal({
                                      id: po._id || po.id,
                                      poNumber: poNum,
                                      supplierName: viewSupplier.name,
                                      totalAmount: grandTotal,
                                      paidAmount,
                                      dueAmount
                                    })
                                    setSettleAmount(dueAmount.toString())
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 px-2.5"
                                >
                                  Settle Due
                                </Button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No purchase orders recorded for this supplier yet.
                </div>
              )}
            </div>

            {/* ── Vendor Payment Receipts Issued List ── */}
            <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-orbit-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" /> Vendor Payment Receipts &amp; Vouchers ({supplierReceipts.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">Official receipt vouchers generated upon vendor payments</p>
                </div>
              </div>

              {supplierReceipts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-orbit-border bg-slate-50/50 dark:bg-slate-900/40 text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Receipt # &amp; Time</th>
                        <th className="px-4 py-2.5">PO Reference</th>
                        <th className="px-4 py-2.5">Amount Paid</th>
                        <th className="px-4 py-2.5">Payment Method</th>
                        <th className="px-4 py-2.5 text-right">Receipt Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
                      {supplierReceipts.map((r: any) => {
                        const recNum = r.receiptNumber || r.receipt_number
                        const poRef = r.invoiceNumber || r.invoice_number
                        const amt = Number(r.amountCollected || r.amount_collected || 0)
                        const pMethod = r.paymentMethod || r.payment_method || 'Bank Transfer'
                        const time = r.timestamp || 'N/A'

                        return (
                          <tr key={r.id || r._id || recNum} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-mono font-bold text-orbit-primary-light">{recNum}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{time}</p>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {poRef}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{amt.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                              {pMethod}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintVendorReceipt(r)}
                                  className="h-7 text-[11px] gap-1 px-2 text-slate-700 dark:text-slate-200"
                                >
                                  <Printer className="w-3 h-3 text-orbit-primary-light" /> Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadVendorReceiptPDF(r)}
                                  className="h-7 text-[11px] gap-1 px-2 text-slate-700 dark:text-slate-200"
                                >
                                  <Download className="w-3 h-3 text-emerald-600" /> PDF
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No vendor payment receipt vouchers generated for this supplier yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-orbit-border">
              <Button variant="outline" onClick={() => setViewSupplier(null)}>Close Profile</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Settle Vendor PO Payment Modal ─────────────────────────────── */}
      {settlePoModal && (
        <Modal
          isOpen={!!settlePoModal}
          onClose={() => setSettlePoModal(null)}
          size="md"
          title={`Settle Vendor Payment: #${settlePoModal.poNumber}`}
          subtitle={`Supplier: ${settlePoModal.supplierName}`}
        >
          <form noValidate onSubmit={handleSettlePOPayment} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Total PO Amount:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{settlePoModal.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{settlePoModal.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-orbit-border pt-1">
                <span className="text-slate-400 font-sans font-bold">Outstanding Due:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">₹{settlePoModal.dueAmount.toFixed(2)}</span>
              </div>
            </div>

            <Input
              label="Payment Amount to Settle (₹)"
              type="number"
              step="0.01"
              value={settleAmount}
              onChange={e => setSettleAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={settleMethod}
                onChange={e => setSettleMethod(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <Input
              label="Notes / Payment Reference (Optional)"
              value={settleNotes}
              onChange={e => setSettleNotes(e.target.value)}
              placeholder="e.g. HDFC Ref #9928172"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
              <Button type="button" variant="outline" onClick={() => setSettlePoModal(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSettle}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Save className="w-4 h-4" /> {isSubmittingSettle ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Vendor Settlement Receipt Voucher Modal ─────────────────────── */}
      {vendorReceiptModal && (
        <Modal
          isOpen={!!vendorReceiptModal}
          onClose={() => setVendorReceiptModal(null)}
          size="lg"
          title="Vendor Payment Receipt Voucher Issued"
          subtitle={`Receipt #${vendorReceiptModal.receipt.receiptNumber || vendorReceiptModal.receipt.receipt_number}`}
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Vendor Payment Successful!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Payment of ₹{Number(vendorReceiptModal.receipt.amountCollected || vendorReceiptModal.receipt.amount_collected || 0).toFixed(2)} recorded for PO #{vendorReceiptModal.receipt.invoiceNumber || vendorReceiptModal.receipt.invoice_number}.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-orbit-border text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Voucher #:</span>
                <span className="font-bold text-orbit-primary-light">{vendorReceiptModal.receipt.receiptNumber || vendorReceiptModal.receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vendorReceiptModal.receipt.customer || vendorReceiptModal.receipt.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vendorReceiptModal.receipt.paymentMethod || vendorReceiptModal.receipt.payment_method}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-orbit-border pt-1">
                <span className="text-slate-400">Remaining PO Due:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">₹{vendorReceiptModal.remainingDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
              <Button
                variant="outline"
                onClick={() => handlePrintVendorReceipt({ ...vendorReceiptModal.receipt, remainingDue: vendorReceiptModal.remainingDue })}
                className="gap-2"
              >
                <Printer className="w-4 h-4 text-orbit-primary-light" /> Print Receipt
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownloadVendorReceiptPDF({ ...vendorReceiptModal.receipt, remainingDue: vendorReceiptModal.remainingDue })}
                className="gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Download PDF
              </Button>
              <Button
                onClick={() => setVendorReceiptModal(null)}
                className="bg-orbit-primary hover:bg-orbit-primary/50 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        size="sm"
        title="Remove Supplier"
        subtitle="This action will remove the vendor from active supplier directory"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-100">{selectedSupplier?.name}</span> ({selectedSupplier?.supplierCode})?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteSupplier} className="bg-rose-600 hover:bg-rose-500 text-white gap-2">
              <Trash2 className="w-4 h-4" /> Remove Supplier
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

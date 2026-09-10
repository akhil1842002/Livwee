import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Plus, Filter, LayoutGrid, List,
  Mail, Phone, Building2, MapPin, Tag, ArrowUpRight, Save, X,
} from 'lucide-react'
import { Button, Badge, Avatar, Input, Card, Pagination, Modal } from '@/components/ui'
import { contacts as seedContacts } from '@/data/contacts'
import { cn } from '@/utils/cn'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import type { Contact } from '@/types'

const statusConfig = {
  active:   { label: 'Active',   variant: 'success' as const },
  inactive: { label: 'Inactive', variant: 'neutral' as const },
  prospect: { label: 'Prospect', variant: 'info'    as const },
}

function ContactCard({ contact, index, onView }: { contact: Contact; index: number; onView: (c: Contact) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="p-5 hover:border-orbit-border2 transition-all duration-200 group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar initials={contact.initials} size="lg" online={contact.status === 'active'} />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{contact.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{contact.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig[contact.status].variant} dot>
              {statusConfig[contact.status].label}
            </Badge>
            <button
              onClick={() => onView(contact)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            {contact.company}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            {contact.phone}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            {contact.location}
          </div>
        </div>

        {contact.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-slate-700" />
            {contact.tags.map(tag => (
              <span key={tag} className="text-[10px] text-slate-600 dark:text-slate-400 bg-orbit-surface3 px-2 py-0.5 rounded-full border border-orbit-border">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-orbit-border flex items-center justify-between">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{contact.deals}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Deals</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {contact.value > 0 ? `$${(contact.value / 1000).toFixed(0)}k` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Value</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">{contact.lastActivity}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Last active</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function ContactRow({ contact, index, onView }: { contact: Contact; index: number; onView: (c: Contact) => void }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-orbit-border hover:bg-orbit-surface2/50 transition-colors group"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar initials={contact.initials} size="sm" online={contact.status === 'active'} />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{contact.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{contact.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{contact.company}</td>
      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {contact.location}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <Badge variant={statusConfig[contact.status].variant} dot>
          {statusConfig[contact.status].label}
        </Badge>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap gap-1">
          {contact.tags.slice(0, 2).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orbit-surface2 text-slate-600 dark:text-slate-400 border border-orbit-border">
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">₹{contact.value.toLocaleString()}</td>
      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{contact.lastActivity}</td>
      <td className="px-5 py-3.5">
        <button
          onClick={() => onView(contact)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </motion.tr>
  )
}

type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'active' | 'inactive' | 'prospect'

const emptyForm = { name: '', email: '', phone: '', company: '', role: '', location: '', status: '' as any }

export function ContactsPage() {
  const { showToast } = useToast()
  const [allContacts, setAllContacts] = useState<Contact[]>(seedContacts)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [viewContact, setViewContact] = useState<Contact | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const contactSchema: ValidationSchema<typeof emptyForm> = {
    name: { required: 'Full name is required' },
    email: { required: 'Email address is required', email: 'Invalid email address' },
    phone: {
      custom: (val) => {
        if (val && !/^[6-9]\d{9}$/.test(val.trim())) {
          return 'Must be a valid 10-digit Indian number starting with 6-9'
        }
        return undefined
      }
    }
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(form, contactSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = allContacts.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const newContact: Contact = {
      id: Date.now().toString(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      role: form.role,
      status: form.status,
      initials: form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      location: form.location,
      lastActivity: 'Just now',
      tags: [],
      deals: 0,
      value: 0,
    }
    setAllContacts(p => [newContact, ...p])
    showToast(`Contact "${form.name}" added`, 'success')
    setIsAddOpen(false)
    setForm(emptyForm)
    setErrors({})
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contacts</h1>
          <p className="text-slate-500 text-sm mt-0.5">{allContacts.length} total contacts</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>Add Contact</Button>
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            prefix={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-orbit-surface2 border border-orbit-border rounded-lg p-1">
          {(['all', 'active', 'inactive', 'prospect'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium capitalize transition-all',
                statusFilter === s
                  ? 'bg-orbit-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
          Filters
        </Button>

        <div className="flex items-center gap-1 bg-orbit-surface2 border border-orbit-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-orbit-primary text-white' : 'text-slate-500 hover:text-slate-300')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-orbit-primary text-white' : 'text-slate-500 hover:text-slate-300')}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-600">
        Showing {filtered.length} of {contacts.length} contacts
      </p>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((contact, i) => (
            <ContactCard key={contact.id} contact={contact} index={i} onView={setViewContact} />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orbit-border">
                  {['Contact', 'Company', 'Location', 'Status', 'Tags', 'Value', 'Last Active', ''].map(col => (
                    <th key={col} className="text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact, i) => (
                  <ContactRow key={contact.id} contact={contact} index={i} onView={setViewContact} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filtered.length > 0 && (
        <Pagination currentPage={1} totalItems={filtered.length} pageSize={12} onPageChange={() => {}} />
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <p className="text-lg font-medium text-slate-500">No contacts found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="lg" title="Add New Contact" subtitle="Create a new CRM contact record">
        <form noValidate onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={e => {
                setForm(p => ({ ...p, name: e.target.value }))
                setErrors(p => ({ ...p, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. Dr. Ramesh Patel"
              required
            />
            <Input label="Company / Organisation" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="e.g. Apollo Hospitals" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => {
                setForm(p => ({ ...p, email: e.target.value }))
                setErrors(p => ({ ...p, email: undefined }))
              }}
              error={errors.email}
              placeholder="contact@email.com"
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              maxLength={10}
              onChange={e => {
                const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10)
                setForm(p => ({ ...p, phone: sanitized }))
                setErrors(p => ({ ...p, phone: undefined }))
              }}
              error={errors.phone}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Role / Designation" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Procurement Manager" />
            <Input label="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Mumbai, Maharashtra" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Contact['status'] }))} className={`w-full rounded-lg border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 ${form.status === '' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
              <option value="" disabled hidden>Select contact status...</option>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Add Contact</Button>
          </div>
        </form>
      </Modal>

      {/* View Contact Modal */}
      <Modal isOpen={!!viewContact} onClose={() => setViewContact(null)} size="md" title={viewContact?.name ?? ''} subtitle={`${viewContact?.role} @ ${viewContact?.company}`}>
        {viewContact && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar initials={viewContact.initials} size="lg" online={viewContact.status === 'active'} />
              <div>
                <Badge variant={statusConfig[viewContact.status].variant} dot>{statusConfig[viewContact.status].label}</Badge>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{viewContact.lastActivity}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Mail className="w-4 h-4 text-slate-400" />{viewContact.email}</div>
              {viewContact.phone && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Phone className="w-4 h-4 text-slate-400" />{viewContact.phone}</div>}
              {viewContact.location && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><MapPin className="w-4 h-4 text-slate-400" />{viewContact.location}</div>}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-orbit-border text-sm">
              <div><p className="text-xs text-slate-400">Deals</p><p className="font-semibold text-slate-900 dark:text-slate-100">{viewContact.deals}</p></div>
              <div><p className="text-xs text-slate-400">Total Value</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">₹{viewContact.value.toLocaleString()}</p></div>
            </div>
            <div className="flex justify-end pt-2 border-t border-orbit-border">
              <Button variant="outline" size="sm" onClick={() => setViewContact(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

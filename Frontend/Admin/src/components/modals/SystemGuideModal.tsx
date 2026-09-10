import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle, BookOpen, Search, ShoppingBag, PackageCheck, FileText, RotateCcw,
  ShieldCheck, Sparkles, ArrowRight, ExternalLink, CheckCircle2, AlertTriangle,
  CreditCard, Clock, Building2, Users, Layers, Zap, Lightbulb, Compass
} from 'lucide-react'
import { Modal, Button, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'

interface SystemGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

type GuideTab = 'overview' | 'stock' | 'sales' | 'purchases' | 'returns' | 'roles'

interface GuideTopic {
  id: string
  tab: GuideTab
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  analogy: string
  scenario: string
  keyTakeaways: string[]
  actionText?: string
  actionLink?: string
}

const GUIDE_TOPICS: GuideTopic[] = [
  // 1. Overview
  {
    id: 'overview-brain',
    tab: 'overview',
    title: 'What is Livwee Admin Portal?',
    subtitle: 'The Brain and Command Center of your entire pharmacy store',
    icon: Compass,
    badge: 'The Big Picture',
    analogy: 'Imagine running a giant toy supermarket. Instead of writing sales in a paper notebook, Livwee Admin is an intelligent super-computer that tracks every toy, every rupee, and every person in your store in real time!',
    scenario: 'A customer walks in to buy medicine. The cashier scans the item on the POS screen, the stock updates automatically, the receipt prints out, and the money gets recorded in your daily profit report — all in 5 seconds!',
    keyTakeaways: [
      'Centralized control of sales, medicines, suppliers, and customer debts.',
      'Prevents loss, theft, and human math mistakes automatically.',
      'Works seamlessly across desktop, tablets, and counter billing screens.'
    ],
    actionText: 'Explore Dashboard',
    actionLink: '/dashboard'
  },
  {
    id: 'overview-flow',
    tab: 'overview',
    title: 'The 4-Step Master Cycle of Pharmacy ERP',
    subtitle: 'How medicines move from factory to customer',
    icon: Layers,
    badge: 'Core Workflow',
    analogy: 'Think of a 4-station water slide: 1) Buy water balloons from factory -> 2) Put them in storage boxes -> 3) Sell balloons to kids at the counter -> 4) Count remaining balloons at night!',
    scenario: '1. Create Purchase Order -> 2. Receive Shipment into Warehouse Batches -> 3. Sell at POS Counter -> 4. View Financial Reports & Profit Statements.',
    keyTakeaways: [
      'Station 1: Purchasing & Vendors (Buying stock).',
      'Station 2: Inventory & FEFO Batches (Storing stock safely).',
      'Station 3: POS Billing & Invoices (Selling & Collecting cash/UPI).',
      'Station 4: Analytics & Audit Logs (Tracking profits & security).'
    ],
    actionText: 'Explore Dashboard',
    actionLink: '/dashboard'
  },
  {
    id: 'setup-product-creation',
    tab: 'overview',
    title: 'Step-by-Step Order: How to Add Products Correctly',
    subtitle: 'Prerequisites: Tax Rates -> Categories -> Brands -> Units -> Product Master -> Batches',
    icon: Lightbulb,
    badge: 'Step-by-Step Setup Guide',
    analogy: 'Imagine baking a cake. You cannot put the frosting on before baking the cake! In Pharmacy ERP, you must create Tax Rates, Categories, Brands, and Units BEFORE adding a Product Master so your dropdowns have data ready.',
    scenario: 'Follow the 6-Step Setup Order: 1. Add GST Taxes (0%, 5%, 12%, 18%, 28%) -> 2. Add Category (e.g. Pregnancy Kits) -> 3. Add Brand (e.g. Livwee Health) -> 4. Add Packaging Unit (e.g. Box) -> 5. Create Product Master -> 6. Add Batch & Stock Qty.',
    keyTakeaways: [
      'Step 1: Go to Tax Configurations -> Create GST Tax Slabs (0%, 5%, 12%, 18%, 28%).',
      'Step 2: Go to Categories -> Create Category (e.g. Pregnancy Kits, Pain Relief).',
      'Step 3: Go to Brands -> Create Manufacturer / Brand (e.g. Livwee Health, Abbott).',
      'Step 4: Go to Units -> Create Packaging Unit (e.g. Box, Strip, Bottle, Pcs).',
      'Step 5: Go to Product Catalog -> Click "+ Add Product" -> Fill SKU (e.g. PREG-KIT-001), Name (e.g. Pregnancy Test Kit), select Category, Brand, Unit, Tax Rate, Purchase Cost & Selling Price.',
      'Step 6: Go to Product Batches -> Assign Batch Number, Expiry Date, and Warehouse Quantity.'
    ],
    actionText: 'Go to Product Catalog',
    actionLink: '/catalog/products'
  },

  // 2. Stock & FEFO
  {
    id: 'stock-fefo',
    tab: 'stock',
    title: 'Products, Batches & FEFO (First-Expired, First-Out)',
    subtitle: 'How to manage medicine expiry dates so no stock gets wasted',
    icon: PackageCheck,
    badge: 'Inventory Magic',
    analogy: 'Imagine you have 2 cartons of milk in your fridge. One expires TOMORROW, and the other expires NEXT WEEK. Which milk do you drink first? The one expiring tomorrow! FEFO makes sure you always sell the oldest expiring batch first so medicines never spoil on your shelves.',
    scenario: 'You have 50 tablets of Paracetamol expiring in May 2026 and 100 tablets expiring in December 2026. When a customer buys 10 tablets, the system automatically deducts them from the May 2026 batch!',
    keyTakeaways: [
      'Each medicine delivery has a unique Batch Number (e.g. #BAT-902) and Expiry Date.',
      'FEFO algorithm auto-selects earliest expiring batches during POS billing.',
      'Prevents financial loss from expired medicine destruction.'
    ],
    actionText: 'View FEFO Batches',
    actionLink: '/inventory/batches'
  },
  {
    id: 'stock-alerts',
    tab: 'stock',
    title: 'Low Stock & Out of Stock Safety Alerts',
    subtitle: 'Never run out of essential life-saving medicines',
    icon: AlertTriangle,
    badge: 'Smart Warnings',
    analogy: 'Just like your smartphone shows a red battery warning at 10%, Livwee Admin gives a yellow warning when a medicine drops below 5 units so you can re-order before running out completely!',
    scenario: 'Insulin stock drops to 3 vials. The dashboard displays a "Low Stock Alert" banner with a 1-click "Restock" button to send an order to the supplier.',
    keyTakeaways: [
      'Custom low-stock threshold for each product (e.g. alert when < 5 units).',
      'Near-Expiry warnings highlight items expiring within 30 or 60 days.',
      'Out of stock items are highlighted in red to block accidental invalid sales.'
    ],
    actionText: 'Check Low Stock',
    actionLink: '/inventory/stock'
  },

  // 3. POS & Invoices
  {
    id: 'sales-pos',
    tab: 'sales',
    title: 'POS Billing (Point of Sale Counter)',
    subtitle: 'Fast 1-click billing for walk-in pharmacy customers',
    icon: ShoppingBag,
    badge: 'Counter Sales',
    analogy: 'The POS terminal is like the super-fast cash counter at a supermarket with a barcode scanner, touch screen, and instant bill printout!',
    scenario: 'Cashier types "Cough Syrup", scans barcode, selects Cash or UPI payment, and clicks "Complete Sale". Stock is updated instantly and receipt prints out.',
    keyTakeaways: [
      'Barcode scanner and instant search by product name or formula.',
      'Multiple payment options: Cash, UPI QR Code, Credit Card, and Split Payment.',
      'Applies GST tax tiers automatically.'
    ],
    actionText: 'Open POS Terminal',
    actionLink: '/pos'
  },
  {
    id: 'sales-partial',
    tab: 'sales',
    title: 'Full Invoices vs. Partial Invoices (Credit Bills)',
    subtitle: 'How to handle customer due balances and partial payments',
    icon: CreditCard,
    badge: 'Billing & Credit',
    analogy: 'Imagine buying a ₹1,000 bicycle. You give ₹400 cash today and promise to pay the remaining ₹600 next week. A "Partial Invoice" records ₹400 as collected and ₹600 as a due balance on your customer account!',
    scenario: 'A regular customer buys ₹2,500 worth of monthly medicines. They pay ₹1,000 cash now. The invoice status becomes "PARTIAL". The remaining ₹1,500 is tracked under their Customer Credit Profile.',
    keyTakeaways: [
      'Full Invoice: Paid 100% upfront (Status: PAID).',
      'Partial Invoice: Customer pays part now, remaining stored as Due Balance.',
      'Track unpaid customer bills under "Customers Directory" with payment reminders.'
    ],
    actionText: 'Manage Invoices',
    actionLink: '/billing/invoices'
  },

  // 4. Purchases & Suppliers
  {
    id: 'purchases-po',
    tab: 'purchases',
    title: 'Purchase Orders (POs) & Suppliers',
    subtitle: 'How to buy stock from medicine factories and wholesale vendors',
    icon: Building2,
    badge: 'Procurement',
    analogy: 'A Purchase Order is like a formal grocery shopping list sent to a wholesale vendor saying: "Please send us 100 boxes of Bandages at ₹20 per box by Friday!"',
    scenario: 'You create PO #PO-2026-08 for Sun Pharma. When the truck arrives at your warehouse, you click "Receive PO". All 100 boxes are automatically added to your stock!',
    keyTakeaways: [
      'Supplier Directory stores vendor contact details, tax numbers, and bank accounts.',
      'PO Lifecycle: Draft -> Ordered -> Received -> Closed.',
      'Receiving a PO automatically updates stock counts and batch expiry dates.'
    ],
    actionText: 'Create Purchase Order',
    actionLink: '/purchases/orders'
  },

  // 5. Returns & Quotations
  {
    id: 'returns-disposition',
    tab: 'returns',
    title: 'Sales Returns & Dispositions (Restock vs. Dispose)',
    subtitle: 'What happens when a customer returns a medicine?',
    icon: RotateCcw,
    badge: 'Returns & Refunds',
    analogy: 'If a customer returns a sealed box of Band-Aids, you put it back on the shelf (RESTOCK). But if the box is torn or expired, you throw it in the bio-hazard bin (DISPOSE)!',
    scenario: 'Customer returns 1 unopened bottle of Vitamin C (₹300). Cashier processes a return voucher, refunds ₹300 cash, and marks disposition as "RESTOCK INVENTORY".',
    keyTakeaways: [
      'RESTOCK: Increases shelf stock count back by returned quantity.',
      'DISPOSE / QUARANTINE: Logs financial refund but destroys damaged item without restocking.',
      'Refunds can be paid via Cash, UPI refund, or Store Credit.'
    ],
    actionText: 'Manage Sales Returns',
    actionLink: '/sales/returns'
  },
  {
    id: 'returns-quotation',
    tab: 'returns',
    title: 'Quotations & Price Estimates',
    subtitle: 'Giving price quotes to hospitals or bulk buyers before they buy',
    icon: FileText,
    badge: 'Price Quotes',
    analogy: 'A Quotation is an official price estimate. It is like telling a school: "If you buy 200 first-aid kits from us next month, the total cost will be ₹15,000."',
    scenario: 'A local clinic asks for a price quote for 50 oxygen masks. You generate a PDF Quotation. When the clinic approves, you convert the Quotation into a live Invoice with 1 click!',
    keyTakeaways: [
      'Does not deduct stock until converted into an active sale.',
      'Includes valid-until dates and special bulk discounts.',
      'Can be printed or downloaded as a PDF estimate.'
    ]
  },

  // 6. Roles & Security
  {
    id: 'roles-rbac',
    tab: 'roles',
    title: 'User Roles & Permissions (Who can do what?)',
    subtitle: 'Protecting your pharmacy from unauthorized actions',
    icon: ShieldCheck,
    badge: 'Access Control',
    analogy: 'In a bank, only the Vault Manager has keys to the safe! In Livwee Admin, the Cashier can make bills, but only the Super Admin can delete records or view secret profit reports.',
    scenario: 'A cashier tries to delete an old invoice or purge audit logs. The system blocks the action and displays "Permission Denied — Super Admin Access Required".',
    keyTakeaways: [
      'Super Admin: 100% full authority over settings, users, and audit purges.',
      'Admin / Store Manager: Manages stock, POs, and reports.',
      'Cashier / Staff: Dedicated to counter POS billing and invoice generation.'
    ],
    actionText: 'Manage Roles',
    actionLink: '/roles'
  },
  {
    id: 'roles-audit',
    tab: 'roles',
    title: 'Audit Logs & Immutable Security Trail',
    subtitle: 'Tracking every single click, sale, login, and edit',
    icon: Clock,
    badge: 'Security Log',
    analogy: 'An Audit Log is like a high-definition CCTV camera for your computer system that records every single action so nobody can cheat or erase mistakes!',
    scenario: 'An admin user changes the price of a medicine from ₹100 to ₹80. The Audit Log records: "Admin (John) updated Product #102 price to ₹80 at 02:45 PM from IP 192.168.1.5".',
    keyTakeaways: [
      'Immutable log of all logins, stock edits, price changes, and deletions.',
      'Searchable by user, date, severity level, or action type.',
      'Super Admins can export audit trails to CSV backups.'
    ],
    actionText: 'View Audit Trail',
    actionLink: '/audit-logs'
  }
]

export function SystemGuideModal({ isOpen, onClose }: SystemGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const tabs: { id: GuideTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview',  label: 'Big Picture',      icon: Compass },
    { id: 'stock',     label: 'Products & FEFO',  icon: PackageCheck },
    { id: 'sales',     label: 'POS & Invoices',   icon: ShoppingBag },
    { id: 'purchases', label: 'Purchase Orders',  icon: Building2 },
    { id: 'returns',   label: 'Returns & Quotes', icon: RotateCcw },
    { id: 'roles',     label: 'Roles & Security', icon: ShieldCheck },
  ]

  const filteredTopics = GUIDE_TOPICS.filter(topic => {
    const matchesTab = searchQuery ? true : topic.tab === activeTab
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      topic.title.toLowerCase().includes(q) ||
      topic.subtitle.toLowerCase().includes(q) ||
      topic.analogy.toLowerCase().includes(q) ||
      topic.scenario.toLowerCase().includes(q)

    return matchesTab && matchesSearch
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Livwee Portal Concept & App Guide"
      subtitle="Master the entire pharmacy ERP system — simple step-by-step concepts anyone can understand!"
    >
      <div className="space-y-4">
        {/* Search Bar & Concept Stats */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-orbit-surface2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-orbit-border">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search any concept (e.g. FEFO, Partial Invoice, Purchase Order, Return)..."
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Interactive Kid-Friendly Manual</span>
          </div>
        </div>

        {/* Tab Navigation */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-orbit-border">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer',
                    isActive
                      ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-orbit-surface2'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Topics List Container */}
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {filteredTopics.length > 0 ? (
            filteredTopics.map((topic, i) => {
              const Icon = topic.icon
              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-5 shadow-xs space-y-4"
                >
                  {/* Topic Title & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orbit-primary/10 text-orbit-primary-light flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{topic.title}</h3>
                          <Badge variant="accent" size="sm">{topic.badge}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{topic.subtitle}</p>
                      </div>
                    </div>

                    {topic.actionText && topic.actionLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigate(topic.actionLink!)
                          onClose()
                        }}
                        className="gap-1.5 text-xs font-bold hover:border-orbit-primary text-orbit-primary-light shrink-0"
                      >
                        {topic.actionText} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Kid-Friendly Analogy Card */}
                  <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[10px]">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Simple Analogy (Explained for Kids)
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      "{topic.analogy}"
                    </p>
                  </div>

                  {/* Real Life Scenario */}
                  <div className="bg-slate-50 dark:bg-orbit-surface2/60 border border-slate-200/80 dark:border-orbit-border rounded-xl p-4 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-orbit-primary dark:text-orbit-primary-light uppercase tracking-wider text-[10px]">
                      <Zap className="w-3.5 h-3.5" />
                      Real Store Scenario
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {topic.scenario}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Key Takeaways</p>
                    <ul className="space-y-1.5">
                      {topic.keyTakeaways.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              No matching concept found for "{searchQuery}". Try searching "FEFO", "POS", "Invoice", or "Return".
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-orbit-border">
          <p className="text-[11px] text-slate-400 font-medium">
            💡 Need more details? Check individual feature pages or click action links above.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Got it, Close Guide
          </Button>
        </div>
      </div>
    </Modal>
  )
}

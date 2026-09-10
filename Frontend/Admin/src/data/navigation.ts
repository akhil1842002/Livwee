import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  UserCheck,
  FileSpreadsheet,
  History,
  Settings,
  Sliders
} from 'lucide-react'
import type { NavSection } from '@/types'
import { PERMISSIONS } from '@/config/permissions'

export const navigation: NavSection[] = [
  {
    title: 'Main Navigation',
    items: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        permission: PERMISSIONS.DASHBOARD_VIEW
      },
      {
        label: 'POS Terminal',
        icon: ShoppingCart,
        href: '/pos',
        badge: 'FEFO',
        permission: PERMISSIONS.SALES_CREATE
      }
    ]
  },
  {
    title: 'Catalog & Master Data',
    items: [
      {
        label: 'Master Setup',
        icon: Sliders,
        badge: 'Masters',
        children: [
          { label: 'Product Categories', href: '/catalog/categories', permission: PERMISSIONS.CATEGORIES_VIEW },
          { label: 'Product Brands', href: '/catalog/brands', permission: PERMISSIONS.BRANDS_VIEW },
          { label: 'Units of Measure', href: '/catalog/units', permission: PERMISSIONS.UNITS_VIEW },
          { label: 'Tax & GST Configurations', href: '/catalog/taxes', permission: PERMISSIONS.TAXES_VIEW },
          { label: 'Warehouses & Stores', href: '/inventory/warehouses', permission: PERMISSIONS.WAREHOUSES_VIEW },
          { label: 'Supplier Categories', href: '/purchases/supplier-categories', permission: PERMISSIONS.SUPPLIERS_VIEW }
        ]
      },
      {
        label: 'Product Catalog',
        icon: Package,
        href: '/catalog/products',
        permission: PERMISSIONS.PRODUCTS_VIEW
      }
    ]
  },
  {
    title: 'Purchases & Suppliers',
    items: [
      {
        label: 'Purchasing',
        icon: Truck,
        permission: PERMISSIONS.PURCHASES_VIEW,
        children: [
          { label: 'Purchase Orders', href: '/purchases/orders', permission: PERMISSIONS.PURCHASES_VIEW },
          { label: 'Suppliers', href: '/purchases/suppliers', permission: PERMISSIONS.SUPPLIERS_VIEW }
        ]
      }
    ]
  },
  {
    title: 'Inventory & Stock Control',
    items: [
      {
        label: 'Stock Management',
        icon: Boxes,
        permission: PERMISSIONS.INVENTORY_VIEW,
        children: [
          { label: 'Current Stock', href: '/inventory/stock', permission: PERMISSIONS.INVENTORY_VIEW },
          { label: 'Product Batches', href: '/inventory/batches', permission: PERMISSIONS.INVENTORY_VIEW },
          { label: 'Stock Movements', href: '/inventory/transactions', permission: PERMISSIONS.INVENTORY_VIEW }
        ]
      }
    ]
  },
  {
    title: 'Sales & Billing',
    items: [
      {
        label: 'Sales & Invoices',
        icon: Receipt,
        permission: PERMISSIONS.SALES_VIEW,
        children: [
          { label: 'Sales History', href: '/sales/history', permission: PERMISSIONS.SALES_VIEW },
          { label: 'Invoices & Billing', href: '/billing/invoices', permission: PERMISSIONS.BILLING_VIEW },
          { label: 'Returns & Refunds', href: '/sales/returns', permission: PERMISSIONS.SALES_RETURN }
        ]
      },
      {
        label: 'Customers',
        icon: Users,
        href: '/people/customers',
        permission: PERMISSIONS.CUSTOMERS_VIEW
      }
    ]
  },
  {
    title: 'System & RBAC',
    items: [
      {
        label: 'Users & Roles',
        icon: UserCheck,
        permission: PERMISSIONS.USERS_VIEW,
        children: [
          { label: 'User Management', href: '/users', permission: PERMISSIONS.USERS_VIEW },
          { label: 'Roles & Permissions', href: '/roles', permission: PERMISSIONS.ROLES_VIEW }
        ]
      },
      {
        label: 'Reports & Exports',
        icon: FileSpreadsheet,
        href: '/reports',
        permission: PERMISSIONS.REPORTS_VIEW
      },
      {
        label: 'Audit Trail',
        icon: History,
        href: '/audit-logs',
        permission: PERMISSIONS.AUDIT_VIEW
      },
      {
        label: 'System Settings',
        icon: Settings,
        href: '/settings'
      }
    ]
  }
]

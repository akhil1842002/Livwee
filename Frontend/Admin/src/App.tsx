import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'

// Pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { POSPage } from '@/pages/billing/POSPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { CategoriesPage } from '@/pages/products/CategoriesPage'
import { BrandsPage } from '@/pages/products/BrandsPage'
import { UnitsPage } from '@/pages/products/UnitsPage'
import { TaxesPage } from '@/pages/products/TaxesPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { ProductBatchesPage } from '@/pages/inventory/ProductBatchesPage'
import { WarehousesPage } from '@/pages/inventory/WarehousesPage'
import { StockTransactionsPage } from '@/pages/inventory/StockTransactionsPage'
import { PurchasesPage } from '@/pages/purchases/PurchasesPage'
import { SuppliersPage } from '@/pages/purchases/SuppliersPage'
import { SupplierCategoriesPage } from '@/pages/purchases/SupplierCategoriesPage'
import { SalesHistoryPage } from '@/pages/sales/SalesHistoryPage'
import { InvoicesPage } from '@/pages/billing/InvoicesPage'
import { ReturnsPage } from '@/pages/sales/ReturnsPage'
import { CustomersPage } from '@/pages/people/CustomersPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { RolesPage } from '@/pages/users/RolesPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { AuditLogsPage } from '@/pages/audit/AuditLogsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { HelpPage } from '@/pages/help/HelpPage'
import { ComponentsPage } from '@/pages/components/ComponentsPage'

// Auth Pages
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

// Context & Guards
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ErrorBoundary } from '@/components/ui'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Main Admin Routes */}
          <Route
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Layout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />

            {/* Catalog */}
            <Route path="/catalog/products" element={<ProductsPage />} />
            <Route path="/catalog/categories" element={<CategoriesPage />} />
            <Route path="/catalog/brands" element={<BrandsPage />} />
            <Route path="/catalog/units" element={<UnitsPage />} />
            <Route path="/catalog/taxes" element={<TaxesPage />} />

            {/* Inventory & Warehouses */}
            <Route path="/inventory/stock" element={<InventoryPage />} />
            <Route path="/inventory/batches" element={<ProductBatchesPage />} />
            <Route path="/inventory/warehouses" element={<WarehousesPage />} />
            <Route path="/inventory/transactions" element={<StockTransactionsPage />} />

            {/* Purchases & Suppliers */}
            <Route path="/purchases/orders" element={<PurchasesPage />} />
            <Route path="/purchases/suppliers" element={<SuppliersPage />} />
            <Route path="/purchases/supplier-categories" element={<SupplierCategoriesPage />} />

            {/* Sales & Billing */}
            <Route path="/sales/history" element={<SalesHistoryPage />} />
            <Route path="/billing/invoices" element={<InvoicesPage />} />
            <Route path="/sales/returns" element={<ReturnsPage />} />
            <Route path="/people/customers" element={<CustomersPage />} />

            {/* Users & RBAC */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />

            {/* Reports, Audit & System */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/components" element={<ComponentsPage />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}

export const PERMISSIONS = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  CATEGORIES_VIEW: 'categories.view',
  BRANDS_VIEW: 'brands.view',
  UNITS_VIEW: 'units.view',
  TAXES_VIEW: 'taxes.view',

  WAREHOUSES_VIEW: 'warehouses.view',
  INVENTORY_VIEW: 'inventory.view',

  CUSTOMERS_VIEW: 'customers.view',
  SUPPLIERS_VIEW: 'suppliers.view',

  PURCHASES_VIEW: 'purchases.view',

  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_RETURN: 'sales.return',

  BILLING_VIEW: 'billing.view',

  USERS_VIEW: 'users.view',
  ROLES_VIEW: 'roles.view',

  DASHBOARD_VIEW: 'dashboard.view',
  REPORTS_VIEW: 'reports.view',
  AUDIT_VIEW: 'audit.view',

  SETTINGS_VIEW: 'settings.view'
} as const;

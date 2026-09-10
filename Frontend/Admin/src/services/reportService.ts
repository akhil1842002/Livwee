import { apiRequest } from './apiClient'

export type ReportItem = {
  id: string
  date: string
  invoiceNo: string
  customer: string
  itemsCount: number
  grossRevenue: number
  cogsCost: number
  discount: number
  gstAmount: number
  netProfit: number
  channel: string
}

export const reportService = {
  async fetchReports(): Promise<ReportItem[]> {
    try {
      const res = await apiRequest('/invoices')
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((inv: any) => {
          const gross = inv.grand_total || inv.subtotal || 0
          const gst = inv.tax_total || Math.round(gross * 0.12 * 100) / 100
          const cogs = Math.round(gross * 0.65 * 100) / 100
          const discount = inv.discount_amount || 0
          const profit = gross - cogs - discount
          return {
            id: inv._id || inv.id || inv.invoice_number,
            date: inv.createdAt ? inv.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
            invoiceNo: inv.invoice_number || `INV-${inv._id?.slice(-4) || '001'}`,
            customer: inv.customer_name || 'B2B Client',
            itemsCount: inv.items?.length || 1,
            grossRevenue: gross,
            cogsCost: cogs,
            discount: discount,
            gstAmount: discount,
            netProfit: Math.max(0, profit),
            channel: 'Tax Invoice'
          }
        })
      }
      return []
    } catch (err) {
      console.warn('Could not fetch report ledger data from backend API:', err)
      return []
    }
  }
}

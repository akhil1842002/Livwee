import { apiRequest } from './apiClient'

export const invoiceService = {
  async fetchInvoices() {
    return apiRequest('/invoices')
  },

  async receivePayment(invoiceNumber: string, amountCollected: number, paymentMethod: string, notes?: string) {
    return apiRequest(`/invoices/${invoiceNumber}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        amount_collected: amountCollected,
        payment_method: paymentMethod,
        notes
      })
    })
  },

  async fetchInvoiceReceipts(invoiceNumber: string) {
    return apiRequest(`/invoices/${invoiceNumber}/receipts`)
  },

  async fetchAllReceipts() {
    return apiRequest('/invoices/receipts/all')
  }
}

import { apiRequest } from './apiClient'

export interface StockTransactionPayload {
  productId: string
  batch?: string
  type: string
  qty: number
  ref?: string
}

export const stockTransactionService = {
  async fetchTransactions() {
    const res = await apiRequest('/inventory/transactions')
    return res.data || res
  },

  async createTransaction(payload: StockTransactionPayload) {
    const res = await apiRequest('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  }
}

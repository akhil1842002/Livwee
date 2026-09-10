import { apiRequest } from './apiClient'

export interface CreateReturnPayload {
  order_id?: string
  order_number?: string
  customer_name: string
  customer_phone?: string
  returned_item_name: string
  batch_no?: string
  qty_returned: number
  reason: string
  disposition?: 'RESTOCK_INVENTORY' | 'DAMAGED_QUARANTINE' | 'EXPIRED_DESTROY' | string
  refund_amount: number
  refund_method?: string
  items?: {
    product_id?: string
    product_name?: string
    qty?: number
    unit_price?: number
    reason?: string
  }[]
  notes?: string
}

export const returnService = {
  async fetchReturns() {
    return apiRequest('/returns')
  },

  async createReturn(payload: CreateReturnPayload) {
    return apiRequest('/returns', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

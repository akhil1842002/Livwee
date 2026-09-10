import { apiRequest } from './apiClient'

export interface PosCheckoutPayload {
  invoice_number?: string
  items: {
    product_id: string
    product_name?: string
    variant_id?: string
    qty: number
    unit_price?: number
  }[]
  customer_id?: string
  customer_name?: string
  payment_method?: string
  discount?: number
  shipping_cost?: number
  tax_rate?: number
  paid_amount?: number
}

export const posService = {
  async checkout(payload: PosCheckoutPayload) {
    return apiRequest('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

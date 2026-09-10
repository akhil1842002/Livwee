import { apiRequest } from './apiClient'

export interface CreatePurchaseOrderPayload {
  po_number?: string
  supplier_id?: string
  supplier_name: string
  warehouse_name?: string
  order_date?: string
  expected_delivery?: string
  payment_terms?: string
  items: {
    product_name: string
    qty_ordered: number
    qty_received?: number
    unit_price: number
    total: number
  }[]
  subtotal: number
  tax_amount?: number
  shipping_cost?: number
  total_amount: number
  status?: string
  notes?: string
}

export const purchaseOrderService = {
  async fetchPurchaseOrders() {
    return apiRequest('/purchases/orders')
  },

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
    return apiRequest('/purchases/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async updatePurchaseOrder(id: string, payload: Partial<CreatePurchaseOrderPayload>) {
    return apiRequest(`/purchases/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  async receiveOrder(id: string, itemsReceived?: any) {
    return apiRequest(`/purchases/orders/${id}/receive`, {
      method: 'PUT',
      body: JSON.stringify({ items_received: itemsReceived })
    })
  },

  async payPurchaseOrder(id: string, payload: { amount_paid: number; payment_method: string; notes?: string }) {
    return apiRequest(`/purchases/orders/${id}/pay`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

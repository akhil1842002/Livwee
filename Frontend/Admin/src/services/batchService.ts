import { apiRequest } from './apiClient'

export interface BatchPayload {
  productId?: string
  product?: string
  sku?: string
  batchNumber: string
  warehouseId?: string
  warehouse?: string
  expiryDate: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'
}

export const batchService = {
  async fetchBatches() {
    const res = await apiRequest('/inventory/batches')
    return res.data || res
  },

  async createBatch(payload: BatchPayload) {
    const res = await apiRequest('/inventory/batches', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateBatch(id: string, payload: Partial<BatchPayload>) {
    const res = await apiRequest(`/inventory/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteBatch(id: string) {
    return apiRequest(`/inventory/batches/${id}`, {
      method: 'DELETE'
    })
  }
}

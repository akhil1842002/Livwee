import { apiRequest } from './apiClient'

export interface WarehousePayload {
  name: string
  code?: string
  location: string
  isDefault?: boolean
  status?: 'ACTIVE' | 'INACTIVE'
}

export const warehouseService = {
  async fetchWarehouses() {
    const res = await apiRequest('/warehouses')
    return res.data || res
  },

  async createWarehouse(payload: WarehousePayload) {
    const res = await apiRequest('/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateWarehouse(id: string, payload: Partial<WarehousePayload>) {
    const res = await apiRequest(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteWarehouse(id: string) {
    return apiRequest(`/warehouses/${id}`, {
      method: 'DELETE'
    })
  }
}

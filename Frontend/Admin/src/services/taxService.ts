import { apiRequest } from './apiClient'

export interface TaxPayload {
  name: string
  percentage: number
  status?: 'ACTIVE' | 'INACTIVE'
  description?: string
}

export const taxService = {
  async fetchTaxes() {
    const res = await apiRequest('/catalog/taxes')
    return res.data || res
  },

  async createTax(payload: TaxPayload) {
    const res = await apiRequest('/catalog/taxes', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateTax(id: string, payload: Partial<TaxPayload>) {
    const res = await apiRequest(`/catalog/taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteTax(id: string) {
    return apiRequest(`/catalog/taxes/${id}`, {
      method: 'DELETE'
    })
  }
}

import { apiRequest } from './apiClient'

export interface BrandPayload {
  name: string
  code?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export const brandService = {
  async fetchBrands() {
    const res = await apiRequest('/catalog/brands')
    return res.data || res
  },

  async createBrand(payload: BrandPayload) {
    const res = await apiRequest('/catalog/brands', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateBrand(id: string, payload: BrandPayload) {
    const res = await apiRequest(`/catalog/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteBrand(id: string) {
    return apiRequest(`/catalog/brands/${id}`, {
      method: 'DELETE'
    })
  }
}

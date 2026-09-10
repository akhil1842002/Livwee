import { apiRequest } from './apiClient'

export interface UnitPayload {
  name: string
  code?: string
  description?: string
}

export const unitService = {
  async fetchUnits() {
    const res = await apiRequest('/catalog/units')
    return res.data || res
  },

  async createUnit(payload: UnitPayload) {
    const res = await apiRequest('/catalog/units', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateUnit(id: string, payload: UnitPayload) {
    const res = await apiRequest(`/catalog/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteUnit(id: string) {
    return apiRequest(`/catalog/units/${id}`, {
      method: 'DELETE'
    })
  }
}

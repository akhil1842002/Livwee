import { apiRequest } from './apiClient'

export interface CategoryPayload {
  name: string
  slug?: string
  description?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export const categoryService = {
  async fetchCategories() {
    const res = await apiRequest('/catalog/categories')
    return res.data || res
  },

  async createCategory(payload: CategoryPayload) {
    const res = await apiRequest('/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateCategory(id: string, payload: CategoryPayload) {
    const res = await apiRequest(`/catalog/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteCategory(id: string) {
    return apiRequest(`/catalog/categories/${id}`, {
      method: 'DELETE'
    })
  }
}

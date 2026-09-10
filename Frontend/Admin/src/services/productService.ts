import { apiRequest } from './apiClient'

export interface CreateProductPayload {
  name: string
  sku?: string
  category?: string
  brand?: string
  unit?: string
  price: number
  cost_price?: number
  discount_price?: number
  stock?: number
  description?: string
  status?: string
}

export const productService = {
  async fetchProducts() {
    return apiRequest('/products')
  },

  async createProduct(payload: CreateProductPayload) {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async updateProduct(id: string, payload: Partial<CreateProductPayload>) {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  async deleteProduct(id: string) {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE'
    })
  }
}

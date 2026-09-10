import { apiRequest } from './apiClient'

export interface CreateSupplierPayload {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  payment_terms?: string
}

export const supplierService = {
  async fetchSuppliers() {
    return apiRequest('/suppliers')
  },

  async createSupplier(payload: CreateSupplierPayload) {
    return apiRequest('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async updateSupplier(id: string, payload: Partial<CreateSupplierPayload>) {
    return apiRequest(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

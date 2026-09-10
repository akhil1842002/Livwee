import { apiRequest } from './apiClient'

export interface CreateCustomerPayload {
  name: string
  phone: string
  email?: string
  type?: 'INDIVIDUAL' | 'DOCTOR' | 'HOSPITAL' | 'CLINIC'
  street_address?: string
  city?: string
  state?: string
  zip?: string
}

export const customerService = {
  async fetchCustomers() {
    return apiRequest('/customers')
  },

  async createCustomer(payload: CreateCustomerPayload) {
    return apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async updateCustomer(id: string, payload: Partial<CreateCustomerPayload>) {
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  async payCredit(customerId: string, amount: number, payment_method = 'Cash', invoice_number?: string, notes?: string) {
    return apiRequest(`/customers/${customerId}/pay-credit`, {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method, invoice_number, notes })
    })
  }
}

import { apiRequest } from './apiClient'

export interface UserPayload {
  name: string
  email: string
  password?: string
  type?: 'SUPER_ADMIN' | 'STAFF' | 'MANAGER'
  role?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export const userService = {
  async fetchUsers() {
    const res = await apiRequest('/users')
    return res.data || res
  },

  async createUser(payload: UserPayload) {
    const res = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateUser(id: string, payload: Partial<UserPayload>) {
    const res = await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async resetPassword(id: string, newPassword: string) {
    return apiRequest(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    })
  },

  async deleteUser(id: string) {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE'
    })
  }
}

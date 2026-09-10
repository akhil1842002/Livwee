import { apiRequest } from './apiClient'

export interface RolePayload {
  name: string
  description?: string
  permissions?: string[]
}

export const roleService = {
  async fetchRoles() {
    const res = await apiRequest('/roles')
    return res.data || res
  },

  async createRole(payload: RolePayload) {
    const res = await apiRequest('/roles', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async updateRole(id: string, payload: Partial<RolePayload>) {
    const res = await apiRequest(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return res.data || res
  },

  async deleteRole(id: string) {
    return apiRequest(`/roles/${id}`, {
      method: 'DELETE'
    })
  }
}

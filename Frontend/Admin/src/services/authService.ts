import { apiRequest } from './apiClient'

export const authService = {
  async login(email: string, password: string) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },

  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST'
    })
  },

  async fetchMe() {
    return apiRequest('/auth/me')
  },

  async forgotPassword(email: string) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },

  async resetPassword(token: string, newPassword: string) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    })
  }
}

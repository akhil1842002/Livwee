import { apiRequest } from './apiClient'

export const dashboardService = {
  async fetchMetrics() {
    return apiRequest('/dashboard/metrics')
  }
}

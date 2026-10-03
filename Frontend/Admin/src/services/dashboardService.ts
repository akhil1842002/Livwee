import { apiRequest } from './apiClient'

export interface DashboardFilterParams {
  preset?: 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all' | 'custom' | string
  startDate?: string
  endDate?: string
}

export const dashboardService = {
  async fetchMetrics(params?: DashboardFilterParams) {
    const query = new URLSearchParams()
    if (params?.preset) query.append('preset', params.preset)
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)

    const queryString = query.toString()
    return apiRequest(`/dashboard/metrics${queryString ? `?${queryString}` : ''}`)
  }
}


import { apiRequest } from './apiClient'

export const auditLogService = {
  async fetchAuditLogs() {
    const res = await apiRequest('/audit-logs')
    return res.data || res
  },

  async deleteAuditLog(id: string) {
    return apiRequest(`/audit-logs/${id}`, {
      method: 'DELETE'
    })
  },

  async purgeAuditLogs() {
    return apiRequest('/audit-logs/purge', {
      method: 'DELETE'
    })
  }
}

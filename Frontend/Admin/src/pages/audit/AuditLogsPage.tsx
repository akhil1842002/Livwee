import { useState, useEffect } from 'react'
import { History, Search, Download, Trash2, ShieldAlert, Eye, Filter, AlertTriangle, CheckCircle2, Lock, Info, Calendar, Loader2 } from 'lucide-react'
import { Input, Button, Pagination, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { auditLogService } from '@/services/auditLogService'

type AuditLogSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

type AuditLog = {
  id: string
  user: string
  userRole: string
  action: string
  entity: string
  entityId: string
  desc: string
  severity: AuditLogSeverity
  time: string
  date: string
  ip: string
  payload?: string
}

function exportLogsCSV(logs: AuditLog[]) {
  const header = 'ID,Date,Time,User,User Role,Action,Entity,Severity,Description,IP Address'
  const rows = logs.map(l =>
    `"${l.id}","${l.date}","${l.time}","${l.user}","${l.userRole}","${l.action}","${l.entity}","${l.severity}","${l.desc}","${l.ip}"`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-export-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditLogsPage() {
  const { showToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Modals
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false)
  const [purgeLogId, setPurgeLogId] = useState<string | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true)
      const data = await auditLogService.fetchAuditLogs()
      setLogs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit logs', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const filtered = logs.filter(l => {
    if (severityFilter !== 'ALL' && l.severity !== severityFilter) return false
    return (
      l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('No security audit log entries available to export', 'warning')
      return
    }
    exportLogsCSV(filtered)
    showToast('Audit trail logs exported as CSV', 'success')
  }

  // Super Admin Purge Single Log
  const handlePurgeSingle = (logId: string) => {
    setPurgeLogId(logId)
    setPurgeConfirmText('')
    setIsPurgeModalOpen(true)
  }

  // Super Admin Purge All Filtered Logs
  const handlePurgeAllFiltered = () => {
    setPurgeLogId('ALL')
    setPurgeConfirmText('')
    setIsPurgeModalOpen(true)
  }

  const confirmPurge = async () => {
    if (purgeConfirmText !== 'DELETE') {
      showToast('Please type "DELETE" to confirm purge authorization', 'error')
      return
    }

    // Auto-export CSV backup before purge for safety!
    if (filtered.length > 0) {
      exportLogsCSV(filtered)
    }

    try {
      if (purgeLogId === 'ALL') {
        await auditLogService.purgeAuditLogs()
        showToast('All audit logs purged by Super Admin. Backup CSV downloaded.', 'info')
      } else if (purgeLogId) {
        await auditLogService.deleteAuditLog(purgeLogId)
        showToast(`Audit Log entry #${purgeLogId} deleted by Super Admin.`, 'info')
      }
      setIsPurgeModalOpen(false)
      setPurgeLogId(null)
      loadAuditLogs()
    } catch (err: any) {
      showToast(err.message || 'Failed to purge audit logs', 'error')
    }
  }

  const severityBadgeMap: Record<AuditLogSeverity, { badge: string; icon: any }> = {
    CRITICAL: {
      badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
      icon: ShieldAlert
    },
    WARNING: {
      badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      icon: AlertTriangle
    },
    INFO: {
      badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
      icon: Info
    }
  }

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Security Audit Trail</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Immutable system logs tracking critical pharmacy operations, logins, inventory adjustments, and RBAC updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2 text-xs border-slate-200 dark:border-slate-800">
            <Download className="w-3.5 h-3.5" /> Export Audit CSV
          </Button>
          <Button
            onClick={handlePurgeAllFiltered}
            className="bg-rose-600 hover:bg-rose-500 text-white gap-2 text-xs shadow-lg shadow-rose-600/30"
          >
            <Trash2 className="w-3.5 h-3.5" /> Purge Logs (Super Admin)
          </Button>
        </div>
      </div>

      {/* Importance Banner & Security Notice */}
      <div className="bg-gradient-to-r from-orbit-primary/90 via-orbit-primary/80 to-orbit-primary/90 p-5 rounded-2xl text-white border border-orbit-primary/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Why Audit Logs are Critical &amp; Super Admin Controls</h3>
              <p className="text-white/80 text-xs mt-1 leading-relaxed">
                Audit logs are legally required for pharmacy drug compliance (FDA / CDSCO) to track medicine theft, stock tampering, and unauthorized price overrides.
                <strong> Super Admins can purge old logs</strong> with mandatory confirmation and automatic CSV backups.
              </p>
            </div>
          </div>
          <div className="shrink-0 bg-white/10 border border-white/20 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">Total Active Logs</span>
            <span className="text-lg font-bold text-white font-mono">{logs.length} Entries</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search logs by user, action, description, or IP..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => { setSeverityFilter(sev); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                severityFilter === sev
                  ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/30'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[850px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">User &amp; Role</th>
                <th className="px-6 py-4">Action &amp; Entity</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">IP &amp; Time</th>
                <th className="px-6 py-4 text-right">Super Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  colSpan={6}
                  title="No Security Logs Found"
                  description="There are no security audit log entries recorded matching your criteria."
                />
              ) : (
                paginated.map(log => {
                  const { badge: sevBadge, icon: SevIcon } = severityBadgeMap[log.severity || 'INFO']
                  return (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${sevBadge}`}>
                        <SevIcon className="w-3 h-3" /> {log.severity || 'INFO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{log.user}</p>
                      <span className="text-[10px] font-mono text-orbit-primary-light dark:text-orbit-primary-light font-semibold">{log.userRole}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{log.action}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{log.entity} ({log.entityId})</span>
                    </td>
                    <td className="px-6 py-4 text-xs leading-relaxed max-w-sm text-slate-800 dark:text-slate-200">
                      {log.desc}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div>{log.time}</div>
                      <div className="text-[10px] text-slate-400">IP: {log.ip}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Inspect Payload"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Purge Log Entry (Super Admin)"
                          onClick={() => handlePurgeSingle(log.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border">
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            pageSizeOptions={[25, 50, 75, 100]}
          />
        </div>
      </div>

      {/* Log Payload Detail Modal */}
      {selectedLog && (
        <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} size="lg" title={`Audit Log Payload: ${selectedLog.action}`} subtitle={`Entity: ${selectedLog.entity} (${selectedLog.entityId})`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 font-bold block">USER / ROLE</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedLog.user} ({selectedLog.userRole})</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">TIMESTAMP &amp; IP</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{selectedLog.time} · {selectedLog.ip}</span>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Log Description</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedLog.desc}</p>
            </div>

            {selectedLog.payload && (
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1.5">JSON Payload Diff</span>
                <pre className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                  {selectedLog.payload}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Super Admin Purge Confirmation Modal */}
      {isPurgeModalOpen && (
        <Modal
          isOpen={isPurgeModalOpen}
          onClose={() => setIsPurgeModalOpen(false)}
          size="md"
          title="Super Admin Purge Authorization"
          subtitle="Mandatory confirmation required to delete audit logs"
        >
          <div className="space-y-4">
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Warning: Irreversible Security Action</p>
                <p className="mt-1 leading-relaxed">
                  You are about to delete audit logs. For compliance safety, an <strong>automatic CSV backup will be downloaded</strong> before purging.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm authorization:
              </label>
              <Input
                value={purgeConfirmText}
                onChange={e => setPurgeConfirmText(e.target.value)}
                placeholder="Type DELETE"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsPurgeModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={confirmPurge} className="bg-rose-600 hover:bg-rose-500 text-white gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Purge Audit Logs &amp; Download Backup
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}

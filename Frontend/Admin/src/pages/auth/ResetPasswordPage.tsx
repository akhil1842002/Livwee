import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const qToken = searchParams.get('token')
    if (qToken) setToken(qToken)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      showToast('Please provide a valid reset token', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to reset password')

      showToast('Your password has been successfully reset!', 'success')
      setSuccess(true)
    } catch (err: any) {
      showToast(err.message || 'Reset password error', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orbit-bg flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-orbit-primary/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-orbit-primary flex items-center justify-center shadow-lg shadow-orbit-primary/40">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-900 dark:text-slate-100 font-bold text-lg">Livwee Admin</span>
        </div>

        {!success ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Set New Password</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 font-medium">
              Enter your reset token and new account password
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Reset Token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token"
                required
              />

              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                prefix={<Lock className="w-3.5 h-3.5 text-slate-400" />}
                suffix={
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
                required
              />

              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                prefix={<Lock className="w-3.5 h-3.5 text-slate-400" />}
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-medium shadow-lg shadow-orbit-primary/30"
                loading={loading}
              >
                Update Password
              </Button>
            </form>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Password Updated!</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 font-medium">
              Your password has been securely updated. You can now sign in with your new credentials.
            </p>
            <Button
              onClick={() => navigate('/sign-in')}
              className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-medium"
            >
              Go to Sign In
            </Button>
          </motion.div>
        )}

        <Link
          to="/sign-in"
          className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors mt-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </motion.div>
    </div>
  )
}

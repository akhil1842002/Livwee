import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('admin@livwee.com')
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send reset request')
      
      showToast(data.message || 'Reset link generated successfully', 'success')
      if (data.resetToken) {
        setResetToken(data.resetToken)
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending request', 'error')
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

        {!resetToken ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Forgot Password</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 font-medium">
              Enter your email address to generate a secure reset token
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@livwee.com"
                prefix={<Mail className="w-3.5 h-3.5 text-slate-400" />}
                required
              />
              <Button
                type="submit"
                size="lg"
                className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-medium shadow-lg shadow-orbit-primary/30"
                loading={loading}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Send Reset Token
              </Button>
            </form>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
              <KeyRound className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Reset Token Generated</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 font-medium">
              A secure password reset token has been generated for your account.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-orbit-primary dark:text-orbit-primary-light break-all mb-6 font-bold shadow-sm">
              Token: {resetToken}
            </div>

            <Button
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-medium"
            >
              Proceed to Reset Password
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

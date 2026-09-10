import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export function SignInPage() {
  const [email, setEmail] = useState('admin@livwee.com')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      showToast('Welcome back! Authentication successful.', 'success', 'Signed In')
      navigate('/dashboard')
    } catch (err: any) {
      showToast(err.message || 'Invalid email or password', 'error', 'Authentication Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orbit-bg flex transition-colors duration-200">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orbit-primary/10 dark:bg-orbit-primary/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-orbit-primary/10 blur-[100px] rounded-full" />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-orbit-border relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orbit-primary flex items-center justify-center shadow-lg shadow-orbit-primary/40">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-slate-900 dark:text-slate-100 font-bold text-xl tracking-tight">Livwee <span className="text-orbit-primary-light dark:text-orbit-primary-light font-semibold text-sm">Admin</span></span>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 leading-tight">
            Pharmacy &amp; E-Commerce{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orbit-primary to-orbit-primary-light dark:from-orbit-primary-light dark:to-orbit-primary-light">Management Portal</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Complete inventory, FEFO batch tracking, POS sales, split billing, customer management, and fine-grained RBAC in one secure platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'FEFO Batch', label: 'Expiry Management' },
              { value: 'Atomic POS', label: 'Billing & Stock Sync' },
              { value: 'Split Payments', label: 'UPI / Cash / Card' },
              { value: 'RBAC', label: 'Granular Permissions' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-orbit-surface/60 border border-slate-200 dark:border-orbit-border/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                <p className="text-base font-bold text-orbit-primary dark:text-orbit-primary-light">{stat.value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Livwee v2.0 Enterprise &bull; Secure Encrypted Session
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-orbit-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-lg">Livwee Admin</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Admin Sign In</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 font-medium">Enter your credentials to access the portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@livwee.com"
                prefix={<Mail className="w-3.5 h-3.5 text-slate-400" />}
                required
              />
            </div>
            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                prefix={<Lock className="w-3.5 h-3.5 text-slate-400" />}
                suffix={
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-orbit-primary-light w-3.5 h-3.5 focus:ring-orbit-primary" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Remember session</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-orbit-primary-light dark:text-orbit-primary-light hover:text-orbit-primary dark:hover:text-orbit-primary-light font-semibold transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-medium shadow-lg shadow-orbit-primary/30"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Seed hint box for easy manual testing */}
          <div className="mt-6 p-3.5 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/20 text-xs text-orbit-primary dark:text-orbit-primary-light shadow-sm">
            <p className="font-bold mb-1">Super Admin Credentials:</p>
            <p className="font-mono text-slate-700 dark:text-slate-300">Email: admin@livwee.com</p>
            <p className="font-mono text-slate-700 dark:text-slate-300">Password: admin123</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

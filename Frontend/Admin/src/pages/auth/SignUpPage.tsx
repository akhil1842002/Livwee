import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/dashboard') }, 1200)
  }

  return (
    <div className="min-h-screen bg-orbit-bg flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-orbit-primary/8 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-orbit-accent/8 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-orbit-primary flex items-center justify-center glow-primary">
            <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4">
              <circle cx="16" cy="16" r="4" fill="white" />
              <ellipse cx="16" cy="16" rx="11" ry="5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" transform="rotate(-30 16 16)" />
              <circle cx="23" cy="11" r="2" fill="#06B6D4" />
            </svg>
          </div>
          <span className="text-slate-100 font-semibold">Orbit</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-1">Create your account</h1>
        <p className="text-slate-500 text-sm mb-8">Get started free — no credit card required</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full name" type="text" placeholder="Alex Morgan" prefix={<User className="w-3.5 h-3.5" />} required />
          <Input label="Email address" type="email" placeholder="you@company.com" prefix={<Mail className="w-3.5 h-3.5" />} required />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            prefix={<Lock className="w-3.5 h-3.5" />}
            hint="Use at least 8 characters, 1 number, and 1 symbol"
            suffix={
              <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
            required
          />
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input type="checkbox" className="mt-0.5 rounded border-orbit-border bg-orbit-surface2 text-orbit-primary w-3.5 h-3.5 flex-shrink-0" required />
            <span className="text-xs text-slate-500 leading-relaxed">
              I agree to the{' '}
              <a href="#" className="text-orbit-primary-light hover:text-orbit-accent transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-orbit-primary-light hover:text-orbit-accent transition-colors">Privacy Policy</a>
            </span>
          </label>
          <Button type="submit" size="lg" className="w-full" loading={loading} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-orbit-primary-light hover:text-orbit-accent transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Mail, Eye, EyeOff, UserCheck, Sparkles, ShieldCheck } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const QUICK_DEMO_ACCOUNTS = [
  { name: 'Mukasa Joseph', role: 'Sales Employee', email: 'mukasa@curtainworld.ug', color: 'blue' },
  { name: 'Nakato Sarah', role: 'Cashier', email: 'nakato@curtainworld.ug', color: 'green' },
  { name: 'Okello Brian', role: 'Manager / Both', email: 'okello@curtainworld.ug', color: 'purple' },
]

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const from = location.state?.from?.pathname || '/'

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      toast({ type: 'success', message: 'Welcome back to Curtain World!' })
      navigate(from, { replace: true })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Login failed. Check your credentials.' })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (email) => {
    setValue('email', email)
    setValue('password', 'password123')
    onSubmit({ email, password: 'password123' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-1 border shadow-xs"
            style={{ background: 'var(--brand-light)', borderColor: 'var(--border)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand)' }} />
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--brand)' }}>
              Curtain World Staff Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Sign In to Your Account
          </h1>
          <p className="text-sm italic" style={{ color: 'var(--brand)' }}>
            “For your curtain desires.”
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@curtainworld.ug"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs hover:underline font-medium"
                    style={{ color: 'var(--brand)' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full rounded-lg border px-3 py-2 pl-9 pr-10 text-sm transition-colors focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--fg)',
                      borderColor: errors.password ? '#ef4444' : 'var(--border)',
                    }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--fg-muted)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" loading={loading}>
                Sign In
              </Button>
            </form>

            <div className="pt-2 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
              <span>New employee? </span>
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'var(--brand)' }}>
                Register Account
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Demo Staff Logins */}
        <div
          className="rounded-xl p-4 border space-y-2.5 text-xs"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--fg)' }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
            <span>Quick Staff Switch / Demo Logins:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {QUICK_DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                className="text-left p-2 rounded-lg border transition-all text-xs flex flex-col justify-between"
                style={{
                  background: 'var(--surface-hover)',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span className="font-medium" style={{ color: 'var(--fg)' }}>{acc.name}</span>
                <span className="text-[10px] mt-0.5" style={{ color: 'var(--brand)' }}>{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

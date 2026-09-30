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
import { Lock, ShieldCheck } from 'lucide-react'

const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone number'),
  password: z.string().min(4, 'Enter your password'),
})

export function Login() {
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const from = location.state?.from?.pathname || '/'

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signIn(data.identifier, data.password)
      toast({ type: 'success', message: 'Welcome back to Curtain World!' })
      navigate(from, { replace: true })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Login failed. Check your email/phone and password.' })
    } finally {
      setLoading(false)
    }
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
              Curtain World · POS & Admin System
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Admin & Cashier Sign In
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
                label="Admin Email or Phone"
                placeholder="e.g. sharityra41@gmail.com or 0700 000 001"
                icon={<ShieldCheck className="h-4 w-4" />}
                error={errors.identifier?.message}
                {...register('identifier')}
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs hover:underline font-medium"
                    style={{ color: 'var(--brand)' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" loading={loading}>
                Sign In as Admin & Cashier
              </Button>
            </form>

            <div className="pt-2 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
              Secure store administration and cashier point-of-sale
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

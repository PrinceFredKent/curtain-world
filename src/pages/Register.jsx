// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Mail, User, ShieldCheck } from 'lucide-react'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['employee', 'cashier', 'both']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export function Register() {
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'employee',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
      })
      toast({ type: 'success', message: 'Account created! Welcome to Curtain World.' })
      navigate('/', { replace: true })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Registration failed.' })
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
              Staff Registration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Join Curtain World Team
          </h1>
          <p className="text-sm italic" style={{ color: 'var(--brand)' }}>
            “For your curtain desires.”
          </p>
        </div>

        {/* Register Card */}
        <Card className="shadow-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name *"
                placeholder="e.g. Mugisha Denis"
                icon={<User className="h-4 w-4" />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Input
                label="Staff Email *"
                type="email"
                placeholder="denis@curtainworld.ug"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Select label="Staff Role *" error={errors.role?.message} {...register('role')}>
                <option value="employee">Sales Employee (Measurements & Orders)</option>
                <option value="cashier">Cashier (Deposits & Payments)</option>
                <option value="both">Both (Sales & Cashier)</option>
              </Select>

              <Input
                label="Password *"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password *"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" className="w-full h-11 text-base font-semibold" loading={loading}>
                Create Staff Account
              </Button>
            </form>

            <div className="pt-2 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
              <span>Already registered? </span>
              <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--brand)' }}>
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

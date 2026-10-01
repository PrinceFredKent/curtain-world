// src/pages/ForgotPassword.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone number'),
})

export function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const toast = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await resetPassword(data.identifier)
      setSent(true)
      toast({ type: 'success', message: 'Reset instructions sent successfully' })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to send reset link.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <img
              src="/logo.png"
              alt="Curtain World Logo"
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl object-cover shadow-xl border-2 border-purple-500/40"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Reset Your Password
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Enter your staff email or phone number to receive reset instructions
          </p>
        </div>

        <Card className="shadow-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <CardContent className="p-6 sm:p-8 space-y-5">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="h-12 w-12 rounded-full mx-auto flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--fg)' }}>Instructions Sent</h3>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                  If an account exists with that email or phone, you will receive password reset instructions shortly.
                </p>
                <Link to="/login" className="inline-block mt-2 font-medium hover:underline text-sm" style={{ color: 'var(--brand)' }}>
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email / Phone Number"
                  placeholder="e.g. you@curtainworld.ug or 0772 000 000"
                  icon={<UserCheck className="h-4 w-4" />}
                  error={errors.identifier?.message}
                  {...register('identifier')}
                />

                <Button type="submit" className="w-full h-11 text-base font-semibold" loading={loading}>
                  Send Reset Link
                </Button>

                <div className="pt-2 text-center">
                  <Link to="/login" className="text-sm font-medium hover:underline inline-flex items-center gap-1.5" style={{ color: 'var(--brand)' }}>
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

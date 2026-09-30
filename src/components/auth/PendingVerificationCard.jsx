// src/components/auth/PendingVerificationCard.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { Clock, ShieldAlert, RefreshCw, LogOut, UserCheck, Mail, Phone, Calendar } from 'lucide-react'
import { SUPER_ADMIN_EMAIL } from '../../lib/supabase'

export function PendingVerificationCard() {
  const { user, fullName, email, phone, refreshUser, signOut } = useAuth()
  const [checking, setChecking] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const refreshed = await refreshUser()
      const isVerified = refreshed?.user_metadata?.verified === true ||
        (refreshed?.user_metadata?.role && refreshed?.user_metadata?.role !== 'pending')

      if (isVerified) {
        toast({ type: 'success', message: '🎉 Your account has been verified! Welcome to Curtain World.' })
        navigate('/', { replace: true })
      } else {
        toast({
          type: 'info',
          message: `Account is still pending verification. The super admin (${SUPER_ADMIN_EMAIL}) must approve and assign your role.`,
        })
      }
    } catch {
      toast({ type: 'error', message: 'Could not check status. Please try again.' })
    } finally {
      setChecking(false)
    }
  }

  const registeredDate = user?.user_metadata?.registered_at
    ? new Date(user.user_metadata.registered_at).toLocaleString()
    : new Date().toLocaleDateString()

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-fg)' }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm0 4h3v14H3V7zm5 0h3v14H8V7zm5 0h3v14h-3V7zm5 0h3v14h-3V7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Curtain World</h1>
          <p className="text-xs uppercase tracking-widest font-semibold mt-1" style={{ color: 'var(--brand)' }}>
            Business Management System
          </p>
        </div>

        {/* Verification Card */}
        <Card
          className="shadow-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Card Top Accent Banner */}
          <div
            className="px-6 py-4 border-b flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                Account Waiting Verification
              </h2>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Your registration is under review by the super admin
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Status explanation */}
            <div
              className="p-4 rounded-xl border text-sm space-y-2"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--fg)' }}>
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Super Admin Verification Required</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Welcome, <strong style={{ color: 'var(--fg)' }}>{fullName}</strong>. Your account has been registered, but store roles (e.g. Cashier, Sales Employee, Workshop) must be granted by the Super Admin before you can access the system.
              </p>
              <div
                className="mt-2.5 pt-2.5 border-t text-xs flex items-center justify-between"
                style={{ borderColor: 'var(--border)' }}
              >
                <span style={{ color: 'var(--fg-muted)' }}>Authorized Reviewer:</span>
                <span className="font-semibold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
                  {SUPER_ADMIN_EMAIL}
                </span>
              </div>
            </div>

            {/* Applicant details */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                Your Registered Details
              </h3>
              <div
                className="rounded-xl border divide-y text-xs"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Full Name</span>
                  </div>
                  <span className="font-medium" style={{ color: 'var(--fg)' }}>{fullName}</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email Address</span>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--fg)' }}>{email}</span>
                </div>
                {phone && (
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                      <Phone className="h-3.5 w-3.5" />
                      <span>Phone Number</span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--fg)' }}>{phone}</span>
                  </div>
                )}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Submitted On</span>
                  </div>
                  <span style={{ color: 'var(--fg-muted)' }}>{registeredDate}</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                    Awaiting Role Assignment
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleCheckStatus}
                loading={checking}
                className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                Check Verification Status
              </Button>

              <button
                type="button"
                onClick={() => signOut()}
                className="w-full py-2.5 px-4 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--border)',
                  color: 'var(--fg-muted)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                Sign Out / Return to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

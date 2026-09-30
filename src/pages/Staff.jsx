// src/pages/Staff.jsx
import { useState } from 'react'
import {
  useAllStaff,
  useCreateStaff,
  useUpdateStaff,
  useVerifyStaff,
  useRejectStaff,
} from '../hooks/useStaff'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Edit2,
  UserCheck,
  UserCog,
  ShieldCheck,
  Crown,
  Clock,
  CheckCircle2,
  Trash2,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react'
import { formatDate } from '../lib/utils'
import { SUPER_ADMIN_EMAIL } from '../lib/supabase'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['employee', 'cashier', 'both', 'admin', 'workshop', 'installer']),
})

const ASSIGNABLE_ROLES = [
  { value: 'employee', label: 'Sales Employee (Orders & Customers)' },
  { value: 'cashier', label: 'Cashier (POS & Payments)' },
  { value: 'both', label: 'Sales & Cashier (Full Operations)' },
  { value: 'admin', label: 'Store Admin (Store Management)' },
  { value: 'workshop', label: 'Workshop / Tailor (Fulfilment)' },
  { value: 'installer', label: 'Installer (Measurements & Fitting)' },
]

function StaffForm({ defaultValues, onSubmit, loading, isEditing = false }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { role: 'both' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name *"
        placeholder="Staff member name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email Address"
        type="email"
        placeholder="staff@curtainworld.ug"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Phone Number"
        placeholder="+256 700 000 000"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Select label="Staff Role *" error={errors.role?.message} {...register('role')}>
        {ASSIGNABLE_ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </Select>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Save Changes' : 'Create & Verify Staff'}
        </Button>
      </div>
    </form>
  )
}

const roleColors = {
  super_admin: 'amber',
  admin: 'indigo',
  employee: 'blue',
  cashier: 'green',
  both: 'purple',
  workshop: 'orange',
  installer: 'cyan',
  pending: 'yellow',
}

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Store Admin',
  employee: 'Sales Employee',
  cashier: 'Cashier',
  both: 'Sales & Cashier',
  workshop: 'Workshop / Tailor',
  installer: 'Installer',
  pending: 'Pending Verification',
}

function TrHover({ children, ...props }) {
  return (
    <tr
      {...props}
      className="transition-colors"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </tr>
  )
}

export function Staff() {
  const [showCreate, setShowCreate] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [selectedRoles, setSelectedRoles] = useState({})
  const [verifyingId, setVerifyingId] = useState(null)

  const { isSuperAdmin } = useAuth()
  const { data: staff, isLoading } = useAllStaff()
  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const verifyMutation = useVerifyStaff()
  const deleteMutation = useRejectStaff()
  const toast = useToast()

  const handleCreate = async (data) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        verified: true,
        active: true,
        status: 'active',
      })
      toast({ type: 'success', message: 'Staff member added and verified' })
      setShowCreate(false)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const handleUpdate = async (data) => {
    try {
      await updateMutation.mutateAsync({ id: editStaff.id, ...data })
      toast({ type: 'success', message: 'Staff updated successfully' })
      setEditStaff(null)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const handleVerify = async (member) => {
    const assignedRole = selectedRoles[member.id] || member.role || 'employee'
    setVerifyingId(member.id)
    try {
      await verifyMutation.mutateAsync({ id: member.id, role: assignedRole })
      toast({
        type: 'success',
        message: `${member.name} verified and assigned role: ${roleLabels[assignedRole] || assignedRole}`,
      })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Verification failed' })
    } finally {
      setVerifyingId(null)
    }
  }

  const handleReject = async (member) => {
    if (!confirm(`Are you sure you want to reject the registration for ${member.name}?`)) return
    try {
      await deleteMutation.mutateAsync(member.id)
      toast({ type: 'info', message: `Registration for ${member.name} was rejected.` })
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const handleRemove = async (member) => {
    if (member.role === 'super_admin' || member.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast({ type: 'error', message: 'The Super Admin account cannot be removed.' })
      return
    }

    if (!confirm(`Are you sure you want to remove ${member.name} from staff? This will revoke their access.`)) return
    try {
      await deleteMutation.mutateAsync(member.id)
      toast({ type: 'success', message: `${member.name} removed successfully` })
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const allStaff = staff || []

  // Categorize
  const pending = allStaff.filter(
    s => s.verified === false || s.status === 'pending_verification' || !s.role || s.role === 'pending'
  )

  const active = allStaff.filter(
    s => s.active && s.verified !== false && s.role && s.role !== 'pending' && s.status !== 'pending_verification'
  )

  const inactive = allStaff.filter(
    s => !s.active && s.verified !== false && s.role && s.role !== 'pending' && s.status !== 'pending_verification'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
              Staff & Role Management
            </h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Crown className="h-3 w-3" />
                Super Admin Panel
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            {active.length} active verified members {pending.length > 0 && `• ${pending.length} pending verification`}
          </p>
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Add Staff Member
        </Button>
      </div>

      {/* Super Admin Notice Card */}
      <div
        className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0"
            style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
              Super Admin Control: <span className="font-mono text-xs">{SUPER_ADMIN_EMAIL}</span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              Staff roles are hidden during registration. New signups enter the pending pool below until you assign their role.
            </p>
          </div>
        </div>

        {pending.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shrink-0 shadow-xs">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            {pending.length} Action Required
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All staff verified
          </span>
        )}
      </div>

      {/* PENDING VERIFICATIONS SECTION */}
      {isSuperAdmin && (
        <Card
          className="shadow-sm overflow-hidden"
          style={{
            borderColor: pending.length > 0 ? '#f59e0b' : 'var(--border)',
            borderWidth: pending.length > 0 ? '2px' : '1px',
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2"
            style={{
              backgroundColor: pending.length > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="font-semibold text-base" style={{ color: 'var(--fg)' }}>
                  Pending Staff Verifications & Role Assignment
                </h2>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Review newly registered staff, assign their operational role, and grant store access
                </p>
              </div>
            </div>
            <Badge variant={pending.length > 0 ? 'warning' : 'default'} className="px-2.5 py-1 text-xs">
              {pending.length} Waiting Verification
            </Badge>
          </div>

          <CardContent className="p-5">
            {pending.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
                <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>
                  No Pending Staff Verifications
                </p>
                <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>
                  When a new employee registers on the sign-up page, their application will appear here for you to verify and assign their staff role.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pending.map(applicant => {
                  const roleChoice = selectedRoles[applicant.id] || 'employee'
                  const isVerifying = verifyingId === applicant.id

                  return (
                    <div
                      key={applicant.id}
                      className="p-4 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all"
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {/* Left: Applicant info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className="h-11 w-11 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#d97706',
                          }}
                        >
                          {applicant.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                              {applicant.name}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Verification
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--fg-muted)' }}>
                            {applicant.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {applicant.email}
                              </span>
                            )}
                            {applicant.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {applicant.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(applicant.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Role selection & action */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
                        <div className="w-full sm:w-60">
                          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
                            Assign Role:
                          </label>
                          <select
                            value={roleChoice}
                            onChange={e => setSelectedRoles({ ...selectedRoles, [applicant.id]: e.target.value })}
                            className="w-full rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2"
                            style={{
                              backgroundColor: 'var(--surface)',
                              color: 'var(--fg)',
                              borderColor: 'var(--border-strong)',
                            }}
                          >
                            {ASSIGNABLE_ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-0 sm:pt-4">
                          <Button
                            onClick={() => handleVerify(applicant)}
                            loading={isVerifying}
                            size="sm"
                            className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Verify & Set Role
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleReject(applicant)}
                            className="p-2 rounded-lg border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            style={{ borderColor: 'var(--border)' }}
                            title="Reject Registration"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ACTIVE STAFF TABLE */}
      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold text-base" style={{ color: 'var(--fg)' }}>
            Active Staff Members ({active.length})
          </h3>
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Verified accounts with active store access
          </span>
        </div>

        {isLoading ? (
          <CardContent>
            <div className="animate-pulse space-y-3 py-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name & Contact', 'Role', 'Status', 'Date Joined', 'Actions'].map(h => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-xs font-semibold uppercase ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((member, idx) => {
                  const isSuper = member.role === 'super_admin' || member.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()

                  return (
                    <TrHover key={member.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 relative"
                            style={{
                              background: isSuper ? 'rgba(245, 158, 11, 0.2)' : 'var(--brand-light)',
                              color: isSuper ? '#d97706' : 'var(--brand)',
                            }}
                          >
                            {isSuper ? <Crown className="h-4 w-4" /> : member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium" style={{ color: 'var(--fg)' }}>{member.name}</span>
                              {isSuper && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                              {member.email || member.phone || 'No direct contact'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <Badge variant={roleColors[member.role] || 'purple'}>
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </td>

                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      </td>

                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(member.created_at)}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditStaff(member)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--brand)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="Edit Role / Info"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {!isSuper && (
                            <button
                              onClick={() => handleRemove(member)}
                              className="p-1.5 rounded-lg transition-colors text-red-500 hover:text-red-600"
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              title="Remove Staff Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </TrHover>
                  )
                })}

                {active.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <UserCog className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--fg-subtle)' }}>No active verified staff</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* INACTIVE STAFF */}
      {inactive.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--fg-muted)' }}>
              Inactive Staff Members ({inactive.length})
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {inactive.map(member => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3 opacity-60">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ background: 'var(--surface-hover)', color: 'var(--fg-subtle)' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium line-through" style={{ color: 'var(--fg)' }}>{member.name}</p>
                    <Badge variant="default" className="mt-0.5">{roleLabels[member.role] || member.role}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemove(member)}
                    className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove Staff Member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add & Verify New Staff">
        <StaffForm onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editStaff} onClose={() => setEditStaff(null)} title="Edit Staff Role & Details">
        {editStaff && (
          <StaffForm
            defaultValues={editStaff}
            onSubmit={handleUpdate}
            loading={updateMutation.isPending}
            isEditing
          />
        )}
      </Modal>
    </div>
  )
}

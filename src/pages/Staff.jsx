// src/pages/Staff.jsx
import { useState } from 'react'
import {
  useAllStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from '../hooks/useStaff'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Search,
  Users,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'

const staffSchema = z.object({
  name: z.string().min(2, 'Full name is required (at least 2 characters)'),
  phone: z.string().min(4, 'Phone number is required'),
  role: z.enum(['employee', 'cashier', 'admin', 'both', 'workshop', 'installer']),
  pin_code: z.string().min(4, 'Security PIN must be at least 4 digits').max(6, 'PIN cannot exceed 6 digits').regex(/^\d+$/, 'PIN must contain numeric digits only'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  active: z.boolean().default(true),
})

const STAFF_ROLES = [
  { value: 'cashier', label: 'Cashier (Receives & Edits Payments)' },
  { value: 'employee', label: 'Sales Representative (Attends Clients & Orders)' },
  { value: 'both', label: 'Sales Representative & Cashier (Multi-role)' },
  { value: 'admin', label: 'Store Manager / Admin (Full Access)' },
]

const roleBadgeColors = {
  employee: 'blue',
  both: 'purple',
  cashier: 'green',
  admin: 'rose',
  super_admin: 'amber',
  workshop: 'gray',
  installer: 'gray',
}

const roleLabels = {
  cashier: 'Cashier',
  employee: 'Sales Representative',
  both: 'Sales & Cashier',
  admin: 'Store Manager',
  super_admin: 'Super Admin & Cashier',
  workshop: 'Workshop / Tailor',
  installer: 'Installer',
}

function StaffFormModal({ open, onClose, initialData, isEditing = false }) {
  const toast = useToast()
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const [showPin, setShowPin] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: initialData ? {
      name: initialData.name || '',
      phone: initialData.phone || '',
      role: initialData.role && ['employee', 'cashier', 'admin', 'both'].includes(initialData.role) ? initialData.role : 'cashier',
      pin_code: String(initialData.pin_code || '1234'),
      email: initialData.email || '',
      active: initialData.active ?? true,
    } : {
      name: '',
      phone: '',
      role: 'cashier',
      pin_code: '1234',
      email: '',
      active: true,
    },
  })

  const handleGeneratePin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000))
    setValue('pin_code', randomPin, { shouldValidate: true })
    toast({ type: 'info', message: `Generated 4-digit PIN: ${randomPin}` })
  }

  const onSubmit = async (data) => {
    try {
      const cleanPin = (data.pin_code || '').trim() || '1234'

      if (isEditing && initialData?.id) {
        await updateStaff.mutateAsync({
          id: initialData.id,
          name: data.name,
          phone: data.phone,
          role: data.role,
          pin_code: cleanPin,
          email: data.email || null,
          active: data.active,
          verified: true,
          status: data.active ? 'active' : 'inactive',
        })
        toast({ type: 'success', message: `${data.name} updated successfully!` })
      } else {
        await createStaff.mutateAsync({
          name: data.name,
          phone: data.phone,
          role: data.role,
          pin_code: cleanPin,
          email: data.email || null,
          active: true,
          verified: true,
          status: 'active',
        })
        toast({
          type: 'success',
          message: `${data.name} added to staff roster with mandatory PIN protection!`,
        })
      }
      reset()
      onClose()
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to save staff member.' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit Staff Member — ${initialData?.name}` : 'Add New Staff Member'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Staff members added here can be assigned to customer orders, sales attributions, and commission reports. Each staff member requires a PIN to switch accounts and authorize registers.
        </p>

        <Input
          label="Full Name *"
          placeholder="e.g. Prince Mukasa"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Phone Number *"
          placeholder="e.g. 0772 000 000"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Select label="Staff Role / Department *" error={errors.role?.message} {...register('role')}>
          {STAFF_ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>

        {/* Security Access PIN Input */}
        <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
              <Lock className="h-4 w-4 text-purple-500" />
              <span>Security Access PIN * (Mandatory 4–6 Digits)</span>
            </label>
            <button
              type="button"
              onClick={handleGeneratePin}
              className="text-xs font-semibold hover:underline text-purple-600 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate PIN
            </button>
          </div>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={6}
              placeholder="e.g. 1234 (4–6 digits)"
              className="w-full px-3 py-2 text-sm rounded-lg border font-mono tracking-widest transition-colors focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'var(--surface)',
                borderColor: errors.pin_code ? '#ef4444' : 'var(--border)',
                color: 'var(--fg)',
              }}
              {...register('pin_code')}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
              tabIndex={-1}
              title={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.pin_code && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.pin_code.message}</p>
          )}
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            🔒 Mandatory for <strong>Admin</strong>, <strong>Sales Representatives</strong>, and <strong>Cashiers</strong> to authorize register access, collect customer payments, and edit transactions.
          </p>
        </div>

        <Input
          label="Email Address (Optional)"
          type="email"
          placeholder="e.g. staff@curtainworld.ug"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Staff Member'}
          </Button>
        </div>
      </form>
    </Modal>
  )
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data: staffList, isLoading, refetch, isFetching } = useAllStaff()
  const deleteStaff = useDeleteStaff()
  const updateStaff = useUpdateStaff()
  const toast = useToast()
  const confirm = useConfirm()

  const allStaff = staffList || []

  const filteredStaff = allStaff.filter(s => {
    const matchesSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === 'all' ||
      s.role === roleFilter ||
      (roleFilter === 'admin' && (s.role === 'admin' || s.role === 'super_admin'))
    return matchesSearch && matchesRole
  })

  const salesCount = allStaff.filter(s => s.role === 'employee' || s.role === 'both').length
  const cashierCount = allStaff.filter(s => s.role === 'cashier' || s.role === 'both' || s.role === 'super_admin').length
  const adminCount = allStaff.filter(s => s.role === 'admin' || s.role === 'super_admin').length

  const handleDelete = async (staffMember) => {
    const confirmed = await confirm({
      title: `Remove ${staffMember.name}?`,
      message: `Are you sure you want to remove ${staffMember.name} from the staff list? Past order history and sales records will remain preserved.`,
      confirmText: 'Remove Staff',
      variant: 'destructive',
    })

    if (!confirmed) return

    try {
      await deleteStaff.mutateAsync(staffMember.id)
      toast({ type: 'success', message: `${staffMember.name} removed from roster.` })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to remove staff member.' })
    }
  }

  const handleToggleStatus = async (staffMember) => {
    const newActive = !staffMember.active
    try {
      await updateStaff.mutateAsync({
        id: staffMember.id,
        active: newActive,
        status: newActive ? 'active' : 'inactive',
      })
      toast({
        type: 'success',
        message: `${staffMember.name} marked as ${newActive ? 'Active' : 'Inactive'}.`,
      })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Could not update status.' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
              Staff & Team Management
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin & Cashier Portal
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Manage sales representatives, cashiers, and administrators assigned to customer orders and registers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            loading={isFetching}
            className="text-xs"
            title="Sync latest roster"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Staff Member
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 shadow-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Total Team</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{allStaff.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Sales Reps</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{salesCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-green-500/10 text-green-600 dark:text-green-400 font-bold shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Cashiers</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{cashierCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Store Admins</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{adminCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Search & Filter bar */}
        <div
          className="p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--fg-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name, phone, email..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-strong)',
                color: 'var(--fg)',
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-strong)',
                color: 'var(--fg)',
              }}
            >
              <option value="all">All Roles</option>
              <option value="employee">Sales Representatives</option>
              <option value="cashier">Cashiers</option>
              <option value="both">Sales & Cashiers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="h-6 w-6 mx-auto animate-spin" style={{ color: 'var(--brand)' }} />
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Loading staff roster...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="h-10 w-10 mx-auto" style={{ color: 'var(--fg-muted)', opacity: 0.5 }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                {search ? 'No staff members match your search' : 'No staff members added yet'}
              </p>
              <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
                {search
                  ? 'Try changing your search query or role filter.'
                  : 'Add your sales reps and cashiers so you can attribute sales and orders to them.'}
              </p>
              {!search && (
                <Button onClick={() => setShowAddModal(true)} className="mt-2">
                  <Plus className="h-4 w-4" /> Add First Staff Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className="border-b text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role / Department</th>
                    <th className="py-3.5 px-4">Security PIN</th>
                    <th className="py-3.5 px-4">Phone Number</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {filteredStaff.map(member => {
                    const roleKey = member.role || 'employee'
                    const badgeVariant = roleBadgeColors[roleKey] || 'default'
                    const roleName = roleLabels[roleKey] || member.role || 'Staff'
                    const isSuper = member.role === 'super_admin' || member.email === 'sharityra41@gmail.com'

                    return (
                      <TrHover key={member.id}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                              style={{
                                backgroundColor: 'var(--brand-light)',
                                color: 'var(--brand)',
                              }}
                            >
                              {member.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div>
                              <div className="font-semibold" style={{ color: 'var(--fg)' }}>
                                {member.name}
                              </div>
                              {isSuper && (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  Primary Admin & Cashier
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant={badgeVariant} className="text-[11px] font-medium">
                            {roleName}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          {member.pin_code && String(member.pin_code).trim().length >= 4 ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-xs"
                              style={{
                                backgroundColor: 'rgba(124, 58, 237, 0.12)',
                                borderColor: 'rgba(124, 58, 237, 0.28)',
                                color: 'var(--brand)',
                              }}
                              title="Account is protected with Security PIN"
                            >
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span>PIN Protected</span>
                            </span>
                          ) : ['workshop', 'installer'].includes(member.role) ? (
                            <span className="text-[11px] text-[var(--fg-muted)] italic">
                              Not Required
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-xs"
                              style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                borderColor: 'rgba(245, 158, 11, 0.28)',
                                color: '#d97706',
                              }}
                              title="No PIN configured. Mandatory for payment accounts."
                            >
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                              <span>No PIN</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono" style={{ color: 'var(--fg)' }}>
                            <Phone className="h-3 w-3" style={{ color: 'var(--fg-muted)' }} />
                            {member.phone || '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {member.email ? (
                            <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--fg-muted)' }}>—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {member.active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingStaff(member)}
                              className="p-1.5 rounded-lg hover:bg-purple-500/10 active:scale-95 transition-all cursor-pointer"
                              title="Edit staff details"
                              style={{ color: 'var(--fg-muted)' }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {!isSuper && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(member)}
                                  className="px-2 py-1 rounded-lg hover:bg-purple-500/10 active:scale-95 transition-all text-[11px] font-medium cursor-pointer"
                                  title={member.active ? 'Deactivate staff' : 'Activate staff'}
                                  style={{ color: member.active ? '#d97706' : '#16a34a' }}
                                >
                                  {member.active ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(member)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-500 hover:text-red-600 active:scale-95 transition-all cursor-pointer"
                                  title="Remove staff member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </TrHover>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      {showAddModal && (
        <StaffFormModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <StaffFormModal
          open={Boolean(editingStaff)}
          onClose={() => setEditingStaff(null)}
          initialData={editingStaff}
          isEditing={true}
        />
      )}
    </div>
  )
}

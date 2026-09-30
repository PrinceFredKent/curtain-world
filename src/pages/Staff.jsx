// src/pages/Staff.jsx
import { useState } from 'react'
import { useAllStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from '../hooks/useStaff'
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
import { Plus, Edit2, UserX, UserCheck, UserCog } from 'lucide-react'
import { formatDate } from '../lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['employee', 'cashier', 'both']),
})

function StaffForm({ defaultValues, onSubmit, loading }) {
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
      <Select label="Role *" error={errors.role?.message} {...register('role')}>
        <option value="employee">Employee (Sales)</option>
        <option value="cashier">Cashier (Payments)</option>
        <option value="both">Both (Employee + Cashier)</option>
      </Select>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Save Staff</Button>
      </div>
    </form>
  )
}

const roleColors = {
  employee: 'blue',
  cashier: 'green',
  both: 'purple',
}

const roleLabels = {
  employee: 'Employee',
  cashier: 'Cashier',
  both: 'Employee & Cashier',
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
  const { data: staff, isLoading } = useAllStaff()
  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const deleteMutation = useDeleteStaff()
  const toast = useToast()

  const handleCreate = async (data) => {
    try {
      await createMutation.mutateAsync(data)
      toast({ type: 'success', message: 'Staff added' })
      setShowCreate(false)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const handleUpdate = async (data) => {
    try {
      await updateMutation.mutateAsync({ id: editStaff.id, ...data })
      toast({ type: 'success', message: 'Staff updated' })
      setEditStaff(null)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const handleToggleActive = async (member) => {
    const action = member.active ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) return
    try {
      await updateMutation.mutateAsync({ id: member.id, active: !member.active })
      toast({ type: 'success', message: `Staff ${action}d` })
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const active = (staff || []).filter(s => s.active)
  const inactive = (staff || []).filter(s => !s.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Staff</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{active.length} active members</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {/* Active staff */}
      <Card>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Active Staff</h3>
        </div>
        {isLoading ? (
          <CardContent>
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Role', 'Added', 'Actions'].map(h => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase ${h === 'Actions' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--fg-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((member, idx) => (
                  <TrHover key={member.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm"
                          style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--fg)' }}>{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={roleColors[member.role]}>{roleLabels[member.role]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{formatDate(member.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditStaff(member)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--brand)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(member)}
                          className="p-1.5 rounded-lg transition-colors text-red-500"
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Deactivate"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </TrHover>
                ))}
                {active.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center">
                      <UserCog className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>No active staff</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inactive staff */}
      {inactive.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--fg-muted)' }}>Inactive Staff</h3>
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
                    <Badge variant="default" className="mt-0.5">{roleLabels[member.role]}</Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(member)}
                  className="p-1.5 rounded-lg transition-colors text-emerald-600"
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Reactivate"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Staff Member">
        <StaffForm onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editStaff} onClose={() => setEditStaff(null)} title="Edit Staff Member">
        {editStaff && (
          <StaffForm
            defaultValues={editStaff}
            onSubmit={handleUpdate}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}

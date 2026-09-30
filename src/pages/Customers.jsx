// src/pages/Customers.jsx
import { useState } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useCustomers'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Edit2, Trash2, Phone, User, Users } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Enter a valid phone number'),
})

function CustomerForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Full Name" icon={<User className="h-4 w-4" />} placeholder="e.g. Namubiru Grace"
        error={errors.full_name?.message} {...register('full_name')} />
      <Input label="Phone / WhatsApp" icon={<Phone className="h-4 w-4" />} placeholder="+256 772 000 000"
        type="tel" error={errors.phone?.message} {...register('phone')} />
      <div className="pt-2 flex justify-end">
        <Button type="submit" loading={loading}>Save Customer</Button>
      </div>
    </form>
  )
}

// Shared table row hover style helper
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

export function Customers() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)

  const { data: customers, isLoading } = useCustomers(search)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()
  const toast = useToast()
  const confirm = useConfirm()

  const handleCreate = async (data) => {
    try {
      await createMutation.mutateAsync(data)
      toast({ type: 'success', message: 'Customer created!' })
      setShowCreate(false)
    } catch (err) { toast({ type: 'error', message: err.message }) }
  }

  const handleUpdate = async (data) => {
    try {
      await updateMutation.mutateAsync({ id: editCustomer.id, ...data })
      toast({ type: 'success', message: 'Customer updated' })
      setEditCustomer(null)
    } catch (err) { toast({ type: 'error', message: err.message }) }
  }

  const handleDelete = async (customer) => {
    const confirmed = await confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customer.full_name}?`,
      confirmText: 'Delete Customer',
      cancelText: 'Cancel',
      variant: 'danger',
      itemDetails: {
        label: 'Customer',
        value: customer.full_name,
        subtext: customer.phone,
        badge: 'Customer Record',
      },
      warningNote: 'This customer profile will be permanently removed. Their previous orders will be preserved.',
    })

    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync(customer.id)
      toast({ type: 'success', message: `${customer.full_name} deleted successfully` })
    } catch (err) { toast({ type: 'error', message: err.message }) }
  }

  const thStyle = 'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{customers?.length ?? 0} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <Input placeholder="Search by name or phone…" icon={<Search className="h-4 w-4" />}
        value={search} onChange={e => setSearch(e.target.value)} />

      <Card>
        {isLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--surface-hover)' }} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Phone', 'Since', 'Actions'].map((h, i) => (
                    <th key={h} className={thStyle} style={{ color: 'var(--fg-muted)', textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(customers || []).map((c, idx) => (
                  <TrHover key={c.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-5 py-3">
                      <Link to={`/customers/${c.id}`} className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{c.phone}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--fg-subtle)' }}>{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditCustomer(c)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--brand)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        ><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg transition-colors text-red-500 cursor-pointer"
                          style={{ color: 'var(--danger)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Delete customer"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </TrHover>
                ))}
                {(!customers || customers.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center">
                    <Users className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                    <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>No customers found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <CustomerForm onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        {editCustomer && <CustomerForm defaultValues={editCustomer} onSubmit={handleUpdate} loading={updateMutation.isPending} />}
      </Modal>
    </div>
  )
}

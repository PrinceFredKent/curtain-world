// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import {
  INITIAL_STAFF,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS
} from './demoData'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isLiveSupabase = Boolean(
  envUrl &&
  envKey &&
  envUrl.startsWith('http') &&
  !envUrl.includes('your-project.supabase.co')
)

// In-browser Local Storage Mock Client for instant preview / demo mode
function notifyDataChanged(key) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cw_storage_sync', { detail: { key } }))
    }
  } catch {
    // ignore
  }
}

class LocalStorageTable {
  constructor(tableName, initialData) {
    this.key = `cw_${tableName}`
    this.tableName = tableName
    if (!localStorage.getItem(this.key)) {
      localStorage.setItem(this.key, JSON.stringify(initialData))
    }
  }

  getAll() {
    try {
      let data = JSON.parse(localStorage.getItem(this.key)) || []
      if (this.tableName === 'staff') {
        const deletedIds = JSON.parse(localStorage.getItem('cw_deleted_staff_ids') || '[]')
        const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
        
        // Remove any deleted items
        if (deletedIds.length > 0) {
          data = data.filter(s => !deletedIds.includes(s.id) && !deletedIds.includes(s.email?.toLowerCase()))
        }

        let modified = false
        // Merge registered accounts from custom users
        for (const u of customUsers) {
          const email = (u.email || '').toLowerCase().trim()
          if (deletedIds.includes(u.id) || (email && deletedIds.includes(email))) {
            continue
          }

          const existingIdx = data.findIndex(
            s => (s.id && s.id === u.id) || (s.email && s.email.toLowerCase().trim() === email)
          )

          if (existingIdx === -1) {
            const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase()
            const role = isSuper ? 'super_admin' : (u.user_metadata?.role || u.role || null)
            const verified = isSuper ? true : Boolean(u.user_metadata?.verified || u.verified || false)
            const status = isSuper ? 'active' : (u.user_metadata?.status || (verified ? 'active' : 'pending_verification'))

            data.push({
              id: u.id || generateUUID(),
              name: u.user_metadata?.full_name || u.name || (email ? email.split('@')[0] : 'Staff Member'),
              email: u.email || '',
              phone: u.phone || u.user_metadata?.phone || '',
              role: role,
              active: isSuper ? true : Boolean(u.active ?? (verified && role && role !== 'pending')),
              verified: verified,
              status: status,
              created_at: u.created_at || u.user_metadata?.registered_at || new Date().toISOString(),
            })
            modified = true
          } else {
            // Keep role and verified status synced from user_metadata if changed
            const current = data[existingIdx]
            const metaRole = u.user_metadata?.role
            const metaVerified = u.user_metadata?.verified
            if (metaRole !== undefined && metaRole !== current.role) {
              current.role = metaRole
              modified = true
            }
            if (metaVerified !== undefined && metaVerified !== current.verified) {
              current.verified = metaVerified
              current.status = metaVerified ? 'active' : 'pending_verification'
              current.active = Boolean(metaVerified && current.role && current.role !== 'pending')
              modified = true
            }
          }
        }

        // Ensure every staff member has a pin_code
        let pinUpdated = false
        data = data.map(s => {
          if (!s.pin_code) {
            pinUpdated = true
            return { ...s, pin_code: '1234' }
          }
          return s
        })

        if (modified || pinUpdated) {
          localStorage.setItem(this.key, JSON.stringify(data))
        }
      }
      return data
    } catch {
      return []
    }
  }

  saveAll(data) {
    localStorage.setItem(this.key, JSON.stringify(data))
    notifyDataChanged(this.key)
  }
}

export const SUPER_ADMIN_EMAIL = 'sharityra41@gmail.com'

export function syncStaffUpdateToAuth(staffRec) {
  if (!staffRec) return
  try {
    const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
    let userChanged = false
    const nextUsers = customUsers.map(u => {
      const isMatch = (staffRec.id && u.id === staffRec.id) ||
                      (staffRec.email && u.email && u.email.toLowerCase() === staffRec.email.toLowerCase()) ||
                      (staffRec.name && u.user_metadata?.full_name === staffRec.name)
      if (isMatch) {
        userChanged = true
        return {
          ...u,
          user_metadata: {
            ...u.user_metadata,
            role: staffRec.role,
            verified: Boolean(staffRec.verified),
            status: staffRec.status || (staffRec.verified ? 'active' : 'pending_verification'),
          }
        }
      }
      return u
    })
    if (userChanged) {
      localStorage.setItem('cw_custom_users', JSON.stringify(nextUsers))
      notifyDataChanged('cw_custom_users')
    }

    const sessionRaw = localStorage.getItem('cw_auth_session')
    if (sessionRaw) {
      const sessionUser = JSON.parse(sessionRaw)
      const isMatch = (staffRec.id && sessionUser.id === staffRec.id) ||
                      (staffRec.email && sessionUser.email && sessionUser.email.toLowerCase() === staffRec.email.toLowerCase()) ||
                      (staffRec.name && sessionUser.user_metadata?.full_name === staffRec.name)
      if (isMatch) {
        const updatedSession = {
          ...sessionUser,
          user_metadata: {
            ...sessionUser.user_metadata,
            role: staffRec.role,
            verified: Boolean(staffRec.verified),
            status: staffRec.status || (staffRec.verified ? 'active' : 'pending_verification'),
          }
        }
        localStorage.setItem('cw_auth_session', JSON.stringify(updatedSession))
        notifyDataChanged('cw_auth_session')
        authListeners.forEach(cb => cb('USER_UPDATED', { user: updatedSession }))
      }
    }
  } catch (err) {
    console.error('Error syncing staff update to auth:', err)
  }
}

const mockTables = {
  staff: new LocalStorageTable('staff', INITIAL_STAFF),
  customers: new LocalStorageTable('customers', INITIAL_CUSTOMERS),
  orders: new LocalStorageTable('orders', INITIAL_ORDERS),
  order_items: new LocalStorageTable('order_items', INITIAL_ITEMS),
  transactions: new LocalStorageTable('transactions', INITIAL_TRANSACTIONS),
}

// Ensure Super Admin and initial pending member exist in staff table if table was pre-initialized
try {
  const staffList = mockTables.staff.getAll()
  let changed = false
  if (!staffList.some(s => (s.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) {
    staffList.unshift({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Sharity (Super Admin)',
      email: SUPER_ADMIN_EMAIL,
      phone: '+256 700 000 001',
      role: 'super_admin',
      active: true,
      verified: true,
      status: 'active',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    })
    changed = true
  }
  if (!staffList.some(s => (s.email || '').toLowerCase() === 'kigozi@curtainworld.ug')) {
    staffList.push({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Kigozi Peter',
      email: 'kigozi@curtainworld.ug',
      phone: '+256 702 334 455',
      role: null,
      active: false,
      verified: false,
      status: 'pending_verification',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    })
    changed = true
  }
  if (changed) {
    mockTables.staff.saveAll(staffList)
  }
} catch {
  // Ignore
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

class MockQueryBuilder {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orderBy = null
    this.rangeOffset = 0
    this.rangeLimit = null
    this.singleMode = false
    this.countMode = null
    this.isHead = false
    this.pendingUpdate = null
    this.pendingDelete = false
  }

  select(query = '*', options = {}) {
    if (options.count) this.countMode = options.count
    if (options.head) this.isHead = true
    return this
  }

  eq(col, val) {
    this.filters.push(item => item[col] === val)
    return this
  }

  in(col, vals) {
    this.filters.push(item => vals.includes(item[col]))
    return this
  }

  or(filterStr) {
    // Basic ilike or match: full_name.ilike.%xxx%,phone.ilike.%xxx%
    const parts = filterStr.split(',')
    this.filters.push(item => {
      return parts.some(part => {
        const [col, op, pattern] = part.split('.')
        const search = (pattern || '').replace(/%/g, '').toLowerCase()
        return String(item[col] || '').toLowerCase().includes(search)
      })
    })
    return this
  }

  gte(col, val) {
    this.filters.push(item => new Date(item[col]) >= new Date(val))
    return this
  }

  lte(col, val) {
    this.filters.push(item => new Date(item[col]) <= new Date(val))
    return this
  }

  order(col, { ascending = true } = {}) {
    this.orderBy = { col, ascending }
    return this
  }

  range(from, to) {
    this.rangeOffset = from
    this.rangeLimit = to - from + 1
    return this
  }

  limit(num) {
    this.rangeLimit = num
    return this
  }

  single() {
    this.singleMode = true
    return this
  }

  async _resolveData() {
    const storage = mockTables[this.table]
    if (!storage) return { data: [], error: null, count: 0 }

    // If a pending update is queued, apply to records matching filters
    if (this.pendingUpdate) {
      const current = storage.getAll()
      let updatedRecords = []
      const next = current.map(item => {
        const match = this.filters.length === 0 || this.filters.every(f => f(item))
        if (match) {
          const rec = { ...item, ...this.pendingUpdate, updated_at: new Date().toISOString() }
          if (this.table === 'orders' && this.pendingUpdate.total_amount !== undefined) {
            rec.balance = Number(rec.total_amount) - Number(rec.deposit || 0)
          }
          updatedRecords.push(rec)
          return rec
        }
        return item
      })
      storage.saveAll(next)

      if (this.table === 'staff') {
        for (const staffRec of updatedRecords) {
          syncStaffUpdateToAuth(staffRec)
        }
      }

      const data = this.singleMode ? (updatedRecords[0] || null) : updatedRecords
      return { data, error: null }
    }

    // If a pending delete is queued
    if (this.pendingDelete) {
      const current = storage.getAll()
      const deletedItems = []
      const next = current.filter(item => {
        const match = this.filters.length > 0 && this.filters.every(f => f(item))
        if (match) deletedItems.push(item)
        return !match
      })
      storage.saveAll(next)

      if (this.table === 'transactions') {
        try {
          const ordStorage = mockTables.orders
          const allOrders = ordStorage.getAll()
          const affectedOrderIds = new Set(deletedItems.map(t => t.order_id).filter(Boolean))
          for (const ordId of affectedOrderIds) {
            const ordIdx = allOrders.findIndex(o => o.id === ordId)
            if (ordIdx !== -1) {
              const remainingTxns = next.filter(t => t.order_id === ordId)
              const totalPaid = remainingTxns.reduce((s, t) => s + Number(t.amount || 0), 0)
              const ord = allOrders[ordIdx]
              const totalAmount = Number(ord.total_amount || 0)
              ord.deposit = totalPaid
              ord.balance = Math.max(0, totalAmount - totalPaid)
              ord.status = ord.balance === 0 && totalAmount > 0 ? 'paid' : (ord.deposit > 0 ? 'partial' : 'pending')
              allOrders[ordIdx] = ord
            }
          }
          ordStorage.saveAll(allOrders)
        } catch {
          // ignore
        }
      }

      if (this.table === 'staff') {
        try {
          const deletedIds = JSON.parse(localStorage.getItem('cw_deleted_staff_ids') || '[]')
          for (const d of deletedItems) {
            if (d.id && !deletedIds.includes(d.id)) deletedIds.push(d.id)
            if (d.email && !deletedIds.includes(d.email.toLowerCase())) deletedIds.push(d.email.toLowerCase())
          }
          localStorage.setItem('cw_deleted_staff_ids', JSON.stringify(deletedIds))

          const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
          const filteredUsers = customUsers.filter(u => !deletedItems.some(d => d.id === u.id || (d.email && d.email.toLowerCase() === u.email?.toLowerCase())))
          localStorage.setItem('cw_custom_users', JSON.stringify(filteredUsers))
          notifyDataChanged('cw_custom_users')
        } catch {
          // ignore
        }
      }

      return { data: null, error: null }
    }

    let records = [...storage.getAll()]

    // Apply filters
    for (const f of this.filters) {
      records = records.filter(f)
    }

    const count = records.length

    // Sort
    if (this.orderBy) {
      const { col, ascending } = this.orderBy
      records.sort((a, b) => {
        if (a[col] < b[col]) return ascending ? -1 : 1
        if (a[col] > b[col]) return ascending ? 1 : -1
        return 0
      })
    }

    // Populate relations for orders, transactions
    const staffList = mockTables.staff.getAll()
    const customersList = mockTables.customers.getAll()
    const itemsList = mockTables.order_items.getAll()
    const txnsList = mockTables.transactions.getAll()
    const ordersList = mockTables.orders.getAll()

    if (this.table === 'orders') {
      records = records.map(ord => {
        const ordTxns = txnsList.filter(t => t.order_id === ord.id)
        const seenTxnIds = new Set()
        const uniqueTxns = []
        for (const t of ordTxns) {
          if (!seenTxnIds.has(t.id)) {
            seenTxnIds.add(t.id)
            uniqueTxns.push(t)
          }
        }
        const totalPaid = uniqueTxns.reduce((s, t) => s + Number(t.amount || 0), 0)
        const totalAmount = Number(ord.total_amount || 0)
        const trueDeposit = uniqueTxns.length > 0 ? totalPaid : Number(ord.deposit || 0)
        const trueBalance = Math.max(0, totalAmount - trueDeposit)
        const trueStatus = (trueBalance === 0 && totalAmount > 0)
          ? 'paid'
          : (trueDeposit > 0 ? 'partial' : 'pending')

        return {
          ...ord,
          deposit: trueDeposit,
          balance: trueBalance,
          status: ord.status === 'cancelled' ? 'cancelled' : trueStatus,
          customer: customersList.find(c => c.id === ord.customer_id) || null,
          employee: staffList.find(s => s.id === ord.employee_id) || null,
          cashier: staffList.find(s => s.id === ord.cashier_id) || null,
          order_items: itemsList.filter(i => i.order_id === ord.id),
          transactions: uniqueTxns,
        }
      })
    } else if (this.table === 'transactions') {
      records = records.map(t => {
        const parentOrder = ordersList.find(o => o.id === t.order_id)
        return {
          ...t,
          customer: customersList.find(c => c.id === t.customer_id) || null,
          order: parentOrder || null,
          employee: staffList.find(s => s.id === t.employee_id) || null,
          cashier: staffList.find(s => s.id === t.cashier_id) || null,
        }
      })
    }

    // Slice
    if (this.rangeLimit !== null) {
      records = records.slice(this.rangeOffset, this.rangeOffset + this.rangeLimit)
    }

    if (this.singleMode) {
      return { data: records[0] || null, error: null, count }
    }

    return { data: this.isHead ? null : records, error: null, count }
  }

  then(resolve, reject) {
    return this._resolveData().then(resolve, reject)
  }

  async insert(recordOrRecords) {
    const storage = mockTables[this.table]
    const current = storage.getAll()
    const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords]

    const newRecords = []
    let updated = [...current]

    if (this.table === 'staff') {
      try {
        const deletedIds = JSON.parse(localStorage.getItem('cw_deleted_staff_ids') || '[]')
        const emailsToUnDelete = records.map(r => r.email?.toLowerCase()).filter(Boolean)
        const idsToUnDelete = records.map(r => r.id).filter(Boolean)
        const filteredDeleted = deletedIds.filter(id => !idsToUnDelete.includes(id) && !emailsToUnDelete.includes(id))
        localStorage.setItem('cw_deleted_staff_ids', JSON.stringify(filteredDeleted))
      } catch {
        // ignore
      }
    }

    for (const rec of records) {
      const newRec = {
        id: rec.id || generateUUID(),
        created_at: rec.created_at || new Date().toISOString(),
        ...rec,
      }
      if (this.table === 'orders' && !newRec.order_number) {
        const maxNum = current.reduce((m, o) => Math.max(m, o.order_number || 1000), 1000)
        newRec.order_number = maxNum + 1
        newRec.deposit = newRec.deposit || 0
        newRec.balance = Number(newRec.total_amount || 0) - Number(newRec.deposit || 0)
        newRec.status = newRec.deposit >= newRec.total_amount ? 'paid' : (newRec.deposit > 0 ? 'partial' : 'pending')
      }

      if (this.table === 'staff') {
        const existingIdx = updated.findIndex(
          item => (newRec.id && item.id === newRec.id) ||
                  (newRec.email && item.email && item.email.toLowerCase().trim() === newRec.email.toLowerCase().trim())
        )
        if (existingIdx !== -1) {
          updated[existingIdx] = { ...updated[existingIdx], ...newRec }
          newRecords.push(updated[existingIdx])
          continue
        }
      }

      updated.push(newRec)
      newRecords.push(newRec)
    }

    storage.saveAll(updated)

    // If transaction inserted, sync order deposit and status
    if (this.table === 'transactions') {
      for (const txn of newRecords) {
        if (txn.order_id) {
          const ordStorage = mockTables.orders
          const allOrders = ordStorage.getAll()
          const ordIdx = allOrders.findIndex(o => o.id === txn.order_id)
          if (ordIdx !== -1) {
            // Note: storage.saveAll(updated) above already includes newRecords.
            // Retrieve actual saved transactions and deduplicate by id
            const allTxns = mockTables.transactions.getAll()
            const ordTxns = allTxns.filter(t => t.order_id === txn.order_id)
            const seenTxnIds = new Set()
            const uniqueTxns = []
            for (const t of ordTxns) {
              if (!seenTxnIds.has(t.id)) {
                seenTxnIds.add(t.id)
                uniqueTxns.push(t)
              }
            }
            const totalPaid = uniqueTxns.reduce((s, t) => s + Number(t.amount || 0), 0)
            const ord = allOrders[ordIdx]
            const totalAmount = Number(ord.total_amount || 0)
            ord.deposit = totalPaid
            ord.balance = Math.max(0, totalAmount - totalPaid)
            ord.status = ord.balance === 0 && totalAmount > 0 ? 'paid' : (ord.deposit > 0 ? 'partial' : 'pending')
            allOrders[ordIdx] = ord
            ordStorage.saveAll(allOrders)
          }
        }
      }
    }

    return {
      select: () => ({
        single: async () => ({ data: newRecords[0], error: null }),
        then: (resolve) => resolve({ data: newRecords, error: null }),
      }),
      then: (resolve) => resolve({ data: newRecords, error: null }),
    }
  }

  update(updates) {
    this.pendingUpdate = updates
    return this
  }

  delete() {
    this.pendingDelete = true
    return this
  }
}

const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-9)

const DEMO_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'sharityra41@gmail.com',
    phone: '0700000001',
    password: 'password123',
    user_metadata: {
      full_name: 'Sharity (Super Admin)',
      role: 'super_admin',
      phone: '+256 700 000 001',
      verified: true,
      status: 'active',
    },
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'mukasa@curtainworld.ug',
    phone: '0772345678',
    password: 'password123',
    user_metadata: {
      full_name: 'Mukasa Joseph',
      role: 'employee',
      phone: '+256 772 345 678',
      verified: true,
      status: 'active',
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'nakato@curtainworld.ug',
    phone: '0701987654',
    password: 'password123',
    user_metadata: {
      full_name: 'Nakato Sarah',
      role: 'cashier',
      phone: '+256 701 987 654',
      verified: true,
      status: 'active',
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'okello@curtainworld.ug',
    phone: '0752456789',
    password: 'password123',
    user_metadata: {
      full_name: 'Okello Brian',
      role: 'both',
      phone: '+256 752 456 789',
      verified: true,
      status: 'active',
    },
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'kigozi@curtainworld.ug',
    phone: '0702334455',
    password: 'password123',
    user_metadata: {
      full_name: 'Kigozi Peter',
      role: null,
      phone: '+256 702 334 455',
      verified: false,
      status: 'pending_verification',
    },
  },
]

const authListeners = new Set()

const mockAuth = {
  async getSession() {
    const raw = localStorage.getItem('cw_auth_session')
    if (!raw) return { data: { session: null }, error: null }
    try {
      let user = JSON.parse(raw)
      // Check if user metadata in cw_custom_users or cw_staff has been updated by super admin
      const isSuper = (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      if (isSuper) {
        user = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            role: 'super_admin',
            verified: true,
            status: 'active',
          },
        }
      } else {
        const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
        const matchingCustom = customUsers.find(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email?.toLowerCase()))
        const staffList = mockTables.staff.getAll()
        const matchingStaff = staffList.find(s => s.id === user.id || (s.email && s.email.toLowerCase() === user.email?.toLowerCase()))

        if (matchingStaff) {
          user = {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              role: matchingStaff.role,
              verified: Boolean(matchingStaff.verified),
              status: matchingStaff.status || (matchingStaff.verified ? 'active' : 'pending_verification'),
            },
          }
        } else if (matchingCustom) {
          user = {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              ...matchingCustom.user_metadata,
            },
          }
        }
      }
      return { data: { session: { user, access_token: 'mock_token' } }, error: null }
    } catch {
      return { data: { session: null }, error: null }
    }
  },

  async getUser() {
    const { data: { session } } = await this.getSession()
    return { data: { user: session?.user ?? null }, error: null }
  },

  async signInWithPassword({ email, phone, identifier, password }) {
    const id = (identifier || email || phone || '').trim().toLowerCase()
    const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
    const allUsers = [...DEMO_USERS, ...customUsers]

    const found = allUsers.find(u => {
      if (u.email && u.email.toLowerCase() === id) return true
      if (u.phone && normalizePhone(u.phone) === normalizePhone(id)) return true
      if (u.user_metadata?.phone && normalizePhone(u.user_metadata.phone) === normalizePhone(id)) return true
      return false
    })

    const isSuper = id === SUPER_ADMIN_EMAIL.toLowerCase() || (found?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()

    if (!found) {
      if (isSuper) {
        // Automatically create and authenticate the designated super admin account
        const superUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email: SUPER_ADMIN_EMAIL,
          phone: '+256 700 000 001',
          password,
          user_metadata: {
            full_name: 'Sharity (Super Admin)',
            role: 'super_admin',
            phone: '+256 700 000 001',
            verified: true,
            status: 'active',
          },
        }
        customUsers.push(superUser)
        localStorage.setItem('cw_custom_users', JSON.stringify(customUsers))

        const sessionUser = {
          id: superUser.id,
          email: superUser.email,
          phone: superUser.phone,
          user_metadata: superUser.user_metadata,
          app_metadata: { provider: 'email' },
        }
        localStorage.setItem('cw_auth_session', JSON.stringify(sessionUser))
        authListeners.forEach(cb => cb('SIGNED_IN', { user: sessionUser }))
        return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
      }
      return { data: { user: null, session: null }, error: { message: 'Invalid email/phone or password' } }
    }

    if (found.password && found.password !== password) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email/phone or password' } }
    }

    let meta = { ...found.user_metadata }

    if (isSuper) {
      meta.role = 'super_admin'
      meta.verified = true
      meta.status = 'active'
    } else {
      // Sync from cw_staff if present
      const staffList = mockTables.staff.getAll()
      const matchingStaff = staffList.find(s => s.id === found.id || (s.email && s.email.toLowerCase() === found.email?.toLowerCase()))
      if (matchingStaff) {
        meta.role = matchingStaff.role
        meta.verified = Boolean(matchingStaff.verified)
        meta.status = matchingStaff.status || (matchingStaff.verified ? 'active' : 'pending_verification')
      }
    }

    const sessionUser = {
      id: found.id,
      email: found.email,
      phone: found.phone || meta.phone,
      user_metadata: meta,
      app_metadata: { provider: 'email' },
    }
    localStorage.setItem('cw_auth_session', JSON.stringify(sessionUser))
    authListeners.forEach(cb => cb('SIGNED_IN', { user: sessionUser }))
    return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
  },

  async signUp({ email, password, options = {} }) {
    const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
    const allUsers = [...DEMO_USERS, ...customUsers]
    const cleanEmail = (email || '').trim().toLowerCase()

    if (allUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { data: { user: null, session: null }, error: { message: 'User already registered with this email' } }
    }

    const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()
    const fullName = options.data?.full_name || email.split('@')[0]
    const phone = options.data?.phone || ''

    // Regular new staff registrations are pending verification with NO assigned role until admin sets it
    const role = isSuper ? 'super_admin' : (options.data?.role || null)
    const verified = isSuper ? true : Boolean(options.data?.verified || false)
    const status = isSuper ? 'active' : (verified ? 'active' : 'pending_verification')

    const newUser = {
      id: generateUUID(),
      email: cleanEmail,
      phone,
      password,
      user_metadata: {
        full_name: fullName,
        phone,
        role,
        verified,
        status,
        registered_at: new Date().toISOString(),
      },
    }

    // Remove from deleted IDs if re-registering
    try {
      const deletedIds = JSON.parse(localStorage.getItem('cw_deleted_staff_ids') || '[]')
      const filtered = deletedIds.filter(id => id !== newUser.id && id !== cleanEmail)
      localStorage.setItem('cw_deleted_staff_ids', JSON.stringify(filtered))
    } catch {
      // ignore
    }

    customUsers.push(newUser)
    localStorage.setItem('cw_custom_users', JSON.stringify(customUsers))
    notifyDataChanged('cw_custom_users')

    // Also register in mock staff table with pending status
    const staffStorage = mockTables.staff
    const currentStaff = staffStorage.getAll()
    const existingStaffIdx = currentStaff.findIndex(s => (s.email && s.email.toLowerCase() === cleanEmail) || s.id === newUser.id)
    if (existingStaffIdx === -1) {
      currentStaff.push({
        id: newUser.id,
        name: fullName,
        email: cleanEmail,
        phone,
        role,
        active: isSuper,
        verified,
        status,
        created_at: new Date().toISOString(),
      })
      staffStorage.saveAll(currentStaff)
    } else {
      currentStaff[existingStaffIdx] = {
        ...currentStaff[existingStaffIdx],
        name: fullName,
        phone: phone || currentStaff[existingStaffIdx].phone,
        role,
        active: isSuper,
        verified,
        status,
      }
      staffStorage.saveAll(currentStaff)
    }

    const sessionUser = {
      id: newUser.id,
      email: newUser.email,
      phone: newUser.phone,
      user_metadata: newUser.user_metadata,
      app_metadata: { provider: 'email' },
    }
    localStorage.setItem('cw_auth_session', JSON.stringify(sessionUser))
    authListeners.forEach(cb => cb('SIGNED_IN', { user: sessionUser }))
    return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
  },

  async signOut() {
    localStorage.removeItem('cw_auth_session')
    authListeners.forEach(cb => cb('SIGNED_OUT', null))
    return { error: null }
  },

  async resetPasswordForEmail(email) {
    return { data: {}, error: null }
  },

  onAuthStateChange(callback) {
    authListeners.add(callback)
    this.getSession().then(({ data }) => {
      if (data.session) callback('INITIAL_SESSION', data.session)
    })
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    }
  },
}

const mockSupabase = {
  from(table) {
    return new MockQueryBuilder(table)
  },
  auth: mockAuth,
}

export const supabase = isLiveSupabase
  ? createClient(envUrl, envKey)
  : mockSupabase


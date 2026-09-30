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
class LocalStorageTable {
  constructor(tableName, initialData) {
    this.key = `cw_${tableName}`
    if (!localStorage.getItem(this.key)) {
      localStorage.setItem(this.key, JSON.stringify(initialData))
    }
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || []
    } catch {
      return []
    }
  }

  saveAll(data) {
    localStorage.setItem(this.key, JSON.stringify(data))
  }
}

const mockTables = {
  staff: new LocalStorageTable('staff', INITIAL_STAFF),
  customers: new LocalStorageTable('customers', INITIAL_CUSTOMERS),
  orders: new LocalStorageTable('orders', INITIAL_ORDERS),
  order_items: new LocalStorageTable('order_items', INITIAL_ITEMS),
  transactions: new LocalStorageTable('transactions', INITIAL_TRANSACTIONS),
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
      records = records.map(ord => ({
        ...ord,
        customer: customersList.find(c => c.id === ord.customer_id) || null,
        employee: staffList.find(s => s.id === ord.employee_id) || null,
        cashier: staffList.find(s => s.id === ord.cashier_id) || null,
        order_items: itemsList.filter(i => i.order_id === ord.id),
        transactions: txnsList.filter(t => t.order_id === ord.id),
      }))
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

    const newRecords = records.map(rec => {
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
      return newRec
    })

    const updated = [...current, ...newRecords]
    storage.saveAll(updated)

    // If transaction inserted, sync order deposit and status
    if (this.table === 'transactions') {
      for (const txn of newRecords) {
        if (txn.order_id) {
          const ordStorage = mockTables.orders
          const allOrders = ordStorage.getAll()
          const ordIdx = allOrders.findIndex(o => o.id === txn.order_id)
          if (ordIdx !== -1) {
            const ordTxns = [...mockTables.transactions.getAll(), ...newRecords].filter(t => t.order_id === txn.order_id)
            const totalPaid = ordTxns.reduce((s, t) => s + Number(t.amount || 0), 0)
            const ord = allOrders[ordIdx]
            ord.deposit = totalPaid
            ord.balance = Math.max(0, Number(ord.total_amount || 0) - totalPaid)
            ord.status = ord.balance === 0 ? 'paid' : (ord.deposit > 0 ? 'partial' : 'pending')
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

  async update(updates) {
    const storage = mockTables[this.table]
    const current = storage.getAll()
    let updatedRecord = null

    const next = current.map(item => {
      const match = this.filters.every(f => f(item))
      if (match) {
        updatedRecord = { ...item, ...updates, updated_at: new Date().toISOString() }
        if (this.table === 'orders' && updates.total_amount !== undefined) {
          updatedRecord.balance = Number(updatedRecord.total_amount) - Number(updatedRecord.deposit || 0)
        }
        return updatedRecord
      }
      return item
    })

    storage.saveAll(next)

    return {
      eq: () => this,
      select: () => ({
        single: async () => ({ data: updatedRecord, error: null }),
        then: (resolve) => resolve({ data: updatedRecord, error: null }),
      }),
      then: (resolve) => resolve({ data: updatedRecord, error: null }),
    }
  }

  async delete() {
    const storage = mockTables[this.table]
    const current = storage.getAll()
    const next = current.filter(item => !this.filters.every(f => f(item)))
    storage.saveAll(next)
    return {
      eq: (col, val) => {
        this.eq(col, val)
        return this.delete()
      },
      then: (resolve) => resolve({ error: null }),
    }
  }
}

const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-9)

const DEMO_USERS = [
  { id: '11111111-1111-1111-1111-111111111111', email: 'mukasa@curtainworld.ug', phone: '0772345678', password: 'password123', user_metadata: { full_name: 'Mukasa Joseph', role: 'employee', phone: '+256 772 345 678' } },
  { id: '22222222-2222-2222-2222-222222222222', email: 'nakato@curtainworld.ug', phone: '0701987654', password: 'password123', user_metadata: { full_name: 'Nakato Sarah', role: 'cashier', phone: '+256 701 987 654' } },
  { id: '33333333-3333-3333-3333-333333333333', email: 'okello@curtainworld.ug', phone: '0752456789', password: 'password123', user_metadata: { full_name: 'Okello Brian', role: 'both', phone: '+256 752 456 789' } },
]

const authListeners = new Set()

const mockAuth = {
  async getSession() {
    const raw = localStorage.getItem('cw_auth_session')
    if (!raw) return { data: { session: null }, error: null }
    try {
      const user = JSON.parse(raw)
      return { data: { session: { user, access_token: 'mock_token' } }, error: null }
    } catch {
      return { data: { session: null }, error: null }
    }
  },

  async getUser() {
    const raw = localStorage.getItem('cw_auth_session')
    if (!raw) return { data: { user: null }, error: null }
    try {
      const user = JSON.parse(raw)
      return { data: { user }, error: null }
    } catch {
      return { data: { user: null }, error: null }
    }
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

    if (!found || (found.password && found.password !== password)) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email/phone or password' } }
    }

    const sessionUser = {
      id: found.id,
      email: found.email,
      phone: found.phone || found.user_metadata?.phone,
      user_metadata: found.user_metadata,
      app_metadata: { provider: 'email' },
    }
    localStorage.setItem('cw_auth_session', JSON.stringify(sessionUser))
    authListeners.forEach(cb => cb('SIGNED_IN', { user: sessionUser }))
    return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
  },

  async signUp({ email, password, options = {} }) {
    const customUsers = JSON.parse(localStorage.getItem('cw_custom_users') || '[]')
    const allUsers = [...DEMO_USERS, ...customUsers]
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { data: { user: null, session: null }, error: { message: 'User already registered' } }
    }

    const newUser = {
      id: generateUUID(),
      email,
      password,
      user_metadata: options.data || { full_name: email.split('@')[0], role: 'employee' },
    }

    customUsers.push(newUser)
    localStorage.setItem('cw_custom_users', JSON.stringify(customUsers))

    // Also register in mock staff table if not present
    const staffStorage = mockTables.staff
    const currentStaff = staffStorage.getAll()
    if (!currentStaff.some(s => s.name === newUser.user_metadata.full_name)) {
      currentStaff.push({
        id: newUser.id,
        name: newUser.user_metadata.full_name,
        role: newUser.user_metadata.role || 'employee',
        active: true,
        created_at: new Date().toISOString(),
      })
      staffStorage.saveAll(currentStaff)
    }

    const sessionUser = {
      id: newUser.id,
      email: newUser.email,
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


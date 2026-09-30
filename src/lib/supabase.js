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

const mockSupabase = {
  from(table) {
    return new MockQueryBuilder(table)
  }
}

export const supabase = isLiveSupabase
  ? createClient(envUrl, envKey)
  : mockSupabase

// src/lib/whatsapp.js
import { formatCurrency, formatDateTime, formatDate, getOrderStatus, getPaymentMethodLabel } from './utils'
import { generateOrderPDF, generateOrderPNG } from './pdf'

/**
 * Standardize phone number for WhatsApp wa.me links
 * e.g., 0772 123 456 -> 256772123456
 * +256 700 000 000 -> 256700000000
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  } else if (cleaned.startsWith('0')) {
    // Default Uganda country code
    cleaned = '256' + cleaned.substring(1)
  } else if (cleaned.length === 9) {
    cleaned = '256' + cleaned
  }
  return cleaned
}

function padRight(str, len) {
  const s = String(str ?? '')
  if (s.length >= len) return s.slice(0, len)
  return s + ' '.repeat(len - s.length)
}

function padLeft(str, len) {
  const s = String(str ?? '')
  if (s.length >= len) return s.slice(0, len)
  return ' '.repeat(len - s.length) + s
}

function center(str, len) {
  const s = String(str ?? '').slice(0, len)
  const left = Math.floor((len - s.length) / 2)
  const right = len - s.length - left
  return ' '.repeat(left) + s + ' '.repeat(right)
}

/**
 * Formats order receipt details into a monospaced ASCII / box-drawing table for WhatsApp
 */
export function formatReceiptTable({ order, customer, employee, cashier, items, transaction }) {
  const cust = customer || order?.customer
  const emp = employee || order?.employee
  const cash = cashier || order?.cashier
  const orderItems = items || order?.order_items || []
  const statusInfo = getOrderStatus(order)

  const total = Number(order?.total_amount || 0)
  const deposit = Number(order?.deposit || 0)
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  const W = 32 // inner width
  const makeRow = (txt) => `║ ${padRight(txt, W)} ║\n`
  const makeCenterRow = (txt) => `║ ${center(txt, W)} ║\n`
  const makeSplitRow = (l, r) => `║ ${padRight(l, 16)}${padLeft(r, 16)} ║\n`

  const topBorder = `╔${'═'.repeat(W + 2)}╗\n`
  const midBorder = `╠${'═'.repeat(W + 2)}╣\n`
  const lightBorder = `╟${'─'.repeat(W + 2)}╢\n`
  const bottomBorder = `╚${'═'.repeat(W + 2)}╝`

  let tbl = topBorder
  tbl += makeCenterRow('CURTAIN WORLD')
  tbl += makeCenterRow('"For your curtain desires."')
  tbl += midBorder
  tbl += makeCenterRow('SALES RECEIPT / VOUCHER')
  tbl += midBorder

  // Order Details
  tbl += makeRow(`Order #  : ORD-${order?.order_number || '—'}`)
  tbl += makeRow(`Date     : ${formatDateTime(order?.created_at || new Date())}`)
  tbl += makeRow(`Customer : ${cust?.full_name || 'Valued Customer'}`)
  if (cust?.phone) {
    tbl += makeRow(`Phone    : ${cust.phone}`)
  }
  if (emp?.name) {
    tbl += makeRow(`Staff    : ${emp.name}`)
  }
  if (cash?.name && cash.name !== emp?.name) {
    tbl += makeRow(`Cashier  : ${cash.name}`)
  }

  // Items
  if (orderItems.length > 0) {
    tbl += midBorder
    tbl += `║ ${padRight('ITEM', 14)}${padLeft('QTY', 4)}${padLeft('AMOUNT', 14)} ║\n`
    tbl += lightBorder
    for (const itm of orderItems) {
      const itmSub = Number(itm.subtotal || (Number(itm.quantity || 1) * Number(itm.unit_price || 0)))
      const name = String(itm.item_name || 'Item')
      tbl += `║ ${padRight(name.slice(0, 13), 14)}${padLeft(itm.quantity || 1, 4)}${padLeft(formatCurrency(itmSub), 14)} ║\n`
      if (name.length > 13) {
        tbl += makeRow(` ${name.slice(13, 31)}`)
      }
    }
  }

  // Financials
  tbl += midBorder
  tbl += makeSplitRow('Total Order:', formatCurrency(total))
  tbl += makeSplitRow('Amount Paid:', formatCurrency(deposit))

  if (transaction && transaction.amount) {
    tbl += makeSplitRow('Paid Now:', formatCurrency(transaction.amount))
  }

  tbl += makeSplitRow('Balance Due:', balance === 0 ? 'CLEARED' : formatCurrency(balance))
  tbl += makeSplitRow('Status:', statusInfo.label.toUpperCase())

  if (order?.notes) {
    tbl += lightBorder
    tbl += makeRow(`Note: ${String(order.notes).slice(0, 26)}`)
  }

  tbl += bottomBorder
  return tbl
}

/**
 * Generates the full WhatsApp message with branded header, monospace table, and footer
 */
export function generateWhatsAppReceiptMessage(orderData, { format = 'table' } = {}) {
  const cust = orderData.customer || orderData.order?.customer
  const tableContent = formatReceiptTable(orderData)

  if (format === 'list') {
    return generateWhatsAppReceiptList(orderData)
  }

  let msg = `✨ *CURTAIN WORLD* ✨\n`
  msg += `_“For your curtain desires.”_\n\n`
  msg += `\`\`\`\n`
  msg += tableContent + `\n`
  msg += `\`\`\`\n`
  msg += `Thank you for choosing Curtain World!\n`
  msg += `📍 Kampala, Uganda\n`

  return msg
}

/**
 * Alternative classic list format with bullet points
 */
export function generateWhatsAppReceiptList({ order, customer, employee, cashier, items, transaction }) {
  const cust = customer || order?.customer
  const emp = employee || order?.employee
  const cash = cashier || order?.cashier
  const orderItems = items || order?.order_items || []
  const statusInfo = getOrderStatus(order)

  const total = Number(order?.total_amount || 0)
  const deposit = Number(order?.deposit || 0)
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  let msg = `✨ *CURTAIN WORLD* ✨\n`
  msg += `_“For your curtain desires.”_\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `📄 *SALES ORDER VOUCHER / RECEIPT*\n`
  msg += `• *Order #:* ORD-${order?.order_number || '—'}\n`
  msg += `• *Date:* ${formatDateTime(order?.created_at || new Date())}\n`
  msg += `• *Customer:* ${cust?.full_name || 'Valued Customer'}\n`
  if (cust?.phone) msg += `• *Phone:* ${cust.phone}\n`
  if (emp?.name) msg += `• *Attending Staff:* ${emp.name}\n`
  if (cash?.name) msg += `• *Cashier:* ${cash.name}\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`

  if (orderItems.length > 0) {
    msg += `📦 *ORDER ITEMS:*\n`
    orderItems.forEach((item, idx) => {
      const itemSub = Number(item.subtotal || (Number(item.quantity || 1) * Number(item.unit_price || 0)))
      msg += `${idx + 1}. *${item.item_name}*\n`
      msg += `   Qty: ${item.quantity} × ${formatCurrency(item.unit_price)} = *${formatCurrency(itemSub)}*\n`
    })
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  }

  msg += `💰 *FINANCIAL SUMMARY:*\n`
  msg += `• *Total Order Value:* ${formatCurrency(total)}\n`
  msg += `• *Amount Paid / Deposit:* ${formatCurrency(deposit)}\n`

  if (transaction && transaction.amount) {
    msg += `• *Payment Just Received:* ${formatCurrency(transaction.amount)} (${getPaymentMethodLabel(transaction.payment_method)})\n`
  }

  msg += `• *Remaining Balance:* *${balance === 0 ? 'CLEARED (0 UGX)' : formatCurrency(balance)}*\n`
  msg += `• *Status:* ${statusInfo.label.toUpperCase()}\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`

  if (order?.notes) {
    msg += `📝 *Notes:* ${order.notes}\n`
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  }

  msg += `Thank you for choosing Curtain World!\n`
  msg += `📍 Kampala, Uganda\n`

  return msg
}

/**
 * Creates a File object from the generated PNG image data URL
 */
export async function createOrderPNGFile(orderData, filename = 'receipt.png') {
  const dataUrl = generateOrderPNG(orderData)
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: 'image/png' })
}

/**
 * Creates a File object from the generated PDF document
 */
export function createOrderPDFFile(orderData, filename = 'receipt.pdf') {
  const doc = generateOrderPDF(orderData)
  const blob = doc.output('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

/**
 * Checks whether the browser's Web Share API can share files
 */
export function canShareFiles(files = []) {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false
  }
  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

/**
 * Copies the PNG receipt image directly to the system clipboard
 * Allows the user to simply press Ctrl+V / Paste directly in WhatsApp!
 */
export async function copyPNGImageToClipboard(orderData) {
  try {
    const dataUrl = generateOrderPNG(orderData)
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      return true
    }
  } catch (err) {
    console.warn('Could not copy image to clipboard:', err)
  }
  return false
}

/**
 * Generates a direct WhatsApp URL targeting the customer's phone number
 */
export function getWhatsAppUrl(phone, text) {
  const cleanPhone = formatPhoneForWhatsApp(phone)
  const encodedText = encodeURIComponent(text)
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`
}

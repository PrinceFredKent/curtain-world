import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from './utils'

const BRAND = {
  name: 'Curtain World',
  slogan: 'For your curtain desires.',
  purple: [124, 58, 237], // #7c3aed
  purpleLight: [237, 233, 254], // #ede9fe
  gold: [201, 168, 76],
  neutralLight: [248, 246, 255],
}

function addHeader(doc, yOffset = 10) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Background band - Purple
  doc.setFillColor(...BRAND.purple)
  doc.rect(0, 0, pageWidth, 28, 'F')

  // Brand name
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(BRAND.name, pageWidth / 2, 12, { align: 'center' })

  // Slogan
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...BRAND.purpleLight)
  doc.text(BRAND.slogan, pageWidth / 2, 19, { align: 'center' })

  // Accent line
  doc.setDrawColor(...BRAND.purpleLight)
  doc.setLineWidth(0.5)
  doc.line(5, 25, pageWidth - 5, 25)

  return 32
}

function addFooter(doc) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setDrawColor(...BRAND.purpleLight)
  doc.setLineWidth(0.3)
  doc.line(5, pageHeight - 12, pageWidth - 5, pageHeight - 12)

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(BRAND.name + ' · ' + BRAND.slogan, pageWidth / 2, pageHeight - 7, { align: 'center' })
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 3, { align: 'center' })
}

/**
 * Generate a transaction receipt PDF
 * @param {Object} params
 * @returns {jsPDF} doc
 */
export function generateReceiptPDF({ transaction, order, customer, employee, cashier, items }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = addHeader(doc)

  // Receipt title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.purple)
  const typeLabel = transaction.type === 'deposit' ? 'DEPOSIT RECEIPT' : 'PAYMENT RECEIPT'
  doc.text(typeLabel, pageWidth / 2, y + 6, { align: 'center' })
  y += 14

  // Info grid
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const infoRows = [
    ['Receipt #', `TXN-${transaction.id?.slice(0, 8).toUpperCase()}`],
    ['Order #', `ORD-${order?.order_number}`],
    ['Date', formatDateTime(transaction.created_at)],
    ['Customer', customer?.full_name || '—'],
    ['Phone', customer?.phone || '—'],
    ['Employee', employee?.name || '—'],
    ['Cashier', cashier?.name || '—'],
  ]

  autoTable(doc, {
    startY: y,
    body: infoRows,
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, textColor: [124, 58, 237] },
      1: { cellWidth: 80 },
    },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    margin: { left: 8, right: 8 },
  })

  y = doc.lastAutoTable.finalY + 6

  // Items
  if (items && items.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.purple)
    doc.text('Order Items', 8, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Unit Price', 'Subtotal']],
      body: items.map(item => [
        item.item_name,
        item.quantity,
        formatCurrency(item.unit_price),
        formatCurrency(item.subtotal),
      ]),
      headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
      },
      alternateRowStyles: { fillColor: BRAND.neutralLight },
      margin: { left: 8, right: 8 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  // Payment summary box
  const summaryData = [
    ['Total Order Value', formatCurrency(order?.total_amount)],
    ['Total Paid', formatCurrency(order?.deposit)],
    ['Balance Owed', formatCurrency(order?.balance)],
  ]

  doc.setFillColor(...BRAND.neutralLight)
  doc.roundedRect(8, y, pageWidth - 16, 32, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  summaryData.forEach((row, i) => {
    const yRow = y + 6 + i * 8
    doc.text(row[0], 14, yRow)
    doc.setFont('helvetica', 'bold')
    if (i === 2 && order?.balance > 0) {
      doc.setTextColor(200, 80, 80)
    } else {
      doc.setTextColor(124, 58, 237)
    }
    doc.text(row[1], pageWidth - 14, yRow, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
  })

  y += 36

  // This payment highlight
  doc.setFillColor(...BRAND.purple)
  doc.roundedRect(8, y, pageWidth - 16, 16, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Amount Paid Today', 14, y + 7)
  doc.setTextColor(...BRAND.purpleLight)
  doc.text(formatCurrency(transaction.amount), pageWidth - 14, y + 7, { align: 'right' })

  // Payment method
  if (transaction.payment_method) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text(`via ${getPaymentMethodLabel(transaction.payment_method)}`, pageWidth - 14, y + 13, { align: 'right' })
  }

  addFooter(doc)
  return doc
}

/**
 * Generate a 58mm thermal-style report PDF
 */
export function generateReportPDF({ period, summary, byEmployee, byCashier, transactions }) {
  const doc = new jsPDF({ unit: 'mm', format: [58, 200], orientation: 'portrait' })
  let y = 4

  // Header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CURTAIN WORLD', 29, y, { align: 'center' })
  y += 5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('For your curtain desires.', 29, y, { align: 'center' })
  y += 5
  doc.line(2, y, 56, y)
  y += 4

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`SALES REPORT - ${period.toUpperCase()}`, 29, y, { align: 'center' })
  y += 5
  doc.line(2, y, 56, y)
  y += 4

  // Summary
  doc.setFontSize(7)
  const rows = [
    ['Orders:', `${summary.orders_count ?? 0}`],
    ['Received:', formatCurrency(summary.received ?? 0)],
    ['Owed:', formatCurrency(summary.owed ?? 0)],
    ['Total Sales:', formatCurrency(summary.total_sales ?? 0)],
  ]

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 3, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 55, y, { align: 'right' })
    y += 4
  })

  y += 2
  doc.line(2, y, 56, y)
  y += 4

  // By employee
  if (byEmployee && byEmployee.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('BY EMPLOYEE', 29, y, { align: 'center' })
    y += 4

    byEmployee.forEach(emp => {
      doc.setFont('helvetica', 'bold')
      doc.text(emp.name, 3, y)
      y += 3
      doc.setFont('helvetica', 'normal')
      doc.text(`Orders: ${emp.orders_count}`, 5, y)
      y += 3
      doc.text(`Received: ${formatCurrency(emp.received)}`, 5, y)
      y += 3
      doc.text(`Owed: ${formatCurrency(emp.owed)}`, 5, y)
      y += 4
    })

    doc.line(2, y, 56, y)
    y += 4
  }

  // By cashier
  if (byCashier && byCashier.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('BY CASHIER', 29, y, { align: 'center' })
    y += 4

    byCashier.forEach(c => {
      doc.setFont('helvetica', 'bold')
      doc.text(c.name, 3, y)
      y += 3
      doc.setFont('helvetica', 'normal')
      doc.text(`Transactions: ${c.transactions_count}`, 5, y)
      y += 3
      doc.text(`Collected: ${formatCurrency(c.total_collected)}`, 5, y)
      y += 4
    })

    doc.line(2, y, 56, y)
    y += 4
  }

  // Footer
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.text(formatDateTime(new Date()), 29, y, { align: 'center' })
  y += 4
  doc.text('Curtain World - Thank you!', 29, y, { align: 'center' })

  // Resize page to content
  doc.internal.pageSize.setHeight(y + 6)

  return doc
}

export function downloadPDF(doc, filename) {
  doc.save(filename)
}

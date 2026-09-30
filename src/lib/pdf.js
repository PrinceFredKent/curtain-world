// src/lib/pdf.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDateTime, formatDate, getPaymentMethodLabel, getOrderStatus } from './utils'

const BRAND = {
  name: 'Curtain World',
  slogan: 'For your curtain desires.',
  purple: [124, 58, 237], // #7c3aed
  purpleDark: [91, 33, 182], // #5b21b6
  purpleLight: [237, 233, 254], // #ede9fe
  gold: [201, 168, 76],
  neutralLight: [248, 246, 255],
}

function addHeader(doc) {
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
  doc.text('Thank you for choosing Curtain World!', pageWidth / 2, pageHeight - 3, { align: 'center' })
}

/**
 * Generate a complete Order Sales Voucher / Receipt PDF
 */
export function generateOrderPDF({ order, items, customer, employee, cashier }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = addHeader(doc)

  const cust = customer || order?.customer
  const emp = employee || order?.employee
  const cash = cashier || order?.cashier
  const orderItems = items || order?.order_items || []
  const statusInfo = getOrderStatus(order)

  // Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.purple)
  doc.text('SALES ORDER & RECEIPT VOUCHER', pageWidth / 2, y + 4, { align: 'center' })
  y += 11

  // Key Info Grid
  const infoRows = [
    ['Order #:', `ORD-${order?.order_number || '—'}`],
    ['Date & Time:', formatDateTime(order?.created_at || new Date())],
    ['Customer:', `${cust?.full_name || '—'} (${cust?.phone || 'No phone'})`],
    ['Attending Staff:', emp?.name || '—'],
    ['Cashier:', cash?.name || 'Admin & Cashier'],
    ['Order Status:', statusInfo.label.toUpperCase()],
  ]

  autoTable(doc, {
    startY: y,
    body: infoRows,
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, textColor: [124, 58, 237] },
      1: { cellWidth: 80 },
    },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    margin: { left: 8, right: 8 },
  })

  y = doc.lastAutoTable.finalY + 4

  // Items Table
  if (orderItems && orderItems.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.purple)
    doc.text('Order Items & Specifications', 8, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Item Description', 'Qty', 'Unit Price', 'Subtotal']],
      body: orderItems.map(item => [
        item.item_name,
        Number(item.quantity).toLocaleString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.subtotal || Number(item.quantity) * Number(item.unit_price)),
      ]),
      headStyles: { fillColor: BRAND.purple, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { halign: 'center', cellWidth: 14 },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 26 },
      },
      alternateRowStyles: { fillColor: BRAND.neutralLight },
      margin: { left: 8, right: 8 },
    })

    y = doc.lastAutoTable.finalY + 5
  }

  // Financial Breakdown Box
  const total = Number(order?.total_amount) || 0
  const deposit = Number(order?.deposit) || 0
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  doc.setFillColor(...BRAND.neutralLight)
  doc.roundedRect(8, y, pageWidth - 16, 28, 2, 2, 'F')

  const summaryData = [
    ['Total Order Amount:', formatCurrency(total)],
    ['Total Amount Paid:', formatCurrency(deposit)],
    ['Outstanding Balance:', formatCurrency(balance)],
  ]

  doc.setFontSize(9)
  summaryData.forEach((row, i) => {
    const yRow = y + 6 + i * 7.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(row[0], 14, yRow)

    doc.setFont('helvetica', 'bold')
    if (i === 2 && balance > 0) {
      doc.setTextColor(217, 119, 6) // amber/orange
    } else if (i === 1 || (i === 2 && balance <= 0)) {
      doc.setTextColor(22, 163, 74) // emerald
    } else {
      doc.setTextColor(124, 58, 237)
    }
    doc.text(row[1], pageWidth - 14, yRow, { align: 'right' })
  })

  y += 32

  // Notes if available
  if (order?.notes) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(`Notes: ${order.notes}`, 8, y)
  }

  addFooter(doc)
  return doc
}

/**
 * Generate a single Transaction Receipt PDF
 */
export function generateReceiptPDF({ transaction, order, customer, employee, cashier, items }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = addHeader(doc)

  // Receipt title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.purple)
  const typeLabel = transaction?.type === 'deposit' ? 'DEPOSIT RECEIPT' : 'PAYMENT RECEIPT'
  doc.text(typeLabel, pageWidth / 2, y + 6, { align: 'center' })
  y += 14

  // Info grid
  const infoRows = [
    ['Receipt #', `TXN-${transaction?.id?.slice(0, 8).toUpperCase()}`],
    ['Order #', `ORD-${order?.order_number || '—'}`],
    ['Date', formatDateTime(transaction?.created_at || new Date())],
    ['Customer', customer?.full_name || order?.customer?.full_name || '—'],
    ['Phone', customer?.phone || order?.customer?.phone || '—'],
    ['Attending Staff', employee?.name || order?.employee?.name || '—'],
    ['Cashier', cashier?.name || 'Admin & Cashier'],
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
  const orderItems = items || order?.order_items || []
  if (orderItems && orderItems.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.purple)
    doc.text('Order Items', 8, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Unit Price', 'Subtotal']],
      body: orderItems.map(item => [
        item.item_name,
        item.quantity,
        formatCurrency(item.unit_price),
        formatCurrency(item.subtotal || item.quantity * item.unit_price),
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
  doc.roundedRect(8, y, pageWidth - 16, 28, 2, 2, 'F')

  doc.setFontSize(9)
  summaryData.forEach((row, i) => {
    const yRow = y + 6 + i * 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(row[0], 14, yRow)
    doc.setFont('helvetica', 'bold')
    if (i === 2 && order?.balance > 0) {
      doc.setTextColor(200, 80, 80)
    } else {
      doc.setTextColor(124, 58, 237)
    }
    doc.text(row[1], pageWidth - 14, yRow, { align: 'right' })
  })

  y += 32

  // This payment highlight
  doc.setFillColor(...BRAND.purple)
  doc.roundedRect(8, y, pageWidth - 16, 16, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Amount Paid Today', 14, y + 7)
  doc.setTextColor(...BRAND.purpleLight)
  doc.text(formatCurrency(transaction?.amount || 0), pageWidth - 14, y + 7, { align: 'right' })

  // Payment method
  if (transaction?.payment_method) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text(`via ${getPaymentMethodLabel(transaction.payment_method)}`, pageWidth - 14, y + 13, { align: 'right' })
  }

  addFooter(doc)
  return doc
}

/**
 * Generate a high-resolution PNG image data URL for an order
 */
export function generateOrderPNG(orderData) {
  const { order, items, customer, employee, cashier } = orderData
  const cust = customer || order?.customer
  const emp = employee || order?.employee
  const cash = cashier || order?.cashier
  const orderItems = items || order?.order_items || []
  const statusInfo = getOrderStatus(order)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const width = 800
  const baseHeight = 650 + (orderItems.length * 36)
  const height = Math.max(750, baseHeight)

  canvas.width = width * 2 // 2x DPI
  canvas.height = height * 2
  ctx.scale(2, 2)

  // White Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Top Header Banner
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, '#7c3aed')
  gradient.addColorStop(1, '#5b21b6')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, 100)

  // Header text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('CURTAIN WORLD', width / 2, 45)

  ctx.font = 'italic 14px Inter, sans-serif'
  ctx.fillStyle = '#ede9fe'
  ctx.fillText('“For your curtain desires.”', width / 2, 72)

  // Voucher Title & Status Badge
  let y = 140
  ctx.fillStyle = '#17132e'
  ctx.font = 'bold 20px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`ORDER VOUCHER  #ORD-${order?.order_number || '—'}`, 40, y)

  // Status Pill
  const statusBg = statusInfo.isCleared ? '#dcfce7' : statusInfo.percent > 0 ? '#fef3c7' : '#fee2e2'
  const statusFg = statusInfo.isCleared ? '#166534' : statusInfo.percent > 0 ? '#92400e' : '#991b1b'
  ctx.fillStyle = statusBg
  ctx.beginPath()
  ctx.roundRect(width - 180, y - 22, 140, 32, 16)
  ctx.fill()
  ctx.fillStyle = statusFg
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(statusInfo.label.toUpperCase(), width - 110, y)

  // Meta Info Box
  y += 30
  ctx.fillStyle = '#f8f7fd'
  ctx.strokeStyle = '#e5dff7'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(40, y, width - 80, 85, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#6b7280'
  ctx.font = '12px Inter, sans-serif'
  ctx.textAlign = 'left'

  // Col 1
  ctx.fillText('CUSTOMER:', 60, y + 28)
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 14px Inter, sans-serif'
  ctx.fillText(`${cust?.full_name || '—'} (${cust?.phone || 'No phone'})`, 60, y + 48)

  // Col 2
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px Inter, sans-serif'
  ctx.fillText('ATTENDING STAFF:', 420, y + 28)
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 14px Inter, sans-serif'
  ctx.fillText(emp?.name || '—', 420, y + 48)

  // Col 3 Date
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px Inter, sans-serif'
  ctx.fillText('DATE & TIME:', 60, y + 72)
  ctx.fillStyle = '#374151'
  ctx.font = '13px Inter, sans-serif'
  ctx.fillText(formatDateTime(order?.created_at || new Date()), 145, y + 72)

  // Cashier
  ctx.fillStyle = '#6b7280'
  ctx.fillText('CASHIER:', 420, y + 72)
  ctx.fillStyle = '#374151'
  ctx.fillText(cash?.name || 'Admin & Cashier', 485, y + 72)

  // Items Table
  y += 115
  ctx.fillStyle = '#7c3aed'
  ctx.fillRect(40, y, width - 80, 32)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 12px Inter, sans-serif'
  ctx.fillText('ITEM DESCRIPTION', 55, y + 21)
  ctx.textAlign = 'center'
  ctx.fillText('QTY', width - 260, y + 21)
  ctx.textAlign = 'right'
  ctx.fillText('PRICE (UGX)', width - 150, y + 21)
  ctx.fillText('TOTAL (UGX)', width - 55, y + 21)

  y += 32
  if (orderItems.length === 0) {
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(40, y, width - 80, 36)
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'left'
    ctx.fillText('General Order Items', 55, y + 23)
    y += 36
  } else {
    orderItems.forEach((item, index) => {
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#faf9fe'
      ctx.fillRect(40, y, width - 80, 36)
      ctx.strokeStyle = '#f3f0fc'
      ctx.strokeRect(40, y, width - 80, 36)

      ctx.fillStyle = '#1f2937'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(item.item_name || 'Item', 55, y + 23)

      ctx.textAlign = 'center'
      ctx.fillText(String(item.quantity || 1), width - 260, y + 23)

      ctx.textAlign = 'right'
      ctx.fillText(Number(item.unit_price || 0).toLocaleString(), width - 150, y + 23)
      ctx.font = 'bold 13px Inter, sans-serif'
      ctx.fillText(Number(item.subtotal || item.quantity * item.unit_price || 0).toLocaleString(), width - 55, y + 23)

      y += 36
    })
  }

  // Financial Breakdown Bar
  y += 20
  const total = Number(order?.total_amount) || 0
  const deposit = Number(order?.deposit) || 0
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  ctx.fillStyle = '#f5f3ff'
  ctx.strokeStyle = '#c4b5fd'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(40, y, width - 80, 95, 10)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#4b5563'
  ctx.font = '13px Inter, sans-serif'
  ctx.fillText('Total Order Amount:', 65, y + 32)
  ctx.textAlign = 'right'
  ctx.font = 'bold 15px Inter, sans-serif'
  ctx.fillStyle = '#1f2937'
  ctx.fillText(formatCurrency(total), width - 65, y + 32)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#16a34a'
  ctx.font = '13px Inter, sans-serif'
  ctx.fillText('Total Deposit / Amount Paid:', 65, y + 58)
  ctx.textAlign = 'right'
  ctx.font = 'bold 15px Inter, sans-serif'
  ctx.fillText(formatCurrency(deposit), width - 65, y + 58)

  ctx.textAlign = 'left'
  ctx.fillStyle = balance > 0 ? '#d97706' : '#16a34a'
  ctx.font = 'bold 14px Inter, sans-serif'
  ctx.fillText('Remaining Balance Owed:', 65, y + 84)
  ctx.textAlign = 'right'
  ctx.font = 'bold 18px Inter, sans-serif'
  ctx.fillText(formatCurrency(balance), width - 65, y + 84)

  // Footer
  y += 120
  ctx.strokeStyle = '#e5e7eb'
  ctx.beginPath()
  ctx.moveTo(40, y)
  ctx.lineTo(width - 40, y)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px Inter, sans-serif'
  ctx.fillText('Thank you for your business! Curtain World — For your curtain desires.', width / 2, y + 25)

  return canvas.toDataURL('image/png')
}

export function downloadOrderPNG(orderData, filename = 'order-voucher.png') {
  const dataUrl = generateOrderPNG(orderData)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function downloadOrderPDF(orderData, filename = 'order-voucher.pdf') {
  const doc = generateOrderPDF(orderData)
  doc.save(filename)
}

export function printOrderReceipt(orderData) {
  const { order, items, customer, employee, cashier } = orderData
  const cust = customer || order?.customer
  const emp = employee || order?.employee
  const cash = cashier || order?.cashier
  const orderItems = items || order?.order_items || []
  const statusInfo = getOrderStatus(order)
  const total = Number(order?.total_amount) || 0
  const deposit = Number(order?.deposit) || 0
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  const printWindow = window.open('', '_blank', 'width=600,height=750')
  if (!printWindow) return

  const itemsHtml = orderItems.map(item => `
    <tr>
      <td style="padding: 4px 0; border-bottom: 1px dotted #ccc;">
        <strong>${item.item_name}</strong>
      </td>
      <td style="text-align: center; padding: 4px 0; border-bottom: 1px dotted #ccc;">${item.quantity}</td>
      <td style="text-align: right; padding: 4px 0; border-bottom: 1px dotted #ccc;">${formatCurrency(item.unit_price)}</td>
      <td style="text-align: right; padding: 4px 0; border-bottom: 1px dotted #ccc;"><strong>${formatCurrency(item.subtotal || item.quantity * item.unit_price)}</strong></td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Curtain World - ORD-${order?.order_number || ''}</title>
        <style>
          body { font-family: 'Courier New', monospace, sans-serif; margin: 15px; color: #000; font-size: 12px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          @media print {
            @page { margin: 4mm; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0; font-size: 16px;">CURTAIN WORLD</h2>
          <p style="margin: 2px 0; font-size: 11px; font-style: italic;">For your curtain desires.</p>
          <div class="divider"></div>
          <h3 style="margin: 4px 0; font-size: 13px;">SALES ORDER VOUCHER</h3>
          <p style="margin: 2px 0;"><strong>ORD-${order?.order_number || '—'}</strong> · ${formatDate(order?.created_at || new Date())}</p>
        </div>
        <div class="divider"></div>
        <div>
          <div><strong>Customer:</strong> ${cust?.full_name || '—'} (${cust?.phone || 'No phone'})</div>
          <div><strong>Attending Staff:</strong> ${emp?.name || '—'}</div>
          <div><strong>Cashier:</strong> ${cash?.name || 'Admin & Cashier'}</div>
          <div><strong>Payment Status:</strong> ${statusInfo.label.toUpperCase()}</div>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 4px 0;">Item</th>
              <th style="text-align: center; padding: 4px 0;">Qty</th>
              <th style="text-align: right; padding: 4px 0;">Price</th>
              <th style="text-align: right; padding: 4px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4" style="text-align:center; padding: 6px;">Order Items</td></tr>'}
          </tbody>
        </table>
        <div class="double-divider"></div>
        <table>
          <tr>
            <td><strong>TOTAL AMOUNT:</strong></td>
            <td style="text-align: right;"><strong>${formatCurrency(total)}</strong></td>
          </tr>
          <tr>
            <td><strong>AMOUNT PAID:</strong></td>
            <td style="text-align: right;"><strong>${formatCurrency(deposit)}</strong></td>
          </tr>
          <tr>
            <td><strong>BALANCE OWED:</strong></td>
            <td style="text-align: right; font-size: 13px;"><strong>${formatCurrency(balance)}</strong></td>
          </tr>
        </table>
        <div class="divider"></div>
        ${order?.notes ? `<div style="font-size: 10px; margin-bottom: 6px;"><strong>Notes:</strong> ${order.notes}</div>` : ''}
        <div class="center" style="font-size: 10px; margin-top: 10px;">
          <p style="margin: 2px 0;">Thank you for your business!</p>
          <p style="margin: 2px 0;">Printed: ${formatDateTime(new Date())}</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
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
  doc.text(`SALES REPORT - ${(period || 'ALL').toUpperCase()}`, 29, y, { align: 'center' })
  y += 5
  doc.line(2, y, 56, y)
  y += 4

  // Summary
  doc.setFontSize(7)
  const rows = [
    ['Orders:', `${summary?.orders_count ?? 0}`],
    ['Received:', formatCurrency(summary?.received ?? 0)],
    ['Owed:', formatCurrency(summary?.owed ?? 0)],
    ['Total Sales:', formatCurrency(summary?.total_sales ?? 0)],
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

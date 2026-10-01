// src/components/orders/WhatsAppShareModal.jsx
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import {
  generateWhatsAppReceiptMessage,
  formatPhoneForWhatsApp,
  getWhatsAppUrl,
  createOrderPNGFile,
  createOrderPDFFile,
  copyPNGImageToClipboard,
  canShareFiles
} from '../../lib/whatsapp'
import { downloadOrderPDF, downloadOrderPNG } from '../../lib/pdf'
import {
  Share2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Check,
  Send,
  ExternalLink,
  Phone,
} from 'lucide-react'

export function WhatsAppShareModal({ open, onClose, orderData }) {
  const toast = useToast()
  const customerPhone = orderData?.customer?.phone || orderData?.order?.customer?.phone || ''
  const [phone, setPhone] = useState(customerPhone)
  const [formatStyle, setFormatStyle] = useState('table')
  const [openingChat, setOpeningChat] = useState(false)
  const [sharingNative, setSharingNative] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)

  if (!open || !orderData) return null

  const order = orderData.order || orderData
  const orderNumber = order?.order_number || '—'
  const message = generateWhatsAppReceiptMessage(orderData, { format: formatStyle })
  const cleanPhone = formatPhoneForWhatsApp(phone || customerPhone)

  // Direct Chat Flow: Opens the customer's chat and copies image to clipboard
  const handleOpenDirectCustomerChat = async () => {
    setOpeningChat(true)
    try {
      // 1. Copy the PNG image voucher to the clipboard
      const imageCopied = await copyPNGImageToClipboard(orderData)

      // 2. Open WhatsApp directly to the customer's phone number
      const waUrl = getWhatsAppUrl(cleanPhone, message)
      window.open(waUrl, '_blank')

      if (imageCopied) {
        toast({
          type: 'success',
          message: 'Customer chat opened! Press Ctrl+V (Paste) in WhatsApp to attach the voucher image.',
        })
      } else {
        toast({
          type: 'success',
          message: 'Opened WhatsApp chat with pre-filled receipt text!',
        })
      }
    } catch (err) {
      toast({ type: 'error', message: 'Could not open chat: ' + err.message })
    } finally {
      setOpeningChat(false)
    }
  }

  // System Share Flow: Uses OS Web Share API
  const handleShareSystemFiles = async () => {
    setSharingNative(true)
    try {
      const pngFile = await createOrderPNGFile(orderData, `CurtainWorld-ORD-${orderNumber}.png`)
      const pdfFile = createOrderPDFFile(orderData, `CurtainWorld-ORD-${orderNumber}.pdf`)

      if (canShareFiles([pngFile, pdfFile])) {
        await navigator.share({
          title: `Curtain World Receipt ORD-${orderNumber}`,
          text: message,
          files: [pngFile, pdfFile],
        })
        toast({ type: 'success', message: 'Shared to WhatsApp!' })
        onClose()
        return
      } else if (canShareFiles([pngFile])) {
        await navigator.share({
          title: `Curtain World Receipt ORD-${orderNumber}`,
          text: message,
          files: [pngFile],
        })
        toast({ type: 'success', message: 'Shared voucher to WhatsApp!' })
        onClose()
        return
      }

      // Fallback if not supported
      downloadOrderPNG(orderData, `CurtainWorld-ORD-${orderNumber}.png`)
      downloadOrderPDF(orderData, `CurtainWorld-ORD-${orderNumber}.pdf`)
      const waUrl = getWhatsAppUrl(cleanPhone, message)
      window.open(waUrl, '_blank')
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast({ type: 'error', message: 'Share failed: ' + err.message })
      }
    } finally {
      setSharingNative(false)
    }
  }

  const handleCopyImage = async () => {
    const ok = await copyPNGImageToClipboard(orderData)
    if (ok) {
      setCopiedImage(true)
      toast({ type: 'success', message: 'Voucher image copied! Paste it in WhatsApp (Ctrl+V).' })
      setTimeout(() => setCopiedImage(false), 2500)
    } else {
      toast({ type: 'error', message: 'Could not copy image to clipboard.' })
    }
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopiedText(true)
      toast({ type: 'success', message: 'Receipt text copied to clipboard!' })
      setTimeout(() => setCopiedText(false), 2500)
    } catch {
      toast({ type: 'error', message: 'Could not copy text.' })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send Receipt to Customer's WhatsApp" size="lg">
      <div className="space-y-4">
        {/* Customer Phone Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fg)' }}>
            Customer's WhatsApp Phone Number
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
              <Phone className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0772 123 456 or 256700000000"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 font-mono font-semibold"
              style={{
                background: 'var(--surface)',
                color: 'var(--fg)',
                borderColor: 'var(--border)',
              }}
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
            Direct WhatsApp Destination: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{cleanPhone || '256...'}</strong>
          </p>
        </div>

        {/* Action Choice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Method 1: Open Direct Customer Chat & Auto-Copy Voucher Image */}
          <button
            type="button"
            onClick={handleOpenDirectCustomerChat}
            disabled={openingChat}
            className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between group shadow-sm cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%)',
              borderColor: '#22c55e88',
            }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Send className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-800 dark:text-emerald-300">
                  Recommended
                </span>
              </div>
              <h4 className="font-bold text-sm mt-3" style={{ color: 'var(--fg)' }}>
                1. Open Customer's Direct Chat
              </h4>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Opens directly in <strong>+{cleanPhone || 'customer'}</strong>'s conversation with pre-filled text. Copies the PNG voucher image so you can simply press <strong>Ctrl+V (Paste)</strong>!
              </p>
            </div>
            <div className="mt-3.5 flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span>{openingChat ? 'Opening...' : 'Open Chat & Copy Image'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Method 2: System Share (Windows Share Sheet / File Attachment) */}
          <button
            type="button"
            onClick={handleShareSystemFiles}
            disabled={sharingNative}
            className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between group shadow-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 inline-block" style={{ color: 'var(--fg)' }}>
                  <Share2 className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                  File Attachment
                </span>
              </div>
              <h4 className="font-bold text-sm mt-3" style={{ color: 'var(--fg)' }}>
                2. Attach Files via WhatsApp
              </h4>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Directly attaches the PDF and PNG voucher file into WhatsApp. (WhatsApp will show <em>"Send message to"</em> so you can select the recipient).
              </p>
            </div>
            <div className="mt-3.5 flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--brand)' }}>
              <span>{sharingNative ? 'Preparing files...' : 'Send Attached Files'}</span>
              <Share2 className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* Message Preview Box */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg)' }}>
                Receipt Style:
              </label>
              <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setFormatStyle('table')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    formatStyle === 'table'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  style={{ color: formatStyle === 'table' ? '#fff' : 'var(--fg-muted)' }}
                >
                  Table Grid
                </button>
                <button
                  type="button"
                  onClick={() => setFormatStyle('list')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    formatStyle === 'list'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  style={{ color: formatStyle === 'list' ? '#fff' : 'var(--fg-muted)' }}
                >
                  Bullet List
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyImage}
                className="text-xs font-semibold flex items-center gap-1 hover:underline text-purple-600 dark:text-purple-400 cursor-pointer"
              >
                {copiedImage ? <Check className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {copiedImage ? 'Image Copied!' : 'Copy Image'}
              </button>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs font-semibold flex items-center gap-1 hover:underline text-emerald-600 dark:text-emerald-400 cursor-pointer"
              >
                {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedText ? 'Text Copied!' : 'Copy Text'}
              </button>
            </div>
          </div>
          <div
            className="p-3 rounded-xl border font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto"
            style={{
              background: 'var(--surface-hover)',
              borderColor: 'var(--border)',
              color: 'var(--fg)',
            }}
          >
            {message}
          </div>
        </div>

        {/* Download Local Copies */}
        <div
          className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
          style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 opacity-70" />
            <span style={{ color: 'var(--fg-muted)' }}>Save copies to your computer:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadOrderPDF(orderData, `CurtainWorld-ORD-${orderNumber}.pdf`)}
              className="px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 hover:bg-purple-500/10 cursor-pointer"
              style={{ color: 'var(--brand)', borderColor: 'var(--border)' }}
            >
              <FileText className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button
              type="button"
              onClick={() => downloadOrderPNG(orderData, `CurtainWorld-ORD-${orderNumber}.png`)}
              className="px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 hover:bg-emerald-500/10 cursor-pointer"
              style={{ color: '#16a34a', borderColor: 'var(--border)' }}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Download PNG
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

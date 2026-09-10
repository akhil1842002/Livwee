// @ts-ignore
import html2pdf from 'html2pdf.js'

function scopeCSSToRoot(cssText: string, rootSelector: string): string {
  let css = cssText.replace(/@import\s+url\([^)]+\);?/gi, '')

  css = css.replace(/(^|[\s,{}])body([\s,{])/gi, `$1${rootSelector} .pdf-page-wrapper$2`)
  css = css.replace(/(^|[\s,{}])html([\s,{])/gi, `$1${rootSelector}$2`)

  return css.replace(/([^{}]+)\{/g, (_match, selectors) => {
    const scopedSelectors = selectors
      .split(',')
      .map((sel: string) => {
        const trimmed = sel.trim()
        if (!trimmed) return ''
        if (trimmed.startsWith('@') || trimmed.startsWith(rootSelector)) return trimmed
        return `${rootSelector} ${trimmed}`
      })
      .filter(Boolean)
      .join(', ')
    return `${scopedSelectors} {`
  })
}

/**
 * Helper to transform HTML document string into a scoped wrapper with active styles.
 * Positions container at z-index: 10 (behind active modal overlays) with scoped CSS so the UI never flickers or shrinks.
 */
function prepareDOMFromHTML(htmlString: string, isThermal: boolean): { container: HTMLElement; target: HTMLElement } {
  const container = document.createElement('div')
  container.className = 'pdf-export-root light'
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = isThermal ? '302px' : '794px' // 80mm (~302px) or A4 (~794px) at 96 DPI
  container.style.zIndex = '10' // Behind active modal overlays (z-50+) so UI never flickers or shrinks
  container.style.background = '#ffffff'
  container.style.color = '#1e293b'
  container.style.boxSizing = 'border-box'
  container.style.padding = '0'
  container.style.margin = '0'
  container.style.pointerEvents = 'none'
  container.style.opacity = '1'

  // Extract <style> contents
  const styleMatches = htmlString.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi) || []
  const rawCSS = styleMatches.map(s => s.replace(/<\/?style[\s\S]*?>/gi, '')).join('\n')

  // Strictly scope CSS to .pdf-export-root to prevent main document shrinking/style leaking
  const scopedCSS = scopeCSSToRoot(rawCSS, '.pdf-export-root')

  // Extract body content
  let bodyContent = htmlString
  const bodyMatch = htmlString.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    bodyContent = bodyMatch[1]
  }

  // Inject converted styles and HTML
  const styleEl = document.createElement('style')
  styleEl.textContent = scopedCSS

  const wrapperEl = document.createElement('div')
  wrapperEl.className = 'pdf-page-wrapper'
  wrapperEl.innerHTML = bodyContent

  container.appendChild(styleEl)
  container.appendChild(wrapperEl)

  document.body.appendChild(container)

  // Target .page, .receipt, or wrapperEl
  const target = (container.querySelector('.page, .receipt') as HTMLElement) || wrapperEl
  return { container, target }
}

/**
 * Utility to download full A4 Tax Invoices as 1-Page PDFs.
 */
export const downloadInvoicePDF = async (input: string | HTMLElement, filename: string) => {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  let elementToRender: HTMLElement
  let tempContainer: HTMLElement | null = null

  if (typeof input !== 'string' && input instanceof HTMLElement) {
    elementToRender = input
  } else {
    const { container, target } = prepareDOMFromHTML(input as string, false)
    tempContainer = container
    elementToRender = target
  }

  const options = {
    margin: [4, 4, 4, 4] as [number, number, number, number],
    filename: name,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 150))
    await html2pdf().set(options).from(elementToRender).save()
  } catch (err) {
    console.error('Failed generating A4 Invoice PDF:', err)
  } finally {
    if (tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer)
    }
  }
}

/**
 * Utility to download 80mm POS Thermal Receipts as crisp single-page PDFs.
 */
export const downloadThermalReceiptPDF = async (input: string | HTMLElement, filename: string) => {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  let elementToRender: HTMLElement
  let tempContainer: HTMLElement | null = null

  if (typeof input !== 'string' && input instanceof HTMLElement) {
    elementToRender = input
  } else {
    const { container, target } = prepareDOMFromHTML(input as string, true)
    tempContainer = container
    elementToRender = target
  }

  const options = {
    margin: [2, 2, 2, 2] as [number, number, number, number],
    filename: name,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 302
    },
    jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 150))
    await html2pdf().set(options).from(elementToRender).save()
  } catch (err) {
    console.error('Failed generating Thermal Receipt PDF:', err)
  } finally {
    if (tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer)
    }
  }
}

/**
 * Utility to build clean printable A4 Payment Settlement Receipt Vouchers.
 */
export function buildPaymentReceiptVoucherHTML(r: {
  receiptNumber: string
  invoiceNumber: string
  customer: string
  customerPhone?: string
  amountCollected: number
  paymentMethod: string
  timestamp: string
  notes?: string
  remainingDue?: number
  isVendor?: boolean
}): string {
  const isVendor = r.isVendor || r.invoiceNumber?.startsWith('PO-') || r.receiptNumber?.startsWith('REC-PO')
  const rem = r.remainingDue !== undefined ? r.remainingDue : 0
  const statusLabel = rem <= 0.01 ? 'FULL SETTLEMENT' : 'PARTIAL PAYMENT'
  const partyLabel = isVendor ? 'Supplier / Vendor Name' : 'Customer Name'
  const voucherTitle = isVendor ? 'Vendor Payment Receipt' : 'Payment Receipt'
  const refLabel = isVendor ? 'Purchase Order Ref' : 'Invoice Reference'
  const descText = isVendor ? 'Vendor Purchase Order Settlement' : 'Customer Outstanding Balance Settlement'
  const amountTitle = isVendor ? 'Amount Paid to Vendor' : 'Amount Collected & Received'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:20px; }
  .page { background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:32px; max-width:680px; margin:0 auto; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #7c3aed; padding-bottom:16px; margin-bottom:24px; }
  .brand { font-size:22px; font-weight:800; color:#7c3aed; letter-spacing:-0.5px; }
  .subbrand { font-size:12px; color:#64748b; font-weight:600; margin-top:2px; }
  .rec-title { font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; }
  .rec-num { font-family:monospace; font-size:14px; font-weight:700; color:#7c3aed; margin-top:2px; }
  .status-badge { display:inline-block; margin-top:6px; padding:3px 10px; border-radius:9999px; font-size:10px; font-weight:800; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; text-transform:uppercase; }

  .details-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; }
  .field { margin-bottom:8px; }
  .field:last-child { margin-bottom:0; }
  .label { font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; }
  .val { font-size:13px; font-weight:700; color:#1e293b; margin-top:1px; }

  .amount-card { background:#f0fdf4; border:2px solid #bbf7d0; border-radius:12px; padding:18px; text-align:center; margin-bottom:24px; }
  .amount-card .lbl { font-size:11px; font-weight:800; text-transform:uppercase; color:#166534; letter-spacing:1px; }
  .amount-card .amt { font-family:monospace; font-size:32px; font-weight:900; color:#15803d; margin:6px 0; }
  .amount-card .words { font-size:12px; font-weight:600; color:#166534; }

  .summary-table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px; }
  .summary-table th { background:#f1f5f9; padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; }
  .summary-table td { padding:12px 14px; border-bottom:1px solid #e2e8f0; font-weight:600; }

  .footer { border-top:1px solid #e2e8f0; padding-top:16px; text-align:center; font-size:10.5px; color:#94a3b8; }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">Livwee Pharmacy</div>
      <div class="subbrand">Official Payment Settlement Voucher</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Ground Floor, Livwee Building, Mumbai – 400001 | GSTIN: 27AAAAA0000A1Z5</div>
    </div>
    <div style="text-align:right">
      <div class="rec-title">${voucherTitle}</div>
      <div class="rec-num">${r.receiptNumber}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <div class="details-grid">
    <div>
      <div class="field"><div class="label">${partyLabel}</div><div class="val">${r.customer}${r.customerPhone ? ' (' + r.customerPhone + ')' : ''}</div></div>
      <div class="field"><div class="label">Payment Date &amp; Time</div><div class="val">${r.timestamp}</div></div>
      <div class="field"><div class="label">Payment Method</div><div class="val">${r.paymentMethod}</div></div>
    </div>
    <div>
      <div class="field"><div class="label">${refLabel}</div><div class="val" style="font-family:monospace">${r.invoiceNumber}</div></div>
      <div class="field"><div class="label">Receipt Number</div><div class="val" style="font-family:monospace">${r.receiptNumber}</div></div>
      <div class="field"><div class="label">Notes / Reference</div><div class="val">${r.notes || 'Payment recorded'}</div></div>
    </div>
  </div>

  <div class="amount-card">
    <div class="lbl">${amountTitle}</div>
    <div class="amt">₹${r.amountCollected.toFixed(2)}</div>
    <div class="words">Payment Status: <strong>${statusLabel}</strong></div>
  </div>

  <table class="summary-table">
    <thead><tr><th>Description</th><th>Ref #</th><th>Method</th><th style="text-align:right">Amount Paid</th></tr></thead>
    <tbody>
      <tr>
        <td>${descText}</td>
        <td style="font-family:monospace">${r.invoiceNumber}</td>
        <td>${r.paymentMethod}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700;color:#15803d">₹${r.amountCollected.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:700;color:#64748b">Remaining Outstanding Balance Due:</td>
        <td style="text-align:right;font-family:monospace;font-weight:800;color:${rem > 0.01 ? '#dc2626' : '#15803d'}">₹${rem.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Official Settlement Receipt &nbsp;|&nbsp; Computer Generated Payment Voucher &nbsp;|&nbsp; Authorised Signatory, Livwee Pharmacy
  </div>
</div>
</body></html>`
}

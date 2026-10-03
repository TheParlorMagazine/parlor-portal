'use client'

// Promise-based confirm/alert backed by the global <ConfirmHost/> (mounted in
// the root layout). Lets call sites keep their inline control flow:
//   if (!(await confirmDialog('Delete this?'))) return
//   await alertDialog('Something went wrong')
// Pass a string, or { title, message, confirmText, cancelText }.
function open(opts, alert) {
  const o = typeof opts === 'string' ? { message: opts } : (opts || {})
  return new Promise(resolve => {
    try {
      window.dispatchEvent(new CustomEvent('parlor-confirm', { detail: { opts: { ...o, alert }, resolve } }))
    } catch {
      // SSR / no host: fall back to the native dialog.
      if (alert) { try { window.alert(o.message) } catch {} resolve(undefined) }
      else { let r = false; try { r = window.confirm(o.message) } catch {} resolve(r) }
    }
  })
}

export function confirmDialog(opts) { return open(opts, false) }
export function alertDialog(opts) { return open(opts, true) }

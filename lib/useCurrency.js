'use client'

import { useEffect, useState } from 'react'

// Same-numeral geo pricing: the amount stays the same, only the symbol/currency
// changes by region ($7 → €7 → £7). Detects the visitor's currency once.
export function useCurrency() {
  const [cur, setCur] = useState({ currency: 'usd', symbol: '$', country: null })
  useEffect(() => {
    let alive = true
    fetch('/api/geo').then(r => r.json()).then(d => { if (alive && d?.symbol) setCur(d) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return cur
}

// Format a numeric amount with the region's symbol, same number across currencies.
export function fmtPrice(amount, symbol = '$') {
  const n = Number(amount || 0)
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return `${symbol}${s}`
}

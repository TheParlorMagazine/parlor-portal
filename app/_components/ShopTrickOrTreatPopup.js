'use client'

import { useState, useEffect } from 'react'
import TrickOrTreatStrip from './TrickOrTreatStrip'

const DISMISSED_KEY = 'parlor:shop-trick-or-treat:dismissed'

export default function ShopTrickOrTreatPopup({ heroSelector = '#shop-featured-product' }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try { setVisible(sessionStorage.getItem(DISMISSED_KEY) !== '1') }
    catch { setVisible(true) }
  }, [])

  function dismiss() {
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch {}
    setVisible(false)
  }

  return visible ? <TrickOrTreatStrip shopPopup onDismiss={dismiss} heroSelector={heroSelector} bottomSelector="#shop-popup-no-bottom-trigger" /> : null
}

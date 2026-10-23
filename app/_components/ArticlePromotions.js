'use client'

import { useState } from 'react'
import TrickOrTreatStrip from './TrickOrTreatStrip'
import BonesCoffeeBanner from './BonesCoffeeBanner'

export default function ArticlePromotions() {
  const [visible, setVisible] = useState(false)
  return <>
    <TrickOrTreatStrip href="/trick-or-treat" onVisibilityChange={setVisible} />
    <BonesCoffeeBanner visible={visible} />
  </>
}

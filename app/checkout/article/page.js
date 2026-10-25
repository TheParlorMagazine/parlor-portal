'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { startItemCheckout } from '../../../lib/startItemCheckout'

function ArticleCheckout() {
  const params = useSearchParams()
  const started = useRef(false)
  const [error, setError] = useState('')
  const articleId = params.get('articleId')
  const stripePriceId = params.get('stripePriceId')
  const itemType = params.get('itemType') || 'article'

  async function proceed() {
    setError('')
    if (!articleId || !stripePriceId || !['article','audio','video'].includes(itemType)) {
      setError('This purchase link is incomplete. Please return to the article and try again.')
      return
    }
    try {
      // The API rechecks publication, stored price, account and existing access.
      await startItemCheckout({ articleId, stripePriceId, itemType })
    } catch (err) { setError(err.message || 'We could not open checkout. Please try again.') }
  }
  useEffect(() => {
    if (started.current) return
    started.current = true
    document.cookie = 'parlor_checkout_return=; Path=/; Max-Age=0; SameSite=Lax'
    proceed()
  }, [])

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Georgia, serif'}}>
    <div style={{maxWidth:440,textAlign:'center'}}>
      <h1>{error ? 'Checkout could not be opened' : 'Opening secure checkout…'}</h1>
      {error ? <><p role="alert">{error}</p><button type="button" onClick={proceed} style={{font:'inherit',background:'#111',color:'#fff',border:0,borderRadius:8,padding:'12px 24px',cursor:'pointer'}}>Try again</button></> : <p>Please wait while we prepare your article purchase.</p>}
      <p><a href="/" style={{color:'#8b465a'}}>Return home</a></p>
    </div>
  </main>
}
export default function ArticleCheckoutPage() {
  return <Suspense fallback={<p>Preparing checkout…</p>}><ArticleCheckout /></Suspense>
}

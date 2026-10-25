import { createClient } from './supabase'

export async function startItemCheckout({ stripePriceId, articleId, itemType }) {
  const { data: { session } } = await createClient().auth.getSession()
  const signIn = () => {
    const returnTo = '/checkout/article?' + new URLSearchParams({ articleId, stripePriceId, itemType: itemType || 'article' }).toString()
    if (typeof document !== 'undefined') document.cookie = `parlor_checkout_return=${encodeURIComponent(returnTo)}; Path=/; Max-Age=3600; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
  }
  if (!session) { signIn(); return }
  const response = await fetch('/api/create-paywall-checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ stripePriceId, articleId, itemType }),
  })
  if (response.status === 401) { signIn(); return }
  const data = await response.json()
  if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started. Please try again.')
  window.location.href = data.url
}

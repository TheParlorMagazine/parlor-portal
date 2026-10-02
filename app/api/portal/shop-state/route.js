import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// GET → the member's saved cart + wishlist.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data } = await db.from('member_shop_state').select('cart, wishlist').eq('member_id', user.id).maybeSingle()
  return Response.json({ cart: data?.cart || [], wishlist: data?.wishlist || [] })
}

// PUT { cart, wishlist } → upsert the member's saved state.
export async function PUT(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let b = {}; try { b = await request.json() } catch {}
  const cart = Array.isArray(b.cart) ? b.cart.slice(0, 200) : []
  const wishlist = Array.isArray(b.wishlist) ? b.wishlist.slice(0, 200) : []
  const db = serviceClient()
  const { error } = await db.from('member_shop_state')
    .upsert({ member_id: user.id, cart, wishlist, updated_at: new Date().toISOString() }, { onConflict: 'member_id' })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

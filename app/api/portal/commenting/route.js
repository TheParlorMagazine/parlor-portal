import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { commentingControl } from '../../../../lib/commentingControls'

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

async function handle(request, update) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind')
  const id = searchParams.get('id')
  if (!uuid.test(id)) return Response.json({ error: 'Discussion not found' }, { status: 404 })
  const db = serviceClient()
  try {
    const control = await commentingControl(db, user, kind, id)
    if (!control) return Response.json({ error: 'Discussion not found' }, { status: 404 })
    if (!update) {
      const { canManage, locked, forumOpen } = control
      return Response.json({ canManage, locked, forumOpen })
    }
    if (!control.canManage) return Response.json({ error: 'Moderator access required' }, { status: 403 })
    const body = await request.json().catch(() => null)
    if (typeof body?.locked !== 'boolean') return Response.json({ error: 'Invalid setting' }, { status: 400 })
    const { data, error } = await db.from(control.table)
      .update({ [control.field]: kind === 'forum' ? !body.locked : body.locked })
      .eq('id', id).eq('status', kind === 'forum' ? 'active' : 'live').select('id').maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: 'Discussion not found' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (error) {
    if (!update && ['42703', 'PGRST204'].includes(error.code)) {
      return Response.json({ canManage: false, locked: false, forumOpen: true })
    }
    return Response.json({ error: 'Could not load or save commenting settings.' }, { status: 500 })
  }
}

export function GET(request) { return handle(request, false) }
export function PATCH(request) { return handle(request, true) }

import { memberOf } from './apiAuth'
import { filmClubDiscussion, filmClubDiscussionVisible } from './filmClubDiscussions'
import { forumRole } from './forums'

const targets = {
  forum: { table: 'forums', field: 'commenting_open', select: 'id,status' },
  thread: { table: 'forum_threads', field: 'replies_locked', select: 'id,forum_id,status' },
  post: { table: 'member_posts', field: 'replies_locked', select: 'id,forum_id,status' },
}

export async function commentingControl(db, user, kind, id) {
  const target = Object.hasOwn(targets, kind) ? targets[kind] : null
  if (!target) return null
  const { data: item, error } = await db.from(target.table).select(`${target.select},${target.field}`).eq('id', id).maybeSingle()
  if (error) throw error
  if (!item || item.status !== (kind === 'forum' ? 'active' : 'live')) return null

  const forumId = kind === 'forum' ? id : item.forum_id
  const discussion = forumId ? await filmClubDiscussion(db, forumId) : null
  if (discussion && !filmClubDiscussionVisible(discussion)) return null

  const me = await memberOf(db, user.id)
  const membership = forumId ? await forumRole(db, forumId, user.id) : null
  const staff = ['admin', 'social_admin'].includes(me.role) || Boolean(discussion && me.role === 'editor')
  const grant = discussion && kind !== 'forum' && !staff && membership !== 'host'
    ? await db.from('film_club_forum_moderators').select('member_id').eq('forum_id', forumId)
      .eq('member_id', user.id).gt('expires_at', new Date().toISOString()).maybeSingle()
    : null
  if (forumId && !staff && !membership && !grant?.data && discussion?.forum.join_policy !== 'open') return null

  let forumOpen = kind === 'forum' ? item.commenting_open : true
  if (forumId && kind !== 'forum') {
    const { data: forum, error } = await db.from('forums').select('commenting_open').eq('id', forumId).single()
    if (error) throw error
    forumOpen = forum.commenting_open
  }

  return {
    table: target.table,
    field: target.field,
    canManage: Boolean(staff || membership === 'host' || grant?.data) && !(discussion && kind === 'forum'),
    locked: kind === 'forum' ? !item.commenting_open : item.replies_locked,
    forumOpen: forumOpen && (discussion?.commenting_open ?? true),
  }
}

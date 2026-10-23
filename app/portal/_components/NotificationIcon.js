// Legacy system notifications share a type, so use their destination first and
// recognize older newsletter/group messages when no specific destination exists.
export function notificationCategory(notification) {
  const { type, link_to: destination, link_ref: ref, message = '' } = notification
  if (destination === 'newsletter' || type === 'newsletter' || (destination === 'admin' && ref === 'newsletter') || /\bnewsletter\b/i.test(message)) return 'newsletter'
  if (['forum', 'forums', 'groups', 'bookclub'].includes(destination) || ['new_thread', 'forum'].includes(type)) return 'forum'
  if (['event', 'events'].includes(destination) || type === 'event') return 'event'
  if (destination === 'inbox' || type === 'inbox') return 'message'
  if (['article', 'write', 'blog'].includes(destination)) return 'article'
  if (['library', 'library-detail'].includes(destination) || type === 'library') return 'library'
  if (type === 'reply') return 'reply'
  if (/\b(group|forum)\b/i.test(message)) return 'forum'
  return 'dashboard'
}

const labels = { newsletter: 'Newsletter', forum: 'Forums', event: 'Events', message: 'Messages', article: 'Articles', library: 'Library', reply: 'Replies', dashboard: 'Member portal' }
const paths = {
  dashboard: <><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></>,
  forum: <><circle cx="3" cy="4" r="2"/><path d="M0 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"/><circle cx="10" cy="3.5" r="2.2"/><path d="M5.8 13c0-2.3 1.9-4.2 4.2-4.2s4.2 1.9 4.2 4.2"/><circle cx="17" cy="4" r="2"/><path d="M14 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"/></>,
  newsletter: <><path d="M4 2h10v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6h2zM4 6v8"/><path d="M7 5h4M7 8h4M7 11h4"/></>,
  event: <><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v4M11 1v4M2 7h12"/></>,
  message: <><rect x="2" y="4" width="12" height="9" rx="1"/><path d="m2 4 6 5 6-5"/></>,
  article: <><path d="M3 1h7l3 3v11H3zM10 1v4h3M6 8h4M6 11h4"/></>,
  library: <path d="M8 13V4M8 4S6 3 3 3v10c3 0 5 1 5 1m0-10s2-1 5-1v10c-3 0-5 1-5 1"/>,
  reply: <path d="M6 4 2 8l4 4M2 8h7a4 4 0 0 1 4 4"/>,
}

export default function NotificationIcon({ notification }) {
  const category = notificationCategory(notification)
  return <span role="img" aria-label={labels[category]} title={labels[category]} data-notification-category={category} style={{ width: 30, height: 30, borderRadius: '50%', background: '#fbedf2', color: '#86465d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
    <svg aria-hidden="true" viewBox={category === 'forum' ? '-1 0 22 16' : '0 0 16 16'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>{paths[category]}</svg>
  </span>
}

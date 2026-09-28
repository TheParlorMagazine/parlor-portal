'use client'

const SERIF = "'thermal-variable', Georgia, serif"

export const THREAD_GUIDELINES = [
  'Be thoughtful, not reactive',
  'Engage ideas, not people',
  'No hate, harassment, or bad-faith arguments',
  'Respect lived experiences — don’t dismiss or demand emotional labor',
  'Stay on topic and add value',
  'No spam or self-promotion',
]

export const FORUM_GUIDELINES = [
  'Keep it welcoming and on-mission',
  'You’re the moderator — you’ll keep it healthy and on-topic',
  'No hate, harassment, or bad-faith spaces',
  'Respect members’ privacy and lived experiences',
  'No spam, self-promotion, or off-brand commercial groups',
]

// A "Before you post…" panel with an agreement checkbox. Controlled via
// `agreed` / `onAgree`.
export default function PostGuidelines({
  heading = 'Before you post…',
  items = THREAD_GUIDELINES,
  note = 'If you wouldn’t say it in a room full of thoughtful people, don’t post it here.',
  agreeLabel = 'By posting, you agree to follow these guidelines.',
  agreed,
  onAgree,
}) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#fbeff2,#fdf5f6)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 18, fontFamily: SERIF }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)', marginBottom: 10 }}>{heading}</div>
      <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: 13.5, color: '#555', lineHeight: 1.7 }}>{it}</li>)}
      </ul>
      {note && <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>{note}</div>}
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', userSelect: 'none' }}>
        <input type="checkbox" checked={!!agreed} onChange={e => onAgree(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#0a0a0a', cursor: 'pointer', flexShrink: 0 }} />
        {agreeLabel}
      </label>
    </div>
  )
}

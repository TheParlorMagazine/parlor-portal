'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const pink = '#f2b8c6'
const darkPink = '#c4364a'

const ROLE_OPTIONS = [
  { value: 'admin',         label: 'Master Admin',   desc: 'Full access to all sections',            color: '#c4364a', bg: 'rgba(196,54,74,0.1)' },
  { value: 'editor',        label: 'Editor',          desc: 'Articles, Writers, Media',               color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  { value: 'writer',        label: 'Writer',          desc: 'Writer dashboard only',                  color: '#2d8f5a', bg: 'rgba(110,201,154,0.12)' },
  { value: 'finance_admin', label: 'Finance Admin',   desc: 'Invoices only',                          color: '#d4844a', bg: 'rgba(242,196,110,0.12)' },
  { value: 'social_admin',  label: 'Social Admin',    desc: 'Scheduled posts only',                   color: '#8a4ad4', bg: 'rgba(200,160,242,0.12)' },
]

const ROLE_ACCESS = {
  admin:         ['Dashboard', 'Articles', 'Writers', 'Media', 'Subscribers', 'Team', 'Invoices', 'Social Posts', 'Roles', 'Settings'],
  editor:        ['Articles', 'Writers', 'Media'],
  writer:        ['Writer Dashboard'],
  finance_admin: ['Invoices'],
  social_admin:  ['Scheduled Posts'],
}

function roleOpt(val) { return ROLE_OPTIONS.find(r => r.value === val) }

function RoleBadge({ role }) {
  const opt = roleOpt(role)
  if (!opt) return null
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', fontFamily: ff, background: opt.bg, color: opt.color }}>
      {opt.label}
    </span>
  )
}

function TeamMemberRow({ member, isLast, onRoleChange, onDeactivate }) {
  const [editingRole, setEditingRole] = useState(false)
  const [newRole, setNewRole] = useState(member.role || '')
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const displayName = member.name || member.full_name || member.display_name || null
  const displayEmail = member.email || null
  const access = ROLE_ACCESS[member.role] || []
  const isInactive = member.subscription_status === 'inactive' || member.deactivated

  async function saveRole() {
    setSaving(true)
    await onRoleChange(member.id, newRole)
    setSaving(false)
    setEditingRole(false)
  }

  async function handleDeactivate() {
    if (!window.confirm(`Deactivate ${displayName || 'this team member'}? They will lose dashboard access but keep their account.`)) return
    setDeactivating(true)
    await onDeactivate(member.id)
    setDeactivating(false)
  }

  const tdStyle = { padding: '14px 16px', verticalAlign: 'top', fontFamily: ff }

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid #f5f5f5', opacity: isInactive ? 0.5 : 1 }}>
      {/* Identity */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0e8e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ffH, fontSize: '14px', fontWeight: '700', color: darkPink, flexShrink: 0 }}>
            {(displayName || displayEmail || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>
              {displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}
              {isInactive && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#c04040', background: 'rgba(224,112,112,0.1)', padding: '1px 6px', borderRadius: '3px' }}>Inactive</span>}
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '1px' }}>{displayEmail || member.id.slice(0, 16) + '…'}</div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td style={{ ...tdStyle, width: '200px' }}>
        {editingRole ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px', fontFamily: ff, color: '#0a0a0a', outline: 'none', cursor: 'pointer' }}
            >
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              <option value="">Remove role (→ Subscriber)</option>
            </select>
            <button onClick={saveRole} disabled={saving} style={{ padding: '5px 12px', background: pink, border: 'none', borderRadius: '5px', color: '#0a0a0a', fontSize: '12px', cursor: 'pointer', fontFamily: ff, fontWeight: '600' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingRole(false)} style={{ padding: '5px 10px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '5px', color: '#888', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
              ×
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RoleBadge role={member.role} />
            <button onClick={() => setEditingRole(true)} style={{ padding: '3px 8px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '4px', color: '#aaa', fontSize: '11px', cursor: 'pointer', fontFamily: ff }}>
              Change
            </button>
          </div>
        )}
      </td>

      {/* Access */}
      <td style={{ ...tdStyle, width: '260px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {access.map(a => (
            <span key={a} style={{ display: 'inline-block', padding: '2px 7px', background: '#f5f5f5', borderRadius: '3px', fontSize: '11px', color: '#666', fontFamily: ff }}>
              {a}
            </span>
          ))}
        </div>
      </td>

      {/* Added */}
      <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa', width: '110px' }}>
        {member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
      </td>

      {/* Last active */}
      <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa', width: '110px' }}>
        {member.last_active ? new Date(member.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
      </td>

      {/* Actions */}
      <td style={{ ...tdStyle, textAlign: 'right', width: '100px' }}>
        <button
          onClick={handleDeactivate}
          disabled={deactivating}
          style={{ padding: '5px 12px', background: 'none', border: '1px solid rgba(224,112,112,0.25)', borderRadius: '5px', color: '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}
        >
          {deactivating ? '…' : isInactive ? 'Reactivate' : 'Deactivate'}
        </button>
      </td>
    </tr>
  )
}

export default function TeamSection({ supabase }) {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

  useEffect(() => {
    supabase.from('members').select('*').in('role', TEAM_ROLES).order('joined_at', { ascending: false }).then(({ data }) => {
      setTeam(data || [])
      setLoading(false)
    })
  }, [])

  async function handleRoleChange(id, role) {
    const updateVal = role || null
    await supabase.from('members').update({ role: updateVal }).eq('id', id)
    if (!role || !TEAM_ROLES.includes(role)) {
      setTeam(prev => prev.filter(m => m.id !== id))
    } else {
      setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    }
  }

  async function handleDeactivate(id) {
    const member = team.find(m => m.id === id)
    const isInactive = member?.subscription_status === 'inactive' || member?.deactivated
    const newStatus = isInactive ? 'active' : 'inactive'
    await supabase.from('members').update({ subscription_status: newStatus, deactivated: !isInactive }).eq('id', id)
    setTeam(prev => prev.map(m => m.id === id ? { ...m, subscription_status: newStatus, deactivated: !isInactive } : m))
  }

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: '500' }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Team</h1>
        <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>
          {loading ? '…' : `${team.length} team member${team.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {ROLE_OPTIONS.map(r => (
          <div key={r.value} style={{ background: r.bg, borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: r.color, fontFamily: ff }}>{r.label}</span>
            <span style={{ fontSize: '11px', color: r.color, opacity: 0.7, fontFamily: ff }}>— {r.desc}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#bbb', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : team.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#bbb', fontFamily: ff, fontStyle: 'italic', marginBottom: '8px' }}>No team members yet.</div>
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff }}>Assign a role to a subscriber in Roles & Permissions to add them here.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Member</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Access</th>
                <th style={thStyle}>Added</th>
                <th style={thStyle}>Last Active</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m, i) => (
                <TeamMemberRow
                  key={m.id}
                  member={m}
                  isLast={i === team.length - 1}
                  onRoleChange={handleRoleChange}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

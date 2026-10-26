export function engagementRate(stats, field) {
  if (!stats) return '—'
  if (!stats.tracked) return 'Not tracked'
  if (!Number(stats.accepted_count)) return '—'
  return `${Math.round(Number(stats[field] || 0)/Number(stats.accepted_count)*100)}%`
}

export default function CampaignEngagement({ stats }) {
  if (!stats) return <p style={{ fontSize:13,color:'#888' }}>Tracking data is unavailable. Refresh tracking to try again.</p>
  if (!stats.tracked) return <p style={{ fontSize:13,color:'#888' }}>Tracking wasn’t recorded for this older send. It is available for new sends after setup.</p>
  const values=[['Accepted',stats.accepted_count],['Delivered',stats.delivered_count],['Unique opens',stats.open_count],['Total opens',stats.total_open_count],['Unique clicks',stats.click_count],['Total clicks',stats.total_click_count],['Bounced',stats.bounced_count],['Failed',stats.failed_count],['Spam complaints',stats.complained_count]]
  return <div style={{ padding:'12px 0' }}>
    <h3 style={{ fontSize:15,margin:'0 0 12px' }}>Campaign engagement</h3>
    <div style={{ display:'flex',flexWrap:'wrap',gap:'14px 28px' }}>{values.map(([label,value])=><div key={label} style={{ minWidth:80 }}><div style={{ fontSize:12,color:'#888' }}>{label}</div><strong style={{ fontSize:17 }}>{Number(value || 0).toLocaleString()}</strong></div>)}</div>
    <p style={{ fontSize:12,color:'#888',lineHeight:1.6 }}>Rates count unique recipients against accepted emails. Opens are estimates; privacy tools and link scanners can affect these numbers.</p>
    {!stats.last_event_at && <p style={{ fontSize:12,color:'#9b6400' }}>No tracking events received yet. Check that open/click tracking and the webhook are enabled in Resend.</p>}
    {stats.links?.length>0 && <><h4 style={{ fontSize:13,margin:'14px 0 8px' }}>Most-clicked links</h4>{stats.links.map(row=><div key={row.link} style={{ display:'flex',gap:20,justifyContent:'space-between',fontSize:12,marginBottom:6 }}><span style={{ overflowWrap:'anywhere' }}>{row.link}</span><span style={{ whiteSpace:'nowrap' }}>{row.unique_clicks} unique · {row.total_clicks} total</span></div>)}</>}
  </div>
}

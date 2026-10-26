'use client'
import { useEffect,useState } from 'react'
const date=value=>value?new Date(value).toLocaleString():'—'
export default function SubscriberActivity({campaignId,supabase,unsubscribes=false}) {
  const [filter,setFilter]=useState('all'),[offset,setOffset]=useState(0),[data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{
    let live=true;setData(null);setError('')
    async function load(){try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session)throw Error('Sign in again to view subscriber activity.')
      const path=unsubscribes?`unsubscribes?offset=${offset}`:`subscriber-activity?campaign_id=${encodeURIComponent(campaignId)}&filter=${filter}&offset=${offset}`
      const res=await fetch('/api/admin/campaigns/'+path,{cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}}),body=await res.json()
      if(!res.ok)throw Error(body.error || 'Could not load activity.')
      if(live)setData(body)
    }catch(e){if(live)setError(e.message)}}load();return()=>{live=false}
  },[campaignId,supabase,unsubscribes,filter,offset,revision])
  return <section style={{marginTop:20,fontSize:13}}>
    <h4>{unsubscribes?'Unsubscribe history':'Subscriber activity'}</h4>
    {!unsubscribes && <label>Show <select value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0)}} style={{font:'inherit',margin:'0 8px'}}>{['all','clicked','opened','unsubscribed'].map(v=><option key={v} value={v}>{v==='unsubscribed'?'Unsubscribed from this email':v}</option>)}</select></label>}
    <button type="button" onClick={()=>setRevision(n=>n+1)} style={{font:'inherit'}}>Refresh activity</button>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p>Loading activity…</p>}
    {data && <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',marginTop:12}}><thead><tr>{(unsubscribes?['Subscriber','Unsubscribed','Source','Campaign']:['Subscriber','Delivery','Opens','Clicks / destinations','Unsubscribe']).map(t=><th key={t} style={{textAlign:'left',padding:8}}>{t}</th>)}</tr></thead><tbody>
      {(unsubscribes?data.events:data.subscribers).map((row,index)=>unsubscribes?<tr key={row.id}><td style={{padding:8}}>{row.members?.full_name}<br/>{row.members?.email || 'Deleted account'}</td><td>{date(row.occurred_at)}</td><td>{row.source==='email_link'?'Email unsubscribe link':row.source==='existing_preferences'?'Existing preference (historical)':'Account/admin preference'}</td><td>{row.email_campaigns?.name || row.email_campaigns?.subject || 'Not attributed'}</td></tr>:<tr key={row.member_id || index} style={{borderTop:'1px solid #eee'}}>
        <td style={{padding:8}}>{row.full_name}<br/>{row.email || 'Deleted account'}</td><td>{row.delivered_at?'Delivered '+date(row.delivered_at):'Accepted; delivery unconfirmed'}</td><td>{row.opens}</td><td style={{padding:8,maxWidth:320,overflowWrap:'anywhere'}}>{row.clicks}{(row.links || []).map(link=><div key={link.link} style={{marginTop:6}}>{link.link}<br/>{link.clicks} clicks · {date(link.last_clicked_at)}</div>)}</td><td>{row.campaign_unsubscribed_at?<>From this email: {date(row.campaign_unsubscribed_at)}</>:row.newsletter_subscribed===false || row.unsubscribed_at?'Currently opted out (not attributed to this email)':'No opt-out recorded'}</td>
      </tr>)}
    </tbody></table>{!(unsubscribes?data.events:data.subscribers).length && <p>No matching activity.</p>}</div>}
    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}><button type="button" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Previous</button><span>Page {Math.floor(offset/50)+1}</span><button type="button" disabled={!data?.hasMore} onClick={()=>setOffset(n=>n+50)}>Next</button></div>
  </section>
}

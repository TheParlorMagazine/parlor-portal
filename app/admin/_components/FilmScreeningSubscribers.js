'use client'
import {useEffect,useState} from 'react'
import {filmClubRequest} from '../../../lib/filmClubRequest'
import styles from './FilmClubAdmin.module.css'
const api='/api/admin/film-club/subscribers'
export default function FilmScreeningSubscribers({screening,busy,onSave,Dialog}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[adding,setAdding]=useState(false),[query,setQuery]=useState(''),[matches,setMatches]=useState([]),[searching,setSearching]=useState(false),[saving,setSaving]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[revision,setRevision]=useState(0)
 useEffect(()=>{let active=true;setLoading(true);filmClubRequest(`${api}?eventId=${screening.event_id}`).then(result=>{if(active){setRows(result.subscribers);setError(result.truncated?'Showing the first 5,000 contacts from each ticket source.':'')}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[screening.event_id,revision])
 useEffect(()=>{let active=true;setMatches([]);if(!adding||query.trim().length<2){setSearching(false);return()=>{active=false}}setSearching(true);const timer=setTimeout(()=>filmClubRequest(`${api}?eventId=${screening.event_id}&q=${encodeURIComponent(query)}`).then(result=>{if(active)setMatches(result.members)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setSearching(false)}),250);return()=>{active=false;clearTimeout(timer)}},[adding,query,screening.event_id])
 async function add(contact){setSaving(true);setError('');try{await filmClubRequest(api,'POST',{eventId:screening.event_id,...contact});setRevision(r=>r+1);setAdding(false);setQuery('');setName('');setEmail('')}catch(e){setError(e.message)}finally{setSaving(false)}}
 const filtered=rows.filter(row=>`${row.full_name||''} ${row.email}`.toLowerCase().includes(search.toLowerCase()))
 return <>
  <section className={`${styles.card} ${styles.subscriberPanel}`}>
   <div className={styles.subscriberHeading}><div><h2>Screening subscribers</h2><p>{rows.length} contacts</p></div><button className={styles.primary} disabled={busy||loading} onClick={()=>{setError('');setAdding(true)}}>+ Add subscriber</button></div>
   <input className={styles.subscriberSearch} type="search" aria-label="Search screening subscribers" placeholder="Search by name or email…" value={search} onChange={event=>setSearch(event.target.value)}/>
   {error&&!adding&&<p role="alert">{error}</p>}
   {loading?<p role="status">Loading screening subscribers…</p>:<div className={styles.subscriberList}>
    <div className={styles.subscriberColumns}><span>Subscriber</span><span>Plan</span><span>Newsletter</span><span>Ticket source</span></div>
    {filtered.map(row=><article key={row.email} className={styles.subscriberColumns}><div><strong>{row.full_name || row.email}</strong>{row.full_name&&<span>{row.email}</span>}</div><span>{row.plan || 'External contact'}</span><span>{!row.id?'Not registered':row.newsletter_subscribed===false||row.unsubscribed_at?'Unsubscribed':'Subscribed'}</span><span>{row.source}</span></article>)}
    {!filtered.length&&<p className={styles.buyerEmpty}>{rows.length?'No subscribers match your search.':'No screening subscribers yet.'}</p>}
   </div>}
   <div className={`${styles.form} ${styles.subscriberAutomation}`}>
    <label className={`${styles.toggle} ${styles.discussionToggle}`}><span className={styles.discussionLabel}>Automated discussion email</span><input role="switch" type="checkbox" aria-label="Automated discussion email" checked={!!screening.discussion_email_enabled} disabled={busy} onChange={event=>onSave({action:'discussion_email',enabled:event.target.checked},()=> 'Discussion email setting saved.')}/><span className={styles.discussionValue}>{screening.discussion_email_enabled?'On':'Off'}</span></label>
    <p>Sends one discussion invitation per contact after the screening ends, while the forum and commenting are open.</p>
    {!screening.event.ends_at&&<p>Set an end time in Edit screening to enable automatic invitations.</p>}
   </div>
  </section>
  {adding&&<Dialog title="Add screening subscriber" busy={saving} onClose={()=>setAdding(false)}>
   {error&&<p role="alert">{error}</p>}
   <div className={styles.form}><label>Find an existing subscriber<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by name or email…"/></label>
   {searching&&<p role="status">Searching subscribers…</p>}
   {matches.map(member=><div className={styles.subscriberMatch} key={member.id}><div><strong>{member.full_name || member.email}</strong><span>{member.email} · {member.plan || 'free'}</span></div><button className={styles.primary} disabled={saving||rows.some(row=>row.email.toLowerCase()===member.email.toLowerCase())} onClick={()=>add({email:member.email})}>{rows.some(row=>row.email.toLowerCase()===member.email.toLowerCase())?'Added':'Add to screening'}</button></div>)}
   {!searching&&query.trim().length>=2&&!matches.length&&<p>No matching subscribers.</p>}</div>
   <form className={`${styles.form} ${styles.newSubscriber}`} onSubmit={event=>{event.preventDefault();add({email,full_name:name})}}><h3>New contact</h3><label>Full name<input value={name} maxLength={200} onChange={event=>setName(event.target.value)}/></label><label>Email address<input type="email" required value={email} maxLength={254} onChange={event=>setEmail(event.target.value)}/></label><p>New contacts are added as free site members and newsletter subscribers. Existing membership and unsubscribe preferences are preserved.</p><button disabled={saving}>{saving?'Adding…':'Add subscriber to screening'}</button></form>
  </Dialog>}
 </>
}

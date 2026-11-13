'use client'
import { useState } from 'react'
import { uploadToCloudinary } from '../../../lib/uploadImage'
const field={width:'100%',boxSizing:'border-box',padding:'9px 10px',border:'1px solid #e5e0e2',borderRadius:6,font:'inherit',margin:'4px 0 8px'}
export default function AnnouncementMediaEditor({items,onChange,onBusy}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 function patch(index,value){onChange(items.map((item,i)=>i===index?{...item,...value}:item))}
 async function upload(files){
  if(!files?.length)return
  const selected=[...files];if(items.length+selected.length>6){setError('Choose up to six media items.');return}
  if(selected.some(file=>!/^image\/|^video\//.test(file.type))){setError('Choose image, GIF or video files.');return}
  setBusy(true);onBusy(true);setError('')
  const added=[]
  try{for(const file of selected){const url=await uploadToCloudinary(file,'parlor/announcements');added.push({url,kind:file.type.startsWith('video/')?'video':'image',alt:''})}}catch{setError('A file could not be uploaded. Successfully uploaded items are kept below; retry the remaining files.')}finally{onChange([...items,...added]);setBusy(false);onBusy(false)}
 }
 function move(index,direction){const next=[...items];[next[index],next[index+direction]]=[next[index+direction],next[index]];onChange(next)}
 return <fieldset disabled={busy} style={{margin:'12px 0',border:'1px solid #e5e0e2',borderRadius:8,padding:12,minWidth:0}}>
  <legend>Images, GIFs and videos</legend>
  <p style={{fontSize:13,color:'#777'}}>Add up to six files or HTTPS URLs. GIF animation is preserved. Videos have playback controls.</p>
  {items.map((item,index)=><div key={index} style={{borderTop:index?'1px solid #eee':'none',paddingTop:10,marginTop:8}}>
   <label>Media type <select aria-label={`Media ${index+1} type`} value={item.kind} onChange={e=>patch(index,{kind:e.target.value})} style={field}><option value="image">Image or GIF</option><option value="video">Video</option></select></label>
   <label>Media URL <input aria-label={`Media ${index+1} URL`} value={item.url} onChange={e=>patch(index,{url:e.target.value})} placeholder="https://…" style={field}/></label>
   <label>Description <input aria-label={`Media ${index+1} description`} value={item.alt||''} onChange={e=>patch(index,{alt:e.target.value})} placeholder="Describe this image or video" style={field}/></label>
   {item.url&&(/^https:\/\//.test(item.url)||/^\/(?!\/)/.test(item.url))&&(item.kind==='video'?<video src={item.url} controls playsInline preload="none" style={{maxWidth:'100%',maxHeight:160}}/>:<img src={item.url} alt={item.alt||''} style={{maxWidth:'100%',maxHeight:160}}/>)}
   <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0'}}><button type="button" onClick={()=>onChange(items.filter((_,i)=>i!==index))}>Remove media {index+1}</button><button type="button" disabled={index===0} onClick={()=>move(index,-1)}>Move up</button><button type="button" disabled={index===items.length-1} onClick={()=>move(index,1)}>Move down</button></div>
  </div>)}
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginTop:10}}><button type="button" disabled={items.length>=6} onClick={()=>onChange([...items,{kind:'image',url:'',alt:''}])}>Add media URL</button><label style={{cursor:'pointer'}}>Upload files <input aria-label="Upload popup media" type="file" style={{maxWidth:'100%',width:'100%',display:'block'}} accept="image/*,video/*" multiple onChange={e=>{upload(e.target.files);e.target.value=''}}/></label></div>
  {busy&&<p role="status">Uploading media…</p>}{error&&<p role="alert" style={{color:'#c4364a'}}>{error}</p>}
 </fieldset>
}

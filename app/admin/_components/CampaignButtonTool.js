'use client'
import {useRef,useState} from 'react'
import Link from '@tiptap/extension-link'
import {campaignLinkUrl} from '../../../lib/campaignEmailStyles'

export const CampaignLink=Link.extend({
 addAttributes(){return {...this.parent?.(),campaignButton:{default:false,parseHTML:el=>el.getAttribute('data-campaign-button')==='true',renderHTML:attrs=>attrs.campaignButton?{'data-campaign-button':'true',style:'display:inline-block;padding:11px 24px;background:#0a0a0a;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-weight:600;'}:{}}}},
})

export default function CampaignButtonTool({editor}){
 const [open,setOpen]=useState(false),[label,setLabel]=useState('Shop now'),[url,setUrl]=useState('/shop'),[error,setError]=useState(''),selection=useRef(null)
 const input={padding:'7px 9px',border:'1px solid #ddd',borderRadius:5,font:'inherit',width:'100%',boxSizing:'border-box'}
 const button={padding:'6px 10px',border:'1px solid #ddd',borderRadius:5,font:'inherit',cursor:'pointer',background:'#fff',color:'#333'}
 function insert(){const href=campaignLinkUrl(url);if(!label.trim()||!href){setError('Enter a button label and a valid link.');return}let chain=editor.chain().focus();if(selection.current)chain=chain.setTextSelection(selection.current);chain.insertContent({type:'text',text:label.trim(),marks:[{type:'link',attrs:{href,campaignButton:true,target:'_blank',rel:'noopener noreferrer'}}]}).command(({tr})=>{tr.setStoredMarks([]);return true}).run();setOpen(false)}
 return <><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{selection.current={from:editor.state.selection.from,to:editor.state.selection.to};setError('');setOpen(!open)}} style={button}>Add button</button>{open&&<div role="dialog" aria-label="Insert email button" style={{width:'100%',padding:12,background:'#fff5f7',border:'1px solid #efd6df',borderRadius:6,display:'flex',gap:10,flexWrap:'wrap',alignItems:'end',fontSize:13}}><label style={{flex:'1 1 150px'}}>Button text<input autoFocus value={label} onChange={e=>setLabel(e.target.value)} style={input}/></label><label style={{flex:'2 1 200px'}}>Button link<input value={url} onChange={e=>setUrl(e.target.value)} style={input}/></label><button type="button" onClick={insert} style={{...button,background:'#0a0a0a',color:'#fff'}}>Insert button</button><button type="button" onClick={()=>{setOpen(false);editor.commands.focus()}} style={button}>Cancel</button>{error&&<p role="alert" style={{width:'100%',margin:0,color:'#923c5a'}}>{error}</p>}</div>}</>
}

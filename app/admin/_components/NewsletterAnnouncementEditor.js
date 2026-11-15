'use client'
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { readAnnouncement, writeAnnouncement } from '../../../lib/newsletterAnnouncement'
import { campaignLinkUrl } from '../../../lib/campaignEmailStyles'

export default function NewsletterAnnouncementEditor({ value, onChange }) {
  const config = readAnnouncement(value)
  const [, redraw] = useState(0), [linkOpen, setLinkOpen] = useState(false), [href, setHref] = useState(''), [error, setError] = useState('')
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading:false, bulletList:false, orderedList:false, listItem:false, blockquote:false, code:false, codeBlock:false, horizontalRule:false, strike:false, link:false, underline:false }), Underline, Link.configure({ openOnClick:false, autolink:false, protocols:['https','http','mailto','tel'] })],
    content: config.html,
    onCreate: ({ editor }) => { if (!readAnnouncement(value).rich) onChange(writeAnnouncement({ ...readAnnouncement(value), html: editor.getHTML() })) },
    onUpdate: ({ editor }) => onChange(writeAnnouncement({ ...readAnnouncement(value), html:editor.getHTML() })),
    onSelectionUpdate: () => redraw(n=>n+1),
    onTransaction: () => redraw(n=>n+1),
    editorProps: { attributes:{ role:'textbox', 'aria-label':'Announcement text', 'aria-multiline':'true', style:"min-height:150px;padding:12px;outline:none;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;" }, handleDrop:(_,event)=>{if(event.dataTransfer?.files?.length){event.preventDefault();return true}return false}, handlePaste:(_,event)=>{if([...event.clipboardData?.items||[]].some(i=>i.kind==='file')){event.preventDefault();return true}return false} },
  })
  useEffect(()=>{if(editor && editor.getHTML()!==config.html && !editor.isFocused) editor.commands.setContent(config.html,{emitUpdate:false})},[editor,value])
  function change(key,next) { onChange(writeAnnouncement({ ...config, html: editor?.getHTML() || config.html, [key]:next })) }
  const button = { border:'1px solid #e5e0e2', borderRadius:4, padding:'5px 9px', font:'inherit', cursor:'pointer' }
  function applyLink() { const safe=campaignLinkUrl(href); if(href.trim()&&!safe){setError('Enter a valid website, email or telephone link.');return} const chain=editor.chain().focus().extendMarkRange('link');if(safe)chain.setLink({href:safe}).run();else chain.unsetLink().run();setLinkOpen(false);setError('') }
  return <div>
    <label style={{display:'block',margin:'8px 0',fontSize:13}}>Image placement
      <select aria-label="Announcement image placement" value={config.layout} onChange={e=>change('layout',e.target.value)} style={{display:'block',width:'100%',padding:'9px 12px',marginTop:6,border:'1px solid #e0e0e0',borderRadius:6,font:'inherit',background:'#fff'}}>
        <option value="above">Full width above text</option><option value="embedded">Embedded within text</option><option value="left">Left thumbnail with text wrapping</option><option value="right">Right thumbnail with text wrapping</option>
      </select>
    </label>
    {config.layout==='embedded'&&<label style={{display:'block',marginBottom:8,fontSize:13}}>Place image after paragraph <input aria-label="Image after paragraph" type="number" min="1" max="100" value={config.after} onChange={e=>change('after',e.target.value)} style={{width:70,padding:6,marginLeft:8}} /></label>}
    <div style={{border:'1px solid #e0e0e0',borderRadius:6,overflow:'hidden',background:'#fff'}}>
      <div role="toolbar" aria-label="Announcement text formatting" style={{display:'flex',gap:5,padding:8,background:'#fafafa',borderBottom:'1px solid #eee',flexWrap:'wrap'}}>
        {[['Bold','bold','toggleBold'],['Italic','italic','toggleItalic'],['Underline','underline','toggleUnderline']].map(([name,mark,command])=><button key={mark} type="button" disabled={!editor} aria-label={name} aria-pressed={editor?.isActive(mark)||false} onMouseDown={e=>e.preventDefault()} onClick={()=>editor.chain().focus()[command]().run()} style={{...button,background:editor?.isActive(mark)?'#fceaf0':'#fff',fontWeight:mark==='bold'?700:400,fontStyle:mark==='italic'?'italic':'normal',textDecoration:mark==='underline'?'underline':'none'}}>{name}</button>)}
        <button type="button" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>{setHref(editor.getAttributes('link').href||'');setLinkOpen(!linkOpen);setError('')}} style={{...button,background:'#fff'}}>Link</button>
      </div>
      {linkOpen&&<div role="group" aria-label="Edit announcement link" style={{padding:8,display:'flex',gap:6,flexWrap:'wrap'}}><input aria-label="Text link URL" value={href} onChange={e=>setHref(e.target.value)} placeholder="https://…" style={{flex:1,minWidth:140,padding:7}}/><button type="button" onClick={applyLink}>Apply link</button><button type="button" onClick={()=>{editor.chain().focus().extendMarkRange('link').unsetLink().run();setLinkOpen(false)}}>Remove link</button>{error&&<span role="alert">{error}</span>}</div>}
      <EditorContent editor={editor}/>
    </div>
    <div style={{fontSize:12,color:'#888',marginTop:5}}>Manage the announcement image using the image field above. Some email clients display thumbnails beside the text without wrapping.</div>
  </div>
}

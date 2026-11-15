'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { AnnouncementImage } from './AnnouncementCanvasImage'
import { readAnnouncement, writeAnnouncement, announcementCanvas } from '../../../lib/newsletterAnnouncement'
import { campaignLinkUrl } from '../../../lib/campaignEmailStyles'

export default function NewsletterAnnouncementEditor({ value, onChange, image = '', onImageChange = () => {}, imagePicker = null }) {
  const config = readAnnouncement(value)
  const [imageOpen, setImageOpen] = useState(false), hadImage = useRef(!!image)
  const initial = useRef(announcementCanvas(config, image))
  const [, redraw] = useState(0), [linkOpen, setLinkOpen] = useState(false), [href, setHref] = useState(''), [error, setError] = useState('')
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading:false, bulletList:false, orderedList:false, listItem:false, blockquote:false, code:false, codeBlock:false, horizontalRule:false, strike:false, link:false, underline:false }), Underline, Link.configure({ openOnClick:false, autolink:false, protocols:['https','http','mailto','tel'] }), AnnouncementImage],
    content: initial.current,
    onCreate: ({ editor }) => { if (!readAnnouncement(value).canvas) onChange(writeAnnouncement({ ...readAnnouncement(value), canvas:true, html: editor.getHTML() })) },
    onUpdate: ({ editor }) => { let found=false; editor.state.doc.descendants(node=>{if(node.type.name==='image')found=true}); if(hadImage.current&&!found)onImageChange('');hadImage.current=found;onChange(writeAnnouncement({ ...readAnnouncement(value), canvas:true, html:editor.getHTML() })) },
    onSelectionUpdate: () => redraw(n=>n+1),
    onTransaction: () => redraw(n=>n+1),
    editorProps: { transformPastedHTML:html=>html.replace(/<img\b[^>]*>/gi,''), attributes:{ role:'textbox', 'aria-label':'Announcement text', 'aria-multiline':'true', style:"min-height:150px;padding:12px;outline:none;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;" }, handleDrop:(_,event)=>{if(event.dataTransfer?.files?.length){event.preventDefault();return true}return false}, handlePaste:(_,event)=>{if([...event.clipboardData?.items||[]].some(i=>i.kind==='file')){event.preventDefault();return true}return false} },
  })
  useEffect(()=>{
    if (!editor) return
    let existing
    editor.state.doc.descendants((node,pos)=>{if(node.type.name==='image')existing={node,pos}})
    if (image) {
      if (existing && existing.node.attrs.src!==image) editor.chain().setNodeSelection(existing.pos).updateAttributes('image',{src:image}).run()
      else if (!existing) editor.chain().focus().insertContentAt(editor.state.selection.to,{type:'image',attrs:{src:image,alt:'Announcement image'}}).run()
      hadImage.current=true
    } else if (existing) editor.commands.deleteRange({from:existing.pos,to:existing.pos+existing.node.nodeSize})
  },[editor,image])
  useEffect(()=>{if(editor && editor.getHTML()!==config.html && config.canvas && !editor.isFocused) editor.commands.setContent(config.html,{emitUpdate:false})},[editor,value])
  const button = { border:'1px solid #e5e0e2', borderRadius:4, padding:'5px 9px', font:'inherit', cursor:'pointer' }
  function applyLink() { const safe=campaignLinkUrl(href); if(href.trim()&&!safe){setError('Enter a valid website, email or telephone link.');return} const chain=editor.chain().focus().extendMarkRange('link');if(safe)chain.setLink({href:safe}).run();else chain.unsetLink().run();setLinkOpen(false);setError('') }
  return <div>
    <div style={{border:'1px solid #e0e0e0',borderRadius:6,overflow:'hidden',background:'#fff'}}>
      <div role="toolbar" aria-label="Announcement text formatting" style={{display:'flex',gap:5,padding:8,background:'#fafafa',borderBottom:'1px solid #eee',flexWrap:'wrap'}}>
        {[['Bold','bold','toggleBold'],['Italic','italic','toggleItalic'],['Underline','underline','toggleUnderline']].map(([name,mark,command])=><button key={mark} type="button" disabled={!editor} aria-label={name} title={name} aria-pressed={editor?.isActive(mark)||false} onMouseDown={e=>e.preventDefault()} onClick={()=>editor.chain().focus()[command]().run()} style={{...button,background:editor?.isActive(mark)?'#fceaf0':'#fff',fontWeight:mark==='bold'?700:400,fontStyle:mark==='italic'?'italic':'normal',textDecoration:mark==='underline'?'underline':'none'}}>{name[0]}</button>)}
        <button type="button" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>{setHref(editor.getAttributes('link').href||'');setLinkOpen(!linkOpen);setError('')}} aria-label="Link" title="Insert or edit link" style={{...button,background:'#fff'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></svg></button>
        <button type="button" aria-label="Insert announcement image" title="Insert or change image" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>{setImageOpen(!imageOpen);editor.state.doc.descendants((node,pos)=>{if(node.type.name==='image')editor.commands.setNodeSelection(pos)})}} style={{...button,background:'#fff'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg></button>
      </div>
      {linkOpen&&<div role="group" aria-label="Edit announcement link" style={{padding:8,display:'flex',gap:6,flexWrap:'wrap'}}><input aria-label="Text link URL" value={href} onChange={e=>setHref(e.target.value)} placeholder="https://…" style={{flex:1,minWidth:140,padding:7}}/><button type="button" onClick={applyLink}>Apply link</button><button type="button" onClick={()=>{editor.chain().focus().extendMarkRange('link').unsetLink().run();setLinkOpen(false)}}>Remove link</button>{error&&<span role="alert">{error}</span>}</div>}
      {imageOpen&&<div role="group" aria-label="Choose announcement image" style={{padding:12,borderBottom:'1px solid #eee'}}>{imagePicker || <label>Image URL<input aria-label="Announcement image URL" value={image} onChange={e=>onImageChange(e.target.value)} style={{width:'100%',padding:8,boxSizing:'border-box'}}/></label>}<button type="button" onClick={()=>{setImageOpen(false);editor?.commands.focus()}} style={{...button,marginTop:8}}>Done</button></div>}
      <EditorContent editor={editor}/><div style={{clear:'both'}}/>
    </div>
    <div style={{fontSize:12,color:'#888',marginTop:5}}>Use the image icon to insert an image at the cursor. Select the image to choose full width or left/right wrapping, or drag it between paragraphs. Email-client wrapping may vary.</div>
  </div>
}

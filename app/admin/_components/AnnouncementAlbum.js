'use client'
import { useState } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { AlbumBlock, AlbumLayoutPreview, AlbumInsertModal } from '../articles/_components/AlbumBlockExtension'
export const NEWSLETTER_ALBUM_LAYOUTS = ['grid-2','grid-3','masonry']
const labels = {'grid-2':'2 columns','grid-3':'3 columns',masonry:'Masonry'}
function AlbumView({node,selected,updateAttributes,deleteNode}) {
  const [editing,setEditing]=useState(false)
  let images=[];try{images=JSON.parse(node.attrs.images||'[]')}catch{}
  if(!Array.isArray(images))images=[]
  const layout=NEWSLETTER_ALBUM_LAYOUTS.includes(node.attrs.layout)?node.attrs.layout:'grid-2'
  const button={border:'1px solid #e5e0e2',borderRadius:20,padding:'5px 11px',font:'inherit',fontSize:12,cursor:'pointer',background:'#fff',color:'#8b344a'}
  return <NodeViewWrapper data-announcement-album="" style={{clear:'both',border:`2px ${selected?'solid #f2b8c6':'dashed #e0e0e0'}`,borderRadius:8,padding:12,margin:'14px 0',background:'#fafafa'}}>
    <div contentEditable={false}>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:10,fontSize:12,color:'#888'}}><span>Album · {images.length} images</span><div style={{display:'flex',gap:6}}><button type="button" onClick={()=>setEditing(true)} style={button}>Edit album</button><button type="button" aria-label="Remove announcement album" onClick={deleteNode} style={button}>×</button></div></div>
      <AlbumLayoutPreview layout={layout} images={images}/>
      <div role="group" aria-label="Album layout" style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>{NEWSLETTER_ALBUM_LAYOUTS.map(key=><button key={key} type="button" aria-pressed={layout===key} onClick={()=>updateAttributes({layout:key})} style={{...button,background:layout===key?'#f2b8c6':'#fff'}}>{labels[key]}</button>)}</div>
    </div>
    {editing&&<AlbumInsertModal mode="edit" initialLayout={layout} initialImages={images} allowedLayouts={NEWSLETTER_ALBUM_LAYOUTS} onClose={()=>setEditing(false)} onInsert={data=>{updateAttributes({layout:data.layout,images:JSON.stringify(data.images)});setEditing(false)}}/>}
  </NodeViewWrapper>
}
export const AnnouncementAlbum = AlbumBlock.extend({addNodeView(){return ReactNodeViewRenderer(AlbumView)}})

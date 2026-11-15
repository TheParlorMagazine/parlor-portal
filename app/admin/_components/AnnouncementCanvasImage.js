'use client'
import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
function CanvasImage({ node, selected, updateAttributes, deleteNode, editor, getPos }) {
  const align = node.attrs.align
  return <NodeViewWrapper data-announcement-canvas-image="" style={{ position:'relative', float:align==='full'?'none':align, width:align==='full'?'100%':140, maxWidth:align==='full'?'100%':'40%', margin:align==='left'?'0 16px 12px 0':align==='right'?'0 0 12px 16px':'0 0 12px', outline:selected?'2px solid #f2b8c6':'none', borderRadius:5 }}>
    {selected&&<div role="toolbar" aria-label="Announcement image placement" contentEditable={false} onMouseDown={e=>e.preventDefault()} style={{display:'flex',gap:4,flexWrap:'wrap',padding:5,background:'#333',borderRadius:6,position:'relative',zIndex:2}}>
      {[['full','Full width'],['left','Wrap left'],['right','Wrap right']].map(([value,label])=><button key={value} type="button" aria-label={label} title={label} aria-pressed={align===value} onClick={()=>updateAttributes({align:value})} style={{border:0,padding:5,borderRadius:4,color:'#fff',background:align===value?'#8b5564':'transparent',cursor:'pointer'}}><svg width="20" height="18" viewBox="0 0 24 20" aria-hidden="true"><rect x={value==='right'?14:2} y="2" width={value==='full'?20:8} height="7" fill="currentColor"/>{[12,16].map(y=><path key={y} d={`M2 ${y}h20`} stroke="currentColor" strokeWidth="2"/>)}{value!=='full'&&<path d={value==='left'?'M13 3h9m-9 4h9':'M2 3h9M2 7h9'} stroke="currentColor" strokeWidth="2"/>}</svg></button>)}
      <button type="button" aria-label="Remove announcement image" title="Remove image" onClick={deleteNode} style={{border:0,background:'transparent',color:'#fff',cursor:'pointer'}}>×</button>
    </div>}
    <img src={node.attrs.src} alt={node.attrs.alt||'Announcement image'} draggable="true" data-drag-handle="" onClick={()=>editor.commands.setNodeSelection(getPos())} style={{display:'block',width:'100%',height:'auto',minHeight:40,borderRadius:5,cursor:'pointer'}} />
  </NodeViewWrapper>
}
export const AnnouncementImage = Image.extend({
  addAttributes() { return { ...this.parent?.(), owned:{default:false,parseHTML:el=>el.getAttribute('data-announcement-owned')==='1',renderHTML:attrs=>attrs.owned?{'data-announcement-owned':'1'}:{}}, align:{default:'full',parseHTML:el=>['left','right'].includes(el.getAttribute('data-align'))?el.getAttribute('data-align'):'full',renderHTML:attrs=>({'data-align':attrs.align,'data-announcement-image':'1'})} } },
  parseHTML() { return [{tag:'img[data-announcement-image="1"]'}] },
  addNodeView() { return ReactNodeViewRenderer(CanvasImage) },
})

'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

function EmbedBlockView({ node, updateAttributes, selected }) {
  const { html } = node.attrs

  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{
        border: `1px solid ${selected ? '#f2b8c6' : '#e8e8e8'}`,
        borderRadius: '10px', overflow: 'hidden', margin: '1.2em 0',
        background: '#fafafa', fontFamily: "'Source Serif 4', Georgia, serif",
        transition: 'border-color 0.15s',
      }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ccc' }}>Embed</span>
        </div>
        <textarea
          value={html}
          onChange={e => updateAttributes({ html: e.target.value })}
          placeholder="Paste iframe or HTML embed code…"
          rows={5}
          style={{
            display: 'block', width: '100%', border: 'none', outline: 'none',
            background: 'transparent', fontSize: '12px', fontFamily: 'monospace',
            color: '#555', padding: '12px 16px', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        {html.trim() && (
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ccc', marginBottom: '8px' }}>Preview</div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const EmbedBlock = Node.create({
  name: 'embedBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      html: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'embed-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedBlockView)
  },

  addCommands() {
    return {
      insertEmbedBlock: () => ({ commands }) =>
        commands.insertContent({ type: 'embedBlock', attrs: { html: '' } }),
    }
  },
})

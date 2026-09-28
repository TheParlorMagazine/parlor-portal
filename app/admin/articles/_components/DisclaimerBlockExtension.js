'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { DISCLAIMER_TEXT, HOW_MEMBER_POSTS_WORK_HREF } from '../../../../lib/memberPosts'

// The member-post disclaimer, rendered as a distinct, recognizable notice block.
// Text lives in a data-text attribute so it round-trips in the HTML body and is
// detectable programmatically (publish gating checks for data-type="disclaimer-block").
function DisclaimerBlockView({ node }) {
  const text = node.attrs.text || DISCLAIMER_TEXT
  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{
        margin: '1.2em 0', border: '1px solid #e8d4d8', borderLeft: '3px solid #c4364a',
        background: '#fbeef1', borderRadius: '8px', padding: '14px 18px',
        fontFamily: "'Source Serif 4', Georgia, serif",
      }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4364a', fontWeight: 700, marginBottom: '6px' }}>
          Member post
        </div>
        <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#5a3a40' }}>
          {text}{' '}
          <a href={HOW_MEMBER_POSTS_WORK_HREF} style={{ color: '#c4364a', textDecoration: 'underline' }}>How member posts work →</a>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const DisclaimerBlock = Node.create({
  name: 'disclaimerBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: {
        default: DISCLAIMER_TEXT,
        parseHTML: el => el.getAttribute('data-text') || DISCLAIMER_TEXT,
        renderHTML: attrs => ({ 'data-text': attrs.text || DISCLAIMER_TEXT }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="disclaimer-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'disclaimer-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DisclaimerBlockView)
  },

  addCommands() {
    return {
      // Insert (or re-insert) the disclaimer at the very top of the document.
      insertDisclaimerBlock: () => ({ chain, state }) =>
        chain().insertContentAt(0, { type: 'disclaimerBlock', attrs: { text: DISCLAIMER_TEXT } }).run(),
    }
  },
})

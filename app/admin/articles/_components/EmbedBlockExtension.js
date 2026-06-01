'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

// ── URL → embed converter ─────────────────────────────────────
function urlToEmbed(raw) {
  const url = raw.trim()
  let u
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.replace(/^www\./, '')

  // YouTube
  if (host === 'youtube.com' || host === 'youtu.be') {
    let id = null
    if (host === 'youtu.be') {
      id = u.pathname.slice(1).split(/[/?]/)[0]
    } else if (u.searchParams.get('v')) {
      id = u.searchParams.get('v')
    } else if (u.pathname.startsWith('/embed/')) {
      id = u.pathname.split('/embed/')[1]?.split('/')[0]
    } else if (u.pathname.startsWith('/shorts/')) {
      id = u.pathname.split('/shorts/')[1]?.split('/')[0]
    }
    if (id) {
      const t = u.searchParams.get('t') || u.searchParams.get('start') || ''
      const ts = t ? `?start=${t.replace(/s$/, '')}` : ''
      return `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}${ts}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    }
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).find(p => /^\d+$/.test(p))
    if (id) return `<iframe src="https://player.vimeo.com/video/${id}" width="100%" height="400" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
  }

  // Spotify
  if (host === 'open.spotify.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      const [type, id] = parts
      const h = (type === 'playlist' || type === 'album' || type === 'show') ? 380 : 152
      return `<iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="${h}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`
    }
  }

  // SoundCloud
  if (host === 'soundcloud.com') {
    return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23f2b8c6&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false"></iframe>`
  }

  // Twitter / X
  if (host === 'twitter.com' || host === 'x.com') {
    return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`
  }

  // Instagram
  if (host === 'instagram.com') {
    const m = u.pathname.match(/\/(p|reel)\/([^/]+)/)
    if (m) return `<iframe src="https://www.instagram.com/${m[1]}/${m[2]}/embed/" width="100%" height="600" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
  }

  // TikTok
  if (host === 'tiktok.com') {
    const m = u.pathname.match(/\/video\/(\d+)/)
    if (m) return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${m[1]}"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`
  }

  // GitHub Pages (*.github.io) or any other URL → generic iframe
  return `<iframe src="${url}" width="100%" height="500" frameborder="0"></iframe>`
}

function isPlainUrl(val) {
  const v = val.trim()
  return (v.startsWith('http://') || v.startsWith('https://')) && !v.includes('<')
}

// ── NodeView ──────────────────────────────────────────────────
function EmbedBlockView({ node, updateAttributes, selected }) {
  const { html } = node.attrs

  function handleBlur(e) {
    const val = e.target.value.trim()
    if (!val || !isPlainUrl(val)) return
    const embed = urlToEmbed(val)
    if (embed) updateAttributes({ html: embed })
  }

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
          onBlur={handleBlur}
          placeholder="Paste a URL (YouTube, Spotify, Twitter/X, Instagram, Vimeo, SoundCloud, TikTok…) or an iframe / HTML embed code"
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

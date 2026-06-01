'use client'

export default function PreviewBanner() {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#ffd6e0', borderBottom: '1px solid #f2b8c6',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', color: '#9c3a52',
    }}>
      <span>Preview — this article may not be published yet</span>
      <button
        onClick={() => window.parent.postMessage('close-preview', '*')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9c3a52', fontSize: '20px', lineHeight: 1,
          padding: '0 0 0 16px',
        }}
        aria-label="Close preview"
      >
        ×
      </button>
    </div>
  )
}

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -600px 0 }
    100% { background-position: 600px 0 }
  }
  .sk {
    background: linear-gradient(90deg, #f0ebe6 25%, #e8e0d8 50%, #f0ebe6 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 4px;
  }
`

function Sk({ w = '100%', h = '16px', style = {} }) {
  return (
    <div
      className="sk"
      style={{ width: w, height: h, ...style }}
    />
  )
}

export default function ArticleLoading() {
  return (
    <>
      <style>{shimmer}</style>

      {/* Nav */}
      <header style={{ borderBottom: '1px solid #f0e8e0', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '900px', margin: '0 auto' }}>
        <Sk w="100px" h="22px" />
        <Sk w="80px" h="14px" />
      </header>

      <main style={{ background: '#fff', minHeight: '100vh' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 24px 0' }}>
          {/* Category */}
          <Sk w="80px" h="11px" style={{ marginBottom: '18px' }} />
          {/* Title */}
          <Sk w="90%" h="44px" style={{ marginBottom: '12px', borderRadius: '6px' }} />
          <Sk w="70%" h="44px" style={{ marginBottom: '24px', borderRadius: '6px' }} />
          {/* Subtitle */}
          <Sk w="100%" h="20px" style={{ marginBottom: '8px' }} />
          <Sk w="85%" h="20px" style={{ marginBottom: '32px' }} />
          {/* Byline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <Sk w="36px" h="36px" style={{ borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Sk w="120px" h="14px" style={{ marginBottom: '6px' }} />
              <Sk w="80px" h="12px" />
            </div>
          </div>
        </div>

        {/* Cover image */}
        <div style={{ maxWidth: '900px', margin: '0 auto 48px', padding: '0 24px' }}>
          <Sk w="100%" h="0" style={{ paddingBottom: '56.25%', borderRadius: '4px' }} />
        </div>

        {/* Body */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>
          {[100, 92, 97, 85, 100, 78, 95].map((w, i) => (
            <Sk key={i} w={`${w}%`} h="18px" style={{ marginBottom: '14px' }} />
          ))}
          <div style={{ height: '12px' }} />
          {[88, 100, 93, 70].map((w, i) => (
            <Sk key={i} w={`${w}%`} h="18px" style={{ marginBottom: '14px' }} />
          ))}
        </div>
      </main>
    </>
  )
}

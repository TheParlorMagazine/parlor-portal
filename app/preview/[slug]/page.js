import { existsSync } from 'fs'
import path from 'path'

export default async function PreviewPage({ params }) {
  const { slug } = await params

  const customPath = path.join(process.cwd(), 'app', 'post', '_custom', `${slug}.jsx`)

  if (!existsSync(customPath)) {
    return (
      <div style={{ padding: '48px', fontFamily: 'Georgia, serif', color: '#888', fontSize: '15px' }}>
        No custom component found for <code>{slug}</code>.{' '}
        Save the article in the editor first to write the file, then reload this page.
      </div>
    )
  }

  try {
    const mod = await import(/* webpackIgnore: true */ `../../post/_custom/${slug}.jsx`)
    const CustomComponent = mod.default
    if (CustomComponent) return <CustomComponent />
  } catch {
    // fall through
  }

  return (
    <div style={{ padding: '48px', fontFamily: 'Georgia, serif', color: '#888', fontSize: '15px' }}>
      Failed to load component for <code>{slug}</code>. Check the file for syntax errors.
    </div>
  )
}

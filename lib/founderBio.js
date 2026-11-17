import { parseDocument } from 'htmlparser2'
import { serviceClient } from './apiAuth'

// Render the existing writer biography as readable text, not executable CMS HTML.
export function biographyParagraphs(value) {
  if (typeof value !== 'string' || !value.trim()) return []
  const blocks = new Set(['p', 'div', 'section', 'article', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote'])
  function text(node) {
    if (node.type === 'text') return node.data
    if (['script', 'style', 'iframe', 'object', 'template'].includes(node.name)) return ''
    if (node.name === 'br') return '\n'
    const body = (node.children || []).map(text).join('')
    return blocks.has(node.name) ? `\n${body}\n` : body
  }
  return text(parseDocument(value)).split(/\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

export async function getFounderBiography(founder, db) {
  if (founder.biography?.length) return founder.biography
  if (founder.writerSlug) {
    try {
      const { data, error } = await (db || serviceClient()).from('writers').select('bio')
        .eq('slug', founder.writerSlug).limit(1).abortSignal(AbortSignal.timeout(3000))
      if (!error) {
        const paragraphs = biographyParagraphs(data?.[0]?.bio)
        if (paragraphs.length) return paragraphs
      }
    } catch { /* Keep the confirmed name and role available if the CMS is unreachable. */ }
  }
  return [founder.introduction]
}

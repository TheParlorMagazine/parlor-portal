import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request) {
  const { slug, code } = await request.json()

  if (!slug || code == null) {
    return NextResponse.json({ error: 'slug and code required' }, { status: 400 })
  }

  const safeSlug = slug.replace(/[^a-z0-9-]/g, '')
  if (!safeSlug) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'app', 'post', '_custom', `${safeSlug}.jsx`)
  await fs.writeFile(filePath, code, 'utf8')

  return NextResponse.json({ ok: true })
}

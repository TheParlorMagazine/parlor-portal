'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import ArticleEditor from '../../_components/ArticleEditor'


export default function EditArticlePage() {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('role')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (memberError) {
        console.error('Admin check — member query error:', memberError)
        router.push('/dashboard')
        return
      }

      const isAdmin = member?.role === 'admin'
      if (!isAdmin) {
        console.error('Admin check — role is not admin:', member?.role)
        router.push('/dashboard')
        return
      }

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (cancelled) return
      if (error || !data) { router.push('/admin/articles'); return }

      setArticle(data)
      setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#444', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '14px',
    }}>
      Loading…
    </div>
  )

  return <ArticleEditor initialData={article} articleId={params.id} />
}

'use client'

import { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  'Society & Culture',
  'World & Politics',
  'Work & Wealth',
  'Perspectives & Identity',
]

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const defaults = {
  title: '', slug: '', subtitle: '', excerpt: '',
  cover_image_url: '',
  author_name: '', author_photo_url: '', author_profile_url: '', author_bio: '',
  category: '', section: '', tags: '',
  issue_number: '', issue_section: '',
  body: '',
  audio_url: '', audio_title: '', audio_duration: '',
  video_url: '', video_type: '',
  has_audio: false, has_video: false,
  transcript: '',
  featured: false, published: false,
  meta_title: '', meta_description: '',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '7px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: "'Source Serif 4', Georgia, serif",
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
}

const labelStyle = {
  display: 'block',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#666',
  marginBottom: '6px',
}

const sectionTitleStyle = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '15px',
  color: '#f2b8c6',
  marginBottom: '20px',
  paddingBottom: '10px',
  borderBottom: '1px solid rgba(242,184,198,0.15)',
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '38px', height: '22px', borderRadius: '11px',
        border: 'none', cursor: 'pointer',
        background: checked ? '#f2b8c6' : '#2a2a2a',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: checked ? '19px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#0a0a0a' : '#555',
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  )
}

export default function ArticleForm({
  initialData,
  onSaveDraft,
  onPublish,
  onSave,
  onDelete,
  isSubmitting,
  submitError,
}) {
  const [form, setForm] = useState({ ...defaults, ...initialData })
  const slugTouched = useRef(false)
  const isEdit = !!(initialData?.id)

  useEffect(() => {
    if (!slugTouched.current) {
      setForm(prev => ({ ...prev, slug: slugify(prev.title) }))
    }
  }, [form.title])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  function handleSlugChange(e) {
    slugTouched.current = true
    update('slug', e.target.value)
  }

  function buildData(overrides = {}) {
    return {
      ...form,
      ...overrides,
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (form.tags || []),
      issue_number: form.issue_number ? parseInt(form.issue_number, 10) : null,
    }
  }

  return (
    <div>
      {submitError && (
        <div style={{
          background: 'rgba(224,112,112,0.1)',
          border: '1px solid rgba(224,112,112,0.3)',
          color: '#e07070',
          padding: '12px 16px',
          borderRadius: '7px',
          marginBottom: '24px',
          fontSize: '13px',
        }}>
          {submitError}
        </div>
      )}

      {/* Basic Info */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Basic Info</div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="Article title"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="auto-generated-from-title"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Subtitle</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={e => update('subtitle', e.target.value)}
              placeholder="Optional subtitle"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={e => update('excerpt', e.target.value)}
            placeholder="Short summary for previews"
            style={{ ...textareaStyle, minHeight: '80px' }}
          />
        </div>
      </section>

      {/* Cover Image */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Cover Image</div>
        <div>
          <label style={labelStyle}>Cover Image URL</label>
          <input
            type="text"
            value={form.cover_image_url}
            onChange={e => update('cover_image_url', e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
        {form.cover_image_url && (
          <div style={{ marginTop: '12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', maxWidth: '360px' }}>
            <img
              src={form.cover_image_url}
              alt="Cover preview"
              style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
        )}
      </section>

      {/* Author */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Author</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Author Name</label>
            <input
              type="text"
              value={form.author_name}
              onChange={e => update('author_name', e.target.value)}
              placeholder="Full name"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Author Profile URL</label>
            <input
              type="text"
              value={form.author_profile_url}
              onChange={e => update('author_profile_url', e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Author Photo URL</label>
          <input
            type="text"
            value={form.author_photo_url}
            onChange={e => update('author_photo_url', e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Author Bio</label>
          <textarea
            value={form.author_bio}
            onChange={e => update('author_bio', e.target.value)}
            placeholder="Short bio"
            style={{ ...textareaStyle, minHeight: '80px' }}
          />
        </div>
      </section>

      {/* Classification */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Classification</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Section</label>
            <input
              type="text"
              value={form.section}
              onChange={e => update('section', e.target.value)}
              placeholder="e.g. Feature"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => update('tags', e.target.value)}
              placeholder="comma, separated, tags"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Issue Number</label>
            <input
              type="number"
              value={form.issue_number}
              onChange={e => update('issue_number', e.target.value)}
              placeholder="e.g. 12"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Issue Section</label>
            <input
              type="text"
              value={form.issue_section}
              onChange={e => update('issue_section', e.target.value)}
              placeholder="e.g. Opening"
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Content</div>
        <label style={labelStyle}>Body</label>
        <textarea
          value={form.body}
          onChange={e => update('body', e.target.value)}
          placeholder="Article body text..."
          style={{ ...textareaStyle, minHeight: '360px' }}
        />
      </section>

      {/* Audio */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Audio</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: form.has_audio ? '20px' : '0' }}>
          <Toggle checked={form.has_audio} onChange={v => update('has_audio', v)} />
          <span style={{ fontSize: '13px', color: form.has_audio ? '#f2b8c6' : '#666' }}>Has audio</span>
        </div>
        {form.has_audio && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Audio URL</label>
              <input
                type="text"
                value={form.audio_url}
                onChange={e => update('audio_url', e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Audio Title</label>
              <input
                type="text"
                value={form.audio_title}
                onChange={e => update('audio_title', e.target.value)}
                placeholder="Episode title"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration</label>
              <input
                type="text"
                value={form.audio_duration}
                onChange={e => update('audio_duration', e.target.value)}
                placeholder="e.g. 42:30"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </section>

      {/* Video */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Video</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: form.has_video ? '20px' : '0' }}>
          <Toggle checked={form.has_video} onChange={v => update('has_video', v)} />
          <span style={{ fontSize: '13px', color: form.has_video ? '#f2b8c6' : '#666' }}>Has video</span>
        </div>
        {form.has_video && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Video URL</label>
              <input
                type="text"
                value={form.video_url}
                onChange={e => update('video_url', e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Video Type</label>
              <input
                type="text"
                value={form.video_type}
                onChange={e => update('video_type', e.target.value)}
                placeholder="e.g. youtube, vimeo"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </section>

      {/* Transcript */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Transcript</div>
        <textarea
          value={form.transcript}
          onChange={e => update('transcript', e.target.value)}
          placeholder="Full transcript..."
          style={{ ...textareaStyle, minHeight: '160px' }}
        />
      </section>

      {/* Settings */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>Settings</div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle checked={form.featured} onChange={v => update('featured', v)} />
            <span style={{ fontSize: '13px', color: form.featured ? '#f2b8c6' : '#666' }}>Featured</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle checked={form.published} onChange={v => update('published', v)} />
            <span style={{ fontSize: '13px', color: form.published ? '#f2b8c6' : '#666' }}>Published</span>
          </div>
        </div>
      </section>

      {/* SEO */}
      <section style={{ marginBottom: '40px' }}>
        <div style={sectionTitleStyle}>SEO</div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Meta Title</label>
          <input
            type="text"
            value={form.meta_title}
            onChange={e => update('meta_title', e.target.value)}
            placeholder="Override page title for search"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Meta Description</label>
          <textarea
            value={form.meta_description}
            onChange={e => update('meta_description', e.target.value)}
            placeholder="Description for search engines"
            style={{ ...textareaStyle, minHeight: '80px' }}
          />
        </div>
      </section>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isEdit ? (
            <button
              onClick={() => onSave && onSave(buildData())}
              disabled={isSubmitting}
              style={{
                background: '#f2b8c6', color: '#0a0a0a', border: 'none',
                padding: '11px 28px', borderRadius: '7px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '13px', fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <>
              <button
                onClick={() => onSaveDraft && onSaveDraft(buildData({ published: false }))}
                disabled={isSubmitting}
                style={{
                  background: 'none',
                  border: '1px solid rgba(242,184,198,0.3)',
                  color: '#f2b8c6',
                  padding: '11px 24px', borderRadius: '7px',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '13px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => onPublish && onPublish(buildData({ published: true }))}
                disabled={isSubmitting}
                style={{
                  background: '#f2b8c6', color: '#0a0a0a', border: 'none',
                  padding: '11px 28px', borderRadius: '7px',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '13px', fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </>
          )}
        </div>

        {isEdit && onDelete && (
          <button
            onClick={() => onDelete()}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: '1px solid rgba(224,112,112,0.25)',
              color: '#e07070',
              padding: '11px 20px', borderRadius: '7px',
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '13px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Delete Article
          </button>
        )}
      </div>
    </div>
  )
}

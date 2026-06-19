'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const FONTS = [
  { label: 'Playfair Display',   value: 'Playfair Display' },
  { label: 'Source Serif 4',     value: 'Source Serif 4' },
  { label: 'Alex Brush',         value: 'Alex Brush' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
  { label: 'Bodoni Moda',        value: 'Bodoni Moda' },
  { label: 'DM Serif Display',   value: 'DM Serif Display' },
  { label: 'IM Fell English',    value: 'IM Fell English' },
  { label: 'Libre Baskerville',  value: 'Libre Baskerville' },
  { label: 'Lora',               value: 'Lora' },
  { label: 'Merriweather',       value: 'Merriweather' },
  { label: 'Cinzel',             value: 'Cinzel' },
  { label: 'Abril Fatface',      value: 'Abril Fatface' },
  { label: 'Pacifico',           value: 'Pacifico' },
  { label: 'Dancing Script',     value: 'Dancing Script' },
  { label: 'Great Vibes',        value: 'Great Vibes' },
  { label: 'Arial',              value: 'Arial' },
  { label: 'Georgia',            value: 'Georgia' },
  { label: 'Impact',             value: 'Impact' },
]

const CROP_PRESETS = [
  { label: 'Free', ratio: null },
  { label: '1:1',  ratio: 1 },
  { label: '4:3',  ratio: 4/3 },
  { label: '16:9', ratio: 16/9 },
  { label: '3:2',  ratio: 3/2 },
  { label: '9:16', ratio: 9/16 },
  { label: '2:3',  ratio: 2/3 },
]

const BTN = {
  padding: '6px 12px', border: 'none', borderRadius: '6px',
  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Source Serif 4', Georgia, serif", whiteSpace: 'nowrap',
}
const INPUT = {
  background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '5px', color: '#e0e0e0', fontSize: '12px', outline: 'none',
  padding: '5px 8px', fontFamily: "'Source Serif 4', Georgia, serif",
}

function loadGoogleFonts() {
  const families = FONTS.filter(f => !['Arial','Georgia','Impact'].includes(f.value))
    .map(f => f.value.replace(/ /g, '+')).join('&family=')
  if (!document.querySelector('link[href*="Cormorant"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'
    l.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
    document.head.appendChild(l)
  }
}

function dataURLtoBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function objLabel(obj) {
  if (!obj) return 'Object'
  if (obj.data?.role === 'main') return '🖼 Main Image'
  if (obj.data?.role === 'added-image') return '🖼 Image'
  if (obj.data?.role === 'cropRect') return '✂ Crop'
  const t = obj.type || ''
  if (t === 'i-text' || t === 'text') return `T "${(obj.text || '').slice(0,16)}"`
  if (t === 'rect') return '□ Rectangle'
  if (t === 'circle') return '○ Circle'
  if (t === 'triangle') return '△ Triangle'
  if (t === 'path') return '✏ Drawing'
  return t
}

export default function ImageEditor({ imageUrl, fileName, folder, supabase, onSave, onClose }) {
  const canvasElRef   = useRef(null)
  const canvasWrapRef = useRef(null)
  const fabricRef     = useRef(null)
  const imgObjRef     = useRef(null)
  const cropRectRef = useRef(null)
  const historyRef  = useRef([])
  const historyIdx  = useRef(-1)
  const layerDragIdx = useRef(null)

  const [mode, setMode]           = useState('select')
  const [ready, setReady]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [cropRatio, setCropRatio] = useState(null)
  const [activePanel, setActivePanel] = useState(null)

  // selected object state
  const [selectedObj, setSelectedObj] = useState(null)
  const [layers, setLayers]           = useState([])

  // filter values
  const [brightness, setBrightness] = useState(0)
  const [contrast,   setContrast]   = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [grayscale,  setGrayscale]  = useState(false)
  const [sepia,      setSepia]      = useState(false)
  const [blur,       setBlur]       = useState(0)

  // text defaults (for new text)
  const [textFont,   setTextFont]   = useState('Playfair Display')
  const [textSize,   setTextSize]   = useState(36)
  const [textColor,  setTextColor]  = useState('#ffffff')
  const [textBold,   setTextBold]   = useState(false)
  const [textItalic, setTextItalic] = useState(false)

  // draw options
  const [drawColor, setDrawColor] = useState('#f2b8c6')
  const [drawWidth, setDrawWidth] = useState(4)

  // media picker for adding images
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaFiles, setMediaFiles]           = useState([])
  const [mediaFolder, setMediaFolder]         = useState('body')
  const [mediaLoading, setMediaLoading]       = useState(false)

  // ── Layers sync ───────────────────────────────────────────────
  const syncLayers = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    setLayers([...fc.getObjects()].reverse())
  }, [])

  const isRestoringRef = useRef(false)

  // ── History ───────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    if (isRestoringRef.current) return
    const fc = fabricRef.current; if (!fc) return
    const json = fc.toJSON(['selectable','evented','data'])
    historyRef.current = historyRef.current.slice(0, historyIdx.current + 1)
    historyRef.current.push(json)
    historyIdx.current = historyRef.current.length - 1
    syncLayers()
  }, [syncLayers])

  async function restoreSnapshot(json) {
    const fc = fabricRef.current; if (!fc) return
    isRestoringRef.current = true
    await fc.loadFromJSON(json)
    fc.renderAll()
    imgObjRef.current = fc.getObjects().find(o => o.data?.role === 'main') || null
    isRestoringRef.current = false
    syncLayers()
  }

  const undo = () => {
    if (historyIdx.current <= 0) return
    historyIdx.current--
    restoreSnapshot(historyRef.current[historyIdx.current])
  }
  const redo = () => {
    if (historyIdx.current >= historyRef.current.length - 1) return
    historyIdx.current++
    restoreSnapshot(historyRef.current[historyIdx.current])
  }

  // ── Keyboard delete ───────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      const fc = fabricRef.current; if (!fc) return
      const obj = fc.getActiveObject()
      if (!obj || obj.data?.role === 'main' || obj.isEditing) return
      e.preventDefault()
      fc.remove(obj); fc.discardActiveObject(); fc.renderAll(); saveSnapshot()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveSnapshot])

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleFonts()
    let cancelled = false
    async function init() {
      const fabric = await import('fabric')
      if (cancelled || !canvasElRef.current || !canvasWrapRef.current) return
      // Wait until the wrapper has real dimensions (ResizeObserver fires after layout)
      const W = await new Promise(resolve => {
        const el = canvasWrapRef.current
        if (el.offsetWidth > 0) { resolve(el.offsetWidth); return }
        const ro = new ResizeObserver(() => { if (el.offsetWidth > 0) { ro.disconnect(); resolve(el.offsetWidth) } })
        ro.observe(el)
      })
      const H = canvasWrapRef.current.offsetHeight || 520
      if (cancelled) return
      const fc = new fabric.Canvas(canvasElRef.current, {
        width: W, height: H, backgroundColor: '#1a1a1a', preserveObjectStacking: true,
      })
      fabricRef.current = fc

      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      if (cancelled) return
      const scale = Math.min((W * 0.9) / img.width, (H * 0.9) / img.height, 1)
      img.set({ left: W/2, top: H/2, originX: 'center', originY: 'center',
        scaleX: scale, scaleY: scale, selectable: true, evented: true, data: { role: 'main' } })
      fc.add(img); imgObjRef.current = img
      fc.setActiveObject(img); fc.renderAll()
      saveSnapshot(); setReady(true)

      // Selection events
      const onSelect = (e) => {
        const obj = e.selected?.[0] || null
        setSelectedObj(obj)
        if (obj?.type === 'i-text' || obj?.type === 'text') {
          setTextFont(obj.fontFamily || 'Playfair Display')
          setTextSize(obj.fontSize || 36)
          setTextColor(obj.fill || '#ffffff')
          setTextBold(obj.fontWeight === 'bold')
          setTextItalic(obj.fontStyle === 'italic')
          setActivePanel('text')
        }
      }
      fc.on('selection:created', onSelect)
      fc.on('selection:updated', onSelect)
      fc.on('selection:cleared', () => setSelectedObj(null))
      fc.on('object:modified', saveSnapshot)
      fc.on('object:added', () => { if (!isRestoringRef.current) syncLayers() })
      fc.on('object:removed', () => { if (!isRestoringRef.current) syncLayers() })
      fc.on('path:created', saveSnapshot)
    }
    init()
    return () => { cancelled = true; try { fabricRef.current?.dispose() } catch {} }
  }, [imageUrl])

  // ── Mode switching ────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return
    if (mode === 'draw') {
      import('fabric').then(fabric => {
        fc.freeDrawingBrush = new fabric.PencilBrush(fc)
        fc.freeDrawingBrush.color = drawColor
        fc.freeDrawingBrush.width = drawWidth
        fc.isDrawingMode = true
      })
    } else {
      fc.isDrawingMode = false
    }
    if (mode !== 'crop') exitCrop()
  }, [mode])

  useEffect(() => {
    const fc = fabricRef.current; if (!fc?.freeDrawingBrush) return
    fc.freeDrawingBrush.color = drawColor
    fc.freeDrawingBrush.width = drawWidth
  }, [drawColor, drawWidth])

  // ── Apply text props to selected text object ──────────────────
  function applyTextProp(prop, value) {
    const fc = fabricRef.current
    const obj = fc?.getActiveObject()
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return
    obj.set(prop, value)
    fc.renderAll()
  }

  // ── Flip ──────────────────────────────────────────────────────
  function getTargetImg() {
    const fc = fabricRef.current; if (!fc) return null
    const active = fc.getActiveObject()
    return (active?.type === 'image' ? active : null) || imgObjRef.current
  }
  function flipH() { const img = getTargetImg(); if (!img) return; img.set('flipX', !img.flipX); fabricRef.current?.renderAll(); saveSnapshot() }
  function flipV() { const img = getTargetImg(); if (!img) return; img.set('flipY', !img.flipY); fabricRef.current?.renderAll(); saveSnapshot() }

  // ── Rotate ────────────────────────────────────────────────────
  function rotateBy(deg) { const img = getTargetImg(); if (!img) return; img.rotate((img.angle||0)+deg); fabricRef.current?.renderAll(); saveSnapshot() }
  function setAngle(deg) { const img = getTargetImg(); if (!img) return; img.rotate(deg); fabricRef.current?.renderAll() }

  // ── Filters ───────────────────────────────────────────────────
  async function applyFilters(overrides = {}) {
    const fc = fabricRef.current; if (!fc) return
    const active = fc.getActiveObject()
    const img = (active?.type === 'image' ? active : null) || imgObjRef.current
    if (!img) return
    const fabric = await import('fabric')
    const b  = overrides.brightness ?? brightness
    const c  = overrides.contrast   ?? contrast
    const sa = overrides.saturation ?? saturation
    const gr = overrides.grayscale  ?? grayscale
    const se = overrides.sepia      ?? sepia
    const bl = overrides.blur       ?? blur
    const filters = []
    if (b  !== 0) filters.push(new fabric.filters.Brightness({ brightness: b/100 }))
    if (c  !== 0) filters.push(new fabric.filters.Contrast({   contrast:   c/100 }))
    if (sa !== 0) filters.push(new fabric.filters.Saturation({ saturation: sa/100 }))
    if (gr)       filters.push(new fabric.filters.Grayscale())
    if (se)       filters.push(new fabric.filters.Sepia())
    if (bl > 0)   filters.push(new fabric.filters.Blur({ blur: bl/100 }))
    img.filters = filters; img.applyFilters(); fabricRef.current?.renderAll()
  }

  // ── Crop ──────────────────────────────────────────────────────
  async function startCrop(ratio) {
    const fc = fabricRef.current; const img = imgObjRef.current; if (!fc || !img) return
    const fabric = await import('fabric')
    exitCrop(); setCropRatio(ratio)
    const b = img.getBoundingRect()
    let rw = b.width * 0.7, rh = b.height * 0.7
    if (ratio) rh = rw / ratio
    const rect = new fabric.Rect({
      left: b.left + b.width/2 - rw/2, top: b.top + b.height/2 - rh/2,
      width: rw, height: rh, fill: 'rgba(0,0,0,0.45)',
      stroke: '#f2b8c6', strokeWidth: 2, strokeDashArray: [6,4],
      selectable: true, evented: true, hasRotatingPoint: false, lockRotation: true,
      data: { role: 'cropRect' },
    })
    if (ratio) rect.setControlsVisibility({ mb:false, mt:false, ml:false, mr:false })
    fc.add(rect); fc.setActiveObject(rect); cropRectRef.current = rect; fc.renderAll()
  }

  function exitCrop() {
    const fc = fabricRef.current; if (!fc || !cropRectRef.current) return
    fc.remove(cropRectRef.current); cropRectRef.current = null; fc.renderAll()
  }

  async function applyCrop() {
    const fc = fabricRef.current; const img = imgObjRef.current; const rect = cropRectRef.current
    if (!fc || !img || !rect) return
    const fabric = await import('fabric')

    // ── High-quality crop directly from the original image element ──
    // Map the crop rect (canvas coordinates) back to the image's natural pixel space
    const rectB = rect.getBoundingRect()
    const zoom  = fc.getZoom()

    // Image top-left in canvas coords (originX/Y = center)
    const imgCanvasLeft = img.left - (img.getScaledWidth()  * zoom) / 2
    const imgCanvasTop  = img.top  - (img.getScaledHeight() * zoom) / 2

    // Crop rect position relative to image top-left in canvas coords
    const relX = rectB.left - imgCanvasLeft
    const relY = rectB.top  - imgCanvasTop

    // Convert to natural image pixels (undo display scale)
    const dispScaleX = img.scaleX * zoom
    const dispScaleY = img.scaleY * zoom
    const srcX = Math.max(0, Math.round(relX / dispScaleX))
    const srcY = Math.max(0, Math.round(relY / dispScaleY))
    const srcW = Math.round(rectB.width  / dispScaleX)
    const srcH = Math.round(rectB.height / dispScaleY)

    // Draw from the original full-resolution image element
    const origEl = img.getElement()
    const tmp = document.createElement('canvas')
    tmp.width  = srcW
    tmp.height = srcH
    const ctx = tmp.getContext('2d')

    // Handle flip transforms
    ctx.save()
    if (img.flipX || img.flipY) {
      ctx.translate(img.flipX ? srcW : 0, img.flipY ? srcH : 0)
      ctx.scale(img.flipX ? -1 : 1, img.flipY ? -1 : 1)
    }
    ctx.drawImage(origEl, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)
    ctx.restore()

    const dataUrl = tmp.toDataURL('image/png')
    exitCrop()

    const newImg = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' })
    fc.remove(img)
    const scale = Math.min((fc.width * 0.9) / newImg.width, (fc.height * 0.9) / newImg.height, 1)
    newImg.set({ left: fc.width/2, top: fc.height/2, originX:'center', originY:'center',
      scaleX: scale, scaleY: scale, selectable:true, evented:true, data:{ role:'main' } })
    fc.add(newImg); imgObjRef.current = newImg
    // Deselect so no handles are visible after crop
    fc.discardActiveObject(); fc.renderAll(); saveSnapshot(); setMode('select')
  }

  // ── Text ──────────────────────────────────────────────────────
  async function addText() {
    const fc = fabricRef.current; if (!fc) return
    const fabric = await import('fabric')
    const t = new fabric.IText('Type here', {
      left: fc.width/2, top: fc.height/2, originX:'center', originY:'center',
      fontFamily: textFont, fontSize: textSize, fill: textColor,
      fontWeight: textBold ? 'bold' : 'normal',
      fontStyle: textItalic ? 'italic' : 'normal',
      selectable: true, evented: true,
    })
    fc.add(t); fc.setActiveObject(t); t.enterEditing(); t.selectAll(); fc.renderAll()
  }

  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return
    async function onClick(opt) {
      if (mode !== 'text' || opt.target) return
      const fabric = await import('fabric')
      const ptr = fc.getPointer(opt.e)
      const t = new fabric.IText('Type here', {
        left: ptr.x, top: ptr.y,
        fontFamily: textFont, fontSize: textSize, fill: textColor,
        fontWeight: textBold ? 'bold' : 'normal',
        fontStyle: textItalic ? 'italic' : 'normal',
        selectable: true, evented: true,
      })
      fc.add(t); fc.setActiveObject(t); t.enterEditing(); fc.renderAll()
    }
    fc.on('mouse:down', onClick)
    return () => fc.off('mouse:down', onClick)
  }, [mode, textFont, textSize, textColor, textBold, textItalic])

  // ── Shapes ────────────────────────────────────────────────────
  async function addShape(type) {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const opts = { left: fc.width/2, top: fc.height/2, originX:'center', originY:'center',
      fill: 'rgba(242,184,198,0.35)', stroke: '#f2b8c6', strokeWidth: 2, selectable: true }
    let shape
    if (type === 'rect')     shape = new fabric.Rect({...opts, width:160, height:100})
    if (type === 'circle')   shape = new fabric.Circle({...opts, radius:70})
    if (type === 'triangle') shape = new fabric.Triangle({...opts, width:140, height:120})
    if (shape) { fc.add(shape); fc.setActiveObject(shape); fc.renderAll() }
  }

  // ── Add image from media library ──────────────────────────────
  async function loadMediaFiles(f) {
    setMediaLoading(true)
    const { data } = await supabase.storage.from('Media').list(f || mediaFolder, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' }
    })
    setMediaFiles((data||[]).filter(x => x.name !== '.emptyFolderPlaceholder'))
    setMediaLoading(false)
  }

  function getMediaUrl(name) {
    const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(`${mediaFolder}/${name}`)
    return publicUrl
  }

  async function addImageToCanvas(url) {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const img = await fabric.Image.fromURL(url, { crossOrigin: 'anonymous' })
    const scale = Math.min((fc.width * 0.6) / img.width, (fc.height * 0.6) / img.height, 1)
    img.set({ left: fc.width/2, top: fc.height/2, originX:'center', originY:'center',
      scaleX: scale, scaleY: scale, selectable: true, evented: true,
      data: { role: 'added-image' } })
    fc.add(img); fc.setActiveObject(img); fc.renderAll(); saveSnapshot()
    setShowMediaPicker(false)
  }

  // ── Background removal ────────────────────────────────────────
  async function handleRemoveBg() {
    const fc = fabricRef.current; if (!fc) return
    const active = fc.getActiveObject()
    const img = (active?.type === 'image' ? active : null) || imgObjRef.current
    if (!img) return
    setRemoving(true)
    try {
      const fabric = await import('fabric')
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = dataURLtoBlob(img.toDataURL())
      const result = await removeBackground(blob)
      const url = URL.createObjectURL(result)
      const newImg = await fabric.Image.fromURL(url)
      newImg.set({ left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY,
        originX:'center', originY:'center', selectable:true, evented:true, data:{ role:'main' } })
      fc.remove(img); fc.add(newImg); imgObjRef.current = newImg
      fc.setActiveObject(newImg); fc.renderAll(); URL.revokeObjectURL(url); saveSnapshot()
    } catch(e) { alert('Background removal failed: ' + e.message) }
    setRemoving(false)
  }

  // ── Delete selected ───────────────────────────────────────────
  function deleteSelected() {
    const fc = fabricRef.current; if (!fc) return
    const obj = fc.getActiveObject()
    if (!obj || obj.data?.role === 'main') return
    fc.remove(obj); fc.discardActiveObject(); fc.renderAll(); saveSnapshot()
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave() {
    const fc = fabricRef.current; if (!fc) return
    setSaving(true)
    try {
      exitCrop(); fc.discardActiveObject()
      const prevBg = fc.backgroundColor
      fc.set('backgroundColor', null)
      fc.renderAll()

      // Calculate the tight bounding box of all visible objects
      const objects = fc.getObjects().filter(o => o.visible !== false && o.data?.role !== 'cropRect')
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      objects.forEach(o => {
        const b = o.getBoundingRect()
        minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
        maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
      })
      const pad = 0
      const left   = Math.max(0, minX - pad)
      const top    = Math.max(0, minY - pad)
      const width  = Math.min(fc.width,  maxX - minX + pad * 2)
      const height = Math.min(fc.height, maxY - minY + pad * 2)

      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2, left, top, width, height })
      fc.set('backgroundColor', prevBg); fc.renderAll()

      const blob = dataURLtoBlob(dataUrl)
      const path = `${folder}/${fileName.replace(/\.[^.]+$/,'')}-edited-${Date.now()}.png`
      const { error } = await supabase.storage.from('Media').upload(path, blob, { cacheControl:'3600', contentType:'image/png' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
      onSave(publicUrl)
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Layer actions ─────────────────────────────────────────────
  function selectLayer(obj) {
    const fc = fabricRef.current; if (!fc) return
    fc.setActiveObject(obj); fc.renderAll()
  }
  function toggleVisibility(obj) {
    obj.set('visible', !obj.visible)
    fabricRef.current?.renderAll(); syncLayers()
  }
  function moveLayer(obj, dir) {
    const fc = fabricRef.current; if (!fc) return
    if (dir === 'up')   fc.bringObjectForward(obj)
    if (dir === 'down') fc.sendObjectBackwards(obj)
    fc.renderAll(); saveSnapshot()
  }

  // ── Shape property helpers ────────────────────────────────────
  function setProp(key, val) {
    const fc = fabricRef.current; const obj = fc?.getActiveObject(); if (!obj) return
    obj.set(key, val); fc.renderAll()
  }
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  function rgbaAlpha(fill) {
    if (!fill) return 1
    const m = String(fill).match(/rgba?\([^)]+,\s*([\d.]+)\)/)
    return m ? parseFloat(m[1]) : 1
  }
  function rgbaHex(fill) {
    if (!fill || fill === 'transparent') return '#f2b8c6'
    if (fill.startsWith('#')) return fill
    const m = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (m) return '#'+[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('')
    return '#f2b8c6'
  }

  // ── UI components ─────────────────────────────────────────────
  function Panel({ children }) {
    return <div style={{ background:'#1a1a1a', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 16px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', flexShrink:0 }}>{children}</div>
  }
  function Slider({ label, value, min, max, onChange, step=1 }) {
    return (
      <label style={{ color:'#888', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
        {label}
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{ width:'80px', accentColor:'#f2b8c6' }} />
        <span style={{ color:'#e0e0e0', minWidth:'28px' }}>{value}</span>
      </label>
    )
  }
  function TBtn({ id, children }) {
    const active = activePanel === id
    return <button type="button" onClick={()=>{ setActivePanel(active?null:id); if(id!=='crop'&&id!=='draw') setMode('select') }} style={{...BTN, background: active?'rgba(242,184,198,0.18)':'rgba(255,255,255,0.06)', color: active?'#f2b8c6':'#aaa'}}>{children}</button>
  }

  // ── Shape properties panel (shows when shape selected) ────────
  const isShape = selectedObj && ['rect','circle','triangle'].includes(selectedObj.type)
  const isText  = selectedObj && ['i-text','text'].includes(selectedObj.type)

  function ShapeProps() {
    if (!isShape) return null
    const obj = selectedObj
    const fillHex   = rgbaHex(obj.fill)
    const fillAlpha = rgbaAlpha(obj.fill)
    const strokeHex   = rgbaHex(obj.stroke || '#ffffff')
    const strokeAlpha = rgbaAlpha(obj.stroke || 'rgba(255,255,255,1)')
    return (
      <Panel>
        <span style={{ color:'#555', fontSize:'11px', textTransform:'uppercase', letterSpacing:'.08em' }}>Fill</span>
        <input type="color" value={fillHex} onChange={e=>{ setProp('fill', hexToRgba(e.target.value, fillAlpha)); syncLayers() }} style={{ width:28, height:24, border:'none', background:'none', cursor:'pointer' }} />
        <Slider label="Opacity" value={Math.round(fillAlpha*100)} min={0} max={100} onChange={v=>{ setProp('fill', hexToRgba(fillHex, v/100)); syncLayers() }} />
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }} />
        <span style={{ color:'#555', fontSize:'11px', textTransform:'uppercase', letterSpacing:'.08em' }}>Stroke</span>
        <input type="color" value={strokeHex} onChange={e=>{ setProp('stroke', hexToRgba(e.target.value, strokeAlpha)); syncLayers() }} style={{ width:28, height:24, border:'none', background:'none', cursor:'pointer' }} />
        <Slider label="Opacity" value={Math.round(strokeAlpha*100)} min={0} max={100} onChange={v=>{ setProp('stroke', hexToRgba(strokeHex, v/100)); syncLayers() }} />
        <Slider label="Width" value={obj.strokeWidth||0} min={0} max={30} onChange={v=>{ setProp('strokeWidth', v); syncLayers() }} />
      </Panel>
    )
  }

  function renderPanel() {
    switch (activePanel) {
      case 'crop': return (
        <Panel>
          <span style={{ color:'#555', fontSize:'11px', textTransform:'uppercase', letterSpacing:'.08em' }}>Ratio</span>
          {CROP_PRESETS.map(p=>(
            <button key={p.label} type="button" onClick={()=>{ setMode('crop'); startCrop(p.ratio) }}
              style={{...BTN, background: cropRatio===p.ratio?'rgba(242,184,198,0.2)':'#2a2a2a', color: cropRatio===p.ratio?'#f2b8c6':'#aaa'}}>
              {p.label}
            </button>
          ))}
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }} />
          <button type="button" onClick={applyCrop} style={{...BTN, background:'#f2b8c6', color:'#0a0a0a'}}>Apply</button>
          <button type="button" onClick={()=>{ exitCrop(); setMode('select') }} style={{...BTN, background:'#2a2a2a', color:'#666'}}>Cancel</button>
          <span style={{ color:'#444', fontSize:'11px' }}>Drag corners to adjust</span>
        </Panel>
      )
      case 'flip': return (
        <Panel>
          <button type="button" onClick={flipH} style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>↔ Horizontal</button>
          <button type="button" onClick={flipV} style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>↕ Vertical</button>
        </Panel>
      )
      case 'rotate': return (
        <Panel>
          <button type="button" onClick={()=>rotateBy(-90)} style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>↺ −90°</button>
          <button type="button" onClick={()=>rotateBy(90)}  style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>↻ +90°</button>
          <Slider label="Angle" value={Math.round(imgObjRef.current?.angle||0)} min={-180} max={180} onChange={setAngle} />
        </Panel>
      )
      case 'filter': return (
        <Panel>
          <Slider label="Brightness" value={brightness} min={-100} max={100} onChange={v=>{setBrightness(v);applyFilters({brightness:v})}} />
          <Slider label="Contrast"   value={contrast}   min={-100} max={100} onChange={v=>{setContrast(v);  applyFilters({contrast:v})}} />
          <Slider label="Saturation" value={saturation} min={-100} max={100} onChange={v=>{setSaturation(v);applyFilters({saturation:v})}} />
          <Slider label="Blur"       value={blur}       min={0}    max={100} onChange={v=>{setBlur(v);      applyFilters({blur:v})}} />
          <label style={{ color:'#888', fontSize:'12px', display:'flex', alignItems:'center', gap:5 }}>
            <input type="checkbox" checked={grayscale} onChange={e=>{setGrayscale(e.target.checked);applyFilters({grayscale:e.target.checked})}} style={{ accentColor:'#f2b8c6' }} /> B&W
          </label>
          <label style={{ color:'#888', fontSize:'12px', display:'flex', alignItems:'center', gap:5 }}>
            <input type="checkbox" checked={sepia} onChange={e=>{setSepia(e.target.checked);applyFilters({sepia:e.target.checked})}} style={{ accentColor:'#f2b8c6' }} /> Sepia
          </label>
          <button type="button" onClick={()=>{ setBrightness(0);setContrast(0);setSaturation(0);setBlur(0);setGrayscale(false);setSepia(false);applyFilters({brightness:0,contrast:0,saturation:0,blur:0,grayscale:false,sepia:false}) }} style={{...BTN, background:'#2a2a2a', color:'#666'}}>Reset</button>
        </Panel>
      )
      case 'draw': return (
        <Panel>
          <button type="button" onClick={()=>setMode(mode==='draw'?'select':'draw')} style={{...BTN, background: mode==='draw'?'rgba(242,184,198,0.18)':'rgba(255,255,255,0.06)', color: mode==='draw'?'#f2b8c6':'#aaa'}}>
            {mode==='draw'?'✏ Drawing (click to stop)':'✏ Start Drawing'}
          </button>
          <label style={{ color:'#888', fontSize:'12px', display:'flex', alignItems:'center', gap:6 }}>
            Color <input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)} style={{ width:28, height:24, border:'none', background:'none', cursor:'pointer' }} />
          </label>
          <Slider label="Width" value={drawWidth} min={1} max={40} onChange={setDrawWidth} />
        </Panel>
      )
      case 'text': return (
        <Panel>
          {!isText && (
            <button type="button" onClick={()=>setMode(mode==='text'?'select':'text')}
              style={{...BTN, background: mode==='text'?'rgba(242,184,198,0.18)':'rgba(255,255,255,0.06)', color: mode==='text'?'#f2b8c6':'#aaa'}}>
              {mode==='text'?'Click canvas to place':'Click canvas to place text'}
            </button>
          )}
          {isText && <span style={{ color:'#f2b8c6', fontSize:'12px' }}>Editing selected text</span>}
          <select value={isText ? (selectedObj.fontFamily||textFont) : textFont}
            onChange={e=>{ const v=e.target.value; setTextFont(v); if(isText){ applyTextProp('fontFamily',v) } }}
            style={{...INPUT, width:170}}>
            {FONTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <Slider label="Size" value={isText?(selectedObj.fontSize||textSize):textSize} min={10} max={200}
            onChange={v=>{ setTextSize(v); if(isText) applyTextProp('fontSize',v) }} />
          <label style={{ color:'#888', fontSize:'12px', display:'flex', alignItems:'center', gap:6 }}>
            Color <input type="color" value={isText?rgbaHex(selectedObj.fill||textColor):textColor}
              onChange={e=>{ setTextColor(e.target.value); if(isText) applyTextProp('fill',e.target.value) }}
              style={{ width:28, height:24, border:'none', background:'none', cursor:'pointer' }} />
          </label>
          <button type="button"
            onClick={()=>{ const v=!(isText?(selectedObj.fontWeight==='bold'):textBold); setTextBold(v); if(isText) applyTextProp('fontWeight',v?'bold':'normal') }}
            style={{...BTN, background: (isText?(selectedObj.fontWeight==='bold'):textBold)?'rgba(242,184,198,0.2)':'#2a2a2a', color:(isText?(selectedObj.fontWeight==='bold'):textBold)?'#f2b8c6':'#aaa', fontWeight:'bold'}}>B</button>
          <button type="button"
            onClick={()=>{ const v=!(isText?(selectedObj.fontStyle==='italic'):textItalic); setTextItalic(v); if(isText) applyTextProp('fontStyle',v?'italic':'normal') }}
            style={{...BTN, background: (isText?(selectedObj.fontStyle==='italic'):textItalic)?'rgba(242,184,198,0.2)':'#2a2a2a', color:(isText?(selectedObj.fontStyle==='italic'):textItalic)?'#f2b8c6':'#aaa', fontStyle:'italic'}}>I</button>
          {!isText && <button type="button" onClick={addText} style={{...BTN, background:'#f2b8c6', color:'#0a0a0a'}}>Add Text</button>}
        </Panel>
      )
      case 'shape': return (
        <Panel>
          <button type="button" onClick={()=>addShape('rect')}     style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>□ Rectangle</button>
          <button type="button" onClick={()=>addShape('circle')}   style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>○ Circle</button>
          <button type="button" onClick={()=>addShape('triangle')} style={{...BTN, background:'#2a2a2a', color:'#e0e0e0'}}>△ Triangle</button>
        </Panel>
      )
      default: return null
    }
  }

  // ── Layers panel ──────────────────────────────────────────────
  function LayersPanel() {
    return (
      <div style={{ width:200, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', overflow:'hidden', background:'#111' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:'11px', color:'#555', textTransform:'uppercase', letterSpacing:'.08em' }}>Layers</span>
          <button type="button" onClick={()=>{ setShowMediaPicker(true); loadMediaFiles(mediaFolder) }}
            style={{ background:'rgba(242,184,198,0.12)', border:'none', borderRadius:4, color:'#f2b8c6', fontSize:'11px', padding:'3px 7px', cursor:'pointer', fontWeight:600 }}>
            + Image
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
          {layers.filter(o => o.data?.role !== 'cropRect').map((obj, i) => {
            const fc = fabricRef.current
            const isActive = fc?.getActiveObject() === obj
            return (
              <div key={i}
                draggable
                onDragStart={()=>{ layerDragIdx.current = i }}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>{
                  const from = layerDragIdx.current; if(from===null||from===i) return
                  const fc = fabricRef.current; if(!fc) return
                  const objs = fc.getObjects()
                  const total = objs.length
                  // layers are reversed so convert indices
                  const fromObj = layers[from]
                  const toObj   = layers[i]
                  const fi = objs.indexOf(fromObj)
                  const ti = objs.indexOf(toObj)
                  if(fi>=0 && ti>=0) {
                    fc.moveObjectTo(fromObj, ti)
                    fc.renderAll(); saveSnapshot()
                  }
                  layerDragIdx.current = null
                }}
                onClick={()=>selectLayer(obj)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 6px', borderRadius:5, marginBottom:2, cursor:'pointer', background: isActive?'rgba(242,184,198,0.1)':'transparent', border:`1px solid ${isActive?'rgba(242,184,198,0.3)':'transparent'}` }}
              >
                <span style={{ color:'#444', fontSize:'10px', cursor:'grab' }}>⠿</span>
                <span style={{ flex:1, fontSize:'11px', color: obj.visible===false?'#444':'#ccc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {objLabel(obj)}
                </span>
                <button type="button" onClick={e=>{ e.stopPropagation(); moveLayer(obj,'up') }}   style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:'11px', padding:'0 2px' }}>↑</button>
                <button type="button" onClick={e=>{ e.stopPropagation(); moveLayer(obj,'down') }} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:'11px', padding:'0 2px' }}>↓</button>
                <button type="button" onClick={e=>{ e.stopPropagation(); toggleVisibility(obj) }} style={{ background:'none', border:'none', color: obj.visible===false?'#333':'#666', cursor:'pointer', fontSize:'12px', padding:'0 2px' }}>
                  {obj.visible===false ? '○' : '●'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Media picker modal ────────────────────────────────────────
  function MediaPicker() {
    return (
      <div onClick={()=>setShowMediaPicker(false)} style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:640, maxHeight:'80vh', background:'#111', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ color:'#e0e0e0', fontSize:'13px', fontWeight:600, fontFamily:"'Playfair Display',Georgia,serif" }}>Add Image from Library</span>
            <div style={{ display:'flex', gap:6 }}>
              {['body','covers','authors'].map(f=>(
                <button key={f} type="button" onClick={()=>{ setMediaFolder(f); loadMediaFiles(f) }}
                  style={{...BTN, background: mediaFolder===f?'rgba(242,184,198,0.18)':'rgba(255,255,255,0.05)', color: mediaFolder===f?'#f2b8c6':'#666', padding:'4px 10px'}}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:14 }}>
            {mediaLoading ? <div style={{ textAlign:'center', padding:40, color:'#444', fontSize:13 }}>Loading…</div> : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {mediaFiles.map(file=>(
                  <div key={file.name} onClick={()=>addImageToCanvas(getMediaUrl(file.name))}
                    style={{ aspectRatio:'1', borderRadius:6, overflow:'hidden', cursor:'pointer', border:'2px solid rgba(255,255,255,0.06)', background:'#1a1a1a' }}>
                    <img src={getMediaUrl(file.name)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'min(1100px,98vw)', height:'93vh', background:'#111', borderRadius:14, border:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <span style={{ fontSize:'14px', fontWeight:600, color:'#e0e0e0', fontFamily:"'Playfair Display',Georgia,serif" }}>Edit Image</span>
          <div style={{ display:'flex', gap:7, alignItems:'center' }}>
            <button type="button" onClick={undo}           style={{...BTN, background:'rgba(255,255,255,0.05)', color:'#888'}}>↩ Undo</button>
            <button type="button" onClick={redo}           style={{...BTN, background:'rgba(255,255,255,0.05)', color:'#888'}}>↪ Redo</button>
            <button type="button" onClick={deleteSelected} style={{...BTN, background:'rgba(255,255,255,0.05)', color:'#888'}}>⌫ Delete</button>
            <button type="button" onClick={onClose}        style={{...BTN, background:'none', color:'#555', fontSize:18, padding:'2px 8px'}}>×</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0, flexWrap:'wrap' }}>
          <TBtn id="crop">✂ Crop</TBtn>
          <TBtn id="flip">⇔ Flip</TBtn>
          <TBtn id="rotate">↻ Rotate</TBtn>
          <TBtn id="filter">◑ Filters</TBtn>
          <TBtn id="draw">✏ Draw</TBtn>
          <TBtn id="text">T Text</TBtn>
          <TBtn id="shape">◻ Shape</TBtn>
          <div style={{ marginLeft:'auto' }}>
            <button type="button" onClick={handleRemoveBg} disabled={removing||!ready}
              style={{...BTN, background: removing?'#2a2a2a':'rgba(99,102,241,0.2)', color: removing?'#555':'#a5b4fc', opacity: ready?1:0.5}}>
              {removing?'Removing…':'✦ Remove BG'}
            </button>
          </div>
        </div>

        {/* Active tool panel */}
        {renderPanel()}
        {/* Shape properties (shown when shape selected) */}
        <ShapeProps />

        {/* Body: layers + canvas */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
          <LayersPanel />
          <div ref={canvasWrapRef} style={{ flex:1, minWidth:0, overflow:'hidden', position:'relative', background:'#0d0d0d', alignSelf:'stretch' }}>
            {!ready && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:13, zIndex:1 }}>Loading…</div>}
            <canvas ref={canvasElRef} style={{ display:'block' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, padding:'11px 18px', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <span style={{ fontSize:11, color:'#444', marginRight:'auto' }}>Saves as a new file — original is preserved</span>
          <button type="button" onClick={onClose} style={{...BTN, background:'none', border:'1px solid rgba(255,255,255,0.1)', color:'#666'}}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving||!ready}
            style={{...BTN, background:'#f2b8c6', color:'#0a0a0a', opacity:(saving||!ready)?0.5:1, cursor:(saving||!ready)?'not-allowed':'pointer'}}>
            {saving?'Saving…':'Save to Library'}
          </button>
        </div>
      </div>

      {showMediaPicker && <MediaPicker />}
    </div>
  )
}

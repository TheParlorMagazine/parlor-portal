// Flat, source-labeled CSVs keep monthly traffic separate from point-in-time audits.
export function csv(rows) {
  const cell = value => {
    let text = String(value ?? '')
    if (/^\s*[=+@-]/.test(text)) text = "'" + text // spreadsheet formula injection
    return '"' + text.replace(/"/g, '""') + '"'
  }
  return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function overviewCsv(data, period) {
  const rows = [['Source', 'Period', 'Section', 'Metric', 'Dimension', 'Value']]
  const add = (section, metric, dimension, value) => rows.push(['Website analytics', period, section, metric, dimension, value])
  add('Summary', 'Page views', '', data.totalViews)
  add('Summary', 'Unique visitors', '', data.uniqueVisitors)
  add('Summary', 'New visitors', '', data.newVsReturning?.new)
  add('Summary', 'Returning visitors', '', data.newVsReturning?.returning)
  for (const day of data.dailySessions || []) add('Daily traffic', 'Page views', day.label, day.value)
  for (const item of data.topArticles || []) add('Top articles', 'Page views', item.title || item.path, item.views)
  for (const item of data.topReferrers || []) add('Referral sources', 'Visits', item.source, item.visits)
  for (const item of data.byDevice || []) add('Devices', 'Page views', item.device, item.count)
  for (const item of data.byCountry || []) add('Countries', 'Page views', item.country, item.count)
  return csv(rows)
}

export function pageHealthCsv(report) {
  const rows = [['Source', 'Page URL', 'Device', 'Audit timestamp (UTC)', 'Section', 'Metric', 'Value', 'Scope', 'Description']]
  const add = (section, metric, value, scope = '', description = '') => rows.push(['Google PageSpeed Insights', report.url, report.strategy, report.auditedAt, section, metric, value, scope, description])
  for (const item of report.categories) add('Lighthouse score / 100', item.title, item.score ?? '')
  for (const item of report.metrics) add('Lab measurement', item.title, item.value)
  if (report.fieldData) for (const item of report.fieldData.metrics) add('Real-user field measurement', item.title, item.value, report.fieldData.scope, item.rating || '')
  else add('Real-user field measurement', 'Availability', 'Not returned')
  for (const item of report.findings) add('Recommendation', item.title, item.value, '', item.description)
  return csv(rows)
}

// Small uncompressed ZIP for the available CSV reports; no new dependency or
// external upload. Filenames are sanitized and file contents remain UTF-8.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
const crc32 = bytes => {
  let n = 0xffffffff
  for (const byte of bytes) n = crcTable[(n ^ byte) & 255] ^ (n >>> 8)
  return (n ^ 0xffffffff) >>> 0
}
export function reportZip(files) {
  const encode = value => new TextEncoder().encode(value)
  const parts = [], directory = []
  let offset = 0
  for (const file of files) {
    const name = encode(file.name.replace(/[^a-z0-9_.-]/gi, '_')), bytes = encode(file.content), checksum = crc32(bytes)
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(12, 33, true)
    view.setUint32(14, checksum, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, name.length, true); header.set(name, 30)
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true)
    cv.setUint32(16, checksum, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46)
    parts.push(header, bytes); directory.push(central); offset += header.length + bytes.length
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22), ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true)
  const output = new Uint8Array(offset + directorySize + end.length)
  let cursor = 0
  for (const part of [...parts, ...directory, end]) { output.set(part, cursor); cursor += part.length }
  return output
}

export function connectedReportCsv(report) {
  return csv([
    ['Source', 'Start date', 'End date', 'Retrieved (UTC)', 'Notes', ...report.columns],
    ...report.rows.map(row => [report.name, report.start, report.end, report.fetchedAt, report.note, ...row]),
    ...(!report.rows.length ? [[report.name, report.start, report.end, report.fetchedAt, 'No rows returned. ' + report.note]] : []),
  ])
}

/** Trigger a file download in the browser */
function trigger(filename, content, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function quote(val) {
  return `"${String(val ?? '').replace(/"/g, '""')}"`
}

/**
 * Download an array of objects as CSV.
 * @param {string} filename
 * @param {object[]} rows
 * @param {{ key: string, label: string }[]} columns
 */
export function downloadCSV(filename, rows, columns) {
  const header = columns.map(c => quote(c.label)).join(',')
  const body   = rows.map(row =>
    columns.map(c => quote(row[c.key])).join(',')
  ).join('\n')
  trigger(filename, `${header}\n${body}`, 'text/csv;charset=utf-8;')
}

/**
 * Download plain text (SQL scripts, etc.)
 */
export function downloadText(filename, content) {
  trigger(filename, content, 'text/plain;charset=utf-8;')
}

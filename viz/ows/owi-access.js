// Two ways into the Open Web Index, with owilix on top as the access tool.
//
// The figure replaces a schema table: instead of listing the four Parquet
// schemas, it shows the object store as a file system and marks which of the
// three tables a lean schema still has to read. The point the slide makes is
// that the index is files, not a service.
//
// steps: 3 — 1 owilix and the download route, 2 the remote-query route,
//            3 the two tables a lean schema drops, and the timing strip.

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const INK = '#333333'
const SOFT = '#5a6472'
const SURFACE = '#f6f8fa'
const RULE = '#d3d9e0'
const WHITE = '#ffffff'

const DEFAULTS = {
  tool: 'owilix: the client for the Open Web Index',
  toolNote: 'git-style pull · build · push   |   slice by language, Curlie topic, domain or site list',
  strip: 'NoDocsNoDict reads the postings and nothing else: most queries 5–10 s, a full topic set in 10–15 min, 45 s with the storage 650 km away.',
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const cfg = Object.assign({}, DEFAULTS, params)
  const W = 1000, H = 372

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'owilix as the access tool: pull index partitions, or query the Parquet files on object storage where they lie')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

  const box = (g, x, y, w, h, stroke, fill = SURFACE, dash = null) =>
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 8)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.4)
      .attr('stroke-dasharray', dash)

  const label = (g, x, y, t, size, colour, weight = 400, anchor = 'start', family = null) =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor)
      .attr('font-family', family || 'Arial, Helvetica, sans-serif').text(t)

  svg.append('defs').append('marker').attr('id', 'oa-arrow').attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  // ── the tool, across the whole figure ──────────────────────────────────────
  const gTool = svg.append('g')
  gTool.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', 48).attr('rx', 10).attr('fill', NAVY)
  label(gTool, 18, 30, cfg.tool, 17, WHITE, 700)
  label(gTool, W - 18, 30, cfg.toolNote, 12, '#c8d6e6', 400, 'end')

  // ── route 1: pull a partition ──────────────────────────────────────────────
  const gPull = svg.append('g')
  gPull.append('path').attr('d', 'M 240 48 L 240 74').attr('stroke', SOFT).attr('stroke-width', 1.4)
    .attr('fill', 'none').attr('marker-end', 'url(#oa-arrow)')
  gPull.append('rect').attr('x', 140).attr('y', 76).attr('width', 200).attr('height', 24).attr('rx', 12).attr('fill', TEAL)
  label(gPull, 240, 93, '1 · pull the partition', 13, WHITE, 700, 'middle')

  box(gPull, 10, 116, 460, 186, TEAL)
  label(gPull, 30, 140, 'your machine or cluster', 13, TEAL, 700)
  ;['owi/de/2025-09-17', 'owi/curlie/science', 'owi/site-list/news'].forEach((n, i) => {
    const y = 158 + i * 34
    gPull.append('rect').attr('x', 30).attr('y', y).attr('width', 18).attr('height', 22).attr('rx', 3)
      .attr('fill', WHITE).attr('stroke', SOFT)
    gPull.append('path').attr('d', `M 40 ${y} l 8 8 h -8 z`).attr('fill', RULE)
    label(gPull, 58, y + 16, n, 12.5, INK, 400, 'start', mono)
  })
  label(gPull, 30, 272, 'Only the slice the experiment needs. Partitions merge', 12.5, SOFT)
  label(gPull, 30, 289, 'by union, so nothing has to be re-indexed.', 12.5, SOFT)

  // ── route 2: query it where it lies ────────────────────────────────────────
  const gQuery = svg.append('g')
  gQuery.append('path').attr('d', 'M 760 48 L 760 74').attr('stroke', SOFT).attr('stroke-width', 1.4)
    .attr('fill', 'none').attr('marker-end', 'url(#oa-arrow)')
  gQuery.append('rect').attr('x', 640).attr('y', 76).attr('width', 240).attr('height', 24).attr('rx', 12).attr('fill', VIOLET)
  label(gQuery, 760, 93, '2 · query it where it lies', 13, WHITE, 700, 'middle')

  box(gQuery, 530, 116, 460, 132, VIOLET, WHITE)
  label(gQuery, 550, 138, 's3://openwebindex/owic25/', 12.5, VIOLET, 700, 'start', mono)

  const TABLES = [
    { path: '├ postings/*.parquet', cols: 'term · doc · impact', note: 'always read', keep: true },
    { path: '├ dict/*.parquet', cols: 'term → id, df', note: 'dropped by NoDict', keep: false },
    { path: '└ docs/*.parquet', cols: 'url, length, metadata', note: 'dropped by NoDocs', keep: false },
  ]
  const rows = TABLES.map((t, i) => {
    const y = 158 + i * 28
    const g = gQuery.append('g')
    label(g, 550, y, t.path, 12.5, INK, t.keep ? 700 : 400, 'start', mono)
    label(g, 712, y, t.cols, 11, SOFT, 400, 'start', mono)
    const n = label(g, 972, y, t.note, 10.5, t.keep ? VIOLET : '#9aa4b0', t.keep ? 700 : 400, 'end')
    if (!t.keep) g.append('line').attr('x1', 548).attr('x2', 706).attr('y1', y - 4).attr('y2', y - 4)
      .attr('stroke', '#9aa4b0').attr('stroke-width', 1).attr('opacity', 0)
    return { g, keep: t.keep, note: n, strike: g.select('line') }
  })

  box(gQuery, 530, 262, 460, 40, VIOLET, SURFACE)
  label(gQuery, 550, 279, 'DuckDB, on your side · BM25 written as SQL', 13, VIOLET, 700)
  label(gQuery, 550, 294, 'reads only the postings a query touches; the ranking is yours to change', 11.5, SOFT)
  gQuery.append('path').attr('d', 'M 760 262 L 760 250').attr('stroke', SOFT).attr('stroke-width', 1.4)
    .attr('fill', 'none').attr('marker-end', 'url(#oa-arrow)')

  // ── the timing strip ───────────────────────────────────────────────────────
  const gStrip = svg.append('g')
  gStrip.append('rect').attr('x', 0).attr('y', 320).attr('width', W).attr('height', 40).attr('rx', 8)
    .attr('fill', '#eef4f6').attr('stroke', TEAL).attr('stroke-width', 1.2)
  label(gStrip, W / 2, 345, cfg.strip, 13, NAVY, 600, 'middle')

  let last = null
  function render(step) {
    const s = isPrint || !steps ? 3 : Math.max(1, Math.min(3, step + 1))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    t(gPull).attr('opacity', s >= 1 ? 1 : 0)
    t(gQuery).attr('opacity', s >= 2 ? 1 : 0.12)
    rows.forEach((r) => {
      if (r.keep) return
      t(r.g).attr('opacity', s >= 3 ? 0.45 : 1)
      t(r.strike).attr('opacity', s >= 3 ? 1 : 0)
    })
    t(gStrip).attr('opacity', s >= 3 ? 1 : 0)
    last = s
  }
  render(2)
  return { setStep: (i) => render(i) }
}

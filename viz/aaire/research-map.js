// The AAIRE Lab research map: what we work on, along three columns — data,
// retrieval & analysis, AI & agents — for the shared infrastructure and each
// project, with robust and secure agentic systems as the cross-cutting question.
//
// stages: one per row (0 infrastructure, then one project each), then the
//         cross-cutting question as the last stage (= number of rows)
// params:
//   stage:  0–rows, drawn when the slide has no data-steps
//   focus:  a row key or a list of them ('infra', 'source', 'coopaifa',
//           'agentcris', 'b2bconnect', 'dekis', 'robust'); the rest is dimmed
//   rows:   override ROWS (same shape) to reuse the figure; a null cell is
//           drawn as "not part of this project"
// steps: number of rows — step i draws stage i (step 0 is the entry state).

const NAVY = '#1f3b57'
const RED = '#8d153a'
const TEAL = '#0083A1'
const SOFT = '#5f6d7b'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const DIM = 0.2

const COLS = ['Data', 'Retrieval & Analysis', 'AI & Agents']

const ROWS = [
  { key: 'infra', label: 'Infrastructure', note: 'shared by all', cells: ['Owler++ crawler', 'OURRS search engine', 'YOARS agent relay'] },
  { key: 'source', label: 'SOURCE', note: 'BMFTR', cells: ['Social media', 'Images & provenance', 'Actor profiles'] },
  { key: 'coopaifa', label: 'CoopAIFA', note: 'EU', cells: ['Crawler up-scaling, multimedia', 'RAG system for EU SMEs', 'Agentic search'] },
  { key: 'agentcris', label: 'AgentCRIS', note: 'BMFTR', cells: ['Academia & research data', 'Knowledge extraction into a schema', 'Agents for public administration'] },
  { key: 'b2bconnect', label: 'B2BConnect', note: 'BMEL', cells: ['Crawl data: regional food', 'Web search', null] },
  { key: 'dekis', label: 'DEKIS', note: 'BSWLE', cells: ['Crawl data', 'Provenance analysis for images', 'Agentic privacy-preserving search'] },
  { key: 'bari', label: 'BARI', note: 'DFG', cells: ['News, social media, other texts', 'Media-bias analysis at scale', 'LLM classifiers with human feedback'] },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const rows = params.rows ?? ROWS
  const focus = params.focus == null ? null : new Set([].concat(params.focus))
  const last = rows.length // the cross-cutting band
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(last, params.stage)) : null
  const W = 1100, LW = 180, CW = 290, GAP = 10, RH = 54
  const colX = (i) => LW + 20 + i * (CW + GAP)
  const rowY = (i) => 62 + i * (RH + 8)
  const bandY = rowY(rows.length) + 8
  const H = bandY + 54

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'AAIRE Lab research map: infrastructure and projects across data, retrieval and analysis, and AI and agents')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'start') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)

  // wrap a label into at most two lines of ~maxChars
  const wrap = (t, maxChars) => {
    if (t.length <= maxChars) return [t]
    const words = t.split(' ')
    let a = ''
    while (words.length && (a + ' ' + words[0]).trim().length <= maxChars) a = (a + ' ' + words.shift()).trim()
    return [a, words.join(' ')]
  }

  // ── column headers ─────────────────────────────────────────────────────────
  COLS.forEach((c, i) => {
    svg.append('rect').attr('x', colX(i)).attr('y', 10).attr('width', CW).attr('height', 40).attr('rx', 8).attr('fill', NAVY)
    text(svg, colX(i) + CW / 2, 36, c, 17, WHITE, 700, 'middle')
  })

  // ── rows ───────────────────────────────────────────────────────────────────
  const groups = rows.map((r, ri) => {
    const g = svg.append('g')
    const y = rowY(ri)
    const infra = r.key === 'infra'
    g.append('rect').attr('x', 10).attr('y', y).attr('width', LW).attr('height', RH).attr('rx', 8)
      .attr('fill', infra ? RED : WHITE).attr('stroke', RED).attr('stroke-width', 1.5)
    text(g, 24, y + (r.note ? 24 : 33), r.label, 17, infra ? WHITE : RED, 700)
    if (r.note) text(g, 24, y + 42, r.note, 13, infra ? '#f3d9e1' : SOFT)
    r.cells.forEach((c, ci) => {
      const cell = g.append('rect').attr('x', colX(ci)).attr('y', y).attr('width', CW).attr('height', RH).attr('rx', 8)
        .attr('fill', infra ? '#fbf3f5' : SURFACE).attr('stroke', infra ? RED : '#c9d2dc').attr('stroke-width', 1.3)
      if (c == null) {
        cell.attr('fill', WHITE).attr('stroke-dasharray', '4 4')
        text(g, colX(ci) + CW / 2, y + RH / 2 + 6, '—', 16, '#b0b8c2', 400, 'middle')
        return
      }
      const lines = wrap(c, 30)
      lines.forEach((l, li) => text(g, colX(ci) + CW / 2, y + RH / 2 + 6 + (li - (lines.length - 1) / 2) * 20, l, 15.5, NAVY, 700, 'middle'))
    })
    return { key: r.key, g, stage: ri }
  })

  // ── the cross-cutting question ─────────────────────────────────────────────
  const gBand = svg.append('g')
  gBand.append('rect').attr('x', 10).attr('y', bandY).attr('width', W - 20).attr('height', 44).attr('rx', 8)
    .attr('fill', '#eef4f6').attr('stroke', TEAL).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 4')
  text(gBand, W / 2, bandY + 28, 'Across all of it: how do we make agentic AI systems robust and secure?', 16, TEAL, 700, 'middle')

  let prev = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? last : Math.max(0, Math.min(last, step)))
    const t = (sel) => sel.transition().duration(prev === null ? 0 : 300)
    const op = (key, stage) => (s < stage ? 0 : focus && !focus.has(key) ? DIM : 1)
    groups.forEach((r) => t(r.g).attr('opacity', op(r.key, r.stage)))
    t(gBand).attr('opacity', op('robust', last))
    prev = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

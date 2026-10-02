// The lab's research, nailed down: two enablers (data, infrastructure) that
// every project uses and that raise research questions, and four research
// areas built on them. Agent cooperation & control is the top priority.
//
// stages: 0 the enablers · 1 + the four research areas · 2 + the priority
// params:
//   stage:  0–2, drawn when the slide has no data-steps
// steps: 2

const NAVY = '#1f3b57'
const TEAL = '#0083A1'
const SOFT = '#5f6d7b'
const RULE = '#c9d2dc'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const RED = '#8d153a'

const ENABLERS = [
  { name: 'Data', items: 'Open Web Index · daily crawl with Owler++ · social media · research data' },
  { name: 'Infrastructure', items: 'OURRS search engine · YOARS relay · FAITH cluster · our open LLMs' },
]
const AREAS = [
  { name: 'Agent cooperation', name2: '& control', items: ['collaboration, at which scale', 'context and interaction', 'sandboxes, auditing, societies'] },
  { name: 'Agentic search', items: ['OURRS for AI: API and MCP', 'search quality for agents', 'content repositories, data lakes'] },
  { name: 'Models & embeddings', items: ['efficiency and modularity', 'compressed embeddings', '(CoRECT)'] },
  { name: 'Domain specifics', items: ['mis- and disinformation', 'web search', 'media bias'] },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(2, params.stage)) : null
  const W = 1100, H = 430
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Two enablers, data and infrastructure, under four research areas: agent cooperation and control (top priority), agentic search, models and embeddings, and domain specifics')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const defs = svg.append('defs')
  defs.append('marker').attr('id', 'ra-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'start') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)

  // ── enablers: the foundation ──────────────────────────────────────────────
  const EY = 318, EH = 92, EG = 20, EW = (W - 20 - EG) / 2
  const gEn = svg.append('g')
  ENABLERS.forEach((e, i) => {
    const x = 10 + i * (EW + EG)
    gEn.append('rect').attr('x', x).attr('y', EY).attr('width', EW).attr('height', EH).attr('rx', 10)
      .attr('fill', '#e6f4f7').attr('stroke', TEAL).attr('stroke-width', 1.6)
    text(gEn, x + 18, EY + 26, 'ENABLER', 12, TEAL, 700).attr('letter-spacing', '0.08em')
    text(gEn, x + 18, EY + 52, e.name, 21, NAVY, 700)
    text(gEn, x + 18, EY + 76, e.items, 14, SOFT)
  })

  // ── the arrows between: enablers raise questions, areas build on them ─────
  const gMid = svg.append('g')
  ;[180, 550, 920].forEach((x) => {
    gMid.append('path').attr('d', `M ${x - 14} ${EY - 6} L ${x - 14} ${EY - 40}`).attr('stroke', SOFT)
      .attr('stroke-width', 1.6).attr('fill', 'none').attr('marker-end', 'url(#ra-arrow)')
    gMid.append('path').attr('d', `M ${x + 14} ${EY - 40} L ${x + 14} ${EY - 6}`).attr('stroke', SOFT)
      .attr('stroke-width', 1.6).attr('fill', 'none').attr('marker-end', 'url(#ra-arrow)')
  })
  text(gMid, 200, EY - 18, 'raise research questions', 13, SOFT, 700)
  text(gMid, 570, EY - 18, 'research builds on them, and improves them', 13, SOFT, 700)

  // ── the four research areas ───────────────────────────────────────────────
  const AY = 34, AH = 230, AG = 16, AW = (W - 20 - 3 * AG) / 4
  const areas = AREAS.map((a, i) => {
    const g = svg.append('g')
    const x = 10 + i * (AW + AG)
    const box = g.append('rect').attr('x', x).attr('y', AY).attr('width', AW).attr('height', AH).attr('rx', 10)
      .attr('fill', SURFACE).attr('stroke', RULE).attr('stroke-width', 1.4)
    const label = text(g, x + 16, AY + 28, `AREA ${i + 1}`, 12, SOFT, 700).attr('letter-spacing', '0.08em')
    const name = text(g, x + 16, AY + 58, a.name, 19, NAVY, 700)
    const name2 = a.name2 ? text(g, x + 16, AY + 82, a.name2, 19, NAVY, 700) : null
    const lines = a.items.map((t, k) => text(g, x + 16, AY + 116 + k * 26, t, 14.5, NAVY))
    return { g, box, label, name, name2, lines, x }
  })
  const gPrio = svg.append('g')
  gPrio.append('rect').attr('x', areas[0].x + AW - 128).attr('y', AY - 14).attr('width', 116).attr('height', 28).attr('rx', 14)
    .attr('fill', RED)
  text(gPrio, areas[0].x + AW - 70, AY + 5, 'top priority', 14, WHITE, 700, 'middle')

  let prev = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? 2 : Math.max(0, Math.min(2, step)))
    const t = (sel) => sel.transition().duration(prev === null ? 0 : 300)
    t(gMid).attr('opacity', s >= 1 ? 1 : 0)
    areas.forEach((a, i) => {
      t(a.g).attr('opacity', s >= 1 ? 1 : 0)
      const top = s >= 2 && i === 0
      a.box.attr('fill', top ? NAVY : SURFACE).attr('stroke', top ? NAVY : RULE)
      a.label.attr('fill', top ? '#c8d6e6' : SOFT)
      a.name.attr('fill', top ? WHITE : NAVY)
      if (a.name2) a.name2.attr('fill', top ? WHITE : NAVY)
      a.lines.forEach((l) => l.attr('fill', top ? WHITE : NAVY))
    })
    t(gPrio).attr('opacity', s >= 2 ? 1 : 0)
    prev = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

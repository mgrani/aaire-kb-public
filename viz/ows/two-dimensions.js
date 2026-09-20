// The closing figure of the CLEF talk: the three columns of the system view
// across, three infrastructure requirements down, and in each cell the one
// thing the talk has argued for. Rows are revealed one at a time.
//
// params:
//   cols:  three column headers (the topics)
//   rows:  three row headers (the requirements)
//   cells: 3 × 3 strings, row-major
//   marks: 3 × 3 strings drawn small under each cell (the concrete system)
// steps: 3 — step i reveals row i.

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const INK = '#333333'
const INK_SOFT = '#555555'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'

const DEFAULTS = {
  cols: ['retrieval', 'interaction', 'collaboration'],
  rows: ['openness, research sovereignty', 'scale and robustness', 'joint effort'],
  cells: [
    ['an open corpus and index below the model', 'an open, instrumented search service', 'an open layer for shared knowledge and communication'],
    ['corpus size and real web text as variables', 'traces at scale, by simulation and by design', 'populations of agents and people, over time'],
    ['one index, built and operated on public compute', 'traces pooled across groups in one format', 'the ecosystem evaluated together, or left to platforms'],
  ],
  marks: [
    ['Open Web Index', 'OURRS', 'social agentic layer'],
    ['CoRE · OWS-Curlie-2025 · WOWS', 'AgentSim · UXSim', 'agent social networks'],
    ['OpenWebSearch.EU · EuroHPC', 'IIRSim Studio · Sim4IA', 'evaluation labs'],
  ],
}

const ROW_COLOUR = [NAVY, TEAL, VIOLET]

export async function mount(el, { d3, params, steps, isPrint }) {
  const cfg = Object.assign({}, DEFAULTS, params)
  const W = 960, H = 480
  const L = 190, T = 64, GAP = 10
  const CW = (W - L - 20 - 2 * GAP) / 3
  const RH = (H - T - 16 - 2 * GAP) / 3

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Three research topics across, three infrastructure requirements down')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const wrap = (sel, text, x, y, width, size, lineH = size * 1.3) => {
    // greedy word wrap into tspans, measured by character count
    const words = String(text).split(/\s+/)
    const perLine = Math.max(8, Math.floor(width / (size * 0.52)))
    const lines = []
    let cur = ''
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > perLine && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
    }
    if (cur) lines.push(cur)
    const t = sel.append('text').attr('x', x).attr('y', y).attr('font-size', size)
    lines.forEach((ln, i) => t.append('tspan').attr('x', x).attr('dy', i === 0 ? 0 : lineH).text(ln))
    return t
  }

  // column headers
  cfg.cols.forEach((c, j) => {
    const x = L + j * (CW + GAP)
    svg.append('rect').attr('x', x).attr('y', 12).attr('width', CW).attr('height', 40).attr('rx', 8).attr('fill', NAVY)
    svg.append('text').attr('x', x + CW / 2).attr('y', 38).attr('text-anchor', 'middle')
      .attr('font-size', 15).attr('font-weight', 700).attr('fill', WHITE).text(c)
  })

  const rows = cfg.rows.map((r, i) => {
    const y = T + i * (RH + GAP)
    const g = svg.append('g')
    const colour = ROW_COLOUR[i]
    g.append('rect').attr('x', 12).attr('y', y).attr('width', L - 24).attr('height', RH).attr('rx', 8)
      .attr('fill', WHITE).attr('stroke', colour).attr('stroke-width', 2)
    wrap(g, r, 24, y + RH / 2 - 4, L - 48, 15).attr('font-weight', 700).attr('fill', colour)
    cfg.cells[i].forEach((c, j) => {
      const x = L + j * (CW + GAP)
      g.append('rect').attr('x', x).attr('y', y).attr('width', CW).attr('height', RH).attr('rx', 8)
        .attr('fill', SURFACE).attr('stroke', colour).attr('stroke-width', 1.2)
      g.append('rect').attr('x', x).attr('y', y).attr('width', 6).attr('height', RH).attr('rx', 3).attr('fill', colour)
      wrap(g, c, x + 18, y + 30, CW - 30, 15).attr('fill', INK)
      const m = cfg.marks?.[i]?.[j]
      if (m) g.append('text').attr('x', x + 18).attr('y', y + RH - 14).attr('font-size', 12).attr('fill', INK_SOFT).attr('font-style', 'italic').text(m)
    })
    return g
  })

  let last = null
  function render(step, animate = true) {
    const s = isPrint || !steps ? 3 : Math.max(0, Math.min(3, step))
    const t = (sel) => sel.transition().duration(animate && last !== null && last !== s ? 320 : 0)
    rows.forEach((g, i) => t(g).attr('opacity', i < s ? 1 : 0.1))
    last = s
  }
  render(3, false)
  return { setStep: (i) => render(i) }
}

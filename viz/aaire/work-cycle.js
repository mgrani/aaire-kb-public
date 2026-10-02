// How I work with an agent: explore → design → implement → evaluate, the
// implement/evaluate loop that goes down the rabbit hole, the moment the
// understanding drifts, and the reset that abstracts the results and
// consolidates the design before the cycle starts again.
//
// stages: 0 the cycle · 1 + down the rabbit hole · 2 + drift ·
//         3 + the reset back to the design
// params:
//   stage:  0–3, drawn when the slide has no data-steps
// steps: 3

const NAVY = '#1f3b57'
const TEAL = '#0083A1'
const SOFT = '#5f6d7b'
const RULE = '#c9d2dc'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const RED = '#b42318'
const VIOLET = '#6d28d9'

const MAIN = [
  { name: 'Explore', note: 'problems and goals,', note2: 'not solutions' },
  { name: 'Design', note: 'technical goals,', note2: 'not solutions' },
  { name: 'Implement', note: 'hints, not how', note2: 'to do it' },
  { name: 'Evaluate', note: 'critical:', note2: 'no trust' },
]
const RESET = [
  { name: 'Consolidate', note: 'the design' },
  { name: 'Explore', note: 'the results' },
  { name: 'Abstract again', note: 'aggregate the results' },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(3, params.stage)) : null
  const W = 1100, H = 420
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Working cycle: explore, design, implement, evaluate; iterate down the rabbit hole; when understanding drifts, abstract again, explore the results and consolidate the design')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const defs = svg.append('defs')
  ;[['wc-soft', SOFT], ['wc-red', RED], ['wc-violet', VIOLET]].forEach(([id, c]) =>
    defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', c))

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'middle') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)
  const path = (g, d, colour, marker, dash = null) => g.append('path').attr('d', d).attr('fill', 'none')
    .attr('stroke', colour).attr('stroke-width', 2).attr('stroke-dasharray', dash).attr('marker-end', `url(#${marker})`)

  // ── the main cycle ────────────────────────────────────────────────────────
  const BW = 210, BH = 92, GAP = 60, Y = 110
  const bx = (i) => 30 + i * (BW + GAP)
  const gMain = svg.append('g')
  MAIN.forEach((b, i) => {
    gMain.append('rect').attr('x', bx(i)).attr('y', Y).attr('width', BW).attr('height', BH).attr('rx', 10)
      .attr('fill', i === 3 ? NAVY : SURFACE).attr('stroke', i === 3 ? NAVY : RULE).attr('stroke-width', 1.4)
    const ink = i === 3 ? WHITE : NAVY
    text(gMain, bx(i) + BW / 2, Y + 32, b.name, 21, ink, 700)
    text(gMain, bx(i) + BW / 2, Y + 58, b.note, 14.5, i === 3 ? '#c8d6e6' : SOFT)
    text(gMain, bx(i) + BW / 2, Y + 77, b.note2, 14.5, i === 3 ? '#c8d6e6' : SOFT)
    if (i < 3) path(gMain, `M ${bx(i) + BW + 6} ${Y + BH / 2} L ${bx(i + 1) - 6} ${Y + BH / 2}`, SOFT, 'wc-soft')
  })

  // ── down the rabbit hole: evaluate back to implement ──────────────────────
  const gHole = svg.append('g')
  const x1 = bx(3) + BW / 2, x2 = bx(2) + BW / 2
  path(gHole, `M ${x1} ${Y - 6} C ${x1} ${Y - 70}, ${x2} ${Y - 70}, ${x2} ${Y - 6}`, TEAL, 'wc-soft')
  text(gHole, (x1 + x2) / 2, Y - 62, 'iterate: down the rabbit hole', 15, TEAL, 700)

  // ── drift ─────────────────────────────────────────────────────────────────
  const gDrift = svg.append('g')
  const DX = bx(3), DY = 262, DW = BW + 20
  path(gDrift, `M ${bx(3) + BW / 2} ${Y + BH + 6} L ${bx(3) + BW / 2} ${DY - 6}`, RED, 'wc-red')
  gDrift.append('rect').attr('x', DX - 10).attr('y', DY).attr('width', DW).attr('height', 110).attr('rx', 10)
    .attr('fill', '#fdecea').attr('stroke', RED).attr('stroke-width', 1.6)
  text(gDrift, DX + BW / 2, DY + 30, 'Understanding drifts', 18, RED, 700)
  ;['what the LLM does and', 'what I think it does', 'come apart'].forEach((l, k) =>
    text(gDrift, DX + BW / 2, DY + 56 + k * 19, l, 14.5, NAVY))

  // ── the reset: abstract → explore results → consolidate → back to design ──
  const gReset = svg.append('g')
  const RY = 282, RW = 225, RH = 72, RG = 55
  // left to right: consolidate, explore the results, abstract again (next to the drift)
  const xs = RESET.map((_, k) => 30 + k * (RW + RG))
  RESET.forEach((r, k) => {
    gReset.append('rect').attr('x', xs[k]).attr('y', RY).attr('width', RW).attr('height', RH).attr('rx', 10)
      .attr('fill', '#f3eefe').attr('stroke', VIOLET).attr('stroke-width', 1.4)
    text(gReset, xs[k] + RW / 2, RY + 30, r.name, 17, VIOLET, 700)
    text(gReset, xs[k] + RW / 2, RY + 53, r.note, 14, NAVY)
  })
  path(gReset, `M ${DX - 16} ${RY + RH / 2} L ${xs[2] + RW + 6} ${RY + RH / 2}`, VIOLET, 'wc-violet')
  path(gReset, `M ${xs[2] - 6} ${RY + RH / 2} L ${xs[1] + RW + 6} ${RY + RH / 2}`, VIOLET, 'wc-violet')
  path(gReset, `M ${xs[1] - 6} ${RY + RH / 2} L ${xs[0] + RW + 6} ${RY + RH / 2}`, VIOLET, 'wc-violet')
  path(gReset, `M ${xs[0] + RW / 2} ${RY - 6} L ${bx(1) + BW / 2 - 20} ${Y + BH + 6}`, VIOLET, 'wc-violet')
  text(gReset, xs[0], RY + RH + 34, 'reset, then the cycle starts again from the design', 14, VIOLET, 700, 'start')

  let prev = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? 3 : Math.max(0, Math.min(3, step)))
    const t = (sel) => sel.transition().duration(prev === null ? 0 : 300)
    t(gHole).attr('opacity', s >= 1 ? 1 : 0)
    t(gDrift).attr('opacity', s >= 2 ? 1 : 0)
    t(gReset).attr('opacity', s >= 3 ? 1 : 0)
    prev = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

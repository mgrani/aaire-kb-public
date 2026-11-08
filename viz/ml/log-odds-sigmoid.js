// From log-odds back to a probability (PML Lecture 03, odds-and-log-odds):
// the sigmoid P = σ(s) = 1 / (1 + e^(−s)) over the log-odds s, with the
// points of the running fraud example marked on it.
//
// Uses only: odds, log-odds, P = odds / (1 + odds).
//
// params:
//   points: [{ s, label }]  log-odds to mark, in order
//           (default: base rate −6.91, three red flags −1.56)
// steps: 0 the curve, s = 0 at 50% · k: the first k points, each with dashed
//        guides to both axes and its probability

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const GREY = '#64748b'
const RULE = '#dde3ea'

const DEFAULT_POINTS = [
  { s: Math.log(1 / 999), label: 'base rate' },
  { s: Math.log(210 / 999), label: 'three red flags' },
]

const sigma = (s) => 1 / (1 + Math.exp(-s))
const pct = (p) => `${(p * 100).toFixed(1)}%`

export async function mount(el, { d3, params, steps, isPrint }) {
  const points = params.points ?? DEFAULT_POINTS
  const W = 560
  const H = 400
  const M = { l: 62, r: 20, t: 34, b: 58 }
  const x = d3.scaleLinear().domain([-8, 4]).range([M.l, W - M.r])
  const y = d3.scaleLinear().domain([0, 1]).range([H - M.b, M.t])
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The sigmoid curve: log-odds on the horizontal axis, probability on the vertical axis, with the base rate and the three-flag transaction marked')
  const g = svg.append('g')
  const text = (tx, ty, t, o = {}) => g.append('text').attr('x', tx).attr('y', ty)
    .attr('font-size', o.size ?? 15).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)

  function render(step) {
    g.selectAll('*').remove()
    // axes and grid
    for (const p of [0, 0.5, 1]) {
      g.append('line').attr('x1', M.l).attr('x2', W - M.r).attr('y1', y(p)).attr('y2', y(p)).attr('stroke', RULE)
      text(M.l - 8, y(p) + 5, `${p * 100}%`, { anchor: 'end', size: 14, colour: GREY })
    }
    for (const s of [-8, -6, -4, -2, 0, 2, 4]) {
      text(x(s), H - M.b + 20, s === 0 ? '0' : `${s > 0 ? '+' : '−'}${Math.abs(s)}`, { anchor: 'middle', size: 14, colour: GREY })
    }
    g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', y(0)).attr('y2', y(1)).attr('stroke', RULE)
    text((M.l + W - M.r) / 2, H - 12, 'log-odds s  (fraud against honest)', { anchor: 'middle', size: 15 })
    const title = text(M.l, 20, 'P(fraud | x) = σ(s) = 1 / (1 + e', { size: 16, bold: true })
    title.append('tspan').attr('dy', -7).attr('font-size', 12).text('−s')
    title.append('tspan').attr('dy', 7).text(')')
    // the curve
    const grid = d3.range(-8, 4.001, 0.05)
    g.append('path').attr('d', d3.line().x((s) => x(s)).y((s) => y(sigma(s)))(grid))
      .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 3)
    g.append('circle').attr('cx', x(0)).attr('cy', y(0.5)).attr('r', 4).attr('fill', TEAL)
    text(x(0) + 8, y(0.5) + 18, 's = 0: odds 1 : 1, 50%', { size: 14, colour: TEAL })
    // the marked points
    points.slice(0, step).forEach((pt, i) => {
      const p = sigma(pt.s)
      const last = i === step - 1
      const c = last ? VIOLET : NAVY
      g.append('line').attr('x1', x(pt.s)).attr('x2', x(pt.s)).attr('y1', y(0)).attr('y2', y(p))
        .attr('stroke', c).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5)
      g.append('line').attr('x1', M.l).attr('x2', x(pt.s)).attr('y1', y(p)).attr('y2', y(p))
        .attr('stroke', c).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5)
      g.append('circle').attr('cx', x(pt.s)).attr('cy', y(p)).attr('r', 6).attr('fill', c)
      // label beside the point, on the side with room
      const right = x(pt.s) < W / 2
      const lx = x(pt.s) + (right ? -4 : -10)
      const o = { size: 14, bold: last, colour: c, anchor: right ? 'start' : 'end' }
      text(lx, y(p) - 30, pt.label, o)
      text(lx, y(p) - 12, `s = ${pt.s.toFixed(2).replace('-', '−')} → ${pct(p)}`, o)
    })
  }

  const setStep = (k) => render(k)
  setStep(isPrint ? (steps || points.length) : 0)
  return { setStep }
}

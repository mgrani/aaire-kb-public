// Where L and U lie for a standard normal (L02, sampling-and-estimation):
// the density of Z ~ N(0, 1) with two draggable bounds L and U. The area
// between them, P(L ≤ Z ≤ U), is shaded teal and the two tails violet, each
// with its probability. The answer step places the bounds symmetrically at
// −z and z for the chosen level, so each tail holds α/2 and the middle 1 − α.
//
// Uses only: the normal distribution, probability as area under a density.
//
// params: L, U (start bounds, default −1 and 2), level (0.80 | 0.90 | 0.95 | 0.99)
// steps: 0 free bounds · 1 the answer: L = −z, U = z for the level
// Controls: sliders for L and U (also draggable on the axis), the level.

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const GREY = '#64748b'
const RULE = '#dde3ea'

const Z = { 0.8: 1.2816, 0.9: 1.6449, 0.95: 1.96, 0.99: 2.5758 }
const pdf = (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
// Φ via erf (Abramowitz–Stegun 7.1.26, error below 1.5e-7)
function cdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    * Math.exp(-x * x / 2)
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2
}
const num = (v, d = 2) => v.toFixed(d).replace('-', '−')
const prob = (p) => (p < 0.1 ? p.toFixed(3) : p.toFixed(2))

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 720
  const H = 280
  const M = { l: 30, r: 30, t: 48, b: 58 }
  const x = d3.scaleLinear().domain([-4, 4]).range([M.l, W - M.r])
  const y = d3.scaleLinear().domain([0, 0.42]).range([H - M.b, M.t])
  const BASE = y(0)
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The standard normal density with two bounds L and U; the area between them and the two tails are shaded and labelled with their probabilities')
    .style('touch-action', 'none')
  const g = svg.append('g')
  const text = (tx, ty, t, o = {}) => g.append('text').attr('x', tx).attr('y', ty)
    .attr('font-size', o.size ?? 15).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'middle').attr('fill', o.colour ?? NAVY).text(t)

  const level0 = params.level ?? 0.95
  const start = [params.L ?? -1, params.U ?? 2]
  let [L, U] = start
  let level = level0

  const area = (a, b) => d3.area().x((v) => x(v)).y0(BASE).y1((v) => y(pdf(v)))(d3.range(a, b, 0.02).concat([b]))

  function render() {
    g.selectAll('*').remove()
    const symmetric = Math.abs(L + U) < 0.005
    const pin = cdf(U) - cdf(L)
    const pl = cdf(L)
    const pr = 1 - cdf(U)
    // areas: the tails (out of the interval) and the middle (inside)
    if (L > -4) g.append('path').attr('d', area(-4, L)).attr('fill', VIOLET).attr('fill-opacity', 0.28)
    if (U < 4) g.append('path').attr('d', area(U, 4)).attr('fill', VIOLET).attr('fill-opacity', 0.28)
    g.append('path').attr('d', area(L, U)).attr('fill', TEAL).attr('fill-opacity', 0.3)
    // the curve and the axis
    g.append('path').attr('d', d3.line().x((v) => x(v)).y((v) => y(pdf(v)))(d3.range(-4, 4.001, 0.02)))
      .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)
    g.append('line').attr('x1', M.l).attr('x2', W - M.r).attr('y1', BASE).attr('y2', BASE).attr('stroke', GREY)
    for (const t of [-3, -2, -1, 0, 1, 2, 3]) {
      g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', BASE).attr('y2', BASE + 5).attr('stroke', GREY)
      text(x(t), BASE + 19, num(t, 0), { size: 13, colour: GREY })
    }
    text(W - M.r, BASE + 19, 'z', { size: 13, colour: GREY, anchor: 'end' })
    text(M.l, 22, 'Z ~ N(0, 1)', { size: 16, bold: true, anchor: 'start' })

    // the probability between the bounds, above the curve
    const mid = symmetric ? `1 − α = ${prob(pin)}` : `P(L ≤ Z ≤ U) = ${prob(pin)}`
    text(x((L + U) / 2), M.t - 12, mid, { size: 16, bold: true, colour: TEAL })
    // the tails, beside the curve
    const tail = (p) => (symmetric ? `α/2 = ${prob(p)}` : prob(p))
    text(x(Math.max(-3.6, L - 0.6)), y(0.06), tail(pl), { size: 14, bold: true, colour: VIOLET })
    text(x(Math.min(3.6, U + 0.6)), y(0.06), tail(pr), { size: 14, bold: true, colour: VIOLET })

    // the two bounds, with handles on the axis
    for (const [v, name] of [[L, symmetric ? '−z' : 'L'], [U, symmetric ? 'z' : 'U']]) {
      g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', BASE).attr('y2', y(pdf(v)) - 4)
        .attr('stroke', NAVY).attr('stroke-width', 2)
      g.append('circle').attr('cx', x(v)).attr('cy', BASE).attr('r', 8).attr('fill', NAVY)
        .attr('stroke', '#fff').attr('stroke-width', 2).style('cursor', isPrint ? null : 'ew-resize')
      text(x(v), BASE + 40, `${name} = ${num(v)}`, { size: 15, bold: true })
    }
    text(W - M.r, 22, `width U − L = ${num(U - L)}`, { size: 14, colour: GREY, anchor: 'end' })
  }

  function setBounds(l, u) {
    L = Math.round(l * 100) / 100
    U = Math.round(u * 100) / 100
    controls.set('L', L)
    controls.set('U', U)
    render()
  }

  if (!isPrint) {
    // d3.pointer inverts the SVG's screen CTM, so dragging stays correct under
    // Reveal's scaling transform. The nearer handle moves; it cannot pass the other.
    let which = null
    svg.call(
      d3.drag()
        .filter((event) => {
          const [px, py] = d3.pointer(event, svg.node())
          return Math.abs(py - BASE) < 30 && Math.min(Math.abs(px - x(L)), Math.abs(px - x(U))) < 26
        })
        .on('start', (event) => {
          const px = d3.pointer(event, svg.node())[0]
          which = Math.abs(px - x(L)) <= Math.abs(px - x(U)) ? 'L' : 'U'
        })
        .on('drag', (event) => {
          const v = Math.min(3.9, Math.max(-3.9, x.invert(d3.pointer(event, svg.node())[0])))
          if (which === 'L') setBounds(Math.min(v, U - 0.05), U)
          else setBounds(L, Math.max(v, L + 0.05))
        }),
    )
  }

  const controls = addControls(el, { isPrint }, [
    { id: 'L', label: 'L', type: 'range', min: -3.9, max: 3.9, step: 0.01, value: L, format: (v) => num(Number(v)) },
    { id: 'U', label: 'U', type: 'range', min: -3.9, max: 3.9, step: 0.01, value: U, format: (v) => num(Number(v)) },
    {
      id: 'level', label: 'level 1 − α', type: 'choice', value: String(level0),
      options: [0.8, 0.9, 0.95, 0.99].map((v) => ({ value: String(v), label: `${v * 100}%` })),
    },
  ], (id, values) => {
    if (id === 'level') {
      level = Number(values.level)
      setBounds(-Z[level], Z[level])
    } else if (id === 'L') setBounds(Math.min(values.L, U - 0.05), U)
    else setBounds(L, Math.max(values.U, L + 0.05))
  })

  const setStep = (k) => {

    if (k >= 1) setBounds(-Z[level], Z[level])
    else setBounds(start[0], start[1])
  }
  setStep(isPrint ? (steps || 1) : 0)
  return { setStep }
}

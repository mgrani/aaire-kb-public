// The Bayesian reading of an estimate (Principle 6, tier 3).
//
// Normal data with known σ and a flat prior give the posterior
// θ | x ~ N(θ̂, SE(θ̂)²) with θ̂ = x̄ and SE(θ̂) = σ/√n. The curve is that
// posterior, shaded over its credible interval, with θ̂ and SE(θ̂) marked; the
// sample sits as dots on the same axis; one SE is drawn from θ̂, away from θ.
// The figure opens on the true θ alone, a fixed line; the sample and the
// posterior follow, centred apart from θ. "New sample" redraws the data (the
// posterior moves, θ does not); "Add data" grows the sample (the posterior
// narrows and closes in on θ).
//
// The opening sample is shifted to have mean `start`, so the first frame
// matches the numbers on the slide.
//
// params: theta (true value), sigma, n, start (θ̂ of the opening sample),
//         level (0.80 | 0.95 | 0.99), domain [lo, hi], seed
// steps: 0 the true θ alone · 1 the opening sample and its posterior ·
//        2 the invitation to draw data

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#dc2626'
const VIOLET = '#7c3aed'
const GREEN = '#16803c'
const MUTED = '#475569'

const Z = { 0.8: 1.2816, 0.95: 1.96, 0.99: 2.5758 }

// SVG fonts place a combining circumflex (θ̂) badly; draw the base letter and
// lift a spacing circumflex over it instead.
function hatted(sel, str) {
  str.split('̂').forEach((part, i, all) => {
    sel.append('tspan').attr('dx', i ? '0.2em' : null).attr('dy', i ? '0.3em' : null).text(part)
    if (i < all.length - 1) sel.append('tspan').attr('dx', '-0.52em').attr('dy', '-0.3em').text('ˆ')
  })
  return sel
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 720
  const H = 420
  const M = { top: 80, bottom: 92, left: 24, right: 24 }
  const theta = params.theta ?? 100
  const sigma = params.sigma ?? 6
  const n0 = params.n ?? 4
  const start = params.start ?? 103
  const [lo, hi] = params.domain ?? [84, 122]
  const seed = params.seed ?? 20261025

  const x = d3.scaleLinear([lo, hi], [M.left, W - M.right])
  const BASE = H - M.bottom
  const RUG = BASE + 50

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Posterior distribution of θ with its credible interval, the sample, and the fixed true θ')
  const caption = svg.append('text').attr('x', W / 2).attr('y', 24)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  svg.append('g').attr('transform', `translate(0,${BASE})`).attr('color', NAVY)
    .call(d3.axisBottom(x).ticks(8)).attr('font-size', 13)
  const rugLabel = svg.append('text').attr('x', M.left).attr('y', RUG - 14).attr('font-size', 13)
    .attr('fill', MUTED).text('the sample x')
  const gPost = svg.append('g')
  const gData = svg.append('g')
  const gTruth = svg.append('g')
  const readout = svg.append('text').attr('x', W / 2).attr('y', H - 6)
    .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', NAVY)

  let next = rng(seed)
  const draw = (k) => Array.from({ length: k }, () => {
    const u = Math.max(next(), 1e-12)
    return theta + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
  })
  const opening = () => {
    next = rng(seed)
    const xs = draw(n0)
    const shift = start - d3.mean(xs)
    return xs.map((v) => v + shift)
  }

  let data = opening()
  let level = params.level ?? 0.95
  let step = 0

  function render() {
    const n = data.length
    const est = d3.mean(data)
    const se = sigma / Math.sqrt(n)
    const z = Z[level] ?? 1.96
    const [cl, cu] = [est - z * se, est + z * se]
    const f = (t) => Math.exp(-((t - est) ** 2) / (2 * se * se))
    // the curve is drawn relative to its own peak: the narrowing shows in the
    // width, on the fixed axis
    const y = (v) => BASE - v * (BASE - M.top - 40)
    const pts = d3.range(lo, hi + 0.01, (hi - lo) / 400).map((t) => [t, f(t)])
    const shade = d3.range(Math.max(lo, cl), Math.min(hi, cu) + 1e-9, (cu - cl) / 200).map((t) => [t, f(t)])

    // labels go on the side of θ̂ away from the true θ, so the two never meet
    const side = est >= theta ? 1 : -1
    const anchor = side > 0 ? 'start' : 'end'

    gPost.selectAll('*').remove()
    gTruth.selectAll('*').remove()
    readout.text('')
    caption.text('')
    rugLabel.attr('display', step >= 1 ? null : 'none')
    gData.selectAll('circle').data(step >= 1 ? data.filter((v) => v >= lo && v <= hi) : []).join('circle')
      .attr('cx', (d) => x(d)).attr('cy', RUG).attr('r', n > 40 ? 3 : 5)
      .attr('fill', NAVY).attr('fill-opacity', n > 40 ? 0.45 : 0.8)

    gTruth.append('line').attr('x1', x(theta)).attr('x2', x(theta)).attr('y1', M.top - 20).attr('y2', RUG + 10)
      .attr('stroke', VIOLET).attr('stroke-width', 3)
    gTruth.append('text').attr('x', step >= 1 ? x(theta) - 6 * side : x(theta)).attr('y', M.top - 24)
      .attr('text-anchor', step >= 1 ? (side > 0 ? 'end' : 'start') : 'middle')
      .attr('font-size', 16).attr('fill', VIOLET).text('true θ (unknown)')

    if (step === 0) {
      caption.text('The true θ: one fixed number, unknown to us')
      readout.text('θ does not vary — only the sample we will draw does')
      return
    }

    gPost.append('path').datum(shade)
      .attr('d', d3.area().x((d) => x(d[0])).y0(BASE).y1((d) => y(d[1])))
      .attr('fill', TEAL).attr('opacity', 0.35)
    gPost.append('path').datum(pts)
      .attr('d', d3.line().x((d) => x(d[0])).y((d) => y(d[1])))
      .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 3)
    gPost.append('line').attr('x1', x(est)).attr('x2', x(est)).attr('y1', M.top - 6).attr('y2', BASE)
      .attr('stroke', RED).attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4')
    hatted(gPost.append('text').attr('x', x(est) + 6 * side).attr('y', M.top - 4)
      .attr('text-anchor', anchor).attr('font-size', 16).attr('fill', RED), `θ̂ = ${est.toFixed(1)}`)
    // one SE as a length, from θ̂ away from the true θ
    const yb = y(0.45)
    gPost.append('path')
      .attr('d', `M ${x(est)} ${yb} H ${x(est + side * se)} M ${x(est + side * se)} ${yb - 7} v 14`)
      .attr('stroke', NAVY).attr('stroke-width', 2.5).attr('fill', 'none')
    hatted(gPost.append('text').attr('x', x(est) + 6 * side).attr('y', yb + 22)
      .attr('text-anchor', anchor).attr('font-size', 13).attr('fill', NAVY), `SE(θ̂) = ${se.toFixed(1)}`)

    const covers = cl <= theta && theta <= cu
    const interval = `${Math.round(level * 100)}% credible [${cl.toFixed(1)}, ${cu.toFixed(1)}]`
    hatted(readout, `n = ${n}  ·  θ̂ = ${est.toFixed(1)}  ·  SE(θ̂) = ${se.toFixed(2)}  ·  ${interval}`)
    readout.append('tspan').attr('fill', covers ? GREEN : RED)
      .text(covers ? '  ·  contains θ' : '  ·  misses θ')

    hatted(caption,
      step >= 2 ? 'Draw a new sample, or add data: what moves, and what does not?'
      : 'One sample x: what we know about θ — centred apart from θ',
    )
  }

  addControls(
    el,
    { isPrint },
    [
      { id: 'again', label: 'New sample', type: 'button' },
      { id: 'more', label: `Add ${n0} points`, type: 'button' },
      { id: 'reset', label: 'Reset', type: 'button' },
      {
        id: 'level', label: 'credibility', type: 'choice', value: String(level),
        options: [0.8, 0.95, 0.99].map((v) => ({ value: String(v), label: `${v * 100}%` })),
      },
    ],
    (id, values) => {
      if (id === 'again') data = draw(data.length)
      if (id === 'more') data = data.concat(draw(n0))
      if (id === 'reset') data = opening()
      level = Number(values.level)
      render()
    },
  )

  const setStep = (i) => {
    step = i
    render()
  }
  setStep(isPrint ? steps || 2 : steps ? 0 : 2)
  return { setStep }
}

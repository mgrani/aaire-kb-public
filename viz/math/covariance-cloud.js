// Covariance detects linear co-variation, and nothing else (tier 3).
//
// Slide ρ and the cloud tilts; the reported covariance follows it. Then switch
// the relation to Y = X² — a cloud that is *completely determined* by X and
// whose covariance is nevertheless zero. That is the unit's load-bearing
// warning, made visible instead of asserted.
//
// Uses only: sample, mean, covariance.
//
// params: rho (starting correlation), n (points), seed
// steps: 1 the cloud · 2 the means, as crosshairs · 3 the four quadrants
//        signed · 4 the invitation to switch relation

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#16803c'
const RED = '#dc2626'
const PALE = '#eef2f6'

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 700
  const H = 400
  const N = params.n ?? 150
  const seed = params.seed ?? 20260910
  const PLOT = { l: 56, r: 24, t: 62, b: 44 }

  const x = d3.scaleLinear().domain([-3.2, 3.2]).range([PLOT.l, W - PLOT.r])
  const y = d3.scaleLinear().domain([-3.2, 3.2]).range([H - PLOT.b, PLOT.t])

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'A scatter of two variables with the sign of each quadrant marked')

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 24).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  const gQuad = svg.append('g')
  const gPts = svg.append('g')
  const gCross = svg.append('g')
  const readout = svg.append('text')
    .attr('x', W - PLOT.r).attr('y', PLOT.t - 8).attr('text-anchor', 'end')
    .attr('font-size', 19).attr('fill', NAVY)

  svg.append('g').attr('transform', `translate(0,${H - PLOT.b})`).attr('color', NAVY)
    .call(d3.axisBottom(x).ticks(5)).attr('font-size', 14)
  svg.append('g').attr('transform', `translate(${PLOT.l},0)`).attr('color', NAVY)
    .call(d3.axisLeft(y).ticks(5)).attr('font-size', 14)

  // Standard normals via Box–Muller, seeded so the picture is reproducible.
  const base = (() => {
    const next = rng(seed)
    return Array.from({ length: N }, () => {
      const u = Math.max(next(), 1e-12)
      const r = Math.sqrt(-2 * Math.log(u))
      const t = 2 * Math.PI * next()
      return [r * Math.cos(t), r * Math.sin(t)]
    })
  })()

  function points(cfg) {
    if (cfg.relation === 'square') {
      // Y = X² − 1, centred so E[Y] ≈ 0 and the symmetry is visible. Not
      // clamped: a clamp would flatten the parabola's arms into a line and
      // bias the covariance; the few points above the plot are hidden instead.
      return base.map(([a]) => [a, a * a - 1])
    }
    const rho = cfg.rho
    return base.map(([a, b]) => [a, rho * a + Math.sqrt(Math.max(0, 1 - rho * rho)) * b])
  }

  function render(step, cfg) {
    const pts = points(cfg)
    const mx = d3.mean(pts, (d) => d[0])
    const my = d3.mean(pts, (d) => d[1])
    const cov = d3.mean(pts, (d) => (d[0] - mx) * (d[1] - my))

    gQuad.selectAll('*').remove()
    gCross.selectAll('*').remove()

    if (step >= 3) {
      // The sign of (x−x̄)(y−ȳ) is the sign of the quadrant; covariance is
      // their average, so a balanced cloud averages to zero.
      const quads = [
        { x0: mx, x1: 3.2, y0: my, y1: 3.2, s: '+' },
        { x0: -3.2, x1: mx, y0: -3.2, y1: my, s: '+' },
        { x0: -3.2, x1: mx, y0: my, y1: 3.2, s: '−' },
        { x0: mx, x1: 3.2, y0: -3.2, y1: my, s: '−' },
      ]
      gQuad.selectAll('rect').data(quads).join('rect')
        .attr('x', (d) => x(d.x0)).attr('y', (d) => y(d.y1))
        .attr('width', (d) => x(d.x1) - x(d.x0)).attr('height', (d) => y(d.y0) - y(d.y1))
        .attr('fill', (d) => (d.s === '+' ? GREEN : RED)).attr('opacity', 0.1)
      gQuad.selectAll('text').data(quads).join('text')
        .attr('x', (d) => x((d.x0 + d.x1) / 2)).attr('y', (d) => y((d.y0 + d.y1) / 2) + 10)
        .attr('text-anchor', 'middle').attr('font-size', 52)
        .attr('fill', (d) => (d.s === '+' ? GREEN : RED)).attr('opacity', 0.35)
        .text((d) => d.s)
    } else {
      gQuad.append('rect')
        .attr('x', PLOT.l).attr('y', PLOT.t)
        .attr('width', W - PLOT.r - PLOT.l).attr('height', H - PLOT.b - PLOT.t)
        .attr('fill', PALE)
    }

    gPts.selectAll('circle').data(pts).join('circle')
      .attr('cx', (d) => x(d[0])).attr('cy', (d) => y(d[1]))
      .attr('r', 3.2).attr('fill', TEAL).attr('opacity', (d) => (d[1] > 3.2 ? 0 : 0.75))

    if (step >= 2) {
      gCross.append('line')
        .attr('x1', x(mx)).attr('x2', x(mx)).attr('y1', PLOT.t).attr('y2', H - PLOT.b)
        .attr('stroke', NAVY).attr('stroke-width', 1.6).attr('stroke-dasharray', '5 4')
      gCross.append('line')
        .attr('x1', PLOT.l).attr('x2', W - PLOT.r).attr('y1', y(my)).attr('y2', y(my))
        .attr('stroke', NAVY).attr('stroke-width', 1.6).attr('stroke-dasharray', '5 4')
    }

    readout.attr('opacity', step >= 3 ? 1 : 0)
      .attr('fill', Math.abs(cov) < 0.12 ? RED : NAVY)
      .text(`cov(X, Y) = ${cov.toFixed(2)}`)

    if (cfg.relation === 'square') {
      caption.attr('fill', RED).text('Y is determined by X exactly — and the covariance is ≈ 0')
    } else if (step >= 4) {
      caption.attr('fill', NAVY).text('Slide ρ, then switch the relation. Predict the covariance first.')
    } else if (step === 3) {
      caption.attr('fill', NAVY).text('Covariance averages the signs. Which quadrants dominate?')
    } else if (step === 2) {
      caption.attr('fill', NAVY).text('Deviations are measured from the two means')
    } else {
      caption.attr('fill', NAVY).text('Two variables, one point per observation')
    }
  }

  let step = 0
  const controls = addControls(
    el,
    { isPrint },
    [
      { id: 'rho', label: 'ρ', type: 'range', min: -0.95, max: 0.95, step: 0.05,
        value: params.rho ?? 0.7, format: (v) => v.toFixed(2) },
      { id: 'relation', label: 'relation', type: 'choice', value: 'linear',
        options: [{ value: 'linear', label: 'linear' }, { value: 'square', label: 'Y = X² − 1' }] },
    ],
    (id, values) => render(step, values),
  )

  const setStep = (i) => {
    step = i
    render(i, controls.values)
  }
  setStep(isPrint ? steps || 3 : steps ? 0 : 3)
  return { setStep }
}

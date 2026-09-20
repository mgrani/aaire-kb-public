// Gradient descent on a quadratic loss surface: each step is one parameter
// update, so the learning-rate trade-off becomes visible
// (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// Reused by: ml/basics/algorithm-lms, ml/linear-models/regression-optimization-methods,
// ml/neural-networks/gradient-descent.
//
// params:
//   eta:   learning rate (default 0.25)
//   start: initial parameter value (default -2.6)
//   compare: optional second learning rate drawn alongside

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#b5322e'
const RULE = '#dde3ea'

// Loss L(w) = w^2 + 0.4w + 1  (a stand-in for RSS in one parameter)
const L = (w) => w * w + 0.4 * w + 1
const dL = (w) => 2 * w + 0.4

function path(start, eta, n) {
  const pts = [start]
  let w = start
  for (let i = 0; i < n; i++) {
    w = w - eta * dL(w)
    if (!isFinite(w) || Math.abs(w) > 6) { pts.push(Math.sign(w) * 6); break }
    pts.push(w)
  }
  return pts
}

export async function mount(el, { d3, params, steps }) {
  const eta = params.eta ?? 0.25
  const start = params.start ?? -2.6
  const compare = params.compare
  const W = 700
  const H = 380
  const M = { top: 52, right: 28, bottom: 50, left: 62 }
  const N = Math.max(steps, 6)

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const x = d3.scaleLinear([-3.2, 3.2], [M.left, W - M.right])
  const y = d3.scaleLinear([0, L(3.2)], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(6)).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(4)).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 16).text('parameter w')
  svg.append('text').attr('x', M.left - 40).attr('y', M.top - 22)
    .attr('fill', NAVY).attr('font-size', 16).text('loss')

  const curve = d3.range(-3.2, 3.21, 0.05).map((w) => [w, L(w)])
  svg.append('path').datum(curve)
    .attr('d', d3.line().x((p) => x(p[0])).y((p) => y(p[1])))
    .attr('fill', 'none').attr('stroke', RULE).attr('stroke-width', 3)

  const caption = svg.append('text').attr('x', W / 2).attr('y', 28)
    .attr('text-anchor', 'middle').attr('font-size', 20).attr('fill', NAVY)

  const series = [{ eta, colour: TEAL }]
  if (compare !== undefined) series.push({ eta: compare, colour: RED })
  const layers = series.map((s) => ({
    ...s,
    pts: path(start, s.eta, N),
    line: svg.append('path').attr('fill', 'none').attr('stroke', s.colour).attr('stroke-width', 2).attr('opacity', 0.7),
    dots: svg.append('g'),
  }))

  function render(step) {
    const k = Math.max(0, Math.min(step, N))
    for (const l of layers) {
      const shown = l.pts.slice(0, k + 1)
      l.line.attr('d', d3.line().x((w) => x(w)).y((w) => y(L(w)))(shown))
      const sel = l.dots.selectAll('circle').data(shown)
      sel.join('circle')
        .attr('cx', (w) => x(w)).attr('cy', (w) => y(L(w)))
        .attr('r', (_, i) => (i === shown.length - 1 ? 7 : 4))
        .attr('fill', l.colour)
        .attr('opacity', (_, i) => (i === shown.length - 1 ? 1 : 0.45))
    }
    const w = layers[0].pts[Math.min(k, layers[0].pts.length - 1)]
    caption.text(
      k === 0
        ? `Start at w = ${start.toFixed(1)},  learning rate η = ${eta}`
        : `Step ${k}:  w = ${w.toFixed(3)},  loss = ${L(w).toFixed(3)}`,
    )
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

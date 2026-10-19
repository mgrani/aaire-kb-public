// Two analysts, two priors, the same data: the posteriors differ after a few
// observations and coincide after many. Each panel shows both Beta posteriors
// for one dataset on the full θ-axis, each with its own height scale, and the
// two posterior means.
//
// params:
//   priors:   [[a, b], [a, b]]   — the two analysts' Beta priors
//   names:    [string, string]   — legend labels
//   datasets: [[h, n], [h, n]]   — yeses h out of n, one per panel
//   xLabel:   axis label
// steps: 0 the small dataset · 1 adds the large one

const NAVY = '#164374'
const TEAL = '#0083A1'
const GRAY = '#8a8a8a'
const RULE = '#dde3ea'

// Beta(a, b) density on a grid, normalised numerically (log-space, so the
// large exponents of the many-data posterior do not overflow).
function betaCurve(a, b, n = 800) {
  const pts = []
  for (let i = 1; i < n; i++) {
    const x = i / n
    pts.push([x, (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)])
  }
  const top = Math.max(...pts.map((p) => p[1]))
  const raw = pts.map(([x, l]) => [x, Math.exp(l - top)])
  const sum = raw.reduce((s, p) => s + p[1], 0) / n
  return raw.map(([x, y]) => [x, y / sum])
}

const fmt = (v) => v.toFixed(2)

export async function mount(el, { d3, params, steps }) {
  const priors = params.priors ?? [[1, 1], [10, 10]]
  const names = params.names ?? ['flat prior Beta(1, 1)', '"near a half" Beta(10, 10)']
  const datasets = params.datasets ?? [[3, 10], [300, 1000]]
  const colors = [NAVY, TEAL]
  const W = 860
  const H = 372
  const PAD = 14
  const PW = 380
  const GAP = W - 2 * PW - 2 * PAD
  const TOP = 104
  const BOTTOM = 306

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Posteriors of two priors after little and after much data')

  // Legend
  names.forEach((name, i) => {
    const lx = i * (W / 2) + PAD
    svg.append('line').attr('x1', lx).attr('x2', lx + 36).attr('y1', 20).attr('y2', 20)
      .attr('stroke', colors[i]).attr('stroke-width', 4)
    svg.append('text').attr('x', lx + 46).attr('y', 27).attr('font-size', 21)
      .attr('fill', colors[i]).text(name)
  })

  const x = d3.scaleLinear([0, 1], [0, PW])
  const panels = datasets.map(([h, n], k) => {
    const g = svg.append('g').attr('transform', `translate(${PAD + k * (PW + GAP)},0)`)
    const posts = priors.map(([a, b]) => ({ a: a + h, b: b + n - h }))
    const curves = posts.map((p) => betaCurve(p.a, p.b))
    const yMax = Math.max(...curves.flat().map((p) => p[1])) * 1.1
    const y = d3.scaleLinear([0, yMax], [BOTTOM, TOP])
    const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]))

    g.append('text').attr('x', PW / 2).attr('y', 66).attr('text-anchor', 'middle')
      .attr('font-size', 24).attr('font-weight', 700).attr('fill', NAVY)
      .text(`${h.toLocaleString('en')} of ${n.toLocaleString('en')} came back`)
    g.append('g').attr('transform', `translate(0,${BOTTOM})`)
      .call(d3.axisBottom(x).ticks(5)).attr('font-size', 16).attr('color', GRAY)
    g.append('text').attr('x', PW).attr('y', BOTTOM + 48).attr('text-anchor', 'end')
      .attr('font-size', 18).attr('fill', GRAY).text(params.xLabel ?? 'θ')

    curves.forEach((c, i) => {
      g.append('path').attr('d', line(c)).attr('fill', 'none')
        .attr('stroke', colors[i]).attr('stroke-width', 3.5)
    })
    // Posterior means, labelled on opposite sides so they never collide.
    posts.forEach((p, i) => {
      const m = p.a / (p.a + p.b)
      g.append('line').attr('x1', x(m)).attr('x2', x(m)).attr('y1', BOTTOM).attr('y2', BOTTOM - 14)
        .attr('stroke', colors[i]).attr('stroke-width', 3)
      g.append('text')
        .attr('x', x(m) + (i === 0 ? -8 : 8)).attr('y', TOP - 6)
        .attr('text-anchor', i === 0 ? 'end' : 'start')
        .attr('font-size', 20).attr('fill', colors[i]).text(`mean ${fmt(m)}`)
    })
    g.append('line').attr('x1', 0).attr('x2', PW).attr('y1', BOTTOM).attr('y2', BOTTOM)
      .attr('stroke', RULE)
    return g
  })

  function render(step) {
    panels.forEach((g, k) => g.attr('opacity', k <= step ? 1 : 0.08))
  }
  render(steps ?? 1)
  return { setStep: render }
}

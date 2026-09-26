// What "keep the peak" keeps and what it drops: one Beta posterior, read
// three ways (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2). Lecture 02 read
// a posterior as a peak, a mean and an interval; maximum likelihood keeps only
// the first.
//
// params:
//   posterior: [a, b]  — the Beta(a, b) posterior to draw (a, b ≥ 1; default [4, 8])
//   prior:     [a, b]  — optional prior, drawn dashed grey for reference
//   xLabel:    axis label (default 'θ')
//   title:     caption above the plot (default 'Posterior Beta(a, b)')
//   peakName:  word for the peak (default 'peak')
//
// Steps: 0 the curve · 1 the peak (what the shortcut keeps) · 2 the mean and
// the central 95% interval (what it drops). Axes are fixed across steps.
// Without data-steps the figure is static and shows all three readings.

const NAVY = '#164374'
const TEAL = '#0083A1'
const AMBER = '#d97706'
const GRAY = '#8a8a8a'

// Beta(a, b) density on a fine grid, normalised numerically (no gamma
// function needed). Endpoints are included; a = 1 or b = 1 keeps them finite.
function betaGrid(a, b, n = 2000) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const x = i / n
    const la = a === 1 ? 0 : (a - 1) * Math.log(x)
    const lb = b === 1 ? 0 : (b - 1) * Math.log(1 - x)
    const y = Math.exp(la + lb)
    pts.push([x, Number.isFinite(y) ? y : 0])
  }
  // trapezoid normalisation
  let area = 0
  for (let i = 1; i <= n; i++) area += ((pts[i][1] + pts[i - 1][1]) / 2) / n
  return pts.map(([x, y]) => [x, y / area])
}

function quantile(pts, q) {
  let acc = 0
  const n = pts.length - 1
  for (let i = 1; i <= n; i++) {
    const step = ((pts[i][1] + pts[i - 1][1]) / 2) / n
    if (acc + step >= q) {
      const f = step > 0 ? (q - acc) / step : 0
      return pts[i - 1][0] + f / n
    }
    acc += step
  }
  return 1
}

const fmt = (v) => v.toFixed(2)

export async function mount(el, { d3, params, steps }) {
  const [a, b] = params.posterior ?? [4, 8]
  const prior = params.prior
  const peakName = params.peakName ?? 'peak'
  const W = 720
  const H = 410
  const M = { top: 104, right: 34, bottom: 52, left: 56 }

  const pts = betaGrid(a, b)
  const mode = a + b > 2 ? (a - 1) / (a + b - 2) : 0.5
  const mean = a / (a + b)
  const lo = quantile(pts, 0.025)
  const hi = quantile(pts, 0.975)
  const yMax = Math.max(...pts.map((p) => p[1])) * 1.08

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Beta(${a}, ${b}) posterior with its peak ${fmt(mode)}, mean ${fmt(mean)} and 95% interval [${fmt(lo)}, ${fmt(hi)}]`)
  const x = d3.scaleLinear([0, 1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, yMax], [H - M.bottom, M.top])
  const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]))
  const area = d3.area().x((p) => x(p[0])).y0(y(0)).y1((p) => y(p[1]))

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5)).attr('font-size', 14).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 18).text(params.xLabel ?? 'θ')
  svg.append('text')
    .attr('transform', `translate(${M.left - 16},${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 18).text('density')
  svg.append('text').attr('x', W / 2).attr('y', 24).attr('text-anchor', 'middle')
    .attr('fill', NAVY).attr('font-size', 21).text(params.title ?? `Posterior Beta(${a}, ${b})`)

  // the spread layer (step 2): shaded 95% interval and the mean
  const spread = svg.append('g').attr('class', 'spread')
  spread.append('path').attr('d', area(pts.filter((p) => p[0] >= lo && p[0] <= hi)))
    .attr('fill', AMBER).attr('fill-opacity', 0.16)
  const bracketY = H - M.bottom - 12
  spread.append('path')
    .attr('d', `M${x(lo)},${bracketY - 7} V${bracketY} H${x(hi)} V${bracketY - 7}`)
    .attr('fill', 'none').attr('stroke', AMBER).attr('stroke-width', 2.5)
  spread.append('line').attr('x1', x(mean)).attr('x2', x(mean)).attr('y1', y(0)).attr('y2', M.top - 30)
    .attr('stroke', AMBER).attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4')

  if (prior) {
    svg.append('path').attr('d', line(betaGrid(prior[0], prior[1], 400)))
      .attr('fill', 'none').attr('stroke', GRAY).attr('stroke-width', 2).attr('stroke-dasharray', '6 5')
  }
  svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 4)

  // the peak layer (step 1)
  const peak = svg.append('g').attr('class', 'peak')
  peak.append('line').attr('x1', x(mode)).attr('x2', x(mode)).attr('y1', y(0)).attr('y2', M.top - 58)
    .attr('stroke', NAVY).attr('stroke-width', 3)
  peak.append('circle').attr('cx', x(mode)).attr('cy', y(Math.max(...pts.map((p) => p[1])))).attr('r', 6)
    .attr('fill', NAVY)

  // Labels on two rows above the plot; anchored away from the right edge.
  const label = (g, at, row, text, colour) => {
    const right = at > 0.7
    g.append('text').attr('x', x(at) + (right ? -8 : 8)).attr('y', row)
      .attr('text-anchor', right ? 'end' : 'start').attr('fill', colour)
      .attr('font-size', 17).attr('font-weight', 'bold').text(text)
  }
  label(peak, mode, M.top - 46, `${peakName} ${fmt(mode)} — kept`, NAVY)
  label(spread, mean, M.top - 18, `mean ${fmt(mean)} · 95%: [${fmt(lo)}, ${fmt(hi)}] — dropped`, AMBER)

  function render(step) {
    peak.attr('opacity', step >= 1 ? 1 : 0)
    spread.attr('opacity', step >= 2 ? 1 : 0)
  }

  // A stepless slide shows the full reading (the runtime calls setStep(0)).
  const full = steps === 0
  const set = (i) => render(full ? 2 : i)
  set(steps)
  return { setStep: set }
}

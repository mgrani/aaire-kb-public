// Linear regression as a conditional distribution p(y | x) = N(w·x, σ²), on
// house prices (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2). Two views:
//
//   view "bells": flats of 40–120 m²; the fitted line is the mean of a
//     Gaussian at every x. Steps: 0 data · 1 fitted line · 2 bells.
//   view "villa": the same fit asked about a 600 m² villa. Steps: 0 data,
//     line and the plug-in band ŷ ± 1.96 σ̂ · 1 the villa and its interval ·
//     2 the band that also counts the uncertainty about w (Lecture 07).
//
// params:
//   view:    "bells" | "villa"            (default "bells")
//   data:    [[m², k€], …]                 (default: 20 flats, fixed)
//   bellsAt: x positions of the bells      (default [50, 80, 110])
//   query:   x of the extrapolation case   (default 600)
//
// The fit, σ̂ (maximum likelihood, RSS/n) and both bands are computed here
// from the data, so the numbers on the slide can be checked against it.

const NAVY = '#164374'
const TEAL = '#0083A1'
const AMBER = '#d97706'
const RULE = '#dde3ea'

// Per-instance ids: a deck may mount this figure twice (two views), and
// url(#id) resolves to the first element with that id.
let instances = 0

const FLATS = [
  [41, 124], [47, 176], [50, 165], [51, 199], [56, 212], [63, 228], [62, 178],
  [71, 246], [75, 269], [78, 282], [81, 259], [85, 292], [89, 295], [94, 315],
  [99, 368], [103, 343], [110, 381], [113, 409], [117, 393], [120, 412],
]

function fit(data) {
  const n = data.length
  const xb = data.reduce((s, d) => s + d[0], 0) / n
  const yb = data.reduce((s, d) => s + d[1], 0) / n
  let sxx = 0, sxy = 0
  for (const [x, y] of data) { sxx += (x - xb) ** 2; sxy += (x - xb) * (y - yb) }
  const w1 = sxy / sxx
  const w0 = yb - w1 * xb
  const rss = data.reduce((s, [x, y]) => s + (y - w0 - w1 * x) ** 2, 0)
  const sigma = Math.sqrt(rss / n) // the peak of the likelihood in σ²: RSS/n
  // half-width of the 95% band with parameter uncertainty (flat prior, σ fixed)
  const wide = (x) => 1.96 * sigma * Math.sqrt(1 + 1 / n + (x - xb) ** 2 / sxx)
  return { w0, w1, sigma, wide, predict: (x) => w0 + w1 * x }
}

export async function mount(el, { d3, params, steps }) {
  const view = params.view ?? 'bells'
  const data = params.data ?? FLATS
  const bellsAt = params.bellsAt ?? [50, 80, 110]
  const q = params.query ?? 600
  const f = fit(data)
  const half = 1.96 * f.sigma

  const W = 720
  const H = 420
  const M = { top: 50, right: 30, bottom: 56, left: 74 }
  const villa = view === 'villa'
  const xDom = villa ? [0, 650] : [30, 130]
  const yDom = villa ? [0, 2400] : [60, 480]

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', villa
      ? `House-price fit extrapolated to a ${q} m² villa: plug-in band ±${Math.round(half)} k€, with parameter uncertainty ±${Math.round(f.wide(q))} k€`
      : 'House prices against floor area with the fitted line and a Gaussian bell at three sizes')
  const x = d3.scaleLinear(xDom, [M.left, W - M.right])
  const y = d3.scaleLinear(yDom, [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(villa ? 7 : 6)).attr('font-size', 14).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6)).attr('font-size', 14).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 17).text('floor area x (m²)')
  svg.append('text')
    .attr('transform', `translate(18,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 17).text('price y (k€)')

  const caption = svg.append('text').attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('fill', NAVY).attr('font-size', 19)

  const clip = `M${M.left},${M.top}H${W - M.right}V${H - M.bottom}H${M.left}Z`
  const plot = svg.append('g')
  const cid = `cg-clip-${++instances}`
  svg.append('clipPath').attr('id', cid).append('path').attr('d', clip)
  plot.attr('clip-path', `url(#${cid})`)

  if (villa) {
    // where the data lives
    plot.append('rect').attr('x', x(40)).attr('width', x(120) - x(40))
      .attr('y', M.top).attr('height', H - M.bottom - M.top).attr('fill', RULE).attr('opacity', 0.6)
    svg.append('text').attr('x', x(80)).attr('y', (M.top + H - M.bottom) / 2).attr('text-anchor', 'middle')
      .attr('fill', NAVY).attr('font-size', 14).text('training data')
  }

  const xs = d3.range(xDom[0], xDom[1] + 0.5, (xDom[1] - xDom[0]) / 200)
  const bandArea = d3.area().x((v) => x(v)).y0((v) => y(f.predict(v) - half)).y1((v) => y(f.predict(v) + half))

  // layer: plug-in band (villa view, step 0)
  const band = plot.append('path').attr('d', bandArea(xs)).attr('fill', NAVY).attr('opacity', 0.18)

  // layer: widened band (villa view, step 2)
  const wideG = plot.append('g')
  for (const s of [1, -1]) {
    wideG.append('path')
      .attr('d', d3.line().x((v) => x(v)).y((v) => y(f.predict(v) + s * f.wide(v)))(xs))
      .attr('fill', 'none').attr('stroke', AMBER).attr('stroke-width', 2.5).attr('stroke-dasharray', '7 5')
  }

  // layer: the fitted line
  const lineG = plot.append('path')
    .attr('d', d3.line().x((v) => x(v)).y((v) => y(f.predict(v)))(xs))
    .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 3)

  // layer: bells (bells view, step 2) — N(ŷ, σ̂²) drawn sideways at each x
  const bells = plot.append('g')
  const bellW = 11 // m² for the peak of the bell
  for (const bx of bellsAt) {
    const mu = f.predict(bx)
    const ys = d3.range(-3.2, 3.21, 0.1).map((z) => [mu + z * f.sigma, Math.exp(-z * z / 2)])
    const shape = d3.line().x((p) => x(bx + bellW * p[1])).y((p) => y(p[0]))
    bells.append('path').attr('d', shape(ys) + `L${x(bx)},${y(ys[ys.length - 1][0])}L${x(bx)},${y(ys[0][0])}Z`)
      .attr('fill', NAVY).attr('fill-opacity', 0.14).attr('stroke', NAVY).attr('stroke-width', 2)
    bells.append('line').attr('x1', x(bx)).attr('x2', x(bx))
      .attr('y1', y(mu - 3.2 * f.sigma)).attr('y2', y(mu + 3.2 * f.sigma))
      .attr('stroke', NAVY).attr('stroke-width', 1.5)
  }

  // data points
  plot.append('g').selectAll('circle').data(data).join('circle')
    .attr('cx', (d) => x(d[0])).attr('cy', (d) => y(d[1])).attr('r', villa ? 3.5 : 5)
    .attr('fill', TEAL).attr('stroke', '#ffffff').attr('stroke-width', 1)

  // villa query (villa view, steps 1–2)
  const query = svg.append('g')
  const yq = f.predict(q)
  const bar = (g, hw, colour, width, dx) => {
    g.append('path')
      .attr('d', `M${x(q) + dx - 7},${y(yq - hw)}H${x(q) + dx + 7}M${x(q) + dx},${y(yq - hw)}V${y(yq + hw)}M${x(q) + dx - 7},${y(yq + hw)}H${x(q) + dx + 7}`)
      .attr('stroke', colour).attr('stroke-width', width).attr('fill', 'none')
  }
  bar(query, half, NAVY, 3, 0)
  query.append('circle').attr('cx', x(q)).attr('cy', y(yq)).attr('r', 6).attr('fill', '#ffffff')
    .attr('stroke', NAVY).attr('stroke-width', 3)
  // Labels sit as a legend in the empty upper left, clear of the bands.
  const lx = x(135)
  query.append('text').attr('x', lx).attr('y', M.top + 26)
    .attr('fill', NAVY).attr('font-size', 17).attr('font-weight', 'bold')
    .text(`${q} m² villa: ${Math.round(yq)} ± ${Math.round(half)} k€ (plug-in)`)
  const wideQ = svg.append('g')
  bar(wideQ, f.wide(q), AMBER, 3, 16)
  wideQ.append('text').attr('x', lx).attr('y', M.top + 54)
    .attr('fill', AMBER).attr('font-size', 17).attr('font-weight', 'bold')
    .text(`with uncertainty in w: ± ${Math.round(f.wide(q))} k€`)

  // The villa layers do not belong to the bells view (their labels would sit
  // outside its x-range).
  if (!villa) { query.remove(); wideQ.remove(); wideG.remove(); band.remove() }

  function render(step) {
    if (villa) {
      band.attr('opacity', 0.22)
      lineG.attr('opacity', 1)
      bells.attr('opacity', 0)
      query.attr('opacity', step >= 1 ? 1 : 0)
      wideG.attr('opacity', step >= 2 ? 1 : 0)
      wideQ.attr('opacity', step >= 2 ? 1 : 0)
      caption.text(step >= 2
        ? 'The peak dropped the uncertainty about w — it grows off the data'
        : `Plug-in band ŷ ± 1.96·σ̂ = ŷ ± ${Math.round(half)} k€, equally wide everywhere`)
    } else {
      band.attr('opacity', 0)
      wideG.attr('opacity', 0)
      query.attr('opacity', 0)
      wideQ.attr('opacity', 0)
      lineG.attr('opacity', step >= 1 ? 1 : 0)
      bells.attr('opacity', step >= 2 ? 1 : 0)
      caption.text(step >= 2
        ? `p(y | x) = N(ŵ₀ + ŵ₁x, σ̂²), σ̂ = ${Math.round(f.sigma)} k€ — the same bell at every x`
        : step >= 1
          ? `The fitted line ŷ = ${f.w0.toFixed(0)} + ${f.w1.toFixed(2)}·x`
          : `${data.length} flats, 40–120 m²`)
    }
  }

  render(steps)
  return { setStep: render }
}

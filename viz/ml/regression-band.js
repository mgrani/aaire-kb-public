// Bayesian linear regression on house prices: the predictive band and its two
// terms (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2). PML Lecture 07 pays
// off Lecture 01's promise here: the predictive variance at a query x* is
//
//   σ²  (noise, aleatoric)  +  x*ᵀ S_N x*  (parameter, epistemic)
//
// params (all optional; the defaults are the numbers on the slides):
//   sigma:   noise standard deviation in k€ (default 40, treated as known)
//   priorSd: [intercept sd in k€, slope sd in k€/m²] of the zero-mean
//            Gaussian prior (default [500, 10])
//   query:   the far query size in m² (default 600, L01's villa)
//   near:    a query size inside the data (default 80)
//
// Steps (data-steps="4"):
//   0  the data: 20 flats of 40–120 m², and the 600 m² query
//   1  keep the peak (L03): least-squares line, plug-in band ±2σ everywhere
//   2  the posterior: plausible lines agree on the flats and fan out far away
//   3  the predictive band, split into the noise and the parameter part,
//      with the variance shares at 80 m² and 600 m²
//   4  ten villas of 550–650 m² join the data: the parameter part collapses,
//      the noise part stays
//
// The data are fixed so that the numbers match the slides: the flats follow
// 3.5 k€/m² with noise whose least-squares residual sd is 40 k€.

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#dc2626'
const GREEN = '#16803c'
const GRAY = '#8a8a8a'
const RULE = '#dde3ea'
const INK = '#333333'

const FLATS_X = [40, 44, 48, 53, 57, 61, 65, 69, 74, 78, 82, 86, 91, 95, 99, 103, 107, 112, 116, 120]
const FLATS_Y = [157, 207, 114, 241, 199, 188, 200, 204, 248, 294, 299, 314, 255, 272, 384, 379, 430, 415, 357, 443]
const VILLAS_X = [550, 561, 572, 583, 594, 606, 617, 628, 639, 650]
const VILLAS_Y = [1900, 1984, 2014, 2056, 2133, 2068, 2133, 2148, 2239, 2325]

let instances = 0

// 2×2 helpers — the model has an intercept and a slope, nothing more.
const inv2 = ([[a, b], [c, d]]) => {
  const det = a * d - b * c
  return [[d / det, -b / det], [-c / det, a / det]]
}

function posterior(xs, ys, sigma, priorSd) {
  // S_N^{-1} = S_0^{-1} + σ^{-2} XᵀX,  m_N = σ^{-2} S_N Xᵀy
  const s2 = sigma * sigma
  let n = 0, sx = 0, sxx = 0, sy = 0, sxy = 0
  xs.forEach((x, i) => { n += 1; sx += x; sxx += x * x; sy += ys[i]; sxy += x * ys[i] })
  const P = [[1 / priorSd[0] ** 2 + n / s2, sx / s2], [sx / s2, 1 / priorSd[1] ** 2 + sxx / s2]]
  const S = inv2(P)
  const b = [sy / s2, sxy / s2]
  const m = [S[0][0] * b[0] + S[0][1] * b[1], S[1][0] * b[0] + S[1][1] * b[1]]
  const paramVar = (x) => S[0][0] + 2 * S[0][1] * x + S[1][1] * x * x
  return { m, S, mean: (x) => m[0] + m[1] * x, paramVar }
}

function leastSquares(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2 })
  const w1 = sxy / sxx
  const w0 = my - w1 * mx
  const res = xs.map((x, i) => ys[i] - w0 - w1 * x)
  const s = Math.sqrt(res.reduce((a, r) => a + r * r, 0) / (n - 2))
  return { w0, w1, s }
}

// Seeded standard normals (mulberry32 + Box–Muller): the posterior lines are
// identical on every reload, forwards and backwards, and in the PDF export.
function normals(seed, count) {
  let a = seed >>> 0
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = []
  while (out.length < count) {
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-9, u())))
    const th = 2 * Math.PI * u()
    out.push(r * Math.cos(th), r * Math.sin(th))
  }
  return out.slice(0, count)
}

const fmt = (v) => Math.round(v).toLocaleString('en-US')

export async function mount(el, { d3, params, steps }) {
  const sigma = params.sigma ?? 40
  const priorSd = params.priorSd ?? [500, 10]
  const query = params.query ?? 600
  const near = params.near ?? 80
  const uid = `rb${++instances}`

  const W = 760, H = 450
  const M = { top: 44, right: 22, bottom: 50, left: 70 }
  const X0 = 0, X1 = 700, Y0 = 0, Y1 = 2800

  const flats = posterior(FLATS_X, FLATS_Y, sigma, priorSd)
  const all = posterior(FLATS_X.concat(VILLAS_X), FLATS_Y.concat(VILLAS_Y), sigma, priorSd)
  const ls = leastSquares(FLATS_X, FLATS_Y)

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Bayesian regression of house prices: predictive band split into a noise and a parameter term')
  const x = d3.scaleLinear([X0, X1], [M.left, W - M.right])
  const y = d3.scaleLinear([Y0, Y1], [H - M.bottom, M.top])

  svg.append('defs').append('clipPath').attr('id', `plot-${uid}`)
    .append('rect').attr('x', M.left).attr('y', M.top)
    .attr('width', W - M.left - M.right).attr('height', H - M.top - M.bottom)
  const clip = `url(#plot-${uid})`

  // axes (fixed across all steps)
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).tickValues([0, 100, 200, 300, 400, 500, 600, 700]))
    .attr('font-size', 15).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).tickValues([0, 500, 1000, 1500, 2000, 2500]).tickFormat((v) => fmt(v)))
    .attr('font-size', 15).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 15).text('living area (m²)')
  svg.append('text')
    .attr('transform', `translate(18,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 15).text('price (k€)')

  const plot = svg.append('g').attr('clip-path', clip)
  const grid = d3.range(X0, X1 + 0.1, 5)

  // query marker
  plot.append('line').attr('x1', x(query)).attr('x2', x(query)).attr('y1', y(Y0)).attr('y2', y(Y1))
    .attr('stroke', GRAY).attr('stroke-dasharray', '5 5').attr('stroke-width', 1.5)
  svg.append('text').attr('x', x(query)).attr('y', M.top - 6).attr('text-anchor', 'middle')
    .attr('fill', GRAY).attr('font-size', 15).text(`${query} m² villa`)

  // layers, bottom to top
  const plugBand = plot.append('path').attr('fill', '#cfd5dd').attr('opacity', 0.9)
  const totalBand = plot.append('path').attr('fill', RED).attr('opacity', 0.14)
  const paramBand = plot.append('path').attr('fill', GREEN).attr('opacity', 0.28)
  const noiseLines = plot.append('g')
  const sampleLines = plot.append('g')
  const meanLine = plot.append('path').attr('fill', 'none').attr('stroke-width', 3)

  plot.append('g').selectAll('circle').data(FLATS_X).join('circle')
    .attr('cx', (d) => x(d)).attr('cy', (_, i) => y(FLATS_Y[i])).attr('r', 4.5)
    .attr('fill', TEAL).attr('stroke', 'white').attr('stroke-width', 1)
  const villaDots = plot.append('g').selectAll('circle').data(VILLAS_X).join('circle')
    .attr('cx', (d) => x(d)).attr('cy', (_, i) => y(VILLAS_Y[i])).attr('r', 4.5)
    .attr('fill', TEAL).attr('stroke', 'white').attr('stroke-width', 1)

  // posterior lines, drawn from N(m_N, S_N) of the flats-only posterior
  const S = flats.S
  const l11 = Math.sqrt(S[0][0])
  const l21 = S[1][0] / l11
  const l22 = Math.sqrt(S[1][1] - l21 * l21)
  const z = normals(20260926, 30)
  const lines = d3.range(15).map((k) => {
    const a = z[2 * k], b = z[2 * k + 1]
    return [flats.m[0] + l11 * a, flats.m[1] + l21 * a + l22 * b]
  })

  // caption and readouts (top-left is empty: the data sit bottom-left)
  const caption = svg.append('text').attr('x', M.left + 4).attr('y', 22)
    .attr('fill', NAVY).attr('font-size', 19).attr('font-weight', 600)
  const readout = svg.append('g').attr('transform', `translate(${M.left + 14},${M.top + 14})`)

  const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]))
  const area = d3.area().x((p) => x(p[0])).y0((p) => y(p[1])).y1((p) => y(p[2]))

  function drawReadout(post, show) {
    readout.selectAll('*').remove()
    if (!show) return
    const rows = [near, query].map((q) => {
      const pv = post.paramVar(q)
      const nv = sigma * sigma
      return { q, mean: post.mean(q), p: Math.sqrt(pv), t: Math.sqrt(pv + nv), share: pv / (pv + nv) }
    })
    readout.append('text').attr('x', 0).attr('y', 0).attr('font-size', 15).attr('fill', INK)
      .text('share of the variance:')
    const barW = 180
    rows.forEach((r, i) => {
      const gy = 18 + i * 66
      const g = readout.append('g').attr('transform', `translate(0,${gy})`)
      g.append('text').attr('x', 0).attr('y', 15).attr('font-size', 16).attr('font-weight', 700)
        .attr('fill', NAVY).text(`${r.q} m²`)
      g.append('rect').attr('x', 62).attr('y', 2).attr('width', barW * (1 - r.share)).attr('height', 16)
        .attr('fill', RED).attr('opacity', 0.75)
      g.append('rect').attr('x', 62 + barW * (1 - r.share)).attr('y', 2).attr('width', barW * r.share)
        .attr('height', 16).attr('fill', GREEN).attr('opacity', 0.8)
      g.append('text').attr('x', 0).attr('y', 40).attr('font-size', 15).attr('fill', INK)
        .text(`mean ${fmt(r.mean)} · sd: noise ${fmt(sigma)}, parameter ${fmt(r.p)} → total ${fmt(r.t)} k€`)
    })
    // legend on the header line, above the rows: the band never reaches up there
    readout.append('rect').attr('x', 190).attr('y', -11).attr('width', 12).attr('height', 12).attr('fill', RED).attr('opacity', 0.75)
    readout.append('text').attr('x', 207).attr('y', 0).attr('font-size', 15).attr('fill', INK).text('noise σ² (aleatoric)')
    readout.append('rect').attr('x', 365).attr('y', -11).attr('width', 12).attr('height', 12).attr('fill', GREEN).attr('opacity', 0.8)
    readout.append('text').attr('x', 382).attr('y', 0).attr('font-size', 15).attr('fill', INK).text('parameter (epistemic)')
  }

  const CAPTIONS = [
    '20 flats of 40–120 m² — and a question about 600 m²',
    'Keep the peak (Lecture 03): one line, ±2σ = ±80 k€ everywhere',
    'The posterior: plausible lines agree on the flats, fan out at 600 m²',
    'Predictive variance = noise term + parameter term (band: ±2 sd)',
    'Ten villas: the parameter term collapses, the noise term stays',
  ]

  function render(stepIn) {
    const step = Math.max(0, Math.min(4, stepIn))
    caption.text(CAPTIONS[step])
    villaDots.attr('opacity', step >= 4 ? 1 : 0)

    // step 1: plug-in band
    if (step === 1) {
      plugBand.attr('d', area(grid.map((g) => [g, ls.w0 + ls.w1 * g - 2 * ls.s, ls.w0 + ls.w1 * g + 2 * ls.s])))
        .attr('opacity', 0.9)
      meanLine.attr('d', line(grid.map((g) => [g, ls.w0 + ls.w1 * g]))).attr('stroke', NAVY).attr('opacity', 1)
    } else {
      plugBand.attr('opacity', 0)
    }

    // step 2: posterior sample lines
    sampleLines.selectAll('path').data(step === 2 ? lines : []).join('path')
      .attr('d', ([w0, w1]) => line([[X0, w0 + w1 * X0], [X1, w0 + w1 * X1]]))
      .attr('fill', 'none').attr('stroke', GREEN).attr('stroke-width', 1.6).attr('opacity', 0.7)

    // steps 3–4: predictive band split into its two parts
    const post = step >= 4 ? all : flats
    if (step >= 3) {
      const tot = grid.map((g) => {
        const sd = Math.sqrt(post.paramVar(g) + sigma * sigma)
        return [g, post.mean(g) - 2 * sd, post.mean(g) + 2 * sd]
      })
      const par = grid.map((g) => {
        const sd = Math.sqrt(post.paramVar(g))
        return [g, post.mean(g) - 2 * sd, post.mean(g) + 2 * sd]
      })
      totalBand.attr('d', area(tot)).attr('opacity', 0.14)
      paramBand.attr('d', area(par)).attr('opacity', 0.28)
      noiseLines.selectAll('path').data([-2, 2]).join('path')
        .attr('d', (k) => line(grid.map((g) => [g, post.mean(g) + k * sigma])))
        .attr('fill', 'none').attr('stroke', RED).attr('stroke-width', 1.5).attr('stroke-dasharray', '6 4')
      meanLine.attr('d', line(grid.map((g) => [g, post.mean(g)]))).attr('stroke', NAVY).attr('opacity', 1)
    } else {
      totalBand.attr('opacity', 0)
      paramBand.attr('opacity', 0)
      noiseLines.selectAll('path').remove()
    }
    if (step === 0 || step === 2) meanLine.attr('opacity', 0)
    drawReadout(post, step >= 3)
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

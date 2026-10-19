// Joint distributions, drawn (Principle 6, tier 2).
//
// One module, five views of the same two objects: a discrete joint (the
// boys-and-girls table of the joint unit) and a continuous joint (a two-bump
// mixture of Gaussians, so its marginals are not trivially normal).
//
// params.view:
//   "dimensions"       univariate curve · bivariate cloud with contours ·
//                      a 3×3 scatter matrix — one, two, three-or-more columns
//   "mass-density"     side by side: the joint PMF as a heatmap, one
//                      probability per cell; the joint density as contours,
//                      a region R shaded and its probability computed
//   "marginal-density" the density with both marginals projected onto the
//                      axes; steps: 1 p(x) on top · 2 p(y) on the right
//   "marginal-table"   the PMF heatmap with row and column sums projected
//                      onto the margins; steps: 1 p(B) · 2 p(G) and the total
//
// Uses only: random variables, joint distribution, marginalisation.

import { rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const PALE = '#eef2f6'
const RULE = '#dde3ea'
const GREY = '#6b7280'

// p(B, G): rows B = 0..3 boys, columns G = 0..3 girls
const JOINT = [
  [0.15, 0.1, 0.0875, 0.0375],
  [0.1, 0.175, 0.1125, 0],
  [0.0875, 0.1125, 0, 0],
  [0.0375, 0, 0, 0],
]
const fmt = (p) => (p === 0 ? '0' : p === 1 ? '1' : String(+p.toFixed(4)).replace(/^0/, ''))

// Two-bump mixture: the continuous running example.
const COMP = [
  { w: 0.55, mx: -0.9, my: -0.6, sx: 0.75, sy: 0.65, r: 0.45 },
  { w: 0.45, mx: 1.3, my: 1.1, sx: 0.7, sy: 0.75, r: -0.3 },
]
function dens(x, y) {
  let s = 0
  for (const c of COMP) {
    const u = (x - c.mx) / c.sx
    const v = (y - c.my) / c.sy
    const q = (u * u - 2 * c.r * u * v + v * v) / (1 - c.r * c.r)
    s += (c.w * Math.exp(-q / 2)) / (2 * Math.PI * c.sx * c.sy * Math.sqrt(1 - c.r * c.r))
  }
  return s
}
function sampleMixture(n, seed) {
  const next = rng(seed)
  const gauss = () => {
    const u = Math.max(next(), 1e-12)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
  }
  return Array.from({ length: n }, () => {
    const c = next() < COMP[0].w ? COMP[0] : COMP[1]
    const a = gauss()
    const b = gauss()
    return [c.mx + c.sx * a, c.my + c.sy * (c.r * a + Math.sqrt(1 - c.r * c.r) * b)]
  })
}

const LO = -3
const HI = 3.4
const NG = 80 // grid resolution for contours and numeric marginals
const step = (HI - LO) / (NG - 1)
const gx = (i) => LO + i * step
const GRID = (() => {
  const v = new Array(NG * NG)
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) v[j * NG + i] = dens(gx(i), gx(j))
  return v
})()
// Marginalisation, literally: sum the grid along one axis (Riemann sum).
const MARG_X = d3range(NG).map((i) => d3range(NG).reduce((s, j) => s + GRID[j * NG + i], 0) * step)
const MARG_Y = d3range(NG).map((j) => d3range(NG).reduce((s, i) => s + GRID[j * NG + i], 0) * step)
function d3range(n) { return Array.from({ length: n }, (_, i) => i) }

// Filled contour bands of the density in the box [x0,x1]×[y0,y1] (pixels).
function drawContours(d3, g, sx, sy, { fill = true, levels = 6 } = {}) {
  const max = d3.max(GRID)
  const thresholds = d3range(levels).map((k) => (max * (k + 0.6)) / (levels + 0.4))
  const bands = d3.contours().size([NG, NG]).thresholds(thresholds)(GRID)
  const path = d3.geoPath(d3.geoTransform({
    point(px, py) { this.stream.point(sx(LO + (px - 0.5) * step), sy(LO + (py - 0.5) * step)) },
  }))
  const shade = d3.interpolateRgb('#ffffff', NAVY)
  g.selectAll('path.band').data(bands).join('path').attr('class', 'band')
    .attr('d', path)
    .attr('fill', (d, k) => (fill ? shade(0.12 + (0.6 * k) / levels) : 'none'))
    .attr('stroke', NAVY).attr('stroke-width', 1).attr('stroke-opacity', 0.55)
}

export async function mount(el, { d3, params, steps }) {
  const view = params.view ?? 'mass-density'
  const draw = {
    dimensions: drawDimensions,
    'mass-density': drawMassDensity,
    'marginal-density': drawMarginalDensity,
    'marginal-table': drawMarginalTable,
  }[view]
  return draw(d3, el, steps)
}

function svgOf(d3, el, W, H, label) {
  return d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img').attr('aria-label', label)
}

// ── one, two, three-or-more variables ───────────────────────────────────────
function drawDimensions(d3, el) {
  const W = 960
  const H = 330
  const svg = svgOf(d3, el, W, H, 'A univariate density, a bivariate cloud and a scatter matrix of three variables')
  const pts = sampleMixture(160, 20261010)
  const panels = [
    ['Univariate', 'p(x) — one column'],
    ['Bivariate', 'p(x, y) — two columns'],
    ['Multivariate', 'p(x, y, z, …) — three or more'],
  ]
  panels.forEach(([t, s], k) => {
    const cx = 160 + k * 320
    svg.append('text').attr('x', cx).attr('y', 24).attr('text-anchor', 'middle')
      .attr('font-size', 21).attr('font-weight', 700).attr('fill', NAVY).text(t)
    svg.append('text').attr('x', cx).attr('y', H - 8).attr('text-anchor', 'middle')
      .attr('font-size', 17).attr('fill', GREY).text(s)
  })
  const T = 50
  const B = 290

  // 1 · the x-marginal of the mixture as a curve
  const x1 = d3.scaleLinear([LO, HI], [20, 300])
  const y1 = d3.scaleLinear([0, d3.max(MARG_X) * 1.1], [B, T + 20])
  const area = d3.area().x((d, i) => x1(gx(i))).y0(B).y1((d) => y1(d)).curve(d3.curveBasis)
  svg.append('path').attr('d', area(MARG_X)).attr('fill', PALE).attr('stroke', NAVY).attr('stroke-width', 2.2)
  svg.append('line').attr('x1', 20).attr('x2', 300).attr('y1', B).attr('y2', B).attr('stroke', NAVY)
  svg.append('text').attr('x', 306).attr('y', B + 5).attr('font-size', 16).attr('fill', NAVY).text('x')
  svg.append('g').selectAll('line').data(pts.slice(0, 60)).join('line')
    .attr('x1', (d) => x1(d[0])).attr('x2', (d) => x1(d[0])).attr('y1', B).attr('y2', B + 9)
    .attr('stroke', TEAL).attr('stroke-opacity', 0.6)

  // 2 · cloud + contours
  const x2 = d3.scaleLinear([LO, HI], [340, 620])
  const y2 = d3.scaleLinear([LO, HI], [B, T - 10])
  const g2 = svg.append('g')
  g2.append('rect').attr('x', 340).attr('y', y2(HI)).attr('width', 280).attr('height', B - y2(HI)).attr('fill', '#fff').attr('stroke', RULE)
  drawContours(d3, g2, x2, y2, { fill: false, levels: 4 })
  g2.selectAll('circle').data(pts).join('circle')
    .attr('cx', (d) => x2(d[0])).attr('cy', (d) => y2(d[1])).attr('r', 2.6)
    .attr('fill', TEAL).attr('opacity', (d) => (d[1] > HI || d[1] < LO || d[0] < LO || d[0] > HI ? 0 : 0.7))
  svg.append('text').attr('x', 614).attr('y', B - 6).attr('text-anchor', 'end').attr('font-size', 16).attr('fill', NAVY).text('x')
  svg.append('text').attr('x', 348).attr('y', y2(HI) + 18).attr('font-size', 16).attr('fill', NAVY).text('y')

  // 3 · scatter matrix of (x, y, z)
  const next = rng(7)
  const vars = pts.map(([a, b]) => [a, b, 0.6 * a - 0.5 * b + 0.7 * (next() - 0.5) * 2])
  const names = ['x', 'y', 'z']
  const C = 76
  const G = 6
  const ox = 160 + 640 - (3 * C + 2 * G) / 2
  const oy = T - 4
  const ext = [0, 1, 2].map((v) => d3.extent(vars, (d) => d[v]))
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const X = ox + c * (C + G)
      const Y = oy + r * (C + G)
      const cell = svg.append('g')
      cell.append('rect').attr('x', X).attr('y', Y).attr('width', C).attr('height', C)
        .attr('fill', r === c ? PALE : '#fff').attr('stroke', RULE)
      const sx = d3.scaleLinear(ext[c], [X + 5, X + C - 5])
      if (r === c) {
        const bins = d3.bin().domain(ext[c]).thresholds(9)(vars.map((d) => d[c]))
        const sy = d3.scaleLinear([0, d3.max(bins, (b) => b.length)], [Y + C - 4, Y + 20])
        cell.selectAll('rect.bar').data(bins).join('rect').attr('class', 'bar')
          .attr('x', (b) => sx(b.x0) + 0.5).attr('width', (b) => Math.max(0, sx(b.x1) - sx(b.x0) - 1))
          .attr('y', (b) => sy(b.length)).attr('height', (b) => Y + C - 4 - sy(b.length))
          .attr('fill', NAVY).attr('opacity', 0.75)
        cell.append('text').attr('x', X + 6).attr('y', Y + 16).attr('font-size', 15)
          .attr('font-weight', 700).attr('fill', NAVY).text(names[c])
      } else {
        const sy = d3.scaleLinear(ext[r], [Y + C - 5, Y + 5])
        cell.selectAll('circle').data(vars).join('circle')
          .attr('cx', (d) => sx(d[c])).attr('cy', (d) => sy(d[r])).attr('r', 1.4)
          .attr('fill', TEAL).attr('opacity', 0.65)
      }
    }
  }
  return {}
}

// ── discrete joint: a heatmap of p(B, G) ─────────────────────────────────────
function heatmap(d3, g, L, T, CW, CH, fs) {
  const max = 0.175
  const shade = d3.interpolateRgb('#f7f9fc', NAVY)
  JOINT.forEach((row, b) => row.forEach((p, gi) => {
    const t = p / max
    g.append('rect').attr('x', L + gi * CW).attr('y', T + b * CH).attr('width', CW).attr('height', CH)
      .attr('fill', p === 0 ? '#fff' : shade(0.1 + 0.75 * t)).attr('stroke', RULE)
    g.append('text').attr('x', L + gi * CW + CW / 2).attr('y', T + b * CH + CH / 2 + fs * 0.35)
      .attr('text-anchor', 'middle').attr('font-size', fs)
      .attr('fill', p === 0 ? '#b6c0cc' : t > 0.55 ? '#fff' : NAVY).text(fmt(p))
  }))
  d3range(4).forEach((k) => {
    g.append('text').attr('x', L + k * CW + CW / 2).attr('y', T - 10).attr('text-anchor', 'middle')
      .attr('font-size', fs).attr('fill', NAVY).text(`G=${k}`)
    g.append('text').attr('x', L - 10).attr('y', T + k * CH + CH / 2 + fs * 0.35).attr('text-anchor', 'end')
      .attr('font-size', fs).attr('fill', NAVY).text(`B=${k}`)
  })
}

// ── side by side: a joint PMF as a grid, a joint density as contours ─────────
function drawMassDensity(d3, el) {
  const W = 920
  const H = 380
  const svg = svgOf(d3, el, W, H, 'Left: the joint PMF of boys and girls as a shaded grid. Right: contours of a joint density with a region R')

  // left: one probability per cell
  const C = 72
  const L = 120
  const T = 40
  heatmap(d3, svg.append('g'), L, T, C, C, 20)
  svg.append('text').attr('x', L + 2 * C).attr('y', T + 4 * C + 38).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', GREY).text('one probability per cell · all sum to 1')

  // right: darker = denser, R shaded, its probability computed
  const P = { l: 520, r: 880, t: 14, b: 330 }
  const sx = d3.scaleLinear([LO, HI], [P.l, P.r])
  const sy = d3.scaleLinear([LO, HI], [P.b, P.t])
  svg.append('rect').attr('x', P.l).attr('y', P.t).attr('width', P.r - P.l).attr('height', P.b - P.t)
    .attr('fill', '#fff').attr('stroke', RULE)
  drawContours(d3, svg.append('g'), sx, sy)
  const R = { x0: 0.2, x1: 2.2, y0: 0.1, y1: 2.1 }
  let pr = 0
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
    const x = gx(i)
    const y = gx(j)
    if (x >= R.x0 && x <= R.x1 && y >= R.y0 && y <= R.y1) pr += GRID[j * NG + i] * step * step
  }
  svg.append('rect').attr('x', sx(R.x0)).attr('y', sy(R.y1))
    .attr('width', sx(R.x1) - sx(R.x0)).attr('height', sy(R.y0) - sy(R.y1))
    .attr('fill', TEAL).attr('fill-opacity', 0.18).attr('stroke', TEAL).attr('stroke-width', 3)
  svg.append('text').attr('x', sx(R.x1) - 8).attr('y', sy(R.y1) + 26).attr('text-anchor', 'end')
    .attr('font-size', 24).attr('font-weight', 700).attr('fill', TEAL).text('R')
  svg.append('text').attr('x', P.r - 8).attr('y', P.b - 10).attr('text-anchor', 'end').attr('font-size', 20).attr('fill', NAVY).text('a')
  svg.append('text').attr('x', P.l + 10).attr('y', P.t + 26).attr('font-size', 20).attr('fill', NAVY).text('b')
  svg.append('text').attr('x', (P.l + P.r) / 2).attr('y', H - 12).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', TEAL).text(`darker = denser · volume over R ≈ ${pr.toFixed(2)}`)
  return {}
}

// ── marginals of the density, projected onto the axes ───────────────────────
function drawMarginalDensity(d3, el, steps) {
  const W = 600
  const H = 500
  const svg = svgOf(d3, el, W, H, 'A joint density with its two marginal densities drawn along the axes')
  const P = { l: 10, r: 410, t: 140, b: 490 }
  const sx = d3.scaleLinear([LO, HI], [P.l, P.r])
  const sy = d3.scaleLinear([LO, HI], [P.b, P.t])
  svg.append('rect').attr('x', P.l).attr('y', P.t).attr('width', P.r - P.l).attr('height', P.b - P.t).attr('fill', '#fff').attr('stroke', RULE)
  drawContours(d3, svg.append('g'), sx, sy)
  svg.append('text').attr('x', P.r - 8).attr('y', P.b - 10).attr('text-anchor', 'end').attr('font-size', 22).attr('fill', NAVY).text('x')
  svg.append('text').attr('x', P.l + 10).attr('y', P.t + 26).attr('font-size', 22).attr('fill', NAVY).text('y')

  const mmax = Math.max(d3.max(MARG_X), d3.max(MARG_Y))
  const top = svg.append('g')
  const right = svg.append('g')
  const hX = d3.scaleLinear([0, mmax], [P.t - 8, 16])
  const wY = d3.scaleLinear([0, mmax], [P.r + 8, W - 10])
  top.append('path')
    .attr('d', d3.area().x((d, i) => sx(gx(i))).y0(P.t - 8).y1((d) => hX(d)).curve(d3.curveBasis)(MARG_X))
    .attr('fill', VIOLET).attr('fill-opacity', 0.18).attr('stroke', VIOLET).attr('stroke-width', 3)
  top.append('text').attr('x', P.r + 14).attr('y', 50).attr('font-size', 24).attr('fill', VIOLET).text('p(x)')
  top.append('text').attr('x', P.r + 14).attr('y', 78).attr('font-size', 18).attr('fill', GREY).text('sum over y')
  right.append('path')
    .attr('d', d3.area().y((d, j) => sy(gx(j))).x0(P.r + 8).x1((d) => wY(d)).curve(d3.curveBasis)(MARG_Y))
    .attr('fill', VIOLET).attr('fill-opacity', 0.18).attr('stroke', VIOLET).attr('stroke-width', 3)
  right.append('text').attr('x', W - 4).attr('y', P.b - 34).attr('text-anchor', 'end').attr('font-size', 24).attr('fill', VIOLET).text('p(y)')
  right.append('text').attr('x', W - 4).attr('y', P.b - 8).attr('text-anchor', 'end').attr('font-size', 18).attr('fill', GREY).text('sum over x')

  // one column being summed: its total is one point of p(x)
  const xs = 1.3
  const iX = Math.round((xs - LO) / step)
  const strip = svg.append('g')
  strip.append('rect').attr('x', sx(gx(iX)) - 6).attr('y', P.t).attr('width', 12).attr('height', P.b - P.t)
    .attr('fill', VIOLET).attr('fill-opacity', 0.22).attr('stroke', VIOLET).attr('stroke-dasharray', '4 3')
  strip.append('circle').attr('cx', sx(gx(iX))).attr('cy', hX(MARG_X[iX])).attr('r', 6).attr('fill', VIOLET)

  function render(s) {
    top.attr('opacity', s >= 1 ? 1 : 0)
    strip.attr('opacity', s >= 1 ? 1 : 0)
    right.attr('opacity', s >= 2 ? 1 : 0)
  }
  render(steps)
  return { setStep: render }
}

// ── marginals of the table, projected onto the margins ──────────────────────
function drawMarginalTable(d3, el, steps) {
  const W = 700
  const H = 420
  const svg = svgOf(d3, el, W, H, 'The joint table of boys and girls with row sums and column sums drawn in the margins')
  const CW = 100
  const CH = 62
  const L = 74
  const T = 36
  const FS = 26
  heatmap(d3, svg.append('g'), L, T, CW, CH, FS)
  const pB = JOINT.map((r) => d3.sum(r))
  const pG = d3range(4).map((k) => d3.sum(JOINT, (r) => r[k]))

  // row sums → p(B), bars to the right
  const right = svg.append('g')
  const RX = L + 4 * CW + 10
  const bl = d3.scaleLinear([0, 0.4], [0, 110])
  pB.forEach((p, b) => {
    const y = T + b * CH + CH / 2
    right.append('rect').attr('x', RX).attr('y', y - 15).attr('width', bl(p)).attr('height', 30)
      .attr('fill', VIOLET).attr('opacity', 0.8)
    right.append('text').attr('x', RX + 8 + bl(p)).attr('y', y + 8).attr('font-size', FS).attr('fill', NAVY).text(fmt(p))
  })
  right.append('text').attr('x', RX).attr('y', T - 10).attr('font-size', FS).attr('font-weight', 700).attr('fill', VIOLET).text('p(B)')

  // column sums → p(G), bars below
  const bottom = svg.append('g')
  const BY = T + 4 * CH + 10
  const bh = d3.scaleLinear([0, 0.4], [0, 80])
  pG.forEach((p, k) => {
    const x = L + k * CW + CW / 2
    bottom.append('rect').attr('x', x - 18).attr('y', BY).attr('width', 36).attr('height', bh(p))
      .attr('fill', VIOLET).attr('opacity', 0.8)
    bottom.append('text').attr('x', x).attr('y', BY + bh(p) + 28).attr('text-anchor', 'middle').attr('font-size', FS).attr('fill', NAVY).text(fmt(p))
  })
  bottom.append('text').attr('x', L - 10).attr('y', BY + 28).attr('text-anchor', 'end').attr('font-size', FS).attr('font-weight', 700).attr('fill', VIOLET).text('p(G)')
  bottom.append('text').attr('x', RX).attr('y', BY + 28).attr('font-size', FS).attr('fill', NAVY).text('total 1')

  function render(s) {
    right.attr('opacity', s >= 1 ? 1 : 0)
    bottom.attr('opacity', s >= 2 ? 1 : 0)
  }
  render(steps)
  return { setStep: render }
}

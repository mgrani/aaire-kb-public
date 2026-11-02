// Two attributes, two classes: a rule learned from a table against a
// generative model of the same data (PML Lecture 03, Principle 6 tier 3).
//
// Attributes: x_amt = amount (€) and x_dist = distance from the card holder's home
// (km), both on log axes. Each class is a 2D normal in (log amount, log
// distance) — the class-conditional p(x | y; θ) with θ = (means, spreads,
// correlation). The training sample is drawn from the same model with a
// fixed seed, so every frame is reproducible.
//
//   view "rule": the training table as points, then the best box rule
//     "amount > a and distance > b → fraud" (exhaustive threshold search by
//     training errors), then three query transactions the rule cannot tell
//     apart. Steps: 0 points · 1 rule and its score · 2 queries A, B, C.
//   view "generative": p(x | honest) and p(x | fraud) as heatmaps, the prior
//     P(fraud) as a slider, the posterior P(fraud | x) for every x with its
//     0.5 boundary. Steps: 0 likelihoods · 1 prior · 2 posterior · 3 the rule
//     box and the region where p(x) is tiny. Button: draw transactions from
//     the model (sampling).
//   view "discriminative": the same table with a logistic regression
//     P(fraud | x; θ) = σ(θ₀ + θ_amt x_amt + θ_dist x_dist) fitted by maximum
//     likelihood (Newton's method): the posterior as a heatmap with its 0.5
//     line, and nothing about p(x). Steps: 0 the fitted function · 1 the
//     queries A, B, C of the rule view with their probabilities.
//   view "fit": the training table with a normal per class fitted to its rows
//     (means and covariances of the rows), drawn as 1σ and 2σ ellipses, and
//     the 0.5 boundary of the fitted posterior (prior = the training share).
//     Steps: 0 naive (diagonal Σ per class) · 1 full Σ per class · 2 one
//     shared Σ. With params.fraud = "two" the frauds come from two patterns
//     (card testing: small amounts far away; large amounts near home). Steps:
//     0 one normal per class · 1 a mixture of two normals for fraud, fitted
//     with each row's pattern known. A choice control repeats the steps.
//
// params:
//   view:      "rule" | "discriminative" | "generative" | "fit"
//              (default "generative")
//   prior:     P(fraud) for the generative view (default 0.1)
//   startStep: generative view, step to start from (default 0)
//   drawn:     transactions drawn from the model at mount (default 0)
//   fraud:     "one" | "two" — fraud patterns in view "fit" (default "one")

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const ORANGE = '#d97706'
const VIOLET = '#7c3aed'
const RULE = '#dde3ea'
const GREY = '#64748b'

// log10 ranges: amount 3 € … 6,300 €, distance 1 km … 6,300 km
const U = [0.5, 3.8]
const V = [0, 3.8]
const N = 80 // grid resolution

const DEFAULT = {
  honest: { mu: [1.55, 0.9], sd: [0.45, 0.6], rho: 0.15 },
  fraud: { mu: [2.6, 2.3], sd: [0.4, 0.4], rho: 0.5 },
}
const N_TRAIN = { honest: 70, fraud: 35 }
// query transactions for the rule view, in (log amount, log distance)
const QUERIES = [
  { id: 'A', u: 2.05, v: 1.75, note: 'just inside the box' },
  { id: 'B', u: 2.9, v: 2.8, note: 'deep inside the box' },
  { id: 'C', u: 3.55, v: 0.2, note: '3.5k € at 1.6 km — no such row' },
]

// view "fit", fraud = "two": two fraud patterns, honest as in DEFAULT
const TWO = {
  honest: DEFAULT.honest,
  testing: { mu: [0.95, 2.75], sd: [0.25, 0.4], rho: 0 }, // ≈ 9 € at 560 km
  large: { mu: [2.95, 1.05], sd: [0.28, 0.45], rho: 0.2 }, // ≈ 900 € at 11 km
}
const N_TWO = { honest: 70, testing: 18, large: 17 }

// a normal over (u, v) with mean mu and covariance [[a, b], [b, c]]
function gauss(mu, [[a, b], [, c]]) {
  const det = a * c - b * b
  const k = 1 / (2 * Math.PI * Math.sqrt(det))
  return (u, v) => {
    const x = u - mu[0], y = v - mu[1]
    return k * Math.exp(-(c * x * x - 2 * b * x * y + a * y * y) / (2 * det))
  }
}

// mean and covariance of rows (maximum likelihood: divide by n)
function moments(rows) {
  const n = rows.length
  const mu = [rows.reduce((t, p) => t + p.u, 0) / n, rows.reduce((t, p) => t + p.v, 0) / n]
  let a = 0, b = 0, c = 0
  for (const p of rows) {
    const x = p.u - mu[0], y = p.v - mu[1]
    a += x * x; b += x * y; c += y * y
  }
  return { mu, S: [[a / n, b / n], [b / n, c / n]], n }
}

// the 0.5 level line of f (a posterior), by marching squares, so the panel
// frame is never drawn as part of the boundary
function levelPath(f, sx, sy) {
  const M = 120
  const at = (i, j) => [U[0] + i * (U[1] - U[0]) / M, V[0] + j * (V[1] - V[0]) / M]
  const val = []
  for (let i = 0; i <= M; i++) { val.push([]); for (let j = 0; j <= M; j++) val[i].push(f(...at(i, j)) - 0.5) }
  const cross = (i1, j1, i2, j2) => {
    const a = val[i1][j1], b = val[i2][j2]
    const t = a / (a - b)
    const [u1, v1] = at(i1, j1), [u2, v2] = at(i2, j2)
    return [sx(u1 + t * (u2 - u1)), sy(v1 + t * (v2 - v1))]
  }
  let d = ''
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      const pts = []
      const edges = [[i, j, i + 1, j], [i + 1, j, i + 1, j + 1], [i + 1, j + 1, i, j + 1], [i, j + 1, i, j]]
      for (const [a1, b1, a2, b2] of edges) {
        if ((val[a1][b1] > 0) !== (val[a2][b2] > 0)) pts.push(cross(a1, b1, a2, b2))
      }
      for (let k = 0; k + 1 < pts.length; k += 2) {
        d += `M${pts[k][0].toFixed(1)},${pts[k][1].toFixed(1)}L${pts[k + 1][0].toFixed(1)},${pts[k + 1][1].toFixed(1)}`
      }
    }
  }
  return d
}

function density(c, u, v) {
  const a = (u - c.mu[0]) / c.sd[0]
  const b = (v - c.mu[1]) / c.sd[1]
  const r = c.rho
  const q = (a * a - 2 * r * a * b + b * b) / (1 - r * r)
  return Math.exp(-q / 2) / (2 * Math.PI * c.sd[0] * c.sd[1] * Math.sqrt(1 - r * r))
}

function sampler(seed) {
  const r = rng(seed)
  const gauss = () => {
    const s = Math.max(r(), 1e-12)
    return Math.sqrt(-2 * Math.log(s)) * Math.cos(2 * Math.PI * r())
  }
  return {
    r,
    point(c) {
      const z1 = gauss(), z2 = gauss()
      return {
        u: c.mu[0] + c.sd[0] * z1,
        v: c.mu[1] + c.sd[1] * (c.rho * z1 + Math.sqrt(1 - c.rho ** 2) * z2),
      }
    },
  }
}

function trainingTable(model) {
  const s = sampler(20261031)
  const rows = []
  for (const y of ['honest', 'fraud']) {
    for (let i = 0; i < N_TRAIN[y]; i++) rows.push({ ...s.point(model[y]), y })
  }
  return rows.filter((p) => p.u > U[0] && p.u < U[1] && p.v > V[0] && p.v < V[1])
}

// logistic regression on (1, u, v) by Newton's method (IRLS): the maximum
// likelihood weights; the table is not separable, so they are finite
function fitLogistic(rows) {
  const sig = (z) => 1 / (1 + Math.exp(-z))
  const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
    - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
  let w = [0, 0, 0]
  for (let it = 0; it < 30; it++) {
    const Hm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], grad = [0, 0, 0]
    for (const p of rows) {
      const x = [1, p.u, p.v]
      const q = sig(w[0] + w[1] * p.u + w[2] * p.v)
      const t = p.y === 'fraud' ? 1 : 0
      for (let a = 0; a < 3; a++) {
        grad[a] += (t - q) * x[a]
        for (let b = 0; b < 3; b++) Hm[a][b] += q * (1 - q) * x[a] * x[b]
      }
    }
    const D = det(Hm) // Newton step H⁻¹ ∇ by Cramer's rule
    w = w.map((v, k) => v + det(Hm.map((r, i) => r.map((h, j) => (j === k ? grad[i] : h)))) / D)
  }
  return w
}

// the best rule "u > a and v > b → fraud", by training errors
function learnRule(rows) {
  const us = [...new Set(rows.map((p) => p.u))].sort((x, y) => x - y)
  const vs = [...new Set(rows.map((p) => p.v))].sort((x, y) => x - y)
  const cuts = (xs) => [xs[0] - 0.01, ...xs.slice(1).map((x, i) => (x + xs[i]) / 2)]
  let best = null
  for (const a of cuts(us)) {
    for (const b of cuts(vs)) {
      let err = 0, inside = 0, fraudIn = 0
      for (const p of rows) {
        const hit = p.u > a && p.v > b
        if (hit) { inside++; if (p.y === 'fraud') fraudIn++ }
        if (hit !== (p.y === 'fraud')) err++
      }
      if (!best || err < best.err) best = { a, b, err, inside, fraudIn }
    }
  }
  return best
}

const euro = (u) => {
  const x = 10 ** u
  return x >= 1000 ? `${(x / 1000).toFixed(x >= 10000 ? 0 : 1)}k €` : `${Math.round(x)} €`
}
const km = (v) => {
  const x = 10 ** v
  return x >= 1000 ? `${(x / 1000).toFixed(1)}k km` : `${Math.round(x)} km`
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const view = params.view ?? 'generative'
  const W = 900
  const H = 430
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', {
      rule: 'Training transactions by amount and distance, with a learned box rule',
      discriminative: 'Training transactions with a fitted logistic regression: the probability of fraud for every amount and distance',
      fit: 'Training transactions with a normal distribution fitted per class, drawn as ellipses, and the decision boundary',
    }[view] ?? 'Class-conditional densities of two attributes, the prior, and the posterior probability of fraud')
  const caption = svg.append('text').attr('x', W / 2).attr('y', 24)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  const g = svg.append('g')

  // a log-log panel: frame, ticks and scales
  function panel(x, y, w, h, { ticks = true, title = '' } = {}) {
    const sx = d3.scaleLinear().domain(U).range([x, x + w])
    const sy = d3.scaleLinear().domain(V).range([y + h, y])
    const p = g.append('g')
    p.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
      .attr('fill', 'none').attr('stroke', RULE)
    if (title) {
      p.append('text').attr('x', x + w / 2).attr('y', y - 8).attr('text-anchor', 'middle')
        .attr('font-size', 16).attr('font-weight', 700).attr('fill', NAVY).text(title)
    }
    if (ticks) {
      for (const t of [1, 2, 3]) {
        p.append('text').attr('x', sx(t)).attr('y', y + h + 18).attr('text-anchor', 'middle')
          .attr('font-size', 13).attr('fill', GREY).text(euro(t))
      }
      for (const t of [0, 1, 2, 3]) {
        p.append('text').attr('x', x - 6).attr('y', sy(t) + 4).attr('text-anchor', 'end')
          .attr('font-size', 13).attr('fill', GREY).text(km(t))
      }
      // "name x_abbr →" with the abbreviation as a subscript, as on the slides
      const label = (sel, name, sub) => {
        sel.attr('font-size', 14).attr('fill', GREY).text(`${name} x`)
        sel.append('tspan').attr('dy', 4).attr('font-size', 11).text(sub)
        sel.append('tspan').attr('dy', -4).text(' →')
      }
      label(p.append('text').attr('x', x + w).attr('y', y + h + 36).attr('text-anchor', 'end'),
        'amount', 'amt')
      label(p.append('text').attr('transform', `translate(${x - 66},${y}) rotate(-90)`)
        .attr('text-anchor', 'end'), 'distance', 'dist')
    } else {
      p.append('text').attr('x', x + w).attr('y', y + h + 15).attr('text-anchor', 'end')
        .attr('font-size', 12).attr('fill', GREY).text('amount →')
    }
    return { sx, sy }
  }

  // a scalar field over the grid, painted into an image (one pixel per cell)
  function heat(sx, sy, f, colour) {
    const cv = document.createElement('canvas')
    cv.width = N; cv.height = N
    const ctx = cv.getContext('2d')
    const img = ctx.createImageData(N, N)
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const u = U[0] + (i + 0.5) * (U[1] - U[0]) / N
        const v = V[1] - (j + 0.5) * (V[1] - V[0]) / N
        const c = d3.color(colour(f(u, v))) ?? { r: 0, g: 0, b: 0, opacity: 0 }
        const k = 4 * (j * N + i)
        img.data[k] = c.r; img.data[k + 1] = c.g; img.data[k + 2] = c.b
        img.data[k + 3] = Math.round(255 * (c.opacity ?? 1))
      }
    }
    ctx.putImageData(img, 0, 0)
    g.append('image').attr('href', cv.toDataURL())
      .attr('x', sx(U[0])).attr('y', sy(V[1]))
      .attr('width', sx(U[1]) - sx(U[0])).attr('height', sy(V[0]) - sy(V[1]))
      .attr('preserveAspectRatio', 'none')
  }

  function dots(sx, sy, pts, r = 5) {
    for (const p of pts) {
      const fraud = p.y === 'fraud'
      g.append('circle').attr('cx', sx(p.u)).attr('cy', sy(p.v)).attr('r', r)
        .attr('fill', fraud ? ORANGE : '#ffffff').attr('fill-opacity', fraud ? 0.9 : 0.85)
        .attr('stroke', fraud ? '#8a4b06' : NAVY).attr('stroke-width', 1.6)
    }
  }

  function box(sx, sy, rule, dashed) {
    g.append('rect').attr('x', sx(rule.a)).attr('y', sy(V[1]))
      .attr('width', sx(U[1]) - sx(rule.a)).attr('height', sy(rule.b) - sy(V[1]))
      .attr('fill', dashed ? 'none' : ORANGE).attr('fill-opacity', 0.08)
      .attr('stroke', NAVY).attr('stroke-width', 2.5).attr('stroke-dasharray', dashed ? '7 5' : null)
  }

  function legend(x, y) {
    const items = [['honest', '#ffffff', NAVY], ['fraud', ORANGE, '#8a4b06']]
    items.forEach(([t, f, s], i) => {
      g.append('circle').attr('cx', x + i * 100).attr('cy', y).attr('r', 6)
        .attr('fill', f).attr('stroke', s).attr('stroke-width', 1.6)
      g.append('text').attr('x', x + i * 100 + 12).attr('y', y + 5).attr('font-size', 15)
        .attr('fill', NAVY).text(t)
    })
  }

  // the query transactions A, B, C as violet rings
  function queryMarks(sx, sy) {
    for (const q of QUERIES) {
      g.append('circle').attr('cx', sx(q.u)).attr('cy', sy(q.v)).attr('r', 13)
        .attr('fill', '#ffffff').attr('stroke', VIOLET).attr('stroke-width', 3)
      g.append('text').attr('x', sx(q.u)).attr('y', sy(q.v) + 5).attr('text-anchor', 'middle')
        .attr('font-size', 14).attr('font-weight', 700).attr('fill', VIOLET).text(q.id)
    }
  }
  const textLine = (tx) => (y, t, opt = {}) => g.append('text').attr('x', tx).attr('y', y)
    .attr('font-size', opt.size ?? 16).attr('font-weight', opt.bold ? 700 : 400)
    .attr('fill', opt.colour ?? NAVY).text(t)

  // ── view "discriminative" ─────────────────────────────────────────────────
  if (view === 'discriminative') {
    const rows = trainingTable(DEFAULT)
    const w = fitLogistic(rows)
    const post = (u, v) => 1 / (1 + Math.exp(-(w[0] + w[1] * u + w[2] * v)))
    const errors = rows.filter((p) => (post(p.u, p.v) > 0.5) !== (p.y === 'fraud')).length
    const pct = (p) => (p > 0.99 || p < 0.01 ? `${(100 * p).toFixed(1)}%` : `${Math.round(100 * p)}%`)
    const render = (step) => {
      g.selectAll('*').remove()
      const { sx, sy } = panel(110, 50, 400, 320)
      heat(sx, sy, post, (p) => d3.interpolateRgb('#ffffff', ORANGE)(0.8 * p))
      g.append('path').attr('d', levelPath(post, sx, sy)).attr('fill', 'none').attr('stroke', VIOLET)
        .attr('stroke-width', 3).attr('stroke-linecap', 'round')
      dots(sx, sy, rows, 4.5)
      legend(130, 412)
      const line = textLine(560)
      // a line of text with subscripts (and one superscript): parts [text, shift]
      const rich = (y, parts, size = 15) => {
        const t = line(y, '', { size })
        let at = 0 // each tspan's dy is relative to the previous baseline
        for (const [txt, shift] of parts) {
          t.append('tspan').attr('dy', shift - at).attr('font-size', shift ? size * 0.72 : size).text(txt)
          at = shift
        }
      }
      const f1 = (v) => v.toFixed(1).replace('-', '−')
      line(78, 'Logistic regression', { bold: true })
      rich(104, [[`z = ${f1(w[0])} + ${f1(w[1])} log x`, 0], ['amt', 4], [` + ${f1(w[2])} log x`, 0], ['dist', 4]])
      rich(130, [['P(fraud | x) = σ(z) = 1 / (1 + e', 0], ['−z', -6], [')', 0]])
      line(156, 'z: a score, the log-odds — any number', { size: 14, colour: GREY })
      const odds = (v) => Math.round(Math.exp(Number(v.toFixed(1)))) // from the weights as shown
      line(178, `×10 amount: odds ×${odds(w[1])} · ×10 distance: odds ×${odds(w[2])}`,
        { size: 14 })

      // σ maps the score to a probability; the queries sit on the curve
      const ix = d3.scaleLinear().domain([-8, 8]).range([590, 880])
      const iy = d3.scaleLinear().domain([0, 1]).range([352, 214])
      g.append('rect').attr('x', 590).attr('y', 214).attr('width', 290).attr('height', 138)
        .attr('fill', 'none').attr('stroke', RULE)
      g.append('line').attr('x1', 590).attr('x2', 880).attr('y1', iy(0.5)).attr('y2', iy(0.5))
        .attr('stroke', VIOLET).attr('stroke-dasharray', '4 4')
      g.append('path').attr('d', d3.line().x((z) => ix(z)).y((z) => iy(1 / (1 + Math.exp(-z))))(d3.range(-8, 8.01, 0.1)))
        .attr('fill', 'none').attr('stroke', ORANGE).attr('stroke-width', 3)
      for (const [z, t] of [[-8, '−8'], [0, '0'], [8, '8']]) {
        g.append('text').attr('x', ix(z)).attr('y', 368).attr('text-anchor', 'middle')
          .attr('font-size', 12).attr('fill', GREY).text(t)
      }
      for (const [pv, t] of [[0, '0'], [0.5, '0.5'], [1, '1']]) {
        g.append('text').attr('x', 584).attr('y', iy(pv) + 4).attr('text-anchor', 'end')
          .attr('font-size', 12).attr('fill', GREY).text(t)
      }
      g.append('text').attr('x', 880).attr('y', 384).attr('text-anchor', 'end')
        .attr('font-size', 13).attr('fill', GREY).text('score z →')
      g.append('text').attr('x', 596).attr('y', 230).attr('font-size', 13).attr('fill', GREY)
        .text('P(fraud | x) = σ(z)')
      line(412, `${errors} of ${rows.length} training errors · no p(x | y), no p(x)`, { size: 13, colour: GREY })
      if (step >= 1) {
        queryMarks(sx, sy)
        for (const q of QUERIES) {
          const z = w[0] + w[1] * q.u + w[2] * q.v
          const pz = 1 / (1 + Math.exp(-z))
          g.append('circle').attr('cx', ix(z)).attr('cy', iy(pz)).attr('r', 6)
            .attr('fill', '#ffffff').attr('stroke', VIOLET).attr('stroke-width', 3)
          const right = z < 2
          g.append('text').attr('x', ix(z) + (right ? 10 : -10)).attr('y', iy(pz) + (q.id === 'C' ? -8 : 5))
            .attr('text-anchor', right ? 'start' : 'end').attr('font-size', 14).attr('font-weight', 700)
            .attr('fill', VIOLET).attr('paint-order', 'stroke').attr('stroke', '#ffffff').attr('stroke-width', 4)
            .text(`${q.id}: ${pct(pz)}`)
        }
      }
      caption.text([
        'P(fraud | x) as one smooth function of x: three numbers',
        'A and B now differ; C (3.5k € at 1.6 km) still gets an answer, without warning',
      ][Math.min(step, 1)])
    }
    render(isPrint || !steps ? 1 : 0)
    return { setStep: render }
  }

  // ── view "rule" ───────────────────────────────────────────────────────────
  if (view === 'rule') {
    const rows = trainingTable(DEFAULT)
    const rule = learnRule(rows)
    const share = rule.fraudIn / rule.inside
    const render = (step) => {
      g.selectAll('*').remove()
      const { sx, sy } = panel(110, 50, 400, 320)
      if (step >= 1) box(sx, sy, rule, false)
      dots(sx, sy, rows)
      legend(130, 412)
      const line = textLine(560)
      if (step === 0) {
        line(90, `${rows.length} labelled transactions`, { bold: true })
        line(116, 'each row: amount, distance, label')
      }
      if (step >= 1) {
        line(78, 'Learned rule', { bold: true })
        line(104, `if amount > ${euro(rule.a)}`)
        line(128, `and distance > ${km(rule.b)}`)
        line(152, 'then fraud, else honest')
        line(190, `training errors: ${rule.err} of ${rows.length}`)
        line(216, `fraud share in the box: ${Math.round(share * 100)}%`)
        line(238, '— the only "score" the rule has', { size: 14, colour: GREY })
      }
      if (step >= 2) {
        queryMarks(sx, sy)
        QUERIES.forEach((q, i) => {
          const inBox = q.u > rule.a && q.v > rule.b
          line(282 + i * 46, `${q.id}: ${inBox ? `fraud, ${Math.round(share * 100)}%` : 'honest'}`,
            { bold: true, colour: VIOLET })
          line(302 + i * 46, q.note, { size: 14, colour: GREY })
        })
      }
      caption.text([
        'The training table: two attributes, one label',
        'A rule fitted by counting errors — a box in attribute space',
        'A and B get the same answer; C gets one without any warning',
      ][Math.min(step, 2)])
    }
    render(isPrint || !steps ? 2 : 0)
    return { setStep: render }
  }

  // ── view "fit" ────────────────────────────────────────────────────────────
  if (view === 'fit') {
    const two = params.fraud === 'two'
    let rows
    if (two) {
      const s = sampler(20261101)
      rows = []
      for (const z of ['honest', 'testing', 'large']) {
        for (let i = 0; i < N_TWO[z]; i++) {
          rows.push({ ...s.point(TWO[z]), y: z === 'honest' ? 'honest' : 'fraud', z })
        }
      }
      rows = rows.filter((p) => p.u > U[0] && p.u < U[1] && p.v > V[0] && p.v < V[1])
    } else {
      rows = trainingTable(DEFAULT)
    }
    const byClass = (y) => rows.filter((p) => p.y === y)
    const mH = moments(byClass('honest'))
    const mF = moments(byClass('fraud'))
    const prior = mF.n / rows.length
    const pooled = [0, 1].map((i) => [0, 1].map((j) =>
      (mH.n * mH.S[i][j] + mF.n * mF.S[i][j]) / rows.length))
    const diag = (S) => [[S[0][0], 0], [0, S[1][1]]]
    const corr = (S) => S[0][1] / Math.sqrt(S[0][0] * S[1][1])
    // a class model is a list of weighted components { w, mu, S }
    const MODELS = two
      ? {
          one: { honest: [{ w: 1, ...mH }], fraud: [{ w: 1, ...mF }] },
          mix: {
            honest: [{ w: 1, ...mH }],
            fraud: ['testing', 'large'].map((z) => {
              const m = moments(rows.filter((p) => p.z === z))
              return { w: m.n / mF.n, ...m }
            }),
          },
        }
      : {
          naive: { honest: [{ w: 1, mu: mH.mu, S: diag(mH.S) }], fraud: [{ w: 1, mu: mF.mu, S: diag(mF.S) }] },
          full: { honest: [{ w: 1, ...mH }], fraud: [{ w: 1, ...mF }] },
          shared: { honest: [{ w: 1, mu: mH.mu, S: pooled }], fraud: [{ w: 1, mu: mF.mu, S: pooled }] },
        }
    const ORDER = Object.keys(MODELS)
    // per-instance id: a deck mounts this figure more than once
    const clipId = `fit-clip-${Math.random().toString(36).slice(2, 9)}`

    // an ellipse of constant Mahalanobis distance r, traced in data space
    function ellipse(sx, sy, { mu, S }, r, colour, width) {
      const [[a, b], [, c]] = S
      const h = Math.sqrt(((a - c) / 2) ** 2 + b * b)
      const l1 = (a + c) / 2 + h, l2 = (a + c) / 2 - h
      const t = Math.atan2(l1 - a, b) // direction of the first axis
      const e1 = b === 0 ? [a >= c ? 1 : 0, a >= c ? 0 : 1] : [Math.cos(t), Math.sin(t)]
      const e2 = [-e1[1], e1[0]]
      const [s1, s2] = b === 0 ? [Math.sqrt(Math.max(a, c)), Math.sqrt(Math.min(a, c))] : [Math.sqrt(l1), Math.sqrt(l2)]
      const pts = d3.range(0, 2 * Math.PI + 0.01, Math.PI / 60).map((q) => {
        const x = r * (s1 * Math.cos(q) * e1[0] + s2 * Math.sin(q) * e2[0])
        const y = r * (s1 * Math.cos(q) * e1[1] + s2 * Math.sin(q) * e2[1])
        return [sx(mu[0] + x), sy(mu[1] + y)]
      })
      g.append('path').attr('d', d3.line()(pts)).attr('fill', 'none').attr('stroke', colour)
        .attr('stroke-width', width).attr('stroke-dasharray', r > 1 ? '6 4' : null)
        .attr('clip-path', `url(#${clipId})`)
    }

    const render = (key) => {
      g.selectAll('*').remove()
      const m = MODELS[key]
      const dens = (comps) => comps.map((c) => ({ w: c.w, f: gauss(c.mu, c.S) }))
      const dH = dens(m.honest), dF = dens(m.fraud)
      const mix = (cs, u, v) => cs.reduce((t, c) => t + c.w * c.f(u, v), 0)
      const post = (u, v) => {
        const a = mix(dF, u, v) * prior, b = mix(dH, u, v) * (1 - prior)
        return a / (a + b)
      }
      const { sx, sy } = panel(110, 50, 400, 320)
      g.append('clipPath').attr('id', clipId).append('rect')
        .attr('x', 110).attr('y', 50).attr('width', 400).attr('height', 320)
      // the region decided as fraud, faintly
      heat(sx, sy, post, (p) => (p > 0.5 ? 'rgba(217,119,6,0.12)' : 'rgba(0,0,0,0)'))
      dots(sx, sy, rows, 4.5)
      for (const [comps, colour] of [[m.honest, NAVY], [m.fraud, '#8a4b06']]) {
        for (const c of comps) {
          ellipse(sx, sy, c, 1, colour, 2.5)
          ellipse(sx, sy, c, 2, colour, 1.6)
          g.append('text').attr('x', sx(c.mu[0])).attr('y', sy(c.mu[1]) + 6).attr('text-anchor', 'middle')
            .attr('font-size', 18).attr('font-weight', 700).attr('fill', colour).text('×')
        }
      }
      g.append('path').attr('d', levelPath(post, sx, sy)).attr('fill', 'none').attr('stroke', VIOLET)
        .attr('stroke-width', 3).attr('stroke-linecap', 'round')
      legend(130, 412)

      const tx = 560
      const line = (y, t, opt = {}) => g.append('text').attr('x', tx).attr('y', y)
        .attr('font-size', opt.size ?? 16).attr('font-weight', opt.bold ? 700 : 400)
        .attr('fill', opt.colour ?? NAVY).text(t)
      const at = (mu) => `${euro(mu[0])} at ${km(mu[1])}`
      const r2 = (x) => x.toFixed(2)
      const TEXT = { // functions: only the shown model is evaluated
        naive: () => ['Gaussian naive Bayes', [
          'Σ diagonal: amount and distance',
          'independent within each class',
          '',
          'per class: 2 means + 2 spreads = 4',
          'boundary: curved — the spreads differ',
        ]],
        full: () => ['One Gaussian per class', [
          'Σ full: spreads and correlation',
          `fitted correlation: fraud ${r2(corr(mF.S))}, honest ${r2(corr(mH.S))}`,
          '',
          'per class: 2 + 2 + 1 correlation = 5',
          'boundary: curved (quadratic)',
        ]],
        shared: () => ['One Σ shared by both classes', [
          'same spreads and correlation',
          'for honest and fraud',
          '',
          'per class: 2 means; Σ once: 3',
          'boundary: a straight line',
        ]],
        one: () => ['Fraud: one Gaussian', [
          `fraud mean: ${at(mF.mu)}`,
          '— where no fraud is',
          '',
          'the ellipse covers the gap',
          'between the two patterns',
        ]],
        mix: () => ['Fraud: a mixture of two Gaussians', [
          'p(x | fraud) = π₁ N(μ₁, Σ₁) + π₂ N(μ₂, Σ₂)',
          `π = ${r2(m.fraud[0].w)}, ${r2(m.fraud[1].w)}`,
          '',
          'fitted here with each pattern known;',
          'in real data it is hidden',
        ]],
      }
      const [head, body] = TEXT[key]()
      line(78, head, { bold: true })
      body.forEach((t, i) => line(108 + i * 26, t, { size: 15 }))
      line(258, `prior: the training share, ${Math.round(prior * 100)}% fraud`, { size: 14, colour: GREY })
      line(300, '×  mean   —  1σ   - -  2σ', { size: 14, colour: GREY })
      line(324, 'violet: P(fraud | x) = 0.5', { size: 14, colour: VIOLET })
      caption.text({
        naive: 'Naive: a normal per attribute and class — no tilt',
        full: 'Full covariance: the fraud ellipse tilts with the data',
        shared: 'One shared covariance: the boundary becomes straight',
        one: 'Two fraud patterns, one normal: the fit lies between them',
        mix: 'A mixture of two normals for fraud covers both patterns',
      }[key])
    }

    const controls = addControls(el, { isPrint }, [
      { id: 'model', label: 'model', type: 'choice', value: ORDER[0],
        options: ORDER.map((k) => ({ value: k, label: {
          naive: 'naive (diagonal Σ)', full: 'full Σ per class', shared: 'shared Σ',
          one: 'one Gaussian', mix: 'mixture of two',
        }[k] })) },
    ], (id, v) => render(v.model))
    const setStep = (i) => {
      const key = ORDER[Math.min(i, ORDER.length - 1)]
      controls.values.model = key
      controls.set('model', key)
      render(key)
    }
    setStep(isPrint ? steps : 0)
    return { setStep }
  }

  // ── view "generative" ─────────────────────────────────────────────────────
  const start = params.startStep ?? 0
  let step = start
  let drawn = []
  // fitted to the training table: per class the means, spreads and correlation
  // of its rows (maximum likelihood) — the full-Σ model of view "fit"
  const rows = trainingTable(DEFAULT)
  const model = {}
  for (const y of ['honest', 'fraud']) {
    const m = moments(rows.filter((p) => p.y === y))
    const sd = [Math.sqrt(m.S[0][0]), Math.sqrt(m.S[1][1])]
    model[y] = { mu: [...m.mu], sd, rho: m.S[0][1] / (sd[0] * sd[1]) }
  }
  const draw = sampler(4711)

  function sample(n, prior) {
    for (let i = 0; i < n; i++) {
      const y = draw.r() < prior ? 'fraud' : 'honest'
      const p = draw.point(model[y])
      if (p.u > U[0] && p.u < U[1] && p.v > V[0] && p.v < V[1]) drawn.push({ ...p, y })
    }
  }

  function render(k, val) {
    g.selectAll('*').remove()
    const prior = 10 ** val.prior
    model.fraud.mu[0] = val.fraudAmount
    model.fraud.rho = val.rho
    const fH = (u, v) => density(model.honest, u, v)
    const fF = (u, v) => density(model.fraud, u, v)
    const peak = (c) => density(c, c.mu[0], c.mu[1])

    // the two likelihoods
    const small = (y, top, f, c, colour) => {
      const { sx, sy } = panel(40, top, 190, 140, { ticks: false, title: `p(x | ${y})` })
      heat(sx, sy, (u, v) => f(u, v) / peak(c), d3.interpolateRgb('#ffffff', colour))
    }
    small('honest', 72, fH, model.honest, NAVY)
    small('fraud', 270, fF, model.fraud, ORANGE)

    // prior, between the likelihoods and the posterior
    if (k >= 1) {
      const bx = 262, by = 140, bh = 180
      g.append('text').attr('x', bx + 14).attr('y', by - 14).attr('text-anchor', 'middle')
        .attr('font-size', 15).attr('font-weight', 700).attr('fill', NAVY).text('P(y)')
      g.append('rect').attr('x', bx).attr('y', by).attr('width', 28).attr('height', bh)
        .attr('fill', '#ffffff').attr('stroke', NAVY)
      const hf = Math.max(2, bh * prior)
      g.append('rect').attr('x', bx).attr('y', by + bh - hf).attr('width', 28).attr('height', hf)
        .attr('fill', ORANGE)
      g.append('text').attr('x', bx + 14).attr('y', by + bh + 20).attr('text-anchor', 'middle')
        .attr('font-size', 14).attr('fill', '#8a4b06')
        .text(prior < 0.01 ? `${(prior * 100).toFixed(1)}%` : `${Math.round(prior * 100)}%`)
    }

    // the posterior for every x
    const { sx, sy } = panel(400, 62, 330, 310, { title: k >= 2 ? 'P(fraud | x)' : '' })
    const post = (u, v) => {
      const a = fF(u, v) * prior, b = fH(u, v) * (1 - prior)
      return a / (a + b)
    }
    if (k >= 2) {
      heat(sx, sy, post, d3.interpolateRgb('#ffffff', ORANGE))
      // the 0.5 level line: where the decision flips
      const d = levelPath(post, sx, sy)
      g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', VIOLET)
        .attr('stroke-width', 3).attr('stroke-linecap', 'round')
      // colour bar
      const lx = 760
      const grad = d3.range(0, 1.01, 0.05)
      grad.forEach((t, i) => g.append('rect').attr('x', lx).attr('y', 320 - i * 12.5)
        .attr('width', 18).attr('height', 13).attr('fill', d3.interpolateRgb('#ffffff', ORANGE)(t)))
      g.append('rect').attr('x', lx).attr('y', 82.5).attr('width', 18).attr('height', 250.5)
        .attr('fill', 'none').attr('stroke', RULE)
      for (const [t, lab] of [[0, '0'], [0.5, '0.5'], [1, '1']]) {
        g.append('text').attr('x', lx + 26).attr('y', 333 - t * 250 + 4).attr('font-size', 13)
          .attr('fill', t === 0.5 ? VIOLET : GREY).text(lab)
      }
      g.append('line').attr('x1', lx - 4).attr('x2', lx + 22).attr('y1', 208).attr('y2', 208)
        .attr('stroke', VIOLET).attr('stroke-width', 3)
    } else {
      g.append('text').attr('x', sx(2.15)).attr('y', sy(1.9)).attr('text-anchor', 'middle')
        .attr('font-size', 64).attr('fill', RULE).text('?')
    }
    if (k >= 3) {
      // where p(x) is tiny: no training data supports any answer
      const px = (u, v) => fF(u, v) * prior + fH(u, v) * (1 - prior)
      const top = Math.max(peak(model.honest) * (1 - prior), peak(model.fraud) * prior)
      heat(sx, sy, (u, v) => px(u, v) / top < 0.0005,
        (low) => (low ? 'rgba(100,116,139,0.3)' : 'rgba(0,0,0,0)'))
      box(sx, sy, learnRule(trainingTable(model)), true)
      g.append('text').attr('x', 760).attr('y', 380).attr('font-size', 13).attr('fill', GREY)
        .text('grey: p(x) tiny')
      g.append('text').attr('x', 760).attr('y', 398).attr('font-size', 13).attr('fill', NAVY)
        .text('dashed: the rule')
      // the queries of the rule view, with their posterior
      queryMarks(sx, sy)
      for (const q of QUERIES) {
        const pq = post(q.u, q.v)
        const tiny = px(q.u, q.v) / top < 0.0005
        const t = `${q.id}: ${pq > 0.99 || pq < 0.01 ? (100 * pq).toFixed(1) : Math.round(100 * pq)}%${tiny ? ' — p(x) tiny' : ''}`
        g.append('text').attr('x', q.id === 'C' ? sx(q.u) + 14 : sx(q.u)).attr('y', sy(q.v) - 19)
          .attr('text-anchor', q.id === 'C' ? 'end' : 'middle').attr('font-size', 14).attr('font-weight', 700)
          .attr('fill', VIOLET).attr('paint-order', 'stroke').attr('stroke', '#ffffff').attr('stroke-width', 4)
          .text(t)
      }
    }
    dots(sx, sy, drawn, 4.5)
    if (drawn.length) legend(420, 418)

    const pct = prior < 0.01 ? `${(prior * 100).toFixed(1)}%` : `${Math.round(prior * 100)}%`
    caption.text(drawn.length && k >= 2
      ? `${drawn.length} transactions drawn from the model: y from P(y), then x from p(x | y)`
      : [
          'Each class: a 2D normal p(x | y; θ) over amount and distance',
          `The prior P(fraud) = ${pct}`,
          'Bayes for every x: P(fraud | x), boundary at 0.5',
          'Graded, prior-aware — and it knows where it has seen nothing',
        ][Math.min(k, 3)])
  }

  const controls = addControls(el, { isPrint }, [
    { id: 'prior', label: 'P(fraud)', type: 'range', min: -3, max: -0.3, step: 0.05,
      value: Math.log10(params.prior ?? 0.1), format: (v) => `${(10 ** v * 100).toFixed(10 ** v < 0.01 ? 1 : 0)}%` },
    { id: 'fraudAmount', label: 'fraud: typical amount', type: 'range', min: 1.4, max: 3.4, step: 0.05,
      value: model.fraud.mu[0], format: (v) => euro(v) },
    { id: 'rho', label: 'fraud: correlation', type: 'range', min: -0.8, max: 0.9, step: 0.05,
      value: model.fraud.rho, format: (v) => v.toFixed(2) },
    { id: 'draw', label: 'Draw 20 transactions', type: 'button' },
    { id: 'clear', label: 'Clear', type: 'button' },
  ], (id, v) => {
    if (id === 'draw') sample(20, 10 ** v.prior)
    if (id === 'clear') drawn = []
    render(step, v)
  })

  if (params.drawn) sample(params.drawn, 10 ** controls.values.prior)
  const setStep = (i) => {
    step = start + i
    render(step, controls.values)
  }
  setStep(isPrint ? steps : 0)
  return { setStep }
}

// Two attributes, two classes: a rule learned from a table against a
// generative model of the same data (PML Lecture 03, Principle 6 tier 3).
//
// Attributes: x₁ = amount (€) and x₂ = distance from the card holder's home
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
//
// params:
//   view:      "rule" | "generative"           (default "generative")
//   prior:     P(fraud) for the generative view (default 0.1)
//   startStep: generative view, step to start from (default 0)
//   drawn:     transactions drawn from the model at mount (default 0)

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
  honest: { mu: [1.55, 0.9], sd: [0.45, 0.55], rho: 0.15 },
  fraud: { mu: [2.6, 2.3], sd: [0.4, 0.55], rho: 0.5 },
}
const N_TRAIN = { honest: 70, fraud: 35 }
// query transactions for the rule view, in (log amount, log distance)
const QUERIES = [
  { id: 'A', u: 2.05, v: 1.75, note: 'just inside the box' },
  { id: 'B', u: 2.9, v: 2.8, note: 'deep inside the box' },
  { id: 'C', u: 3.55, v: 0.2, note: '5,000 € at 1 km — no such row' },
]

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
    .attr('aria-label', view === 'rule'
      ? 'Training transactions by amount and distance, with a learned box rule'
      : 'Class-conditional densities of two attributes, the prior, and the posterior probability of fraud')
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
      p.append('text').attr('x', x + w).attr('y', y + h + 36).attr('text-anchor', 'end')
        .attr('font-size', 14).attr('fill', GREY).text('amount x₁ →')
      p.append('text').attr('transform', `translate(${x - 66},${y}) rotate(-90)`)
        .attr('text-anchor', 'end').attr('font-size', 14).attr('fill', GREY).text('distance x₂ →')
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
      const tx = 560
      const line = (y, t, opt = {}) => g.append('text').attr('x', tx).attr('y', y)
        .attr('font-size', opt.size ?? 16).attr('font-weight', opt.bold ? 700 : 400)
        .attr('fill', opt.colour ?? NAVY).text(t)
      if (step === 0) {
        line(90, `${rows.length} labelled transactions`, { bold: true })
        line(116, 'each row: (x₁, x₂, y)')
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
        QUERIES.forEach((q, i) => {
          g.append('circle').attr('cx', sx(q.u)).attr('cy', sy(q.v)).attr('r', 13)
            .attr('fill', '#ffffff').attr('stroke', VIOLET).attr('stroke-width', 3)
          g.append('text').attr('x', sx(q.u)).attr('y', sy(q.v) + 5).attr('text-anchor', 'middle')
            .attr('font-size', 14).attr('font-weight', 700).attr('fill', VIOLET).text(q.id)
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

  // ── view "generative" ─────────────────────────────────────────────────────
  const start = params.startStep ?? 0
  let step = start
  let drawn = []
  const model = structuredClone(DEFAULT)
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
      // the 0.5 level line: where the decision flips (marching squares, so
      // the panel frame is never drawn as part of the boundary)
      const M = 120
      const at = (i, j) => [U[0] + i * (U[1] - U[0]) / M, V[0] + j * (V[1] - V[0]) / M]
      const val = []
      for (let i = 0; i <= M; i++) { val.push([]); for (let j = 0; j <= M; j++) val[i].push(post(...at(i, j)) - 0.5) }
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
      value: DEFAULT.fraud.mu[0], format: (v) => euro(v) },
    { id: 'rho', label: 'fraud: correlation', type: 'range', min: -0.8, max: 0.9, step: 0.05,
      value: DEFAULT.fraud.rho, format: (v) => v.toFixed(2) },
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

// One continuous attribute, two classes: a density per class, and where to cut
// (PML Lecture 03, Principle 6 tiers 2–3).
//
// The attribute is the amount, on a log axis: log₁₀ amount is normal within
// each class — honest N(1.55, 0.45²) (median 35 €), fraud N(2.6, 0.40²)
// (median 400 €), the amount margins of ml/generative-2d. The training sample
// (1,000 honest, 100 fraud, fixed seed) is standardised so that its means and
// spreads are exactly these numbers, which the slides quote.
//
//   view "fit": the training amounts per class as histograms (each normalised
//     to a density), the fitted normal per class, then one query amount with
//     the two heights and their ratio. Steps: 0 histograms · 1 fitted normals ·
//     2 the query and its likelihood ratio.
//   view "decide": the two curves p(x | y) P(y), a cut "flag if the amount is
//     above c", the two kinds of error as areas, counted per 1,000
//     transactions. Steps: 0 the curves · 1 a cut and its two errors · 2 the
//     avoidable part between the cut and the crossing · 3 the cut at the
//     crossing: the lowest error. Controls: P(fraud), the cut, "best cut".
//     With params.costs the curves are weighted by the cost of each error
//     (false alarm €5, missed fraud k × €5) and the cut always sits at the
//     optimum. Steps: 0 equal costs · 1 a miss costs 100× · 2 and fraud is
//     100× rarer. Controls: P(fraud), cost ratio.
//
// params:
//   view:   "fit" | "decide"                       (default "fit")
//   query:  query amount in € for view "fit"       (default 1250)
//   prior:  P(fraud) for view "decide"              (default 0.1)
//   cut:    the first cut in €, view "decide"       (default 1000)
//   costs:  true → the cost version of view "decide"

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const ORANGE = '#d97706'
const VIOLET = '#7c3aed'
const RED = '#dc2626'
const RULE = '#dde3ea'
const GREY = '#64748b'

const U = [0.5, 3.8] // log10 amount: 3 € … 6,300 €
const CLS = {
  honest: { mu: 1.55, sd: 0.45, n: 1000, colour: NAVY, dark: NAVY },
  fraud: { mu: 2.6, sd: 0.4, n: 100, colour: ORANGE, dark: '#8a4b06' },
}
const C_FP = 5 // € for checking an honest customer

const pdf = (u, c) => Math.exp(-(((u - c.mu) / c.sd) ** 2) / 2) / (c.sd * Math.sqrt(2 * Math.PI))
// standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7)
function Phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t
    + 0.254829592) * t * Math.exp(-z * z / 2)
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2
}
const cdf = (u, c) => Phi((u - c.mu) / c.sd)

function sample(c, seed) {
  const r = rng(seed)
  const xs = []
  for (let i = 0; i < c.n; i++) {
    const s = Math.max(r(), 1e-12)
    xs.push(Math.sqrt(-2 * Math.log(s)) * Math.cos(2 * Math.PI * r()))
  }
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
  return xs.map((x) => c.mu + c.sd * (x - m) / sd) // exact mean and spread
}

const euro = (u) => {
  const x = 10 ** u
  if (x >= 1000) return `${(x / 1000).toFixed(x >= 10000 ? 0 : 1).replace('.0', '')}k €`
  return `${Math.round(x)} €`
}
const sig = (v) => (v >= 0.1 ? v.toFixed(2) : v.toPrecision(2))
const per1000 = (v) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace('.0', ''))

export async function mount(el, { d3, params, steps, isPrint }) {
  const view = params.view ?? 'fit'
  const costs = !!params.costs
  const W = 900
  const H = 430
  const X0 = 90, X1 = 860, Y0 = 72, Y1 = 342
  const sx = d3.scaleLinear().domain(U).range([X0, X1])
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', view === 'fit'
      ? 'Amounts of honest and fraudulent transactions with a fitted normal density per class'
      : 'The two classes weighted by their prior, a cut on the amount and the errors it makes')
  const caption = svg.append('text').attr('x', W / 2).attr('y', 26)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  const g = svg.append('g')

  const grid = d3.range(U[0], U[1] + 1e-9, (U[1] - U[0]) / 400)
  const text = (x, y, t, o = {}) => g.append('text').attr('x', x).attr('y', y)
    .attr('font-size', o.size ?? 15).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)

  function axis(yLabel) {
    g.append('line').attr('x1', X0).attr('x2', X1).attr('y1', Y1).attr('y2', Y1)
      .attr('stroke', GREY).attr('stroke-width', 1.5)
    for (const e of [5, 10, 50, 100, 500, 1000, 5000]) {
      const u = Math.log10(e)
      g.append('line').attr('x1', sx(u)).attr('x2', sx(u)).attr('y1', Y1).attr('y2', Y1 + 6)
        .attr('stroke', GREY)
      text(sx(u), Y1 + 40, euro(u), { size: 13, anchor: 'middle', colour: GREY })
    }
    text(X1, Y1 + 62, 'amount x (log scale) →', { size: 14, anchor: 'end', colour: GREY })
    g.append('text').attr('transform', `translate(${X0 - 22},${Y0}) rotate(-90)`)
      .attr('text-anchor', 'end').attr('font-size', 14).attr('fill', GREY).text(yLabel)
  }

  function curve(f, sy, colour, width = 3) {
    g.append('path').attr('d', d3.line().x((u) => sx(u)).y((u) => sy(f(u)))(grid))
      .attr('fill', 'none').attr('stroke', colour).attr('stroke-width', width)
  }

  function area(f, sy, from, to, colour, opacity) {
    const us = grid.filter((u) => u >= from && u <= to)
    if (us.length < 2) return
    g.append('path').attr('d', d3.area().x((u) => sx(u)).y0(Y1).y1((u) => sy(f(u)))(us))
      .attr('fill', colour).attr('fill-opacity', opacity)
  }

  // ── view "fit" ────────────────────────────────────────────────────────────
  if (view === 'fit') {
    const data = { honest: sample(CLS.honest, 20261101), fraud: sample(CLS.fraud, 20261102) }
    const q = Math.log10(params.query ?? 1250)
    const bw = 0.15
    const bins = d3.range(U[0], U[1] - 1e-9, bw)
    const sy = d3.scaleLinear().domain([0, 1.25]).range([Y1, Y0])

    const render = (step) => {
      g.selectAll('*').remove()
      for (const y of ['honest', 'fraud']) {
        const c = CLS[y]
        for (const b of bins) {
          const k = data[y].filter((u) => u >= b && u < b + bw).length
          const h = k / (c.n * bw)
          if (!h) continue
          g.append('rect').attr('x', sx(b) + 1).attr('width', sx(b + bw) - sx(b) - 2)
            .attr('y', sy(h)).attr('height', Y1 - sy(h))
            .attr('fill', c.colour).attr('fill-opacity', step >= 1 ? 0.18 : 0.38)
        }
      }
      axis('density p(x | y) →')
      // legend
      ;[['honest', 1000], ['fraud', 100]].forEach(([y, n], i) => {
        g.append('rect').attr('x', X0 + 14 + i * 170).attr('y', Y0 - 4).attr('width', 16)
          .attr('height', 16).attr('fill', CLS[y].colour).attr('fill-opacity', 0.6)
        text(X0 + 38 + i * 170, Y0 + 9, `${y} (${n.toLocaleString('en')})`)
      })
      if (step >= 1) {
        for (const y of ['honest', 'fraud']) {
          const c = CLS[y]
          curve((u) => pdf(u, c), sy, c.colour)
          text(sx(c.mu), sy(pdf(c.mu, c)) - 12, `mean ${c.mu}, spread ${c.sd}`,
            { size: 14, anchor: 'middle', colour: c.dark, bold: true })
        }
        text(X1, Y0 + 9, 'normal in log₁₀ amount', { size: 13, anchor: 'end', colour: GREY })
      }
      if (step >= 2) {
        const pf = pdf(q, CLS.fraud), ph = pdf(q, CLS.honest)
        g.append('line').attr('x1', sx(q)).attr('x2', sx(q)).attr('y1', Y1).attr('y2', Y0 + 30)
          .attr('stroke', VIOLET).attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4')
        for (const [p, c] of [[pf, CLS.fraud], [ph, CLS.honest]]) {
          g.append('circle').attr('cx', sx(q)).attr('cy', sy(p)).attr('r', 6)
            .attr('fill', c.colour).attr('stroke', '#ffffff').attr('stroke-width', 2)
        }
        const tx = sx(q) + 14
        text(tx, Y0 + 54, `x = ${(params.query ?? 1250).toLocaleString('en')} €`, { bold: true, colour: VIOLET })
        text(tx, Y0 + 80, `p(x | fraud) = ${sig(pf)}`, { colour: CLS.fraud.dark })
        text(tx, Y0 + 102, `p(x | honest) = ${sig(ph)}`)
        text(tx, Y0 + 132, `ratio ≈ ${Math.round(pf / ph / 10) * 10}`, { bold: true, colour: VIOLET })
      }
      caption.text([
        'The amounts of the training table, per class',
        'One normal per class: two numbers each, mean and spread',
        'At one amount: two heights, and their ratio',
      ][Math.min(step, 2)])
    }
    render(isPrint || !steps ? 2 : 0)
    return { setStep: render }
  }

  // ── view "decide" ─────────────────────────────────────────────────────────
  let step = 0
  // weighted curves: each class's density × prior × cost of erring on it
  const weights = (v) => {
    const pi = 10 ** v.prior
    const k = costs ? 10 ** v.ratio : 1
    return { f: pi * k, h: 1 - pi }
  }
  // the best cut: where the weighted curves cross (the ratio p(x | fraud) /
  // p(x | honest) grows over the whole axis, so there is one crossing at most)
  function bestCut(v) {
    const w = weights(v)
    const gap = (u) => Math.log(w.f * pdf(u, CLS.fraud)) - Math.log(w.h * pdf(u, CLS.honest))
    if (gap(U[0]) >= 0) return U[0]
    if (gap(U[1]) <= 0) return U[1]
    let lo = U[0], hi = U[1]
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2
      if (gap(m) < 0) lo = m; else hi = m
    }
    return (lo + hi) / 2
  }

  function render(v) {
    g.selectAll('*').remove()
    const pi = 10 ** v.prior
    const k = costs ? 10 ** v.ratio : 1
    const w = weights(v)
    const cut = costs ? bestCut(v) : v.cut
    const best = bestCut(v)
    const fF = (u) => w.f * pdf(u, CLS.fraud)
    const fH = (u) => w.h * pdf(u, CLS.honest)
    const top = Math.max(...grid.map((u) => Math.max(fF(u), fH(u))))
    const sy = d3.scaleLinear().domain([0, top * 1.12]).range([Y1, Y0 + 24])

    // decision regions, as a band under the axis
    const showCut = costs || step >= 1
    if (showCut) {
      g.append('rect').attr('x', X0).attr('y', Y1 + 8).attr('width', sx(cut) - X0).attr('height', 12)
        .attr('fill', NAVY).attr('fill-opacity', 0.12)
      g.append('rect').attr('x', sx(cut)).attr('y', Y1 + 8).attr('width', X1 - sx(cut)).attr('height', 12)
        .attr('fill', ORANGE).attr('fill-opacity', 0.35)
      // errors: frauds below the cut pass, honest ones above it are flagged
      area(fF, sy, U[0], cut, ORANGE, 0.45)
      area(fH, sy, cut, U[1], NAVY, 0.3)
    }
    // the avoidable part: between the cut and the crossing, the larger curve
    // is on the wrong side
    if (!costs && step === 2 && Math.abs(cut - best) > 0.01) {
      const a = Math.min(cut, best), b = Math.max(cut, best)
      const us = grid.filter((u) => u >= a && u <= b)
      g.append('path').attr('d', d3.area().x((u) => sx(u))
        .y0((u) => sy(Math.min(fF(u), fH(u)))).y1((u) => sy(Math.max(fF(u), fH(u))))(us))
        .attr('fill', RED).attr('fill-opacity', 0.55)
    }
    curve(fH, sy, NAVY)
    curve(fF, sy, ORANGE)
    axis(costs ? 'cost × p(x, y) →' : 'p(x, y) = p(x | y) P(y) →')

    // curve labels
    // above the highest point of the curve under the label, so it never crosses it
    const lab = (u, f, t, c) => {
      const top = Math.max(...grid.filter((x) => Math.abs(x - u) < 0.4).map(f))
      text(sx(u), sy(top) - 10, t, { size: 15, anchor: 'middle', colour: c, bold: true })
    }
    const kTxt = costs && k > 1.01 ? `${Math.round(k)} × ` : ''
    lab(CLS.honest.mu - 0.2, fH, `${costs ? '€5 × ' : ''}p(x, honest)`, NAVY)
    lab(CLS.fraud.mu, fF, `${costs ? `€${Math.round(5 * k)} × ` : kTxt}p(x, fraud)`, '#8a4b06')

    if (showCut) {
      g.append('line').attr('x1', sx(cut)).attr('x2', sx(cut)).attr('y1', Y1 + 20).attr('y2', Y0 + 26)
        .attr('stroke', VIOLET).attr('stroke-width', 3)
      text(sx(cut), Y0 + 18, `cut ${euro(cut)}`, { size: 15, anchor: 'middle', colour: VIOLET, bold: true })
      text(sx(cut) - 8, Y1 + 18, '← pass', { size: 12, anchor: 'end', colour: NAVY })
      text(sx(cut) + 8, Y1 + 18, 'flag →', { size: 12, colour: '#8a4b06' })
      // counts per 1,000 transactions
      const miss = 1000 * pi * cdf(cut, CLS.fraud)
      const fa = 1000 * (1 - pi) * (1 - cdf(cut, CLS.honest))
      const missB = 1000 * pi * cdf(best, CLS.fraud)
      const faB = 1000 * (1 - pi) * (1 - cdf(best, CLS.honest))
      const bx = X1 - 4
      text(bx, Y0 + 50, 'per 1,000 transactions', { size: 14, anchor: 'end', colour: GREY })
      text(bx, Y0 + 74, `missed frauds (type II): ${per1000(miss)}`, { anchor: 'end', colour: '#8a4b06' })
      text(bx, Y0 + 96, `false alarms (type I): ${per1000(fa)}`, { anchor: 'end' })
      if (costs) {
        text(bx, Y0 + 124, `cost: €${Math.round(C_FP * fa + C_FP * k * miss).toLocaleString('en')}`,
          { anchor: 'end', bold: true, colour: VIOLET })
        text(bx, Y0 + 148, `flag if P(fraud | x) > ${sig(1 / (1 + k))}`, { size: 14, anchor: 'end', colour: GREY })
      } else {
        text(bx, Y0 + 124, `errors: ${per1000(miss + fa)}`, { anchor: 'end', bold: true, colour: VIOLET })
        if (step === 2 && Math.abs(cut - best) > 0.01) {
          text(bx, Y0 + 148, `avoidable: ${per1000(miss + fa - missB - faB)}`, { anchor: 'end', bold: true, colour: RED })
        }
      }
    }
    if (!costs && step >= 2) {
      g.append('circle').attr('cx', sx(best)).attr('cy', sy(fF(best))).attr('r', 6)
        .attr('fill', '#ffffff').attr('stroke', VIOLET).attr('stroke-width', 3)
    }

    const pct = pi < 0.01 ? `${(pi * 100).toFixed(1)}%` : `${Math.round(pi * 100)}%`
    caption.text(costs
      ? [
          `P(fraud) = ${pct}, equal costs: the cut where the curves cross`,
          `A missed fraud costs ${Math.round(k)}×: its curve grows, the cut moves left`,
          `Fraud ${pct}, a miss costs ${Math.round(k)}× — the cut where it was`,
        ][Math.min(step, 2)]
      : [
          `How many of each class at each amount, P(fraud) = ${pct}`,
          'Flag above the cut: frauds below it pass, honest above it are flagged',
          'Between the cut and the crossing, the larger class is on the wrong side',
          'The lowest error: cut where the curves cross — P(fraud | x) = 0.5',
        ][Math.min(step, 3)])
  }

  const specs = [
    { id: 'prior', label: 'P(fraud)', type: 'range', min: -3, max: -0.3, step: 0.05,
      value: Math.log10(params.prior ?? 0.1), format: (x) => `${(10 ** x * 100).toFixed(10 ** x < 0.01 ? 1 : 0)}%` },
  ]
  if (costs) {
    specs.push({ id: 'ratio', label: 'missed fraud costs', type: 'range', min: 0, max: 3, step: 0.05,
      value: 0, format: (x) => `${Math.round(10 ** x)} × €5` })
  } else {
    specs.push({ id: 'cut', label: 'cut', type: 'range', min: U[0], max: U[1], step: 0.01,
      value: Math.log10(params.cut ?? 1000), format: euro })
    specs.push({ id: 'best', label: 'Best cut', type: 'button' })
  }
  const controls = addControls(el, { isPrint }, specs, (id, v) => {
    if (id === 'best') put('cut', bestCut(v))
    render(controls.values)
  })

  const script = costs
    ? [
        { prior: Math.log10(params.prior ?? 0.1), ratio: 0 },
        { prior: Math.log10(params.prior ?? 0.1), ratio: 2 },
        { prior: Math.log10((params.prior ?? 0.1) / 100), ratio: 2 },
      ]
    : null
  // in print view controls.set is a no-op, so the values are written directly
  const put = (id, x) => { controls.values[id] = x; controls.set(id, x) }
  const setStep = (i) => {
    step = i
    if (costs) {
      const s = script[Math.min(i, 2)]
      put('prior', s.prior)
      put('ratio', s.ratio)
    } else {
      put('cut', i >= 3 ? bestCut(controls.values) : Math.log10(params.cut ?? 1000))
    }
    render(controls.values)
  }
  setStep(isPrint ? (costs ? 2 : 3) : 0)
  return { setStep }
}

// Four parametric families, each met through a column of the customer table
// (PML Lecture 02, data module; units/math/stochastic/data-as-random-variables).
//
// Bernoulli, binomial and normal are known from the random-variables module;
// four columns need other shapes. Each panel shows the column as a histogram
// of 200 simulated customers (teal = counted) and, from its step on, the
// family laid over it (navy) with its formula and parameters:
//   payment method      nominal, 4 values   categorical(p₁, …, p₄)
//   orders last month   counts 0, 1, 2, …   Poisson(λ)
//   income              positive, skewed    log-normal(μ, σ)
//   share returned      in [0, 1]           Beta(α, β)
//
// params: seed (default 7)
// steps: 0 the four columns as data · k: the family of panel k (1–4)

import { rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREY = '#64748b'
const RULE = '#dde3ea'
const N = 200

const fact = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r }
const poisson = (lam) => (k) => Math.exp(-lam) * lam ** k / fact(k)
const lognormal = (mu, s) => (x) => (x <= 0 ? 0 : Math.exp(-((Math.log(x) - mu) ** 2) / (2 * s * s)) / (x * s * Math.sqrt(2 * Math.PI)))
const beta28 = (x) => (x <= 0 || x >= 1 ? 0 : 72 * x * (1 - x) ** 7) // Beta(2, 8): 1 / B(2, 8) = 72

function simulate(seed) {
  const r = rng(seed)
  const normal = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
  const PAY = [0.45, 0.25, 0.2, 0.1]
  const pick = (ps) => { let u = r(), j = 0; while (j < ps.length - 1 && u >= ps[j]) u -= ps[j++]; return j }
  const pois = (lam) => { let k = 0, u = r(), p = Math.exp(-lam), c = p; while (u > c) { k += 1; p *= lam / k; c += p } return k }
  // Beta(2, 8) is the 2nd smallest of 9 uniforms
  const beta = () => Array.from({ length: 9 }, r).sort((a, b) => a - b)[1]
  return {
    pay: Array.from({ length: N }, () => pick(PAY)),
    orders: Array.from({ length: N }, () => pois(1.6)),
    income: Array.from({ length: N }, () => Math.exp(Math.log(40) + 0.5 * normal())),
    share: Array.from({ length: N }, beta),
  }
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const data = simulate(params.seed ?? 7)
  const W = 1000
  const H = 470
  const PW = 470
  const PH = 225
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Four columns of a customer table as histograms, each with a parametric family laid over it: categorical, Poisson, log-normal and Beta')
  const g = svg.append('g')

  // text with ^{…} superscripts and _{…} subscripts as tspans
  function rich(x, y, str, o = {}) {
    const t = g.append('text').attr('x', x).attr('y', y).attr('font-size', o.size ?? 16)
      .attr('xml:space', 'preserve')
      .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY)
      .attr('font-weight', o.bold ? 700 : 400)
    let shift = 0
    for (const part of str.split(/([\^_]\{[^}]*\})/)) {
      if (!part) continue
      const m = part.match(/^([\^_])\{(.*)\}$/)
      const want = m ? (m[1] === '^' ? -7 : 5) : 0
      t.append('tspan').attr('dy', want - shift).attr('font-size', m ? '0.75em' : null).text(m ? m[2] : part)
      shift = want
    }
    return t
  }

  const PANELS = [
    {
      column: 'payment method', values: 'nominal, 4 values', family: 'categorical(p_{1}, …, p_{4})',
      formula: 'P(X = j) = p_{j}  ·  they sum to 1: 3 numbers',
      discrete: true, xs: [0, 1, 2, 3], labels: ['card', 'invoice', 'wallet', 'cash'],
      counts: (v) => [0, 1, 2, 3].map((j) => v.filter((x) => x === j).length / N),
      model: (j) => [0.45, 0.25, 0.2, 0.1][j], key: 'pay',
    },
    {
      column: 'orders last month', values: 'counts 0, 1, 2, …', family: 'Poisson(λ)',
      formula: 'P(X = k) = λ^{k} e^{−λ} / k!  ·  λ = mean count = 1.6',
      discrete: true, xs: [0, 1, 2, 3, 4, 5, 6, 7], labels: ['0', '1', '2', '3', '4', '5', '6', '7'],
      counts: (v) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => v.filter((x) => x === k).length / N),
      model: poisson(1.6), key: 'orders',
    },
    {
      column: 'income (k€)', values: 'positive, skewed', family: 'log-normal(μ, σ)',
      formula: 'log X ~ normal(μ, σ^{2})  ·  2 numbers',
      lo: 0, hi: 150, bin: 10, ticks: [0, 50, 100, 150], model: lognormal(Math.log(40), 0.5), key: 'income',
    },
    {
      column: 'share of orders returned', values: 'in [0, 1]', family: 'Beta(α, β)',
      formula: 'density ∝ x^{α−1} (1 − x)^{β−1}  ·  Beta(2, 8): mean 0.2',
      lo: 0, hi: 1, bin: 0.05, ticks: [0, 0.5, 1], model: beta28, key: 'share',
    },
  ]

  function panel(i, show) {
    const P = PANELS[i]
    const ox = (i % 2) * (PW + 40) + 10
    const oy = Math.floor(i / 2) * (PH + 15) + 4
    const plot = { x0: ox + 10, x1: ox + PW - 10, y0: oy + 66, y1: oy + PH - 26 }
    rich(ox + 10, oy + 20, P.column, { size: 19, bold: true })
    rich(ox + PW - 10, oy + 20, show ? P.family : P.values, { size: show ? 19 : 16, anchor: 'end', bold: show, colour: show ? NAVY : GREY })
    if (show) rich(ox + 10, oy + 46, P.formula, { size: 16, colour: NAVY })
    g.append('line').attr('x1', plot.x0).attr('x2', plot.x1).attr('y1', plot.y1).attr('y2', plot.y1).attr('stroke', RULE)

    const v = data[P.key]
    if (P.discrete) {
      const x = d3.scaleBand().domain(P.xs).range([plot.x0, plot.x1]).padding(0.25)
      const freq = P.counts(v)
      const top = Math.max(...freq, ...P.xs.map(P.model)) * 1.08
      const y = d3.scaleLinear().domain([0, top]).range([plot.y1, plot.y0])
      P.xs.forEach((k, j) => {
        g.append('rect').attr('x', x(k)).attr('width', x.bandwidth()).attr('y', y(freq[j])).attr('height', plot.y1 - y(freq[j]))
          .attr('fill', TEAL).attr('fill-opacity', 0.35)
        g.append('text').attr('x', x(k) + x.bandwidth() / 2).attr('y', plot.y1 + 18).attr('text-anchor', 'middle')
          .attr('font-size', 14).attr('fill', GREY).text(P.labels[j])
        if (!show) return
        g.append('line').attr('x1', x(k) + x.bandwidth() / 2).attr('x2', x(k) + x.bandwidth() / 2)
          .attr('y1', plot.y1).attr('y2', y(P.model(k))).attr('stroke', NAVY).attr('stroke-width', 2)
        g.append('circle').attr('cx', x(k) + x.bandwidth() / 2).attr('cy', y(P.model(k))).attr('r', 4.5).attr('fill', NAVY)
      })
      return
    }
    const x = d3.scaleLinear().domain([P.lo, P.hi]).range([plot.x0, plot.x1])
    const nb = Math.round((P.hi - P.lo) / P.bin)
    const dens = Array.from({ length: nb }, (_, b) => {
      const a = P.lo + b * P.bin
      return v.filter((u) => u >= a && u < a + P.bin).length / (N * P.bin)
    })
    const grid = d3.range(P.lo, P.hi + 1e-9, (P.hi - P.lo) / 300)
    const top = Math.max(...dens, ...grid.map(P.model)) * 1.08
    const y = d3.scaleLinear().domain([0, top]).range([plot.y1, plot.y0])
    dens.forEach((d, b) => {
      const a = P.lo + b * P.bin
      g.append('rect').attr('x', x(a) + 0.5).attr('width', x(a + P.bin) - x(a) - 1).attr('y', y(d)).attr('height', plot.y1 - y(d))
        .attr('fill', TEAL).attr('fill-opacity', 0.35)
    })
    for (const t of P.ticks) {
      g.append('text').attr('x', x(t)).attr('y', plot.y1 + 18).attr('text-anchor', 'middle')
        .attr('font-size', 14).attr('fill', GREY).text(t)
    }
    if (show) {
      g.append('path').attr('d', d3.line().x((u) => x(u)).y((u) => y(P.model(u)))(grid))
        .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)
    }
  }

  function render(step) {
    g.selectAll('*').remove()
    PANELS.forEach((_, i) => panel(i, i < step))
  }

  const setStep = (k) => render(k)
  setStep(isPrint ? (steps || 4) : 0)
  return { setStep }
}

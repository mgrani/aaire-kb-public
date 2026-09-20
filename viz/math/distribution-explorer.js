// Distribution explorer: draws a PMF as bars (discrete) or a PDF as a curve
// (continuous), optionally stepping through a parameter so the shape change is
// visible (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// params:
//   kind:   "dice-sum" | "bernoulli" | "binomial" | "geometric" | "uniform" | "normal"
//   n, p:   parameters for binomial/bernoulli/geometric
//   mu, sigma, a, b: parameters for normal/uniform
//   sweep:  optional {param: "n"|"p"|"sigma", values: [...]} — one step per value
//   shade:  optional [lo, hi] interval to shade under a continuous density

const NAVY = '#164374'
const TEAL = '#0083A1'

const fact = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r }
const choose = (n, k) => fact(n) / (fact(k) * fact(n - k))

function pmf(kind, prm) {
  const { n = 10, p = 0.5 } = prm
  if (kind === 'bernoulli') return [[0, 1 - p], [1, p]]
  if (kind === 'binomial')
    return Array.from({ length: n + 1 }, (_, k) => [k, choose(n, k) * p ** k * (1 - p) ** (n - k)])
  if (kind === 'geometric')
    return Array.from({ length: n }, (_, i) => [i + 1, (1 - p) ** i * p])
  if (kind === 'dice-sum')
    return Array.from({ length: 11 }, (_, i) => [i + 2, (6 - Math.abs(7 - (i + 2))) / 36])
  return []
}

function pdf(kind, prm) {
  const { mu = 0, sigma = 1, a = 0, b = 1 } = prm
  const lo = kind === 'uniform' ? a - (b - a) * 0.4 : mu - 4 * sigma
  const hi = kind === 'uniform' ? b + (b - a) * 0.4 : mu + 4 * sigma
  const pts = []
  for (let i = 0; i <= 240; i++) {
    const x = lo + ((hi - lo) * i) / 240
    let y
    if (kind === 'uniform') y = x >= a && x <= b ? 1 / (b - a) : 0
    else y = Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
    pts.push([x, y])
  }
  return pts
}

export async function mount(el, { d3, params, steps }) {
  const kind = params.kind ?? 'binomial'
  const discrete = ['dice-sum', 'bernoulli', 'binomial', 'geometric'].includes(kind)
  const sweep = params.sweep
  const W = 700
  const H = 380
  const M = { top: 46, right: 24, bottom: 48, left: 58 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const plot = svg.append('g')
  const xAxis = svg.append('g').attr('transform', `translate(0,${H - M.bottom})`).attr('color', NAVY)
  const yAxis = svg.append('g').attr('transform', `translate(${M.left},0)`).attr('color', NAVY)
  const caption = svg.append('text').attr('x', W / 2).attr('y', 28)
    .attr('text-anchor', 'middle').attr('font-size', 21).attr('fill', NAVY)

  function paramsAt(step) {
    const prm = { ...params }
    if (sweep && sweep.values?.length) {
      const i = Math.max(0, Math.min(step, sweep.values.length - 1))
      prm[sweep.param] = sweep.values[i]
    }
    return prm
  }

  function render(step) {
    const prm = paramsAt(step)
    plot.selectAll('*').remove()

    if (discrete) {
      const data = pmf(kind, prm)
      const x = d3.scaleBand(data.map((d) => d[0]), [M.left, W - M.right]).padding(0.15)
      const y = d3.scaleLinear([0, d3.max(data, (d) => d[1]) * 1.15], [H - M.bottom, M.top])
      plot.selectAll('rect').data(data).join('rect')
        .attr('x', (d) => x(d[0])).attr('width', x.bandwidth())
        .attr('y', (d) => y(d[1])).attr('height', (d) => y(0) - y(d[1]))
        .attr('fill', TEAL).attr('opacity', 0.85)
      xAxis.call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => data.length <= 14 || i % 2 === 0)))
      yAxis.call(d3.axisLeft(y).ticks(4))
      caption.text(
        kind === 'binomial' ? `Binomial B(n = ${prm.n}, p = ${prm.p}) — probability mass`
        : kind === 'geometric' ? `Geometric (p = ${prm.p}) — flips until the first success`
        : kind === 'bernoulli' ? `Bernoulli (p = ${prm.p})`
        : 'Sum of two dice — probability mass',
      )
    } else {
      const data = pdf(kind, prm)
      const x = d3.scaleLinear(d3.extent(data, (d) => d[0]), [M.left, W - M.right])
      const y = d3.scaleLinear([0, d3.max(data, (d) => d[1]) * 1.2], [H - M.bottom, M.top])
      const area = d3.area().x((d) => x(d[0])).y0(y(0)).y1((d) => y(d[1]))
      if (params.shade) {
        const [lo, hi] = params.shade
        plot.append('path').datum(data.filter((d) => d[0] >= lo && d[0] <= hi))
          .attr('d', area).attr('fill', TEAL).attr('opacity', step >= 1 ? 0.35 : 0)
      }
      plot.append('path').datum(data)
        .attr('d', d3.line().x((d) => x(d[0])).y((d) => y(d[1])))
        .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 3)
      xAxis.call(d3.axisBottom(x).ticks(6))
      yAxis.call(d3.axisLeft(y).ticks(4))
      caption.text(
        kind === 'normal' ? `Normal N(μ = ${prm.mu ?? 0}, σ = ${prm.sigma ?? 1}) — density`
        : `Uniform on [${prm.a ?? 0}, ${prm.b ?? 1}] — density`,
      )
    }
    svg.selectAll('.tick text').attr('font-size', 13)
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

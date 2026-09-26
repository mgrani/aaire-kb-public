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

function density(kind, prm) {
  const { mu = 0, sigma = 1, a = 0, b = 1 } = prm
  if (kind === 'uniform') return (x) => (x >= a && x <= b ? 1 / (b - a) : 0)
  return (x) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
}

function pdfRange(kind, prm) {
  const { mu = 0, sigma = 1, a = 0, b = 1 } = prm
  return kind === 'uniform' ? [a - (b - a) * 0.4, b + (b - a) * 0.4] : [mu - 4 * sigma, mu + 4 * sigma]
}

function sample(f, lo, hi, n = 240) {
  return Array.from({ length: n + 1 }, (_, i) => { const x = lo + ((hi - lo) * i) / n; return [x, f(x)] })
}

function pdf(kind, prm, range = pdfRange(kind, prm)) {
  return sample(density(kind, prm), range[0], range[1])
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

  // A sweep keeps ONE frame for all its steps. Rescaling the axes per step
  // would hide exactly what the sweep is meant to show: a normal density
  // rescaled to μ ± 4σ looks identical for every σ, and a binomial drawn on
  // 0…n hides that its absolute spread grows with √n.
  const all = sweep?.values?.length ? sweep.values.map((_, i) => paramsAt(i)) : null
  const frame = !all ? null : discrete
    ? {
        xs: [...new Set(all.flatMap((q) => pmf(kind, q).map((d) => d[0])))].sort((u, v) => u - v),
        ymax: d3.max(all, (q) => d3.max(pmf(kind, q), (d) => d[1])),
      }
    : {
        range: [d3.min(all, (q) => pdfRange(kind, q)[0]), d3.max(all, (q) => pdfRange(kind, q)[1])],
        ymax: d3.max(all, (q) => d3.max(pdf(kind, q), (d) => d[1])),
      }

  function render(step) {
    const prm = paramsAt(step)
    plot.selectAll('*').remove()

    if (discrete) {
      const data = pmf(kind, prm)
      const xs = frame ? frame.xs : data.map((d) => d[0])
      const x = d3.scaleBand(xs, [M.left, W - M.right]).padding(0.15)
      const y = d3.scaleLinear([0, (frame ? frame.ymax : d3.max(data, (d) => d[1])) * 1.15], [H - M.bottom, M.top])
      plot.selectAll('rect').data(data).join('rect')
        .attr('x', (d) => x(d[0])).attr('width', x.bandwidth())
        .attr('y', (d) => y(d[1])).attr('height', (d) => y(0) - y(d[1]))
        .attr('fill', TEAL).attr('opacity', 0.85)
      // at most ~13 labelled ticks, on round values (1, 2, 5, 10 …)
      const every = xs.length <= 14 ? 1 : [2, 5, 10, 20, 50].find((k) => xs.length / k <= 13) ?? 100
      xAxis.call(d3.axisBottom(x).tickValues(xs.filter((v) => v % every === 0)))
      yAxis.call(d3.axisLeft(y).ticks(4))
      caption.text(
        kind === 'binomial' ? `Binomial B(n = ${prm.n}, p = ${prm.p}) — probability mass`
        : kind === 'geometric' ? `Geometric (p = ${prm.p}) — flips until the first success`
        : kind === 'bernoulli' ? `Bernoulli (p = ${prm.p})`
        : 'Sum of two dice — probability mass',
      )
    } else {
      const data = pdf(kind, prm, frame ? frame.range : undefined)
      const x = d3.scaleLinear(d3.extent(data, (d) => d[0]), [M.left, W - M.right])
      const y = d3.scaleLinear([0, (frame ? frame.ymax : d3.max(data, (d) => d[1])) * 1.2], [H - M.bottom, M.top])
      const area = d3.area().x((d) => x(d[0])).y0(y(0)).y1((d) => y(d[1]))
      if (params.shade) {
        // sampled on [lo, hi] itself, so the shaded edge sits exactly on lo/hi
        const [lo, hi] = params.shade
        const f = density(kind, prm)
        const pts = sample(f, lo, hi, 400)
        const mass = d3.sum(pts.slice(1), (d, i) => ((d[1] + pts[i][1]) / 2) * (d[0] - pts[i][0]))
        plot.append('path').datum(pts)
          .attr('d', area).attr('fill', TEAL).attr('opacity', step >= 1 ? 0.35 : 0)
        plot.append('text')
          .attr('x', x((lo + Math.min(hi, x.domain()[1])) / 2)).attr('y', y(d3.max(pts, (d) => d[1])) - 12)
          .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', TEAL)
          .attr('opacity', step >= 1 ? 1 : 0)
          .text(`area ≈ ${mass.toFixed(3)}`)
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

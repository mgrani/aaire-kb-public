// Naive Bayes as a staircase in log-odds: start at the prior odds, and let
// every observed attribute multiply the odds by its likelihood ratio. On a
// log-odds axis each multiplication is a step of fixed height, so the
// evidence *adds up* — the linear form that naive Bayes shares with logistic
// regression. Stepped (Principle 6, tier 2): one fragment per attribute.
//
// Uses only: odds, Bayes' theorem in odds form, likelihood ratios.
//
// Params (all optional):
//   prior:     [a, b]            prior odds a : b              (default [1, 999])
//   factors:   [{ lr, label }]   likelihood ratios, in order
//   highlight: [i, …]            factor indices drawn in the caution colour
//   title:     string            caption before any evidence

const NAVY = '#164374'
const TEAL = '#0083A1'
const AMBER = '#d97706'
const RULE = '#dde3ea'
const MUTED = '#6b7280'

const DEFAULTS = {
  prior: [1, 999],
  factors: [
    { lr: 6, label: 'new device' },
    { lr: 14, label: 'foreign IP' },
    { lr: 2.5, label: 'night' },
  ],
  highlight: [],
  title: 'Fraud or not? Start from the base rate',
}

const fmtNum = (v) => {
  const r = Math.round(v * 10) / 10
  return Number.isInteger(r) ? r.toLocaleString('en') : r.toLocaleString('en', { maximumFractionDigits: 1 })
}
const fmtPct = (p) => `${(p * 100).toFixed(1)}%`

export async function mount(el, { d3, params = {}, steps }) {
  const P = { ...DEFAULTS, ...params }
  const [a, b] = P.prior
  const F = P.factors
  const hi = new Set(P.highlight || [])

  // odds numerators after 0, 1, …, n factors (denominator stays b)
  const nums = [a]
  for (const f of F) nums.push(nums[nums.length - 1] * f.lr)
  const lo = (n) => Math.log10(n / b)
  const prob = (n) => n / (n + b)
  const levels = nums.map(lo)

  const W = 760
  const H = 420
  const M = { top: 64, right: 24, bottom: 78, left: 78 }
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Posterior odds of fraud as each red flag multiplies them, on a log-odds axis')

  const yMin = Math.min(...levels) - 0.35
  const yMax = Math.max(...levels) + 0.45
  const y = d3.scaleLinear([yMin, yMax], [H - M.bottom, M.top])
  const cols = ['prior', ...F.map((f) => f.label)]
  const x = d3.scaleBand(d3.range(cols.length), [M.left, W - M.right]).padding(0.28)

  // probability gridlines on the log-odds axis
  const grid = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 0.5, 0.7, 0.9, 0.97, 0.99]
    .filter((p) => { const v = Math.log10(p / (1 - p)); return v >= yMin && v <= yMax })
  const g = svg.append('g')
  for (const p of grid) {
    const v = y(Math.log10(p / (1 - p)))
    g.append('line').attr('x1', M.left).attr('x2', W - M.right).attr('y1', v).attr('y2', v)
      .attr('stroke', RULE).attr('stroke-width', 1.2)
    g.append('text').attr('x', M.left - 10).attr('y', v + 5).attr('text-anchor', 'end')
      .attr('font-size', 15).attr('fill', NAVY).text(`${+(p * 100).toFixed(1)}%`)
  }
  svg.append('text').attr('transform', `translate(20,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', MUTED)
    .text('P(fraud), on a log-odds scale')

  const caption = svg.append('text').attr('x', W / 2).attr('y', 30).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  // column labels
  svg.append('g').selectAll('text').data(cols).join('text')
    .attr('x', (_, i) => x(i) + x.bandwidth() / 2).attr('y', H - M.bottom + 26)
    .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', NAVY)
    .text((d, i) => (i === 0 ? 'base rate' : d))
  svg.append('g').selectAll('text').data(cols).join('text')
    .attr('x', (_, i) => x(i) + x.bandwidth() / 2).attr('y', H - M.bottom + 48)
    .attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', MUTED)
    .text((_, i) => (i === 0 ? `odds ${fmtNum(a)} : ${fmtNum(b)}` : `× ${fmtNum(F[i - 1].lr)}`))

  // prior tick
  svg.append('rect').attr('x', x(0)).attr('width', x.bandwidth())
    .attr('y', y(levels[0]) - 3).attr('height', 6).attr('fill', NAVY)

  // one step per factor: a segment from the previous level to the new one
  const seg = svg.append('g').selectAll('rect').data(F).join('rect')
    .attr('x', (_, i) => x(i + 1)).attr('width', x.bandwidth())
    .attr('fill', (_, i) => (hi.has(i) ? AMBER : TEAL))
  const conn = svg.append('g').selectAll('line').data(F).join('line')
    .attr('x1', (_, i) => x(i) + x.bandwidth()).attr('x2', (_, i) => x(i + 1))
    .attr('y1', (_, i) => y(levels[i])).attr('y2', (_, i) => y(levels[i]))
    .attr('stroke', MUTED).attr('stroke-dasharray', '4 4').attr('stroke-width', 1.5)
  const val = svg.append('g').selectAll('text').data(nums).join('text')
    .attr('x', (_, i) => x(i) + x.bandwidth() / 2)
    .attr('y', (_, i) => y(levels[i]) - 12)
    .attr('text-anchor', 'middle').attr('font-size', 18).attr('font-weight', 'bold')
    .attr('fill', NAVY).text((n) => fmtPct(prob(n)))

  function render(step) {
    const s = Math.max(0, Math.min(step, F.length))
    seg.transition().duration(400)
      .attr('y', (_, i) => (i < s ? y(levels[i + 1]) : y(levels[i])))
      .attr('height', (_, i) => (i < s ? Math.max(1, y(levels[i]) - y(levels[i + 1])) : 0))
    conn.transition().duration(400).attr('opacity', (_, i) => (i < s ? 1 : 0))
    val.transition().duration(400).attr('opacity', (_, i) => (i <= s ? 1 : 0))
    caption.text(s === 0 ? P.title
      : `odds ${fmtNum(nums[s])} : ${fmtNum(b)}  →  P(fraud) = ${fmtPct(prob(nums[s]))}`)
  }

  render(steps || F.length)
  return { setStep: (i) => render(i) }
}

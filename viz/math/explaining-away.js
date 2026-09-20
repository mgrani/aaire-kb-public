// "Explaining away": the probability that Tracey's sprinkler was on, as
// evidence accumulates (Barber's wet-grass network). Each step adds one piece
// of evidence and recomputes the posterior by exact enumeration of the
// factorised joint (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// Uses only: conditional probability, marginalisation, a factorised joint —
// all introduced before graphical models.

const NAVY = '#164374'
const TEAL = '#0083A1'
const RULE = '#dde3ea'

// P(R), P(S), P(J|R), P(T|R,S) — the CPTs from the lecture's table.
const pR = 0.2
const pS = 0.1
const pJ = { 0: 0.2, 1: 1.0 }               // P(J=1 | R)
const pT = { '0,0': 0.0, '1,0': 1.0, '0,1': 0.9, '1,1': 1.0 } // P(T=1 | R,S)

// Exact posterior P(S=1 | evidence) by summing the factorised joint.
function posterior(evidence) {
  let num = 0, den = 0
  for (const R of [0, 1]) for (const S of [0, 1]) for (const J of [0, 1]) for (const T of [0, 1]) {
    if (evidence.T !== undefined && T !== evidence.T) continue
    if (evidence.J !== undefined && J !== evidence.J) continue
    const p =
      (R ? pR : 1 - pR) *
      (S ? pS : 1 - pS) *
      (J ? pJ[R] : 1 - pJ[R]) *
      (T ? pT[`${R},${S}`] : 1 - pT[`${R},${S}`])
    den += p
    if (S === 1) num += p
  }
  return den === 0 ? 0 : num / den
}

const STEPS = [
  { label: 'No evidence', sub: 'P(S = 1)', ev: {} },
  { label: "Tracey's grass is wet", sub: 'P(S = 1 | T = 1)', ev: { T: 1 } },
  { label: "…and Jack's grass is wet too", sub: 'P(S = 1 | T = 1, J = 1)', ev: { T: 1, J: 1 } },
]

export async function mount(el, { d3, steps }) {
  const W = 700
  const H = 360
  const M = { top: 60, right: 30, bottom: 86, left: 70 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const values = STEPS.map((s) => posterior(s.ev))

  const x = d3.scaleBand(d3.range(STEPS.length), [M.left, W - M.right]).padding(0.35)
  const y = d3.scaleLinear([0, 0.6], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%'))).attr('color', NAVY)
  svg.append('line')
    .attr('x1', M.left).attr('x2', W - M.right)
    .attr('y1', y(0)).attr('y2', y(0)).attr('stroke', RULE)

  const caption = svg.append('text').attr('x', W / 2).attr('y', 30)
    .attr('text-anchor', 'middle').attr('font-size', 21).attr('fill', NAVY)
    .text('Was the sprinkler on?')

  const bars = svg.append('g').selectAll('rect').data(values).join('rect')
    .attr('x', (_, i) => x(i)).attr('width', x.bandwidth())
    .attr('y', y(0)).attr('height', 0).attr('fill', TEAL)

  const labels = svg.append('g').selectAll('text').data(values).join('text')
    .attr('x', (_, i) => x(i) + x.bandwidth() / 2).attr('y', y(0) - 8)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('font-weight', 'bold')
    .attr('fill', NAVY).attr('opacity', 0)

  const ticks = svg.append('g').selectAll('g').data(STEPS).join('g')
    .attr('transform', (_, i) => `translate(${x(i) + x.bandwidth() / 2},${y(0) + 26})`)
    .attr('opacity', 0)
  ticks.append('text').attr('text-anchor', 'middle').attr('font-size', 15)
    .attr('fill', NAVY).text((d) => d.sub)
  ticks.append('text').attr('text-anchor', 'middle').attr('font-size', 14).attr('dy', 22)
    .attr('fill', '#6b7280').text((d) => d.label)

  function render(step) {
    const shown = Math.max(0, Math.min(step + 1, STEPS.length))
    bars.transition().duration(400)
      .attr('y', (v, i) => (i < shown ? y(v) : y(0)))
      .attr('height', (v, i) => (i < shown ? y(0) - y(v) : 0))
      .attr('fill', (_, i) => (i === 2 && shown === 3 ? NAVY : TEAL))
    labels.transition().duration(400)
      .attr('y', (v, i) => y(v) - 8)
      .attr('opacity', (_, i) => (i < shown ? 1 : 0))
      .text((v) => `${(v * 100).toFixed(0)}%`)
    ticks.transition().duration(400).attr('opacity', (_, i) => (i < shown ? 1 : 0))
    caption.text(
      shown >= 3 ? "Rain explains the wetness — the sprinkler falls back towards its prior"
        : shown === 2 ? 'Wet grass raises the suspicion'
        : 'Was the sprinkler on?',
    )
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

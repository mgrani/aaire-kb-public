// Independence as an area picture: Ω is a unit square, A a vertical band and
// B a horizontal band. When A and B are independent the overlap is exactly
// the product of the two widths — a rectangle. When they are dependent it is
// not (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// Uses only: events, probability as area, conditional probability.
//
// params:
//   pA, pB   marginal probabilities (band widths)
//   pAB      P(A ∩ B); defaults to pA*pB (the independent case)
//   label    optional name for the second event (default "B")

const NAVY = '#164374'
const TEAL = '#0083A1'
const PALE = '#eef1f5'

export async function mount(el, { d3, params, steps }) {
  const pA = params.pA ?? 0.3
  const pB = params.pB ?? 0.4
  const pAB = params.pAB ?? pA * pB
  const nameB = params.label ?? 'B'
  const independent = Math.abs(pAB - pA * pB) < 1e-9

  const W = 700
  const H = 400
  const S = 300 // square side
  const x0 = 60
  const y0 = 70

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const g = svg.append('g')

  g.append('rect').attr('x', x0).attr('y', y0).attr('width', S).attr('height', S).attr('fill', PALE)
  // B is drawn column-wise, as on the conditional unit square: inside A it
  // fills the top pAB/pA of the column, outside A the top (pB − pAB)/(1 − pA).
  // Both heights are equal — B a straight band, A ∩ B a rectangle of area
  // pA·pB — exactly when A and B are independent. The intersection therefore
  // always stays inside A, and its area is always pAB.
  const hIn = S * (pAB / pA)
  const hOut = S * ((pB - pAB) / (1 - pA))
  const bandA = g.append('rect').attr('opacity', 0)
  const bandB = g.append('g').attr('opacity', 0)
  bandB.append('rect').attr('x', x0).attr('y', y0).attr('width', S * pA).attr('height', hIn)
  bandB.append('rect').attr('x', x0 + S * pA).attr('y', y0).attr('width', S * (1 - pA)).attr('height', hOut)
  bandB.selectAll('rect').attr('fill', TEAL)
  const inter = g.append('rect').attr('opacity', 0)
  g.append('rect')
    .attr('x', x0).attr('y', y0).attr('width', S).attr('height', S)
    .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)
  g.append('text').attr('x', x0 - 10).attr('y', y0 - 12).attr('fill', NAVY)
    .attr('font-size', 20).attr('font-style', 'italic').text('Ω')
  const labelA = g.append('text').attr('x', x0 + (S * pA) / 2).attr('y', y0 + S + 24)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('font-style', 'italic')
    .attr('fill', NAVY).text('A')
  const labelB = g.append('text').attr('x', x0 - 10).attr('y', y0 + Math.min(hIn, hOut) / 2 + 7)
    .attr('text-anchor', 'end').attr('font-size', 19).attr('font-style', 'italic')
    .attr('fill', TEAL).text(nameB)

  const info = svg.append('g').attr('font-size', 19).attr('fill', NAVY)
  const lines = [0, 1, 2].map((i) =>
    info.append('text').attr('x', x0 + S + 40).attr('y', y0 + 40 + i * 34),
  )
  const caption = svg.append('text').attr('x', W / 2).attr('y', 34)
    .attr('text-anchor', 'middle').attr('font-size', 21).attr('fill', NAVY)

  const f = (v) => v.toFixed(2)

  function render(step) {
    bandA
      .attr('x', x0).attr('y', y0).attr('width', S * pA).attr('height', S)
      .attr('fill', NAVY).attr('opacity', step >= 1 ? 0.35 : 0)
    labelA.attr('opacity', step >= 1 ? 1 : 0)
    bandB.attr('opacity', step >= 2 ? 0.35 : 0)
    labelB.attr('opacity', step >= 2 ? 1 : 0)
    inter
      .attr('x', x0).attr('y', y0)
      .attr('width', S * pA).attr('height', hIn)
      .attr('fill', '#0d2a4a').attr('opacity', step >= 3 ? 0.85 : 0)

    lines[0].text(step >= 1 ? `P(A) = ${f(pA)}` : '')
    lines[1].text(step >= 2 ? `P(${nameB}) = ${f(pB)}` : '')
    lines[2].text(step >= 3 ? `P(A ∩ ${nameB}) = ${f(pAB)}` : '')

    if (step >= 4) {
      caption.attr('fill', independent ? TEAL : '#b5322e').text(
        independent
          ? `${f(pA)} · ${f(pB)} = ${f(pA * pB)} = P(A ∩ ${nameB})  →  independent`
          : `${f(pA)} · ${f(pB)} = ${f(pA * pB)} ≠ ${f(pAB)} = P(A ∩ ${nameB})  →  dependent`,
      )
    } else if (step === 3) {
      caption.attr('fill', NAVY).text(`Is P(A ∩ ${nameB}) equal to P(A) · P(${nameB})?`)
    } else {
      caption.attr('fill', NAVY).text('Probability as area on the sample space')
    }
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

// Conditioning as renormalisation, on the unit square
// (docs/PEDAGOGIC_CONCEPT.md Principle 6, tier 2 + tier 3).
//
// Ω is a square of area 1. A splits it into two columns; within each column B
// takes a share. Conditioning on B keeps only the two B cells and stretches
// them back to a full bar — which *is* the division by P(B) in the definition.
// Sliding P(B|A) and P(B|¬A) together shows the independence case (the bar's
// split stops moving) without any extra machinery.
//
// Uses only: events, probability as area, conditional probability.
//
// params: pA, pBgivenA, pBgivenNotA  (starting values)
// steps: 1 the A columns · 2 B inside each column · 3 keep only B ·
//        4 renormalise and read off P(A|B)

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const PALE = '#eef2f6'

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 760
  const H = 424
  const S = 258
  const x0 = 84
  const y0 = 54
  const BAR = { y: 352, h: 40 }

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'The unit square split by A and by B, then renormalised on B')

  const gSquare = svg.append('g')
  const gBar = svg.append('g')
  const gInfo = svg.append('g')
  const caption = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-size', 20)
    .attr('fill', NAVY)

  const infoLines = [0, 1, 2, 3].map((i) =>
    gInfo
      .append('text')
      .attr('x', x0 + S + 46)
      .attr('y', y0 + 42 + i * 40)
      .attr('font-size', 19)
      .attr('fill', NAVY),
  )

  function render(step, v) {
    const { pA, pBgA, pBgNA } = v
    const pB = pA * pBgA + (1 - pA) * pBgNA
    const pAgB = pB > 0 ? (pA * pBgA) / pB : 0
    const independent = Math.abs(pBgA - pBgNA) < 0.005

    gSquare.selectAll('*').remove()
    gBar.selectAll('*').remove()

    const wA = S * pA
    // The four cells of the square: A/¬A across, B/¬B down within each column.
    const cells = [
      { key: 'AB', x: x0, w: wA, y: y0, h: S * pBgA, fill: NAVY, op: 0.8, inB: true },
      { key: 'AnB', x: x0, w: wA, y: y0 + S * pBgA, h: S * (1 - pBgA), fill: NAVY, op: 0.22, inB: false },
      { key: 'nAB', x: x0 + wA, w: S - wA, y: y0, h: S * pBgNA, fill: TEAL, op: 0.8, inB: true },
      { key: 'nAnB', x: x0 + wA, w: S - wA, y: y0 + S * pBgNA, h: S * (1 - pBgNA), fill: TEAL, op: 0.22, inB: false },
    ]

    gSquare
      .append('rect')
      .attr('x', x0).attr('y', y0).attr('width', S).attr('height', S)
      .attr('fill', PALE)

    if (step >= 2) {
      gSquare
        .selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => d.x).attr('y', (d) => d.y)
        .attr('width', (d) => d.w).attr('height', (d) => d.h)
        .attr('fill', (d) => d.fill)
        .attr('opacity', (d) => (step >= 3 && !d.inB ? 0.06 : d.op))
    } else if (step >= 1) {
      gSquare
        .append('rect')
        .attr('x', x0).attr('y', y0).attr('width', wA).attr('height', S)
        .attr('fill', NAVY).attr('opacity', 0.6)
      gSquare
        .append('rect')
        .attr('x', x0 + wA).attr('y', y0).attr('width', S - wA).attr('height', S)
        .attr('fill', TEAL).attr('opacity', 0.6)
    }

    gSquare
      .append('rect')
      .attr('x', x0).attr('y', y0).attr('width', S).attr('height', S)
      .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)

    gSquare
      .append('text')
      .attr('x', x0 - 8).attr('y', y0 - 10)
      .attr('font-size', 19).attr('font-style', 'italic').attr('fill', NAVY)
      .text('Ω')

    if (step >= 1) {
      gSquare.append('text')
        .attr('x', x0 + wA / 2).attr('y', y0 + S + 22)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', NAVY)
        .text('A')
      gSquare.append('text')
        .attr('x', x0 + wA + (S - wA) / 2).attr('y', y0 + S + 22)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', TEAL)
        .text('¬A')
    }
    if (step >= 2) {
      gSquare.append('text')
        .attr('x', x0 - 10).attr('y', y0 + 16)
        .attr('text-anchor', 'end').attr('font-size', 17).attr('fill', NAVY)
        .text('B')
    }

    // Step 4: the two B cells, stretched back to a full-width bar. The stretch
    // factor is 1/P(B) — the definition, performed.
    if (step >= 4) {
      const wAB = S * ((pA * pBgA) / pB)
      gBar.append('rect')
        .attr('x', x0).attr('y', BAR.y).attr('width', wAB).attr('height', BAR.h)
        .attr('fill', NAVY).attr('opacity', 0.8)
      gBar.append('rect')
        .attr('x', x0 + wAB).attr('y', BAR.y).attr('width', S - wAB).attr('height', BAR.h)
        .attr('fill', TEAL).attr('opacity', 0.8)
      gBar.append('rect')
        .attr('x', x0).attr('y', BAR.y).attr('width', S).attr('height', BAR.h)
        .attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 2.5)
      gBar.append('text')
        .attr('x', x0 - 8).attr('y', BAR.y + BAR.h / 2 + 6)
        .attr('text-anchor', 'end').attr('font-size', 15).attr('fill', VIOLET)
        .text('given B')
      gBar.append('text')
        .attr('x', x0 + S + 14).attr('y', BAR.y + BAR.h / 2 + 6)
        .attr('font-size', 19).attr('fill', VIOLET)
        .text(`P(A | B) = ${pAgB.toFixed(2)}`)
    }

    infoLines[0].attr('opacity', step >= 1 ? 1 : 0).text(`P(A) = ${pA.toFixed(2)}`)
    infoLines[1].attr('opacity', step >= 2 ? 1 : 0)
      .text(`P(B | A) = ${pBgA.toFixed(2)},  P(B | ¬A) = ${pBgNA.toFixed(2)}`)
      .attr('font-size', 17)
    infoLines[2].attr('opacity', step >= 3 ? 1 : 0)
      .text(`P(B) = ${pB.toFixed(2)}`)
    infoLines[3]
      .attr('opacity', step >= 4 ? 1 : 0)
      .attr('fill', independent ? TEAL : VIOLET)
      .text(independent ? `P(A | B) = P(A) — independent` : `P(A ∩ B) = ${(pA * pBgA).toFixed(2)}`)

    if (step >= 4) {
      caption.attr('fill', VIOLET).text(
        independent
          ? 'Equal shares in both columns: the bar splits exactly like the square did'
          : 'Conditioning on B = keep the B cells, stretch them back to width 1',
      )
    } else if (step === 3) {
      caption.attr('fill', NAVY).text('B is now the whole world. What happened to the areas?')
    } else if (step === 2) {
      caption.attr('fill', NAVY).text('B takes a different share of each column')
    } else if (step === 1) {
      caption.attr('fill', NAVY).text('A splits Ω into two columns')
    } else {
      caption.attr('fill', NAVY).text('Ω has area 1')
    }
  }

  let step = 0
  const pct = (v) => `${Math.round(v * 100)}%`
  const controls = addControls(
    el,
    { isPrint },
    [
      { id: 'pA', label: 'P(A)', type: 'range', min: 0.05, max: 0.95, step: 0.01, value: params.pA ?? 0.4, format: pct },
      { id: 'pBgA', label: 'P(B|A)', type: 'range', min: 0, max: 1, step: 0.01, value: params.pBgivenA ?? 0.75, format: pct },
      { id: 'pBgNA', label: 'P(B|¬A)', type: 'range', min: 0, max: 1, step: 0.01, value: params.pBgivenNotA ?? 0.25, format: pct },
    ],
    (id, values) => render(step, values),
  )

  const setStep = (i) => {
    step = i
    render(i, controls.values)
  }
  setStep(isPrint ? steps || 4 : steps ? 0 : 4)
  return { setStep }
}

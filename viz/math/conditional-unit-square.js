// Conditioning as renormalisation, on the unit square
// (docs/PEDAGOGIC_CONCEPT.md Principle 6, tier 2 + tier 3).
//
// Ω is a square of area 1. A splits it into two columns; the event B is drawn
// as a violet outline made of two cells, A ∩ B inside A and ¬A ∩ B outside.
// Conditioning on B keeps only those two cells and stretches them back to a
// full bar — which *is* the division by P(B) in the definition
// P(A | B) = P(A ∩ B) / P(B).
//
// The knobs are areas, not conditionals: P(A), P(B) and P(A ∩ B) are free,
// within max(0, P(A) + P(B) − 1) ≤ P(A ∩ B) ≤ min(P(A), P(B)); the overlap
// slider snaps back into that range. P(A | B) is the one derived number.
//
// Uses only: events, probability as area.
//
// params: pA, pB, pAB  (starting values)
// steps: 1 the A column · 2 the event B, as two cells · 3 keep only B ·
//        4 stretch B back to width 1 and read off P(A|B)

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
    .attr('aria-label', 'The unit square split by A, the event B outlined, then renormalised on B')

  const gSquare = svg.append('g')
  const gBar = svg.append('g')
  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)
  const infoLines = [0, 1, 2, 3].map((i) =>
    svg.append('text')
      .attr('x', x0 + S + 40).attr('y', y0 + 42 + i * 40)
      .attr('font-size', 18).attr('fill', NAVY),
  )
  const f = (x) => x.toFixed(2)

  function render(step, { pA, pB, pAB }) {
    const pNAB = pB - pAB
    const pAgB = pB > 0 ? pAB / pB : 0
    const independent = Math.abs(pAB - pA * pB) < 0.005

    gSquare.selectAll('*').remove()
    gBar.selectAll('*').remove()

    // B's cells: the area A ∩ B sits in the A column, ¬A ∩ B in the other
    const wA = S * pA
    const hA = S * (pAB / pA)
    const hN = S * (pNAB / (1 - pA))
    const cells = [
      { x: x0, w: wA, y: y0, h: hA, fill: NAVY, inB: true },
      { x: x0, w: wA, y: y0 + hA, h: S - hA, fill: NAVY, inB: false },
      { x: x0 + wA, w: S - wA, y: y0, h: hN, fill: TEAL, inB: true },
      { x: x0 + wA, w: S - wA, y: y0 + hN, h: S - hN, fill: TEAL, inB: false },
    ]

    gSquare.append('rect')
      .attr('x', x0).attr('y', y0).attr('width', S).attr('height', S).attr('fill', PALE)

    if (step >= 1) {
      gSquare.selectAll('rect.cell').data(cells).join('rect').attr('class', 'cell')
        .attr('x', (d) => d.x).attr('y', (d) => d.y)
        .attr('width', (d) => d.w).attr('height', (d) => d.h)
        .attr('fill', (d) => d.fill)
        .attr('opacity', (d) => (step < 2 ? 0.45 : d.inB ? 0.8 : step >= 3 ? 0.06 : 0.22))
    }

    gSquare.append('rect')
      .attr('x', x0).attr('y', y0).attr('width', S).attr('height', S)
      .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)
    gSquare.append('text')
      .attr('x', x0 - 8).attr('y', y0 - 10)
      .attr('font-size', 19).attr('font-style', 'italic').attr('fill', NAVY).text('Ω')

    if (step >= 1) {
      gSquare.append('text')
        .attr('x', x0 + wA / 2).attr('y', y0 + S + 22)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', NAVY).text('A')
      gSquare.append('text')
        .attr('x', x0 + wA + (S - wA) / 2).attr('y', y0 + S + 22)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', TEAL).text('¬A')
    }

    // B as one region, outlined in violet ("out of": the world conditioning
    // keeps). Dashed while it is only shown, solid once the rest is gone.
    if (step >= 2) {
      gSquare.append('path')
        .attr('d', `M${x0} ${y0} H${x0 + S} V${y0 + hN} H${x0 + wA} V${y0 + hA} H${x0} Z`)
        .attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 3.5)
        .attr('stroke-dasharray', step >= 3 ? null : '7 5')
      gSquare.append('text')
        .attr('x', x0 - 10).attr('y', y0 + Math.max(hA, hN) / 2 + 6)
        .attr('text-anchor', 'end').attr('font-size', 18).attr('font-weight', 700)
        .attr('fill', VIOLET).text('B')
      if (hA >= 24 && wA >= 60) {
        gSquare.append('text')
          .attr('x', x0 + wA / 2).attr('y', y0 + hA / 2 + 6)
          .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', '#ffffff').text('A ∩ B')
      }
    }

    // Step 4: the two B cells, stretched back to a full-width bar. The stretch
    // factor is 1/P(B) — the definition, performed.
    if (step >= 4) {
      const wAB = S * pAgB
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
        .attr('text-anchor', 'end').attr('font-size', 15).attr('fill', VIOLET).text('given B')
      gBar.append('text')
        .attr('x', x0 + S + 14).attr('y', BAR.y + BAR.h / 2 + 6)
        .attr('font-size', 19).attr('fill', VIOLET).text(`P(A | B) = ${f(pAgB)}`)
    }

    infoLines[0].attr('opacity', step >= 1 ? 1 : 0).text(`P(A) = ${f(pA)}`)
    infoLines[1].attr('opacity', step >= 2 ? 1 : 0).attr('fill', VIOLET)
      .text(`P(B) = ${f(pAB)} + ${f(pNAB)} = ${f(pB)}`)
    infoLines[2].attr('opacity', step >= 2 ? 1 : 0)
      .text(`P(A ∩ B) = ${f(pAB)}`)
    infoLines[3].attr('opacity', step >= 4 ? 1 : 0)
      .attr('fill', independent ? TEAL : VIOLET)
      .text(`P(A | B) = ${f(pAB)} / ${f(pB)} = ${f(pAgB)}${independent ? ' = P(A)' : ''}`)

    const cap = [
      'Ω has area 1',
      'A takes a column of Ω',
      'B has a piece inside A and a piece outside',
      'B is now the whole world. How large is A inside it?',
      independent
        ? 'A takes the same share of B as of Ω: learning B changes nothing'
        : 'Conditioning on B = keep B, stretch it back to width 1',
    ]
    caption.attr('fill', step >= 4 ? VIOLET : NAVY).text(cap[Math.min(step, 4)])
  }

  let step = 0
  const pct = (v) => `${Math.round(v * 100)}%`
  const r2 = (x) => Math.round(x * 100) / 100
  const controls = addControls(
    el,
    { isPrint },
    [
      { id: 'pA', label: 'P(A)', type: 'range', min: 0.05, max: 0.95, step: 0.01, value: params.pA ?? 0.4, format: pct },
      { id: 'pB', label: 'P(B)', type: 'range', min: 0.01, max: 1, step: 0.01, value: params.pB ?? 0.16, format: pct },
      { id: 'pAB', label: 'P(A ∩ B)', type: 'range', min: 0, max: 0.95, step: 0.01, value: params.pAB ?? 0.1, format: pct },
    ],
    (id, v) => {
      // the overlap cannot exceed either event, nor leave more than Ω
      const lo = Math.max(0, v.pA + v.pB - 1)
      const hi = Math.min(v.pA, v.pB)
      if (v.pAB < lo || v.pAB > hi) controls.set('pAB', r2(Math.min(hi, Math.max(lo, v.pAB))))
      render(step, v)
    },
  )

  const setStep = (i) => {
    step = i
    render(i, controls.values)
  }
  setStep(isPrint ? steps || 4 : steps ? 0 : 4)
  return { setStep }
}

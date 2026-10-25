// Two attributes per class: the full joint against the naive product
// (Principle 6, tier 2).
//
// The object is a cube — class × x₁ × x₂ — drawn as its two class slices.
// Left: the true p(x₁, x₂ | y), a full grid per class whose blob can tilt
// (the attributes are correlated within the class). Right: what naive Bayes
// keeps, the product of the two margins p(x₁ | y) · p(x₂ | y), which can never
// tilt. The tilt is the dependence that is assumed away; with ρ = 0 the two
// pictures coincide.
//
// Uses only: joint distribution, marginalisation, conditional independence.
//
// params: rho (correlation within each class, default 0.7)
// steps: 0 the full grid per class · 1 its two margins · 2 the naive product
//        of the margins · 3 what the product drops

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const RULE = '#dde3ea'
const M = 5
const CLASSES = [
  { name: 'honest', mu: [-0.7, -0.6] },
  { name: 'fraud', mu: [0.9, 0.8] },
]

function grid(mu, rho) {
  const g = []
  for (let a = 0; a < M; a++) {
    g.push([])
    for (let b = 0; b < M; b++) {
      const u = a - 2 - mu[0] * 1.2
      const v = b - 2 - mu[1] * 1.2
      const q = (u * u - 2 * rho * u * v + v * v) / (1 - rho * rho)
      g[a].push(Math.exp(-0.5 * q / 1.4))
    }
  }
  const s = g.flat().reduce((x, y) => x + y, 0)
  return g.map((row) => row.map((x) => x / s))
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 900
  const H = 310
  const C = 28
  const P = M * C
  // one block per class: the joint, an arrow, the naive product
  const BX = [40, 480]
  const NX = 200 // naive panel offset within a block
  const OY = 92

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Per class, the joint of two attributes as a grid, and the product of its margins')
  const caption = svg.append('text').attr('x', W / 2).attr('y', 24)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  const g = svg.append('g')
  const shade = d3.interpolateRgb('#ffffff', TEAL)

  function panel(ox, oy, cells, vmax, framed) {
    for (let a = 0; a < M; a++) {
      for (let b = 0; b < M; b++) {
        g.append('rect')
          .attr('x', ox + a * C).attr('y', oy + (M - 1 - b) * C).attr('width', C - 2).attr('height', C - 2)
          .attr('rx', 3).attr('fill', shade(0.06 + 0.94 * cells[a][b] / vmax)).attr('stroke', RULE)
      }
    }
    g.append('rect').attr('x', ox - 3).attr('y', oy - 3).attr('width', P + 4).attr('height', P + 4)
      .attr('rx', 5).attr('fill', 'none').attr('stroke', framed ? VIOLET : NAVY)
      .attr('stroke-width', framed ? 3 : 1.5)
    g.append('text').attr('x', ox + P / 2).attr('y', oy + P + 18).attr('text-anchor', 'middle')
      .attr('font-size', 13).attr('fill', '#64748b').text('x₁ →')
  }

  function render(step, { rho }) {
    g.selectAll('*').remove()
    const data = CLASSES.map((c) => {
      const joint = grid(c.mu, rho)
      const m1 = joint.map((row) => row.reduce((x, y) => x + y, 0))
      const m2 = d3.range(M).map((b) => d3.sum(joint, (row) => row[b]))
      const naive = m1.map((p1) => m2.map((p2) => p1 * p2))
      return { ...c, joint, m1, m2, naive }
    })
    const vmax = d3.max(data.flatMap((d) => [...d.joint.flat(), ...d.naive.flat()]))

    data.forEach((d, r) => {
      const ox = BX[r]
      g.append('text').attr('x', ox + (NX + P) / 2).attr('y', 54).attr('text-anchor', 'middle')
        .attr('font-size', 18).attr('font-weight', 700).attr('fill', NAVY).text(d.name)
      g.append('text').attr('x', ox + P / 2).attr('y', OY + P + 40).attr('text-anchor', 'middle')
        .attr('font-size', 15).attr('fill', NAVY).text('p(x₁, x₂ | y)')
      panel(ox, OY, d.joint, vmax, false)

      // the margins: bars above (x₁) and to the right (x₂) of the full grid
      if (step >= 1) {
        const mmax = d3.max([...d.m1, ...d.m2])
        d.m1.forEach((p, a) => {
          const h = 22 * p / mmax
          g.append('rect').attr('x', ox + a * C + 4).attr('y', OY - 6 - h)
            .attr('width', C - 10).attr('height', h).attr('fill', NAVY).attr('opacity', 0.7)
        })
        d.m2.forEach((p, b) => {
          const w = 22 * p / mmax
          g.append('rect').attr('x', ox + P + 6).attr('y', OY + (M - 1 - b) * C + 4)
            .attr('width', w).attr('height', C - 10).attr('fill', NAVY).attr('opacity', 0.7)
        })
      }
      if (step >= 2) {
        g.append('text').attr('x', ox + (P + 30 + NX) / 2).attr('y', OY + P / 2 + 8)
          .attr('text-anchor', 'middle').attr('font-size', 24).attr('fill', VIOLET).text('→')
        panel(ox + NX, OY, d.naive, vmax, true)
        g.append('text').attr('x', ox + NX + P / 2).attr('y', OY + P + 40).attr('text-anchor', 'middle')
          .attr('font-size', 15).attr('fill', VIOLET).text('p(x₁ | y) · p(x₂ | y)')
      }
      if (step >= 3) {
        // how far the product is from the joint: total variation distance
        const tv = 0.5 * d3.sum(d3.range(M), (a) => d3.sum(d3.range(M), (b) => Math.abs(d.joint[a][b] - d.naive[a][b])))
        g.append('text').attr('x', ox + (NX + P) / 2).attr('y', OY + P + 66).attr('text-anchor', 'middle')
          .attr('font-size', 15).attr('font-weight', 700).attr('fill', VIOLET)
          .text(`${Math.round(tv * 100)}% of the mass misplaced`)
      }
    })

    const cap = [
      `One full grid per class: ${M}² − 1 = ${M * M - 1} numbers; for p attributes ${M}ᵖ − 1`,
      'Each grid has two margins: p(x₁ | y) on top, p(x₂ | y) at the side',
      `Naive Bayes keeps only the margins: 2 · ${M - 1} = ${2 * (M - 1)} numbers per class`,
      Math.abs(rho) < 0.05
        ? 'No tilt within a class: the product is exact'
        : 'The tilt within each class is what naive Bayes drops',
    ]
    caption.attr('fill', step >= 2 ? VIOLET : NAVY).text(cap[Math.min(step, 3)])
  }

  let step = 0
  const controls = addControls(el, { isPrint }, [
    { id: 'rho', label: 'correlation within a class', type: 'range', min: -0.9, max: 0.9, step: 0.05,
      value: params.rho ?? 0.7, format: (v) => v.toFixed(2) },
  ], (id, v) => render(step, v))

  const setStep = (i) => {
    step = i
    render(i, controls.values)
  }
  setStep(isPrint ? steps || 3 : steps ? 0 : 3)
  return { setStep }
}

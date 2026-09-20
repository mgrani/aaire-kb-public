// Why corpus scale changes retrieval: the same query and the same relevant
// document sit in the middle of four nested corpora — 10K passages, 1M, 100M,
// the web. What grows outward is not the answer but its neighbourhood:
// plausible distractors, near-duplicates, other languages and conflicting
// evidence, and finally the plain cost of holding it all.
//
// params:
//   seed: integer for the deterministic dot scatter (default 20260910)
// steps: 4 — step i reveals ring i (10K · 1M · 100M · the web); rings not yet
//        revealed stay at opacity 0.1 so the geometry never moves. A line in
//        the right-hand column appears with each ring.

import { rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#dc2626'
const VIOLET = '#7c3aed'
const AMBER = '#d97706'
const INK = '#333333'
const INK_SOFT = '#444444'
const RULE = '#dde3ea'
const SURFACE = '#f6f8fa'

// One entry per ring, innermost first. Half-widths / half-heights of the
// rounded rectangles and how many dots of each kind live in that ring's band.
const RINGS = [
  { label: '10K passages', name: '10K passages', hw: 46, hh: 36, grey: 10, amber: 1, pairs: 0, red: 0 },
  { label: '1M', name: '1M passages', hw: 98, hh: 78, grey: 34, amber: 4, pairs: 2, red: 0 },
  { label: '100M', name: '100M passages', hw: 150, hh: 120, grey: 80, amber: 12, pairs: 4, red: 2 },
  { label: 'the web (~10⁹+)', name: 'the web (~10⁹+ passages)', hw: 202, hh: 162, grey: 150, amber: 30, pairs: 6, red: 3 },
]

const GROWS = [
  { text: 'look relevant, but are not', color: AMBER },
  { text: 'near-duplicates', color: VIOLET },
  { text: 'other languages, contradictions', color: RED },
  { text: 'the cost of holding it all', color: RED, hollow: true },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const seed = params.seed ?? 20260910
  const W = 760
  const H = 430
  const CX = 236
  const CY = 248
  const COL = 476 // right-hand column

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Nested corpora of growing size around one fixed relevant document')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  svg.append('text')
    .attr('x', W / 2).attr('y', 28).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)
    .text('same query, same relevant document, a growing corpus around it')
  const subcaption = svg.append('text')
    .attr('x', CX).attr('y', 52).attr('text-anchor', 'middle')
    .attr('font-size', 15).attr('fill', TEAL)

  // ── deterministic scatter ────────────────────────────────────────────────
  // Points are sampled in ring i's rectangle and rejected if they fall inside
  // ring i-1 (so each dot belongs to exactly one band), too close to the edge,
  // or into the strip at the bottom where the ring's label sits.
  const next = rng(seed)
  function place(i) {
    const r = RINGS[i]
    const inner = RINGS[i - 1]
    for (let tries = 0; tries < 200; tries++) {
      const x = (next() * 2 - 1) * (r.hw - 8)
      const y = (next() * 2 - 1) * (r.hh - 8)
      if (inner && Math.abs(x) < inner.hw + 6 && Math.abs(y) < inner.hh + 6) continue
      if (y > r.hh - 22 && Math.abs(x) < 70) continue // label strip
      if (!inner && Math.hypot(x, y) < 16) continue // the star
      return [x, y]
    }
    return [0, -(r.hh - 12)]
  }
  const dots = RINGS.map((r, i) => {
    const grey = Array.from({ length: r.grey }, () => place(i))
    const amber = Array.from({ length: r.amber }, () => place(i))
    const red = Array.from({ length: r.red }, () => place(i))
    const pairs = Array.from({ length: r.pairs }, () => {
      const [x, y] = place(i)
      const a = next() * Math.PI * 2
      return [[x, y], [x + 7 * Math.cos(a), y + 7 * Math.sin(a)]]
    })
    return { grey, amber, red, pairs }
  })

  // ── rings, largest first so the smaller ones paint on top ───────────────
  const rings = svg.append('g').attr('transform', `translate(${CX},${CY})`)
    .selectAll('g').data(RINGS.map((r, i) => ({ ...r, i })).reverse()).join('g')
    .attr('class', 'ring')

  rings.append('rect')
    .attr('x', (d) => -d.hw).attr('y', (d) => -d.hh)
    .attr('width', (d) => 2 * d.hw).attr('height', (d) => 2 * d.hh).attr('rx', 14)
    .attr('fill', (d) => (d.i === 0 ? SURFACE : '#ffffff'))
    .attr('stroke', NAVY).attr('stroke-width', 1.2)

  const dot = (sel, key, color, r, opacity = 1) =>
    sel.append('g').selectAll('circle').data((d) => dots[d.i][key]).join('circle')
      .attr('cx', (p) => p[0]).attr('cy', (p) => p[1]).attr('r', r)
      .attr('fill', color).attr('opacity', opacity)

  dot(rings, 'grey', INK_SOFT, 2.2, 0.3)
  dot(rings, 'amber', AMBER, 3)
  dot(rings, 'red', RED, 3.4)

  const pairG = rings.append('g').selectAll('g').data((d) => dots[d.i].pairs).join('g')
  pairG.append('line')
    .attr('x1', (p) => p[0][0]).attr('y1', (p) => p[0][1])
    .attr('x2', (p) => p[1][0]).attr('y2', (p) => p[1][1])
    .attr('stroke', VIOLET).attr('stroke-width', 1.5)
  pairG.selectAll('circle').data((p) => p).join('circle')
    .attr('cx', (p) => p[0]).attr('cy', (p) => p[1]).attr('r', 3)
    .attr('fill', VIOLET)

  rings.append('text')
    .attr('x', 0).attr('y', (d) => d.hh - 9).attr('text-anchor', 'middle')
    .attr('font-size', 13).attr('font-weight', 600).attr('fill', NAVY)
    .text((d) => d.label)

  // The relevant document: fixed, always visible, in the middle of everything.
  svg.append('path')
    .attr('transform', `translate(${CX},${CY - 4})`)
    .attr('d', d3.symbol(d3.symbolStar, 180)())
    .attr('fill', NAVY)

  // ── right-hand column ────────────────────────────────────────────────────
  const col = svg.append('g').attr('transform', `translate(${COL},0)`)
  col.append('text').attr('y', 96).attr('font-size', 13).attr('fill', INK_SOFT).text('always there')
  col.append('path')
    .attr('transform', 'translate(8,116)')
    .attr('d', d3.symbol(d3.symbolStar, 110)())
    .attr('fill', NAVY)
  col.append('text').attr('x', 24).attr('y', 121).attr('font-size', 15).attr('fill', INK)
    .text('the relevant document')
  col.append('circle').attr('cx', 8).attr('cy', 141).attr('r', 2.6)
    .attr('fill', INK_SOFT).attr('opacity', 0.3)
  col.append('text').attr('x', 24).attr('y', 146).attr('font-size', 15).attr('fill', INK)
    .text('irrelevant passages')

  col.append('line').attr('x1', 0).attr('x2', 270).attr('y1', 170).attr('y2', 170).attr('stroke', RULE)
  col.append('text').attr('y', 196).attr('font-size', 13).attr('fill', INK_SOFT).text('what the ranker must reject grows')

  const grows = col.append('g').selectAll('g').data(GROWS).join('g')
    .attr('class', 'grows')
    .attr('transform', (_, i) => `translate(0,${222 + i * 32})`)
  grows.append('rect')
    .attr('x', 1).attr('y', -10).attr('width', 12).attr('height', 12).attr('rx', 2)
    .attr('fill', (d) => (d.hollow ? 'none' : d.color))
    .attr('stroke', (d) => d.color).attr('stroke-width', 1.5)
  grows.append('text').attr('x', 24).attr('font-size', 15).attr('fill', INK)
    .text((d) => d.text)

  function render(step, animate = true) {
    const s = isPrint || !steps ? RINGS.length : step
    const t = (sel) => sel.transition().duration(animate ? 320 : 0)
    t(rings).attr('opacity', (d) => (d.i < s ? 1 : 0.1))
    t(grows).attr('opacity', (_, i) => (i < s ? 1 : 0))
    subcaption.text(s > 0 ? RINGS[Math.min(s, RINGS.length) - 1].name : '')
  }

  render(steps, false)
  return { setStep: (i) => render(i) }
}

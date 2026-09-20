// A small per-step effect compounds over a trajectory: if each retrieval step
// is affected with probability ε, the share of trajectories touched after k
// steps is 1 − (1 − ε)^k. Three fixed curves (ε = 1%, 2%, 5%) tell the story;
// a slider adds a fourth, "your ε", with a readout for k = 10 and the length
// at which half of all trajectories are affected (Principle 6, tier 3).
//
// params:
//   kmax:  longest trajectory on the x axis (default 20)
//   marks: k values drawn as light vertical ticks (default [1, 5, 10, 20])
// steps: 3 — ε = 1% · + 2% · + 5%; "your ε" appears with step 3 or as soon
//        as the slider is moved. Print shows everything.

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#dc2626'
const VIOLET = '#7c3aed'
const AMBER = '#d97706'
const INK = '#333333'
const INK_SOFT = '#444444'
const RULE = '#dde3ea'

const FIXED = [
  { eps: 0.01, color: TEAL, label: 'ε = 1%' },
  { eps: 0.02, color: NAVY, label: 'ε = 2%' },
  { eps: 0.05, color: RED, label: 'ε = 5%' },
]

const affected = (eps, k) => 1 - (1 - eps) ** k
const fmtPct = (eps) => `${Number((100 * eps).toFixed(1))}%`
const halfAt = (eps) => Math.ceil(Math.log(0.5) / Math.log(1 - eps))

export async function mount(el, { d3, params, steps, isPrint }) {
  const kmax = Math.max(2, params.kmax ?? 20)
  const marks = (params.marks ?? [1, 5, 10, 20]).filter((k) => k >= 1 && k <= kmax)
  const W = 760
  const H = 430
  const M = { top: 44, right: 118, bottom: 72, left: 66 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Share of trajectories affected by a per-step effect, against trajectory length')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const x = d3.scaleLinear([1, kmax], [M.left, W - M.right])
  const y = d3.scaleLinear([0, 1], [H - M.bottom, M.top])
  const ks = d3.range(1, kmax + 1)
  const line = (eps) => d3.line().x((k) => x(k)).y((k) => y(affected(eps, k)))(ks)

  // light vertical ticks at the marked lengths
  svg.append('g').selectAll('line').data(marks).join('line')
    .attr('x1', (k) => x(k)).attr('x2', (k) => x(k)).attr('y1', y(0)).attr('y2', y(1))
    .attr('stroke', RULE).attr('stroke-width', 1)

  // "half of all trajectories"
  svg.append('line')
    .attr('x1', x(1)).attr('x2', x(kmax)).attr('y1', y(0.5)).attr('y2', y(0.5))
    .attr('stroke', INK_SOFT).attr('stroke-width', 1.2).attr('stroke-dasharray', '6 4')
  svg.append('text')
    .attr('x', x(1) + 6).attr('y', y(0.5) - 6).attr('font-size', 13).attr('fill', INK_SOFT)
    .text('half of all trajectories')

  svg.append('g').attr('transform', `translate(0,${y(0)})`).attr('color', NAVY)
    .call(d3.axisBottom(x).tickValues(marks.length ? marks : x.ticks(5)).tickFormat(d3.format('d')))
  svg.append('g').attr('transform', `translate(${M.left},0)`).attr('color', NAVY)
    .call(d3.axisLeft(y).ticks(5, '.0%'))
  svg.selectAll('.tick text').attr('font-size', 13)

  svg.append('text')
    .attr('x', (M.left + W - M.right) / 2).attr('y', H - 34).attr('text-anchor', 'middle')
    .attr('font-size', 15).attr('fill', INK)
    .text('retrieval steps in one trajectory (k)')
  svg.append('text')
    .attr('transform', `translate(18,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', INK)
    .text('trajectories touched by the effect')
  svg.append('text')
    .attr('x', M.left).attr('y', H - 10).attr('font-size', 13).attr('fill', AMBER)
    .text('illustration: independent per-step effects, not a model of agents')

  // ── fixed curves and their right-end labels ──────────────────────────────
  const fixed = svg.append('g').selectAll('g').data(FIXED).join('g')
  fixed.append('path')
    .attr('d', (d) => line(d.eps))
    .attr('fill', 'none').attr('stroke', (d) => d.color).attr('stroke-width', 2.5)
  // labels sit at the curve ends, pushed apart (downwards in screen space,
  // i.e. the smaller ε further down) when two ends are close
  const ends = FIXED.map((d) => y(affected(d.eps, kmax)))
  for (let i = FIXED.length - 2; i >= 0; i--) ends[i] = Math.max(ends[i], ends[i + 1] + 17)
  fixed.append('text')
    .attr('x', x(kmax) + 8).attr('y', (_, i) => ends[i] + 5)
    .attr('font-size', 14).attr('font-weight', 600).attr('fill', (d) => d.color)
    .text((d) => d.label)

  // ── "your ε" ─────────────────────────────────────────────────────────────
  const yours = svg.append('g')
  const yourPath = yours.append('path')
    .attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 4.5).attr('opacity', 0.85)
  const halfTick = yours.append('line')
    .attr('stroke', VIOLET).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 3')
  const k10 = yours.append('circle').attr('r', 5).attr('fill', VIOLET)
  const yourLabel = yours.append('text')
    .attr('font-size', 14).attr('font-weight', 600).attr('fill', VIOLET).attr('text-anchor', 'middle')
  const readout = yours.append('text')
    .attr('x', M.left + 10).attr('y', M.top + 18).attr('font-size', 15).attr('fill', VIOLET)

  let step = 0
  let touched = false

  function render(eps, animate = true) {
    const full = isPrint || !steps
    const s = full ? FIXED.length : step
    const t = (sel) => sel.transition().duration(animate ? 320 : 0)

    t(fixed).attr('opacity', (_, i) => (i < s ? 1 : 0))

    const showYours = full || touched || s >= FIXED.length
    t(yours).attr('opacity', showYours ? 1 : 0)
    yourPath.attr('d', line(eps))

    const kr = Math.min(10, kmax)
    const n = halfAt(eps)
    k10.attr('cx', x(kr)).attr('cy', y(affected(eps, kr)))
    const kl = Math.max(1, Math.round(kmax * 0.4)) // label clear of the 50% line
    yourLabel.attr('x', x(kl)).attr('y', y(affected(eps, kl)) - 12)
      .text(`your ε = ${fmtPct(eps)}`)
    halfTick
      .attr('x1', x(Math.min(n, kmax))).attr('x2', x(Math.min(n, kmax)))
      .attr('y1', y(0)).attr('y2', y(0.5))
      .attr('opacity', n <= kmax ? 1 : 0)
    readout.text(
      `at ε = ${fmtPct(eps)} and k = ${kr}: ${Math.round(100 * affected(eps, kr))}% affected` +
      ` · half of all trajectories at k = ${n}`,
    )
  }

  const controls = addControls(
    el,
    { isPrint },
    [
      {
        id: 'eps', label: 'per-step effect ε', type: 'range',
        min: 0.5, max: 10, step: 0.5, value: 3, format: (v) => `${v}%`,
      },
    ],
    (_, values) => {
      touched = true
      render(values.eps / 100)
    },
  )

  const eps = () => (controls.values.eps ?? 5) / 100
  const setStep = (i) => {
    step = i
    render(eps())
  }
  render(eps(), false)
  return { setStep }
}

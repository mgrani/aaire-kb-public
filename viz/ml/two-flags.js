// Two red flags among 100 frauds, and what more flags do (PML Lecture 03,
// module The Curse of Dimensionality).
//
// View "overlap": 60 of the 100 frauds show a new device D, 70 a foreign IP F.
// The two rates do not fix how many show both. F can sit anywhere along the
// frauds: from 30 in both (F fills the 40 frauds without D, the rest must
// overlap) to 60 (every D-fraud also shows F). Marked: 42, what multiplying
// the rates assumes (F as frequent with D as without — independence given the
// class), and 55, the count in the data. Below the bars the four groups the
// two flags split the frauds into, and how often F occurs with and without D.
// Colours as on the L02 independence square: D navy, F teal, both dark.
//
// View "patterns": every further flag splits each group in two. One row per
// flag shows the 2^k flag patterns as bars of equal width, their height the
// number of frauds with that pattern (yes before no, so a pattern's children
// sit under it). The counts shrink and empty patterns (red) take over. D and
// F are the running example (55 / 5 / 15 / 25); the further flags are drawn
// with a fixed seed and some dependence on D and F.
//
// params: view ("overlap" | "patterns"); overlap: both (default 55)
// steps overlap: 0 the two rates, F's place open · 1 least overlap 30 ·
//   2 most overlap 60 · 3 independent 42 · 4 the data 55
// steps patterns: 0 the two flags D, F · k: k further flags (5 → 7 flags)

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const DARK = '#0d2a4a'
const RED = '#b5322e'
const GREY = '#64748b'
const PALE = '#e2e8f0'

export async function mount(el, ctx) {
  return (ctx.params.view ?? 'overlap') === 'patterns' ? patterns(el, ctx) : overlap(el, ctx)
}

function overlap(el, { d3, params, steps, isPrint }) {
  const W = 900
  const H = 300
  const X0 = 180
  const PX = 7 // one fraud = 7 px, 100 frauds = 700 px
  const xs = (i) => X0 + i * PX
  const ROW = { all: 46, d: 74, f: 116, h: 32 }
  const STATES = [
    null,
    { both: 30, title: 'Least overlap: F takes all 40 frauds without D — 30 must have D' },
    { both: 60, title: 'Most overlap: every D-fraud also shows F' },
    { both: 42, title: 'Multiplying the rates: 0.60 · 0.70 · 100 = 42' },
    { both: 55, title: 'The data: 55' },
  ]

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Of 100 frauds 60 show a new device and 70 a foreign IP; the number showing both can be anything from 30 to 60')
  const g = svg.append('g')
  const text = (x, y, t, o = {}) => g.append('text').attr('x', x).attr('y', y)
    .attr('font-size', o.size ?? 18).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)
  const pct = (v) => `${Math.round(100 * v)}%`

  let step = 0
  let both = params.both ?? 55
  const controls = addControls(el, { isPrint }, [
    { id: 'both', label: 'frauds with both D and F', type: 'range', min: 30, max: 60, value: both },
  ], (id, v) => { both = v.both; step = Math.max(step, 1); render(true) })

  function render(free = false) {
    g.selectAll('*').remove()
    const open = step === 0
    const st = STATES[step]
    if (!free && st) both = st.both
    const title = open ? '60 of 100 frauds show D, 70 show F. Which frauds show both?'
      : free && both !== st?.both ? `${both} in both` : st.title
    text(W / 2, 22, title, { size: 20, anchor: 'middle', bold: true })

    // the 100 frauds, one cell each
    text(X0 - 14, ROW.all + 12, '100 frauds', { anchor: 'end', colour: GREY })
    for (let i = 0; i < 100; i++) {
      g.append('rect').attr('x', xs(i) + 0.75).attr('y', ROW.all).attr('width', PX - 1.5).attr('height', 14)
        .attr('fill', PALE)
    }

    // D: the first 60 frauds; F: 70 frauds starting at 60 − both
    const s = 60 - both
    text(X0 - 14, ROW.d + 21, 'new device D', { anchor: 'end' })
    text(X0 - 14, ROW.f + 21, 'foreign IP F', { anchor: 'end', colour: TEAL })
    g.append('rect').attr('x', xs(0)).attr('y', ROW.d).attr('width', 60 * PX).attr('height', ROW.h)
      .attr('fill', NAVY).attr('fill-opacity', 0.35)
    if (open) {
      g.append('rect').attr('x', xs(15)).attr('y', ROW.f).attr('width', 70 * PX).attr('height', ROW.h)
        .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 2).attr('stroke-dasharray', '6 4')
      text(xs(50), ROW.f + 23, '← 70 frauds — which ones? →', { anchor: 'middle', colour: TEAL })
      text(xs(30), ROW.d + 22, '60', { anchor: 'middle', bold: true })
      return
    }
    g.append('rect').attr('x', xs(s)).attr('y', ROW.f).attr('width', 70 * PX).attr('height', ROW.h)
      .attr('fill', TEAL).attr('fill-opacity', 0.35)
    for (const y of [ROW.d, ROW.f]) {
      g.append('rect').attr('x', xs(s)).attr('y', y).attr('width', both * PX).attr('height', ROW.h)
        .attr('fill', DARK).attr('fill-opacity', 0.85)
    }
    text(xs(s + both / 2), ROW.d + 22, `both: ${both}`, { anchor: 'middle', bold: true, colour: '#ffffff' })
    if (s >= 6) text(xs(s / 2), ROW.d + 22, `${s}`, { anchor: 'middle', bold: true })
    if (70 - both >= 6) text(xs(60 + (70 - both) / 2), ROW.f + 22, `${70 - both}`, { anchor: 'middle', bold: true, colour: TEAL })

    // the four groups and F with and without D
    const groups = `D only ${s}  ·  both ${both}  ·  F only ${70 - both}  ·  neither ${30 - s}  —  sum 100`
    text(W / 2, 180, groups, { size: 19, anchor: 'middle' })
    const fd = both / 60, fn = (70 - both) / 40
    text(W / 2, 206, `F among the 60 D-frauds: ${pct(fd)}  ·  among the 40 others: ${pct(fn)}`,
      { size: 18, anchor: 'middle', colour: Math.abs(fd - fn) < 1e-9 ? TEAL : GREY, bold: Math.abs(fd - fn) < 1e-9 })

    // number line: how many in both — every value from 30 to 60 fits the rates
    const LY = 256
    text(X0 - 14, LY + 5, 'frauds in both', { anchor: 'end', colour: GREY })
    g.append('line').attr('x1', xs(0)).attr('x2', xs(100)).attr('y1', LY).attr('y2', LY).attr('stroke', PALE).attr('stroke-width', 2)
    const lo = 30, hi = step >= 2 ? 60 : 30
    g.append('rect').attr('x', xs(lo)).attr('y', LY - 7).attr('width', Math.max(3, (hi - lo) * PX)).attr('height', 14)
      .attr('fill', TEAL).attr('fill-opacity', 0.3)
    for (const v of [0, 100]) text(xs(v), LY + 24, `${v}`, { size: 16, anchor: 'middle', colour: GREY })
    text(xs(30), LY - 13, step >= 2 ? '30 least' : 'at least 30', { size: 16, anchor: 'middle', colour: TEAL })
    if (step >= 2) text(xs(60), LY - 13, '60 most', { size: 16, anchor: 'middle', colour: TEAL })
    const marks = [[42, 'multiplied', 3], [55, 'data', 4]].filter(([, , k]) => step >= k)
    for (const [v, label] of marks) {
      g.append('line').attr('x1', xs(v)).attr('x2', xs(v)).attr('y1', LY - 7).attr('y2', LY + 7).attr('stroke', NAVY).attr('stroke-width', 2)
      text(xs(v), LY + 24, `${v} ${label}`, { size: 16, anchor: 'middle' })
    }
    g.append('circle').attr('cx', xs(both)).attr('cy', LY).attr('r', 6).attr('fill', DARK)
  }

  // the slider (and its readout) would give the answer away before step 1
  const bar = el.querySelector('.viz-controls')
  const setStep = (k) => {
    step = k
    if (STATES[k]) controls.set('both', STATES[k].both)
    if (bar) bar.style.visibility = k ? 'visible' : 'hidden'
    render()
  }
  setStep(isPrint ? (steps || 4) : 0)
  return { setStep }
}

// The 100 frauds of the running example: D and F as counted
// (55 both, 5 D only, 15 F only, 25 neither), five further flags drawn.
const FLAGS = ['new device', 'foreign IP', 'night', 'high amount', 'new payee', 'VPN', 'retries']
const FURTHER = [
  (f) => (f[0] && f[1] ? 0.6 : 0.35), // night
  (f) => (f[0] ? 0.55 : 0.25), // high amount
  (f) => (f[0] && f[1] ? 0.7 : 0.3), // new payee
  (f) => (f[1] ? 0.45 : 0.1), // VPN
  () => 0.3, // retries
]

function frauds(seed) {
  const r = rng(seed)
  return Array.from({ length: 100 }, (_, i) => {
    const f = [i < 60 ? 1 : 0, i < 55 || (i >= 60 && i < 75) ? 1 : 0]
    for (const p of FURTHER) f.push(r() < p(f) ? 1 : 0)
    return f
  })
}

// frauds per pattern of the first k flags, yes before no
function counts(rows, k) {
  const c = new Array(2 ** k).fill(0)
  for (const f of rows) {
    let j = 0
    for (let t = 0; t < k; t++) j = 2 * j + (1 - f[t])
    c[j] += 1
  }
  return c
}

function patterns(el, { d3, params, steps, isPrint }) {
  const rows = frauds(params.seed ?? 4)
  const W = 1000
  const RH = 44
  const TOP = 54
  const H = TOP + FLAGS.length * RH + 8
  const X0 = 170
  const BW = 600
  const COL = [850, 925, 995]
  const MAXH = RH - 10

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'With every added flag the frauds split into twice as many patterns, with fewer frauds in each and more patterns empty')
  const g = svg.append('g')
  const text = (x, y, t, o = {}) => g.append('text').attr('x', x).attr('y', y)
    .attr('font-size', o.size ?? 18).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)

  function render(shown) {
    g.selectAll('*').remove()
    text(X0 + BW / 2, 20, 'frauds per flag pattern — 100 frauds', { size: 20, anchor: 'middle', bold: true })
    text(X0 + BW / 2, 42, 'each flag splits every pattern in two: yes | no', { size: 16, anchor: 'middle', colour: GREY })
    text(COL[0], 42, 'patterns', { size: 16, anchor: 'end', colour: GREY })
    text(COL[1], 42, 'average', { size: 16, anchor: 'end', colour: GREY })
    text(COL[2], 42, 'empty', { size: 16, anchor: 'end', colour: RED })
    for (let k = 1; k <= shown; k++) {
      const c = counts(rows, k)
      const base = TOP + k * RH - 4
      const w = BW / c.length
      text(X0 - 12, base - 8, (k > 1 ? '+ ' : '') + FLAGS[k - 1], { anchor: 'end' })
      g.append('line').attr('x1', X0).attr('x2', X0 + BW).attr('y1', base).attr('y2', base).attr('stroke', PALE)
      c.forEach((n, j) => {
        const x = X0 + j * w
        if (!n) {
          g.append('rect').attr('x', x + w * 0.15).attr('y', base + 1).attr('width', Math.max(1.5, w * 0.7)).attr('height', 3).attr('fill', RED)
          return
        }
        const h = Math.max(1.5, (MAXH * Math.min(n, 60)) / 60)
        g.append('rect').attr('x', x + Math.min(1, w * 0.1)).attr('y', base - h).attr('width', Math.max(1, w - 2 * Math.min(1, w * 0.1))).attr('height', h)
          .attr('fill', TEAL).attr('fill-opacity', 0.75)
        if (w < 30) return
        const inside = h >= 20 // a tall bar carries its count, a low one has it on top
        text(x + w / 2, inside ? base - h / 2 + 5 : base - h - 3, `${n}`,
          { size: 15, anchor: 'middle', bold: inside, colour: inside ? '#ffffff' : NAVY })
      })
      const empty = c.filter((n) => !n).length
      const avg = 100 / c.length
      text(COL[0], base - 8, `${c.length}`, { anchor: 'end' })
      text(COL[1], base - 8, avg >= 10 ? `${+avg.toFixed(1)}` : avg.toFixed(1), { anchor: 'end' })
      text(COL[2], base - 8, `${empty}`, { anchor: 'end', colour: RED, bold: empty > 0 })
    }
  }

  const setStep = (k) => render(Math.min(FLAGS.length, 2 + k))
  setStep(isPrint ? (steps || FLAGS.length - 2) : 0)
  return { setStep }
}

// Variance and skewness as one picture: deviations from the mean, raised to a
// power, then averaged (Principle 6, tier 3).
//
// A small sample sits on a number line; below it, every point gets a bar of
// its deviation from the mean raised to `power`. The dashed line is the bars'
// average. The two slides differ only in the power, so the rule is visible
// as one rule:
//   power 2  squared deviations — none can cancel; average = s²
//   power 3  cubed standardised deviations — the sign stays and the far point
//            dominates; average = skewness
// The last point is draggable (and on a slider), so the effect of one far
// value on each statistic can be tried.
//
// params:
//   values   the fixed part of the sample
//   movable  starting value of the draggable point
//   power    2 or 3
//   domain   [lo, hi] for the axis
//   unit     suffix for the readouts
// steps: 1 the mean · 2 the bars · 3 their average

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const RED = '#dc2626'
const GREEN = '#16803c'
const TEAL = '#0083A1'
const AMBER = '#d97706'
const RULE = '#dde3ea'
const MUTED = '#475569'

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const fmt = (v) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(Math.abs(v) >= 100 ? 0 : 2))

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 760
  const H = 362
  const LINE = 92
  const PANEL_TOP = 146
  const PANEL_BOT = 326
  const fixed = params.values ?? [3, 4, 4.5, 5, 5.5, 6, 7, 9]
  const start = params.movable ?? 13
  const power = params.power ?? 2
  const unit = params.unit ?? ''
  const [lo, hi] = params.domain ?? [0, 20]

  const x = d3.scaleLinear().domain([lo, hi]).range([54, W - 40])
  // Power 2 is never negative, so its bars stand on the bottom edge; power 3
  // is signed and hangs from a zero line in the middle of the panel.
  const ZERO = power === 2 ? PANEL_BOT : (PANEL_TOP + PANEL_BOT) / 2

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', `A sample on a number line; below it each deviation from the mean raised to the power ${power}, and their average`)

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  svg.append('line')
    .attr('x1', x(lo)).attr('x2', x(hi)).attr('y1', LINE).attr('y2', LINE)
    .attr('stroke', RULE).attr('stroke-width', 7).attr('stroke-linecap', 'round')
  svg.append('g')
    .attr('transform', `translate(0,${LINE + 14})`)
    .attr('color', MUTED)
    .call(d3.axisBottom(x).ticks(10).tickSize(4))
    .attr('font-size', 13)

  const gPanel = svg.append('g')
  const gMarks = svg.append('g')
  const gPts = svg.append('g')

  let value = start
  let step = 0

  function render() {
    const data = [...fixed, value]
    const n = data.length
    const mean = d3.mean(data)
    const dev = data.map((d) => d - mean)
    const s = Math.sqrt(d3.mean(dev, (d) => d * d))
    const bar = dev.map((d) => (power === 3 ? (d / s) ** 3 : d ** power))
    const avg = d3.mean(bar)

    gPts.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => x(d)).attr('cy', LINE)
      .attr('r', (d, i) => (i === n - 1 ? 10 : 6.5))
      .attr('fill', (d, i) => (i === n - 1 ? TEAL : NAVY))
      .attr('stroke', '#fff').attr('stroke-width', (d, i) => (i === n - 1 ? 2.5 : 1))
      .style('cursor', (d, i) => (i === n - 1 ? 'ew-resize' : 'default'))

    gMarks.selectAll('*').remove()
    gPanel.selectAll('*').remove()

    if (step >= 1) {
      gMarks.append('path')
        .attr('d', `M ${x(mean)} ${LINE + 6} l -10 18 l 20 0 Z`)
        .attr('fill', RED)
      gMarks.append('text')
        .attr('x', x(mean)).attr('y', LINE - 18).attr('text-anchor', 'middle')
        .attr('font-size', 16).attr('fill', RED)
        .text(`x̄ = ${mean.toFixed(2)}${unit}`)
      if (power === 3) {
        const med = median(data)
        gMarks.append('line')
          .attr('x1', x(med)).attr('x2', x(med))
          .attr('y1', LINE - 14).attr('y2', LINE + 14)
          .attr('stroke', GREEN).attr('stroke-width', 3)
        gMarks.append('text')
          .attr('x', x(med)).attr('y', LINE - 44).attr('text-anchor', 'middle')
          .attr('font-size', 14).attr('fill', GREEN)
          .text(`median ${med}`)
      }
    }

    if (step >= 2) {
      const reach = power === 2 ? ZERO - PANEL_TOP : (PANEL_BOT - PANEL_TOP) / 2
      const big = Math.max(d3.max(bar, Math.abs), Math.abs(avg), 1e-9)
      const h = (v) => (v / big) * (reach - 6)

      gPanel.append('line')
        .attr('x1', x(lo)).attr('x2', x(hi)).attr('y1', ZERO).attr('y2', ZERO)
        .attr('stroke', MUTED).attr('stroke-width', 1.5)
      gPanel.append('line')
        .attr('x1', x(mean)).attr('x2', x(mean)).attr('y1', LINE + 26).attr('y2', PANEL_BOT)
        .attr('stroke', RED).attr('stroke-width', 1).attr('stroke-dasharray', '3 4')
      gPanel.append('text')
        .attr('x', x(lo)).attr('y', PANEL_TOP - 6).attr('font-size', 14).attr('fill', MUTED)
        .text(power === 2 ? '(x − x̄)²' : '((x − x̄) / s)³')

      gPanel.selectAll('rect.bar')
        .data(bar)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (d, i) => x(data[i]) - 6).attr('width', 12)
        .attr('y', (d) => ZERO - Math.max(h(d), 0))
        .attr('height', (d) => Math.max(Math.abs(h(d)), 1))
        .attr('fill', (d, i) => (dev[i] >= 0 ? TEAL : AMBER))
        .attr('fill-opacity', 0.8)

      if (step >= 3) {
        gPanel.append('line')
          .attr('x1', x(lo)).attr('x2', x(hi)).attr('y1', ZERO - h(avg)).attr('y2', ZERO - h(avg))
          .attr('stroke', RED).attr('stroke-width', 2.5).attr('stroke-dasharray', '8 5')
        const label = power === 2
          ? `average = s² = ${fmt(avg)}   ·   s = ${s.toFixed(2)}${unit}`
          : `average = skewness = ${fmt(avg)}`
        // The readout sits under the panel: on the line it would collide with
        // whichever bar happens to be tallest.
        gPanel.append('line')
          .attr('x1', W / 2 - 170).attr('x2', W / 2 - 140).attr('y1', H - 12).attr('y2', H - 12)
          .attr('stroke', RED).attr('stroke-width', 2.5).attr('stroke-dasharray', '8 5')
        gPanel.append('text')
          .attr('x', W / 2 - 132).attr('y', H - 6)
          .attr('font-size', 16).attr('fill', RED).attr('font-weight', 700)
          .text(label)
      }
    }

    const text = {
      2: ['The sample', 'The mean', 'Square them: nothing cancels, far points count most',
        'The variance is the average square'],
      3: ['The sample', 'Mean and median', 'Cube them in units of s: the sign stays',
        avg > 0.05 ? 'Right side outweighs left: skewed right' : avg < -0.05
          ? 'Left side outweighs right: skewed left' : 'Both sides balance: symmetric'],
    }[power]
    caption.text(text[step])
  }

  if (!isPrint) {
    // d3.pointer inverts the SVG's screen CTM, so dragging stays correct under
    // Reveal's scaling transform.
    const clamp = (v) => Math.min(hi, Math.max(lo, v))
    svg.call(
      d3.drag()
        .filter((event) => {
          const [px, py] = d3.pointer(event, svg.node())
          return Math.abs(px - x(value)) < 24 && Math.abs(py - LINE) < 30
        })
        .on('start drag', (event) => {
          value = clamp(Math.round(2 * x.invert(d3.pointer(event, svg.node())[0])) / 2)
          controls.set('far', value)
          render()
        }),
    )
  }

  const controls = addControls(
    el,
    { isPrint },
    [
      { id: 'far', label: 'the light point', type: 'range', min: lo, max: hi, step: 0.5,
        value: start, format: (v) => `${v}${unit}` },
      { id: 'reset', label: 'Reset', type: 'button' },
    ],
    (id, values) => {
      value = id === 'reset' ? start : values.far
      if (id === 'reset') controls.set('far', start)
      render()
    },
  )

  const setStep = (i) => {
    step = i
    render()
  }
  setStep(isPrint ? steps || 3 : steps ? 0 : 3)
  return { setStep }
}

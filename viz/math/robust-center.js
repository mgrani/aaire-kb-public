// Mean versus median under a moving outlier (Principle 6, tier 3).
//
// The sample sits on a number line. One point is draggable. The mean is drawn
// as the fulcrum the beam balances on, so pulling one value out to the right is
// visibly a lever — and the long empty stretch the fulcrum travels across *is*
// the lesson. The median is a position in the order, so it barely moves.
//
// Both markers carry their own value, so nothing has to be read off a corner.
//
// Uses only: sample, mean, median. No distributional assumption.
//
// params:
//   values   the fixed part of the sample
//   movable  starting value of the draggable point
//   domain   [lo, hi] for the axis
//   unit     suffix for the readouts (e.g. " k€")
// steps: 1 the mean · 2 the median · 3 the invitation to drag

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const GREEN = '#16803c'
const RED = '#dc2626'
const TEAL = '#0083A1'
const RULE = '#dde3ea'

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 760
  const H = 330
  const BEAM = 172
  const fixed = params.values ?? [38, 41, 42, 44, 45, 47]
  const start = params.movable ?? 49
  const unit = params.unit ?? ' k€'
  // Wide enough that the fulcrum has somewhere to travel, tight enough that
  // the six clustered salaries stay individually visible.
  const [lo, hi] = params.domain ?? [30, 130]

  const x = d3.scaleLinear().domain([lo, hi]).range([54, W - 40])

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'A sample on a number line with its mean and median marked')

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  // The track the movable point can cover — makes the empty right-hand side
  // read as "room to drag" rather than as wasted canvas.
  svg.append('line')
    .attr('x1', x(lo)).attr('x2', x(hi)).attr('y1', BEAM).attr('y2', BEAM)
    .attr('stroke', RULE).attr('stroke-width', 7).attr('stroke-linecap', 'round')

  svg.append('g')
    .attr('transform', `translate(0,${BEAM + 74})`)
    .attr('color', NAVY)
    .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}`))
    .attr('font-size', 14)

  const gPts = svg.append('g')
  const gMarks = svg.append('g')

  let value = start
  let step = 0

  function render() {
    const data = [...fixed, value]
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const med = median(data)

    // Values only a few pixels apart would hide each other, so near-coincident
    // points stack upward instead.
    const order = data.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
    const level = new Map()
    let prev = -Infinity
    let prevI = -1
    let k = 0
    const last = data.length - 1
    for (const p of order) {
      // the movable point is drawn larger (r 10), so it needs a wider berth
      const gap = p.i === last || prevI === last ? 17 : 13
      k = x(p.v) - prev < gap ? k + 1 : 0
      level.set(p.i, k)
      prev = x(p.v)
      prevI = p.i
    }

    gPts
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => x(d))
      .attr('cy', (d, i) => BEAM - level.get(i) * 13)
      .attr('r', (d, i) => (i === data.length - 1 ? 10 : 6.5))
      .attr('fill', (d, i) => (i === data.length - 1 ? TEAL : NAVY))
      .attr('stroke', (d, i) => (i === data.length - 1 ? '#fff' : 'none'))
      .attr('stroke-width', 2.5)
      .style('cursor', (d, i) => (i === data.length - 1 ? 'ew-resize' : 'default'))

    gMarks.selectAll('*').remove()

    if (step >= 1) {
      // The mean as a fulcrum: the beam balances exactly there.
      gMarks.append('path')
        .attr('d', `M ${x(mean)} ${BEAM + 6} l -12 21 l 24 0 Z`)
        .attr('fill', RED)
      gMarks.append('text')
        .attr('x', x(mean)).attr('y', BEAM + 48)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', RED)
        .text(`mean ${mean.toFixed(1)}${unit}`)
    }
    if (step >= 2) {
      gMarks.append('line')
        .attr('x1', x(med)).attr('x2', x(med))
        .attr('y1', BEAM - 52).attr('y2', BEAM - 8)
        .attr('stroke', GREEN).attr('stroke-width', 3)
      gMarks.append('text')
        .attr('x', x(med)).attr('y', BEAM - 60)
        .attr('text-anchor', 'middle').attr('font-size', 17).attr('fill', GREEN)
        .text(`median ${med.toFixed(1)}${unit}`)
    }

    if (step >= 3) {
      const below = data.filter((d) => d < mean).length
      caption.attr('fill', NAVY).text(
        below >= data.length - 1
          ? `The mean is now above ${below} of the ${data.length} salaries`
          : 'Drag the light point — which marker follows it?',
      )
    } else if (step === 2) {
      caption.attr('fill', NAVY).text('The median is a position in the order, not a total')
    } else if (step === 1) {
      caption.attr('fill', NAVY).text('The mean is where the beam balances')
    } else {
      caption.attr('fill', NAVY).text(`${fixed.length + 1} salaries`)
    }
  }

  if (!isPrint) {
    // Drag anywhere near the movable point. d3.pointer inverts the SVG's screen
    // CTM, so this stays correct under Reveal's scaling transform.
    const clamp = (v) => Math.min(hi, Math.max(lo, v))
    svg.call(
      d3
        .drag()
        .filter((event) => {
          const [px, py] = d3.pointer(event, svg.node())
          return Math.abs(px - x(value)) < 24 && Math.abs(py - BEAM) < 30
        })
        .on('start drag', (event) => {
          value = clamp(Math.round(x.invert(d3.pointer(event, svg.node())[0])))
          controls.set('out', value)
          render()
        }),
    )
  }

  // The slider is the keyboard-accessible path to the same manipulation as the
  // drag; both write `value`, and each keeps the other in sync.
  const controls = addControls(
    el,
    { isPrint },
    [
      { id: 'out', label: 'the outlier', type: 'range', min: lo, max: hi, value: start,
        format: (v) => `${v}${unit}` },
      { id: 'reset', label: 'Reset', type: 'button' },
    ],
    (id, values) => {
      value = id === 'reset' ? start : values.out
      if (id === 'reset') controls.set('out', start)
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

// A batch of card transactions passing a fraud model. The point of the picture
// is what a *label* does and does not carry: in "labels" mode the flagged
// transactions end up visually identical, however different their cases are;
// in "scores" mode the same batch carries a probability and the differences
// reappear (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// params:
//   mode:  "labels" (default) — stamp fraud / ok, then isolate the flagged ones
//          "scores"           — same batch, flagged cases carry a probability
//   steps: 3 in both modes (arrive → label → isolate/quantify)

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#b5322e'
const GREEN = '#16803c'
const INK = '#3a3a3a'
const RULE = '#dde3ea'
const SURFACE = '#f6f8fa'

// One deliberately mixed batch: routine spending plus three cases a model
// would flag for quite different reasons.
const TX = [
  { m: 'Café Central', a: '€4.20', fraud: false },
  { m: 'Supermarket', a: '€63.10', fraud: false },
  { m: 'Electronics Online', a: '€1,299.00', fraud: true, p: 0.98 },
  { m: 'Petrol Station', a: '€78.40', fraud: false },
  { m: 'Gift Cards ×12', a: '€600.00', fraud: true, p: 0.55 },
  { m: 'Bookshop', a: '€24.90', fraud: false },
  { m: 'Hotel Booking', a: '€410.00', fraud: true, p: 0.51 },
  { m: 'Pharmacy', a: '€12.75', fraud: false },
]

const COLS = 4
const CW = 172
const CH = 104
const GAP = 18

export async function mount(el, { d3, params, steps, isPrint }) {
  const mode = params.mode ?? 'labels'
  const W = 760
  const H = 372
  const x0 = (W - (COLS * CW + (COLS - 1) * GAP)) / 2
  const y0 = 84

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 30).attr('text-anchor', 'middle')
    .attr('font-size', 21).attr('fill', NAVY)
  const subcaption = svg.append('text')
    .attr('x', W / 2).attr('y', 56).attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('fill', TEAL)

  const cards = svg.append('g').selectAll('g').data(TX).join('g')
    .attr('transform', (_, i) =>
      `translate(${x0 + (i % COLS) * (CW + GAP)},${y0 + Math.floor(i / COLS) * (CH + GAP)})`)

  cards.append('rect')
    .attr('class', 'card-bg')
    .attr('width', CW).attr('height', CH).attr('rx', 4)
    .attr('fill', SURFACE).attr('stroke', RULE).attr('stroke-width', 1)
  // top accent, coloured once the model has spoken
  cards.append('rect')
    .attr('class', 'card-accent')
    .attr('width', CW).attr('height', 3)
    .attr('fill', RULE)

  cards.append('text')
    .attr('x', 12).attr('y', 26).attr('font-size', 13).attr('font-weight', 600)
    .attr('fill', NAVY).text((d) => d.m)
  cards.append('text')
    .attr('x', 12).attr('y', 56).attr('font-size', 21).attr('fill', INK)
    .text((d) => d.a)

  // Verdict area
  const stampBox = cards.append('rect')
    .attr('class', 'stamp')
    .attr('x', 12).attr('y', 66).attr('height', 24).attr('rx', 3)
    .attr('width', 0).attr('opacity', 0)
  const stampText = cards.append('text')
    .attr('class', 'stamp-label')
    .attr('x', 21).attr('y', 83).attr('font-size', 13).attr('font-weight', 700)
    .attr('fill', '#ffffff').attr('opacity', 0)
  // score bar, scores mode only
  const barTrack = cards.append('rect')
    .attr('x', 12).attr('y', 94).attr('height', 4).attr('rx', 2)
    .attr('width', CW - 24).attr('fill', RULE).attr('opacity', 0)
  const barFill = cards.append('rect')
    .attr('x', 12).attr('y', 94).attr('height', 4).attr('rx', 2)
    .attr('width', 0).attr('fill', RED).attr('opacity', 0)

  function render(step, animate = true) {
    const s = isPrint ? 3 : step
    const labelled = s >= 1
    const focused = s >= 2
    // Always a transition, so .delay() is available; duration 0 when the
    // caller wants an immediate frame (first render, print view).
    const t = (sel) => sel.transition().duration(animate ? 320 : 0)

    t(cards.selectAll('.card-accent'))
      .attr('fill', (d) => (labelled ? (d.fraud ? RED : GREEN) : RULE))

    t(stampBox)
      .delay((_, i) => (animate && s === 1 ? i * 55 : 0))
      .attr('opacity', labelled ? 1 : 0)
      .attr('width', labelled ? (mode === 'scores' && s >= 2 ? 118 : 78) : 0)
      .attr('fill', (d) => (d.fraud ? RED : GREEN))
    t(stampText)
      .delay((_, i) => (animate && s === 1 ? i * 55 : 0))
      .attr('opacity', labelled ? 1 : 0)
      .text((d) =>
        !d.fraud ? 'legitimate'
          : mode === 'scores' && s >= 2 ? `fraud · ${d.p.toFixed(2)}`
          : 'fraud')

    // In labels mode the legitimate cases recede so the flagged ones can be
    // compared with each other — and turn out to be indistinguishable.
    t(cards)
      .attr('opacity', (d) => (focused && !d.fraud ? 0.2 : 1))

    const showBars = mode === 'scores' && s >= 2
    t(barTrack).attr('opacity', (d) => (showBars && d.fraud ? 1 : 0))
    t(barFill)
      .attr('opacity', (d) => (showBars && d.fraud ? 1 : 0))
      .attr('width', (d) => (showBars && d.fraud ? (CW - 24) * d.p : 0))

    if (mode === 'scores') {
      caption.text(s === 0 ? 'The same eight transactions'
        : s === 1 ? 'The model labels each one'
        : 'Now every flagged case carries a number')
      subcaption.text(s >= 2 ? '0.98, 0.55, 0.51 — three very different cases' : '')
    } else {
      caption.text(s === 0 ? 'Eight card transactions arrive'
        : s === 1 ? 'The model labels each one'
        : 'Three are flagged as fraud')
      subcaption.text(s >= 2 ? 'and the three labels are identical' : '')
    }
  }

  render(steps, false)
  return { setStep: (i) => render(i) }
}

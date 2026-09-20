// A random variable is a function on the sample space (Principle 6, tier 2).
//
// Ω on the left, the range on the right, one arrow per outcome. The picture
// makes the two things the definition asserts literal: X is a mapping, and the
// probability of a value is the total probability of the outcomes that land on
// it — which is why several arrows meeting at one value give it a taller bar.
//
// Uses only: sample space, outcomes, Laplace probability.
//
// params: none (three fair coins; the example the unit already uses)
// steps: 1 the outcomes · 2 the mapping · 3 the values, counted ·
//        4 the probability mass function

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const PALE = '#eef2f6'
const RULE = '#dde3ea'

const OUTCOMES = ['HHH', 'HHT', 'HTH', 'THH', 'HTT', 'THT', 'TTH', 'TTT']
const heads = (o) => [...o].filter((c) => c === 'H').length

export async function mount(el, { d3, steps }) {
  const W = 760
  const H = 430
  const LX = 132 // Ω column centre
  const RX = 452 // range column centre
  const BX = 540 // where the mass bars start
  const TOP = 68

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Each of the eight coin outcomes mapped to its number of heads')

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  const oy = (i) => TOP + i * 42
  const vy = (v) => TOP + 34 + (3 - v) * 80

  svg.append('text').attr('x', LX).attr('y', 50).attr('text-anchor', 'middle')
    .attr('font-size', 18).attr('fill', NAVY).text('Ω  (outcomes)')
  svg.append('text').attr('x', RX).attr('y', 50).attr('text-anchor', 'middle')
    .attr('font-size', 18).attr('fill', VIOLET).text('Y  (number of heads)')

  const gArrows = svg.append('g')
  const gOut = svg.append('g')
  const gVals = svg.append('g')
  const gBars = svg.append('g')

  svg.append('defs').append('marker')
    .attr('id', 'rvm-head').attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', TEAL)

  function render(step) {
    gOut.selectAll('*').remove()
    gArrows.selectAll('*').remove()
    gVals.selectAll('*').remove()
    gBars.selectAll('*').remove()

    const o = gOut.selectAll('g').data(OUTCOMES).join('g')
    o.append('rect')
      .attr('x', LX - 52).attr('y', (d, i) => oy(i) - 15)
      .attr('width', 104).attr('height', 30).attr('rx', 5)
      .attr('fill', PALE).attr('stroke', RULE)
    o.append('text')
      .attr('x', LX).attr('y', (d, i) => oy(i) + 6)
      .attr('text-anchor', 'middle').attr('font-size', 18)
      .attr('font-family', 'ui-monospace, monospace').attr('fill', NAVY)
      .text((d) => d)

    if (step >= 2) {
      gArrows.selectAll('path').data(OUTCOMES).join('path')
        .attr('d', (d, i) => {
          const y1 = oy(i)
          const y2 = vy(heads(d))
          return `M ${LX + 58} ${y1} C ${LX + 150} ${y1}, ${RX - 150} ${y2}, ${RX - 44} ${y2}`
        })
        .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 1.8)
        .attr('opacity', 0.75).attr('marker-end', 'url(#rvm-head)')
    }

    if (step >= 3) {
      const counts = [0, 1, 2, 3].map((v) => OUTCOMES.filter((o2) => heads(o2) === v).length)
      const v = gVals.selectAll('g').data([0, 1, 2, 3]).join('g')
      v.append('circle')
        .attr('cx', RX).attr('cy', (d) => vy(d)).attr('r', 21)
        .attr('fill', '#fff').attr('stroke', VIOLET).attr('stroke-width', 2.5)
      v.append('text')
        .attr('x', RX).attr('y', (d) => vy(d) + 7)
        .attr('text-anchor', 'middle').attr('font-size', 20).attr('fill', VIOLET)
        .text((d) => d)
      v.append('text')
        .attr('x', RX + 30).attr('y', (d) => vy(d) + 5)
        .attr('font-size', 15).attr('fill', NAVY)
        .attr('opacity', step >= 4 ? 0 : 1)
        .text((d) => `${counts[d]}/8`)

      if (step >= 4) {
        const bw = 170
        const b = gBars.selectAll('g').data([0, 1, 2, 3]).join('g')
        b.append('rect')
          .attr('x', BX).attr('y', (d) => vy(d) - 13)
          .attr('width', (d) => (bw * counts[d]) / 8).attr('height', 26)
          .attr('fill', VIOLET).attr('opacity', 0.8)
        b.append('text')
          .attr('x', (d) => BX + (bw * counts[d]) / 8 + 8).attr('y', (d) => vy(d) + 6)
          .attr('font-size', 16).attr('fill', NAVY)
          .text((d) => `P(Y = ${d}) = ${counts[d]}/8`)
      }
    }

    if (step >= 4) {
      caption.attr('fill', VIOLET).text('Three arrows arrive at 1 and at 2 — which is the whole shape')
    } else if (step === 3) {
      caption.attr('fill', NAVY).text('Four values. How much probability arrives at each?')
    } else if (step === 2) {
      caption.attr('fill', NAVY).text('Y assigns exactly one number to every outcome — it is a function')
    } else {
      caption.attr('fill', NAVY).text('Eight equally likely outcomes')
    }
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

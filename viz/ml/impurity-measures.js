// Impurity measures for a binary split: entropy, Gini and misclassification
// error as functions of the class proportion p (docs/PEDAGOGIC_CONCEPT.md,
// Principle 6 tier 2). Each step adds one curve, then marks a concrete split.
//
// Used by ml/decision-trees/dt-impurity.

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const RULE = '#dde3ea'

const entropy = (p) => (p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)))
const gini = (p) => 2 * p * (1 - p)
const misclass = (p) => Math.min(p, 1 - p)

const CURVES = [
  { key: 'entropy', label: 'Entropy  −p log₂p − (1−p) log₂(1−p)', f: entropy, colour: NAVY },
  { key: 'gini', label: 'Gini  2p(1−p)', f: gini, colour: TEAL },
  { key: 'misclass', label: 'Misclassification  min(p, 1−p)', f: misclass, colour: VIOLET },
]

export async function mount(el, { d3, params, steps }) {
  const mark = params.mark ?? 0.8   // the "mostly one class" node highlighted at the last step
  const W = 700
  const H = 380
  const M = { top: 52, right: 26, bottom: 52, left: 62 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const x = d3.scaleLinear([0, 1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, 1.05], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5)).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(4)).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 14).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 16).text('p  (proportion of class 1 in the node)')

  const caption = svg.append('text').attr('x', W / 2).attr('y', 26)
    .attr('text-anchor', 'middle').attr('font-size', 20).attr('fill', NAVY)

  const grid = d3.range(0, 1.001, 0.005)
  const layers = CURVES.map((c) => ({
    ...c,
    path: svg.append('path')
      .datum(grid.map((p) => [p, c.f(p)]))
      .attr('d', d3.line().x((q) => x(q[0])).y((q) => y(q[1])))
      .attr('fill', 'none').attr('stroke', c.colour).attr('stroke-width', 3).attr('opacity', 0),
    legend: svg.append('text').attr('x', M.left + 8).attr('y', 0).attr('font-size', 15)
      .attr('fill', c.colour).attr('opacity', 0).text(c.label),
  }))

  const marker = svg.append('g').attr('opacity', 0)
  marker.append('line').attr('y1', y(0)).attr('y2', y(1.02))
    .attr('stroke', RULE).attr('stroke-width', 2).attr('stroke-dasharray', '5 4')
  const markDot = marker.append('circle').attr('r', 6).attr('fill', NAVY)
  const markLabel = marker.append('text').attr('font-size', 16).attr('fill', NAVY)

  function render(step) {
    layers.forEach((l, i) => {
      const on = step > i
      l.path.transition().duration(300).attr('opacity', on ? 1 : 0)
      l.legend.attr('y', M.top - 22 + i * 20).transition().duration(300).attr('opacity', on ? 1 : 0)
    })
    if (step >= 4) {
      marker.attr('opacity', 1)
      marker.select('line').attr('x1', x(mark)).attr('x2', x(mark))
      markDot.attr('cx', x(mark)).attr('cy', y(entropy(mark)))
      markLabel.attr('x', x(mark) + 12).attr('y', y(entropy(mark)) - 10)
        .text(`p = ${mark}: entropy ${entropy(mark).toFixed(2)} bits`)
      caption.text('A node that is 80% one class is already fairly pure')
    } else {
      marker.attr('opacity', 0)
      caption.text(
        step === 0 ? 'How impure is a node?'
        : step === 1 ? 'Maximal at p = 0.5, zero at a pure node'
        : step === 2 ? 'Gini has the same shape, cheaper to compute'
        : 'Misclassification is flatter — it discriminates splits poorly',
      )
    }
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

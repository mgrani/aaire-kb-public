// Anscombe's quartet: four datasets with (almost) identical summary
// statistics and completely different structure. Stepping reveals one dataset
// at a time, then the shared statistics (Anscombe 1973).
//
// params: none

const NAVY = '#164374'
const TEAL = '#0083A1'

const DATA = [
  { name: 'I', pts: [[10,8.04],[8,6.95],[13,7.58],[9,8.81],[11,8.33],[14,9.96],[6,7.24],[4,4.26],[12,10.84],[7,4.82],[5,5.68]] },
  { name: 'II', pts: [[10,9.14],[8,8.14],[13,8.74],[9,8.77],[11,9.26],[14,8.10],[6,6.13],[4,3.10],[12,9.13],[7,7.26],[5,4.74]] },
  { name: 'III', pts: [[10,7.46],[8,6.77],[13,12.74],[9,7.11],[11,7.81],[14,8.84],[6,6.08],[4,5.39],[12,8.15],[7,6.42],[5,5.73]] },
  { name: 'IV', pts: [[8,6.58],[8,5.76],[8,7.71],[8,8.84],[8,8.47],[8,7.04],[8,5.25],[19,12.50],[8,5.56],[8,7.91],[8,6.89]] },
]

export async function mount(el, { d3, steps }) {
  const W = 720
  const H = 430
  const cw = W / 2
  const ch = (H - 46) / 2
  const M = { top: 14, right: 16, bottom: 30, left: 38 }

  // one extra row below the grid for the shared statistics (last step)
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H + 28}`).attr('role', 'img')
  const caption = svg.append('text').attr('x', W / 2).attr('y', H - 8)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  // values computed from DATA (sample variance, n − 1); identical to the
  // precision shown for all four sets
  const stats = svg.append('text').attr('x', W / 2).attr('y', H + 20)
    .attr('text-anchor', 'middle').attr('font-size', 16).attr('fill', TEAL)
    .text('all four:  x̄ = 9,  s²ₓ = 11,  ȳ = 7.50,  s²ᵧ ≈ 4.12,  r ≈ 0.82,  ŷ = 3.00 + 0.500·x')
    .attr('opacity', 0)

  const panels = DATA.map((d, i) => {
    const gx = (i % 2) * cw
    const gy = Math.floor(i / 2) * ch + 20
    const g = svg.append('g').attr('transform', `translate(${gx},${gy})`)
    const x = d3.scaleLinear([2, 20], [M.left, cw - M.right])
    const y = d3.scaleLinear([2, 14], [ch - M.bottom, M.top])
    g.append('g').attr('transform', `translate(0,${ch - M.bottom})`)
      .call(d3.axisBottom(x).ticks(4)).attr('color', '#9aa5b1').attr('font-size', 12)
    g.append('g').attr('transform', `translate(${M.left},0)`)
      .call(d3.axisLeft(y).ticks(4)).attr('color', '#9aa5b1').attr('font-size', 12)
    // top-left: the regression line ends in the top-right corner
    g.append('text').attr('x', M.left + 10).attr('y', M.top + 12)
      .attr('text-anchor', 'start').attr('fill', NAVY).attr('font-size', 16)
      .attr('font-weight', 'bold').text(d.name)
    // shared least-squares line y = 3 + 0.5x
    const line = g.append('line')
      .attr('x1', x(2)).attr('y1', y(3 + 0.5 * 2))
      .attr('x2', x(20)).attr('y2', y(3 + 0.5 * 20))
      .attr('stroke', TEAL).attr('stroke-width', 2.5).attr('opacity', 0)
    const dots = g.append('g').selectAll('circle').data(d.pts).join('circle')
      .attr('cx', (p) => x(p[0])).attr('cy', (p) => y(p[1])).attr('r', 4.5)
      .attr('fill', NAVY).attr('opacity', 0)
    return { g, dots, line }
  })

  function render(step) {
    panels.forEach((p, i) => {
      p.dots.transition().duration(250).attr('opacity', step > i ? 0.85 : 0)
      p.line.transition().duration(250).attr('opacity', step >= 5 ? 1 : 0)
    })
    stats.transition().duration(250).attr('opacity', step >= 5 ? 1 : 0)
    caption.text(
      step >= 5 ? 'Same mean, same variance, same correlation, same regression line — different data'
      : step >= 4 ? 'Four datasets. Now compare their summary statistics…'
      : step === 0 ? "Anscombe's quartet" : `Dataset ${DATA[step - 1].name}`,
    )
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

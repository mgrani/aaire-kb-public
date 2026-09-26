// Reliability diagram: predicted score against the observed frequency of the
// positive class among cases with that score (docs/PEDAGOGIC_CONCEPT.md,
// Principle 6 tier 2). A calibrated model lies on the diagonal.
//
// params:
//   series: which models to add, one per step, in order (default
//           ["calibrated", "overconfident"]). Available:
//             calibrated    — on the diagonal, up to sampling noise
//             overconfident — log-odds twice too large (observed = σ(logit(s)/2))
//             rebalanced    — trained on 50/50, used at a base rate of 1/1,000:
//                             observed odds = score odds × 1/999
//   highlight: a score to annotate on the last series (default none), e.g. 0.9
//
// Step 0 shows the diagonal only; step k adds the k-th series. Axes fixed.

const NAVY = '#164374'
const GREEN = '#16803c'
const AMBER = '#d97706'
const RED = '#dc2626'
const GRAY = '#8a8a8a'

const SCORES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
// fixed "sampling noise" for the calibrated model, so every render is identical
const JITTER = [0.02, -0.03, 0.01, 0.03, -0.02, 0.02, -0.01, -0.03, 0.02]
const logit = (p) => Math.log(p / (1 - p))
const sig = (z) => 1 / (1 + Math.exp(-z))

const MODELS = {
  calibrated: {
    label: 'calibrated',
    colour: GREEN,
    observed: (s, i) => s + JITTER[i],
  },
  overconfident: {
    label: 'over-confident: log-odds ×2',
    colour: AMBER,
    observed: (s) => sig(logit(s) / 2),
  },
  rebalanced: {
    label: 'trained 50/50, used at 1 in 1,000',
    colour: RED,
    observed: (s) => {
      const o = s / (1 - s) / 999
      return o / (1 + o)
    },
  },
}

export async function mount(el, { d3, params, steps }) {
  const series = (params.series ?? ['calibrated', 'overconfident']).filter((k) => MODELS[k])
  const W = 560
  const H = 520
  const M = { top: 24, right: 20, bottom: 64, left: 78 }
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Reliability diagram: predicted score against observed frequency')
  const x = d3.scaleLinear([0, 1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, 1], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5)).attr('font-size', 17).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(5)).attr('font-size', 17).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 14).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 20).text('model score s')
  svg.append('text').attr('transform', `translate(20,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 20)
    .text('observed frequency of fraud')

  svg.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1))
    .attr('stroke', GRAY).attr('stroke-width', 2).attr('stroke-dasharray', '6 5')
  svg.append('text').attr('x', x(0.62)).attr('y', y(0.62) - 12).attr('fill', GRAY).attr('font-size', 18)
    .attr('transform', `rotate(${-Math.atan2(y(0) - y(1), x(1) - x(0)) * 180 / Math.PI},${x(0.62)},${y(0.62) - 12})`)
    .text('perfectly calibrated')

  const groups = series.map((key, k) => {
    const m = MODELS[key]
    const pts = SCORES.map((s, i) => [s, m.observed(s, i)])
    const g = svg.append('g')
    g.append('path').attr('d', d3.line().x((p) => x(p[0])).y((p) => y(p[1]))(pts))
      .attr('fill', 'none').attr('stroke', m.colour).attr('stroke-width', 3)
    g.selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p[0])).attr('cy', (p) => y(p[1]))
      .attr('r', 6).attr('fill', m.colour)
    // legend entry, top left
    const ly = M.top + 16 + k * 30
    g.append('circle').attr('cx', x(0.03)).attr('cy', ly - 5).attr('r', 6).attr('fill', m.colour)
    g.append('text').attr('x', x(0.03) + 14).attr('y', ly).attr('fill', m.colour).attr('font-size', 19)
      .attr('font-weight', 'bold').text(m.label)
    if (params.highlight && k === series.length - 1) {
      const s = params.highlight
      const o = m.observed(s, SCORES.indexOf(s))
      g.append('path').attr('d', `M${x(s)},${y(s)} V${y(o) - 10}`).attr('stroke', m.colour)
        .attr('stroke-width', 2).attr('stroke-dasharray', '4 4')
      g.append('circle').attr('cx', x(s)).attr('cy', y(s)).attr('r', 5).attr('fill', 'none')
        .attr('stroke', m.colour).attr('stroke-width', 2)
      g.append('text').attr('x', x(s) - 10).attr('y', y(0.35)).attr('text-anchor', 'end')
        .attr('fill', m.colour).attr('font-size', 19).attr('font-weight', 'bold')
        .text(`score ${s} → ${(100 * o).toFixed(1)}% fraud`)
    }
    return g
  })

  function render(step) {
    groups.forEach((g, k) => g.attr('opacity', k < step ? 1 : 0))
  }

  render(steps)
  return { setStep: render }
}

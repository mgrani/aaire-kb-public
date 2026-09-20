// Stepped Bayesian-updating visualization: a Beta prior over a coin's
// heads-probability θ is updated one observed flip at a time
// (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2 — each fragment click
// reveals one observation and morphs the posterior).
//
// params:
//   prior:        [a, b]  — Beta(a, b) prior (default [1, 1])
//   observations: number[] — flip sequence, 1 = heads, 0 = tails
//
// Step 0 shows the prior; step i the posterior after the first i flips.

const NAVY = '#164374'
const TEAL = '#0083A1'
const GRAY = '#8a8a8a'

// Unnormalized Beta(a,b) density on a grid, normalized numerically —
// avoids needing the gamma function.
function betaCurve(a, b, n = 256) {
  const pts = []
  let sum = 0
  for (let i = 1; i < n; i++) {
    const x = i / n
    const y = Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x))
    pts.push([x, y])
    sum += y / n
  }
  return pts.map(([x, y]) => [x, y / sum])
}

export async function mount(el, { d3, params, steps }) {
  const [a0, b0] = params.prior ?? [1, 1]
  const obs = params.observations ?? []
  const W = 720
  const H = 400
  const M = { top: 56, right: 30, bottom: 52, left: 56 }

  // Fixed y-scale across all steps so the narrowing of the posterior is
  // visible as a real change, not swallowed by rescaling.
  const finalH = obs.filter((o) => o === 1).length
  const yMax = Math.max(...betaCurve(a0 + finalH, b0 + (obs.length - finalH)).map((p) => p[1])) * 1.15

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const x = d3.scaleLinear([0, 1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, yMax], [H - M.bottom, M.top])
  const line = d3
    .line()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))

  // Axes
  svg
    .append('g')
    .attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .attr('font-size', 14)
    .attr('color', NAVY)
  svg
    .append('text')
    .attr('x', W - M.right)
    .attr('y', H - 14)
    .attr('text-anchor', 'end')
    .attr('fill', NAVY)
    .attr('font-size', 18)
    .text('θ = P(heads)')
  svg
    .append('text')
    .attr('x', M.left)
    .attr('y', M.top - 30)
    .attr('fill', NAVY)
    .attr('font-size', 18)
    .text('density')

  // Static prior for reference
  svg
    .append('path')
    .attr('d', line(betaCurve(a0, b0)))
    .attr('fill', 'none')
    .attr('stroke', GRAY)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 5')

  const posterior = svg.append('path').attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 4)
  const caption = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', 28)
    .attr('text-anchor', 'middle')
    .attr('fill', NAVY)
    .attr('font-size', 21)

  // Observation sequence, revealed step by step
  const seq = svg.append('g').attr('font-size', 22).attr('text-anchor', 'middle')
  obs.forEach((o, i) => {
    seq
      .append('text')
      .attr('class', `obs-${i}`)
      .attr('x', W - M.right - (obs.length - i) * 34)
      .attr('y', M.top + 4)
      .attr('fill', o === 1 ? TEAL : NAVY)
      .attr('font-weight', 'bold')
      .text(o === 1 ? 'H' : 'T')
  })

  function render(step, animate) {
    const seen = obs.slice(0, step)
    const h = seen.filter((o) => o === 1).length
    const t = seen.length - h
    const A = a0 + h
    const B = b0 + t
    const label =
      step === 0
        ? `Prior: Beta(${a0}, ${b0})`
        : `After ${h} heads, ${t} tails: posterior Beta(${a0}+${h}, ${b0}+${t})`
    caption.text(label)
    obs.forEach((_, i) => seq.select(`.obs-${i}`).attr('opacity', i < step ? 1 : 0.15))
    const target = line(betaCurve(A, B))
    if (animate) posterior.transition().duration(500).attr('d', target)
    else posterior.attr('d', target)
  }

  render(steps, false)
  return { setStep: (i) => render(i, true) }
}

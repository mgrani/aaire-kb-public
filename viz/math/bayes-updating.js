// Stepped Bayesian-updating visualization: a Beta prior over a coin's
// heads-probability θ is updated one observed flip at a time
// (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2 — each fragment click
// reveals one observation and morphs the posterior).
//
// params:
//   prior:        [a, b]  — Beta(a, b) prior (default [1, 1])
//   observations: number[] — flip sequence, 1 = heads, 0 = tails
//   symbols:      [one, zero] — marks shown for 1 and 0 (default ['H', 'T'])
//   names:        [one, zero] — words used in the caption (default heads/tails)
//   xLabel:       axis label (default 'θ = P(heads)')
//   mode:         'factor' shows why the update works, without naming the Beta:
//                 the previous belief (grey), the factor of the new observation,
//                 θ or 1 − θ, against its own axis on the right (teal), and the
//                 new belief (navy); the caption reads belief ∝ θ^h (1 − θ)^m.
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
  const [sym1, sym0] = params.symbols ?? ['H', 'T']
  const [name1, name0] = params.names ?? ['heads', 'tails']
  const W = 720
  const H = 400
  const factorMode = params.mode === 'factor'
  if (factorMode) return mountFactor(el, { d3, params, steps, a0, b0, obs, sym1, sym0, name1, name0 })
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
    .text(params.xLabel ?? 'θ = P(heads)')
  // Rotated along the left edge: at the top it collided with the caption.
  svg
    .append('text')
    .attr('transform', `translate(${M.left - 16},${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
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
      .text(o === 1 ? sym1 : sym0)
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
        : `After ${h} ${name1}, ${t} ${name0}: posterior Beta(${a0}+${h}, ${b0}+${t})`
    caption.text(label)
    obs.forEach((_, i) => seq.select(`.obs-${i}`).attr('opacity', i < step ? 1 : 0.15))
    const target = line(betaCurve(A, B))
    if (animate) posterior.transition().duration(500).attr('d', target)
    else posterior.attr('d', target)
  }

  render(steps, false)
  return { setStep: (i) => render(i, true) }
}

// Counts of ones and zeros among the first `step` observations.
function countsAt(obs, step) {
  const seen = obs.slice(0, step)
  const h = seen.filter((o) => o === 1).length
  return [h, seen.length - h]
}

// Factor mode: previous belief × factor of the new observation = new belief.
function mountFactor(el, { d3, params, steps, a0, b0, obs, sym1, sym0, name1, name0 }) {
  const W = 720
  const H = 440
  const M = { top: 100, right: 70, bottom: 56, left: 60 }
  const curves = obs.map((_, i) => countsAt(obs, i + 1)).concat([[0, 0]])
  const yMax = Math.max(...curves.map(([h, t]) => Math.max(...betaCurve(a0 + h, b0 + t).map((p) => p[1])))) * 1.1

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Belief over θ before and after each observation, with the factor θ or 1 − θ it is multiplied by')
  const x = d3.scaleLinear([0, 1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, yMax], [H - M.bottom, M.top])
  const yF = d3.scaleLinear([0, 1], [H - M.bottom, M.top])
  const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]))
  const fLine = d3.line().x((p) => x(p[0])).y((p) => yF(p[1]))

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5)).attr('font-size', 17).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${W - M.right},0)`)
    .call(d3.axisRight(yF).ticks(2)).attr('font-size', 17).attr('color', TEAL)
  svg.append('text').attr('x', W - M.right).attr('y', H - 14).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 21).text(params.xLabel ?? 'θ')
  svg.append('text')
    .attr('transform', `translate(${M.left - 16},${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 21).text('plausibility of θ')
  svg.append('text')
    .attr('transform', `translate(${W - M.right + 56},${(M.top + H - M.bottom) / 2}) rotate(90)`)
    .attr('text-anchor', 'middle').attr('fill', TEAL).attr('font-size', 21).text('factor of the row')

  const prev = svg.append('path').attr('fill', 'none').attr('stroke', GRAY).attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6 5')
  const factor = svg.append('path').attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 3)
    .attr('stroke-dasharray', '2 6').attr('stroke-linecap', 'round')
  const factorLabel = svg.append('text').attr('fill', TEAL).attr('font-size', 22).attr('font-weight', 'bold')
  const belief = svg.append('path').attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 4)

  const cap1 = svg.append('text').attr('x', M.left).attr('y', 30).attr('fill', NAVY).attr('font-size', 25)
  const cap2 = svg.append('text').attr('x', M.left).attr('y', 70).attr('fill', NAVY).attr('font-size', 25)

  const seq = svg.append('g').attr('font-size', 26).attr('text-anchor', 'middle')
  obs.forEach((o, i) => {
    seq.append('text').attr('class', `obs-${i}`)
      .attr('x', W - M.right - (obs.length - i) * 32).attr('y', 30)
      .attr('fill', o === 1 ? TEAL : NAVY).attr('font-weight', 'bold')
      .text(o === 1 ? sym1 : sym0)
  })

  // belief ∝ θ^h (1 − θ)^m, exponents as raised tspans
  function powers(text, h, t) {
    text.text(null)
    const part = (s, dy = 0, size = 25) => text.append('tspan').attr('dy', dy).attr('font-size', size).text(s)
    part('belief ∝ ')
    part('θ').attr('font-weight', 'bold')
    part(String(h), -11, 18).attr('fill', TEAL).attr('font-weight', 'bold')
    part(' (1 − θ)', 11).attr('font-weight', 'bold')
    part(String(t), -11, 18).attr('fill', TEAL).attr('font-weight', 'bold')
    part(`   after ${h} × ${name1}, ${t} × ${name0}`, 11, 20).attr('fill', GRAY)
  }

  function render(step, animate) {
    const [h, t] = countsAt(obs, step)
    const go = (sel) => (animate ? sel.transition().duration(500) : sel)
    obs.forEach((_, i) => seq.select(`.obs-${i}`).attr('opacity', i < step ? 1 : 0.15))
    if (step === 0) {
      cap1.text('Start: every θ alike')
      powers(cap2, a0 - 1 + h, b0 - 1 + t)
      prev.attr('opacity', 0)
      factor.attr('opacity', 0)
      factorLabel.attr('opacity', 0)
    } else {
      const o = obs[step - 1]
      const [hp, tp] = countsAt(obs, step - 1)
      cap1.text(`Row ${step}, ${o === 1 ? name1 : name0}: × ${o === 1 ? 'θ' : '(1 − θ)'}`)
      powers(cap2, a0 - 1 + h, b0 - 1 + t)
      prev.attr('opacity', 1).attr('d', line(betaCurve(a0 + hp, b0 + tp)))
      const pts = d3.range(0, 1.0001, 0.01).map((v) => [v, o === 1 ? v : 1 - v])
      factor.attr('opacity', 1)
      go(factor).attr('d', fLine(pts))
      factorLabel.attr('opacity', 1).attr('x', o === 1 ? x(0.9) - 40 : x(0.1) + 8)
        .attr('y', yF(0.9) - 10).text(o === 1 ? '× θ' : '× (1 − θ)')
    }
    go(belief).attr('d', line(betaCurve(a0 + h, b0 + t)))
  }

  render(steps, false)
  return { setStep: (i) => render(i, true) }
}

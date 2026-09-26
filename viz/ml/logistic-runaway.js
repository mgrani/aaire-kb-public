// "When the peak runs away": logistic regression by gradient ascent on a
// linearly separable toy fraud set (docs/PEDAGOGIC_CONCEPT.md, Principle 6
// tier 2). The log-likelihood keeps rising towards 0, the slope grows without
// bound and the scores harden to 0 and 1 — the classification twin of three
// heads in three flips. The last step adds a Gaussian prior on the slope (MAP),
// which stops at a finite peak.
//
// params:
//   data:        [[x, y], …] with y ∈ {0, 1}  (default: 6 legitimate, 4 fraud, separable)
//   checkpoints: gradient steps after which a curve is drawn (default [10, 100, 1000, 10000])
//   eta:         step size on the summed gradient (default 0.05)
//   tau2:        prior variance of the slope for the MAP step (default 1)
//   xLabel:      axis label (default 'risk signal x')
//
// Steps: 0 data · 1…k the MLE curve after each checkpoint (earlier curves stay,
// faded) · k+1 the MAP curve. Computed here, deterministically.

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#16803c'
const GRAY = '#9aa5b1'

const DATA = [
  [-2.0, 0], [-1.5, 0], [-1.1, 0], [-0.6, 0], [-0.3, 0], [0.2, 0],
  [0.6, 1], [1.0, 1], [1.4, 1], [1.9, 1],
]

const sig = (z) => 1 / (1 + Math.exp(-z))

function ascend(data, eta, T, tau2, record) {
  let w0 = 0, w1 = 0
  const out = []
  for (let t = 1; t <= T; t++) {
    let g0 = 0, g1 = 0
    for (const [x, y] of data) {
      const e = y - sig(w0 + w1 * x) // error × feature, as in LMS
      g0 += e
      g1 += e * x
    }
    if (tau2) g1 -= w1 / tau2
    w0 += eta * g0
    w1 += eta * g1
    if (record.includes(t)) {
      let ll = 0
      for (const [x, y] of data) {
        const h = sig(w0 + w1 * x)
        ll += y ? Math.log(h) : Math.log(1 - h)
      }
      out.push({ t, w0, w1, ll })
    }
  }
  return out
}

export async function mount(el, { d3, params, steps }) {
  const data = params.data ?? DATA
  const checkpoints = params.checkpoints ?? [10, 100, 1000, 10000]
  const eta = params.eta ?? 0.05
  const tau2 = params.tau2 ?? 1
  const mle = ascend(data, eta, Math.max(...checkpoints), 0, checkpoints)
  const map = ascend(data, eta, 5000, tau2, [5000])[0]

  const W = 760
  const H = 380
  const M = { top: 46, right: 270, bottom: 52, left: 60 }
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Logistic regression on separable data: the fitted curve steepens without bound; a prior stops it')
  const x = d3.scaleLinear([-2.5, 2.5], [M.left, W - M.right])
  const y = d3.scaleLinear([0, 1], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(5)).attr('font-size', 14).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(5)).attr('font-size', 14).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 17).text(params.xLabel ?? 'risk signal x')
  svg.append('text').attr('transform', `translate(16,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 17).text('score h(x)')
  const caption = svg.append('text').attr('x', (M.left + W - M.right) / 2).attr('y', 26)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 18)

  const xs = d3.range(-2.5, 2.501, 0.01)
  const curve = (w0, w1) => d3.line().x((v) => x(v)).y((v) => y(sig(w0 + w1 * v)))(xs)
  const curves = mle.map((c) => svg.append('path').attr('d', curve(c.w0, c.w1))
    .attr('fill', 'none').attr('stroke-width', 3))
  const mapCurve = svg.append('path').attr('d', curve(map.w0, map.w1))
    .attr('fill', 'none').attr('stroke', GREEN).attr('stroke-width', 4)

  svg.append('g').selectAll('circle').data(data).join('circle')
    .attr('cx', (d) => x(d[0])).attr('cy', (d) => y(d[1])).attr('r', 7)
    .attr('fill', (d) => (d[1] ? TEAL : '#ffffff')).attr('stroke', TEAL).attr('stroke-width', 2.5)
  // labels in the empty corners: fraud top left, legitimate bottom right
  svg.append('text').attr('x', x(-2.4)).attr('y', y(1) + 6).attr('fill', TEAL).attr('font-size', 17)
    .attr('font-weight', 'bold').text('● fraud (y = 1)')
  svg.append('text').attr('x', x(2.4)).attr('y', y(0) - 16).attr('text-anchor', 'end')
    .attr('fill', TEAL).attr('font-size', 17).attr('font-weight', 'bold').text('○ legitimate (y = 0)')

  // the run, as a table on the right
  const tx = W - M.right + 30
  const table = svg.append('g').attr('font-size', 18)
  table.append('text').attr('x', tx).attr('y', M.top + 6).attr('fill', NAVY).attr('font-weight', 'bold')
    .text('steps')
  table.append('text').attr('x', tx + 84).attr('y', M.top + 6).attr('fill', NAVY).attr('font-weight', 'bold')
    .text('slope')
  table.append('text').attr('x', tx + 154).attr('y', M.top + 6).attr('fill', NAVY).attr('font-weight', 'bold')
    .text('log-lik')
  const rows = mle.map((c, i) => {
    const g = table.append('g').attr('fill', NAVY)
    const ry = M.top + 38 + i * 32
    g.append('text').attr('x', tx).attr('y', ry).text(c.t.toLocaleString('en'))
    g.append('text').attr('x', tx + 84).attr('y', ry).text(c.w1.toFixed(1))
    g.append('text').attr('x', tx + 154).attr('y', ry).text(c.ll.toFixed(2))
    return g
  })
  const mapRow = table.append('g').attr('fill', GREEN).attr('font-weight', 'bold')
  const my = M.top + 38 + mle.length * 32 + 14
  mapRow.append('text').attr('x', tx).attr('y', my).text('MAP')
  mapRow.append('text').attr('x', tx + 84).attr('y', my).text(map.w1.toFixed(1))
  mapRow.append('text').attr('x', tx + 154).attr('y', my).text(map.ll.toFixed(2))
  mapRow.append('text').attr('x', tx).attr('y', my + 28).attr('font-weight', 'normal').attr('font-size', 16)
    .text(`prior on the slope: N(0, ${tau2})`)
  mapRow.append('text').attr('x', tx).attr('y', my + 50).attr('font-weight', 'normal').attr('font-size', 16)
    .text('stays, however long it runs')

  function render(step) {
    const k = mle.length
    curves.forEach((c, i) => {
      const shown = i < step
      const latest = i === Math.min(step, k) - 1 && step <= k
      c.attr('opacity', shown ? 1 : 0).attr('stroke', latest ? NAVY : GRAY)
        .attr('stroke-width', latest ? 4 : 2)
    })
    rows.forEach((r, i) => r.attr('opacity', i < step ? 1 : 0))
    mapCurve.attr('opacity', step > k ? 1 : 0)
    mapRow.attr('opacity', step > k ? 1 : 0)
    caption.text(step === 0
      ? 'Every fraud scores above every legitimate case'
      : step <= k
        ? 'Maximum likelihood: steeper at every step, never done'
        : 'With a prior (MAP): a finite peak')
  }

  render(steps)
  return { setStep: render }
}

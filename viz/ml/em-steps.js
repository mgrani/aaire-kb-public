// EM on a one-dimensional mixture of two Gaussians, one half-step per click
// (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2). PML Lecture 07, Module 2.
//
// The data are 30 flats described by one number, the price per m² (k€); the
// district they come from is not in the listing — it is the latent label.
// Each E-step colours every point by its responsibilities (Bayes per point);
// each M-step refits weights, means and spreads by weighted maximum
// likelihood. The last step shows what k-means would report: the same fit
// with every responsibility rounded to 0 or 1.
//
// params (all optional):
//   init:  { mu: [m1, m2], sd: [s1, s2], pi: [p1, p2] } — deliberately poor
//          default { mu: [2.2, 3.4], sd: [0.6, 0.6], pi: [0.5, 0.5] }
//   iters: iterations behind the "converged" step (default 60)
//
// Steps (data-steps="6"):
//   0 start · 1 E-step · 2 M-step · 3 E-step · 4 M-step ·
//   5 after `iters` iterations · 6 the k-means view (hard labels)

const NAVY = '#164374'
const TEAL = '#0083A1'
const GRAY = '#9aa5b1'
const INK = '#333333'
const VIOLET = '#7c3aed'

const DATA = [2.14, 2.26, 2.28, 2.33, 2.71, 2.72, 2.92, 3.0, 3.07, 3.11, 3.11, 3.14, 3.23, 3.3, 3.5,
  3.54, 3.69, 3.71, 3.75, 4.01, 4.15, 4.16, 4.26, 4.27, 4.44, 4.54, 4.6, 4.79, 4.99, 5.34]

const npdf = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI))

function eStep(th) {
  return DATA.map((x) => {
    const a = th.pi[0] * npdf(x, th.mu[0], th.sd[0])
    const b = th.pi[1] * npdf(x, th.mu[1], th.sd[1])
    return b / (a + b) // responsibility of component 2
  })
}
function mStep(g2) {
  const g = [g2.map((v) => 1 - v), g2]
  const N = g.map((gk) => gk.reduce((s, v) => s + v, 0))
  const mu = g.map((gk, k) => gk.reduce((s, v, i) => s + v * DATA[i], 0) / N[k])
  const sd = g.map((gk, k) => Math.sqrt(gk.reduce((s, v, i) => s + v * (DATA[i] - mu[k]) ** 2, 0) / N[k]))
  return { pi: N.map((v) => v / DATA.length), mu, sd }
}
const logLik = (th) => DATA.reduce((s, x) =>
  s + Math.log(th.pi[0] * npdf(x, th.mu[0], th.sd[0]) + th.pi[1] * npdf(x, th.mu[1], th.sd[1])), 0)

export async function mount(el, { d3, params, steps }) {
  const init = params.init ?? { mu: [2.2, 3.4], sd: [0.6, 0.6], pi: [0.5, 0.5] }
  const iters = params.iters ?? 60

  // precompute the frames: { th, g (responsibilities shown), kind }
  const frames = [{ th: init, g: null, kind: 'start' }]
  let th = init
  let g = eStep(th); frames.push({ th, g, kind: 'E', round: 1 })
  th = mStep(g); frames.push({ th, g, kind: 'M', round: 1 })
  g = eStep(th); frames.push({ th, g, kind: 'E', round: 2 })
  th = mStep(g); frames.push({ th, g, kind: 'M', round: 2 })
  for (let i = 2; i < iters; i++) { g = eStep(th); th = mStep(g) }
  g = eStep(th)
  frames.push({ th, g, kind: 'done' })
  frames.push({ th, g: g.map((v) => (v >= 0.5 ? 1 : 0)), kind: 'hard' })

  // the point closest to 50/50 at convergence is the one the slide asks about
  const final = frames[5].g
  let between = 0
  final.forEach((v, i) => { if (Math.abs(v - 0.5) < Math.abs(final[between] - 0.5)) between = i })

  const W = 760, H = 430
  const M = { top: 46, right: 24, bottom: 50, left: 30 }
  const X0 = 1.8, X1 = 5.8
  const x = d3.scaleLinear([X0, X1], [M.left, W - M.right])
  const stripTop = H - M.bottom - 100
  const yd = d3.scaleLinear([0, 0.5], [stripTop - 12, M.top + 30])

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'EM on a mixture of two Gaussians: responsibilities and fitted components')
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(8)).attr('font-size', 15).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 15).text('price per m² (k€)')
  svg.append('line').attr('x1', M.left).attr('x2', W - M.right).attr('y1', stripTop - 12).attr('y2', stripTop - 12)
    .attr('stroke', '#dde3ea')

  const caption = svg.append('text').attr('x', M.left + 4).attr('y', 22)
    .attr('fill', NAVY).attr('font-size', 19).attr('font-weight', 600)
  const ll = svg.append('text').attr('x', W - M.right).attr('y', 22).attr('text-anchor', 'end')
    .attr('fill', INK).attr('font-size', 17)
  const params1 = svg.append('text').attr('x', M.left + 4).attr('y', M.top + 6).attr('font-size', 17).attr('fill', NAVY)
  const params2 = svg.append('text').attr('x', W - M.right).attr('y', M.top + 6).attr('text-anchor', 'end')
    .attr('font-size', 17).attr('fill', TEAL)

  const grid = d3.range(X0, X1 + 1e-9, 0.02)
  const line = d3.line().x((p) => x(p[0])).y((p) => yd(p[1]))
  const mix = svg.append('path').attr('fill', 'none').attr('stroke', GRAY).attr('stroke-width', 2).attr('stroke-dasharray', '5 4')
  const c1 = svg.append('path').attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 3)
  const c2 = svg.append('path').attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 3)

  // stacked dot strip: each point takes the lowest free row
  const rows = []
  const pos = DATA.map((v) => {
    let r = 0
    while ((rows[r] ?? []).some((u) => Math.abs(u - v) < 0.105)) r += 1
    ;(rows[r] = rows[r] ?? []).push(v)
    return r
  })
  // each point is a small pie: the teal share is its responsibility for
  // component 2, so a 50/50 point is visibly half and half
  const R = 9.5
  const arc = d3.arc().innerRadius(0).outerRadius(R)
  const dots = svg.append('g').selectAll('g').data(DATA).join('g')
    .attr('transform', (v, i) => `translate(${x(v)},${stripTop + 10 + pos[i] * 21})`)
  const base = dots.append('circle').attr('r', R).attr('stroke', 'white').attr('stroke-width', 1.2)
  const wedge = dots.append('path').attr('fill', TEAL)
  const ring = svg.append('circle').attr('cx', x(DATA[between])).attr('cy', stripTop + 10 + pos[between] * 21)
    .attr('r', 14).attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 2.5)
  // above the strip, on the white band between the curves' baseline and the dots
  const ringLabel = svg.append('text').attr('x', x(DATA[between])).attr('y', stripTop - 18)
    .attr('text-anchor', 'middle').attr('font-size', 17).attr('font-weight', 700).attr('fill', VIOLET)
    .attr('stroke', 'white').attr('stroke-width', 5).attr('paint-order', 'stroke')

  const f2 = (v) => v.toFixed(2)
  function render(stepIn) {
    const s = Math.max(0, Math.min(frames.length - 1, stepIn))
    const f = frames[s]
    const t = f.th
    c1.attr('d', line(grid.map((v) => [v, t.pi[0] * npdf(v, t.mu[0], t.sd[0])])))
    c2.attr('d', line(grid.map((v) => [v, t.pi[1] * npdf(v, t.mu[1], t.sd[1])])))
    mix.attr('d', line(grid.map((v) => [v, t.pi[0] * npdf(v, t.mu[0], t.sd[0]) + t.pi[1] * npdf(v, t.mu[1], t.sd[1])])))
    base.attr('fill', f.g ? NAVY : GRAY)
    wedge.attr('d', (_, i) => (f.g && f.g[i] > 0.005
      ? arc({ startAngle: 0, endAngle: 2 * Math.PI * Math.min(f.g[i], 0.9999) }) : null))
    params1.text(`π₁ ${f2(t.pi[0])} · μ₁ ${f2(t.mu[0])} · σ₁ ${f2(t.sd[0])}`)
    params2.text(`π₂ ${f2(t.pi[1])} · μ₂ ${f2(t.mu[1])} · σ₂ ${f2(t.sd[1])}`)
    ll.text(`log-likelihood ${logLik(t).toFixed(2).replace('-', '−')}`)
    const gb = f.g ? f.g[between] : null
    ring.attr('opacity', gb === null ? 0 : 1)
    ringLabel.text(gb === null ? '' : `γ = ${f2(1 - gb)} / ${f2(gb)}`)
    caption.text({
      start: 'Start: two Gaussians placed badly, labels unknown',
      E: `E-step ${f.round}: Bayes for every point — colour = responsibility`,
      M: `M-step ${f.round}: refit each Gaussian with the soft counts`,
      done: `After ${iters} iterations: the flat at ${DATA[between]} stays undecided`,
      hard: 'Hard labels, as k-means reports them: one label, no doubt',
    }[f.kind])
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

// Bias–variance as model capacity grows: a polynomial of increasing degree is
// fitted to a fixed noisy sample, and training vs. test error is reported at
// each step (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// Reused by: ml/basics/principles, ml/basics/measuring-performance-sampling,
// ml/neural-networks/overfitting, ml/decision-trees/dt-pruning.
//
// params:
//   degrees: array of polynomial degrees, one per step (default [1,2,3,5,9,14])
//   noise:   noise standard deviation (default 0.18)

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#b5322e'
const RULE = '#dde3ea'

// Deterministic pseudo-noise so the picture is identical on every reload and
// in the PDF export.
function prng(seed) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const truth = (x) => Math.sin(2 * Math.PI * x)

function sample(n, noise, seed) {
  const r = prng(seed)
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1)
    // Box–Muller from the deterministic stream
    const u = Math.max(1e-6, r()), v = r()
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return [x, truth(x) + noise * g]
  })
}

// Least-squares polynomial fit via normal equations + Gaussian elimination.
function polyfit(pts, deg) {
  const m = deg + 1
  const A = Array.from({ length: m }, () => new Array(m + 1).fill(0))
  for (const [x, y] of pts) {
    const pw = Array.from({ length: 2 * m }, (_, k) => x ** k)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) A[i][j] += pw[i + j]
      A[i][m] += pw[i] * y
    }
  }
  for (let i = 0; i < m; i++) {
    let p = i
    for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k
    ;[A[i], A[p]] = [A[p], A[i]]
    if (Math.abs(A[i][i]) < 1e-12) continue
    for (let k = i + 1; k < m; k++) {
      const f = A[k][i] / A[i][i]
      for (let j = i; j <= m; j++) A[k][j] -= f * A[i][j]
    }
  }
  const c = new Array(m).fill(0)
  for (let i = m - 1; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-12) continue
    let s = A[i][m]
    for (let j = i + 1; j < m; j++) s -= A[i][j] * c[j]
    c[i] = s / A[i][i]
  }
  return c
}

const evalPoly = (c, x) => c.reduce((s, ci, i) => s + ci * x ** i, 0)
const rmse = (pts, c) =>
  Math.sqrt(pts.reduce((s, [x, y]) => s + (evalPoly(c, x) - y) ** 2, 0) / pts.length)

export async function mount(el, { d3, params, steps }) {
  const degrees = params.degrees ?? [1, 2, 3, 5, 9, 14]
  const noise = params.noise ?? 0.18
  const train = sample(12, noise, 7)
  const test = sample(12, noise, 99)

  const W = 720
  const H = 400
  const M = { top: 56, right: 24, bottom: 46, left: 56 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const x = d3.scaleLinear([-0.03, 1.03], [M.left, W - M.right])
  const y = d3.scaleLinear([-1.9, 1.9], [H - M.bottom, M.top])

  svg.append('g').attr('transform', `translate(0,${y(0)})`).call(d3.axisBottom(x).ticks(5))
    .attr('color', RULE)
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(4))
    .attr('color', NAVY)

  // the true function, for reference
  svg.append('path')
    .datum(d3.range(0, 1.001, 0.01).map((t) => [t, truth(t)]))
    .attr('d', d3.line().x((p) => x(p[0])).y((p) => y(p[1])))
    .attr('fill', 'none').attr('stroke', RULE).attr('stroke-width', 3)

  svg.append('g').selectAll('circle').data(train).join('circle')
    .attr('cx', (p) => x(p[0])).attr('cy', (p) => y(p[1])).attr('r', 5)
    .attr('fill', NAVY).attr('opacity', 0.8)

  const fit = svg.append('path').attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 3.5)
  const title = svg.append('text').attr('x', W / 2).attr('y', 26)
    .attr('text-anchor', 'middle').attr('font-size', 21).attr('fill', NAVY)
  const errs = svg.append('text').attr('x', W / 2).attr('y', 48)
    .attr('text-anchor', 'middle').attr('font-size', 18)

  function render(step) {
    const deg = degrees[Math.max(0, Math.min(step, degrees.length - 1))]
    const c = polyfit(train, deg)
    const curve = d3.range(0, 1.001, 0.005).map((t) => [t, evalPoly(c, t)])
    fit.attr('d', d3.line().x((p) => x(p[0])).y((p) => y(Math.max(-1.9, Math.min(1.9, p[1]))))(curve))
    const tr = rmse(train, c), te = rmse(test, c)
    title.text(`Polynomial of degree ${deg}`)
    errs.attr('fill', te > 1.4 * tr ? RED : NAVY)
      .text(`training error ${tr.toFixed(3)}   ·   test error ${te.toFixed(3)}`)
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

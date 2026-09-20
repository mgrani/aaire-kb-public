// k-means as an alternating procedure: each step is one half-iteration
// (assign points to the nearest centroid, then move centroids to their mean),
// so the convergence is watched rather than asserted.
//
// params: k (default 3), seed (centroid initialisation variant)

const NAVY = '#164374'
const COLOURS = ['#164374', '#0083A1', '#b5322e', '#7c3aed']

function prng(seed) {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

// Three well-separated blobs, deterministic.
function makeData() {
  const r = prng(11)
  const centres = [[0.25, 0.30], [0.72, 0.28], [0.50, 0.75]]
  const pts = []
  for (const [cx, cy] of centres)
    for (let i = 0; i < 22; i++) {
      const a = 2 * Math.PI * r(), rad = 0.14 * Math.sqrt(r())
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)])
    }
  return pts
}

export async function mount(el, { d3, params, steps }) {
  const k = params.k ?? 3
  const data = makeData()
  const W = 640, H = 400, M = 40

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const x = d3.scaleLinear([0, 1], [M, W - M])
  const y = d3.scaleLinear([0, 1], [H - M, M])

  const caption = svg.append('text').attr('x', W / 2).attr('y', 24)
    .attr('text-anchor', 'middle').attr('font-size', 20).attr('fill', NAVY)

  // Deliberately poor initial centroids so the first iterations do visible work.
  const init = [[0.30, 0.62], [0.40, 0.55], [0.55, 0.50]].slice(0, k)

  // Precompute the alternating sequence: even step = assign, odd = move.
  const frames = []
  let cent = init.map((c) => [...c])
  let assign = data.map(() => 0)
  frames.push({ cent: cent.map((c) => [...c]), assign: null })
  for (let it = 0; it < 5; it++) {
    assign = data.map((p) => {
      let best = 0, bd = Infinity
      cent.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
        if (d < bd) { bd = d; best = j }
      })
      return best
    })
    frames.push({ cent: cent.map((c) => [...c]), assign: [...assign] })
    cent = cent.map((c, j) => {
      const own = data.filter((_, i) => assign[i] === j)
      return own.length ? [d3.mean(own, (p) => p[0]), d3.mean(own, (p) => p[1])] : c
    })
    frames.push({ cent: cent.map((c) => [...c]), assign: [...assign] })
  }

  const dots = svg.append('g').selectAll('circle').data(data).join('circle')
    .attr('cx', (p) => x(p[0])).attr('cy', (p) => y(p[1])).attr('r', 5)
  const marks = svg.append('g')

  function render(step) {
    const f = frames[Math.max(0, Math.min(step, frames.length - 1))]
    dots.transition().duration(250)
      .attr('fill', (_, i) => (f.assign ? COLOURS[f.assign[i]] : '#9aa5b1'))
      .attr('opacity', 0.85)
    const sel = marks.selectAll('path').data(f.cent)
    sel.join('path')
      .attr('d', d3.symbol().type(d3.symbolCross).size(340))
      .transition().duration(250)
      .attr('transform', (c) => `translate(${x(c[0])},${y(c[1])}) rotate(45)`)
      .attr('fill', (_, j) => COLOURS[j]).attr('stroke', 'white').attr('stroke-width', 2)
    caption.text(
      step === 0 ? 'Start: k centroids, placed badly on purpose'
        : step % 2 === 1 ? `Assign each point to its nearest centroid (round ${Math.ceil(step / 2)})`
        : `Move each centroid to the mean of its points (round ${step / 2})`,
    )
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

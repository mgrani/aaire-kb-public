// What a descriptive statistic summarises: three small density panels, each
// changing exactly one aspect of a distribution against a grey reference —
// where it sits (centre), how wide it is (dispersion), how lopsided it is
// (shape). Under each panel: the moment that measures it and the usual
// sample statistics. Static; no steps.
//
// params: none

const NAVY = '#164374'
const INK = '#333333'
const GRAY = '#8a8a8a'
const RULE = '#dde3ea'

const normal = (m, s) => (x) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))
// Gamma(k = 3, θ) shifted so its mean sits at `m` — a right-skewed density.
const skewed = (m, theta) => (x) => {
  const t = x - (m - 3 * theta)
  return t <= 0 ? 0 : (t * t / (2 * theta ** 3)) * Math.exp(-t / theta)
}

const PANELS = [
  {
    title: 'Centre',
    moment: '1st moment',
    stats: 'mean, median',
    ref: normal(-1, 0.8),
    alt: normal(1.2, 0.8),
    marks: [-1, 1.2],
  },
  {
    title: 'Dispersion',
    moment: '2nd central moment',
    stats: 'variance, std. dev., IQR',
    ref: normal(0, 0.55),
    alt: normal(0, 1.3),
    marks: [],
  },
  {
    title: 'Shape',
    moment: '3rd central moment',
    stats: 'skewness, quantiles',
    ref: normal(0, 0.9),
    alt: skewed(0, 0.55),
    marks: [],
  },
]

export async function mount(el, { d3 }) {
  const W = 900
  const H = 330
  const PW = 270
  const GAP = (W - 3 * PW) / 2
  const PLOT_TOP = 14
  const PLOT_BOTTOM = 190

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Three pairs of densities differing in centre, dispersion and shape')

  const x = d3.scaleLinear([-3.5, 4], [0, PW])
  const grid = d3.range(-3.5, 4.001, 0.02)

  PANELS.forEach((p, i) => {
    const g = svg.append('g').attr('transform', `translate(${i * (PW + GAP)},0)`)
    const yMax = d3.max(grid, (v) => Math.max(p.ref(v), p.alt(v))) * 1.08
    const y = d3.scaleLinear([0, yMax], [PLOT_BOTTOM, PLOT_TOP])
    const line = d3.line().x((v) => x(v)).y((v) => y(p.ref(v)))
    const area = d3.area().x((v) => x(v)).y0(PLOT_BOTTOM).y1((v) => y(p.alt(v)))

    g.append('line')
      .attr('x1', 0).attr('x2', PW).attr('y1', PLOT_BOTTOM).attr('y2', PLOT_BOTTOM)
      .attr('stroke', RULE).attr('stroke-width', 2)
    g.append('path').attr('d', area(grid))
      .attr('fill', NAVY).attr('fill-opacity', 0.14)
      .attr('stroke', NAVY).attr('stroke-width', 3)
    g.append('path').attr('d', line(grid))
      .attr('fill', 'none').attr('stroke', GRAY).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 5')

    // Centre panel: mark both means so the shift reads as a shift.
    p.marks.forEach((m, j) => {
      g.append('line')
        .attr('x1', x(m)).attr('x2', x(m)).attr('y1', PLOT_BOTTOM).attr('y2', PLOT_TOP + 8)
        .attr('stroke', j === 0 ? GRAY : NAVY).attr('stroke-width', 2)
    })
    if (p.marks.length === 2) {
      g.append('path')
        .attr('d', `M${x(p.marks[0]) + 4},${PLOT_TOP + 22} H${x(p.marks[1]) - 10}`)
        .attr('stroke', NAVY).attr('stroke-width', 2).attr('fill', 'none')
      g.append('path')
        .attr('d', `M${x(p.marks[1]) - 12},${PLOT_TOP + 16} l8,6 l-8,6 z`)
        .attr('fill', NAVY)
    }

    g.append('text').attr('x', PW / 2).attr('y', 232).attr('text-anchor', 'middle')
      .attr('font-size', 24).attr('font-weight', 700).attr('fill', NAVY).text(p.title)
    g.append('text').attr('x', PW / 2).attr('y', 266).attr('text-anchor', 'middle')
      .attr('font-size', 19).attr('fill', GRAY).text(p.moment)
    g.append('text').attr('x', PW / 2).attr('y', 298).attr('text-anchor', 'middle')
      .attr('font-size', 19).attr('fill', INK).text(p.stats)
  })
}

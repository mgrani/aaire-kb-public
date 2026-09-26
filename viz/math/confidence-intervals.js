// What "95% confident" is a statement about (Principle 6, tier 3).
//
// Each row is one sample and the interval computed from it. The true mean is a
// fixed vertical line. Intervals that miss it are drawn in red. The confidence
// level is a property of the *procedure* — the fraction of rows that cover —
// not of any single interval, and that only becomes visible with many rows.
//
// Uses only: sample, sample mean, standard error, the normal distribution.
// σ is treated as known so no t-distribution is needed at this point.
//
// params: mu, sigma, n, level (0.80 | 0.90 | 0.95 | 0.99), rows, seed
// steps: 1 one interval · 2 twenty · 3 all rows, with the coverage count ·
//        4 the invitation to change the level

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const GREEN = '#16803c'
const RED = '#dc2626'
const VIOLET = '#7c3aed'
const RULE = '#dde3ea'

const Z = { 0.8: 1.2816, 0.9: 1.6449, 0.95: 1.96, 0.99: 2.5758 }

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 760
  const H = 430
  const TOP = 70 // leaves room for the 'true μ' label below the caption
  const BOT = 372
  const mu = params.mu ?? 100
  const sigma = params.sigma ?? 15
  const ROWS = params.rows ?? 60
  const seed = params.seed ?? 20260910

  const x = d3.scaleLinear().domain([mu - 3.4 * sigma, mu + 3.4 * sigma]).range([48, W - 34])

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'One confidence interval per row against the fixed true mean')

  const caption = svg.append('text')
    .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
    .attr('font-size', 20).attr('fill', NAVY)

  svg.append('g')
    .attr('transform', `translate(0,${BOT + 8})`).attr('color', NAVY)
    .call(d3.axisBottom(x).ticks(7)).attr('font-size', 14)

  const gRows = svg.append('g')
  const truth = svg.append('line')
    .attr('x1', x(mu)).attr('x2', x(mu)).attr('y1', TOP - 12).attr('y2', BOT + 6)
    .attr('stroke', VIOLET).attr('stroke-width', 2.5)
  svg.append('text')
    .attr('x', x(mu)).attr('y', TOP - 18).attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('fill', VIOLET).text('true μ')
  const tally = svg.append('text')
    .attr('x', W / 2).attr('y', H - 10).attr('text-anchor', 'middle')
    .attr('font-size', 18).attr('fill', NAVY)

  // Box–Muller on the seeded generator, so a rewind reproduces the picture.
  function samples(next, n) {
    let s = 0
    for (let i = 0; i < n; i++) {
      const u = Math.max(next(), 1e-12)
      s += mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
    }
    return s / n
  }

  let step = 0
  let run = 0 // bumped by "New samples" so the seed changes

  function intervals(cfg, count) {
    const next = rng(seed + run * 7919)
    const z = Z[cfg.level] ?? 1.96
    const half = (z * sigma) / Math.sqrt(cfg.n)
    return Array.from({ length: count }, () => {
      const m = samples(next, cfg.n)
      return { lo: m - half, hi: m + half, m, covers: m - half <= mu && mu <= m + half }
    })
  }

  function render(cfg) {
    const count = step >= 3 ? ROWS : step >= 2 ? 20 : step >= 1 ? 1 : 0
    const data = intervals(cfg, count)
    const dy = (BOT - TOP) / ROWS
    const y = (i) => TOP + (i + 0.5) * (count <= 20 ? Math.min(dy * 3, (BOT - TOP) / count) : dy)

    gRows.selectAll('*').remove()
    const g = gRows.selectAll('g').data(data).join('g')
    g.append('line')
      .attr('x1', (d) => x(d.lo)).attr('x2', (d) => x(d.hi))
      .attr('y1', (d, i) => y(i)).attr('y2', (d, i) => y(i))
      .attr('stroke', (d) => (d.covers ? GREEN : RED))
      .attr('stroke-width', count <= 20 ? 3 : 2)
      .attr('opacity', (d) => (d.covers ? 0.75 : 1))
    g.append('circle')
      .attr('cx', (d) => x(d.m)).attr('cy', (d, i) => y(i))
      .attr('r', count <= 20 ? 3.5 : 2.2)
      .attr('fill', NAVY)

    truth.raise()

    const missed = data.filter((d) => !d.covers).length
    if (step >= 3) {
      const pct = (100 * (count - missed)) / count
      tally.attr('fill', NAVY).text(
        `${count - missed} of ${count} intervals cover μ  (${pct.toFixed(0)}%) — nominal ${Math.round(cfg.level * 100)}%`,
      )
    } else if (step >= 1) {
      tally.attr('fill', NAVY).text(
        count === 1
          ? data[0].covers
            ? 'this one covers μ — but we could not have known that'
            : 'this one misses μ — and nothing in the sample said so'
          : `${count - missed} of ${count} cover μ`,
      )
    } else tally.text('')

    if (step >= 4) {
      caption.attr('fill', VIOLET).text('Change the level or n — which number follows, and which does not?')
    } else if (step === 3) {
      caption.attr('fill', NAVY).text('The percentage is a property of the procedure, not of one interval')
    } else if (step === 2) {
      caption.attr('fill', NAVY).text('Twenty samples, each with its own interval')
    } else if (step === 1) {
      caption.attr('fill', NAVY).text('One sample, one interval. Does it contain μ?')
    } else {
      caption.attr('fill', NAVY).text('μ is fixed and unknown. Only the intervals move.')
    }
  }

  const controls = addControls(
    el,
    { isPrint },
    [
      {
        id: 'level', label: 'confidence', type: 'choice', value: String(params.level ?? 0.95),
        options: [0.8, 0.9, 0.95, 0.99].map((v) => ({ value: String(v), label: `${v * 100}%` })),
      },
      { id: 'n', label: 'sample size n', type: 'range', min: 2, max: 60, value: params.n ?? 10 },
      { id: 'again', label: 'New samples', type: 'button' },
    ],
    (id, values) => {
      if (id === 'again') run++
      render({ level: Number(values.level), n: values.n })
    },
  )

  const cfg = () => ({ level: Number(controls.values.level ?? params.level ?? 0.95), n: controls.values.n ?? params.n ?? 10 })
  const setStep = (i) => {
    step = i
    render(cfg())
  }
  setStep(isPrint ? steps || 3 : steps ? 0 : 3)
  return { setStep }
}

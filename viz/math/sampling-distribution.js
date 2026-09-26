// The sampling distribution of the mean, on one shared axis
// (docs/PEDAGOGIC_CONCEPT.md Principle 6, tier 2 + tier 3).
//
// The whole argument is that the two pictures share an x-axis: the population
// on top, the distribution of the *sample mean* below. One sample gives one
// number; repeating the sample gives a distribution — and that distribution is
// visibly narrower than the population, narrows further as n grows, and turns
// bell-shaped whatever the population looks like.
//
// Uses only: random variable, mean, variance, histogram. The normal overlay
// appears at the last step, after the continuous-distribution unit.
//
// params:
//   shape  "uniform" | "skewed" | "bimodal"  (starting population)
//   n      starting sample size
//   seed   RNG seed (draws are deterministic so print and rewind agree)
//
// steps: 1 draw one sample · 2 record its mean · 3 fifty samples · 4 one
//        thousand samples, with the normal overlay and the standard error.

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const PALE = '#eef2f6'
const RULE = '#dde3ea'

// Populations over the values 1…6, so the picture never needs more machinery
// than a weighted die. Each is a genuinely different shape.
const POPULATIONS = {
  uniform: { label: 'uniform (a fair die)', w: [1, 1, 1, 1, 1, 1] },
  skewed: { label: 'skewed', w: [45, 25, 14, 8, 5, 3] },
  bimodal: { label: 'bimodal', w: [30, 12, 5, 5, 12, 36] },
}

const VALUES = [1, 2, 3, 4, 5, 6]

function population(name) {
  const raw = (POPULATIONS[name] ?? POPULATIONS.uniform).w
  const tot = raw.reduce((a, b) => a + b, 0)
  const p = raw.map((v) => v / tot)
  const mu = VALUES.reduce((a, v, i) => a + v * p[i], 0)
  const varr = VALUES.reduce((a, v, i) => a + (v - mu) ** 2 * p[i], 0)
  return { p, mu, sd: Math.sqrt(varr), cum: p.reduce((a, v) => [...a, (a.at(-1) ?? 0) + v], []) }
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 760
  const H = 430
  const M = { left: 86, right: 20 }
  const [LO, HI] = [0.5, 6.5]

  // Panel bands, all sharing the horizontal scale.
  // Gaps sized for the labels between bands: μ above the population (clear of
  // the title), x̄ above the sample strip (clear of the population bars).
  const POP = { top: 50, h: 84 } // the population
  const SAMPLE = { top: 160, h: 34 } // the n values just drawn
  const DIST = { top: 222, h: 150 } // the distribution of the mean

  const x = d3.scaleLinear().domain([LO, HI]).range([M.left, W - M.right])

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Population and the distribution of the sample mean on a shared axis')

  const title = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .attr('font-size', 20)
    .attr('fill', NAVY)

  const gPop = svg.append('g')
  const gSample = svg.append('g')
  const gDist = svg.append('g')
  const gAxis = svg
    .append('g')
    .attr('transform', `translate(0,${DIST.top + DIST.h})`)
    .attr('color', NAVY)
  const caption = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', H - 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', 18)
    .attr('fill', NAVY)

  const label = (g, y, text, fill) =>
    g
      .append('text')
      .attr('x', M.left - 12)
      .attr('y', y)
      .attr('text-anchor', 'end')
      .attr('font-size', 14)
      .attr('fill', fill)
      .text(text)

  label(svg, POP.top + POP.h / 2, 'population', NAVY)
  const sampleLabel = label(svg, SAMPLE.top + SAMPLE.h / 2 + 4, 'one sample', TEAL)
  const distLabel = label(svg, DIST.top + DIST.h / 2, 'means', VIOLET)

  // ── state ──────────────────────────────────────────────────────────────────
  let cfg = { shape: params.shape ?? 'uniform', n: params.n ?? 5 }
  let pop = population(cfg.shape)
  let next = rng(params.seed ?? 20260910)
  let means = [] // every sample mean drawn so far
  let lastSample = [] // the values of the most recent draw

  const drawOne = () => {
    const s = []
    for (let i = 0; i < cfg.n; i++) {
      const u = next()
      s.push(VALUES[pop.cum.findIndex((c) => u < c)] ?? 6)
    }
    lastSample = s
    means.push(s.reduce((a, b) => a + b, 0) / cfg.n)
  }

  const reset = () => {
    next = rng(params.seed ?? 20260910)
    means = []
    lastSample = []
    pop = population(cfg.shape)
  }

  // Redraw from scratch for a given number of samples — cheaper to reason about
  // than incremental state, and it makes stepping backwards exact.
  const runTo = (count) => {
    reset()
    for (let i = 0; i < count; i++) drawOne()
  }

  // ── rendering ──────────────────────────────────────────────────────────────
  function renderPopulation() {
    const yMax = Math.max(...pop.p) * 1.15
    const y = d3.scaleLinear().domain([0, yMax]).range([POP.top + POP.h, POP.top])
    const bw = (x(2) - x(1)) * 0.72

    gPop.selectAll('line.base').data([0]).join('line').attr('class', 'base')
      .attr('x1', M.left).attr('x2', W - M.right)
      .attr('y1', POP.top + POP.h).attr('y2', POP.top + POP.h)
      .attr('stroke', RULE).attr('stroke-width', 1.5)

    const bars = gPop.selectAll('rect').data(VALUES)
    bars
      .join('rect')
      .attr('x', (v) => x(v) - bw / 2)
      .attr('width', bw)
      .attr('y', (v, i) => y(pop.p[i]))
      .attr('height', (v, i) => POP.top + POP.h - y(pop.p[i]))
      .attr('fill', NAVY)
      .attr('opacity', 0.75)

    gPop.selectAll('line.mu').data([pop.mu]).join('line').attr('class', 'mu')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d))
      .attr('y1', POP.top - 6).attr('y2', POP.top + POP.h)
      .attr('stroke', VIOLET).attr('stroke-width', 2).attr('stroke-dasharray', '5 4')
    gPop.selectAll('text.mu').data([pop.mu]).join('text').attr('class', 'mu')
      .attr('x', (d) => x(d) + 6).attr('y', POP.top - 8)
      .attr('font-size', 15).attr('fill', VIOLET)
      .text((d) => `μ = ${d.toFixed(2)}`)
  }

  function renderSample(show) {
    gSample.selectAll('*').remove()
    sampleLabel.attr('opacity', show ? 1 : 0)
    if (!show) return

    gSample
      .append('rect')
      .attr('x', M.left).attr('y', SAMPLE.top)
      .attr('width', W - M.right - M.left).attr('height', SAMPLE.h)
      .attr('fill', PALE).attr('stroke', RULE)

    // Values are integers, so identical draws are stacked rather than hidden;
    // the pitch tightens for large n so a stack stays inside the strip.
    const seen = new Map()
    const tallest = Math.max(...VALUES.map((v) => lastSample.filter((d) => d === v).length))
    const pitch = Math.min(8, (SAMPLE.h - 12) / Math.max(1, tallest - 1))
    gSample
      .selectAll('circle')
      .data(lastSample)
      .join('circle')
      .attr('cx', (v) => x(v))
      .attr('cy', (v) => {
        const k = seen.get(v) ?? 0
        seen.set(v, k + 1)
        return SAMPLE.top + SAMPLE.h - 8 - k * pitch
      })
      .attr('r', Math.min(4.5, Math.max(2, pitch * 0.6 + 1)))
      .attr('fill', TEAL)

    const m = means.at(-1)
    gSample
      .append('line')
      .attr('x1', x(m)).attr('x2', x(m))
      .attr('y1', SAMPLE.top - 4).attr('y2', SAMPLE.top + SAMPLE.h + 4)
      .attr('stroke', TEAL).attr('stroke-width', 2.5)
    gSample
      .append('text')
      .attr('x', x(m)).attr('y', SAMPLE.top - 9)
      .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', TEAL)
      .text(`x̄ = ${m.toFixed(2)}`)
  }

  function renderDist(show, overlay) {
    gDist.selectAll('*').remove()
    distLabel.attr('opacity', show ? 1 : 0)
    if (!show) return

    // A mean of n integer draws is sum/n, so bin on the integer sums: doing it
    // in floating point puts two lattice points in one bin wherever the
    // division rounds down, which shows up as a comb of double-height bars.
    const NSUM = 5 * cfg.n + 1 // possible sums: n … 6n
    const group = Math.max(1, Math.ceil(NSUM / 52))
    const nb = Math.floor((NSUM - 1) / group) + 1
    const bw = group / cfg.n // bin width in units of the mean
    const edge = (i) => (cfg.n + i * group) / cfg.n - 0.5 / cfg.n
    const counts = new Array(nb).fill(0)
    for (const m of means) {
      const sum = Math.round(m * cfg.n)
      counts[Math.min(nb - 1, Math.max(0, Math.floor((sum - cfg.n) / group)))]++
    }
    const se = pop.sd / Math.sqrt(cfg.n)
    // Density scaling keeps the vertical axis stable as draws accumulate and
    // lets the normal curve be drawn in the same units.
    const dens = counts.map((c) => c / (means.length * bw))
    const yMax = Math.max(...dens, overlay ? 1 / (se * Math.sqrt(2 * Math.PI)) : 0) * 1.12 || 1
    const y = d3.scaleLinear().domain([0, yMax]).range([DIST.top + DIST.h, DIST.top])

    gDist
      .append('rect')
      .attr('x', M.left).attr('y', DIST.top)
      .attr('width', W - M.right - M.left).attr('height', DIST.h)
      .attr('fill', PALE).attr('stroke', RULE)

    gDist
      .selectAll('rect.bin')
      .data(dens)
      .join('rect')
      .attr('class', 'bin')
      .attr('x', (d, i) => x(edge(i)))
      .attr('width', Math.max(1.5, x(bw) - x(0) - 1))
      .attr('y', (d) => y(d))
      .attr('height', (d) => DIST.top + DIST.h - y(d))
      .attr('fill', means.length === 1 ? TEAL : VIOLET)
      .attr('opacity', 0.8)

    gDist
      .append('line')
      .attr('x1', x(pop.mu)).attr('x2', x(pop.mu))
      .attr('y1', DIST.top).attr('y2', DIST.top + DIST.h)
      .attr('stroke', VIOLET).attr('stroke-width', 2).attr('stroke-dasharray', '5 4')

    if (overlay) {
      const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]))
      const pts = d3.range(0, 241).map((i) => {
        const v = LO + ((HI - LO) * i) / 240
        return [v, Math.exp(-((v - pop.mu) ** 2) / (2 * se * se)) / (se * Math.sqrt(2 * Math.PI))]
      })
      gDist
        .append('path')
        .attr('d', line(pts))
        .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 2.5)
    }
  }

  function render(step) {
    renderPopulation()
    sampleLabel.text(step >= 3 ? 'last sample' : 'one sample')
    renderSample(step >= 1)
    renderDist(step >= 2, step >= 4)
    gAxis.call(d3.axisBottom(x).tickValues(VALUES).tickFormat(d3.format('d'))).attr('font-size', 13)

    const se = pop.sd / Math.sqrt(cfg.n)
    title.text(
      step >= 2
        ? `${POPULATIONS[cfg.shape].label} · n = ${cfg.n} · ${means.length} sample${means.length === 1 ? '' : 's'}`
        : `${POPULATIONS[cfg.shape].label} · n = ${cfg.n}`,
    )

    if (step >= 4) {
      const obs = Math.sqrt(means.reduce((a, m) => a + (m - pop.mu) ** 2, 0) / means.length)
      caption
        .attr('fill', NAVY)
        .text(`spread of the means: observed ${obs.toFixed(3)} · predicted σ/√n = ${pop.sd.toFixed(2)}/√${cfg.n} = ${se.toFixed(3)}`)
    } else if (step === 3) {
      caption.attr('fill', NAVY).text('Same axis as the population above — is this narrower, and why?')
    } else if (step === 2) {
      caption.attr('fill', TEAL).text('One sample → one number. What would a second sample give?')
    } else if (step === 1) {
      caption.attr('fill', TEAL).text(`${cfg.n} draws from the population. Where will their mean land?`)
    } else {
      caption.attr('fill', NAVY).text('The population is fixed and unknown. We only ever see a sample of it.')
    }
  }

  // ── controls (tier 3) ──────────────────────────────────────────────────────
  let step = 0
  const targetFor = (s) => (s >= 4 ? 1000 : s >= 3 ? 50 : s >= 1 ? 1 : 0)

  const controls = addControls(
    el,
    { isPrint },
    [
      {
        id: 'shape',
        label: 'population',
        type: 'choice',
        value: cfg.shape,
        options: Object.entries(POPULATIONS).map(([k, v]) => ({ value: k, label: v.label })),
      },
      { id: 'n', label: 'sample size n', type: 'range', min: 1, max: 50, value: cfg.n },
      { id: 'more', label: '+500 samples', type: 'button' },
    ],
    (id, values) => {
      if (id === 'more') {
        // Only meaningful once the distribution is on screen.
        if (step < 2) return
        for (let i = 0; i < 500; i++) drawOne()
      } else {
        cfg = { shape: values.shape, n: values.n }
        runTo(targetFor(step))
      }
      render(step)
    },
  )

  const setStep = (i) => {
    step = i
    runTo(targetFor(i))
    render(i)
  }

  setStep(isPrint ? steps || 4 : steps ? 0 : 4)
  // Keep the readouts in sync if a deck passed non-default params.
  controls.set('n', cfg.n)
  return { setStep }
}

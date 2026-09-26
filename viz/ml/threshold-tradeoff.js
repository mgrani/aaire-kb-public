// From scores to decisions: expected cost of a fraud check as the decision
// threshold sweeps (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
// PML Lecture 06, Module 3.
//
// The model is calibrated by construction: a suspicion feature is N(0, 1) for
// legitimate and N(d, 1) for fraudulent transactions, and the score is the
// exact posterior p(fraud | feature). Checking every transaction whose score
// exceeds t costs c_FP per legitimate one checked and c_FN per fraud let
// through. For a calibrated score the minimum sits at t* = c_FP/(c_FP + c_FN)
// — the loan threshold of Lecture 01.
//
// params (all optional):
//   cFP:        cost of checking a legitimate transaction, € (default 5)
//   cFN:        cost of a missed fraud, € (default 500)
//   cFN2:       the missed-fraud cost after the change in the last step (1000)
//   prevalence: share of frauds (default 0.001)
//   n:          transactions the costs are counted over (default 100000)
//   d:          separation of the two classes (default 4.65: at t = 0.001 this
//               is Lecture 02's flag — recall 99%, about 1,000 false alarms)
//
// Steps (data-steps="4"):
//   0  the two costs: checks on honest customers, frauds let through
//   1  their sum: the expected cost per n transactions
//   2  the minimum, at t* = c_FP/(c_FP + c_FN), with recall and precision
//   3  two other thresholds for comparison: L02's flag (0.001) and 0.5
//   4  a missed fraud now costs cFN2: the minimum moves to the left

const NAVY = '#164374'
const TEAL = '#0083A1'
const RED = '#dc2626'
const AMBER = '#d97706'
const VIOLET = '#7c3aed'
const GRAY = '#8a8a8a'
const INK = '#333333'

let instances = 0

// standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7)
function Phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
    t * Math.exp(-z * z / 2)
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y)
}
const logit = (p) => Math.log(p / (1 - p))

export async function mount(el, { d3, params, steps }) {
  const cFP = params.cFP ?? 5
  const cFN = params.cFN ?? 500
  const cFN2 = params.cFN2 ?? 1000
  const prev = params.prevalence ?? 0.001
  const n = params.n ?? 100000
  const d = params.d ?? 4.65
  const nF = n * prev, nL = n - nF
  const uid = `tt${++instances}`

  // counts at threshold t (on the calibrated score)
  const at = (t) => {
    const z = (logit(t) - logit(prev) + d * d / 2) / d
    const FN = nF * Phi(z - d)
    const FP = nL * (1 - Phi(z))
    const TP = nF - FN
    return { FN, FP, TP, recall: TP / nF, precision: TP / (TP + FP) }
  }

  const W = 760, H = 430
  const M = { top: 64, right: 24, bottom: 52, left: 74 }
  const T0 = 0.0003, T1 = 0.999, YMAX = 20000
  const x = d3.scaleLog([T0, T1], [M.left, W - M.right])
  const y = d3.scaleLinear([0, YMAX], [H - M.bottom, M.top])

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Expected cost of fraud checks against the decision threshold')
  svg.append('defs').append('clipPath').attr('id', `plot-${uid}`)
    .append('rect').attr('x', M.left).attr('y', M.top - 2)
    .attr('width', W - M.left - M.right).attr('height', H - M.top - M.bottom + 2)

  const ticks = [0.001, 0.01, 0.1, 0.5]
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).tickValues(ticks).tickFormat((v) => String(v)))
    .attr('font-size', 15).attr('color', NAVY)
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).tickValues([0, 5000, 10000, 15000, 20000]).tickFormat((v) => `€${v / 1000}k`))
    .attr('font-size', 15).attr('color', NAVY)
  svg.append('text').attr('x', W - M.right).attr('y', H - 12).attr('text-anchor', 'end')
    .attr('fill', NAVY).attr('font-size', 15).text('threshold t: check if p(fraud | x) > t')
  svg.append('text')
    .attr('transform', `translate(18,${(M.top + H - M.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', NAVY).attr('font-size', 15)
    .text(`expected cost per ${n.toLocaleString('en-US')} transactions`)

  const caption = svg.append('text').attr('x', M.left + 4).attr('y', 22)
    .attr('fill', NAVY).attr('font-size', 19).attr('font-weight', 600)

  const plot = svg.append('g').attr('clip-path', `url(#plot-${uid})`)
  const ghost = plot.append('path').attr('fill', 'none').attr('stroke', GRAY).attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6 5')
  const fpPath = plot.append('path').attr('fill', 'none').attr('stroke', AMBER).attr('stroke-width', 2.5)
  const fnPath = plot.append('path').attr('fill', 'none').attr('stroke', RED).attr('stroke-width', 2.5)
  const totPath = plot.append('path').attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 4)
  const labels = svg.append('g').attr('font-size', 15)
  const marks = svg.append('g')
  // readout in the empty top-left of the plot (the curves stay below €11k there)
  const readout = svg.append('g').attr('transform', `translate(${M.left + 14},${M.top + 18})`)

  const ts = d3.range(0, 301).map((i) => T0 * (T1 / T0) ** (i / 300))
  const line = d3.line().x((p) => x(p[0])).y((p) => y(Math.min(p[1], YMAX * 1.2)))
  const curves = (cfn) => ts.map((t) => {
    const c = at(t)
    return { t, fp: cFP * c.FP, fn: cfn * c.FN, tot: cFP * c.FP + cfn * c.FN }
  })

  const fmtE = (v) => `€${Math.round(v).toLocaleString('en-US')}`
  const pct = (v) => `${Math.round(100 * v)}%`

  function mark(t, cfn, colour, name, row) {
    const c = at(t)
    const cost = cFP * c.FP + cfn * c.FN
    marks.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', y(0)).attr('y2', y(Math.min(cost, YMAX)))
      .attr('stroke', colour).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4')
    if (cost <= YMAX) {
      marks.append('circle').attr('cx', x(t)).attr('cy', y(cost)).attr('r', 6.5)
        .attr('fill', colour).attr('stroke', 'white').attr('stroke-width', 2)
    }
    const g = readout.append('g').attr('transform', `translate(0,${row * 27})`)
    g.append('circle').attr('cx', 5).attr('cy', -5).attr('r', 5.5).attr('fill', colour)
    const tx = g.append('text').attr('x', 16).attr('y', 0).attr('font-size', 16).attr('fill', INK)
    tx.append('tspan').attr('font-weight', 700).text(`${name}: ${fmtE(cost)}`)
    tx.append('tspan').text(`  ·  recall ${pct(c.recall)}, precision ${pct(c.precision)}`)
  }

  function render(stepIn) {
    const step = Math.max(0, Math.min(4, stepIn))
    const cfn = step >= 4 ? cFN2 : cFN
    const cs = curves(cfn)
    const tStar = cFP / (cFP + cfn)

    fpPath.attr('d', line(cs.map((c) => [c.t, c.fp])))
    fnPath.attr('d', line(cs.map((c) => [c.t, c.fn])))
    totPath.attr('d', line(cs.map((c) => [c.t, c.tot]))).attr('opacity', step >= 1 ? 1 : 0)
    ghost.attr('d', line(curves(cFN).map((c) => [c.t, c.tot]))).attr('opacity', step >= 4 ? 0.8 : 0)

    // legend row under the caption
    labels.selectAll('*').remove()
    const items = [
      [AMBER, `checks of honest customers, €${cFP} each`, 2.5, M.left + 4],
      [RED, `missed frauds, €${cfn.toLocaleString('en-US')} each`, 2.5, M.left + 336],
    ]
    if (step >= 1) items.push([NAVY, 'total', 4, M.left + 580])
    // fixed positions: the slide may be hidden (display:none) when this runs,
    // so text cannot be measured
    for (const [colour, text, sw, lx] of items) {
      labels.append('line').attr('x1', lx).attr('x2', lx + 22).attr('y1', 42).attr('y2', 42)
        .attr('stroke', colour).attr('stroke-width', sw)
      labels.append('text').attr('x', lx + 28).attr('y', 47).attr('fill', colour).attr('font-weight', 600)
        .text(text)
    }

    marks.selectAll('*').remove()
    readout.selectAll('*').remove()
    if (step >= 2) mark(tStar, cfn, VIOLET, `t* = ${cFP}/(${cFP}+${cfn.toLocaleString('en-US')}) ≈ ${tStar.toFixed(3)}`, 0)
    if (step === 3) {
      mark(0.001, cfn, TEAL, 'Lecture 02’s flag, t = 0.001', 1)
      mark(0.5, cfn, GRAY, 'the default, t = 0.5', 2)
    }

    caption.text([
      'Two costs pull the threshold in opposite directions',
      'Their sum: the expected cost of a threshold',
      'The minimum sits at t* = c_FP / (c_FP + c_FN)',
      'Lecture 02’s flag and the default 0.5, for comparison',
      `A missed fraud now costs €${cfn.toLocaleString('en-US')}: the minimum moves left`,
    ][step])
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

// The joint of a class and one attribute, as a heatmap (Principle 6, tier 2).
//
// Rows are the classes, columns the values of one attribute (amount bins); a
// cell's colour is p(y, x). Bayes' theorem is then read off the picture: the
// prior is the row margin, the evidence the column margin, the likelihood a
// row measured against its own total, the posterior a column measured against
// its own total (teal = counted, violet frame = "out of"). A discriminative
// model learns only the column shares; a generative one the whole picture.
//
// Uses only: joint distribution, marginalisation, conditional probability.
//
// params: prior (P(fraud), default 0.2 — exaggerated so the row is visible),
//         observed (column index for the posterior, default 3)
// steps: 0 the joint · 1 the two margins: prior and evidence · 2 the
//        likelihood p(x | fraud) · 3 the posterior P(y | x) for one column

import { addControls } from '../core/controls.js'

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const RULE = '#dde3ea'

const BINS = ['< 10 €', '10–50', '50–200', '200–1k', '> 1k']
const LIK = {
  honest: [0.3, 0.35, 0.22, 0.1, 0.03],
  fraud: [0.05, 0.1, 0.2, 0.3, 0.35],
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const W = 880
  const H = 350
  const x0 = 110
  const y0 = 66
  const CW = 102
  const CH = 66
  const obs = params.observed ?? 3

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Heatmap of the joint of class and transaction amount, with prior and evidence as margins')

  const caption = svg.append('text').attr('x', W / 2).attr('y', 28)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  const g = svg.append('g')
  const shade = d3.interpolateRgb('#ffffff', TEAL)
  const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`

  function render(step, { prior }) {
    g.selectAll('*').remove()
    const py = { honest: 1 - prior, fraud: prior }
    const rows = ['honest', 'fraud']
    const joint = rows.map((r) => LIK[r].map((l) => l * py[r]))
    const evid = BINS.map((_, j) => joint[0][j] + joint[1][j])
    const vmax = d3.max(joint.flat())

    rows.forEach((r, i) => {
      g.append('text').attr('x', x0 - 12).attr('y', y0 + i * CH + CH / 2 + 6)
        .attr('text-anchor', 'end').attr('font-size', 17).attr('fill', NAVY)
        .attr('font-weight', 700).text(r)
      BINS.forEach((b, j) => {
        const v = joint[i][j]
        // which share a cell shows: the joint, a row share or a column share
        let label = pct(v)
        let dim = false
        if (step === 2) {
          dim = r !== 'fraud'
          if (!dim) label = pct(LIK.fraud[j])
        } else if (step >= 3) {
          dim = j !== obs
          if (!dim) label = pct(v / evid[j])
        }
        g.append('rect')
          .attr('x', x0 + j * CW).attr('y', y0 + i * CH).attr('width', CW - 3).attr('height', CH - 3)
          .attr('rx', 4).attr('fill', shade(0.12 + 0.88 * (v / vmax))).attr('stroke', RULE)
          .attr('opacity', dim ? 0.25 : 1)
        g.append('text')
          .attr('x', x0 + j * CW + CW / 2 - 1).attr('y', y0 + i * CH + CH / 2 + 6)
          .attr('text-anchor', 'middle').attr('font-size', 18)
          .attr('fill', v / vmax > 0.55 && !dim ? '#ffffff' : NAVY)
          .attr('opacity', dim ? 0.35 : 1).text(label)
      })
    })
    BINS.forEach((b, j) => {
      g.append('text').attr('x', x0 + j * CW + CW / 2).attr('y', y0 + 2 * CH + 20)
        .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', NAVY).text(b)
    })
    g.append('text').attr('x', x0 + 5 * CW).attr('y', y0 + 2 * CH + 42)
      .attr('text-anchor', 'end').attr('font-size', 14).attr('fill', '#64748b').text('amount x')

    // margins: the prior to the right of each row, the evidence under each column
    if (step >= 1) {
      const mx = x0 + 5 * CW + 16
      rows.forEach((r, i) => {
        g.append('rect').attr('x', mx).attr('y', y0 + i * CH + 18)
          .attr('width', 70 * py[r]).attr('height', CH - 39).attr('fill', NAVY).attr('opacity', 0.75)
        g.append('text').attr('x', mx + 70 * py[r] + 8).attr('y', y0 + i * CH + CH / 2 + 6)
          .attr('font-size', 16).attr('fill', NAVY).text(`P(${r}) = ${pct(py[r])}`)
      })
      g.append('text').attr('x', mx).attr('y', y0 - 12).attr('font-size', 14)
        .attr('fill', NAVY).attr('font-weight', 700).text('prior: row sums')
      const by = y0 + 2 * CH + 40
      const emax = d3.max(evid)
      BINS.forEach((b, j) => {
        const h = 48 * (evid[j] / emax)
        g.append('rect').attr('x', x0 + j * CW + 20).attr('y', by + 48 - h)
          .attr('width', CW - 43).attr('height', h).attr('fill', NAVY).attr('opacity', 0.75)
        g.append('text').attr('x', x0 + j * CW + CW / 2).attr('y', by + 66)
          .attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', NAVY).text(pct(evid[j]))
      })
      g.append('text').attr('x', x0 - 12).attr('y', by + 34).attr('text-anchor', 'end')
        .attr('font-size', 14).attr('fill', NAVY).attr('font-weight', 700).text('evidence p(x)')
    }

    // "out of": the fraud row (likelihood) or one column (posterior)
    if (step === 2) {
      g.append('rect').attr('x', x0 - 4).attr('y', y0 + CH - 4).attr('width', 5 * CW + 5).attr('height', CH + 5)
        .attr('rx', 6).attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 3.5)
    }
    if (step >= 3) {
      g.append('rect').attr('x', x0 + obs * CW - 4).attr('y', y0 - 4).attr('width', CW + 5).attr('height', 2 * CH + 5)
        .attr('rx', 6).attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 3.5)
    }

    const pf = joint[1][obs] / evid[obs]
    const cap = [
      'One cell = p(class, amount): how often both occur together',
      'Row sums: the prior P(y). Column sums: the evidence p(x)',
      'Likelihood p(x | fraud): the fraud row, out of its own total',
      `Posterior P(fraud | ${BINS[obs]}) = ${pct(pf)}: the column, out of its total`,
    ]
    caption.attr('fill', step >= 2 ? VIOLET : NAVY).text(cap[Math.min(step, 3)])
  }

  let step = 0
  const controls = addControls(el, { isPrint }, [
    { id: 'prior', label: 'P(fraud)', type: 'range', min: 0.01, max: 0.5, step: 0.01,
      value: params.prior ?? 0.2, format: (v) => `${Math.round(v * 100)}%` },
  ], (id, v) => render(step, v))

  const setStep = (i) => {
    step = i
    render(i, controls.values)
  }
  setStep(isPrint ? steps || 3 : steps ? 0 : 3)
  return { setStep }
}

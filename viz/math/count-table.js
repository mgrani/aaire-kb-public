// Joint, marginal and conditional probability read off one table of counts
// (docs/PEDAGOGIC_CONCEPT.md Principle 6, tier 2) — the intuition-first
// example of units/math/stochastic/probability-quickstart.md.
//
// 100 students, each sat one exam: course across, result down. Every
// probability is a fraction of this table. Teal fill marks the cells that are
// counted, a violet frame the count they are taken out of — the same encoding
// as the Venn figures of the conditioning units. Cells outside the condition
// fade out: they are not taken into account at all.
//
// Uses only: counting, fractions.
//
// params.view:
//   "read"   1 ask joint · 2 answer · 3 ask marginal · 4 answer ·
//            5 ask conditional · 6 answer
//   "rules"  1 sum rule: the failures per course · 2 add up to the margin ·
//            3 product rule: the column's share · 4 times the cell's share
//   "bayes"  1 ask · 2 keep only the evidence row · 3 read off by counting ·
//            4 prior · 5 likelihood · 6 prior × likelihood = the cell ·
//            7 evidence (normaliser) = the row · 8 Bayes' theorem ·
//            9 which course is more probable: odds, the normaliser cancels

const NAVY = '#164374'
const TEAL = '#0083A1'
const TEAL_T = '#cdeaf1'
const VIOLET = '#7c3aed'
const PAPER = '#f8fafc'
const RULE = '#cbd5e1'
const GREY = '#475569'

const COLS = ['PML', 'DB', 'total']
const ROWS = ['pass', 'fail', 'total']
const N = [
  [30, 54],
  [10, 6],
]
const count = (r, c) =>
  r < 2 && c < 2 ? N[r][c]
    : r < 2 ? N[r][0] + N[r][1]
      : c < 2 ? N[0][c] + N[1][c]
        : N[0][0] + N[0][1] + N[1][0] + N[1][1]

// A line is a list of [text, role] segments; roles colour the text.
const fr = (a, b) => [[String(a), 'num'], [' / '], [String(b), 'den']]
const L = (...segs) => segs.flatMap((s) => (typeof s === 'string' ? [[s]] : s))

const FAIL_ROW = [[1, 0], [1, 1], [1, 2]]
const PML_COL = [[0, 0], [1, 0], [2, 0]]

const PML_FAIL = [[1, 0]]
// Without the table only the course totals are known; the other counts are
// hidden ("?") until prior and likelihoods let us infer them.
const UNKNOWN = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]
const PASS_ROW = [[0, 0], [0, 1], [0, 2]]
const AFTER_PML = [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]]
const BAYES_Q = 'A student failed. How probable is it that they took PML?'
const BAYES_RULE = L([['P(PML | fail) = P(fail | PML) · P(PML) / P(fail)', 'head']])

const VIEWS = {
  read: [
    { cap: '100 students, one exam each: course across, result down' },
    { q: 'Of all 100 students, what share failed the PML exam?' },
    {
      q: 'Of all 100 students, what share failed the PML exam?',
      num: PML_FAIL, den: [[2, 2]],
      lines: [L([['P(PML, fail)', 'head']]), L('= ', fr(10, 100), ' = 0.10')],
      hint: 'joint: one cell, out of everyone',
    },
    { q: 'Of all 100 students, what share failed?' },
    {
      q: 'Of all 100 students, what share failed?',
      num: FAIL_ROW, den: [[2, 2]],
      lines: [L([['P(fail)', 'head']]), L('= ', fr(16, 100), ' = 0.16')],
      hint: 'marginal: a row total, out of everyone',
    },
    { q: 'Of the PML students, what share failed?' },
    {
      q: 'Of the PML students, what share failed?',
      num: PML_FAIL, den: [[2, 0]], keep: PML_COL,
      lines: [L([['P(fail | PML)', 'head']]), L('= ', fr(10, 40), ' = 0.25')],
      hint: 'conditional: a cell, out of its own column',
    },
  ],
  rules: [
    { cap: 'The same table: how do its numbers fit together?' },
    {
      q: '10 failed PML, 6 failed DB. What share failed in total?',
      num: FAIL_ROW.slice(0, 2), signs: true,
      lines: [L('10 + 6 = 16 students')],
      hint: 'every failure is in exactly one course',
    },
    {
      q: '10 failed PML, 6 failed DB. What share failed in total?',
      num: FAIL_ROW, den: [[2, 2]], signs: true,
      lines: [
        L([['Sum rule', 'head']]),
        L('P(fail) = P(PML, fail) + P(DB, fail)'),
        L('= ', fr(10, 100), ' + ', fr(6, 100), ' = ', fr(16, 100)),
      ],
      hint: 'add over the courses — the course drops out',
    },
    {
      q: '40% took PML, and a quarter of them failed. What share failed PML?',
      num: [[2, 0]], den: [[2, 2]],
      lines: [L('took PML: P(PML) = ', fr(40, 100))],
      hint: 'first the share of the column …',
    },
    {
      q: '40% took PML, and a quarter of them failed. What share failed PML?',
      num: PML_FAIL, den: [[2, 0]], keep: PML_COL,
      lines: [
        L('… of those, failed: P(fail | PML) = ', fr(10, 40)),
        L([['Product rule', 'head']]),
        L('P(PML, fail) = P(PML) · P(fail | PML)'),
        L('= 40/100 · 10/40 = 10/100'),
      ],
      hint: 'a share of a share — the 40s cancel',
    },
  ],
  bayes: [
    { cap: 'The same table, read backwards: from the result to the course' },
    { q: BAYES_Q },
    {
      q: BAYES_Q,
      den: [[1, 2]], keep: FAIL_ROW,
      lines: [L('only the 16 failed students remain')],
      hint: 'the evidence shrinks the world to one row',
    },
    {
      q: BAYES_Q,
      num: PML_FAIL, den: [[1, 2]], keep: FAIL_ROW,
      lines: [
        L([['P(PML | fail)', 'head'], [' = '], ...fr(10, 16), [' ≈ 0.63']]),
        L('before the evidence: P(PML) = 0.40'),
      ],
      hint: 'with the table, counting is enough',
    },
    {
      q: 'Without the table: what do we usually know?',
      num: [[2, 0]], den: [[2, 2]],
      hide: UNKNOWN,
      lines: [L([['prior', 'head'], ['  P(PML) = '], ...fr(40, 100)])],
      hint: 'belief before the evidence: how common is PML?',
    },
    {
      q: 'Without the table: what do we usually know?',
      num: PML_FAIL, den: [[2, 0]], keep: PML_COL,
      lines: [
        L('prior  P(PML) = 40/100'),
        L([['likelihood', 'head'], ['  P(fail | PML) = 1/4']]),
        L('→ ', fr(10, 40), ' failed'),
      ],
      hide: AFTER_PML,
      hint: 'how well PML explains the evidence',
    },
    {
      q: 'Prior × likelihood gives the cell …',
      num: PML_FAIL, den: [[2, 2]],
      lines: [
        L('prior  P(PML) = 40/100'),
        L('likelihood  P(fail | PML) = 10/40'),
        L('P(fail | PML) · P(PML) = ', fr(10, 100)),
      ],
      hide: AFTER_PML,
      hint: 'product rule: the joint P(PML, fail)',
    },
    {
      q: '… out of all ways to fail: the normaliser',
      num: FAIL_ROW, den: [[2, 2]], signs: true,
      lines: [
        L([['evidence', 'head'], ['  P(fail) = 10/100 + 6/100 = '], ...fr(16, 100)]),
        L('= P(fail | PML) P(PML) + P(fail | DB) P(DB)'),
        L('with P(fail | DB) = 1/10 → 6 of 60'),
      ],
      hide: PASS_ROW,
      hint: 'sum rule: every course that could explain the fail',
    },
    {
      q: BAYES_Q,
      num: PML_FAIL, den: [[1, 2]], keep: FAIL_ROW,
      lines: [
        BAYES_RULE,
        L('= (10/40 · 40/100) / (16/100)'),
        L('= ', fr(10, 16), ' ≈ 0.63'),
      ],
      hide: PASS_ROW,
      hint: 'likelihood × prior / evidence — the pass row is never needed',
    },
    {
      q: 'And which course did they most probably take?',
      num: [[1, 0], [1, 1]], den: [[1, 2]], keep: FAIL_ROW,
      lines: [
        L('P(PML | fail) = ', fr(10, 16), ' ≈ 0.63'),
        L('P(DB | fail) = ', fr(6, 16), ' ≈ 0.37'),
        L('PML — odds 10 : 6'),
      ],
      hide: PASS_ROW,
      hint: 'same normaliser: comparing needs only the cells',
    },
  ],
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const states = VIEWS[params.view] ?? VIEWS.read
  const W = 960
  const H = 400
  const X0 = 20
  const LW = 100 // row-label column
  const CW = 96
  const RH = 54
  const Y0 = 78 // top of the header row
  const PX = X0 + LW + 3 * CW + 40 // right panel

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'A table of exam results by course, with cells highlighted as counts and totals')
  const g = svg.append('g')

  const cx = (c) => X0 + LW + c * CW
  const cy = (r) => Y0 + RH + r * RH
  const inList = (list, r, c) => (list ?? []).some(([a, b]) => a === r && b === c)

  function render(step) {
    const s = states[Math.max(0, Math.min(step, states.length - 1))]
    g.selectAll('*').remove()
    const faded = (r, c) => s.keep && !inList(s.keep, r, c)

    // question or caption
    if (s.q) {
      g.append('circle').attr('cx', X0 + 14).attr('cy', 30).attr('r', 14).attr('fill', NAVY)
      g.append('text').attr('x', X0 + 14).attr('y', 37).attr('text-anchor', 'middle')
        .attr('font-size', 20).attr('font-weight', 700).attr('fill', '#fff').text('?')
      g.append('text').attr('x', X0 + 40).attr('y', 38).attr('font-size', 23)
        .attr('font-weight', 700).attr('fill', NAVY).text(s.q)
    } else {
      g.append('text').attr('x', X0).attr('y', 38).attr('font-size', 22).attr('fill', NAVY).text(s.cap)
    }

    // header row and row labels
    g.append('text').attr('x', X0 + LW - 12).attr('y', Y0 + 22).attr('text-anchor', 'end')
      .attr('font-size', 14).attr('fill', GREY).text('course →')
    g.append('text').attr('x', X0 + LW - 12).attr('y', Y0 + 42).attr('text-anchor', 'end')
      .attr('font-size', 14).attr('fill', GREY).text('result ↓')
    COLS.forEach((name, c) => {
      g.append('text').attr('x', cx(c) + CW / 2).attr('y', Y0 + 34).attr('text-anchor', 'middle')
        .attr('font-size', 19).attr('font-weight', 700).attr('fill', NAVY)
        .attr('opacity', s.keep === PML_COL && c !== 0 ? 0.25 : 1)
        .text(name)
    })
    ROWS.forEach((name, r) => {
      g.append('text').attr('x', X0 + LW - 12).attr('y', cy(r) + RH / 2 + 7).attr('text-anchor', 'end')
        .attr('font-size', 19).attr('font-weight', 700).attr('fill', NAVY)
        .attr('opacity', s.keep === FAIL_ROW && r !== 1 ? 0.25 : 1)
        .text(name)
    })

    // cells
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const total = r === 2 || c === 2
        const counted = inList(s.num, r, c)
        g.append('rect').attr('x', cx(c)).attr('y', cy(r)).attr('width', CW).attr('height', RH)
          .attr('fill', counted ? TEAL_T : total ? PAPER : '#fff')
          .attr('stroke', RULE).attr('stroke-width', 1.5)
          .attr('opacity', faded(r, c) ? 0.25 : 1)
        g.append('text').attr('x', cx(c) + CW / 2).attr('y', cy(r) + RH / 2 + 8)
          .attr('text-anchor', 'middle').attr('font-size', 23)
          .attr('font-weight', total ? 700 : 400).attr('fill', '#0f172a')
          .attr('opacity', faded(r, c) ? 0.25 : 1)
          .attr('fill', inList(s.hide, r, c) ? RULE : '#0f172a')
          .text(inList(s.hide, r, c) ? '?' : count(r, c))
      }
    }
    // outer rule between data and totals
    g.append('path')
      .attr('d', `M${cx(2)} ${cy(0)} V${cy(3)} M${cx(0)} ${cy(2)} H${cx(3)}`)
      .attr('stroke', NAVY).attr('stroke-width', 2)
    // teal outline around the counted cells
    for (const [r, c] of s.num ?? []) {
      g.append('rect').attr('x', cx(c) + 1.5).attr('y', cy(r) + 1.5).attr('width', CW - 3).attr('height', RH - 3)
        .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 2.5)
    }
    // the region still taken into account, and the count it is taken out of
    if (s.keep) {
      const rs = s.keep.map((d) => d[0]); const cs = s.keep.map((d) => d[1])
      const r0 = Math.min(...rs); const c0 = Math.min(...cs)
      g.append('rect').attr('x', cx(c0) - 5).attr('y', cy(r0) - 5)
        .attr('width', (Math.max(...cs) - c0 + 1) * CW + 10).attr('height', (Math.max(...rs) - r0 + 1) * RH + 10)
        .attr('rx', 6).attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 5')
    }
    for (const [r, c] of s.den ?? []) {
      g.append('rect').attr('x', cx(c) + 3).attr('y', cy(r) + 3).attr('width', CW - 6).attr('height', RH - 6)
        .attr('rx', 4).attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 4)
    }
    // + and = between the fail cells and their row total
    if (s.signs) {
      ;[[cx(1), '+'], [cx(2), '=']].forEach(([x, sign]) => {
        g.append('circle').attr('cx', x).attr('cy', cy(1) + RH / 2).attr('r', 13).attr('fill', TEAL)
        g.append('text').attr('x', x).attr('y', cy(1) + RH / 2 + 7).attr('text-anchor', 'middle')
          .attr('font-size', 21).attr('font-weight', 700).attr('fill', '#fff').text(sign)
      })
    }

    // right panel: the answer, built from the highlighted counts
    ;(s.lines ?? []).forEach((segs, i) => {
      const t = g.append('text').attr('x', PX).attr('y', Y0 + 50 + i * 44).attr('font-size', 21).attr('fill', NAVY)
      for (const [txt, role] of segs) {
        t.append('tspan').text(txt)
          .attr('fill', role === 'num' ? TEAL : role === 'den' ? VIOLET : NAVY)
          .attr('font-weight', role === 'num' || role === 'den' || role === 'head' ? 700 : 400)
      }
    })
    if (s.hint) {
      g.append('text').attr('x', PX).attr('y', Y0 + 50 + (s.lines?.length ?? 0) * 44 + 4)
        .attr('font-size', 17).attr('font-style', 'italic').attr('fill', GREY).text(s.hint)
    }

    // legend, once something is highlighted
    if (s.num || s.den) {
      const ly = H - 22
      g.append('rect').attr('x', X0 + LW).attr('y', ly - 14).attr('width', 22).attr('height', 18)
        .attr('fill', TEAL_T).attr('stroke', TEAL)
      g.append('text').attr('x', X0 + LW + 30).attr('y', ly).attr('font-size', 15).attr('fill', GREY).text('counted')
      g.append('rect').attr('x', X0 + LW + 115).attr('y', ly - 14).attr('width', 22).attr('height', 18)
        .attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 3)
      g.append('text').attr('x', X0 + LW + 145).attr('y', ly).attr('font-size', 15).attr('fill', GREY).text('out of')
    }
  }

  const last = states.length - 1
  render(isPrint ? last : steps ? 0 : last)
  return { setStep: render }
}

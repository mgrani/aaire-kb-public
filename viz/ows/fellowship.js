// The Fellowship of the Query, as a picture: a large teacher model produces
// search trajectories, the failed ones are thrown away, the surviving steps are
// labelled with one of seven retrieval actions, and a small model is trained on
// them until it can drive the loop itself.
//
// steps: 3 — 1 the teacher and the filter, 2 the action alphabet and the
//            student, 3 the two results.

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#15803d'
const VIOLET = '#7c3aed'
const INK = '#333333'
const SOFT = '#5a6472'
const SURFACE = '#f6f8fa'
const RULE = '#d3d9e0'
const WHITE = '#ffffff'

const ACTIONS = ['decompose', 'search', 'reformulate', 'extract', 'synthesise', 'verify', 'finish']

export async function mount(el, { d3, params, steps, isPrint }) {
  const cfg = Object.assign({ actions: ACTIONS }, params)
  const W = 1000, H = 430

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'A large teacher model produces search trajectories; accepted ones are labelled with seven retrieval actions and used to train a small student model that then drives the loop')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  svg.append('defs').append('marker').attr('id', 'fw-arrow').attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  const txt = (g, x, y, t, size, colour, weight = 400, anchor = 'start') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)

  const arrow = (g, x1, y1, x2, y2) =>
    g.append('path').attr('d', `M ${x1} ${y1} L ${x2} ${y2}`).attr('stroke', SOFT)
      .attr('stroke-width', 1.6).attr('fill', 'none').attr('marker-end', 'url(#fw-arrow)')

  const stage = (g, x, y, w, h, colour, title, big, small) => {
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 9)
      .attr('fill', SURFACE).attr('stroke', colour).attr('stroke-width', 1.6)
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', 5)
      .attr('fill', colour).attr('rx', 2.5)
    txt(g, x + w / 2, y + 28, title, 14, colour, 700, 'middle')
    if (big) txt(g, x + w / 2, y + 60, big, 25, INK, 700, 'middle')
    if (small) txt(g, x + w / 2, y + 80, small, 12.5, SOFT, 400, 'middle')
  }

  // ── row 1: teacher → rollouts → accepted trajectories ─────────────────────
  const gTeach = svg.append('g')
  stage(gTeach, 10, 16, 236, 98, NAVY, 'Teacher, a large model', 'Qwen 3-Next', 'runs the search task')
  arrow(gTeach, 252, 65, 288, 65)
  stage(gTeach, 294, 16, 200, 98, NAVY, 'Rollouts', '5,000', 'trajectories attempted')
  arrow(gTeach, 500, 65, 536, 65)
  stage(gTeach, 542, 16, 200, 98, TEAL, 'Kept: the ones that worked', '1,490', '16,488 steps')
  gTeach.append('text').attr('x', 621).attr('y', 132).attr('font-size', 12).attr('fill', '#b45309')
    .attr('text-anchor', 'middle').text('3,510 discarded')

  // ── the action alphabet ───────────────────────────────────────────────────
  const gAct = svg.append('g')
  txt(gAct, 10, 172, 'Every step is labelled with one of seven retrieval actions', 13, SOFT)
  let ax = 10
  cfg.actions.forEach((a) => {
    const w = 14 + a.length * 7.4
    gAct.append('rect').attr('x', ax).attr('y', 184).attr('width', w).attr('height', 28).attr('rx', 14)
      .attr('fill', WHITE).attr('stroke', TEAL).attr('stroke-width', 1.3)
    txt(gAct, ax + w / 2, 203, a, 12.5, TEAL, 700, 'middle')
    ax += w + 8
  })

  // ── row 2: the student ────────────────────────────────────────────────────
  const gStud = svg.append('g')
  arrow(gStud, 130, 220, 130, 248)
  stage(gStud, 10, 254, 300, 104, GREEN, 'Student, a 3B model', 'Granite 4.1', 'fine-tuned on 13,194 actions')

  // ── the results ───────────────────────────────────────────────────────────
  const gRes = svg.append('g')
  arrow(gRes, 316, 300, 352, 300)

  // next-action prediction, as two bars
  gRes.append('rect').attr('x', 358).attr('y', 254).attr('width', 304).attr('height', 104).attr('rx', 9)
    .attr('fill', WHITE).attr('stroke', RULE)
  txt(gRes, 374, 276, 'Predicting the next action (macro-F1)', 12.5, SOFT)
  const bar = (y, v, label, colour) => {
    gRes.append('rect').attr('x', 374).attr('y', y).attr('width', 200 * v).attr('height', 16).attr('rx', 3).attr('fill', colour)
    txt(gRes, 580, y + 13, `${v.toFixed(2)}  ${label}`, 12, INK, 700)
  }
  bar(288, 0.17, 'prompted', '#c2cad4')
  bar(312, 0.65, 'fine-tuned', GREEN)
  txt(gRes, 374, 350, 'a TF-IDF baseline reaches 0.54', 11.5, SOFT)

  // end-to-end
  gRes.append('rect').attr('x', 678).attr('y', 254).attr('width', 312).attr('height', 104).attr('rx', 9)
    .attr('fill', SURFACE).attr('stroke', VIOLET).attr('stroke-width', 1.6)
  txt(gRes, 834, 272, 'It runs the search itself', 12.5, VIOLET, 700, 'middle')
  txt(gRes, 834, 312, '0.01 → 0.62', 27, VIOLET, 700, 'middle')
  txt(gRes, 834, 334, 'evidence-fact rate: the answers start using', 11.5, SOFT, 400, 'middle')
  txt(gRes, 834, 349, 'what the pipeline retrieved', 11.5, SOFT, 400, 'middle')

  // ── the line under it all ─────────────────────────────────────────────────
  const gLine = svg.append('g')
  gLine.append('line').attr('x1', 10).attr('x2', 990).attr('y1', 382).attr('y2', 382)
    .attr('stroke', RULE).attr('stroke-width', 1)
  txt(gLine, 500, 406, 'traces in, a working search policy out', 14, SOFT, 400, 'middle')

  let last = null
  function render(step) {
    const s = isPrint || !steps ? 3 : Math.max(1, Math.min(3, step + 1))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    t(gTeach).attr('opacity', 1)
    t(gAct).attr('opacity', s >= 2 ? 1 : 0.12)
    t(gStud).attr('opacity', s >= 2 ? 1 : 0.12)
    t(gRes).attr('opacity', s >= 3 ? 1 : 0.12)
    t(gLine).attr('opacity', s >= 3 ? 1 : 0)
    last = s
  }
  render(2)
  return { setStep: (i) => render(i) }
}

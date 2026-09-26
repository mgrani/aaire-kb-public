// Two ways to get behaviour for an environment: a developer writes the rules,
// or the rules are inferred from data the environment generated. Both are
// judged on situations neither has seen.
//
// steps: 1 = the programming pipeline, 2 = the learning pipeline, 3 = the
// shared goal (unseen situations) underlined.

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const INK = '#3a3a3a'
const RULE = '#c9d3de'

const W = 1010, H = 345
const BW = 168, BH = 46

const ROWS = {
  prog: {
    y: 96, colour: NAVY, title: 'TRADITIONAL PROGRAMMING',
    boxes: ['environment', 'human knowledge\nabout it', 'developer writes\nrules', 'program'],
    note: 'the rules are written down explicitly',
  },
  ml: {
    y: 250, colour: TEAL, title: 'MACHINE LEARNING',
    boxes: ['environment', 'data / experience\nfrom it', 'learning\nalgorithm', 'model'],
    note: 'the rules are inferred from what the environment produced',
  },
}

// unique marker ids per instance: url(#id) resolves to the first match in the
// document, which may sit on a hidden slide
let instances = 0

export async function mount(el, { d3, steps, isPrint }) {
  const uid = `pvl${++instances}`
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const defs = svg.append('defs')
  for (const [id, c] of [['p-navy', NAVY], ['p-teal', TEAL], ['p-violet', VIOLET]]) {
    defs.append('marker').attr('id', `${id}-${uid}`).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', c)
  }

  const groups = {}
  for (const [key, row] of Object.entries(ROWS)) {
    const g = svg.append('g')
    g.append('text').attr('x', 26).attr('y', row.y - 22).attr('font-size', 13)
      .attr('font-weight', 700).attr('letter-spacing', 1.1).attr('fill', row.colour).text(row.title)
    row.boxes.forEach((label, i) => {
      const x = 26 + i * (BW + 34)
      const b = g.append('g').attr('transform', `translate(${x},${row.y})`)
      b.append('rect').attr('width', BW).attr('height', BH).attr('rx', 5)
        .attr('fill', '#ffffff').attr('stroke', row.colour).attr('stroke-width', 2)
      label.split('\n').forEach((ln, k, arr) => {
        b.append('text').attr('x', BW / 2).attr('y', BH / 2 + 5 + (k - (arr.length - 1) / 2) * 15)
          .attr('text-anchor', 'middle').attr('font-size', 13.5).attr('fill', INK).text(ln)
      })
      if (i < row.boxes.length - 1) {
        g.append('path').attr('d', `M${x + BW + 3},${row.y + BH / 2} L${x + BW + 28},${row.y + BH / 2}`)
          .attr('stroke', row.colour).attr('stroke-width', 2.2)
          .attr('marker-end', `url(#${key === 'prog' ? 'p-navy' : 'p-teal'}-${uid})`)
      }
    })
    g.append('text').attr('x', 26).attr('y', row.y + BH + 24).attr('font-size', 14)
      .attr('font-style', 'italic').attr('fill', row.colour).text(row.note)
    groups[key] = g
  }

  // both pipelines feed the same destination
  const goal = svg.append('g')
  // right of the last box, with room for the connector curves; W is sized so
  // the goal box ends inside the viewBox
  const gx = 26 + 3 * (BW + 34) + BW + 44
  goal.append('rect').attr('x', gx).attr('y', 158).attr('width', 150).attr('height', 78).attr('rx', 5)
    .attr('fill', '#f5f3ff').attr('stroke', VIOLET).attr('stroke-width', 2.4)
  goal.append('text').attr('x', gx + 75).attr('y', 188).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('fill', INK).text('new, unseen')
  goal.append('text').attr('x', gx + 75).attr('y', 210).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('fill', INK).text('situation')
  goal.append('text').attr('x', gx + 75).attr('y', 228).attr('text-anchor', 'middle')
    .attr('font-size', 13).attr('font-style', 'italic').attr('fill', VIOLET).text('→ output / action')
  for (const [key, row] of Object.entries(ROWS)) {
    const sx = 26 + 3 * (BW + 34) + BW
    goal.append('path')
      .attr('d', `M${sx + 3},${row.y + BH / 2} C${sx + 40},${row.y + BH / 2} ${gx - 40},197 ${gx - 3},197`)
      .attr('fill', 'none').attr('stroke', VIOLET).attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 4').attr('marker-end', `url(#p-violet-${uid})`)
  }

  const caption = svg.append('text').attr('x', W / 2).attr('y', 30).attr('text-anchor', 'middle')
    .attr('font-size', 19).attr('fill', NAVY)

  function render(step) {
    const s = isPrint ? 3 : step
    groups.prog.attr('opacity', s >= 1 ? 1 : 0.12)
    groups.ml.attr('opacity', s >= 2 ? 1 : 0.12)
    goal.attr('opacity', s >= 3 ? 1 : 0)
    caption.text(
      s === 0 ? 'Two ways to get behaviour out of an environment'
        : s === 1 ? 'A developer turns knowledge about the environment into rules'
        : s === 2 ? 'A learner turns data from the environment into a model'
        : 'Both are judged on situations neither of them has seen',
    )
  }

  render(isPrint ? 3 : steps)
  return { setStep: (i) => render(i) }
}

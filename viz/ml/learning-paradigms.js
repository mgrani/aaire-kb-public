// What the learner is given, and what comes back: the three paradigms drawn
// with the same vocabulary so they can be compared at a glance.
//
// params.kind: "supervised" | "unsupervised" | "reinforcement" | "compare"

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const GREEN = '#16803c'
const INK = '#3a3a3a'
const RULE = '#c9d3de'

const W = 760, H = 330

// unique marker ids per instance: url(#id) resolves to the first match in the
// document, which may sit on a hidden slide
let instances = 0

export async function mount(el, { d3, params, steps, isPrint }) {
  const uid = `lp${++instances}`
  const kind = params.kind ?? 'supervised'
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const defs = svg.append('defs')
  for (const [id, c] of [['q-navy', NAVY], ['q-teal', TEAL], ['q-violet', VIOLET], ['q-green', GREEN]]) {
    defs.append('marker').attr('id', `${id}-${uid}`).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', c)
  }
  const cap = svg.append('text').attr('x', W / 2).attr('y', 28).attr('text-anchor', 'middle')
    .attr('font-size', 19).attr('fill', NAVY)
  const g = svg.append('g')

  const box = (parent, x, y, w, h, label, sub, colour, fill = '#ffffff') => {
    const b = parent.append('g').attr('transform', `translate(${x},${y})`)
    b.append('rect').attr('width', w).attr('height', h).attr('rx', 5)
      .attr('fill', fill).attr('stroke', colour).attr('stroke-width', 2)
    b.append('text').attr('x', w / 2).attr('y', sub ? h / 2 - 2 : h / 2 + 5).attr('text-anchor', 'middle')
      .attr('font-size', 14).attr('fill', INK).text(label)
    if (sub) {
      const t = b.append('text').attr('x', w / 2).attr('y', h / 2 + 18).attr('text-anchor', 'middle')
        .attr('font-size', 13).attr('font-style', 'italic').attr('fill', colour)
      // "h_Θ" → h with a subscript Θ (SVG text has no TeX)
      const m = /^(\w)_(.+)$/.exec(sub)
      if (m) {
        t.append('tspan').text(m[1])
        t.append('tspan').attr('dy', 4).attr('font-size', 11).text(m[2])
      } else t.text(sub)
    }
    return b
  }
  const arrow = (parent, x1, y1, x2, y2, colour, marker, label, dash) => {
    parent.append('path').attr('d', `M${x1},${y1} L${x2},${y2}`).attr('fill', 'none')
      .attr('stroke', colour).attr('stroke-width', 2.2).attr('marker-end', `url(#${marker}-${uid})`)
      .attr('stroke-dasharray', dash ? '6 5' : null)
    if (label) parent.append('text').attr('x', (x1 + x2) / 2).attr('y', (y1 + y2) / 2 - 10)
      .attr('text-anchor', 'middle').attr('font-size', 13).attr('fill', colour).text(label)
  }

  function draw(step) {
    g.selectAll('*').remove()
    if (kind === 'supervised') {
      box(g, 40, 110, 190, 74, 'examples with', 'inputs x  +  answers y', TEAL, '#f0fdf4')
      arrow(g, 234, 147, 296, 147, NAVY, 'q-navy', 'train')
      box(g, 300, 110, 160, 74, 'model', 'h_Θ', NAVY)
      arrow(g, 464, 147, 526, 147, NAVY, 'q-navy', '')
      box(g, 530, 110, 190, 74, 'prediction for', 'an unseen input', VIOLET)
      cap.text('Supervised: every training example carries the answer')
      if (step >= 1) g.append('text').attr('x', W / 2).attr('y', 232).attr('text-anchor', 'middle')
        .attr('font-size', 15).attr('fill', GREEN).text('The learner is told the correct output for each case it sees.')
    } else if (kind === 'unsupervised') {
      box(g, 40, 110, 190, 74, 'observations', 'inputs x  —  no answers', TEAL, '#f6f8fa')
      arrow(g, 234, 147, 326, 147, NAVY, 'q-navy', 'find structure')
      box(g, 330, 110, 150, 74, 'model', 'h_Θ', NAVY)
      arrow(g, 484, 147, 536, 147, NAVY, 'q-navy', '')
      // scattered points forming two groups, to the right
      const pts = [[560,120],[585,132],[604,112],[578,152],[556,138],[672,190],[694,205],[712,182],[668,212],[690,168]]
      pts.forEach(([x,y],i)=> g.append('circle').attr('cx',x).attr('cy',y).attr('r',6)
        .attr('fill', i<5? TEAL : VIOLET).attr('opacity',0.85))
      g.append('text').attr('x', 640).attr('y', 250).attr('text-anchor','middle').attr('font-size',13)
        .attr('font-style','italic').attr('fill', NAVY).text('groups, factors, representations')
      cap.text('Unsupervised: no answers — only the observations themselves')
      if (step >= 1) g.append('text').attr('x', W / 2).attr('y', 292).attr('text-anchor', 'middle')
        .attr('font-size', 15).attr('fill', GREEN).text('Structure has to be found, not reproduced.')
    } else if (kind === 'reinforcement') {
      box(g, 90, 96, 180, 70, 'agent', 'chooses an action', NAVY)
      box(g, 470, 96, 200, 70, 'environment', 'e.g. the robot’s world', TEAL)
      arrow(g, 274, 118, 466, 118, NAVY, 'q-navy', 'action')
      g.append('path').attr('d', `M466,150 L274,150`).attr('fill','none').attr('stroke', VIOLET)
        .attr('stroke-width',2.2).attr('marker-end',`url(#q-violet-${uid})`)
      g.append('text').attr('x', 370).attr('y', 172).attr('text-anchor','middle').attr('font-size',13)
        .attr('fill', VIOLET).text('new situation  +  reward')
      if (step >= 1) {
        g.append('path').attr('d', `M580,170 C580,235 180,235 180,172`).attr('fill','none')
          .attr('stroke', GREEN).attr('stroke-width',2.2).attr('stroke-dasharray','6 5')
          .attr('marker-end',`url(#q-green-${uid})`)
        g.append('text').attr('x', W/2).attr('y', 252).attr('text-anchor','middle')
          .attr('font-size',15).attr('fill', GREEN).text('the consequence changes what the agent does next')
      }
      cap.text('Reinforcement: no answer is given — only the consequence of acting')
      if (step >= 2) g.append('text').attr('x', W / 2).attr('y', 292).attr('text-anchor', 'middle')
        .attr('font-size', 15).attr('fill', NAVY)
        .text('The learner must act to find out whether the action was good.')
    } else {
      const rows = [
        ['Supervised', 'inputs + answers', 'the answer, every time', TEAL],
        ['Unsupervised', 'inputs only', 'nothing', VIOLET],
        ['Reinforcement', 'the situation it acts in', 'a reward, after acting', GREEN],
      ]
      g.append('text').attr('x', 250).attr('y', 78).attr('font-size', 13).attr('font-weight', 700)
        .attr('letter-spacing', 0.8).attr('fill', NAVY).text('WHAT IT IS GIVEN')
      g.append('text').attr('x', 520).attr('y', 78).attr('font-size', 13).attr('font-weight', 700)
        .attr('letter-spacing', 0.8).attr('fill', NAVY).text('WHAT FEEDBACK IT GETS')
      rows.forEach(([name, given, fb, colour], i) => {
        if (step < i + 1 && !isPrint) return
        const y = 104 + i * 62
        g.append('rect').attr('x', 30).attr('y', y).attr('width', W - 60).attr('height', 50)
          .attr('rx', 4).attr('fill', i % 2 ? '#f6f8fa' : '#ffffff').attr('stroke', RULE)
        g.append('rect').attr('x', 30).attr('y', y).attr('width', 4).attr('height', 50).attr('fill', colour)
        g.append('text').attr('x', 48).attr('y', y + 31).attr('font-size', 15).attr('font-weight', 600)
          .attr('fill', colour).text(name)
        g.append('text').attr('x', 250).attr('y', y + 31).attr('font-size', 14).attr('fill', INK).text(given)
        g.append('text').attr('x', 520).attr('y', y + 31).attr('font-size', 14).attr('fill', INK).text(fb)
      })
      cap.text('Same goal, different information')
    }
  }

  const last = kind === 'compare' ? 3 : kind === 'reinforcement' ? 2 : 1
  draw(isPrint ? last : steps)
  return { setStep: (i) => draw(i) }
}

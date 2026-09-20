// From "one user, one system" to an interaction network. Two humans, three
// agents, a retrieval service and a shared knowledge store; each step adds a
// family of edges until the picture is a network — and the caption states
// the consequence: the unit of study is the interaction network, not the
// query.
//
// params: none (layout and captions are fixed)
// steps: 4
//   1  H1 → A1 ↔ Retrieval — the classic query/results chain
//   2  agent ↔ agent — delegate · verify
//   3  agents ↔ shared knowledge — read · write nuggets; retrieval ↔ knowledge
//   4  human ↔ human, H2 ↔ A3 — the full network

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const INK = '#333333'
const INK_SOFT = '#444444'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const DIM = 0.22

const W = 880, H = 500

const NODES = [
  { id: 'H1', kind: 'human', x: 150, y: 110, r: 34, label: 'human' },
  { id: 'H2', kind: 'human', x: 730, y: 110, r: 34, label: 'human' },
  { id: 'A1', kind: 'agent', x: 230, y: 270, w: 64, h: 64, label: 'agent' },
  { id: 'A2', kind: 'agent', x: 440, y: 270, w: 64, h: 64, label: 'agent' },
  { id: 'A3', kind: 'agent', x: 650, y: 270, w: 64, h: 64, label: 'agent' },
  { id: 'R',  kind: 'retrieval', x: 250, y: 428, w: 280, h: 56, label: 'Retrieval service' },
  { id: 'K',  kind: 'knowledge', x: 650, y: 428, w: 220, h: 64, label: 'Shared knowledge' },
]

// at: step at which the edge appears; both: arrowheads at both ends;
// label placement is hand-tuned per edge (lx, ly, anchor)
const EDGES = [
  { from: 'H1', to: 'A1', at: 1, colour: NAVY, both: false },
  { from: 'A1', to: 'R',  at: 1, colour: NAVY, both: true, label: 'query / results', lx: 252, ly: 356, anchor: 'start' },
  { from: 'A1', to: 'A2', at: 2, colour: VIOLET, both: true, label: 'delegate · verify', lx: 335, ly: 258, anchor: 'middle' },
  { from: 'A2', to: 'A3', at: 2, colour: VIOLET, both: true, label: 'delegate · verify', lx: 545, ly: 258, anchor: 'middle' },
  { from: 'A1', to: 'K',  at: 3, colour: TEAL, both: true },
  { from: 'A2', to: 'K',  at: 3, colour: TEAL, both: true },
  { from: 'A3', to: 'K',  at: 3, colour: TEAL, both: true, label: 'read · write nuggets', lx: 664, ly: 352, anchor: 'start' },
  { from: 'R',  to: 'K',  at: 3, colour: TEAL, both: true, label: 'cached opinions', lx: 470, ly: 418, anchor: 'middle' },
  { from: 'H1', to: 'H2', at: 4, colour: INK_SOFT, both: true },
  { from: 'H2', to: 'A3', at: 4, colour: NAVY, both: true },
]

const CAPTIONS = [
  'humans, agents, a retrieval service, a shared knowledge store',
  'one user · one system · one query',
  'agents delegate to and verify each other',
  'agents read and write a shared knowledge store',
  'the unit of study is the interaction network',
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('font-family', 'Arial, Helvetica, sans-serif')
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

  // arrowheads — ids carry a random suffix so two instances on one page do not clash
  const uid = Math.random().toString(36).slice(2, 8)
  const defs = svg.append('defs')
  const markerId = {}
  for (const [name, colour] of [['navy', NAVY], ['teal', TEAL], ['violet', VIOLET], ['ink', INK_SOFT]]) {
    markerId[colour] = `arrow-${name}-${uid}`
    defs.append('marker').attr('id', markerId[colour]).attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', colour)
  }

  // point on the boundary of node n in the direction of (tx, ty), plus a small gap
  function anchor(n, tx, ty) {
    const dx = tx - n.x, dy = ty - n.y
    const len = Math.hypot(dx, dy) || 1
    let d
    if (n.kind === 'human') d = n.r + 4
    else {
      const hw = n.w / 2 + 4, hh = n.h / 2 + 4
      d = Math.min(hw / (Math.abs(dx) / len || 1e-9), hh / (Math.abs(dy) / len || 1e-9))
    }
    return [n.x + (dx / len) * d, n.y + (dy / len) * d]
  }
  function path(e) {
    const a = byId[e.from], b = byId[e.to]
    const [x1, y1] = anchor(a, b.x, b.y)
    const [x2, y2] = anchor(b, a.x, a.y)
    return `M${x1},${y1} L${x2},${y2}`
  }

  const edgeLayer = svg.append('g')
  const nodeLayer = svg.append('g')

  const edges = edgeLayer.selectAll('g').data(EDGES).join('g')
  edges.append('path')
    .attr('d', path).attr('fill', 'none').attr('stroke-width', 2.2)
    .attr('stroke', (e) => e.colour)
    .attr('marker-end', (e) => `url(#${markerId[e.colour]})`)
    .attr('marker-start', (e) => (e.both ? `url(#${markerId[e.colour]})` : null))
  edges.filter((e) => e.label).append('text')
    .attr('x', (e) => e.lx).attr('y', (e) => e.ly).attr('text-anchor', (e) => e.anchor)
    .attr('font-size', 13).attr('fill', (e) => e.colour)
    .text((e) => e.label)

  // ---- nodes ------------------------------------------------------------
  const nodes = nodeLayer.selectAll('g').data(NODES).join('g')
    .attr('transform', (n) => `translate(${n.x},${n.y})`)

  const humans = nodes.filter((n) => n.kind === 'human')
  humans.append('circle').attr('r', (n) => n.r)
    .attr('fill', SURFACE).attr('stroke', INK_SOFT).attr('stroke-width', 2)
  // person glyph: head + shoulders
  humans.append('circle').attr('cy', -9).attr('r', 8).attr('fill', INK_SOFT)
  humans.append('path').attr('d', 'M-16,18 A16,16 0 0 1 16,18 Z').attr('fill', INK_SOFT)
  humans.append('text').attr('y', (n) => n.r + 20).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('fill', INK).text((n) => n.label)

  const agents = nodes.filter((n) => n.kind === 'agent')
  agents.append('rect')
    .attr('x', (n) => -n.w / 2).attr('y', (n) => -n.h / 2).attr('width', (n) => n.w).attr('height', (n) => n.h)
    .attr('rx', 10).attr('fill', WHITE).attr('stroke', VIOLET).attr('stroke-width', 2)
  // chip glyph: a die with pins on both sides
  agents.append('rect').attr('x', -13).attr('y', -13).attr('width', 26).attr('height', 26).attr('rx', 3)
    .attr('fill', VIOLET)
  agents.append('rect').attr('x', -6).attr('y', -6).attr('width', 12).attr('height', 12).attr('rx', 1.5)
    .attr('fill', WHITE).attr('opacity', 0.85)
  agents.append('path')
    .attr('d', [-8, 0, 8].flatMap((o) => [`M-19,${o} L-13,${o}`, `M13,${o} L19,${o}`, `M${o},-19 L${o},-13`, `M${o},13 L${o},19`]).join(' '))
    .attr('stroke', VIOLET).attr('stroke-width', 2).attr('fill', 'none')
  agents.append('text').attr('y', (n) => n.h / 2 + 18).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('fill', INK).text((n) => n.label)

  const retrieval = nodes.filter((n) => n.kind === 'retrieval')
  retrieval.append('rect')
    .attr('x', (n) => -n.w / 2).attr('y', (n) => -n.h / 2).attr('width', (n) => n.w).attr('height', (n) => n.h)
    .attr('rx', 8).attr('fill', NAVY)
  retrieval.append('text').attr('y', 6).attr('text-anchor', 'middle')
    .attr('font-size', 17).attr('font-weight', 700).attr('fill', WHITE).text((n) => n.label)

  // shared knowledge: a cylinder
  const knowledge = nodes.filter((n) => n.kind === 'knowledge')
  const ry = 9
  knowledge.append('path')
    .attr('d', (n) => {
      const hw = n.w / 2, hh = n.h / 2
      return `M${-hw},${-hh + ry} A${hw},${ry} 0 0 0 ${hw},${-hh + ry} L${hw},${hh - ry} A${hw},${ry} 0 0 1 ${-hw},${hh - ry} Z`
    })
    .attr('fill', TEAL)
  knowledge.append('ellipse').attr('cy', (n) => -n.h / 2 + ry).attr('rx', (n) => n.w / 2).attr('ry', ry)
    .attr('fill', WHITE).attr('opacity', 0.35)
  knowledge.append('ellipse').attr('cy', (n) => -n.h / 2 + ry).attr('rx', (n) => n.w / 2).attr('ry', ry)
    .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 1.5)
  knowledge.append('text').attr('y', 12).attr('text-anchor', 'middle')
    .attr('font-size', 17).attr('font-weight', 700).attr('fill', WHITE).text((n) => n.label)

  const caption = svg.append('text').attr('x', W / 2).attr('y', 32)
    .attr('text-anchor', 'middle').attr('font-size', 20).attr('fill', NAVY)

  // ---- stepping ---------------------------------------------------------
  let last = null
  function render(step, animate = true) {
    const s = isPrint ? 4 : Math.max(0, Math.min(step, 4))
    const t = (sel) => sel.transition().duration(animate && last !== null && last !== s ? 320 : 0)
    // nodes without a visible edge recede — until step 0, where the whole cast is introduced
    const connected = new Set(EDGES.filter((e) => e.at <= s).flatMap((e) => [e.from, e.to]))
    t(edges).attr('opacity', (e) => (e.at <= s ? 1 : 0))
    t(nodes).attr('opacity', (n) => (s === 0 || connected.has(n.id) ? 1 : DIM))
    caption.text(CAPTIONS[s])
    last = s
  }

  render(steps, false)
  return { setStep: (i) => render(i) }
}

// YOARS — Your Open Agent Relay System — at a glance.
//
// Humans (web console, chat, a developer in the terminal) on the left, agents (coding and research agents,
// each owned by a human) on the right, and the relay in the middle: rooms in
// which every participant sends addressed messages. The relay routes under the
// room's policy and never decides. Underneath: identity, OURRS search over the
// Open Web Index, and a shared git workspace.
//
// stages: 0 humans, agents and the relay · 1 rooms and addressed messages ·
//         2 coordination records (goals, proposals and votes, resources,
//         receipts) · 3 identity and the services underneath
// params:
//   stage:  0–3, drawn when the slide has no data-steps
// steps: 3 — step i draws stage i (step 0 is the entry state).

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const SOFT = '#5a6472'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

let instances = 0

const HUMANS = [
  { y: 50, title: 'Researcher', sub: ['web console'] },
  { y: 140, title: 'Analyst', sub: ['chat app (Matrix)'] },
  { y: 230, title: 'Developer', sub: ['terminal + coding agents'] },
]
const AGENTS = [
  { y: 56, title: 'Claude Code', sub: 'owner h/mgrani' },
  { y: 126, title: 'Codex', sub: 'owner h/developer' },
  { y: 196, title: 'Pi agent', sub: 'owner h/analyst' },
  { y: 266, title: 'SOURCE harness', sub: 'owner h/analyst' },
]
// sender, recipient, communication kind
const LOG = [
  ['h/analyst', 'a/source-harness', 'request_execution'],
  ['a/source-harness', 'all', 'progress_update'],
  ['a/claude', 'a/source-harness', 'request_reply'],
]
const RECORDS = ['goal', 'proposal + vote', 'resource', 'receipts']

export async function mount(el, { d3, params, steps, isPrint }) {
  const arrowId = `yo-arrow-${++instances}`
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(3, params.stage)) : null
  const W = 1100, H = 440

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'YOARS: humans and agents meet in rooms on a relay that routes addressed messages under each room policy; identity, OURRS search and a shared git workspace underneath')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  svg.append('defs').append('marker').attr('id', arrowId).attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'start', family = null) =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor)
      .attr('font-family', family || 'Arial, Helvetica, sans-serif').text(t)
  const box = (g, x, y, w, h, stroke, fill = SURFACE, dash = null) =>
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 8)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.5).attr('stroke-dasharray', dash)
  const arrow = (g, d) => g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', SOFT)
    .attr('stroke-width', 1.6).attr('marker-end', `url(#${arrowId})`).attr('marker-start', `url(#${arrowId})`)

  // ── column headers ─────────────────────────────────────────────────────────
  const gHead = svg.append('g')
  ;[[140, 'HUMANS'], [550, 'YOARS RELAY'], [960, 'AGENTS']].forEach(([x, t]) =>
    text(gHead, x, 22, t, 12, SOFT, 700, 'middle').attr('letter-spacing', '0.08em'))

  // ── humans ─────────────────────────────────────────────────────────────────
  const gHumans = svg.append('g')
  HUMANS.forEach((h) => {
    box(gHumans, 20, h.y, 240, 72, NAVY)
    gHumans.append('circle').attr('cx', 52).attr('cy', h.y + 26).attr('r', 10).attr('fill', NAVY)
    gHumans.append('path').attr('d', `M 35 ${h.y + 58} q 17 -24 34 0 z`).attr('fill', NAVY)
    text(gHumans, 84, h.y + 31, h.title, 17, NAVY, 700)
    text(gHumans, 84, h.y + 52, h.sub[0], 13.5, SOFT)
    arrow(gHumans, `M 262 ${h.y + 36} L 318 ${h.y + 36}`)
  })

  // ── agents ─────────────────────────────────────────────────────────────────
  const gAgents = svg.append('g')
  AGENTS.forEach((a) => {
    box(gAgents, 840, a.y, 240, 58, TEAL)
    gAgents.append('rect').attr('x', 854).attr('y', a.y + 14).attr('width', 26).attr('height', 26).attr('rx', 5).attr('fill', TEAL)
    gAgents.append('circle').attr('cx', 862).attr('cy', a.y + 25).attr('r', 3).attr('fill', WHITE)
    gAgents.append('circle').attr('cx', 872).attr('cy', a.y + 25).attr('r', 3).attr('fill', WHITE)
    text(gAgents, 892, a.y + 26, a.title, 16, NAVY, 700)
    text(gAgents, 892, a.y + 45, a.sub, 12.5, SOFT, 400, 'start', MONO)
    arrow(gAgents, `M 838 ${a.y + 29} L 782 ${a.y + 29}`)
  })

  // ── the relay ──────────────────────────────────────────────────────────────
  const gRelay = svg.append('g')
  gRelay.append('rect').attr('x', 320).attr('y', 40).attr('width', 460).attr('height', 300).attr('rx', 12).attr('fill', NAVY)
  text(gRelay, 340, 66, 'YOARS relay', 18, WHITE, 700)
  text(gRelay, 760, 66, 'routes under the room’s policy · never decides', 12.5, '#c8d6e6', 400, 'end')

  // ── rooms and messages ─────────────────────────────────────────────────────
  const gRooms = svg.append('g')
  gRooms.append('rect').attr('x', 336).attr('y', 80).attr('width', 428).attr('height', 172).attr('rx', 8).attr('fill', WHITE)
  text(gRooms, 350, 100, 'room · c/owseu/source-analysis', 13, NAVY, 700, 'start', MONO)
  LOG.forEach(([from, to, kind], i) => {
    const y = 124 + i * 22
    const t = gRooms.append('text').attr('x', 350).attr('y', y).attr('font-size', 11.5).attr('font-family', MONO).attr('fill', SOFT)
    t.append('tspan').attr('fill', NAVY).attr('font-weight', 700).text(from)
    t.append('tspan').text(' → ')
    t.append('tspan').attr('fill', NAVY).attr('font-weight', 700).text(to)
    t.append('tspan').text(' · ')
    t.append('tspan').attr('fill', TEAL).text(kind)
  })
  gRooms.append('rect').attr('x', 336).attr('y', 262).attr('width', 428).attr('height', 64).attr('rx', 8).attr('fill', WHITE)
  text(gRooms, 350, 282, 'direct · h/mgrani ↔ a/mgrani/claude', 13, NAVY, 700, 'start', MONO)
  const t2 = gRooms.append('text').attr('x', 350).attr('y', 306).attr('font-size', 11.5).attr('font-family', MONO).attr('fill', SOFT)
  t2.append('tspan').attr('fill', NAVY).attr('font-weight', 700).text('h/mgrani')
  t2.append('tspan').text(' → ')
  t2.append('tspan').attr('fill', NAVY).attr('font-weight', 700).text('a/mgrani/claude')
  t2.append('tspan').text(' · ')
  t2.append('tspan').attr('fill', TEAL).text('request_execution')

  // ── coordination records ───────────────────────────────────────────────────
  const gRecords = svg.append('g')
  let rx = 350
  RECORDS.forEach((r) => {
    const w = 18 + r.length * 7.2
    gRecords.append('rect').attr('x', rx).attr('y', 206).attr('width', w).attr('height', 30).attr('rx', 15)
      .attr('fill', '#f1ecfd').attr('stroke', VIOLET).attr('stroke-width', 1.2)
    text(gRecords, rx + w / 2, 226, r, 12.5, VIOLET, 700, 'middle')
    rx += w + 8
  })

  // ── identity and services underneath ───────────────────────────────────────
  const gBase = svg.append('g')
  box(gBase, 20, 360, 240, 64, NAVY, WHITE, '5 4')
  text(gBase, 34, 384, 'Humans log in', 14, NAVY, 700)
  text(gBase, 34, 404, 'OpenWebSearch.eu account', 12.5, SOFT)
  box(gBase, 840, 360, 240, 64, TEAL, WHITE, '5 4')
  text(gBase, 854, 384, 'Agents are minted', 14, NAVY, 700)
  text(gBase, 854, 404, 'by their owner, own credential', 12.5, SOFT)
  box(gBase, 320, 360, 225, 64, TEAL, '#eef4f6')
  text(gBase, 334, 384, 'OURRS search · MCP', 14, NAVY, 700)
  text(gBase, 334, 404, 'the Open Web Index', 12.5, SOFT)
  box(gBase, 555, 360, 225, 64, TEAL, '#eef4f6')
  text(gBase, 569, 384, 'yoars-git', 14, NAVY, 700)
  text(gBase, 569, 404, 'a shared workspace per room', 12.5, SOFT)
  gBase.append('path').attr('d', 'M 432 340 L 432 358').attr('stroke', SOFT).attr('stroke-width', 1.6).attr('marker-end', `url(#${arrowId})`)
  gBase.append('path').attr('d', 'M 667 340 L 667 358').attr('stroke', SOFT).attr('stroke-width', 1.6).attr('marker-end', `url(#${arrowId})`)

  let last = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? 3 : Math.max(0, Math.min(3, step)))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    t(gRooms).attr('opacity', s >= 1 ? 1 : 0)
    t(gRecords).attr('opacity', s >= 2 ? 1 : 0)
    t(gBase).attr('opacity', s >= 3 ? 1 : 0)
    last = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

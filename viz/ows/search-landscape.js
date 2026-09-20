// The landscape of web-search back-ends on two axes: how transparent the
// resource is (can you inspect the corpus, configure the ranking, fix a
// snapshot, get bulk access, keep the logs?) and how complete it is (index
// size, freshness, languages).
//
// Three kinds of thing are plotted, because they are usually confused:
// commercial services (circles, navy), open web data (squares, teal) and
// open search services built on such data (circles, teal). Commercial
// services sit top-left — complete but closed; open data and the services
// on it sit bottom-right — transparent but partial. The upper-right corner
// is empty until the Open Web Index and OURRS arrive in the last step.
//
// params:
//   points: replaces the default list. Each point:
//     { name, x, y (0–1), group: "commercial" | "research",
//       kind: "data" | "service", retired?: true, tag?: string,
//       note?: string (second line), big?: true (the highlighted points),
//       dx?, dy?, anchor? (label placement relative to the point),
//       goal?: { y, label } (dashed upward arrow to y) }
//   owi: false drops the highlighted points altogether — for the slide that
//        shows the landscape before the Open Web Index is introduced.
// steps: 3
//   1  commercial services — "complete, closed"
//   2  open data and the open services on it — "transparent, partial",
//      and the empty upper-right corner is named
//   3  the Open Web Index and OURRS, and the goal arrow

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#16803c'
const INK = '#333333'
const INK_SOFT = '#444444'
const RULE = '#dde3ea'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'

const W = 880, H = 565
const L = 130, R = 30, T = 50, B = 100
const PW = W - L - R, PH = H - T - B

const DEFAULT_POINTS = [
  { name: 'Google', x: 0.05, y: 0.98, group: 'commercial', kind: 'service', dx: 14, dy: 5, anchor: 'start' },
  { name: 'Bing → Azure grounding', x: 0.05, y: 0.93, group: 'commercial', kind: 'service', retired: true, tag: 'retired 2025', dx: 14, dy: 5, anchor: 'start' },
  { name: 'Perplexity', x: 0.08, y: 0.81, group: 'commercial', kind: 'service', dx: 14, dy: 5, anchor: 'start' },
  { name: 'Brave', x: 0.12, y: 0.74, group: 'commercial', kind: 'service', dx: 14, dy: 5, anchor: 'start' },
  { name: 'Exa · Tavily', x: 0.1, y: 0.65, group: 'commercial', kind: 'service', dx: 14, dy: 5, anchor: 'start' },
  { name: 'Common Crawl', x: 0.87, y: 0.56, group: 'research', kind: 'data', note: 'bulk, no search', dx: -14, dy: 5, anchor: 'end' },
  { name: 'ChatNoir', x: 0.70, y: 0.33, group: 'research', kind: 'service', note: 'service on frozen data', dx: -14, dy: 5, anchor: 'end' },
  { name: 'ClueWeb22', x: 0.93, y: 0.24, group: 'research', kind: 'data', note: 'frozen 2022', dx: -14, dy: 5, anchor: 'end' },
  { name: 'MS MARCO Web Search', x: 0.84, y: 0.1, group: 'research', kind: 'data', dx: -14, dy: 5, anchor: 'end' },
  { name: 'Open Web Index', x: 0.95, y: 0.66, group: 'research', kind: 'data', big: true, dx: -16, dy: 5, anchor: 'end',
    goal: { y: 0.88, label: 'goal' } },
  { name: 'OURRS', x: 0.89, y: 0.44, group: 'research', kind: 'service', big: true, note: 'service on the index', dx: -14, dy: 5, anchor: 'end' },
]

// Named regions of the plane, in plane coordinates. A zone with `until`
// disappears again at that step: the empty upper-right corner is named only
// while it is still empty.
const ZONES = [
  { at: 1, x: 0.34, y: 0.70, text: 'complete, closed', colour: NAVY },
  { at: 2, x: 0.74, y: 0.02, text: 'transparent, partial', colour: TEAL },
  { at: 2, until: 3, x: 0.72, y: 0.93, text: 'transparent and complete', sub: 'nobody here', colour: INK_SOFT },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const points = (Array.isArray(params.points) ? params.points : DEFAULT_POINTS)
    .filter((p) => params.owi !== false || !p.big)
  const px = (x) => L + PW * x
  const py = (y) => T + PH * (1 - y)

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Web search back-ends by transparency and completeness')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  // ---- plane and axes ---------------------------------------------------
  svg.append('rect').attr('x', L).attr('y', T).attr('width', PW).attr('height', PH).attr('fill', SURFACE)
  svg.append('path')
    .attr('d', `M${px(0.5)},${T} L${px(0.5)},${T + PH} M${L},${py(0.5)} L${L + PW},${py(0.5)}`)
    .attr('stroke', RULE).attr('stroke-width', 1.5).attr('stroke-dasharray', '6 5')
  svg.append('path')
    .attr('d', `M${L},${T} L${L},${T + PH} L${L + PW},${T + PH}`)
    .attr('fill', 'none').attr('stroke', INK_SOFT).attr('stroke-width', 1.5)

  // x axis
  svg.append('text').attr('x', L).attr('y', T + PH + 20).attr('font-size', 13).attr('fill', INK_SOFT).text('closed')
  svg.append('text').attr('x', L + PW).attr('y', T + PH + 20).attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', INK_SOFT).text('open')
  svg.append('text').attr('x', L + PW / 2).attr('y', T + PH + 44).attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('font-weight', 700).attr('fill', NAVY).text('transparency')
  svg.append('text').attr('x', L + PW / 2).attr('y', T + PH + 63).attr('text-anchor', 'middle')
    .attr('font-size', 12).attr('fill', INK_SOFT)
    .text('corpus inspectable · ranking configurable · snapshot fixable · bulk access · logs')

  // y axis
  svg.append('text').attr('x', L - 8).attr('y', T + 12).attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', INK_SOFT).text('web-scale')
  svg.append('text').attr('x', L - 8).attr('y', T + PH - 4).attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', INK_SOFT).text('partial')
  svg.append('text').attr('transform', `translate(28,${T + PH / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('font-weight', 700).attr('fill', NAVY).text('completeness')
  svg.append('text').attr('transform', `translate(48,${T + PH / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .attr('font-size', 12).attr('fill', INK_SOFT).text('index size · freshness · languages')

  // ---- arrowhead for the goal arrow --------------------------------------
  const uid = Math.random().toString(36).slice(2, 8)
  const arrowId = `arrow-green-${uid}`
  svg.append('defs').append('marker').attr('id', arrowId).attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', GREEN)

  // ---- zone labels --------------------------------------------------------
  const zones = svg.append('g').selectAll('g').data(ZONES).join('g')
    .attr('transform', (z) => `translate(${px(z.x)},${py(z.y)})`)
  zones.append('text').attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('font-weight', 700).attr('fill', (z) => z.colour)
    .text((z) => z.text)
  zones.filter((z) => z.sub).append('text').attr('y', 19).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('font-style', 'italic').attr('fill', (z) => z.colour)
    .text((z) => z.sub)

  // ---- points -------------------------------------------------------------
  const colourOf = (p) => (p.big ? GREEN : p.group === 'research' ? TEAL : NAVY)
  const pts = svg.append('g').selectAll('g').data(points).join('g')
    .attr('transform', (p) => `translate(${px(p.x)},${py(p.y)})`)

  // goal arrow, drawn before the marker so the marker sits on top
  const goals = pts.filter((p) => p.goal)
  goals.append('line')
    .attr('x1', 0).attr('y1', -14).attr('x2', 0).attr('y2', (p) => py(p.goal.y) - py(p.y))
    .attr('stroke', GREEN).attr('stroke-width', 2).attr('stroke-dasharray', '6 5')
    .attr('marker-end', `url(#${arrowId})`)
  goals.append('text')
    .attr('x', 12).attr('y', (p) => py(p.goal.y) - py(p.y) + 5)
    .attr('font-size', 14).attr('font-weight', 700).attr('fill', GREEN).text((p) => p.goal.label ?? 'goal')

  // A service is a circle, a dataset is a square — the distinction the talk
  // keeps making: data to build with, services to query.
  pts.filter((p) => p.kind !== 'data').append('circle')
    .attr('r', (p) => (p.big ? 9 : 7))
    .attr('fill', (p) => (p.retired ? WHITE : colourOf(p)))
    .attr('stroke', colourOf).attr('stroke-width', 2)
    .attr('stroke-dasharray', (p) => (p.retired ? '3 2' : null))
  pts.filter((p) => p.kind === 'data').append('rect')
    .attr('x', (p) => (p.big ? -10 : -7)).attr('y', (p) => (p.big ? -10 : -7))
    .attr('width', (p) => (p.big ? 20 : 14)).attr('height', (p) => (p.big ? 20 : 14))
    .attr('rx', 2).attr('fill', colourOf)

  pts.append('text')
    .attr('x', (p) => p.dx ?? 14).attr('y', (p) => p.dy ?? 5).attr('text-anchor', (p) => p.anchor ?? 'start')
    .attr('font-size', (p) => (p.big ? 15 : 14)).attr('font-weight', (p) => (p.big ? 700 : 400))
    .attr('fill', (p) => (p.retired ? INK_SOFT : p.big ? GREEN : INK))
    .text((p) => p.name)
  pts.filter((p) => p.note).append('text')
    .attr('x', (p) => p.dx ?? 14).attr('y', (p) => (p.dy ?? 5) + 15).attr('text-anchor', (p) => p.anchor ?? 'start')
    .attr('font-size', 12).attr('fill', (p) => (p.big ? GREEN : INK_SOFT)).text((p) => p.note)
  // small tag on a second line (retired services)
  const tags = pts.filter((p) => p.tag).append('g')
    .attr('transform', (p) => `translate(${(p.dx ?? 14) - 1},${(p.dy ?? 5) + 8})`)
  tags.append('rect').attr('width', 84).attr('height', 16).attr('rx', 8)
    .attr('fill', WHITE).attr('stroke', INK_SOFT).attr('stroke-width', 1).attr('stroke-dasharray', '3 2')
  tags.append('text').attr('x', 42).attr('y', 12).attr('text-anchor', 'middle')
    .attr('font-size', 11).attr('fill', INK_SOFT).text((p) => p.tag)

  // ---- legend, bottom-right -----------------------------------------------
  const legend = svg.append('g').attr('transform', `translate(${W - R},${H - 14})`).attr('font-size', 13).attr('fill', INK_SOFT)
  const items = [
    { glyph: 'circle', colour: NAVY, text: 'commercial service', w: 132 },
    { glyph: 'square', colour: TEAL, text: 'open web data', w: 104 },
    { glyph: 'circle', colour: TEAL, text: 'open search service', w: 136 },
    { glyph: 'hollow', colour: NAVY, text: 'retired', w: 56 },
  ]
  let lx = 0
  for (const it of [...items].reverse()) {
    lx -= it.w
    const g = legend.append('g').attr('transform', `translate(${lx},0)`)
    if (it.glyph === 'square') g.append('rect').attr('x', -6).attr('y', -10).attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', it.colour)
    else g.append('circle').attr('cy', -4).attr('r', 6)
      .attr('fill', it.glyph === 'hollow' ? WHITE : it.colour).attr('stroke', it.colour).attr('stroke-width', 2)
      .attr('stroke-dasharray', it.glyph === 'hollow' ? '3 2' : null)
    g.append('text').attr('x', 12).text(it.text)
    lx -= 14
  }

  // ---- stepping -----------------------------------------------------------
  const stepOf = (p) => (p.big ? 3 : p.group === 'research' ? 2 : 1)
  let last = null
  function render(step, animate = true) {
    // no data-steps: the runtime calls setStep(0) once, so show everything
    const s = isPrint || !steps ? 3 : Math.max(0, Math.min(step, 3))
    const t = (sel) => sel.transition().duration(animate && last !== null && last !== s ? 320 : 0)
    t(pts).attr('opacity', (p) => (stepOf(p) <= s ? 1 : 0))
    t(zones).attr('opacity', (z) => (z.at <= s && s < (z.until ?? 99) ? 1 : 0))
    last = s
  }

  render(steps, false)
  return { setStep: (i) => render(i) }
}

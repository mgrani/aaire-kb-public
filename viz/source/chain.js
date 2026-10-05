// The SOURCE chain: from the open web to the analyst, and back.
//
// Sources (Open Web Index crawl, social-media crawlers, user contributions)
// feed actor and content analysis; web and social-media items (not user
// contributions) are then indexed into the OURRS search service, which the
// SOURCE campaign analysis reads; reverse image search is a separate service;
// the SOURCE harness puts an AI (LLM) agent,
// DISARM/DISRUPT and the Alliance4Europe community around it and reaches into
// social media directly; analysts work with it, and what they find flows back
// as contributions. The last stage shows which institutions work where, as logos.
//
// stages: 0 sources · 1 analysis, indexing, search and services · 2 the harness and
//         the platforms it reads · 3 analysts and the loop · 4 institutions and
//         the infrastructure underneath
// params:
//   stage:  0–4, drawn when the slide has no data-steps (a section slide)
//   focus:  a column key or a list of them ('sources', 'analysis', 'index',
//           'harness', 'people'); everything else is dimmed
// steps: 4 — step i draws stage i (step 0 is the entry state, stage 0).

const NAVY = '#164374'
const TEAL = '#0083A1'
const SOFT = '#5a6472'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'
const DIM = 0.18

// Logos live in the shared slide assets; resolve them against this module's
// own URL (<base>viz/source/chain.js) so the figure works under any site base.
const LOGOS = {
  passau: { file: 'logo-passau.png', ratio: 944 / 381 },
  kassel: { file: 'logo-kassel.svg', ratio: 199.194 / 39.927 },
  osf: { file: 'logo-osf.png', ratio: 353 / 100 },
  lrz: { file: 'logo-lrz.jpg', ratio: 1 },
  a4e: { file: 'logo-a4e.png', ratio: 1656 / 901 },
}
const logoUrl = (key) => new URL(`../../slides/_assets/source/${LOGOS[key].file}`, import.meta.url).href

let instances = 0

// x, width and the stage at which a column appears
const COLS = {
  sources: { x: 10, w: 195, stage: 0, label: 'sources' },
  analysis: { x: 240, w: 195, stage: 1, label: 'analysis' },
  index: { x: 470, w: 175, stage: 1, label: 'search & services' },
  harness: { x: 680, w: 235, stage: 2, label: 'SOURCE harness' },
  people: { x: 950, w: 140, stage: 2, label: 'platforms & people' },
}

const BOXES = [
  { col: 'sources', y: 40, h: 105, title: 'Open Web Index', sub: ['crawls the web, daily'], who: ['passau', 'lrz', 'osf'] },
  { col: 'sources', y: 165, h: 105, title: 'Social-media crawlers', sub: ['Bluesky · Telegram · …'], who: ['passau'] },
  { col: 'sources', y: 290, h: 105, title: 'User contributions', sub: ['tips, links, findings', 'not indexed'], who: ['osf'], id: 'contrib' },
  { col: 'analysis', y: 40, h: 105, title: 'Actor analysis', sub: ['who posts it, who copies', 'it, how it spreads'], who: ['passau', 'kassel'] },
  { col: 'analysis', y: 165, h: 105, title: 'Content analysis', sub: ['AI-generated? manipulative?', 'factually wrong?'], who: ['kassel'] },
  { col: 'analysis', y: 290, h: 105, title: 'Indexing', sub: ['web pages and social-media', 'posts, analysis attached'], who: ['passau'] },
  { col: 'index', y: 40, h: 105, title: ['Reverse image', 'search'], sub: ['a separate service'], dashed: true },
  { col: 'index', y: 165, h: 105, title: ['SOURCE campaign', 'analysis'], sub: ['across the index'], who: ['passau'] },
  { col: 'index', y: 290, h: 105, title: 'OURRS search', sub: ['web and social posts', 'ourrs.eu'], who: ['passau'] },
  { col: 'people', y: 40, h: 125, title: 'Social media', sub: ['Bluesky · Telegram', 'X · TikTok · …'], id: 'platforms' },
  { col: 'people', y: 190, h: 205, title: 'Analysts', sub: ['fact-checkers,', 'OSINT researchers,', 'journalists,', 'civil society'], id: 'analysts', stage: 3 },
]

const HARNESS_ITEMS = ['YOARS collaboration platform', 'AI / LLM agent', 'Automated social-media analysis', 'DISARM / DISRUPT framework', 'Alliance4Europe community']

export async function mount(el, { d3, params, steps, isPrint }) {
  const arrowId = `sc-arrow-${++instances}`
  const focus = params.focus == null ? null : new Set([].concat(params.focus))
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(4, params.stage)) : null
  const W = 1100, H = 505

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The SOURCE chain: web, social media and user contributions feed actor and content analysis; the web and social-media items are then indexed into the OURRS search service, which the campaign analysis reads; reverse image search is a separate service; the SOURCE harness with its AI agent and the YOARS collaboration platform reads social media and supports the analysts, whose findings flow back as contributions')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  svg.append('defs').append('marker').attr('id', arrowId).attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'start') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)

  const arrow = (g, d, both = false) => {
    const p = g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', SOFT)
      .attr('stroke-width', 1.6).attr('marker-end', `url(#${arrowId})`)
    if (both) p.attr('marker-start', `url(#${arrowId})`)
    return p
  }

  // a row of institution logos, left-aligned at (x, y), h high
  const logoRows = []
  const logos = (g, x, y, keys, h = 20) => {
    const row = g.append('g')
    let cx = x
    keys.forEach((k) => {
      const w = h * LOGOS[k].ratio
      row.append('image').attr('href', logoUrl(k)).attr('x', cx).attr('y', y)
        .attr('width', w).attr('height', h).attr('preserveAspectRatio', 'xMinYMid meet')
      cx += w + 8
    })
    logoRows.push(row)
    return row
  }

  // ── column headers ─────────────────────────────────────────────────────────
  const groups = {}
  for (const [key, c] of Object.entries(COLS)) {
    const g = svg.append('g')
    text(g, c.x + c.w / 2, 20, c.label.toUpperCase(), 12, SOFT, 700, 'middle').attr('letter-spacing', '0.08em')
    groups[key] = g
  }
  const gAnalysts = svg.append('g') // analysts join one stage after the platforms

  // ── boxes ──────────────────────────────────────────────────────────────────
  const anchors = {}
  for (const b of BOXES) {
    const c = COLS[b.col]
    const g = b.stage === 3 ? gAnalysts : groups[b.col]
    g.append('rect').attr('x', c.x).attr('y', b.y).attr('width', c.w).attr('height', b.h).attr('rx', 8)
      .attr('fill', SURFACE).attr('stroke', b.col === 'index' ? TEAL : NAVY).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', b.dashed ? '6 4' : null)
    const titles = [].concat(b.title)
    titles.forEach((t, i) => text(g, c.x + 12, b.y + 24 + i * 19, t, 16, NAVY, 700))
    const top = b.y + 45 + (titles.length - 1) * 19
    b.sub.forEach((s, i) => text(g, c.x + 12, top + i * 18, s, 13.5, SOFT))
    if (b.who) logos(g, c.x + 12, b.y + b.h - 28, b.who)
    if (b.id) anchors[b.id] = { x: c.x, y: b.y, w: c.w, h: b.h }
  }

  // ── the harness ────────────────────────────────────────────────────────────
  {
    const c = COLS.harness
    const g = groups.harness
    g.append('rect').attr('x', c.x).attr('y', 36).attr('width', c.w).attr('height', 359).attr('rx', 10).attr('fill', NAVY)
    text(g, c.x + 14, 62, 'SOURCE harness', 18, WHITE, 700)
    text(g, c.x + 14, 81, 'an AI research assistant for', 13, '#c8d6e6')
    text(g, c.x + 14, 97, 'analysts · research prototype', 13, '#c8d6e6')
    HARNESS_ITEMS.forEach((t, i) => {
      const y = 106 + i * 36
      g.append('rect').attr('x', c.x + 12).attr('y', y).attr('width', c.w - 24).attr('height', 30).attr('rx', 6).attr('fill', WHITE)
      text(g, c.x + 20, y + 20, t, 12.5, NAVY, 700)
    })
    const strip = g.append('g')
    strip.append('rect').attr('x', c.x + 12).attr('y', 352).attr('width', c.w - 24).attr('height', 30).attr('rx', 6).attr('fill', WHITE)
    logoRows.push(strip)
    logos(g, c.x + 20, 357, ['passau', 'kassel', 'a4e'])
  }

  // ── flow arrows ────────────────────────────────────────────────────────────
  const gA1 = svg.append('g') // sources → analysis → indexing (contributions are analysed, not indexed)
  arrow(gA1, 'M 205 92 C 222 92, 222 155, 238 155')
  arrow(gA1, 'M 205 217 C 222 217, 222 155, 238 155')
  arrow(gA1, 'M 205 342 C 222 342, 222 235, 238 235')
  arrow(gA1, 'M 337 270 L 337 288')
  arrow(gA1, 'M 435 342 L 468 342')
  arrow(gA1, 'M 557 290 L 557 272', true)
  const gA2 = svg.append('g') // search and services → harness, harness ↔ platforms
  ;[92, 217, 342].forEach((y) => arrow(gA2, `M 645 ${y} L 678 ${y}`))
  arrow(gA2, 'M 917 102 L 948 102', true)
  const gA3 = svg.append('g') // harness ↔ analysts
  arrow(gA3, 'M 917 292 L 948 292', true)

  // ── the loop back ──────────────────────────────────────────────────────────
  const gLoop = svg.append('g')
  const a = anchors.analysts, u = anchors.contrib
  arrow(gLoop, `M ${a.x + a.w / 2} ${a.y + a.h} L ${a.x + a.w / 2} 415 L ${u.x + u.w / 2} 415 L ${u.x + u.w / 2} ${u.y + u.h + 2}`)
    .attr('stroke', TEAL).attr('stroke-width', 2).attr('stroke-dasharray', '6 4')
  gLoop.append('rect').attr('x', 395).attr('y', 403).attr('width', 330).attr('height', 24).attr('fill', WHITE)
  text(gLoop, 560, 420, 'what analysts find flows back as contributions', 14, TEAL, 700, 'middle')

  // ── infrastructure underneath ──────────────────────────────────────────────
  const gInfra = svg.append('g')
  gInfra.append('rect').attr('x', 10).attr('y', 447).attr('width', W - 20).attr('height', 44).attr('rx', 8)
    .attr('fill', '#eef4f6').attr('stroke', TEAL).attr('stroke-width', 1.2)
  text(gInfra, 26, 474, 'Infrastructure: compute, cloud and storage for the SOURCE database, on the OpenWebSearch.eu federation', 14, NAVY, 600)
  logos(gInfra, W - 50, 453, ['lrz'], 32)

  let last = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? 4 : Math.max(0, Math.min(4, step)))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    const op = (key, stage) => (s < stage ? 0 : focus && !focus.has(key) ? DIM : 1)
    for (const [key, c] of Object.entries(COLS)) t(groups[key]).attr('opacity', op(key, c.stage))
    t(gAnalysts).attr('opacity', op('people', 3))
    t(gA1).attr('opacity', s >= 1 ? (focus ? DIM : 1) : 0)
    t(gA2).attr('opacity', s >= 2 ? (focus ? DIM : 1) : 0)
    t(gA3).attr('opacity', s >= 3 ? (focus ? DIM : 1) : 0)
    t(gLoop).attr('opacity', s >= 3 ? (focus ? DIM : 1) : 0)
    t(gInfra).attr('opacity', s >= 4 ? (focus ? DIM : 1) : 0)
    logoRows.forEach((r) => t(r).attr('opacity', s >= 4 ? 1 : 0))
    last = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

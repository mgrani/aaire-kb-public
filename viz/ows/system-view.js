// The spine of the CLEF talk: an agentic search system drawn as three
// columns, so that the modules of the system are also the parts of the talk.
//
//   retrieval      what the agent searches: an API over a ranking over an
//                  index over a corpus over the web
//   interaction    the user and the agent: question, answer, and the loop
//                  between them, which leaves usage data behind
//   collaboration  other agents, other people, and the knowledge they share
//
// The columns are revealed in the order the argument needs them:
//
//   stage 0  a user, an agent, and a search back-end nobody can look into
//   stage 1  the back-end is opened up into its four layers   (part II)
//   stage 2  the loop, the interaction, and the usage data    (part III)
//   stage 3  other agents, other people, shared knowledge     (part IV)
//
// params:
//   stage:   0–3, the stage drawn when the slide has no data-steps.
//   focus:   a column key, or a list of them: everything else is dimmed.
//   state:   { corpus, index, ranking, api: "open" | "closed" | "unknown" } —
//            pills on the back-end layers (stage >= 1).
//   caption: false hides the caption under the columns.
// steps: 4 — step i draws stage i.

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#16803c'
const RED = '#dc2626'
const VIOLET = '#7c3aed'
const AMBER = '#d97706'
const INK_SOFT = '#555555'
const RULE = '#dde3ea'
const SURFACE = '#f6f8fa'
const SURFACE2 = '#eef2f6'
const WHITE = '#ffffff'
const DIM = 0.22

const W = 960, H = 540

// x, width, and the stage at which the column and its header appear
const COLUMNS = [
  { key: 'collaboration', label: 'collaboration', x: 16, w: 252, stage: 3 },
  { key: 'interaction', label: 'interaction', x: 276, w: 280, stage: 0 },
  { key: 'retrieval', label: 'retrieval', x: 572, w: 372, stage: 0 },
]

const CAPTIONS = [
  'one question, one search, one answer',
  'the search back-end, opened up',
  'many hops, and the usage data they leave behind',
  'many agents, many people, shared knowledge',
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const focus = params.focus == null ? null : new Set([].concat(params.focus))
  const state = Object.assign({ corpus: 'unknown', index: 'unknown', ranking: 'unknown', api: 'unknown' }, params.state ?? {})
  const showCaption = params.caption !== false
  const fixedStage = Number.isFinite(params.stage) ? Math.max(0, Math.min(3, params.stage)) : null

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'An agentic search system in three columns: retrieval, interaction, collaboration')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  // ---- markers ------------------------------------------------------------
  const uid = Math.random().toString(36).slice(2, 8)
  const defs = svg.append('defs')
  const marker = (name, colour) => {
    defs.append('marker').attr('id', `${name}-${uid}`).attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', colour)
    return `url(#${name}-${uid})`
  }
  const AH = marker('ah-navy', NAVY)
  const AH_VIOLET = marker('ah-violet', VIOLET)
  const AH_AMBER = marker('ah-amber', AMBER)

  // Every drawn group registers the stage it appears at, the column it
  // belongs to (for focus dimming) and, where a later stage replaces it,
  // the stage at which it disappears again.
  const items = []
  const layer = (stage, column, until = 99) => {
    const g = svg.append('g')
    items.push({ g, stage, column, until })
    return g
  }

  // ---- helpers ------------------------------------------------------------
  const box = (g, x, y, w, h, { fill = WHITE, stroke = NAVY, sw = 2, rx = 10, dash = null } = {}) =>
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', rx)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', sw).attr('stroke-dasharray', dash)
  const label = (g, x, y, text, { size = 15, weight = 700, fill = NAVY, anchor = 'middle', italic = false } = {}) =>
    g.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor)
      .attr('font-size', size).attr('font-weight', weight).attr('fill', fill)
      .attr('font-style', italic ? 'italic' : null).text(text)
  const arrow = (g, d, { colour = NAVY, head = AH, sw = 2, dash = null } = {}) =>
    g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', colour).attr('stroke-width', sw)
      .attr('stroke-dasharray', dash).attr('marker-end', head)
  // `side: right` puts the caption beside the figure instead of under it,
  // for the user at the top of the interaction column, where the arrows to
  // the agent need the space below.
  const person = (g, cx, cy, text, { colour = NAVY, side = 'below' } = {}) => {
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 13).attr('fill', 'none').attr('stroke', colour).attr('stroke-width', 2.5)
    g.append('path').attr('d', `M${cx - 20},${cy + 34} C${cx - 16},${cy + 12} ${cx + 16},${cy + 12} ${cx + 20},${cy + 34}`)
      .attr('fill', 'none').attr('stroke', colour).attr('stroke-width', 2.5).attr('stroke-linecap', 'round')
    if (side === 'right') label(g, cx + 26, cy + 6, text, { size: 13, weight: 600, fill: colour, anchor: 'start' })
    else label(g, cx, cy + 52, text, { size: 13, weight: 600, fill: colour })
  }
  const pill = (g, x, y, value) => {
    const colour = value === 'open' ? GREEN : value === 'closed' ? RED : INK_SOFT
    const text = value === 'open' ? 'open' : value === 'closed' ? 'closed' : '?'
    const w = value === 'unknown' ? 22 : 54
    g.append('rect').attr('x', x - w).attr('y', y - 9).attr('width', w).attr('height', 18).attr('rx', 9)
      .attr('fill', WHITE).attr('stroke', colour).attr('stroke-width', 1.5)
    label(g, x - w / 2, y + 4, text, { size: 11, weight: 700, fill: colour })
  }

  // ---- column headers -----------------------------------------------------
  for (const c of COLUMNS) {
    const g = layer(c.stage, c.key)
    g.append('rect').attr('x', c.x).attr('y', 12).attr('width', c.w).attr('height', 30).attr('rx', 6).attr('fill', NAVY)
    label(g, c.x + c.w / 2, 33, c.label, { size: 15, fill: WHITE })
  }

  // ---- geometry -----------------------------------------------------------
  const AG = { x: 292, y: 152, w: 248, h: 140 }      // the agent, middle column
  const BE = { x: 588, y: 90, w: 340, h: 300 }       // the back-end, right column
  const WEB = { x: 588, y: 408, w: 340, h: 44 }
  const USER = { cx: 416, cy: 68 }

  // ---- interaction: the user and the agent (stage 0) ----------------------
  const si = layer(0, 'interaction')
  person(si, USER.cx, USER.cy, 'user', { side: 'right' })
  arrow(si, `M${USER.cx - 18},${USER.cy + 38} L${USER.cx - 18},${AG.y - 4}`)
  label(si, USER.cx - 24, USER.cy + 62, 'question', { size: 11, weight: 400, fill: INK_SOFT, anchor: 'end' })
  arrow(si, `M${USER.cx + 18},${AG.y - 4} L${USER.cx + 18},${USER.cy + 38}`)
  label(si, USER.cx + 24, USER.cy + 62, 'answer', { size: 11, weight: 400, fill: INK_SOFT, anchor: 'start' })

  box(si, AG.x, AG.y, AG.w, AG.h)
  label(si, AG.x + AG.w / 2, AG.y + 30, 'agent', { size: 17 })
  label(si, AG.x + AG.w / 2, AG.y + 52, 'language model + tools', { size: 12, weight: 400, fill: INK_SOFT })
  si.append('rect').attr('x', AG.x + 16).attr('y', AG.y + 74).attr('width', AG.w - 32).attr('height', 40).attr('rx', 6)
    .attr('fill', 'none').attr('stroke', GREEN).attr('stroke-width', 1.2).attr('stroke-dasharray', '4 3')
  label(si, AG.x + AG.w / 2, AG.y + 91, 'open weights, open data,', { size: 11, weight: 400, fill: GREEN, italic: true })
  label(si, AG.x + AG.w / 2, AG.y + 106, 'open code', { size: 11, weight: 400, fill: GREEN, italic: true })

  // ---- the query / results edge (stage 0) ---------------------------------
  const sq = layer(0, 'interaction')
  arrow(sq, `M${AG.x + AG.w + 2},${AG.y + 46} L${BE.x - 4},${AG.y + 46}`)
  label(sq, (AG.x + AG.w + BE.x) / 2, AG.y + 38, 'query', { size: 11, weight: 400, fill: INK_SOFT })
  arrow(sq, `M${BE.x - 4},${AG.y + 88} L${AG.x + AG.w + 2},${AG.y + 88}`)
  label(sq, (AG.x + AG.w + BE.x) / 2, AG.y + 106, 'results', { size: 11, weight: 400, fill: INK_SOFT })

  // ---- retrieval: closed box (stage 0 only) -------------------------------
  const s0 = layer(0, 'retrieval', 1)
  box(s0, BE.x, BE.y, BE.w, BE.h, { fill: SURFACE })
  label(s0, BE.x + BE.w / 2, BE.y + 42, 'web search back-end', { size: 17 })
  label(s0, BE.x + BE.w / 2, BE.y + 190, '?', { size: 96, weight: 700, fill: RULE })
  label(s0, BE.x + BE.w / 2, BE.y + 252, 'somebody else’s corpus,', { size: 12, weight: 400, fill: INK_SOFT, italic: true })
  label(s0, BE.x + BE.w / 2, BE.y + 270, 'index and ranking', { size: 12, weight: 400, fill: INK_SOFT, italic: true })

  // ---- retrieval: the four layers (stage 1) -------------------------------
  const s1 = layer(1, 'retrieval')
  box(s1, BE.x, BE.y, BE.w, BE.h, { fill: SURFACE })
  label(s1, BE.x + BE.w / 2, BE.y + 26, 'web search back-end', { size: 16 })
  const LAYERS = [
    { key: 'api', text: 'API', sub: 'what an agent can call' },
    { key: 'ranking', text: 'ranking', sub: 'which results come first' },
    { key: 'index', text: 'index', sub: 'what is retrievable, and how' },
    { key: 'corpus', text: 'corpus', sub: 'what was crawled, and when' },
  ]
  const LH = 52, LGAP = 10, LY0 = BE.y + 42
  LAYERS.forEach((b, i) => {
    const y = LY0 + i * (LH + LGAP)
    box(s1, BE.x + 16, y, BE.w - 32, LH, { fill: WHITE, stroke: TEAL, sw: 1.5, rx: 6 })
    label(s1, BE.x + 32, y + 22, b.text, { size: 14, anchor: 'start', fill: TEAL })
    label(s1, BE.x + 32, y + 39, b.sub, { size: 11, weight: 400, anchor: 'start', fill: INK_SOFT })
    pill(s1, BE.x + BE.w - 28, y + 26, state[b.key])
  })
  box(s1, WEB.x, WEB.y, WEB.w, WEB.h, { fill: SURFACE2, stroke: INK_SOFT, sw: 1.2, rx: 6 })
  label(s1, WEB.x + WEB.w / 2, WEB.y + 20, 'the web', { size: 14, fill: INK_SOFT })
  label(s1, WEB.x + WEB.w / 2, WEB.y + 36, 'dynamic · multilingual · duplicated · contradictory', { size: 11, weight: 400, fill: INK_SOFT })
  arrow(s1, `M${WEB.x + WEB.w / 2},${WEB.y - 2} L${WEB.x + WEB.w / 2},${BE.y + BE.h + 2}`, { sw: 1.5 })

  // ---- interaction: the loop (stage 2) ------------------------------------
  const s2 = layer(2, 'interaction')
  const LX = 564, LY = 332
  s2.append('circle').attr('cx', LX).attr('cy', LY).attr('r', 24).attr('fill', WHITE).attr('stroke', NAVY).attr('stroke-width', 2)
  s2.append('path').attr('d', `M ${LX} ${LY - 15} A 15 15 0 1 1 ${LX - 13} ${LY - 7}`).attr('fill', 'none')
    .attr('stroke', NAVY).attr('stroke-width', 2).attr('marker-end', AH)
  label(s2, LX, LY + 6, '× n', { size: 13 })
  // the verbs of the loop, and the human who stays in it
  label(s2, 424, LY + 5, 'search · read · reformulate · stop', { size: 12, weight: 400, fill: INK_SOFT })
  arrow(s2, `M${AG.x + 6},${AG.y - 6} C${AG.x - 12},${AG.y - 54} ${USER.cx - 76},${USER.cy + 48} ${USER.cx - 38},${USER.cy + 30}`,
    { colour: AMBER, head: AH_AMBER, dash: '5 4', sw: 1.5 })
  // anchored inside the interaction column, so the collaboration column
  // cannot paint over it at stage 3
  label(s2, AG.x + 14, USER.cy + 26, 'asks back', { size: 11, weight: 600, fill: AMBER, anchor: 'start' })

  // ---- interaction: the usage data it leaves behind (stage 2) -------------
  const s2t = layer(2, 'interaction')
  const TX = 416, TY = 392
  arrow(s2t, `M${LX - 18},${LY + 20} C${LX - 50},${LY + 58} ${TX + 112},${TY - 38} ${TX + 80},${TY - 12}`,
    { colour: VIOLET, head: AH_VIOLET, dash: '5 4', sw: 1.5 })
  s2t.append('path').attr('d', `M${TX - 84},${TY} V${TY + 30} A84,10 0 0 0 ${TX + 84},${TY + 30} V${TY}`)
    .attr('fill', WHITE).attr('stroke', VIOLET).attr('stroke-width', 2)
  s2t.append('ellipse').attr('cx', TX).attr('cy', TY).attr('rx', 84).attr('ry', 10)
    .attr('fill', WHITE).attr('stroke', VIOLET).attr('stroke-width', 2)
  label(s2t, TX, TY + 22, 'usage data', { size: 13, fill: VIOLET })
  label(s2t, TX, TY + 58, 'queries · results · steps · sessions', { size: 11, weight: 400, fill: INK_SOFT })

  // ---- collaboration: other agents, other people, shared knowledge --------
  const s3 = layer(3, 'collaboration')
  person(s3, 58, 92, 'other people', {})
  const A2 = { x: 112, y: 84, w: 144, h: 52 }
  const A3 = { x: 112, y: 168, w: 144, h: 52 }
  for (const [a, t, sub] of [[A2, 'agent 2', 'delegate · verify'], [A3, 'agent 3', 'critique · report']]) {
    box(s3, a.x, a.y, a.w, a.h, { sw: 1.5, rx: 8 })
    label(s3, a.x + a.w / 2, a.y + 24, t, { size: 14 })
    label(s3, a.x + a.w / 2, a.y + 41, sub, { size: 11, weight: 400, fill: INK_SOFT })
  }
  arrow(s3, `M82,110 L${A2.x - 4},${A2.y + 26}`, { sw: 1.5 })
  arrow(s3, `M184,${A2.y + A2.h + 2} L184,${A3.y - 4}`, { sw: 1.5 })
  arrow(s3, `M${A2.x + A2.w + 2},${A2.y + 26} L${AG.x - 4},${AG.y + 16}`, { sw: 1.5 })
  arrow(s3, `M${AG.x - 4},${AG.y + 60} L${A3.x + A3.w + 2},${A3.y + 26}`, { sw: 1.5 })

  const SK = { x: 30, y: 250, w: 226, h: 84 }
  box(s3, SK.x, SK.y, SK.w, SK.h, { fill: '#f5f3ff', stroke: VIOLET, sw: 2, rx: 10 })
  label(s3, SK.x + SK.w / 2, SK.y + 26, 'shared knowledge', { size: 14, fill: VIOLET })
  label(s3, SK.x + SK.w / 2, SK.y + 46, 'nuggets · opinions · provenance', { size: 11, weight: 400, fill: INK_SOFT })
  label(s3, SK.x + SK.w / 2, SK.y + 64, 'agents write, agents read', { size: 11, weight: 400, fill: INK_SOFT })
  arrow(s3, `M184,${A3.y + A3.h + 2} L184,${SK.y - 4}`, { colour: VIOLET, head: AH_VIOLET, sw: 1.5 })
  // and what they write becomes searchable again
  arrow(s3, `M${SK.x + SK.w / 2},${SK.y + SK.h + 2} L${SK.x + SK.w / 2},474 L${WEB.x + WEB.w / 2},474 L${WEB.x + WEB.w / 2},${WEB.y + WEB.h + 4}`,
    { colour: VIOLET, head: AH_VIOLET, dash: '5 4', sw: 1.5 })
  label(s3, 700, 468, 'agent-written content becomes searchable', { size: 11, weight: 400, fill: VIOLET, anchor: 'end' })

  // ---- caption ------------------------------------------------------------
  const caption = svg.append('text').attr('x', 16).attr('y', H - 8)
    .attr('font-size', 14).attr('fill', NAVY).attr('font-weight', 700)

  // ---- rendering ----------------------------------------------------------
  const opacityOf = (item) => (!focus || focus.has(item.column) ? 1 : DIM)
  let last = null
  function render(step, animate = true) {
    const s = isPrint && steps > 0 ? 3 : fixedStage !== null && !steps ? fixedStage : Math.max(0, Math.min(3, step))
    const t = (sel) => sel.transition().duration(animate && last !== null && last !== s ? 360 : 0)
    for (const item of items) {
      const visible = item.stage <= s && s < item.until
      t(item.g).attr('opacity', visible ? opacityOf(item) : 0)
      item.g.attr('pointer-events', visible ? null : 'none')
    }
    if (showCaption) caption.text(CAPTIONS[s])
    last = s
  }

  // The runtime asks for the complete final state at mount (print and PDF)
  // and then drives setStep itself on stepped slides.
  render(steps > 0 ? 3 : (fixedStage ?? 3), false)
  return { setStep: (i) => render(i) }
}

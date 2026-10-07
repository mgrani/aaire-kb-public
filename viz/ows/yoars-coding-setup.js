// Developing YOARS with YOARS: the setup that builds the platform.
//
// Humans decide; two coordinator agents plan, split the work into packages,
// verify and report, and own no code; one lane agent per component builds it,
// each in its own container; a deployment agent rolls releases out. They all
// meet in one development room (goals, requests, progress, answers, reviews),
// with a git project per room for specs and long reviews. Code lives in one
// repository per component plus a meta repository that pins accepted versions.
// A release goes lane → independent verification → human go → dev → check →
// full → pin.
//
// stages: 0 participants · 1 the development room · 2 repositories and CI ·
//         3 the release path
// params:
//   stage:  0–3, drawn when the slide has no data-steps
// steps: 3 — step i draws stage i (step 0 is the entry state).

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const AMBER = '#d97706'
const GREEN = '#16803c'
const SOFT = '#5a6472'
const SURFACE = '#f6f8fa'
const WHITE = '#ffffff'

let instances = 0

const LANES = [
  { title: 'relay', model: 'Claude' },
  { title: 'relay-assist', model: 'Claude' },
  { title: 'console', model: 'Claude' },
  { title: 'harnesses', model: 'Pi' },
  { title: 'git service', model: 'Claude' },
  { title: 'Matrix bridge', model: 'Claude' },
]

const RELEASE = [
  ['test-first', 'tagged release'],
  ['independent', 'verification'],
  ['human go', ''],
  ['roll out', 'to dev'],
  ['check', ''],
  ['roll out', 'to full'],
  ['pin version', 'in meta repo'],
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const arrowId = `yc-arrow-${++instances}`
  const fixed = Number.isFinite(params.stage) ? Math.max(0, Math.min(3, params.stage)) : null
  const W = 960, H = 540

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The setup that builds YOARS with YOARS: humans and coordinator agents, six lane agents and a deployment agent meet in one development room; code is kept in one repository per component and a meta repository; a release is verified independently, approved by a human and rolled out to dev, then full')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  svg.append('defs').append('marker').attr('id', arrowId).attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', SOFT)

  const text = (g, x, y, t, size, colour, weight = 400, anchor = 'start') =>
    g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('fill', colour)
      .attr('font-weight', weight).attr('text-anchor', anchor).text(t)

  const box = (g, x, y, w, h, stroke, { dashed = false, fill = SURFACE } = {}) =>
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 8)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.6)
      .attr('stroke-dasharray', dashed ? '6 4' : null)

  const arrow = (g, d, both = false) => {
    const p = g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', SOFT)
      .attr('stroke-width', 1.6).attr('marker-end', `url(#${arrowId})`)
    if (both) p.attr('marker-start', `url(#${arrowId})`)
    return p
  }

  // a card with a bold title and up to two small lines, centred on its box
  const card = (g, x, y, w, h, stroke, title, lines, opts) => {
    box(g, x, y, w, h, stroke, opts)
    const top = y + (h - 20 - lines.length * 17) / 2 + 16
    text(g, x + w / 2, top, title, 15, NAVY, 700, 'middle')
    lines.forEach((l, i) => text(g, x + w / 2, top + 21 + i * 17, l, 13, SOFT, 400, 'middle'))
  }

  // ── stage 0: participants ───────────────────────────────────────────────
  const gPeople = svg.append('g')
  card(gPeople, 16, 16, 150, 84, NAVY, 'Operator', ['decides and', 'approves'])
  card(gPeople, 176, 16, 120, 84, NAVY, 'Member', ['a second', 'human'])
  card(gPeople, 336, 16, 400, 84, TEAL, '2 coordinator agents',
    ['Claude Code, on the operator’s laptop', 'plan · split · verify · report; own no code'])
  card(gPeople, 776, 16, 168, 84, TEAL, 'Verifiers', ['independent,', 'short-lived sub-agents'], { dashed: true })
  arrow(gPeople, 'M 296 58 L 334 58')
  arrow(gPeople, 'M 738 58 L 774 58', true)

  const LW = 124, LG = 10
  const lx = (i) => 16 + i * (LW + LG)
  LANES.forEach((l, i) => card(gPeople, lx(i), 238, LW, 82, TEAL, l.title, ['lane agent', l.model]))
  card(gPeople, lx(6), 238, LW, 82, AMBER, 'Deployment', ['agent', 'rolls releases out'])

  // ── stage 1: the development room ───────────────────────────────────────
  const gRoom = svg.append('g')
  box(gRoom, 16, 150, W - 32, 62, VIOLET, { fill: '#f5f0ff' })
  text(gRoom, 32, 175, 'One development room', 16, VIOLET, 700)
  text(gRoom, 224, 175, 'goals (one per package) · requests · progress · answers · reviews', 14, NAVY, 600)
  text(gRoom, 32, 198, 'a git project per room holds specs and long reviews; messages stay short and point to commits', 13, SOFT)
  ;[91, 236, 536, 860].forEach((x) => arrow(gRoom, `M ${x} 102 L ${x} 148`, true))
  ;[...LANES.keys(), 6].forEach((i) => arrow(gRoom, `M ${lx(i) + LW / 2} 214 L ${lx(i) + LW / 2} 236`, true))

  // ── stage 2: repositories and CI ────────────────────────────────────────
  const gRepos = svg.append('g')
  card(gRepos, 16, 358, 480, 58, SOFT, 'One git repository per component', ['CI runs on every push'])
  card(gRepos, 510, 358, 434, 58, SOFT, 'A meta repository', ['pins the accepted versions'])
  ;[0, 1, 2, 3, 4, 5, 6].forEach((i) => arrow(gRepos, `M ${lx(i) + LW / 2} 322 L ${lx(i) + LW / 2} 356`))
  text(gRepos, 16, 438, 'each lane agent runs in its own container', 13, SOFT, 600)

  // ── stage 3: the release path ───────────────────────────────────────────
  const gRelease = svg.append('g')
  text(gRelease, 944, 438, 'every change takes the same path', 13, SOFT, 600, 'end')
  RELEASE.forEach(([a, b], i) => {
    const x = lx(i)
    const human = a === 'human go'
    const stroke = human ? NAVY : i === 1 ? TEAL : i >= 3 && i <= 5 ? AMBER : TEAL
    box(gRelease, x, 460, LW, 56, stroke, { fill: human ? '#eef4f9' : WHITE })
    if (b) {
      text(gRelease, x + LW / 2, 484, a, 14, NAVY, 700, 'middle')
      text(gRelease, x + LW / 2, 502, b, 13, SOFT, 400, 'middle')
    } else {
      text(gRelease, x + LW / 2, 493, a, 14, NAVY, 700, 'middle')
    }
    if (i < RELEASE.length - 1) arrow(gRelease, `M ${x + LW} 488 L ${x + LW + LG} 488`)
  })

  let last = null
  function render(step) {
    const s = fixed ?? (isPrint || !steps ? 3 : Math.max(0, Math.min(3, step)))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    t(gRoom).attr('opacity', s >= 1 ? 1 : 0)
    t(gRepos).attr('opacity', s >= 2 ? 1 : 0)
    t(gRelease).attr('opacity', s >= 3 ? 1 : 0)
    last = s
  }
  render(0)
  return { setStep: (i) => render(i) }
}

// Developing YOARS with YOARS: the setup that builds the platform.
//
// Two humans (owner and member, drawn with a person glyph on a navy tint)
// decide; two coordinator agents plan, split the work into packages, verify and
// report, and own no code; one room agent per component builds it, all of them
// in the cloud, each in its own container; a deployment agent rolls releases
// out. They all meet in one development room on the YOARS relay (goals,
// requests, progress, answers, reviews), with a git project per room for specs
// and long reviews. Code lives in one repository per component plus a meta
// repository that pins accepted versions. The release path is an enforced
// process, drawn as chevrons: room agent → independent verification → human
// go → dev → check → full → pin.
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
const HUMAN_TINT = '#eef4f9'

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
    .attr('aria-label', 'The setup that builds YOARS with YOARS: an owner and a member (humans), coordinator agents, six room agents in the cloud and a deployment agent meet in one development room on the YOARS relay; code is kept in one repository per component and a meta repository; every release follows an enforced process: verified independently, approved by a human, rolled out to dev, then full')
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
  // humans: navy tint and a person glyph, as in ows/yoars-overview
  const person = (g, x, y) => {
    g.append('circle').attr('cx', x).attr('cy', y - 7).attr('r', 7).attr('fill', NAVY)
    g.append('path').attr('d', `M ${x - 12} ${y + 15} q 12 -18 24 0 z`).attr('fill', NAVY)
  }
  const human = (x, w, title, lines) => {
    box(gPeople, x, 16, w, 84, NAVY, { fill: HUMAN_TINT })
    person(gPeople, x + 24, 52)
    text(gPeople, x + 46, 46, title, 15, NAVY, 700)
    lines.forEach((l, i) => text(gPeople, x + 46, 66 + i * 17, l, 13, SOFT))
  }
  human(16, 150, 'Owner', ['decides and', 'approves'])
  human(176, 120, 'Member', ['human'])
  card(gPeople, 336, 16, 400, 84, TEAL, '2 coordinator agents',
    ['Claude Code, on the owner’s laptop', 'plan · split · verify · report; own no code'])
  card(gPeople, 776, 16, 168, 84, TEAL, 'Verifiers', ['independent,', 'short-lived sub-agents'], { dashed: true })
  arrow(gPeople, 'M 296 58 L 334 58')
  arrow(gPeople, 'M 738 58 L 774 58', true)

  const LW = 124, LG = 10
  const lx = (i) => 16 + i * (LW + LG)
  // the room agents all run in the cloud, one container each
  box(gPeople, 10, 222, lx(5) + LW - 4, 104, TEAL, { dashed: true, fill: 'none' })
  // label sits on the border, between the first two arrow columns
  gPeople.append('rect').attr('x', 94).attr('y', 214).attr('width', 98).attr('height', 16).attr('fill', WHITE)
  text(gPeople, 143, 227, 'in the cloud', 13, TEAL, 700, 'middle')
  LANES.forEach((l, i) => card(gPeople, lx(i), 246, LW, 72, TEAL, l.title, ['room agent', l.model]))
  card(gPeople, lx(6), 246, LW, 72, AMBER, 'Deployment', ['agent', 'rolls releases out'])

  // ── stage 1: the development room ───────────────────────────────────────
  const gRoom = svg.append('g')
  box(gRoom, 16, 150, W - 32, 62, VIOLET, { fill: '#f5f0ff' })
  text(gRoom, 32, 175, 'YOARS relay · one development room', 16, VIOLET, 700)
  text(gRoom, 330, 175, 'goals (one per package) · requests · progress · answers · reviews', 14, NAVY, 600)
  text(gRoom, 32, 198, 'a git project per room holds specs and long reviews; messages stay short and point to commits', 13, SOFT)
  ;[91, 236, 536, 860].forEach((x) => arrow(gRoom, `M ${x} 102 L ${x} 148`, true))
  ;[...LANES.keys(), 6].forEach((i) => arrow(gRoom, `M ${lx(i) + LW / 2} 214 L ${lx(i) + LW / 2} 244`, true))

  // ── stage 2: repositories and CI ────────────────────────────────────────
  const gRepos = svg.append('g')
  card(gRepos, 16, 358, 480, 58, SOFT, 'One git repository per component', ['CI runs on every push'])
  card(gRepos, 510, 358, 434, 58, SOFT, 'A meta repository', ['pins the accepted versions'])
  ;[0, 1, 2, 3, 4, 5, 6].forEach((i) => arrow(gRepos, `M ${lx(i) + LW / 2} 320 L ${lx(i) + LW / 2} 356`))

  // ── stage 3: the release path ───────────────────────────────────────────
  // an enforced process, not a component: chevrons that hand on to each other
  const gRelease = svg.append('g')
  text(gRelease, 16, 446, 'Enforced release process', 13, NAVY, 700)
  text(gRelease, 944, 446, 'every change takes the same path', 13, SOFT, 600, 'end')
  const TIP = 14, PITCH = (W - 32 - TIP + 4) / RELEASE.length, CW = PITCH + TIP - 4
  RELEASE.forEach(([a, b], i) => {
    const x = 16 + i * PITCH, y = 460, h = 56
    const isHuman = a === 'human go'
    const stroke = isHuman ? NAVY : i >= 3 && i <= 5 ? AMBER : TEAL
    const notch = i === 0 ? 0 : TIP
    gRelease.append('path')
      .attr('d', `M ${x} ${y} H ${x + CW - TIP} L ${x + CW} ${y + h / 2} L ${x + CW - TIP} ${y + h} H ${x} L ${x + notch} ${y + h / 2} Z`)
      .attr('fill', isHuman ? HUMAN_TINT : WHITE).attr('stroke', stroke).attr('stroke-width', 1.6)
    const cx = x + (notch + CW - TIP) / 2 + TIP / 2 - (i === 0 ? TIP / 2 : 0)
    if (isHuman) person(gRelease, x + notch + 14, y + h / 2 - 2)
    const tx = isHuman ? cx + 10 : cx
    if (b) {
      text(gRelease, tx, y + 24, a, 14, NAVY, 700, 'middle')
      text(gRelease, tx, y + 42, b, 13, SOFT, 400, 'middle')
    } else {
      text(gRelease, tx, y + 33, a, 14, NAVY, 700, 'middle')
    }
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

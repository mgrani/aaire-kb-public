// Stepped Venn-diagram visualization: highlights the region of one set
// operation per step (see docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// params:
//   sets: 2 | 3            — number of event circles
//   ops:  string[]         — one op per step, from:
//         "A", "notA", "subset", "disjoint",
//         "AuB", "AnB", "AnBnC", "AuBuC"
//
// Contract (VizRuntime.astro): mount() renders the final state; the runtime
// then drives setStep(0..steps). Step 0 shows the plain diagram.

// Palette mirrors the aaire-lectures/OWS theme (navy/teal); swap for CSS
// custom properties once the _core token layer lands.
const NAVY = '#164374'
const TEAL = '#0083A1'
const FILL = 'rgba(0, 131, 161, 0.45)'

const CAPTIONS = {
  start: ['Sample space Ω with events', ''],
  A: ['The event A', 'A ⊆ Ω'],
  notA: ['The complement of A', 'A̅ := Ω ∖ A'],
  subset: ['B is a subset of A', 'B ⊂ A'],
  disjoint: ['A and B are disjoint', 'A ∩ B = ∅'],
  AuB: ['Union', 'A ∪ B'],
  AnB: ['Intersection', 'A ∩ B'],
  AnBnC: ['Intersection of three events', 'A ∩ B ∩ C'],
  AuBuC: ['Union of three events', 'A ∪ B ∪ C'],
}

// Circle layouts per op (default: standard 2- or 3-set overlap).
function layout(op, sets) {
  if (op === 'notA' || op === 'A') return [{ label: 'A', x: 0, y: 0, r: 95 }]
  if (op === 'subset')
    return [
      { label: 'A', x: 0, y: 0, r: 110 },
      { label: 'B', x: 30, y: 20, r: 45 },
    ]
  if (op === 'disjoint')
    return [
      { label: 'A', x: -120, y: 0, r: 80 },
      { label: 'B', x: 120, y: 0, r: 90 },
    ]
  // three sets: smaller circles so C clears the frame; labels sit outside
  // the circles (lx, ly), away from the pairwise lenses
  if (sets === 3)
    return [
      { label: 'A', x: -60, y: 40, r: 85, lx: -160, ly: 118 },
      { label: 'B', x: 60, y: 40, r: 85, lx: 160, ly: 118 },
      { label: 'C', x: 0, y: -60, r: 85, lx: 76, ly: -120 },
    ]
  return [
    { label: 'A', x: -65, y: 0, r: 100 },
    { label: 'B', x: 65, y: 0, r: 100 },
  ]
}

// Mask/clip ids must be unique across every instance on the page: url(#id)
// resolves to the first element with that id, possibly on a hidden slide.
let uid = 0

export async function mount(el, { d3, params, steps }) {
  const sets = params.sets ?? 2
  const ops = params.ops ?? []
  const W = 720
  const H = 460   // room for the formula above and the caption below Ω
  const RECT = { x: -320, y: -170, w: 640, h: 340 }

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `${-W / 2} ${-H / 2} ${W} ${H}`)
    .attr('role', 'img')

  function render(step) {
    svg.selectAll('*').remove()
    const op = step > 0 && step <= ops.length ? ops[step - 1] : null
    const circles = layout(op, sets)
    const [title, formula] = CAPTIONS[op ?? 'start'] ?? CAPTIONS.start

    // Sample space
    svg
      .append('rect')
      .attr('x', RECT.x)
      .attr('y', RECT.y)
      .attr('width', RECT.w)
      .attr('height', RECT.h)
      .attr('fill', 'none')
      .attr('stroke', NAVY)
      .attr('stroke-width', 2.5)
    svg
      .append('text')
      .attr('x', RECT.x + 14)
      .attr('y', RECT.y + 30)
      .attr('fill', NAVY)
      .attr('font-size', 24)
      .attr('font-style', 'italic')
      .text('Ω')

    // Highlight layer (under the outlines)
    const defs = svg.append('defs')
    const highlight = svg.append('g')
    const find = (label) => circles.find((c) => c.label === label)
    const circleAttrs = (sel, c) => sel.attr('cx', c.x).attr('cy', c.y).attr('r', c.r)

    if (op === 'A' || op === 'subset') {
      const target = op === 'subset' ? find('B') : find('A')
      circleAttrs(highlight.append('circle'), target).attr('fill', FILL)
    } else if (op === 'notA') {
      const mask = defs.append('mask').attr('id', `m${++uid}`)
      mask
        .append('rect')
        .attr('x', RECT.x)
        .attr('y', RECT.y)
        .attr('width', RECT.w)
        .attr('height', RECT.h)
        .attr('fill', 'white')
      circleAttrs(mask.append('circle'), find('A')).attr('fill', 'black')
      highlight
        .append('rect')
        .attr('x', RECT.x)
        .attr('y', RECT.y)
        .attr('width', RECT.w)
        .attr('height', RECT.h)
        .attr('fill', FILL)
        .attr('mask', `url(#m${uid})`)
    } else if (op === 'AuB' || op === 'AuBuC') {
      // only the named events (AuB with three circles must leave C out); one
      // translucent group so overlaps are not darker than the rest
      const members = circles.filter((c) => op.includes(c.label))
      const g = highlight.append('g').attr('opacity', 0.45)
      for (const c of members) circleAttrs(g.append('circle'), c).attr('fill', TEAL)
    } else if (op === 'AnB' || op === 'AnBnC') {
      // Intersection via nested clip paths: fill the last named circle,
      // clipped by each of the others in turn.
      const members = circles.filter((c) => op.includes(c.label))
      let group = highlight
      for (const c of members.slice(0, -1)) {
        const clip = defs.append('clipPath').attr('id', `c${++uid}`)
        circleAttrs(clip.append('circle'), c)
        group = group.append('g').attr('clip-path', `url(#c${uid})`)
      }
      circleAttrs(group.append('circle'), members[members.length - 1]).attr('fill', FILL)
    }

    // Event outlines + labels
    for (const c of circles) {
      circleAttrs(svg.append('circle'), c)
        .attr('fill', 'none')
        .attr('stroke', TEAL)
        .attr('stroke-width', 2.5)
      svg
        .append('text')
        // default: just outside the circle's upper-left arc, not on the outline
        .attr('x', c.lx ?? (c.label === 'B' && op === 'subset' ? c.x : c.x - c.r * 0.74))
        .attr('y', c.ly ?? (c.label === 'B' && op === 'subset' ? c.y + 8 : c.y - c.r * 0.74 - 4))
        .attr('fill', TEAL)
        .attr('font-size', 22)
        .attr('font-style', 'italic')
        .attr('text-anchor', 'middle')
        .text(c.label)
    }

    // Caption
    svg
      .append('text')
      .attr('x', 0)
      .attr('y', H / 2 - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', NAVY)
      .attr('font-size', 22)
      .text(title)
    svg
      .append('text')
      .attr('x', 0)
      .attr('y', -H / 2 + 34)
      .attr('text-anchor', 'middle')
      .attr('fill', TEAL)
      .attr('font-size', 24)
      .attr('font-weight', 'bold')
      .text(formula)
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

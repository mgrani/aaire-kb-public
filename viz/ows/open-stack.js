// The open web-search stack, one layer at a time. The same six bands recur
// through the OWS talk: the web at the bottom, the OpenWebSearch.EU
// infrastructure on it, the Open Web Index as its product, OURRS as the
// retrieval service, a social agentic layer, and humans and agents on top.
// A vertical channel on the right — "simulation & traces" — runs through
// layers 2–6 and is the talk's punchline: every layer above the web can be
// observed and replayed.
//
// params:
//   active:  layer index 1–6 (or an array of them) drawn as a navy band with
//            white text; the others are surface bands with a navy stroke.
//            Default none.
//   state:   { "<layer>": "open" | "closed" } — a small pill at the right of
//            the layer, green for open, red for closed. Default none.
//   reveal:  true (default) — step i reveals layer i, bottom first; layers not
//            yet revealed stay at low opacity so the geometry never shifts.
//            false — every layer is shown at step 0 (section slides).
//   channel: true — the simulation & traces channel is always shown;
//            false — never; unset — it appears at the final step.
//   compact: true — narrower bands, one line per layer, for a grid cell.
// steps: 6 (one per layer); 0 with reveal:false on section slides.

const NAVY = '#164374'
const TEAL = '#0083A1'
const GREEN = '#16803c'
const RED = '#dc2626'
const INK_SOFT = '#444444'
const RULE = '#dde3ea'
const SURFACE = '#f6f8fa'
const SURFACE2 = '#eef2f6'
const WHITE = '#ffffff'
const DIM = 0.12

const LAYERS = [
  { i: 1, label: 'The Web', sub: 'dynamic · multilingual · duplicated · contradictory' },
  { i: 2, label: 'OpenWebSearch.EU', sub: 'crawl · processing · indexing · federated infrastructure' },
  { i: 3, label: 'Open Web Index', sub: 'downloadable data and index products' },
  { i: 4, label: 'OURRS', sub: 'operational, configurable web retrieval' },
  { i: 5, label: 'Social agentic layer', sub: 'interaction · delegation · verification · communication' },
  { i: 6, label: 'Humans and agents', sub: '' },
]

const W = 880
const PAD = 20

export async function mount(el, { d3, params, steps, isPrint }) {
  const compact = params.compact === true
  const reveal = params.reveal !== false && steps > 0
  const activeSet = new Set([].concat(params.active ?? []).map(Number))
  const state = params.state ?? {}
  // The channel needs room on the right only if it can ever be shown.
  const channelMode = params.channel === true ? 'always' : params.channel === false ? 'never' : 'final'
  const hasChannel = channelMode === 'always' || (channelMode === 'final' && steps > 0)

  const BH = compact ? 44 : 66
  const GAP = compact ? 8 : 12
  const CHW = hasChannel ? 96 : 0
  const bandW = W - 2 * PAD - (hasChannel ? CHW + 16 : 0)
  const H = 2 * PAD + LAYERS.length * BH + (LAYERS.length - 1) * GAP
  const yOf = (i) => PAD + (LAYERS.length - i) * (BH + GAP)   // layer 1 at the bottom

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  // ---- layers ---------------------------------------------------------
  const layers = svg.append('g').selectAll('g').data(LAYERS).join('g')
    .attr('transform', (d) => `translate(${PAD},${yOf(d.i)})`)

  layers.append('rect')
    .attr('width', bandW).attr('height', BH).attr('rx', 6)
    .attr('fill', (d) => (activeSet.has(d.i) ? NAVY : SURFACE))
    .attr('stroke', NAVY).attr('stroke-width', (d) => (activeSet.has(d.i) ? 0 : 1.5))

  // layer number, a quiet index at the far left
  layers.append('text')
    .attr('x', 16).attr('y', compact ? BH / 2 + 5 : 26)
    .attr('font-size', compact ? 13 : 14).attr('font-weight', 700)
    .attr('fill', (d) => (activeSet.has(d.i) ? WHITE : TEAL))
    .attr('opacity', 0.9)
    .text((d) => d.i)

  layers.append('text')
    .attr('x', 42).attr('y', compact ? BH / 2 + 6 : 27)
    .attr('font-size', compact ? 16 : 19).attr('font-weight', 700)
    .attr('fill', (d) => (activeSet.has(d.i) ? WHITE : NAVY))
    .text((d) => d.label)

  // sublabel: second line normally, same line (after the label) when compact
  layers.append('text')
    .attr('x', (d) => (compact ? 42 + d.label.length * 9.6 + 14 : 42))
    .attr('y', compact ? BH / 2 + 6 : 50)
    .attr('font-size', compact ? 13 : 14)
    .attr('fill', (d) => (activeSet.has(d.i) ? WHITE : INK_SOFT))
    .attr('opacity', (d) => (activeSet.has(d.i) ? 0.85 : 1))
    .text((d) => d.sub)

  // open / closed pill at the right edge of the band
  const pillW = 64, pillH = 22
  const pills = layers.filter((d) => state[d.i] === 'open' || state[d.i] === 'closed')
    .append('g').attr('transform', `translate(${bandW - pillW - 14},${(BH - pillH) / 2})`)
  pills.append('rect')
    .attr('width', pillW).attr('height', pillH).attr('rx', pillH / 2)
    .attr('fill', (d) => (state[d.i] === 'open' ? GREEN : RED))
  pills.append('text')
    .attr('x', pillW / 2).attr('y', pillH / 2 + 5).attr('text-anchor', 'middle')
    .attr('font-size', 13).attr('font-weight', 700).attr('fill', WHITE)
    .text((d) => state[d.i])

  // ---- simulation & traces channel, layers 2–6 -------------------------
  let channel = null
  if (hasChannel) {
    const cx = PAD + bandW + 16
    const top = yOf(6), bottom = yOf(2) + BH
    channel = svg.append('g')
    channel.append('rect')
      .attr('x', cx).attr('y', top).attr('width', CHW).attr('height', bottom - top).attr('rx', 6)
      .attr('fill', SURFACE2).attr('stroke', TEAL).attr('stroke-width', 1.5).attr('stroke-dasharray', '6 4')
    // a double-headed arrow along the channel: traces flow up, simulation replays down
    const ax = cx + CHW - 22
    channel.append('line')
      .attr('x1', ax).attr('y1', top + 22).attr('x2', ax).attr('y2', bottom - 22)
      .attr('stroke', TEAL).attr('stroke-width', 2)
    channel.append('path')
      .attr('d', `M${ax - 5},${top + 26} L${ax},${top + 16} L${ax + 5},${top + 26} M${ax - 5},${bottom - 26} L${ax},${bottom - 16} L${ax + 5},${bottom - 26}`)
      .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 2)
    channel.append('text')
      .attr('transform', `translate(${cx + 34},${(top + bottom) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 14 : 16).attr('font-weight', 700)
      .attr('fill', TEAL).text('simulation & traces')
  }

  // ---- stepping ---------------------------------------------------------
  let last = null
  function render(step, animate = true) {
    const s = isPrint ? steps : Math.max(0, Math.min(step, LAYERS.length))
    const revealed = reveal ? s : LAYERS.length
    const showChannel = channelMode === 'always' || (channelMode === 'final' && steps > 0 && s >= steps)
    const t = (sel) => sel.transition().duration(animate && last !== null && last !== s ? 320 : 0)
    t(layers).attr('opacity', (d) => (d.i <= revealed ? 1 : DIM))
    if (channel) t(channel).attr('opacity', showChannel ? 1 : 0)
    last = s
  }

  render(steps, false)
  return { setStep: (i) => render(i) }
}

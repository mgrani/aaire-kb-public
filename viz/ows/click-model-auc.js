// What agent traffic costs one of our instruments. A position-based click
// model keeps most of its (already modest) predictive power when it is trained
// on human behaviour, and loses most of the margin it had over chance once half
// its training data comes from agents the platform could not validate.
//
// The scale starts at 0.5 on purpose: for AUC, 0.5 is a coin flip, so the
// distance above it is the only part that means anything.
//
// steps: 2 — 1 the human-trained model, 2 the degraded one.

const NAVY = '#164374'
const RED = '#dc2626'
const INK = '#333333'
const SOFT = '#5a6472'
const RULE = '#d3d9e0'

const DEFAULTS = { good: 0.64, bad: 0.586, lo: 0.5, hi: 0.68 }

export async function mount(el, { d3, params, steps, isPrint }) {
  const cfg = Object.assign({}, DEFAULTS, params)
  const W = 470, H = 200
  const M = { left: 34, right: 22, top: 54, bottom: 58 }

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Click-model AUC falls from 0.64 to 0.586, where 0.5 is a coin flip')
    .attr('font-family', 'Arial, Helvetica, sans-serif')

  const x = d3.scaleLinear([cfg.lo, cfg.hi], [M.left, W - M.right])
  const yBar = H - M.bottom

  // the axis, and the coin-flip end of it
  svg.append('line').attr('x1', x(cfg.lo)).attr('x2', x(cfg.hi)).attr('y1', yBar).attr('y2', yBar)
    .attr('stroke', RULE).attr('stroke-width', 3)
  svg.append('line').attr('x1', x(cfg.lo)).attr('x2', x(cfg.lo)).attr('y1', yBar - 26).attr('y2', yBar + 8)
    .attr('stroke', SOFT).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3')
  svg.append('text').attr('x', x(cfg.lo)).attr('y', yBar + 24).attr('text-anchor', 'start')
    .attr('font-size', 12).attr('fill', SOFT).text('0.50 — a coin flip')

  d3.range(0.55, cfg.hi + 0.001, 0.05).forEach((v) => {
    svg.append('text').attr('x', x(v)).attr('y', yBar + 24).attr('text-anchor', 'middle')
      .attr('font-size', 11).attr('fill', '#9aa4b0').text(v.toFixed(2))
  })

  svg.append('text').attr('x', M.left).attr('y', 22).attr('font-size', 13).attr('font-weight', 700)
    .attr('fill', INK).text('Click-model AUC')
  svg.append('text').attr('x', W - M.right).attr('y', 22).attr('text-anchor', 'end')
    .attr('font-size', 11.5).attr('fill', SOFT).text('most of the margin over chance, gone')

  const marker = (g, v, colour, label, dy) => {
    g.append('line').attr('x1', x(cfg.lo)).attr('x2', x(v)).attr('y1', yBar).attr('y2', yBar)
      .attr('stroke', colour).attr('stroke-width', 5).attr('stroke-linecap', 'round')
    g.append('circle').attr('cx', x(v)).attr('cy', yBar).attr('r', 7).attr('fill', colour)
    g.append('text').attr('x', x(v)).attr('y', yBar + dy).attr('text-anchor', 'middle')
      .attr('font-size', 15).attr('font-weight', 700).attr('fill', colour).text(v.toFixed(3))
    g.append('text').attr('x', x(v)).attr('y', yBar + dy - 17).attr('text-anchor', 'middle')
      .attr('font-size', 11.5).attr('fill', SOFT).text(label)
  }

  const gGood = svg.append('g')
  marker(gGood, cfg.good, NAVY, 'trained on people', -24)

  const gBad = svg.append('g')
  marker(gBad, cfg.bad, RED, 'half the data from agents', -60)

  let last = null
  function render(step) {
    const s = isPrint || !steps ? 2 : Math.max(1, Math.min(2, step + 1))
    const t = (sel) => sel.transition().duration(last === null ? 0 : 300)
    t(gBad).attr('opacity', s >= 2 ? 1 : 0)
    last = s
  }
  render(1)
  return { setStep: (i) => render(i) }
}

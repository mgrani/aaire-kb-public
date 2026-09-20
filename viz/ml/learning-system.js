// The machine-learning system, assembled one piece at a time and then reused.
//
// One visual vocabulary serves the whole module: the real-world band on top
// (object o, true process γ, outcome y) and the model-world band below
// (representation α, features x, model h_Θ, prediction ŷ, loss, optimiser,
// parameters Θ). Course notation follows the source: α is the model-formation
// function, NOT the parameters — the parameters are Θ.
//
// params:
//   mode: "build"       — steps add real world → data → model → loss → training loop
//         "inference"   — the trained model on unseen input; training parts recede
//         "uncertainty" — the finished figure, with one source of uncertainty
//                         highlighted per step
//   stage: starting stage for "build" (default 0)

const NAVY = '#164374'
const TEAL = '#0083A1'
const VIOLET = '#7c3aed'
const RED = '#b5322e'
const GREEN = '#16803c'
const RULE = '#c9d3de'
const INK = '#3a3a3a'
const DIM = 0.16

const W = 980, H = 500

// stage at which each element appears
const NODES = [
  { id: 'o',     x:  95, y: 100, w: 150, h: 54, label: 'object / situation', sub: 'o', zone: 'real', at: 0 },
  { id: 'y',     x: 590, y: 100, w: 150, h: 54, label: 'true outcome',       sub: 'y', zone: 'real', at: 0 },
  { id: 'x',     x:  95, y: 265, w: 150, h: 54, label: 'features',           sub: 'x = α(o)', zone: 'model', at: 1 },
  { id: 'model', x: 340, y: 265, w: 160, h: 54, label: 'model',              sub: 'h_Θ', zone: 'model', at: 2 },
  { id: 'yhat',  x: 590, y: 265, w: 150, h: 54, label: 'prediction',         sub: 'ŷ', zone: 'model', at: 2 },
  { id: 'loss',  x: 800, y: 182, w: 140, h: 48, label: 'loss', sub: 'L(ŷ, y)', zone: 'model', at: 3 },
  { id: 'opt',   x: 800, y: 350, w: 140, h: 48, label: 'optimiser', sub: '', zone: 'model', at: 4 },
  { id: 'theta', x: 340, y: 388, w: 160, h: 44, label: 'parameters', sub: 'Θ', zone: 'model', at: 4 },
]

const EDGES = [
  { from: 'o',    to: 'y',     at: 0, label: 'γ  true process', dash: false, curve: 0 },
  { from: 'o',    to: 'x',     at: 1, label: 'α  measure', dash: false, curve: 0 },
  { from: 'x',    to: 'model', at: 2, label: '', dash: false, curve: 0 },
  { from: 'model',to: 'yhat',  at: 2, label: '', dash: false, curve: 0 },
  { from: 'yhat', to: 'loss',  at: 3, label: '', dash: false, curve: 0 },
  // no label: the loss box already reads L(ŷ, y), and the gap here is too
  // narrow for text without clipping against the boxes on either side
  { from: 'y',    to: 'loss',  at: 3, label: '', dash: true, curve: 0 },
  { from: 'loss', to: 'opt',   at: 4, label: '', dash: false, curve: 0 },
  { from: 'opt',  to: 'theta', at: 4, label: 'update', dash: false, curve: 1 },
  { from: 'theta',to: 'model', at: 4, label: '', dash: true, curve: 0 },
]

const BUILD_CAPTIONS = [
  'A process in the world turns situations into outcomes — we cannot see it directly',
  'We measure: the representation α turns an object into features',
  'The model maps features to a prediction',
  'The loss compares the prediction with the outcome we wanted',
  'The optimiser changes the parameters — and the training loop closes',
]

const UNCERTAINTY = [
  { ids: ['o', 'y'],        title: 'In the world',      text: 'the outcome genuinely varies — identical situations, different results' },
  { ids: ['x'],             title: 'In the data',       text: 'noisy measurement, missing values, a sample that is not representative' },
  { ids: ['model'],         title: 'In the model',      text: 'the family may not contain the truth; assumptions may not hold' },
  { ids: ['theta'],         title: 'In the parameters', text: 'too few examples to pin them down — this is what more data reduces' },
  { ids: ['loss'],          title: 'In the objective',  text: 'the loss is a design choice — it may not capture what we actually care about' },
  { ids: ['opt'],           title: 'In the optimisation', text: 'stochastic steps, initialisation, an approximate solution' },
  { ids: ['yhat'],          title: 'In the evaluation', text: 'a finite test set, and a future that may not resemble the past' },
]

export async function mount(el, { d3, params, steps, isPrint }) {
  const mode = params.mode ?? 'build'
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

  // arrowheads
  const defs = svg.append('defs')
  for (const [id, colour] of [['a-navy', NAVY], ['a-teal', TEAL], ['a-dim', RULE], ['a-violet', VIOLET]]) {
    defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', colour)
  }

  // zone bands
  const zones = svg.append('g')
  const realZone = zones.append('rect').attr('x', 20).attr('y', 62).attr('width', W - 40).attr('height', 112)
    .attr('rx', 6).attr('fill', '#eef2f6')
  const modelZone = zones.append('rect').attr('x', 20).attr('y', 214).attr('width', W - 40).attr('height', 232)
    .attr('rx', 6).attr('fill', '#f6f8fa')
  const realLabel = zones.append('text').attr('x', 34).attr('y', 82).attr('font-size', 13)
    .attr('font-weight', 700).attr('letter-spacing', 1.2).attr('fill', NAVY).text('REAL WORLD')
  const modelLabel = zones.append('text').attr('x', 34).attr('y', 234).attr('font-size', 13)
    .attr('font-weight', 700).attr('letter-spacing', 1.2).attr('fill', TEAL).text('MODEL WORLD')

  const edgeLayer = svg.append('g')
  const nodeLayer = svg.append('g')

  // edge geometry: leave from the nearest side of the source box
  function path(e) {
    const a = byId[e.from], b = byId[e.to]
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2
    const bx = b.x + b.w / 2, by = b.y + b.h / 2
    const horiz = Math.abs(bx - ax) > Math.abs(by - ay)
    let x1, y1, x2, y2
    if (horiz) {
      x1 = ax + (bx > ax ? a.w / 2 : -a.w / 2); y1 = ay
      x2 = bx + (bx > ax ? -b.w / 2 : b.w / 2); y2 = by
    } else {
      x1 = ax; y1 = ay + (by > ay ? a.h / 2 : -a.h / 2)
      x2 = bx; y2 = by + (by > ay ? -b.h / 2 : b.h / 2)
    }
    if (e.curve) {
      const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 46
      return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`
    }
    if (!horiz && Math.abs(x2 - x1) > 2) return `M${x1},${y1} L${x1},${(y1 + y2) / 2} L${x2},${(y1 + y2) / 2} L${x2},${y2}`
    return `M${x1},${y1} L${x2},${y2}`
  }

  const edges = edgeLayer.selectAll('g').data(EDGES).join('g')
  edges.append('path')
    .attr('d', path).attr('fill', 'none').attr('stroke-width', 2.2)
    .attr('stroke-dasharray', (e) => (e.dash ? '6 5' : null))
  edges.append('text')
    .attr('font-size', 13).attr('text-anchor', 'middle').attr('fill', NAVY)
    .each(function (e) {
      const a = byId[e.from], b = byId[e.to]
      const mx = (a.x + a.w / 2 + b.x + b.w / 2) / 2
      const my = (a.y + a.h / 2 + b.y + b.h / 2) / 2
      d3.select(this).attr('x', mx).attr('y', my - 9).text(e.label)
    })

  const nodes = nodeLayer.selectAll('g').data(NODES).join('g')
    .attr('transform', (n) => `translate(${n.x},${n.y})`)
  nodes.append('rect')
    .attr('width', (n) => n.w).attr('height', (n) => n.h).attr('rx', 5)
    .attr('fill', '#ffffff').attr('stroke-width', 2)
  nodes.append('text')
    .attr('x', (n) => n.w / 2).attr('y', 22).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('fill', INK).text((n) => n.label)
  // "h_Θ" must render as h with a subscript, not with a literal underscore
  nodes.append('text')
    .attr('x', (n) => n.w / 2).attr('y', 43).attr('text-anchor', 'middle')
    .attr('font-size', 16).attr('font-weight', 700).attr('font-style', 'italic')
    .attr('fill', (n) => (n.zone === 'real' ? NAVY : TEAL))
    .each(function (n) {
      const t = d3.select(this)
      const [base, sub] = n.sub.split('_')
      t.append('tspan').text(base)
      if (sub) t.append('tspan').attr('font-size', 12).attr('dy', 4).text(sub)
    })

  const caption = svg.append('text').attr('x', W / 2).attr('y', 30)
    .attr('text-anchor', 'middle').attr('font-size', 19).attr('fill', NAVY)
  const badge = svg.append('g').attr('opacity', 0)
  badge.append('rect').attr('x', 230).attr('y', H - 38).attr('width', 520).attr('height', 32)
    .attr('rx', 4).attr('fill', '#fff7ed').attr('stroke', '#d97706')
  const badgeText = badge.append('text').attr('x', 490).attr('y', H - 17)
    .attr('text-anchor', 'middle').attr('font-size', 15).attr('fill', '#8a4b06')

  function stroke(n) { return n.zone === 'real' ? NAVY : TEAL }

  function render(step) {
    if (mode === 'build') {
      const stage = isPrint ? 4 : step
      nodes.attr('opacity', (n) => (n.at <= stage ? 1 : 0))
        .select('rect').attr('stroke', stroke)
      edges.attr('opacity', (e) => (e.at <= stage ? 1 : 0))
      edges.select('path')
        .attr('stroke', (e) => (e.at >= 3 ? VIOLET : NAVY))
        .attr('marker-end', (e) => `url(#${e.at >= 3 ? 'a-violet' : 'a-navy'})`)
      realZone.attr('opacity', 1); realLabel.attr('opacity', 1)
      modelZone.attr('opacity', stage >= 1 ? 1 : 0); modelLabel.attr('opacity', stage >= 1 ? 1 : 0)
      caption.text(BUILD_CAPTIONS[Math.min(stage, BUILD_CAPTIONS.length - 1)])
      badge.attr('opacity', 0)
    } else if (mode === 'inference') {
      const on = ['o', 'x', 'model', 'yhat']
      const live = isPrint || step >= 1
      nodes.attr('opacity', (n) => (!live ? 1 : on.includes(n.id) ? 1 : DIM))
        .select('rect').attr('stroke', stroke)
      edges.attr('opacity', (e) => {
        if (!live) return 1
        return on.includes(e.from) && on.includes(e.to) ? 1 : DIM
      })
      edges.select('path').attr('stroke', NAVY).attr('marker-end', 'url(#a-navy)')
      caption.text(live
        ? 'Inference: a new, unseen situation follows one path — the training machinery is gone'
        : 'Training used every box; using the model does not')
      badge.attr('opacity', live ? 1 : 0)
      badgeText.text(live ? 'the learned parameters Θ are now fixed' : '')
    } else {
      const i = Math.min(Math.max(step, 0), UNCERTAINTY.length) - 1
      const cur = i >= 0 ? UNCERTAINTY[i] : null
      nodes.attr('opacity', (n) => (!cur ? 1 : cur.ids.includes(n.id) ? 1 : 0.3))
        .select('rect')
        .attr('stroke', (n) => (cur && cur.ids.includes(n.id) ? '#d97706' : stroke(n)))
        .attr('stroke-width', (n) => (cur && cur.ids.includes(n.id) ? 3.5 : 2))
      edges.attr('opacity', cur ? 0.25 : 1)
      caption.text(cur ? cur.title : 'Uncertainty is not only in the prediction')
      badge.attr('opacity', cur ? 1 : 0)
      badgeText.text(cur ? cur.text : '')
    }
  }

  render(isPrint ? (mode === 'build' ? 4 : mode === 'inference' ? 1 : UNCERTAINTY.length) : steps)
  return { setStep: (i) => render(i) }
}

// Brace-annotated equation. The container holds a KaTeX display equation whose
// parts are wrapped in colour slots (\eqa{…} … \eqf{…}); this module draws a
// brace under each part with its label, and — with data-steps — walks through
// the parts one fragment at a time, dimming the rest.
//
//   <div class="viz eq-explain" data-viz="core/equation-explain" data-steps="4"
//        data-params='{"labels": ["posterior", "likelihood", "prior", "evidence"]}'>
//   $$ \eqa{P(A \mid B)} = \frac{\eqb{P(B \mid A)}\,\eqc{P(A)}}{\eqd{P(B)}} $$
//   </div>
//
// labels[i] belongs to slot eq-(i+1). Print view shows every brace and label.

const RULE = '#9aa5b1'

function waitFor(pred, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => {
      if (pred()) return resolve()
      if (Date.now() - t0 > timeout) return reject(new Error('equation did not render'))
      setTimeout(tick, 60)
    }
    tick()
  })
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const labels = params.labels ?? []
  const n = labels.length
  // KaTeX renders asynchronously after Reveal is ready; wait for it.
  await waitFor(() => el.querySelector('.katex') && el.querySelector('.eq-1'))

  const scale = () => (window.Reveal?.getScale?.() ?? 1)
  const svg = d3.select(el).append('svg').attr('class', 'eq-annotations')
  const parts = []
  for (let i = 1; i <= n; i++) {
    const span = el.querySelector(`.eq-${i}`)
    if (span) parts.push({ i, span, label: labels[i - 1], colour: `var(--eq-${i})` })
  }

  function layout() {
    svg.selectAll('*').remove()
    const s = scale()
    const box = el.getBoundingClientRect()
    const rows = parts.map((p, k) => {
      const r = p.span.getBoundingClientRect()
      return { ...p, x: (r.left - box.left) / s, w: r.width / s, row: k % 2 }
    })
    const H = 70
    svg.attr('viewBox', `0 0 ${box.width / s} ${H}`).attr('height', H)
    for (const p of rows) {
      const y = 6 + p.row * 30
      const g = svg.append('g').attr('class', `eq-ann eq-ann-${p.i}`)
      // a flat brace: short verticals at the ends, a horizontal bar, a tick to the label
      g.append('path')
        .attr('d', `M${p.x},${y} v6 H${p.x + p.w} v-6 M${p.x + p.w / 2},${y + 6} v8`)
        .attr('fill', 'none').attr('stroke', p.colour).attr('stroke-width', 1.8)
      g.append('text')
        .attr('x', p.x + p.w / 2).attr('y', y + 26)
        .attr('text-anchor', 'middle').attr('font-size', 13)
        .attr('fill', p.colour).text(p.label)
    }
  }

  function render(step) {
    layout()
    const all = step >= n || isPrint
    el.classList.toggle('eq-focus', step > 0 && !all)
    parts.forEach((p) => {
      p.span.classList.toggle('eq-current', step === p.i && !all)
      svg.select(`.eq-ann-${p.i}`).attr('opacity', all || step >= p.i ? 1 : 0)
    })
  }

  render(steps)
  window.Reveal?.on?.('resize', () => layout())
  return { setStep: (i) => render(i) }
}

// Shared control strip for tier-3 (manipulable) visualizations
// (docs/PEDAGOGIC_CONCEPT.md Principle 6, docs/LAYOUT_REFERENCE.md §5).
//
// A widget calls
//
//   const c = addControls(el, ctx, [
//     { id: 'n', label: 'sample size n', type: 'range', min: 1, max: 50, value: 5,
//       format: (v) => v },
//     { id: 'draw', label: 'Draw 50', type: 'button' },
//   ], (id, values) => render(values))
//
// and gets back { values, set, disable }. In print view nothing is built and
// `values` simply holds the declared defaults, so the module's static frame is
// identical with and without controls — which is what the PDF export needs.
//
// Deliberately tiny: it owns DOM plumbing only. Every widget still decides what
// a change means, and the predict-then-check prompt lives on the slide, not
// here.

export function addControls(el, ctx, specs, onChange) {
  const values = {}
  for (const s of specs) if (s.type !== 'button') values[s.id] = s.value

  if (ctx.isPrint) return { values, set: () => {}, disable: () => {} }

  el.classList.add('viz-interactive')
  const bar = document.createElement('div')
  bar.className = 'viz-controls'
  const nodes = {}
  const readouts = {}

  for (const s of specs) {
    if (s.type === 'button') {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = s.label
      b.addEventListener('click', () => onChange(s.id, values))
      bar.appendChild(b)
      nodes[s.id] = b
      continue
    }

    const wrap = document.createElement('label')
    wrap.append(`${s.label} `)

    if (s.type === 'choice') {
      const sel = document.createElement('select')
      for (const o of s.options) {
        const opt = document.createElement('option')
        opt.value = o.value
        opt.textContent = o.label
        sel.appendChild(opt)
      }
      sel.value = String(s.value)
      sel.addEventListener('change', () => {
        values[s.id] = sel.value
        onChange(s.id, values)
      })
      wrap.appendChild(sel)
      nodes[s.id] = sel
    } else {
      const input = document.createElement('input')
      input.type = 'range'
      input.min = s.min
      input.max = s.max
      input.step = s.step ?? 1
      input.value = String(s.value)
      const out = document.createElement('span')
      out.className = 'viz-readout'
      const fmt = s.format ?? ((v) => v)
      out.textContent = fmt(s.value)
      input.addEventListener('input', () => {
        values[s.id] = Number(input.value)
        out.textContent = fmt(values[s.id])
        onChange(s.id, values)
      })
      wrap.append(input, out)
      nodes[s.id] = input
      readouts[s.id] = { out, fmt }
    }
    bar.appendChild(wrap)
  }

  el.appendChild(bar)

  return {
    values,
    // Move a control programmatically (a stepped story driving its own slider).
    set(id, v) {
      values[id] = v
      const n = nodes[id]
      if (n) n.value = String(v)
      const r = readouts[id]
      if (r) r.out.textContent = r.fmt(v)
    },
    disable(id, off) {
      if (nodes[id]) nodes[id].disabled = !!off
    },
  }
}

// Deterministic RNG (mulberry32). Widgets that sample MUST use a seeded
// generator: the print frame has to be reproducible, and a lecturer who steps
// backwards should see the same picture return.
export function rng(seed = 20260910) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

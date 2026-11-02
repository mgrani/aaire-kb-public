// Generating text, word by word, from two models (PML Lecture 03, Principle 6
// tiers 2–3): naive Bayes draws every word from the same p(word | spam); a
// language model draws each word from p(next word | the words so far).
//
// Both models share one small vocabulary of 13 words, listed once in the
// middle of a back-to-back chart: naive Bayes' probabilities to the left, the
// language model's to the right, on the same scale. The naive Bayes bars never
// change, the language model's move with the context. Top: the two mails
// sampled so far (the latest word highlighted); below: the distribution over
// the vocabulary the latest word was drawn from.
//
// Both models are toys with hand-set probabilities. The language model uses
// only the previous word as its context (a bigram model); a real language
// model conditions on the whole context with a neural network, but the
// generating step — draw from a distribution over the vocabulary, append,
// repeat — is the same.
//
// params: words (draws, default 8), seed (default 9)
// steps (data-steps = words): 0 the first distributions · k: k words drawn
// Button: "Sample again" draws two new mails.

import { addControls, rng } from '../core/controls.js'

const NAVY = '#164374'
const VIOLET = '#7c3aed'
const GREY = '#64748b'
const RULE = '#dde3ea'

const VOCAB = ['you', 'have', 'won', 'a', 'free', 'prize', 'claim', 'your', 'click', 'here', 'to', 'now', 'today']
// p(word | spam) under naive Bayes: one distribution for every position
const NB = {
  you: 0.10, have: 0.04, won: 0.07, a: 0.06, free: 0.14, prize: 0.10, claim: 0.09,
  your: 0.08, click: 0.10, here: 0.04, to: 0.03, now: 0.09, today: 0.06,
}
// p(next word | previous word): a toy bigram language model; after "now" or
// "today" the mail ends
const LM = {
  '<s>': { you: 0.5, claim: 0.3, click: 0.2 },
  you: { have: 0.7, won: 0.3 },
  have: { won: 1 },
  won: { a: 1 },
  a: { free: 0.6, prize: 0.4 },
  free: { prize: 1 },
  prize: { now: 0.5, today: 0.5 },
  claim: { your: 0.8, a: 0.2 },
  your: { free: 0.4, prize: 0.6 },
  click: { here: 0.8, now: 0.2 },
  here: { to: 1 },
  to: { claim: 1 },
}
const END = new Set(['now', 'today'])

function draw(dist, r) {
  let u = r(), acc = 0
  for (const w of VOCAB) { acc += dist[w] ?? 0; if (u < acc) return w }
  return VOCAB.findLast((w) => dist[w])
}

// both mails, with the distribution each word was drawn from
function sample(seed, n) {
  const r = rng(seed)
  const nb = [], lm = []
  for (let i = 0; i < n; i++) nb.push({ dist: NB, word: draw(NB, r) })
  let prev = '<s>'
  for (let i = 0; i < n && !END.has(prev); i++) {
    const word = draw(LM[prev], r)
    lm.push({ dist: LM[prev], word, context: prev })
    prev = word
  }
  return { nb, lm }
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const n = params.words ?? 8
  let seed = params.seed ?? 9
  let s = sample(seed, n)
  let step = 0
  const W = 900
  const H = 410
  const MID = W / 2
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Two models generate a spam mail word by word from the same 13-word vocabulary: naive Bayes from one fixed distribution, a language model from a distribution that depends on the previous word')
  const g = svg.append('g')
  const text = (x, y, t, o = {}) => g.append('text').attr('x', x).attr('y', y)
    .attr('font-size', o.size ?? 16).attr('font-weight', o.bold ? 700 : 400)
    .attr('font-style', o.italic ? 'italic' : null)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)

  // a sampled mail, the latest word highlighted
  function mail(x, title, formula, seq, k) {
    text(x, 24, title, { bold: true, size: 19 })
    text(x, 48, formula, { size: 15, colour: GREY })
    const words = seq.slice(0, k).map((d) => d.word)
    const t = text(x, 88, '', { size: 23, italic: true })
    if (!words.length) { t.attr('fill', RULE).text('…'); return }
    t.append('tspan').text('“')
    words.forEach((w, i) => {
      const last = i === words.length - 1 && k <= seq.length
      t.append('tspan').attr('fill', last ? VIOLET : NAVY).attr('font-weight', last ? 700 : 400)
        .text((i ? ' ' : '') + w)
    })
    const done = k >= seq.length && seq.length < n
    t.append('tspan').text(done ? '.”' : ' …”')
  }

  function render() {
    g.selectAll('*').remove()
    mail(10, 'Naive Bayes', 'each word from p(word | spam)', s.nb, step)
    mail(MID + 30, 'Language model (toy)', 'each word from p(word | the words before)', s.lm, step)
    g.append('line').attr('x1', 10).attr('x2', W - 10).attr('y1', 108).attr('y2', 108).attr('stroke', RULE)
    text(MID, 134, 'The vocabulary: 13 words, the same for both models', { size: 17, anchor: 'middle', bold: true })
    const at = (seq) => seq[Math.min(Math.max(step - 1, 0), seq.length - 1)]
    const nb = at(s.nb), lm = at(s.lm)
    const nbHit = step > 0 ? nb.word : null
    const lmHit = step > 0 && step <= s.lm.length ? lm.word : null
    text(MID - 45, 158, 'p(word | spam) — the same every time', { size: 15, anchor: 'end', colour: GREY })
    text(MID + 45, 158, `p(next word | “${lm.context === '<s>' ? 'start' : lm.context}”)`, { size: 15, colour: GREY })
    // back-to-back bars on one scale: probability 1 = 300 px
    const L = 300
    VOCAB.forEach((w, j) => {
      const y = 166 + j * 18
      text(MID, y + 14, w, { size: 17, anchor: 'middle' })
      for (const [p, hit, side] of [[NB[w] ?? 0, w === nbHit, -1], [lm.dist[w] ?? 0, w === lmHit, 1]]) {
        const x0 = MID + side * 42
        g.append('rect').attr('x', side < 0 ? x0 - L : x0).attr('y', y + 3).attr('width', L).attr('height', 13)
          .attr('fill', '#f8fafc')
        if (!p) continue
        const len = Math.max(2, L * p)
        g.append('rect').attr('x', side < 0 ? x0 - len : x0).attr('y', y + 3).attr('width', len).attr('height', 13)
          .attr('fill', hit ? VIOLET : NAVY).attr('fill-opacity', hit ? 0.9 : 0.3)
        text(x0 + side * (len + 6), y + 14, p.toFixed(2),
          { size: 14, anchor: side < 0 ? 'end' : 'start', bold: hit, colour: hit ? VIOLET : GREY })
      }
    })
  }

  addControls(el, { isPrint }, [{ id: 'again', label: 'Sample again', type: 'button' }], () => {
    seed += 1
    s = sample(seed, n)
    render()
  })
  const setStep = (k) => { step = k; render() }
  setStep(isPrint ? (steps || n) : 0)
  return { setStep }
}

// Bayes' theorem as natural frequencies: a population of 1,000 people is
// split by disease status and test result, then restricted to the people who
// tested positive (docs/PEDAGOGIC_CONCEPT.md, Principle 6 tier 2).
//
// Deliberately uses ONLY counting and conditional probability as restriction
// of the sample space (Principle 7, no forward references): at this point in
// the course, random variables and distributions do not exist yet.
//
// params:
//   population:  total people (default 1000)
//   prevalence:  share who are sick (default 0.001)
//   sensitivity: P(positive | sick)     (default 0.99)
//   specificity: P(negative | healthy)  (default 0.99)

const NAVY = '#164374'
const TEAL = '#0083A1'
const SICK = '#b5322e'
const PALE = '#d5dbe2'

export async function mount(el, { d3, params, steps }) {
  const N = params.population ?? 1000
  const sick = Math.max(1, Math.round(N * (params.prevalence ?? 0.001)))
  const truePos = Math.round(sick * (params.sensitivity ?? 0.99)) || 1
  const falsePos = Math.round((N - sick) * (1 - (params.specificity ?? 0.99)))
  const positives = truePos + falsePos
  const flagRate = Math.round(100 * (1 - (params.specificity ?? 0.99)))

  const cols = 40
  const rows = Math.ceil(N / cols)
  const W = 720
  const H = 430
  const dx = 17
  const dy = 13
  const gridW = cols * dx
  const x0 = (W - gridW) / 2 + dx / 2
  const y0 = 86

  // Sick people first in reading order, then the false positives, so the
  // groups stay visually contiguous and countable.
  const kind = new Array(N).fill('healthy')
  for (let i = 0; i < sick; i++) kind[i] = i < truePos ? 'truePos' : 'sickNeg'
  for (let i = sick; i < sick + falsePos; i++) kind[i] = 'falsePos'

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')

  const caption = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', NAVY)
    .attr('font-size', 22)
  const result = svg
    .append('text')
    .attr('x', W / 2)
    .attr('y', 58)
    .attr('text-anchor', 'middle')
    .attr('font-size', 24)
    .attr('font-weight', 'bold')
    .attr('fill', TEAL)

  const dots = svg
    .append('g')
    .selectAll('circle')
    .data(d3.range(N))
    .join('circle')
    .attr('cx', (i) => x0 + (i % cols) * dx)
    .attr('cy', (i) => y0 + Math.floor(i / cols) * dy)
    .attr('r', 4)

  const STATES = [
    { caption: `${N.toLocaleString()} people`, result: '' },
    { caption: `About ${sick} in ${N.toLocaleString()} is actually sick`, result: 'prior' },
    { caption: `The test also flags ~${flagRate}% of the ${(N - sick).toLocaleString()} healthy people`, result: 'flag' },
    // step 3 must not give the answer away: the notes ask the room
    // "how many of these are sick?" before the last click
    { caption: 'Keep only the people who tested positive', result: 'restrict' },
    { caption: 'Restricting to the positives is exactly the conditioning step', result: 'answer' },
  ]

  function render(step) {
    const s = STATES[Math.max(0, Math.min(step, STATES.length - 1))]
    caption.text(s.caption)

    dots
      .transition()
      .duration(350)
      .attr('fill', (i) => {
        const k = kind[i]
        if (step === 0) return PALE
        if (step === 1) return k === 'truePos' || k === 'sickNeg' ? SICK : PALE
        if (step === 2) return k === 'truePos' || k === 'sickNeg' ? SICK : k === 'falsePos' ? TEAL : PALE
        // steps 3+: keep only the positives visible
        return k === 'truePos' ? SICK : k === 'falsePos' ? TEAL : '#f2f4f7'
      })
      .attr('opacity', (i) => {
        if (step < 3) return 1
        return kind[i] === 'truePos' || kind[i] === 'falsePos' ? 1 : 0.25
      })
      .attr('r', (i) => (step >= 3 && (kind[i] === 'truePos' || kind[i] === 'falsePos') ? 5.5 : 4))

    if (s.result === 'answer') {
      result.text(`P(sick | positive) = ${truePos}/${positives} ≈ ${Math.round((100 * truePos) / positives)}%`)
    } else if (s.result === 'restrict') {
      result.text(`${positives} positive tests — how many of them are sick?`)
    } else if (s.result === 'flag') {
      result.text(`≈ ${falsePos} false alarms`)
    } else if (s.result === 'prior') {
      result.text(`P(sick) = ${sick}/${N.toLocaleString()}`)
    } else {
      result.text('')
    }
  }

  render(steps)
  return { setStep: (i) => render(i) }
}

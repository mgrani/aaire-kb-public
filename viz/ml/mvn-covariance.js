// One normal over two numbers (PML Lecture 03, continuous-attributes): the
// frauds of the training table (generative-2d) in (log amount, log distance),
// one 2-D normal laid over them, and its covariance matrix written out.
//
// The means and spreads are the fitted ones; the correlation ρ is set by the
// steps or the slider. At ρ = 0 the matrix is diagonal, the ellipse upright,
// and the density is the product of two 1-D normals — Gaussian naive Bayes
// for one class. At the fitted ρ the off-diagonal entries are ρσ₁σ₂ and the
// ellipse tilts with the cloud.
//
// Uses only: normal distribution, covariance, correlation.
//
// steps: 0 ρ = 0 (independent, diagonal Σ) · 1 the fitted ρ (full Σ)
// Slider: ρ from −0.9 to 0.9.

import { addControls } from '../core/controls.js'
import { DEFAULT, trainingTable } from './generative-2d.js'

const NAVY = '#164374'
const FRAUD = '#8a4b06'
const VIOLET = '#7c3aed'
const GREY = '#64748b'
const RULE = '#dde3ea'

function fit(rows) {
  const n = rows.length
  const mu = [rows.reduce((t, p) => t + p.u, 0) / n, rows.reduce((t, p) => t + p.v, 0) / n]
  let a = 0, b = 0, c = 0
  for (const p of rows) {
    const x = p.u - mu[0], y = p.v - mu[1]
    a += x * x; b += x * y; c += y * y
  }
  const sd = [Math.sqrt(a / n), Math.sqrt(c / n)]
  return { mu, sd, rho: b / n / (sd[0] * sd[1]), n }
}

export async function mount(el, { d3, params, steps, isPrint }) {
  const rows = trainingTable(DEFAULT).filter((p) => p.y === 'fraud')
  const F = fit(rows)
  const W = 900
  const H = 400
  const P = { x0: 70, x1: 430, y0: 30, y1: 350 }
  const sx = d3.scaleLinear().domain([1.2, 3.8]).range([P.x0, P.x1])
  const sy = d3.scaleLinear().domain([0.9, 3.6]).range([P.y1, P.y0])
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The frauds of the training table with one two-dimensional normal laid over them, and its covariance matrix')
  const g = svg.append('g')
  const text = (x, y, t, o = {}) => g.append('text').attr('x', x).attr('y', y)
    .attr('font-size', o.size ?? 16).attr('font-weight', o.bold ? 700 : 400)
    .attr('text-anchor', o.anchor ?? 'start').attr('fill', o.colour ?? NAVY).text(t)

  function ellipse(rho, r, width) {
    const [s1, s2] = F.sd
    const pts = d3.range(0, 2 * Math.PI + 0.01, Math.PI / 60).map((q) => {
      // x = μ + r · L z with L the Cholesky factor of Σ, z on the unit circle
      const z1 = Math.cos(q), z2 = Math.sin(q)
      return [sx(F.mu[0] + r * s1 * z1), sy(F.mu[1] + r * s2 * (rho * z1 + Math.sqrt(1 - rho * rho) * z2))]
    })
    g.append('path').attr('d', d3.line()(pts)).attr('fill', 'none').attr('stroke', FRAUD)
      .attr('stroke-width', width).attr('stroke-dasharray', r > 1 ? '6 4' : null)
  }

  function render(rho) {
    g.selectAll('*').remove()
    // the panel
    g.append('rect').attr('x', P.x0).attr('y', P.y0).attr('width', P.x1 - P.x0).attr('height', P.y1 - P.y0)
      .attr('fill', 'none').attr('stroke', RULE)
    for (const t of [2, 3]) {
      text(sx(t), P.y1 + 20, `${10 ** t} €`, { size: 13, anchor: 'middle', colour: GREY })
    }
    for (const t of [1, 2, 3]) {
      text(P.x0 - 8, sy(t) + 5, `${10 ** t} km`, { size: 13, anchor: 'end', colour: GREY })
    }
    text((P.x0 + P.x1) / 2, P.y1 + 42, 'x₁ = log amount →', { size: 14, anchor: 'middle', colour: GREY })
    g.append('text').attr('transform', `translate(${P.x0 - 52},${(P.y0 + P.y1) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', GREY).text('x₂ = log distance →')
    for (const p of rows) {
      g.append('circle').attr('cx', sx(p.u)).attr('cy', sy(p.v)).attr('r', 4.5)
        .attr('fill', '#d97706').attr('fill-opacity', 0.75)
    }
    ellipse(rho, 1, 2.5)
    ellipse(rho, 2, 1.6)
    text(sx(F.mu[0]), sy(F.mu[1]) + 6, '×', { size: 18, bold: true, anchor: 'middle', colour: FRAUD })

    // the parameters, written out
    const tx = 480
    const [s1, s2] = F.sd
    const diag = Math.abs(rho) < 0.005
    const c = diag ? '0' : (rho * s1 * s2).toFixed(2)
    text(tx, 50, `${F.n} frauds, one normal over x = (x₁, x₂)`, { bold: true })
    text(tx, 92, 'μ =', { size: 18 })
    matrix(tx + 40, 70, [[F.mu[0].toFixed(2)], [F.mu[1].toFixed(2)]], [false, false])
    text(tx + 150, 92, 'Σ =', { size: 18 })
    matrix(tx + 190, 70, [[`${s1.toFixed(2)}²`, c], [c, `${s2.toFixed(2)}²`]],
      [false, true])
    text(tx, 160, `spreads σ₁ = ${s1.toFixed(2)}, σ₂ = ${s2.toFixed(2)} on the diagonal`, { size: 15 })
    text(tx, 184, `off the diagonal: ρ σ₁ σ₂, with ρ = ${rho.toFixed(2)}`, { size: 15, colour: diag ? NAVY : VIOLET })
    if (diag) {
      text(tx, 232, 'Σ diagonal: x₁ and x₂ independent,', { size: 16, bold: true })
      text(tx, 256, 'the ellipse upright, and', { size: 16, bold: true })
      text(tx, 290, 'N(x; μ, Σ) = N(x₁; μ₁, σ₁²) · N(x₂; μ₂, σ₂²)', { size: 15 })
      text(tx, 314, '— the two normals of Gaussian naive Bayes', { size: 15, colour: GREY })
    } else {
      text(tx, 232, 'Σ full: the ellipse tilts', { size: 16, bold: true, colour: VIOLET })
      text(tx, 256, rho > 0 ? 'large amounts come with large distances' : 'large amounts come with small distances',
        { size: 16, colour: VIOLET })
      text(tx, 290, `fitted to the frauds: ρ = ${F.rho.toFixed(2)}`, { size: 15, colour: GREY })
    }
  }

  // a bracketed column or 2×2 matrix of strings; offDiagonal highlights [0][1], [1][0]
  function matrix(x, y, cells, [, offDiag]) {
    const cols = cells[0].length
    const cw = 62
    const w = cols * cw + 10
    const h = 52
    for (const side of [0, 1]) {
      const bx = side ? x + w : x
      const d = side ? -6 : 6
      g.append('path').attr('d', `M${bx + d},${y} L${bx},${y} L${bx},${y + h} L${bx + d},${y + h}`)
        .attr('fill', 'none').attr('stroke', NAVY).attr('stroke-width', 1.5)
    }
    cells.forEach((row, i) => row.forEach((v, j) => {
      const off = offDiag && i !== j
      text(x + 5 + j * cw + cw / 2, y + 20 + i * 24, v,
        { size: 16, anchor: 'middle', bold: off, colour: off ? (Number(v) === 0 ? NAVY : VIOLET) : NAVY })
    }))
  }

  const controls = addControls(el, { isPrint }, [
    { id: 'rho', label: 'correlation ρ within the frauds', type: 'range', min: -0.9, max: 0.9, step: 0.01,
      value: 0, format: (v) => v.toFixed(2) },
  ], (id, v) => render(v.rho))
  const setStep = (k) => {
    const rho = k >= 1 ? Math.round(F.rho * 100) / 100 : 0
    controls.values.rho = rho
    controls.set('rho', rho)
    render(rho)
  }
  setStep(isPrint ? (steps || 1) : 0)
  return { setStep }
}

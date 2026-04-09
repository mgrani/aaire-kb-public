/*
 * Minimal Reveal.js TOC-progress plugin.
 *
 * Renders a fixed strip at the bottom of every horizontal slide that
 * lists the top-level modules (`---`-separated sections) and highlights
 * the currently active one. Clicking a chip navigates to that module.
 *
 * Module label resolution, in order of precedence:
 *   1. section[data-toc-title="…"]
 *   2. first h1/h2 text in the horizontal section
 *   3. "Module N" fallback
 *
 * Opt-out per section: add `data-toc-exclude` on the horizontal
 * <section>. Useful for title slides and the auto-generated credits
 * slide.
 *
 * Configure via `Reveal.initialize({ tocProgress: { position: 'bottom' | 'top', hideOnOverview: true, chipMaxWidth: '24ch' } })`.
 */
// Storage key for the live "hidden" toggle (set from the settings menu).
const STORAGE_KEY = 'reveal-toc-progress-hidden'

window.RevealTocProgress = window.RevealTocProgress || {
  id: 'toc-progress',
  /** Public API, attached after init() so the settings menu can call it. */
  setHidden: function () {},
  isHidden: function () {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  },
  init: function (deck) {
    const opts = Object.assign(
      { position: 'bottom', hideOnOverview: true, excludeClasses: ['title-slide', 'credits-slide'] },
      deck.getConfig().tocProgress || {},
    )

    const container = document.createElement('nav')
    container.className = 'toc-progress toc-progress-' + opts.position
    container.setAttribute('aria-label', 'Table of contents')
    if (opts.chipMaxWidth) {
      container.style.setProperty('--toc-progress-chip-max-width', String(opts.chipMaxWidth))
    }
    deck.getRevealElement().appendChild(container)

    // Honour the persisted visibility preference immediately.
    let userHidden = window.RevealTocProgress.isHidden()

    function labelFor(section, index) {
      if (section.hasAttribute('data-toc-title')) return section.getAttribute('data-toc-title')
      const h = section.querySelector(':scope > h1, :scope > h2, :scope section h1, :scope section h2')
      if (h && h.textContent) return h.textContent.trim()
      return 'Module ' + (index + 1)
    }

    function isExcluded(section) {
      if (section.hasAttribute('data-toc-exclude')) return true
      for (const cls of opts.excludeClasses) {
        if (section.classList.contains(cls)) return true
        if (section.querySelector(':scope > section.' + cls)) return true
      }
      return false
    }

    function build() {
      container.innerHTML = ''
      const horizontals = Array.from(deck.getRevealElement().querySelectorAll(':scope > .slides > section'))
      horizontals.forEach((section, index) => {
        if (isExcluded(section)) return
        const chip = document.createElement('a')
        chip.className = 'toc-progress-chip'
        chip.textContent = labelFor(section, index)
        chip.href = '#/' + index
        chip.dataset.hIndex = String(index)
        chip.addEventListener('click', (e) => {
          e.preventDefault()
          deck.slide(index, 0)
        })
        container.appendChild(chip)
      })
    }

    function highlight() {
      const { h } = deck.getIndices()
      container.querySelectorAll('.toc-progress-chip').forEach((chip) => {
        chip.classList.toggle('active', Number(chip.dataset.hIndex) === h)
      })
    }

    function updateVisibility() {
      if (userHidden || (opts.hideOnOverview && deck.isOverview())) {
        container.style.display = 'none'
      } else {
        container.style.display = ''
      }
    }

    // Expose live toggle on the plugin object so the menu settings
    // panel can flip it without a page reload.
    window.RevealTocProgress.setHidden = function (hidden) {
      userHidden = !!hidden
      window.localStorage.setItem(STORAGE_KEY, userHidden ? '1' : '0')
      updateVisibility()
    }

    deck.on('ready', () => {
      build()
      highlight()
      updateVisibility()
    })
    deck.on('slidechanged', highlight)
    deck.on('overviewshown', updateVisibility)
    deck.on('overviewhidden', updateVisibility)
  },
}

(function () {
  const body = document.body

  document.querySelectorAll('[data-tech-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      body.classList.toggle('hide-technical')
      button.classList.toggle('is-active', body.classList.contains('hide-technical'))
      button.textContent = body.classList.contains('hide-technical') ? '显示技术细节' : '隐藏技术细节'
    })
  })

  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      const language = button.dataset.language
      document.querySelectorAll('[data-language]').forEach(item => item.classList.toggle('is-active', item === button))
      document.querySelectorAll('[data-language-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.languagePanel !== language))
    })
  })

  const search = document.querySelector('[data-doc-search]')
  if (search) {
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase()
      document.querySelectorAll('.wiki-doc').forEach(doc => {
        doc.classList.toggle('hidden', query && !doc.innerText.toLowerCase().includes(query))
      })
    })
  }

  function clearTarget() {
    document.querySelectorAll('.issue-target').forEach(node => node.classList.remove('issue-target'))
    document.querySelectorAll('.quality-context-target').forEach(node => node.classList.remove('quality-context-target', 'quality-context-first', 'quality-context-last'))
    document.querySelectorAll('.quality-context-anchor').forEach(node => {
      node.classList.remove('quality-context-anchor')
      node.removeAttribute('data-quality-context')
    })
  }

  function sectionNodes(target) {
    let heading = target.matches('h1, h2, h3') ? target : target.previousElementSibling
    while (heading && !heading.matches('h1, h2, h3')) heading = heading.previousElementSibling
    if (!heading) return [target]

    const level = Number(heading.tagName.slice(1))
    const nodes = [heading]
    let current = heading.nextElementSibling
    while (current) {
      if (current.matches('h1, h2, h3') && Number(current.tagName.slice(1)) <= level) break
      nodes.push(current)
      current = current.nextElementSibling
    }
    return nodes
  }

  function showContext(target, scope, note) {
    let nodes = [target]
    if (scope === 'section') nodes = sectionNodes(target)
    if (scope === 'document') nodes = [target.closest('.wiki-doc') || target]

    nodes.forEach(node => node.classList.add('quality-context-target'))
    nodes[0].classList.add('quality-context-first', 'quality-context-anchor')
    nodes[nodes.length - 1].classList.add('quality-context-last')
    if (note) nodes[0].dataset.qualityContext = note
    nodes[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  document.querySelectorAll('[data-locate], [data-locate-selector]').forEach(button => {
    button.addEventListener('click', () => {
      clearTarget()
      const match = button.dataset.locate
      const selector = button.dataset.locateSelector
      const scope = button.dataset.locateScope
      const note = button.dataset.locateNote
      const candidates = [...document.querySelectorAll('#wiki-original p, #wiki-original li, #wiki-original h1, #wiki-original h2, #wiki-original h3')]
      const target = selector ? document.querySelector(selector) : candidates.find(node => node.textContent.includes(match))
      if (target) {
        const originalPanel = target.closest('[data-language-panel="en"]')
        if (originalPanel?.classList.contains('hidden')) {
          document.querySelector('[data-language="en"]')?.click()
        }
        if (scope || note) showContext(target, scope || 'node', note)
        else {
          target.classList.add('issue-target')
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    })
  })

  async function renderDiagrams() {
    if (!window.mermaid) return
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral', flowchart: { useMaxWidth: true, htmlLabels: false } })
    for (const node of document.querySelectorAll('.mermaid')) {
      const originalSource = node.textContent.trim()
      try {
        await mermaid.run({ nodes: [node], suppressErrors: true })
        if (/syntax error|parse error/i.test(node.innerText) || node.querySelector('.error-icon,.error-text')) {
          node.innerHTML = `<div class="diagram-fallback"><strong>原页面图表未能在归档版重建</strong><p>其余正文保持原样；这是归档图表与当前渲染器的兼容问题，不作为 Wiki 事实错误。</p><details><summary>查看原图源码</summary><pre></pre></details></div>`
          node.querySelector('pre').textContent = originalSource
          node.dataset.renderError = 'recovered'
        }
      } catch (error) {
        node.innerHTML = `<div class="diagram-fallback"><strong>原页面图表未能在归档版重建</strong><p>其余正文保持原样；这是归档图表与当前渲染器的兼容问题，不作为 Wiki 事实错误。</p><details><summary>查看原图源码</summary><pre></pre></details></div>`
        node.querySelector('pre').textContent = originalSource
        node.dataset.renderError = 'recovered'
      }
    }
  }

  renderDiagrams()
})()

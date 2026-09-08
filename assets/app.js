(function () {
  const body = document.body
  const params = new URLSearchParams(window.location.search)
  const embedded = params.get('embed') === '1'
  const pageName = window.location.pathname.split('/').pop() || 'index.html'
  let userInteracted = false

  if (embedded) {
    body.classList.add('embed-reader')
    body.classList.remove('hide-technical')
  }

  const nav = document.querySelector('.topbar')
  if (nav && !embedded) {
    const entries = [
      ['index.html', '对比首页'],
      ['compare.html', '左右对比 Wiki'],
      ['issue-compare.html', '按问题对照'],
      ['repository-intro.html', '仓库说明'],
      ['issue-summary.html', '原问题清单']
    ]
    const brand = document.createElement('a')
    brand.className = 'brand'
    brand.href = 'index.html'
    brand.textContent = 'Wiki 对比'
    nav.replaceChildren(brand)
    nav.setAttribute('aria-label', '主导航')
    entries.forEach(([href, label]) => {
      const link = document.createElement('a')
      link.href = href
      link.textContent = label
      if (pageName === href) {
        link.className = 'active'
        link.setAttribute('aria-current', 'page')
      }
      nav.append(link)
    })
  }

  function sectionAnchors(panel, prefix) {
    document.querySelectorAll(panel + ' .wiki-doc').forEach((article, articleIndex) => {
      article.querySelectorAll('h2').forEach((heading, headingIndex) => {
        if (!heading.id) heading.id = `${prefix}${articleIndex + 1}-${headingIndex + 1}`
      })
    })
  }
  sectionAnchors('#wiki-original', 'compare-section-')
  sectionAnchors('#wiki-zh', 'compare-zh-section-')

  function selectLanguage(language) {
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    })
    document.querySelectorAll('[data-language-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.languagePanel !== language)
    })
  }

  if (params.has('language') || embedded) {
    selectLanguage(params.get('language') === 'zh' && !params.has('highlight') ? 'zh' : 'en')
  }

  if (pageName === 'index.html') {
    const actions = document.querySelector('.hero-actions')
    if (actions) {
      const compareLink = document.createElement('a')
      compareLink.className = 'button primary'
      compareLink.href = 'compare.html'
      compareLink.textContent = '左右并排看 Wiki'
      const issueLink = document.createElement('a')
      issueLink.className = 'button'
      issueLink.href = 'issue-compare.html'
      issueLink.textContent = '按同一问题对照五工具'
      actions.querySelectorAll('.primary').forEach(link => link.classList.remove('primary'))
      actions.prepend(compareLink, issueLink)
    }
  }

  const archivedAuditPage = ['local-skill.html', 'codewiki.html', 'openwiki.html', 'deepwiki-open.html', 'devinwiki.html'].includes(pageName)
  if (!embedded && (pageName === 'issue-summary.html' || archivedAuditPage)) {
    const notice = document.createElement('section')
    notice.className = 'review-update-notice'
    const heading = document.createElement('strong')
    heading.textContent = archivedAuditPage ? '原始 Wiki 与旧版审计标注' : '新增：按同一问题横向核对五工具'
    const description = document.createElement('p')
    description.textContent = archivedAuditPage
      ? 'Wiki 正文未作改写；本页问题标注保留上次审计记录。本次复核已收窄部分判断，并保留同一 Wiki 中的正确说明。当前结论请查看“按问题对照”，不要把旧标注与新案例重复计数。'
      : '下方保留原审计清单。新版逐条区分明确错误、正误并存、未覆盖和未核查；部分旧结论已收窄，不把一句概述或边界缺漏直接算成整项错误。'
    const link = document.createElement('a')
    link.className = 'button primary'
    link.href = 'issue-compare.html'
    link.textContent = '打开问题对照页'
    notice.append(heading, description, link)
    nav?.after(notice)
  }

  document.querySelectorAll('[data-tech-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      body.classList.toggle('hide-technical')
      button.classList.toggle('is-active', body.classList.contains('hide-technical'))
      button.textContent = body.classList.contains('hide-technical') ? '显示技术细节' : '隐藏技术细节'
    })
  })

  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      selectLanguage(button.dataset.language)
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
    let block = target
    while (block.parentElement && !block.parentElement.classList.contains('wiki-doc')) {
      if (block.parentElement.id === 'wiki-original') break
      block = block.parentElement
    }
    let heading = block.matches('h1, h2, h3') ? block : block.previousElementSibling
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

  function findOriginalText(match) {
    if (!match) return null
    const normalize = value => value.replace(/\s+/g, ' ').trim()
    const wanted = normalize(match)
    const candidates = [...document.querySelectorAll('#wiki-original p, #wiki-original li, #wiki-original h1, #wiki-original h2, #wiki-original h3, #wiki-original td, #wiki-original th, #wiki-original pre, #wiki-original .mermaid')]
    return candidates.find(node => normalize(node.dataset.mermaidSource || node.textContent).includes(wanted)) || null
  }

  function showContext(target, scope, note) {
    let nodes = [target]
    if (scope === 'section') nodes = sectionNodes(target)
    if (scope === 'document') nodes = [target.closest('.wiki-doc') || target]

    nodes.forEach(node => node.classList.add('quality-context-target'))
    nodes[0].classList.add('quality-context-first', 'quality-context-anchor')
    nodes[nodes.length - 1].classList.add('quality-context-last')
    if (note) nodes[0].dataset.qualityContext = note
    if (embedded) window.scrollTo({ top: window.scrollY + nodes[0].getBoundingClientRect().top, behavior: 'instant' })
    else nodes[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  document.querySelectorAll('[data-locate], [data-locate-selector]').forEach(button => {
    button.addEventListener('click', () => {
      clearTarget()
      const match = button.dataset.locate
      const selector = button.dataset.locateSelector
      const scope = button.dataset.locateScope
      const note = button.dataset.locateNote
      const target = selector ? document.querySelector(selector) : findOriginalText(match)
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

  function applyLinkTarget() {
    const highlight = (params.get('highlight') || '').slice(0, 1000)
    if (highlight) {
      selectLanguage('en')
      const target = findOriginalText(highlight)
      if (target) {
        clearTarget()
        showContext(target, 'section', '相关原文上下文。高亮为展厅定位标记，不属于工具生成内容。')
        body.dataset.highlightStatus = 'found'
        document.getElementById('wiki-highlight-notice')?.remove()
        return
      } else {
        body.dataset.highlightStatus = 'not-found'
        if (!document.getElementById('wiki-highlight-notice')) {
          const notice = document.createElement('p')
          notice.id = 'wiki-highlight-notice'
          notice.className = 'wiki-highlight-notice'
          notice.setAttribute('role', 'status')
          notice.textContent = '未找到指定引文。下方保留完整 Wiki，请按章节查阅；未定位不代表原文没有问题。'
          document.getElementById('wiki-original')?.prepend(notice)
        }
      }
    }
    if (window.location.hash) {
      let id
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch (_) { return }
      const target = document.getElementById(id)
      if (target?.closest('#wiki-original, #wiki-zh')) {
        if (embedded) window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top, behavior: 'instant' })
        else target.scrollIntoView({ block: 'start' })
      }
    }
  }

  for (const event of ['pointerdown', 'wheel', 'touchstart', 'keydown']) {
    window.addEventListener(event, () => { userInteracted = true }, { once: true, passive: true })
  }
  document.addEventListener('wiki-reader-navigate', () => {
    userInteracted = true
    clearTarget()
    document.getElementById('wiki-highlight-notice')?.remove()
    body.dataset.highlightStatus = 'cleared'
  })
  applyLinkTarget()

  async function renderDiagrams() {
    if (!window.mermaid) return
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base', themeVariables: { primaryColor: '#f0f4ff', primaryTextColor: '#1f2329', primaryBorderColor: '#b8c6e0', lineColor: '#86909c', secondaryColor: '#f5f6f8', tertiaryColor: '#ffffff', fontFamily: 'Avenir Next, PingFang SC, sans-serif' }, flowchart: { useMaxWidth: true, htmlLabels: false } })
    for (const node of document.querySelectorAll('.mermaid')) {
      const originalSource = node.textContent.trim()
      node.dataset.mermaidSource = originalSource
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

  renderDiagrams().finally(() => {
    if (!userInteracted) applyLinkTarget()
    body.dataset.diagramsReady = 'true'
    document.dispatchEvent(new CustomEvent('wiki-diagrams-ready'))
  })
})()

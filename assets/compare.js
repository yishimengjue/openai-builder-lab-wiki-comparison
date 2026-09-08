(function () {
  'use strict'

  if (!document.querySelector('.compare-page')) return

  const tools = Object.freeze({
    'local-skill': { name: 'Local Skill', file: 'local-skill.html', source: '工具生成的中文原文 · 35 页，保留代码与图表。' },
    codewiki: { name: 'CodeWiki', file: 'codewiki.html', source: '工具生成的中文原文 · 1 篇概览，可按下方小节定位。' },
    openwiki: { name: 'OpenWiki', file: 'openwiki.html', source: '工具生成的中文原文 · 保留原始章节、代码与图表。' },
    'deepwiki-open': { name: 'DeepWiki Open', file: 'deepwiki-open.html', source: '工具生成的中文原文 · 保留原始章节、代码与图表。' },
    devinwiki: { name: 'DeepWiki（Devin 托管版）', file: 'devinwiki.html', source: '工具英文原文的完整归档；中文选项仅为压缩摘要。' }
  })
  const params = new URLSearchParams(window.location.search)
  const outputCommit = 'e87f060e4e86d599ee54bdc7b752484944278f85'
  const outputProfiles = window.WIKI_OUTPUT_PROFILES?.commit === outputCommit ? window.WIKI_OUTPUT_PROFILES.tools : null
  const syncControl = document.getElementById('compare-sync')
  const syncNote = document.getElementById('compare-sync-note')
  const topic = document.getElementById('compare-topic')
  const topicText = document.getElementById('compare-topic-text')
  const announcement = document.getElementById('compare-announcement')
  let announcementTimer
  let syncWanted = params.get('sync') === '1'
  let topicLabel = boundedText(params.get('topic'), 220)

  function boundedText(value, limit) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, limit) : ''
  }

  function validTool(value, fallback) {
    return Object.prototype.hasOwnProperty.call(tools, value) ? value : fallback
  }

  function validLanguage(tool, language) {
    return tool === 'devinwiki' && language === 'zh' ? 'zh' : 'original'
  }

  function announce(message) {
    window.clearTimeout(announcementTimer)
    announcement.textContent = message
    announcementTimer = window.setTimeout(() => { announcement.textContent = '' }, 5500)
  }

  function createPane(side, fallback) {
    const tool = validTool(params.get(side), fallback)
    const queryAnchor = boundedText(params.get(side + 'Anchor'), 300).replace(/^#/, '')
    const pane = {
      side,
      tool,
      language: params.get(side + 'Match') ? 'original' : validLanguage(tool, params.get(side + 'Language')),
      anchor: queryAnchor,
      anchorVerified: false,
      match: boundedText(params.get(side + 'Match'), 1000),
      root: document.getElementById('compare-' + side),
      toolSelect: document.getElementById('compare-' + side + '-tool'),
      languageSelect: document.getElementById('compare-' + side + '-language'),
      chapterSelect: document.getElementById('compare-' + side + '-chapter'),
      provenance: document.getElementById('compare-' + side + '-provenance'),
      outputRoot: document.getElementById('compare-' + side + '-profile'),
      outputCounts: null,
      outputNote: '',
      openLink: document.getElementById('compare-' + side + '-open'),
      iframe: document.getElementById('compare-' + side + '-frame'),
      loading: document.getElementById('compare-' + side + '-loading'),
      status: document.getElementById('compare-' + side + '-state'),
      progress: document.getElementById('compare-' + side + '-progress'),
      accessible: false,
      cleanup: null,
      suppressUntil: 0,
      readyTimer: null,
      scrollFrame: null,
      chapters: [],
      document: null,
      currentAnchor: '',
      userNavigated: false,
      pendingAnchor: '',
      loadToken: 0
    }
    for (const [key, value] of Object.entries(tools)) {
      pane.toolSelect.add(new Option(value.name, key))
    }
    pane.toolSelect.addEventListener('change', () => {
      pane.tool = validTool(pane.toolSelect.value, fallback)
      pane.language = 'original'
      pane.anchor = ''
      pane.match = ''
      loadPane(pane)
      updateURL()
    })
    pane.languageSelect.addEventListener('change', () => {
      pane.language = validLanguage(pane.tool, pane.languageSelect.value)
      pane.anchor = ''
      pane.match = ''
      loadPane(pane)
      updateURL()
    })
    pane.chapterSelect.addEventListener('change', () => {
      pane.anchor = pane.chapterSelect.value
      pane.match = ''
      pane.userNavigated = true
      pane.pendingAnchor = pane.anchor
      pane.document?.dispatchEvent(new pane.iframe.contentWindow.CustomEvent('wiki-reader-navigate'))
      if (scrollToAnchor(pane, pane.anchor)) {
        pane.status.textContent = pane.language === 'zh' ? '中文压缩摘要 · 不用于替代原文核对' : '完整原文 · 已切换章节'
        updateOpenLink(pane)
        updateURL()
      }
    })
    pane.iframe.addEventListener('load', () => onFrameLoad(pane))
    pane.iframe.addEventListener('error', () => {
      degradePane(pane, '页面加载失败。请通过“打开单页”检查文件是否存在。')
    })
    return pane
  }

  const panes = {
    left: createPane('left', 'local-skill'),
    right: createPane('right', 'codewiki')
  }

  function updateTopic() {
    topic.hidden = !topicLabel && !panes.left.match && !panes.right.match
    topicText.textContent = topicLabel || '已定位到所选原文'
  }

  function paneURL(pane, embedded) {
    const url = new URL(tools[pane.tool].file, window.location.href)
    if (embedded) url.searchParams.set('embed', '1')
    url.searchParams.set('language', pane.language)
    if (pane.match) url.searchParams.set('highlight', pane.match)
    // Query anchors are validated against the loaded original before navigation.
    if (!embedded && pane.anchor && pane.anchorVerified) url.hash = pane.anchor
    return url.href
  }

  function updateOpenLink(pane) {
    pane.openLink.href = paneURL(pane, false)
    pane.openLink.setAttribute('aria-label', '在新标签页打开 ' + tools[pane.tool].name + (pane.language === 'zh' ? ' 中文压缩摘要' : ' 原文'))
  }

  function updateURL() {
    const url = new URL(window.location.href)
    for (const pane of Object.values(panes)) {
      url.searchParams.set(pane.side, pane.tool)
      for (const [key, value] of Object.entries({
        Anchor: pane.anchor,
        Match: pane.match,
        Language: pane.language === 'zh' ? 'zh' : ''
      })) {
        if (value) url.searchParams.set(pane.side + key, value)
        else url.searchParams.delete(pane.side + key)
      }
    }
    if (topicLabel) url.searchParams.set('topic', topicLabel)
    else url.searchParams.delete('topic')
    if (syncWanted) url.searchParams.set('sync', '1')
    else url.searchParams.delete('sync')
    try { window.history.replaceState(null, '', url.href) } catch (_) { /* Some file viewers restrict history updates. */ }
    updateTopic()
    return url.href
  }

  function resetChapters(pane, label) {
    pane.chapterSelect.replaceChildren(new Option(label, ''))
    pane.chapterSelect.disabled = true
  }

  function outputElement(tag, className, text) {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  function showOutputEvidence(pane, evidence) {
    if (evidence?.page !== tools[pane.tool].file) return
    pane.language = 'original'
    pane.anchor = boundedText(evidence.anchor, 300).replace(/^#/, '')
    pane.match = boundedText(evidence.match, 1000)
    if (!pane.anchor && !pane.match) return
    topicLabel = ''
    loadPane(pane)
    updateURL()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    pane.root.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' })
    announce('已在' + (pane.side === 'left' ? '左侧' : '右侧') + '加载原文依据；定位标记不是工具生成内容。')
  }

  function renderOutputProfile(pane) {
    if (!pane.outputRoot) return
    const sideLabel = pane.side === 'left' ? '左侧' : '右侧'
    const profile = outputProfiles?.[pane.tool]
    const heading = outputElement('div', 'compare-output-tool')
    heading.append(outputElement('span', '', sideLabel), outputElement('h3', '', tools[pane.tool].name))
    const metrics = outputElement('dl', 'compare-output-metrics')
    const metricLabels = [
      ['sections', '二级小节'],
      ['codeBlocks', '代码块'],
      ['diagrams', '图表定义'],
      ['sourceLinks', '源码超链接']
    ]
    for (const [key, label] of metricLabels) {
      const item = outputElement('div', '')
      const value = outputElement('dd', '', pane.outputCounts ? pane.outputCounts[key].toLocaleString('zh-CN') : '未读取')
      value.dataset.metric = key
      value.dataset.pending = String(!pane.outputCounts)
      item.append(outputElement('dt', '', label), value)
      metrics.append(item)
    }
    const languageNote = pane.tool === 'devinwiki'
      ? (pane.language === 'zh' ? '统计与观察基于完整英文原文；下方当前显示的是中文压缩摘要。' : '统计与观察基于完整英文原文，不包含中文压缩摘要。')
      : (pane.tool === 'openwiki'
        ? '统计中文原文；源码超链接只计可点链接，不包含纯文本源码路径。'
        : '统计与观察基于工具生成的中文原文，不包含审计评语。')
    pane.outputRoot.replaceChildren(heading, metrics, outputElement('p', 'compare-output-language', pane.outputNote || languageNote))
    if (!profile || !Array.isArray(profile.observations) || !profile.observations.length) {
      pane.outputRoot.append(outputElement('p', 'compare-output-unavailable', '产物重点资料暂未加载；完整 Wiki 仍可在下方阅读。'))
      return
    }
    const observations = outputElement('ul', 'compare-output-observations')
    for (const observation of profile.observations.slice(0, 2)) {
      const row = outputElement('li', 'compare-output-observation')
      const description = outputElement('div', '')
      if (observation.title) description.append(outputElement('strong', '', observation.title))
      description.append(outputElement('p', '', observation.text))
      row.append(description)
      if (observation.evidence?.page === tools[pane.tool].file) {
        const locate = outputElement('button', 'compare-output-locate', '在' + sideLabel + '看依据')
        locate.type = 'button'
        locate.setAttribute('aria-label', '在' + sideLabel + ' ' + tools[pane.tool].name + ' 原文中查看：' + (observation.title || observation.text))
        locate.addEventListener('click', () => showOutputEvidence(pane, observation.evidence))
        row.append(locate)
      }
      observations.append(row)
    }
    pane.outputRoot.append(observations)
  }

  function updateOutputCounts(pane) {
    const original = pane.document?.getElementById('wiki-original')
    if (!original) return
    const sourcePrefix = '/openai/openai-builder-lab-solution/blob/' + outputCommit + '/'
    const counts = {
      documents: original.querySelectorAll('.wiki-doc').length,
      sections: original.querySelectorAll('.wiki-doc h2').length,
      codeBlocks: [...original.querySelectorAll('.wiki-doc pre')].filter(node => !node.closest('.mermaid')).length,
      diagrams: original.querySelectorAll('.wiki-doc .mermaid').length,
      sourceLinks: [...original.querySelectorAll('.wiki-doc a[href]')].filter(link => {
        try {
          const url = new URL(link.getAttribute('href'), pane.document.baseURI)
          return url.origin === 'https://github.com' && url.pathname.startsWith(sourcePrefix)
        } catch (_) { return false }
      }).length
    }
    if (JSON.stringify(counts) === JSON.stringify(pane.outputCounts) && !pane.outputNote) return
    pane.outputCounts = counts
    pane.outputNote = ''
    renderOutputProfile(pane)
  }

  function updateSyncAvailability() {
    const available = panes.left.accessible && panes.right.accessible
    syncControl.disabled = !available
    syncControl.checked = available && syncWanted
    syncNote.textContent = available
      ? '默认独立滚动；相同进度不代表内容一一对应。'
      : '章节与同步滚动需浏览器允许读取嵌入页；正文仍可独立阅读。'
  }

  function loadPane(pane) {
    pane.loadToken += 1
    pane.cleanup?.()
    pane.cleanup = null
    window.clearTimeout(pane.readyTimer)
    if (pane.scrollFrame !== null) window.cancelAnimationFrame(pane.scrollFrame)
    pane.scrollFrame = null
    pane.accessible = false
    pane.document = null
    pane.outputCounts = null
    pane.outputNote = '正在读取完整原文的结构；不使用审计区或中文摘要计数。'
    pane.anchorVerified = false
    pane.chapters = []
    pane.currentAnchor = ''
    pane.userNavigated = false
    pane.pendingAnchor = ''
    pane.loading.hidden = false
    pane.root.setAttribute('aria-busy', 'true')
    pane.loading.firstElementChild.textContent = '正在加载 ' + tools[pane.tool].name + '…'
    pane.status.textContent = '正在加载完整产物'
    pane.progress.textContent = '0%'
    pane.toolSelect.value = pane.tool
    pane.languageSelect.replaceChildren(new Option(pane.tool === 'devinwiki' ? 'English Original' : '工具原文 · 中文', 'original'))
    if (pane.tool === 'devinwiki') pane.languageSelect.add(new Option('中文压缩摘要（非原文）', 'zh'))
    pane.languageSelect.disabled = pane.tool !== 'devinwiki'
    pane.languageSelect.value = pane.language
    pane.provenance.textContent = pane.language === 'zh'
      ? '展厅制作的中文压缩摘要，不是工具原文，也不是完整翻译。'
      : tools[pane.tool].source
    pane.root.dataset.summary = String(pane.language === 'zh')
    pane.iframe.title = (pane.side === 'left' ? '左侧：' : '右侧：') + tools[pane.tool].name + (pane.language === 'zh' ? ' 中文压缩摘要' : ' 完整 Wiki 原文')
    resetChapters(pane, '正在读取章节')
    renderOutputProfile(pane)
    updateOpenLink(pane)
    updateSyncAvailability()
    pane.iframe.src = paneURL(pane, true)
    const token = pane.loadToken
    pane.readyTimer = window.setTimeout(() => {
      if (token !== pane.loadToken) return
      degradePane(pane, '加载时间较长，已显示嵌入页。若仍为空白，请打开单页检查。')
    }, 15000)
  }

  function degradePane(pane, message) {
    window.clearTimeout(pane.readyTimer)
    pane.loading.hidden = true
    pane.root.setAttribute('aria-busy', 'false')
    pane.accessible = false
    pane.outputNote = '浏览器未能读取完整原文结构；“未读取”不代表数量为 0。'
    renderOutputProfile(pane)
    pane.status.textContent = message
    pane.progress.textContent = '独立阅读'
    resetChapters(pane, '目录不可用，请在正文内阅读')
    updateSyncAvailability()
  }

  function applyReaderLayout(doc, language) {
    doc.body.classList.add('embed-reader')
    doc.body.classList.remove('hide-technical')
    doc.documentElement.style.scrollBehavior = 'auto'
    const existing = doc.getElementById('compare-reader-adapter')
    if (!existing) {
      const style = doc.createElement('style')
      style.id = 'compare-reader-adapter'
      style.textContent = `
        html { scroll-behavior: auto !important; }
        body.embed-reader { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #1f2329; font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif; }
        body.embed-reader > .topbar, body.embed-reader > .page-hero, body.embed-reader > .explanation-overview, body.embed-reader > .issue-overview, body.embed-reader > .quality-overview, body.embed-reader .reader-layout > .toc, body.embed-reader .reader-layout > .audit-rail { display: none !important; }
        body.embed-reader .reader-layout { display: block !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
        body.embed-reader .reader { width: 100% !important; min-width: 0 !important; }
        body.embed-reader .wiki-doc { margin: 0 !important; padding: 22px 24px 28px !important; border: 0 !important; border-bottom: 1px solid #e2e5e9 !important; border-radius: 0 !important; background: #fff !important; box-shadow: none !important; font-size: 14px; line-height: 1.85; }
        body.embed-reader .wiki-doc h1, body.embed-reader .wiki-doc h2, body.embed-reader .wiki-doc h3 { font-family: inherit; letter-spacing: 0; }
        body.embed-reader .wiki-doc h1 { margin: 10px 0 20px; font-size: 25px !important; line-height: 1.4; }
        body.embed-reader .wiki-doc h2 { margin-top: 30px; font-size: 21px !important; border-color: #e2e5e9; }
        body.embed-reader .wiki-doc h3 { font-size: 17px !important; }
        body.embed-reader .wiki-doc a { color: #245bcc; overflow-wrap: anywhere; }
        body.embed-reader .doc-kicker { color: #646a73; border-color: #e2e5e9; letter-spacing: .02em; }
        body.embed-reader .wiki-doc pre { color: #313943; background: #f5f6f8; border: 1px solid #e4e7eb; font-size: 12px; }
        body.embed-reader .wiki-doc :not(pre) > code { color: #3b4453; background: #f0f2f5; overflow-wrap: anywhere; }
        body.embed-reader .wiki-doc th, body.embed-reader .wiki-doc td { border-color: #dfe3e8; }
        body.embed-reader .wiki-doc th { background: #f5f6f8; }
        body.embed-reader .translation-notice { margin: 0; padding: 14px 24px; border-left: 3px solid #3370ff; background: #f0f5ff; font-size: 12px; }
        body.embed-reader .anchor-alias { top: 0; }
        @media(max-width: 400px) { body.embed-reader .wiki-doc { padding: 18px 16px 24px !important; } }
      `
      doc.head.appendChild(style)
    }
    doc.querySelectorAll('[data-language-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.languagePanel !== (language === 'zh' ? 'zh' : 'en'))
    })
    doc.querySelectorAll('[data-language]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.language === (language === 'zh' ? 'zh' : 'en'))
    })
    const panel = doc.getElementById(language === 'zh' ? 'wiki-zh' : 'wiki-original')
    if (panel) panel.classList.remove('hidden')
    return panel
  }

  function collectChapters(pane, panel) {
    pane.chapterSelect.replaceChildren()
    const articleNodes = [...panel.querySelectorAll('.wiki-doc')]
    const prefix = pane.language === 'zh' ? 'compare-zh-section-' : 'compare-section-'
    articleNodes.forEach((article, articleIndex) => {
      const name = article.querySelector('h1')?.textContent.trim() || '第 ' + (articleIndex + 1) + ' 章'
      if (!article.id) return
      const group = document.createElement('optgroup')
      group.label = (articleIndex + 1) + '. ' + name.slice(0, 100)
      group.appendChild(new Option('章首 · ' + name.slice(0, 100), article.id))
      pane.chapters.push({ id: article.id, node: article })
      article.querySelectorAll('h2').forEach((heading, headingIndex) => {
        if (!heading.id) heading.id = prefix + (articleIndex + 1) + '-' + (headingIndex + 1)
        group.appendChild(new Option(heading.textContent.trim().slice(0, 120), heading.id))
        pane.chapters.push({ id: heading.id, node: heading })
      })
      pane.chapterSelect.appendChild(group)
    })
    pane.chapterSelect.disabled = !pane.chapters.length
    if (!pane.chapters.length) resetChapters(pane, '未找到可跳转章节，请在正文内阅读')
  }

  function scrollToAnchor(pane, anchor) {
    if (!pane.accessible || !anchor) return false
    const target = pane.document.getElementById(anchor)
    const panel = pane.document.getElementById(pane.language === 'zh' ? 'wiki-zh' : 'wiki-original')
    if (!target || !panel?.contains(target)) {
      pane.status.textContent = '未找到指定的原文章节，已保留完整正文，可从章节菜单选择。'
      return false
    }
    pane.anchorVerified = true
    const win = pane.iframe.contentWindow
    win.scrollTo({ top: win.scrollY + target.getBoundingClientRect().top, behavior: 'instant' })
    return true
  }

  function updateLocationStatus(pane) {
    if (!pane.accessible || !pane.match) return
    const state = pane.document.body.dataset.highlightStatus
    if (state === 'not-found') {
      pane.status.textContent = '未找到指定引文；已保留完整正文，请按章节核对。'
      if (pane.anchorVerified) scrollToAnchor(pane, pane.anchor)
    } else if (state === 'found') {
      pane.status.textContent = '已标出相关原文及上下文 · 标记不属于工具产物'
    }
  }

  function updateReadingProgress(pane) {
    if (!pane.accessible) return
    const scroller = pane.document.scrollingElement || pane.document.documentElement
    const available = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const ratio = available ? Math.max(0, Math.min(1, scroller.scrollTop / available)) : 0
    pane.progress.textContent = Math.round(ratio * 100) + '%'
    let current = pane.chapters[0]
    for (const chapter of pane.chapters) {
      if (chapter.node.getBoundingClientRect().top <= 95) current = chapter
      else break
    }
    if (current) {
      pane.currentAnchor = current.id
      pane.chapterSelect.value = current.id
    }
    if (!syncControl.checked || performance.now() < pane.suppressUntil) return
    const other = panes[pane.side === 'left' ? 'right' : 'left']
    if (!other.accessible) return
    const otherScroller = other.document.scrollingElement || other.document.documentElement
    const otherAvailable = Math.max(0, otherScroller.scrollHeight - otherScroller.clientHeight)
    other.suppressUntil = performance.now() + 180
    other.iframe.contentWindow.scrollTo({ top: ratio * otherAvailable, behavior: 'instant' })
  }

  function onFrameLoad(pane) {
    if (!pane.iframe.getAttribute('src')) return
    try {
      const doc = pane.iframe.contentDocument
      if (!doc || !doc.body) throw new Error('unavailable-document')
      if (new URL(doc.location.href).pathname.split('/').pop() !== tools[pane.tool].file) return
      window.clearTimeout(pane.readyTimer)
      const panel = applyReaderLayout(doc, pane.language)
      if (!panel) {
        degradePane(pane, '嵌入页中未找到 Wiki 正文，请打开单页查看。')
        return
      }
      pane.document = doc
      pane.accessible = true
      updateOutputCounts(pane)
      pane.suppressUntil = performance.now() + 600
      collectChapters(pane, panel)
      pane.status.textContent = pane.language === 'zh' ? '中文压缩摘要 · 不用于替代原文核对' : '完整原文 · 可独立滚动'
      pane.loading.hidden = true
      pane.root.setAttribute('aria-busy', 'false')
      if (pane.anchor) {
        const target = doc.getElementById(pane.anchor)
        if (!target || !panel.contains(target)) {
          pane.status.textContent = '指定锚点不存在，已展示完整正文；可重新选择章节。'
        } else {
          pane.anchorVerified = true
          updateOpenLink(pane)
          if (!pane.match) window.requestAnimationFrame(() => scrollToAnchor(pane, pane.anchor))
        }
      }
      const onScroll = () => {
        if (pane.scrollFrame !== null) return
        pane.scrollFrame = window.requestAnimationFrame(() => {
          pane.scrollFrame = null
          updateReadingProgress(pane)
        })
      }
      pane.iframe.contentWindow.addEventListener('scroll', onScroll, { passive: true })
      const onDirectInput = () => {
        pane.suppressUntil = 0
        pane.userNavigated = true
        pane.pendingAnchor = ''
      }
      const onDiagramsReady = () => {
        updateOutputCounts(pane)
        if (pane.pendingAnchor) {
          scrollToAnchor(pane, pane.pendingAnchor)
          pane.pendingAnchor = ''
        } else if (!pane.userNavigated) {
          if (!pane.match && pane.anchorVerified) scrollToAnchor(pane, pane.anchor)
          updateLocationStatus(pane)
        }
        updateReadingProgress(pane)
      }
      doc.addEventListener('wheel', onDirectInput, { passive: true })
      doc.addEventListener('touchstart', onDirectInput, { passive: true })
      doc.addEventListener('keydown', onDirectInput)
      doc.addEventListener('pointerdown', onDirectInput, { passive: true })
      doc.addEventListener('wiki-diagrams-ready', onDiagramsReady)
      pane.cleanup = () => {
        doc.defaultView?.removeEventListener('scroll', onScroll)
        doc.removeEventListener('wheel', onDirectInput)
        doc.removeEventListener('touchstart', onDirectInput)
        doc.removeEventListener('keydown', onDirectInput)
        doc.removeEventListener('pointerdown', onDirectInput)
        doc.removeEventListener('wiki-diagrams-ready', onDiagramsReady)
      }
      updateLocationStatus(pane)
      updateReadingProgress(pane)
      updateSyncAvailability()
    } catch (error) {
      const local = window.location.protocol === 'file:'
      const accessRestricted = error.name === 'SecurityError' || error.message === 'unavailable-document'
      degradePane(pane, accessRestricted
        ? (local
          ? '本地文件安全限制：可独立阅读；章节菜单和同步滚动不可用。打开网站版可恢复。'
          : '浏览器限制读取嵌入页：可独立阅读；章节菜单和同步滚动不可用。')
        : '阅读控件适配失败，已保留原页；请通过“打开单页”继续阅读。')
    }
  }

  syncControl.addEventListener('change', () => {
    syncWanted = syncControl.checked
    updateURL()
    if (syncWanted) announce('已开启按百分比同步。不同工具的相同位置不代表相同内容。')
  })

  document.getElementById('compare-swap').addEventListener('click', () => {
    const left = {
      tool: panes.left.tool,
      language: panes.left.language,
      anchor: panes.left.match ? panes.left.anchor : panes.left.currentAnchor || panes.left.anchor,
      match: panes.left.match
    }
    const right = {
      tool: panes.right.tool,
      language: panes.right.language,
      anchor: panes.right.match ? panes.right.anchor : panes.right.currentAnchor || panes.right.anchor,
      match: panes.right.match
    }
    Object.assign(panes.left, right)
    Object.assign(panes.right, left)
    loadPane(panes.left)
    loadPane(panes.right)
    updateURL()
    announce('左右工具与所选章节已交换。')
  })

  document.getElementById('compare-clear-topic').addEventListener('click', () => {
    topicLabel = ''
    for (const pane of Object.values(panes)) {
      pane.match = ''
      pane.anchor = pane.currentAnchor || pane.anchor
      loadPane(pane)
    }
    updateURL()
  })

  document.getElementById('compare-copy').addEventListener('click', async () => {
    for (const pane of Object.values(panes)) {
      if (!pane.match) pane.anchor = pane.currentAnchor || pane.anchor
    }
    const url = updateURL()
    try {
      if (window.location.protocol === 'file:') throw new Error('local-share')
      await navigator.clipboard.writeText(url)
      announce('已复制当前工具、语言和章节的对比链接。')
    } catch (_) {
      const share = document.getElementById('compare-share')
      const input = document.getElementById('compare-share-url')
      share.hidden = false
      input.value = url
      input.focus()
      input.select()
      announce(window.location.protocol === 'file:'
        ? '本地地址不能直接发给其他人；请分享网站版链接或完整文件包。'
        : '浏览器未允许自动复制，已选中链接，可手动复制。')
    }
  })

  document.getElementById('compare-output-toggle')?.addEventListener('click', event => {
    const button = event.currentTarget
    const content = document.getElementById('compare-output-body')
    if (!content) return
    content.hidden = !content.hidden
    button.setAttribute('aria-expanded', String(!content.hidden))
    button.textContent = content.hidden ? '展开概览' : '收起概览'
  })

  updateTopic()
  loadPane(panes.left)
  loadPane(panes.right)
  updateURL()
})()

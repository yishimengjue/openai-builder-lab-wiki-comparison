(function () {
  'use strict'
  const data = window.WIKI_ISSUE_COMPARISON_DATA
  const detail = document.getElementById('case-detail')
  if (!detail) return
  if (!data || !Array.isArray(data.cases)) {
    detail.textContent = '案例数据未能加载，请刷新页面。也可以先打开原问题清单。'
    detail.setAttribute('role', 'alert')
    return
  }

  const statusLabels = {
    same_issue: '有同类问题',
    mixed: '正确与错误并存',
    correct: '针对本问题说明正确',
    not_covered: '未覆盖这一检查点',
    unreviewed: '本问题尚未核查'
  }
  const toolOrder = ['local-skill', 'codewiki', 'openwiki', 'deepwiki-open', 'devinwiki']
  const tools = toolOrder.map(id => data.tools.find(tool => tool.id === id)).filter(Boolean)
  const allowedPages = new Set(tools.map(tool => tool.page))
  const sourceData = window.WIKI_ISSUE_SOURCE_DATA
  const sourceCases = sourceData?.commit === data.commit && sourceData?.repository === data.repository ? sourceData.cases : {}
  const query = new URLSearchParams(window.location.search)
  const requestedCase = data.cases.find(item => item.id === query.get('case'))
  const requestedCategory = query.get('category')
  const knownCategory = requestedCategory === 'all' || data.categories.some(item => item.id === requestedCategory)
  let selectedCategory = knownCategory ? requestedCategory : requestedCase?.categoryId || 'all'
  if (requestedCase && selectedCategory !== 'all' && requestedCase.categoryId !== selectedCategory) selectedCategory = requestedCase.categoryId
  let selectedCase = requestedCase || data.cases.find(item => selectedCategory === 'all' || item.categoryId === selectedCategory)
  let searchTerm = ''
  let pairLeft = tools.some(tool => tool.id === query.get('left')) ? query.get('left') : 'local-skill'
  let pairRight = tools.some(tool => tool.id === query.get('right')) ? query.get('right') : 'codewiki'
  if (pairLeft === pairRight) pairRight = tools.find(tool => tool.id !== pairLeft).id

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function sourceLink(url, label) {
    try {
      const target = new URL(url)
      if (target.protocol !== 'https:' || target.hostname !== 'github.com' || !target.pathname.startsWith('/openai/openai-builder-lab-solution/blob/' + data.commit + '/')) return null
      const link = el('a', 'case-source-link', label)
      link.href = target.href
      link.target = '_blank'
      link.rel = 'noopener'
      return link
    } catch (_) { return null }
  }

  function evidenceLink(evidence) {
    if (!allowedPages.has(evidence.page)) return null
    const url = new URL(evidence.page, window.location.href)
    url.searchParams.set('language', 'original')
    if (evidence.match) url.searchParams.set('highlight', evidence.match.slice(0, 1000))
    if (evidence.anchor) url.hash = evidence.anchor
    return url.href
  }

  function firstWikiEvidence(result) {
    return result?.evidence?.find(item => item.kind !== 'source' && allowedPages.has(item.page) && (item.match || item.anchor))
  }

  function compareLink(item, leftTool, rightTool) {
    const url = new URL('compare.html', window.location.href)
    url.searchParams.set('left', leftTool)
    url.searchParams.set('right', rightTool)
    url.searchParams.set('topic', item.question || item.title)
    for (const [side, toolId] of [['left', leftTool], ['right', rightTool]]) {
      const evidence = firstWikiEvidence(item.tools[toolId])
      if (evidence?.match) url.searchParams.set(side + 'Match', evidence.match.slice(0, 1000))
      if (evidence?.anchor) url.searchParams.set(side + 'Anchor', evidence.anchor)
    }
    return url.href
  }

  function updateURL() {
    const url = new URL(window.location.href)
    if (selectedCase) url.searchParams.set('case', selectedCase.id)
    else url.searchParams.delete('case')
    url.searchParams.set('category', selectedCategory)
    url.searchParams.set('left', pairLeft)
    url.searchParams.set('right', pairRight)
    try { window.history.replaceState(null, '', url) } catch (_) { /* Local file viewers may restrict history. */ }
  }

  function filteredCases() {
    return data.cases.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory
      const searchable = [item.title, item.question, ...(item.tags || [])].join(' ').toLowerCase()
      return matchesCategory && (!searchTerm || searchable.includes(searchTerm))
    })
  }

  function renderCategories() {
    const nav = document.getElementById('case-categories')
    nav.replaceChildren()
    const categories = [{ id: 'all', label: '全部问题', description: '查看全部具体案例' }, ...data.categories]
    categories.forEach(category => {
      const button = el('button', 'case-category')
      button.type = 'button'
      button.dataset.category = category.id
      button.setAttribute('aria-pressed', String(category.id === selectedCategory))
      const count = data.cases.filter(item => category.id === 'all' || item.categoryId === category.id).length
      const top = el('span', 'case-category-title')
      top.append(el('strong', '', category.label), el('span', 'case-category-count', String(count)))
      button.append(top, el('span', 'case-category-description', category.description))
      button.addEventListener('click', () => {
        selectedCategory = category.id
        searchTerm = ''
        document.getElementById('case-search').value = ''
        if (!filteredCases().some(item => item.id === selectedCase?.id)) selectedCase = filteredCases()[0]
        renderCategories()
        renderList()
        renderDetail()
        updateURL()
        nav.querySelector('[data-category="' + category.id + '"]')?.focus({ preventScroll: true })
      })
      nav.append(button)
    })
  }

  function renderList() {
    const list = document.getElementById('case-list')
    const cases = filteredCases()
    document.getElementById('case-count').textContent = cases.length + ' 个案例'
    list.replaceChildren()
    if (!cases.length) list.append(el('p', 'case-empty', '没有匹配案例。请清空搜索或切换分类。'))
    cases.forEach((item, index) => {
      const button = el('button', 'case-list-item')
      button.type = 'button'
      button.dataset.caseId = item.id
      button.setAttribute('aria-pressed', String(item.id === selectedCase?.id))
      button.append(el('span', 'case-item-number', String(index + 1).padStart(2, '0')))
      const content = el('span', 'case-item-content')
      content.append(el('strong', '', item.title), el('small', '', item.kind === 'quality' ? '质量观察 · 不计为事实错误' : '源码事实核对'))
      button.append(content)
      button.addEventListener('click', () => {
        selectedCase = item
        renderList()
        renderDetail()
        updateURL()
        list.querySelector('[data-case-id="' + item.id + '"]')?.focus({ preventScroll: true })
      })
      list.append(button)
    })
  }

  function toolDetail(item, tool) {
    const result = item.tools[tool.id] || { status: 'unreviewed', summary: '尚未核查该工具的这一问题。', evidence: [] }
    const explanation = sourceCases?.[item.id]?.tools?.[tool.id] || {}
    return { result, explanation, status: Object.hasOwn(statusLabels, result.status) ? result.status : 'unreviewed' }
  }

  function relevantSources(item, tool) {
    const caseSources = sourceCases?.[item.id]
    const ids = caseSources?.tools?.[tool.id]?.sourceIds || []
    return (caseSources?.sourceExcerpts || []).filter(source => ids.includes(source.id))
  }

  function excerptURL(source) {
    return 'https://github.com/' + data.repository + '/blob/' + data.commit + '/' + source.file + '#L' + source.startLine + '-L' + source.endLine
  }

  function sourceLinks(item, tool) {
    const container = el('div', 'case-source-links')
    const excerpts = relevantSources(item, tool)
    const sources = excerpts.length
      ? excerpts.map(source => ({ url: excerptURL(source), label: source.title + ' · L' + source.startLine + '-L' + source.endLine }))
      : item.truth.codeUrls?.length ? item.truth.codeUrls : [{ url: item.truth.codeUrl, label: '查看固定版本源码' }]
    sources.forEach((source, index) => {
      const value = typeof source === 'string' ? { url: source, label: '源码依据 ' + (index + 1) } : source
      const link = sourceLink(value.url, value.label + '（新标签页）')
      if (link) container.append(link)
    })
    return container
  }

  function inlineOriginal(evidence, tool, index) {
    const href = evidenceLink(evidence)
    if (!href) return null
    const preview = el('details', 'case-inline-original')
    preview.append(el('summary', '', '在本页展开这段 Wiki 原貌'))
    preview.addEventListener('toggle', () => {
      if (!preview.open || preview.querySelector('iframe')) return
      const url = new URL(href)
      url.searchParams.set('embed', '1')
      const frame = el('iframe', 'case-original-frame')
      frame.title = tool.label + ' · 原文证据 ' + (index + 1)
      const note = el('p', 'case-inline-state', '正在载入工具原文；下方源码对照会保留。')
      frame.addEventListener('load', () => {
        try {
          const doc = frame.contentDocument
          if (!doc) {
            note.textContent = '浏览器限制了内嵌阅读，无法确认定位；可使用上方完整 Wiki 链接。'
            return
          }
          if (!doc.querySelector('#wiki-original')) {
            note.textContent = '未找到工具原文页面，请使用上方完整 Wiki 链接检查。'
            return
          }
          const updateFrameNote = () => {
            note.textContent = doc.body.dataset.highlightStatus === 'not-found' ? '未能自动定位这段原话，可使用上方链接查看完整 Wiki。' : '工具原文，可在框内独立滚动；未改写正文。'
          }
          updateFrameNote()
          doc.addEventListener('wiki-diagrams-ready', updateFrameNote, { once: true })
        } catch (_) {
          note.textContent = '当前浏览器限制内嵌阅读，请使用上方完整 Wiki 链接。'
        }
      })
      frame.addEventListener('error', () => { note.textContent = '原文未能载入，请使用上方完整 Wiki 链接。' })
      frame.src = url.href
      preview.append(note, frame)
    })
    return preview
  }

  function renderWiki(item, tool, expanded) {
    const { result, explanation, status } = toolDetail(item, tool)
    const container = el('div', 'case-wiki-content')
    if (explanation.wikiMeaning) {
      const meaning = el('p', 'case-wiki-meaning')
      meaning.append(el('span', 'case-caption', '通俗概括（非原文）'), document.createTextNode(explanation.wikiMeaning))
      container.append(meaning)
    }
    if (tool.id === 'devinwiki') container.append(el('p', 'case-provenance', '证据取自英文原文，不使用中文压缩摘要。'))
    const evidenceList = el('div', 'case-evidence-list')
    ;(result.evidence || []).forEach((evidence, index) => {
      const evidenceBlock = el('section', 'case-evidence')
      evidenceBlock.append(el('h4', '', evidence.label || '原文证据 ' + (index + 1)))
      if (evidence.quote) evidenceBlock.append(el('blockquote', '', evidence.quote))
      if (evidence.kind === 'source') {
        const link = sourceLink(evidence.url, '查看源码')
        if (link) evidenceBlock.append(link)
      } else {
        const href = evidenceLink(evidence)
        if (href) {
          const link = el('a', 'case-original-link', '在完整 Wiki 中定位（新标签页）')
          link.href = href
          link.target = '_blank'
          link.rel = 'noopener'
          evidenceBlock.append(link)
        }
        if (expanded) {
          const preview = inlineOriginal(evidence, tool, index)
          if (preview) {
            if (item.kind === 'quality' && index === 0) preview.open = true
            evidenceBlock.append(preview)
          }
        }
      }
      evidenceList.append(evidenceBlock)
    })
    if (!evidenceList.children.length) evidenceList.append(el('p', 'case-no-evidence', status === 'unreviewed' ? '没有足够的核查证据，暂不判断好坏。' : '没有找到直接回答该检查点的原文，不能据此判为正确或错误。'))
    container.append(evidenceList)
    return container
  }

  function renderSourceExcerpt(source) {
    const block = el('details', 'case-source-excerpt')
    block.open = true
    block.dataset.sourceId = source.id
    const summary = el('summary', '', source.title)
    block.append(summary, el('p', 'case-source-takeaway', source.takeaway), el('code', 'case-source-file', source.file))
    const link = sourceLink(excerptURL(source), '查看源码 L' + source.startLine + '-L' + source.endLine + '（新标签页）')
    if (link) block.append(link)
    const pre = el('pre', 'case-source-code')
    pre.tabIndex = 0
    pre.setAttribute('aria-label', source.title + '，第 ' + source.startLine + ' 至 ' + source.endLine + ' 行原始代码')
    const code = el('code')
    const lines = source.code.replace(/\n$/, '').split('\n')
    lines.forEach((text, index) => {
      const line = el('span', 'case-source-line')
      const number = el('span', 'case-source-line-number', String(source.startLine + index))
      number.setAttribute('aria-hidden', 'true')
      line.append(number, el('span', 'case-source-line-text', text || ' '))
      code.append(line)
    })
    pre.append(code)
    block.append(pre)
    return block
  }

  function renderSource(item, tool, expanded) {
    const { explanation, status } = toolDetail(item, tool)
    const container = el('div', 'case-source-content')
    const excerpts = relevantSources(item, tool)
    if (explanation.scopeNote) container.append(el('p', 'case-scope-note', explanation.scopeNote))
    if (item.kind === 'quality') {
      const finding = status === 'same_issue' ? '已核验样本：原文引用是纯文本路径，不能直接点击。' : status === 'correct' ? '已核验样本：原文引用是真实超链接，可以打开对应的固定版本源码。' : '没有同一行程说明，缺少可对比的引用样本；不判为链接正确或错误。'
      container.append(el('p', '', finding), el('p', 'case-source-boundary', '本项证据是上方 Wiki 原貌中的引用结构，不是应用代码。展厅补加的跳转按钮不算工具原有的引用。'))
      return container
    }
    if (expanded && excerpts.length) {
      excerpts.forEach(source => container.append(renderSourceExcerpt(source)))
    } else {
      container.append(el('p', '', item.truth.summary), sourceLinks(item, tool))
    }
    if (expanded && !excerpts.length) container.append(el('p', 'case-no-evidence', '内嵌源码摘录未加载。请用固定版本链接核对，不将缺失摘录当作正确证明。'))
    return container
  }

  function renderExplanation(item, tool) {
    const { result, explanation } = toolDetail(item, tool)
    const container = el('div', 'case-explanation-content')
    container.append(el('p', '', explanation.explanation || result.summary))
    return container
  }

  function renderSolution(item, tool) {
    const { result, explanation } = toolDetail(item, tool)
    const container = el('div', 'case-solution-content')
    container.append(el('p', '', explanation.skillAction || '生成时逐项核对这一检查点，并把有证据的结论同步到概览和专页。'))
    if (result.preserve) {
      const retained = el('details', 'case-preserve-note')
      retained.append(el('summary', '', '已有内容中可保留的部分'), el('p', '', result.preserve))
      container.append(retained)
    }
    return container
  }

  const comparisonRows = [
    { id: 'wiki', label: 'Wiki 表述', render: renderWiki },
    { id: 'source', label: '源码实际', render: renderSource },
    { id: 'explanation', label: '问题简要解释', render: renderExplanation },
    { id: 'solution', label: '解决方法 · 优化生成 Skill', render: renderSolution }
  ]

  function rowLabel(row, item) {
    return row.id === 'source' && item.kind === 'quality' ? '引用实际（非源码行为）' : row.label
  }

  function baselineSummary(item) {
    return item.kind === 'quality' ? '检查所列行程说明中的源码引用：正文是否有可点击、指向正确固定版本文件的链接。判断只限这些引用样本，不代表整篇 Wiki 的引用或技术结论都已核验。' : item.truth.summary
  }

  function renderPairSources(item, pairTools) {
    const container = el('div', 'case-paired-source-content')
    const sourcesBySide = pairTools.map(tool => relevantSources(item, tool))
    const idsBySide = sourcesBySide.map(sources => new Set(sources.map(source => source.id)))
    const unique = [...new Map(sourcesBySide.flat().map(source => [source.id, source])).values()]
    const common = source => idsBySide.every(ids => ids.has(source.id))
    unique.sort((left, right) => Number(common(right)) - Number(common(left)))
    const scopeNotes = pairTools.map(tool => toolDetail(item, tool).explanation.scopeNote)
    if (unique.length && scopeNotes.some(Boolean)) {
      const scopes = el('div', 'case-pair-columns case-pair-scopes')
      pairTools.forEach((tool, index) => {
        const cell = el('div', 'case-pair-cell')
        cell.append(el('p', 'case-pair-cell-label', tool.label), el('p', 'case-scope-note', scopeNotes[index] || '按本案例的固定版本源码核对，不扩大到整份 Wiki。'))
        scopes.append(cell)
      })
      container.append(scopes)
    }
    if (!unique.length) {
      const columns = el('div', 'case-pair-columns')
      pairTools.forEach(tool => {
        const cell = el('div', 'case-pair-cell')
        cell.dataset.tool = tool.id
        cell.append(el('p', 'case-pair-cell-label', tool.label), renderSource(item, tool, true))
        columns.append(cell)
      })
      container.append(columns)
      return container
    }
    unique.forEach(source => {
      const columns = el('div', 'case-pair-columns case-source-aligned-row')
      columns.dataset.sourceId = source.id
      pairTools.forEach((tool, index) => {
        const cell = el('div', 'case-pair-cell')
        cell.dataset.tool = tool.id
        cell.setAttribute('role', 'group')
        cell.setAttribute('aria-label', tool.label + ' · 源码实际 · ' + source.title)
        cell.append(el('p', 'case-pair-cell-label', tool.label + (common(source) ? ' · 共同核对依据' : ' · 补充上下文')))
        if (idsBySide[index].has(source.id)) cell.append(renderSourceExcerpt(source))
        else cell.append(el('p', 'case-source-not-used', '这段代码用于核对另一侧所引表述。本次对 ' + tool.label + ' 的判断使用其他对齐行中的依据，不据此推断它是否读过这个文件。'))
        columns.append(cell)
      })
      container.append(columns)
    })
    return container
  }

  function renderTool(item, tool) {
    const { status } = toolDetail(item, tool)
    const card = el('article', 'case-tool-card')
    card.dataset.tool = tool.id
    card.id = 'case-tool-' + tool.id
    const heading = el('header', 'case-tool-heading')
    heading.append(el('h3', '', tool.label), el('span', 'case-status case-status-' + status, statusLabels[status]))
    card.append(heading)
    comparisonRows.forEach((row, index) => {
      const section = el('section', 'case-tool-section')
      section.dataset.row = row.id
      section.append(el('h4', 'case-field-title', String(index + 1).padStart(2, '0') + ' ' + rowLabel(row, item)), row.render(item, tool, false))
      card.append(section)
    })
    const footer = el('footer', 'case-tool-footer')
    const pairButton = el('button', 'case-pair-link', tool.id === 'local-skill' ? '在下方与 CodeWiki 对照' : '在下方与 Local Skill 对照')
    pairButton.type = 'button'
    pairButton.addEventListener('click', () => {
      pairLeft = 'local-skill'
      pairRight = tool.id === 'local-skill' ? 'codewiki' : tool.id
      renderPairComparison(item)
      updateURL()
      document.getElementById('case-pair').scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    footer.append(pairButton)
    card.append(footer)
    return card
  }

  function renderPairComparison(item) {
    const host = document.getElementById('case-pair')
    if (!host) return
    host.replaceChildren()
    const heading = el('div', 'case-pair-heading')
    const title = el('h3', '', '同一问题，两两对照')
    title.id = 'case-pair-title'
    heading.append(title, el('p', '', '左右按同样四项排列。原文和源码都留在这里，不必来回切页。'))
    host.append(heading)
    const controls = el('div', 'case-pair-controls')
    const selects = {}
    for (const [side, label] of [['left', '左侧工具'], ['right', '右侧工具']]) {
      const field = el('div', 'case-pair-field')
      const select = el('select')
      select.id = 'case-pair-' + side
      select.setAttribute('aria-label', label)
      tools.forEach(tool => select.add(new Option(tool.label, tool.id)))
      const labelElement = el('label', '', label)
      labelElement.htmlFor = select.id
      field.append(labelElement, select)
      controls.append(field)
      selects[side] = select
      select.addEventListener('change', () => {
        const previous = side === 'left' ? pairLeft : pairRight
        if (side === 'left') {
          pairLeft = select.value
          if (pairRight === pairLeft) pairRight = previous
        } else {
          pairRight = select.value
          if (pairLeft === pairRight) pairLeft = previous
        }
        refreshPair()
        updateURL()
      })
    }
    const actions = el('div', 'case-pair-actions')
    const swap = el('button', '', '交换左右')
    swap.type = 'button'
    swap.addEventListener('click', () => {
      ;[pairLeft, pairRight] = [pairRight, pairLeft]
      refreshPair()
      updateURL()
    })
    const fullReader = el('a', 'button', '查看两份完整 Wiki')
    fullReader.target = '_blank'
    fullReader.rel = 'noopener'
    actions.append(swap, fullReader)
    controls.append(actions)
    host.append(controls)
    const baseline = el('div', 'case-pair-baseline')
    baseline.append(el('strong', '', item.kind === 'quality' ? '同一检查标准：正文引用能否定位源码' : '同一份源码，不是两套实现'), el('p', '', baselineSummary(item)))
    baseline.append(el('small', '', '固定版本 ' + data.commit.slice(0, 8) + '。工具讲解范围不同，不等于源码发生变化；缺少说明不自动算作错误。'))
    host.append(baseline)
    const body = el('div', 'case-pair-body')
    host.append(body)

    function refreshPair() {
      selects.left.value = pairLeft
      selects.right.value = pairRight
      fullReader.href = compareLink(item, pairLeft, pairRight)
      host.dataset.leftTool = pairLeft
      host.dataset.rightTool = pairRight
      document.getElementById('case-announcement').textContent = '当前对照：' + item.title + '。左侧 ' + tools.find(tool => tool.id === pairLeft).label + '，右侧 ' + tools.find(tool => tool.id === pairRight).label + '。'
      body.replaceChildren()
      const pairTools = [pairLeft, pairRight].map(id => tools.find(tool => tool.id === id))
      const columnHeadings = el('div', 'case-pair-column-headings')
      pairTools.forEach(tool => {
        const { status } = toolDetail(item, tool)
        const columnHeading = el('div', 'case-pair-column-heading')
        columnHeading.append(el('strong', '', tool.label), el('span', 'case-status case-status-' + status, statusLabels[status]))
        columnHeadings.append(columnHeading)
      })
      body.append(columnHeadings)
      comparisonRows.forEach((row, index) => {
        const section = el('section', 'case-pair-row')
        section.dataset.row = row.id
        const rowTitle = el('h4', 'case-pair-row-title', String(index + 1).padStart(2, '0') + ' ' + rowLabel(row, item))
        section.append(rowTitle)
        if (row.id === 'source') {
          const leftIds = relevantSources(item, pairTools[0]).map(source => source.id).sort().join(',')
          const rightIds = relevantSources(item, pairTools[1]).map(source => source.id).sort().join(',')
          const note = item.kind === 'quality' ? '对比的是上方 Wiki 原文中的引用方式；应用源码不是此项的判错证据。' : leftIds && leftIds === rightIds ? '左右引用的是同一组源码行。要比较的是上方两份 Wiki 对这些代码的解释。' : '共同的源码依据放在同一行，补充上下文另行标注。所有片段均来自同一固定版本，不是工具各自的实现。'
          section.append(el('p', 'case-pair-source-note', note))
          section.append(renderPairSources(item, pairTools))
          body.append(section)
          return
        }
        const columns = el('div', 'case-pair-columns')
        pairTools.forEach(tool => {
          const cell = el('div', 'case-pair-cell')
          cell.dataset.tool = tool.id
          cell.setAttribute('role', 'group')
          cell.setAttribute('aria-label', tool.label + ' · ' + row.label)
          cell.append(el('p', 'case-pair-cell-label', tool.label), row.render(item, tool, true))
          columns.append(cell)
        })
        section.append(columns)
        body.append(section)
      })
    }
    refreshPair()
  }

  function renderDetail() {
    detail.replaceChildren()
    const item = selectedCase
    if (!item) {
      delete detail.dataset.caseId
      detail.append(el('div', 'case-empty-detail', '请选择左侧案例，或清空搜索条件。'))
      document.getElementById('case-announcement').textContent = '没有匹配的案例。'
      return
    }
    detail.dataset.caseId = item.id
    const category = data.categories.find(category => category.id === item.categoryId)
    const header = el('header', 'case-detail-heading')
    header.append(el('p', 'case-breadcrumb', (category?.label || '具体案例') + ' / ' + (item.kind === 'quality' ? '质量观察' : '事实核对')))
    const title = el('h2', '', item.title)
    title.id = 'current-case-title'
    detail.setAttribute('aria-labelledby', title.id)
    header.append(title, el('p', 'case-question', item.question))
    if (item.tags?.length) {
      const tags = el('div', 'case-tags')
      item.tags.forEach(tag => tags.append(el('span', '', tag)))
      header.append(tags)
    }
    detail.append(header)

    const overview = el('div', 'case-status-overview')
    overview.setAttribute('aria-label', '五工具在当前案例中的判断')
    tools.forEach(tool => {
      const status = item.tools[tool.id]?.status || 'unreviewed'
      const button = el('button', 'case-status-button')
      button.type = 'button'
      button.setAttribute('aria-label', tool.label + '：' + (statusLabels[status] || statusLabels.unreviewed) + '，查看证据')
      button.append(el('strong', '', tool.label), el('span', 'case-status case-status-' + status, statusLabels[status] || statusLabels.unreviewed))
      button.addEventListener('click', () => {
        const card = document.getElementById('case-tool-' + tool.id)
        const scroll = detail.querySelector('.case-comparison-scroll')
        if (!card || !scroll) return
        const grid = scroll.firstElementChild
        const firstCard = grid.firstElementChild
        const pinned = window.matchMedia('(min-width: 851px)').matches && tool.id !== 'local-skill' ? firstCard.offsetWidth : 0
        const left = card.getBoundingClientRect().left - grid.getBoundingClientRect().left - pinned
        scroll.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
        scroll.scrollIntoView({ block: 'start', behavior: 'smooth' })
      })
      overview.append(button)
    })
    detail.append(overview)

    const truth = el('section', 'case-truth')
    truth.append(el('h3', '', item.kind === 'quality' ? '核查依据与边界' : '源码实际行为'), el('p', '', baselineSummary(item)))
    const evidenceLinks = el('div', 'case-source-links')
    const sources = Array.isArray(item.truth.codeUrls) && item.truth.codeUrls.length ? item.truth.codeUrls : [{ url: item.truth.codeUrl, label: '查看固定版本源码' }]
    sources.forEach((source, index) => {
      const value = typeof source === 'string' ? { url: source, label: '源码依据 ' + (index + 1) } : source
      const link = sourceLink(value.url, value.label || '查看源码')
      if (link) evidenceLinks.append(link)
    })
    truth.append(evidenceLinks)
    if (item.impact) {
      const impact = el('p', 'case-impact')
      impact.append(el('strong', '', '影响：'), document.createTextNode(item.impact))
      truth.append(impact)
    }
    detail.append(truth)
    if (item.reviewNote) detail.append(el('p', 'case-review-note', '复核说明：' + item.reviewNote))

    const comparisonHeading = el('div', 'case-comparison-heading')
    comparisonHeading.append(el('h3', '', '五工具对同一问题的表现'), el('p', '', '按四项逐行核对。状态仅针对本案例，不是工具总评。'))
    const scrollControls = el('div', 'case-scroll-controls')
    const jumpToPair = el('a', 'case-jump-pair', '跳到下方两两对照')
    jumpToPair.href = '#case-pair'
    scrollControls.append(jumpToPair)
    for (const [direction, label] of [[-1, '向左查看'], [1, '向右查看']]) {
      const button = el('button', '', label)
      button.type = 'button'
      button.setAttribute('aria-label', label + '其他工具的证据')
      button.addEventListener('click', () => scroll.scrollBy({ left: direction * grid.firstElementChild.offsetWidth, behavior: 'smooth' }))
      scrollControls.append(button)
    }
    comparisonHeading.append(scrollControls)
    detail.append(comparisonHeading)
    const scroll = el('div', 'case-comparison-scroll')
    scroll.tabIndex = 0
    scroll.setAttribute('aria-label', '五工具对比，可横向滚动')
    const grid = el('div', 'case-tool-grid')
    tools.forEach(tool => grid.append(renderTool(item, tool)))
    scroll.append(grid)
    detail.append(scroll)
    const pair = el('section', 'case-pair')
    pair.id = 'case-pair'
    pair.setAttribute('aria-labelledby', 'case-pair-title')
    detail.append(pair)
    renderPairComparison(item)
  }

  document.getElementById('case-search').addEventListener('input', event => {
    searchTerm = event.target.value.trim().toLowerCase()
    const cases = filteredCases()
    if (!cases.some(item => item.id === selectedCase?.id)) selectedCase = cases[0]
    renderList()
    renderDetail()
    updateURL()
  })

  renderCategories()
  renderList()
  renderDetail()
  updateURL()
  if (window.location.hash === '#case-pair') requestAnimationFrame(() => document.getElementById('case-pair')?.scrollIntoView({ block: 'start' }))
})()

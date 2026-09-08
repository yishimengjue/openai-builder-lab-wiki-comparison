window.WIKI_ISSUE_COMPARISON_DATA = {
  repository: 'openai/openai-builder-lab-solution',
  commit: 'e87f060e4e86d599ee54bdc7b752484944278f85',
  updatedAt: '2026-09-07',
  tools: [
    { id: 'local-skill', label: 'Local Skill', page: 'local-skill.html' },
    { id: 'codewiki', label: 'CodeWiki', page: 'codewiki.html' },
    { id: 'openwiki', label: 'OpenWiki', page: 'openwiki.html' },
    { id: 'deepwiki-open', label: 'DeepWiki Open', page: 'deepwiki-open.html' },
    { id: 'devinwiki', label: 'DeepWiki（Devin 托管版）', page: 'devinwiki.html' }
  ],
  categories: [
    { id: 'capability-flow', label: '功能可用性误判', description: '把已经定义的功能，误写成实际可以运行。' },
    { id: 'data-contract', label: '数据契约核查缺漏', description: '没有核对前后步骤传递的数据能否接上。' },
    { id: 'configuration', label: '配置生效范围误判', description: '弄错设置由谁读取、在哪个阶段生效。' },
    { id: 'async-resource', label: '异常与清理边界误判', description: '夸大错误捕获范围，或误解资源的释放。' },
    { id: 'diagram-consistency', label: '图示与实现不一致', description: '流程图的请求、返回方向或步骤与代码不符。' },
    { id: 'source-navigation', label: '源码引用链接缺失', description: '正文路径不是链接，无法直接点击核对。' }
  ],
  cases: [
    {
      id: 'voice-tool-reachability',
      categoryId: 'capability-flow',
      title: '语音搜索：有工具定义，就真的能触发吗？',
      question: '用户通过语音要求找餐厅时，最终版本的代码能否真的执行搜索？',
      kind: 'fact',
      impact: '若把工具注册当作可运行闭环，会错误承诺语音搜索已经接通，也会遗漏事件入口的验证。',
      truth: {
        summary: '当前事件入口对同一条消息设了两个互相矛盾的条件，语音搜索因此走不到真正执行的步骤。已经写好工具处理函数，不等于它会被调用；这也不代表语音通话本身完全不可用。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/components/voice-mode.tsx#L172-L183'
      },
      localIssueIds: ['LS-01'],
      tags: ['Challenge 5', '声明不等于执行', '概览与深层结论不一致'],
      tools: {
        'local-skill': {
          status: 'mixed',
          summary: '能力概览把语音搜索概括为已经形成闭环；语音工具专页则明确证明同一 type 条件互斥。正确诊断存在，但没有回写到概览。',
          evidence: [
            { quote: '该闭环说明地点搜索是跨文本和语音通道的共享核心能力，但协议适配代码仍分别存在。', page: 'local-skill.html', match: '该闭环说明地点搜索是跨文本和语音通道的共享核心能力', kind: 'wiki', label: '1.4 旅行助手能力面 · 概览结论' },
            { quote: '因为 output 与 event 是同一个对象，同一个 type 字段无法同时满足两个不同字符串，所以 handleToolCall 在这段活动代码中不会被调用。', page: 'local-skill.html', match: '同一个 type 字段无法同时满足两个不同字符串', kind: 'wiki', label: '5.4 语音工具回填桥 · 正确诊断' }
          ],
          preserve: '保留工具清单、回填协议和不可达条件的细粒度分析；这些内容能直接支撑维护工作。',
          repair: '把概览能力表改为“已声明，但当前入口不可达”，将设计流程与当前实现分开。专页的修复建议不是源码已经修好的证据。'
        },
        codewiki: {
          status: 'correct',
          summary: '明确指出同一字段的互斥条件，并把流程图的后续工具步骤限定为源码意图。',
          evidence: [
            { quote: '同一个 type 不可能同时等于两者，因此当前 challenge5 的 Realtime 工具处理分支不可达。', page: 'codewiki.html', match: '同一个 type 不可能同时等于两者', kind: 'wiki', label: '7.3 Realtime 语音限制' },
            { quote: '上图最后四步是源码意图；当前 challenge5 的事件提取条件存在实现缺陷，详见“异常与边界行为”。', page: 'codewiki.html', match: '上图最后四步是源码意图', kind: 'wiki', label: '3.8 Realtime 语音模式 · 图示限定' }
          ],
          preserve: '保留当前实现与设计意图的区分，以及事件字段的具体证据。',
          repair: '本问题无需改判；若后续修复源码，再同步更新可达性结论，而不是提前把建议当作现状。'
        },
        openwiki: {
          status: 'same_issue',
          summary: '把互斥事件条件叙述成可正常触发的搜索闭环，没有指出当前监听器无法进入处理函数。',
          evidence: [
            { quote: "challenge5 让模型能在说话中触发 search_location：当收到 conversation.item.created 事件、且其 type === 'function_call' 时，handleToolCall 执行工具并把结果以 function_call_output 事件写回，再强制 response.create 让模型基于结果继续作答。", page: 'openwiki.html', match: 'challenge5 让模型能在说话中触发 search_location', kind: 'wiki', label: 'Realtime 语音 · challenge4 与 challenge5 差异' }
          ],
          preserve: '保留 search_location 路由复用、function_call_output 与 response.create 的协议职责。',
          repair: '在流程入口标明当前条件互斥；把后面的调用与回填改为意图说明，不能仅凭处理函数存在就判定可运行。'
        },
        'deepwiki-open': {
          status: 'not_covered',
          summary: '介绍音频采集、播放与连接管理，但没有核查这个事件处理条件。此项缺漏不等于其所有语音说明都错误。',
          evidence: [
            { quote: '前端组件负责音频采集、播放和连接管理', page: 'deepwiki-open.html', match: '前端组件负责音频采集、播放和连接管理', anchor: 'page-7', kind: 'wiki', label: '语音集成 · 最近相关职责说明' }
          ],
          preserve: '保留音频采集、播放与连接的组件职责划分。',
          repair: '补上事件载荷、分支条件和实际可达性核查；这里不把其他泛化语音功能叙述自动归为同一个错误。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '英文原文的 API 说明主要对应 Challenge 1，没有覆盖最终阶段的 Realtime 事件入口。',
          evidence: [
            { quote: 'The application currently has one main API route:', page: 'devinwiki.html', match: 'The application currently has one main API route:', anchor: 'original-12-api-routes', kind: 'wiki', label: 'API Routes · 早期阶段覆盖范围' }
          ],
          preserve: '保留早期 get_response 路由说明；它不是最终语音事件的可达性证明。',
          repair: '补充 Challenge 5 的语音事件链并标注快照范围。中文编辑摘要不替代英文原文证据。'
        }
      }
    },
    {
      id: 'itinerary-parameter-contract',
      categoryId: 'data-contract',
      title: '行程规划：重复解析参数会不会报错？',
      question: '前面已把行程参数变成数据对象，后面再把它当文字解析一次，会发生什么？',
      kind: 'fact',
      impact: '正常的 stops 对象会在调用规划接口之前失败；只核对工具 schema 或路由存在，无法判断这条路径可用。',
      truth: {
        summary: '前一步已经把文字形式的行程参数拆成数据对象，行程处理代码却把这个对象当文字再解析一次。普通对象会触发语法错误（SyntaxError），还没发送规划请求就停止了；地点搜索分支的处理方式不同。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/assistant.ts#L210-L217',
        codeUrls: [
          { label: '调用方先解析参数', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/assistant.ts#L210-L217' },
          { label: '行程分支再次解析', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/tools.ts#L1-L29' }
        ]
      },
      localIssueIds: ['LS-02'],
      tags: ['Challenge 5', '调用方与被调用方', '概览与深层结论不一致'],
      tools: {
        'local-skill': {
          status: 'mixed',
          summary: '概览把行程工具执行写成闭环；分发器专页则准确给出普通对象重复解析的失败条件。问题在于能力结论未吸收已有诊断。',
          evidence: [
            { quote: '文本通道拥有地点搜索与行程规划两种函数工具，并由 assistant.ts 把系统提示、工具执行和后续模型轮次连成闭环；', page: 'local-skill.html', match: '文本通道拥有地点搜索与行程规划两种函数工具', kind: 'wiki', label: '1.4 旅行助手能力面 · 概览结论' },
            { quote: '若 parse 返回普通对象，JSON.parse 会先把对象转换为字符串 "[object Object]"，随后抛出语法错误，请求甚至不会到达 /api/create_itinerary。', page: 'local-skill.html', match: '请求甚至不会到达 /api/create_itinerary', kind: 'wiki', label: '4.3 工具名称分发器 · 正确失败条件' }
          ],
          preserve: '保留对象与字符串契约的对照、明确的失败条件及统一参数类型的建议。',
          repair: '在能力概览中标注当前普通对象路径失败。1.4 的“这里不推断运行时一定失败”是谨慎限定，不应单独算作与条件性证明矛盾；文档中的建议也不代表已有源码补丁。'
        },
        codewiki: {
          status: 'correct',
          summary: '串起调用方已解析对象与行程分支再次 JSON.parse 的因果链，核心诊断正确；异常名称可以更精确。',
          evidence: [
            { quote: 'processMessages 已把工具参数解析成对象后传给 handleTool；search_location 接受对象，但 plan_itinerary 又执行 JSON.parse(parameters)，因此最终阶段的行程工具会对对象进行 JSON 解析并抛出类型错误。', page: 'codewiki.html', match: 'processMessages 已把工具参数解析成对象后传给 handleTool', kind: 'wiki', label: '7.2 Challenge 5 文本流限制' }
          ],
          preserve: '保留跨文件调用链核查，而不是只展示各自的函数实现。',
          repair: '把泛称“类型错误”精确写为普通对象输入下的 SyntaxError，避免被理解为 JavaScript TypeError；这不改变其核心缺陷判断。'
        },
        openwiki: {
          status: 'not_covered',
          summary: '分别写出了调用方 parse 和行程分支 JSON.parse，也区分早期字符串与流式对象，但没有说明二者接起来为何失败。',
          evidence: [
            { quote: '前端随即调用 handleTool(data.name, parse(functionArguments)) 执行工具。', page: 'openwiki.html', match: '前端随即调用 handleTool(data.name, parse(functionArguments)) 执行工具。', kind: 'wiki', label: '工具调用 · 流式参数完成事件' },
            { quote: 'handleTool 用 JSON.parse(parameters) 解析出 stops 后 POST 到 /api/create_itinerary', page: 'openwiki.html', match: 'handleTool 用 JSON.parse(parameters) 解析出 stops 后 POST 到 /api/create_itinerary', kind: 'wiki', label: '工具调用 · plan_itinerary 分支' }
          ],
          preserve: '保留准确的局部转换和阶段差异；这些是进一步核查契约的有效材料。',
          repair: '增加从返回对象到重复解析的跨函数推演。没有明确错误参数断言时，本项按根因未覆盖处理，不把正常流程叙述直接判成同类错误。'
        },
        'deepwiki-open': {
          status: 'mixed',
          summary: '阶段表把 Challenge 5 泛化为直接使用参数对象；工具专页又指出两个分支处理不一致，但尚未给出完整失败链。',
          evidence: [
            { quote: '直接使用 parameters 对象', page: 'deepwiki-open.html', match: '直接使用 parameters 对象', anchor: 'page-2', kind: 'wiki', label: '阶段对比 · Challenge 5 参数概括' },
            { quote: '这种不一致可能是代码演进过程中的遗留问题。', page: 'deepwiki-open.html', match: '这种不一致可能是代码演进过程中的遗留问题。', anchor: 'page-11', kind: 'wiki', label: '工具系统 · 已发现分支不一致' }
          ],
          preserve: '保留对搜索解构和行程 JSON.parse 的差异观察；它是局部正确分析，不等于完整根因已覆盖。',
          repair: '修正全分支统一对象的概括，再补上调用方已解析、行程再次解析、请求前失败这三个环节。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '工具章节介绍通用定义、执行与展示框架，没有覆盖最终阶段真实行程工具的解析链。',
          evidence: [
            { quote: 'The Tools System provides a framework for defining, executing, and displaying tool calls made by the assistant.', page: 'devinwiki.html', match: 'The Tools System provides a framework for defining, executing, and displaying tool calls made by the assistant.', anchor: 'original-11-tools-system', kind: 'wiki', label: 'Tools System · 通用框架范围' }
          ],
          preserve: '保留工具定义、执行和 UI 展示的职责说明。',
          repair: '加入实际 plan_itinerary 名称及 Challenge 5 的调用方与分发器证据，不能由通用框架介绍推定已覆盖该缺陷。'
        }
      }
    },
    {
      id: 'voice-config-consumer',
      categoryId: 'configuration',
      title: '声音设置：浏览器没读取，就代表没使用？',
      question: '修改声音设置后，服务端创建语音会话时是否会读取它？',
      kind: 'fact',
      impact: '若只查浏览器，会漏掉服务端创建 Realtime 会话时的声音参数，误判配置生效位置。',
      truth: {
        summary: '声音设置由服务端创建语音会话时读取，并随请求发给模型服务。浏览器无需直接导入这个设置；不能只看浏览器端的代码，就认定它没有被使用。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/session/route.ts#L1-L15'
      },
      reviewNote: '旧条目 LS-03 把“常量存在不等于已经使用”的提醒解读成“VOICE 没有使用”。严格按原文字面，这不是明确的未使用断言；同一 Wiki 的会话专页又正确指出了服务端消费者。因此本次保留概述需要澄清的意见，不再直接判为事实错误。',
      localIssueIds: ['LS-03'],
      tags: ['服务端消费者', '浏览器与代理边界', '旧审计结论收窄'],
      tools: {
        'local-skill': {
          status: 'correct',
          summary: '会话专页明确说明路由导入模型与声音。概览只提浏览器未导入，容易造成误读，但没有明确断言 VOICE 未使用。',
          evidence: [
            { quote: 'session 路由只导入模型与声音；浏览器组件则使用实时基础地址与模型构造 SDP 请求。', page: 'local-skill.html', match: 'session 路由只导入模型与声音', kind: 'wiki', label: '5.1 临时会话凭据代理 · 实际消费者' },
            { quote: '在当前语音组件的导入列表中，前面三项被消费，而 VOICE 没有在该组件顶部导入；这说明常量存在不等于当前通道已经使用该配置。', page: 'local-skill.html', match: 'VOICE 没有在该组件顶部导入', kind: 'wiki', label: '1.4 旅行助手能力面 · 易被误读的提醒' }
          ],
          preserve: '保留会话创建与浏览器 SDP 协商的职责划分，以及“追踪实际使用点”的原则。',
          repair: '在概览提醒后直接补上“VOICE 已由 /api/session 消费”。不要把没有浏览器导入反向改写为没有服务端使用。'
        },
        codewiki: {
          status: 'not_covered',
          summary: '说明浏览器先获取临时凭据，但没有明确解释 VOICE 经服务端请求体消费的具体问题。',
          evidence: [
            { quote: '从 /api/session 获取临时 client_secret。', page: 'codewiki.html', match: '从 /api/session 获取临时 client_secret。', kind: 'wiki', label: '3.8 Realtime 语音模式 · 已覆盖的凭据步骤' }
          ],
          preserve: '保留正确的临时令牌获取流程；流程正确不自动代表声音配置消费已覆盖。',
          repair: '补充 session 路由导入 VOICE 及 voice: VOICE 的请求体，明确其与浏览器导入列表的关系。'
        },
        openwiki: {
          status: 'correct',
          summary: '明确指出 coral 在 /api/session 申请临时会话时传入 Realtime。',
          evidence: [
            { quote: 'VOICE：值为 coral，在 /api/session 路由请求 ephemeral token 时传给 Realtime 会话。', page: 'openwiki.html', match: '在 /api/session 路由请求 ephemeral token 时传给 Realtime 会话', kind: 'wiki', label: '常量配置 · VOICE 消费位置' }
          ],
          preserve: '保留常量值、真实消费者和消费时点的对应关系。',
          repair: '此处说明可保留；不要把声音配置的正确性扩大为其他同名模型配置也全部统一。'
        },
        'deepwiki-open': {
          status: 'correct',
          summary: '展示 Challenge 5 session 路由的创建会话代码，其中 JSON body 明确包含 voice: VOICE。',
          evidence: [
            { quote: 'voice: VOICE', page: 'deepwiki-open.html', match: 'voice: VOICE', anchor: 'page-7', kind: 'wiki', label: '语音集成 · session 路由请求体' }
          ],
          preserve: '保留服务端请求体这一直接证据。',
          repair: '可再用一句文字解释浏览器无需直接导入；当前证据已足以回答消费者位置。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '英文 API 章节以早期 get_response 为主，没有声音常量或 Realtime session 创建说明。',
          evidence: [
            { quote: 'The application currently has one main API route:', page: 'devinwiki.html', match: 'The application currently has one main API route:', anchor: 'original-12-api-routes', kind: 'wiki', label: 'API Routes · 早期阶段覆盖范围' }
          ],
          preserve: '保留原文实际覆盖的早期 API 介绍，不把它称为最终阶段的声音配置说明。',
          repair: '增加最终阶段 session 路由及声音配置的消费关系。'
        }
      }
    },
    {
      id: 'async-error-boundary',
      categoryId: 'async-resource',
      title: '工具稍后报错，外层错误处理能接住吗？',
      question: '找地点或生成行程在稍后失败时，读取消息时的错误处理能否一起接住？',
      kind: 'fact',
      impact: '会高估现有错误处理能力；工具或递归回合失败时，外层同步错误处理不能提供文档承诺的保护。',
      truth: {
        summary: '消息读取代码发起工具处理后，没有等待处理结束。工具稍后报错时，错误不会自动回到读取消息的错误处理里。读取、解析消息时的失败与异步工具处理的失败，需要分别说明。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/assistant.ts#L59-L104'
      },
      localIssueIds: ['LS-04'],
      tags: ['Challenge 5', 'Promise 拒绝', '概览与深层结论不一致'],
      tools: {
        'local-skill': {
          status: 'mixed',
          summary: '阶段页声称事件回调异常最终由 handleTurn 的 catch 记录；工具续轮专页则正确指出 async 回调没有被等待。',
          evidence: [
            { quote: 'reader、解码、JSON 解析或事件回调抛出的异常最终由 handleTurn() 的 catch 记录。', page: 'local-skill.html', match: '事件回调抛出的异常最终由 handleTurn() 的 catch 记录', kind: 'wiki', label: '2.6 流式响应最终阶段 · 过宽的异常保证' },
            { quote: '流读取器解析每个 SSE 记录后直接调用 onMessage(data)，但没有等待回调返回；而 processMessages 提供的是异步回调，完成事件内部又会等待工具请求和递归续轮。', page: 'local-skill.html', match: '但没有等待回调返回；而 processMessages 提供的是异步回调', kind: 'wiki', label: '4.4 工具结果关联与续轮 · 正确的等待边界' }
          ],
          preserve: '保留同步解析与工具续轮的分层，以及未等待回调的机制说明。',
          repair: '收窄阶段页的 catch 保证，明确异步拒绝不在当前捕获边界内。补 await 或显式处理 Promise 是代码修复建议，不是已有行为。'
        },
        codewiki: {
          status: 'correct',
          summary: '明确关联未 await、async 回调以及未捕获拒绝，覆盖了本项真实错误边界。',
          evidence: [
            { quote: 'onMessage 声明为同步回调且调用处未 await，但传入的是异步函数。工具执行和递归回合不在 handleTurn 的完成语义内，可能形成时序竞争或未捕获拒绝。', page: 'codewiki.html', match: '工具执行和递归回合不在 handleTurn 的完成语义内', kind: 'wiki', label: '7.2 Challenge 5 文本流限制' }
          ],
          preserve: '保留 Promise 完成语义的具体说明，不把 catch 的代码外形等同于可靠捕获。',
          repair: '本问题无需改判；后续可补异步失败回归测试，但当前说明不等于测试已经执行。'
        },
        openwiki: {
          status: 'not_covered',
          summary: '列出三层 try/catch 和日志位置，但没有回答未等待 async 回调时拒绝归谁处理。',
          evidence: [
            { quote: "整个读取过程再包一层 try/catch，异常 console.error('Error handling turn:', error)。", page: 'openwiki.html', match: '整个读取过程再包一层 try/catch', kind: 'wiki', label: '聊天回合 · 错误处理清单' }
          ],
          preserve: '保留 HTTP 状态、读取过程和服务端错误位置的导航。',
          repair: '增加实际 await 边界分析。原文没有明确保证所有异步拒绝都被捕获，因此此处按具体机制未覆盖处理。'
        },
        'deepwiki-open': {
          status: 'not_covered',
          summary: '描述消息收发桥梁职责，没有分析 onMessage 返回 Promise 未被等待的问题。',
          evidence: [
            { quote: '文件负责管理消息的发送与接收逻辑，是前端与 API 路由之间的桥梁。', page: 'deepwiki-open.html', match: '文件负责管理消息的发送与接收逻辑，是前端与 API 路由之间的桥梁。', anchor: 'page-6', kind: 'wiki', label: '消息处理 · 最近相关职责说明' }
          ],
          preserve: '保留前端与 API 路由之间的消息职责划分。',
          repair: '补上实际调用语句、回调类型与拒绝传播；其他 API 路由的 try/catch 不能替代该问题的证据。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '原文错误处理说明引用早期 Challenge 1，不涉及最终阶段流式 async 回调。',
          evidence: [
            { quote: 'In the frontend, network errors and API errors are caught and logged to the console', page: 'devinwiki.html', match: 'In the frontend, network errors and API errors are caught and logged to the console', anchor: 'original-10-openai-integration', kind: 'wiki', label: 'OpenAI Integration · 早期错误处理范围' }
          ],
          preserve: '保留早期请求错误处理的实际说明，不把其范围扩到 Challenge 5。',
          repair: '新增最终流式回调的完成与拒绝语义，而不是把早期 catch 介绍判为同类错误。'
        }
      }
    },
    {
      id: 'utf8-stream-boundary',
      categoryId: 'data-contract',
      title: '中文分段传输时，会不会出现乱码？',
      question: '同一个中文字被拆成两段网络数据时，当前实现能保证还原它吗？',
      kind: 'fact',
      impact: '多字节字符恰好被网络分块拆开时可能出现替换字符。SSE 记录拼接正确，不代表字节解码也正确。',
      truth: {
        summary: '一个中文字可能拆成两段网络数据到达。当前代码每次单独解码，没有保存未收全的字节；后面即使把文字拼起来，也修不好已经解坏的字。问题只在特定分块下发生，不是所有中文都会出错。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/assistant.ts#L45-L57'
      },
      reviewNote: '旧条目 LS-05 把“转换成稳定的应用事件”的概括扩大为对所有多字节字符无损的保证。原文主要解释 SSE 记录缓冲，没有明确作出 UTF-8 无损承诺。本次仍指出源码风险，但将 Local Skill 的问题收窄为没有覆盖字节解码边界。',
      localIssueIds: ['LS-05'],
      tags: ['Challenge 5', '字节边界与记录边界', '旧审计结论收窄'],
      tools: {
        'local-skill': {
          status: 'not_covered',
          summary: '正确解释 reader、字符串缓冲与 SSE 分帧，但没有单独检查 UTF-8 跨块状态；不再把泛化总结当成明确的中文无损断言。',
          evidence: [
            { quote: 'SSE 分帧读取器把不稳定的网络 chunk 转换成稳定的应用事件。', page: 'local-skill.html', match: 'SSE 分帧读取器把不稳定的网络 chunk 转换成稳定的应用事件。', kind: 'wiki', label: '3.2 SSE 分帧读取器 · 总结范围' }
          ],
          preserve: '保留记录边界、data 前缀、JSON 解析与流结束的分层说明。',
          repair: '将总结限定为记录重组，补充字节解码风险及流式 decode、结束 flush 的建议；不声称这些修改已在源码实现。'
        },
        codewiki: {
          status: 'correct',
          summary: '明确指出 decode 没有流式选项，以及多字节字符被拆到不同 chunk 的条件性风险。',
          evidence: [
            { quote: 'TextDecoder.decode(value) 未设置流式解码选项；多字节字符若刚好跨 chunk 边界，存在解码异常风险。', page: 'codewiki.html', match: 'TextDecoder.decode(value) 未设置流式解码选项', kind: 'wiki', label: '7.2 Challenge 5 文本流限制' }
          ],
          preserve: '保留对字节级边界的准确定位。',
          repair: '可把“解码异常”进一步写明为默认替换字符风险，避免误解为一定抛出异常；不改变此项核心判断。'
        },
        openwiki: {
          status: 'not_covered',
          summary: '解释逐块 decode 与 buffer 追加，没有讨论一个 UTF-8 字符在两块之间被拆开的情况。',
          evidence: [
            { quote: 'decoder.decode(value) 得到本块的字符串并追加进 buffer。', page: 'openwiki.html', match: 'decoder.decode(value) 得到本块的字符串并追加进 buffer。', kind: 'wiki', label: '流式响应 · 前端逐块读取' }
          ],
          preserve: '保留逐块读取和按帧切分的机制描述。',
          repair: '补充 TextDecoder 状态与字符串缓冲的区别；不因遗漏该边界就否认整个分帧说明。'
        },
        'deepwiki-open': {
          status: 'not_covered',
          summary: '介绍服务端将文本编码成字节流，没有覆盖浏览器端跨块 UTF-8 解码。',
          evidence: [
            { quote: '使用 TextEncoder 将文本编码为字节流', page: 'deepwiki-open.html', match: '将文本编码为字节流', anchor: 'page-6', kind: 'wiki', label: '流式传输 · 服务端编码范围' }
          ],
          preserve: '保留服务端 TextEncoder 的用途；编码介绍与客户端解码边界是不同问题。',
          repair: '增加客户端解码器及跨字节块用例，不把有编码说明当作已覆盖无损解码。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '英文原文覆盖早期完整 JSON 返回，未覆盖最终 SSE 消费与字节解码。',
          evidence: [
            { quote: 'Returns the response as JSON', page: 'devinwiki.html', match: 'Returns the response as JSON', anchor: 'original-10-openai-integration', kind: 'wiki', label: 'OpenAI Integration · 非流式返回范围' }
          ],
          preserve: '保留早期 JSON 响应路径的说明。',
          repair: '以 Challenge 5 的实际读取器补充流式章节，并明确字节与记录两层边界。'
        }
      }
    },
    {
      id: 'microphone-cleanup',
      categoryId: 'async-resource',
      title: '停止语音，是否真的释放了麦克风？',
      question: '用户点停止后，当前代码能否找到之前启用的麦克风数据流并停止音轨？',
      kind: 'fact',
      impact: '把连接关闭与媒体轨道停止混为一谈，会掩盖麦克风资源清理缺口。',
      truth: {
        summary: '启动时拿到的麦克风数据流，没有保存到停止函数会读取的位置。停止时会关闭连接，但逐条停止音轨的分支取不到真正的数据流。关掉连接，不等于这段显式麦克风清理逻辑已经执行。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/components/voice-mode.tsx#L23-L64',
        codeUrls: [
          { label: '启动时获取局部 stream', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/components/voice-mode.tsx#L23-L64' },
          { label: '停止时只检查 audioStream', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/components/voice-mode.tsx#L100-L117' }
        ]
      },
      reviewNote: '旧条目 LS-06 将“可停止”的概述理解为完整释放麦克风。连接确实能关闭，而 Local Skill 的生命周期专页已经明确说明真实音频流没有保存。本次把它判为该具体机制说明正确，保留要求概述区分停止连接与释放音轨的建议。',
      localIssueIds: ['LS-06'],
      tags: ['Challenge 4 与 5', '资源所有权', '旧审计结论收窄'],
      tools: {
        'local-skill': {
          status: 'correct',
          summary: '明确发现 stream 未进入 state，停止函数无法找到真实麦克风流。概述“可停止”范围含糊，但不应覆盖这段正确诊断。',
          evidence: [
            { quote: '但源码中没有 setAudioStream(stream)。对 setAudioStream 的安全索引检索只找到 state 声明和停止时的 setAudioStream(null)。', page: 'local-skill.html', match: '但源码中没有 setAudioStream(stream)', kind: 'wiki', label: '5.5 会话资源生命周期 · 缺失的保存步骤' },
            { quote: '虽然函数写出了遍历轨道并 stop 的清理逻辑，但实际麦克风流没有进入该 state，停止函数不能通过 audioStream 找到它。', page: 'local-skill.html', match: '停止函数不能通过 audioStream 找到它', kind: 'wiki', label: '5.5 会话资源生命周期 · 实际后果' }
          ],
          preserve: '保留局部 stream、state 与停止分支之间的完整追踪。',
          repair: '概述改成“连接可关闭，但真实音轨清理存在缺口”。不要把含糊的停止概括当作对麦克风释放的明确保证。'
        },
        codewiki: {
          status: 'correct',
          summary: '明确指出 MediaStream 没写入 audioStream，因而显式 track.stop 分支不会执行。',
          evidence: [
            { quote: '获取到的 MediaStream 没有写入 audioStream；stopSession 的显式 track.stop() 分支因此不会执行。tracks 虽收集 sender，也没有用于清理。', page: 'codewiki.html', match: '获取到的 MediaStream 没有写入 audioStream', kind: 'wiki', label: '7.3 Realtime 语音限制' }
          ],
          preserve: '保留“资源未保存”与“清理分支无效”的因果关系。',
          repair: '本项无需改判；如加入修复建议，应区分已实现的连接关闭和待修的音轨管理。'
        },
        openwiki: {
          status: 'same_issue',
          summary: '把 stopSession 列表直接描述为完成资源释放，没有核对 audioStream 从未接收真实 stream 的前提。',
          evidence: [
            { quote: '关闭数据通道与对等连接即释放 WebRTC 传输通道，停止本地音频 track 释放麦克风。', page: 'openwiki.html', match: '停止本地音频 track 释放麦克风', kind: 'wiki', label: 'Realtime 语音 · stopSession 资源清理' }
          ],
          preserve: '保留连接关闭与 track.stop 是两类操作的区分，以及函数中的清理步骤导航。',
          repair: '补上 audioStream 的赋值追踪，说明音轨停止代码存在但当前条件不能满足，不能把条件分支写成已经发生。'
        },
        'deepwiki-open': {
          status: 'not_covered',
          summary: '覆盖音频与连接职责，没有分析流的保存位置或停止时的清理条件。',
          evidence: [
            { quote: '前端组件负责音频采集、播放和连接管理', page: 'deepwiki-open.html', match: '前端组件负责音频采集、播放和连接管理', anchor: 'page-7', kind: 'wiki', label: '语音集成 · 最近相关职责说明' }
          ],
          preserve: '保留音频和连接的组件职责介绍。',
          repair: '补充 MediaStream 从获取到保存、再到 track.stop 的生命周期，不把连接管理概括视为已经完成此项核查。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '英文原文没有覆盖实时语音与麦克风生命周期，现有 API 介绍属于早期文本范围。',
          evidence: [
            { quote: 'The application currently has one main API route:', page: 'devinwiki.html', match: 'The application currently has one main API route:', anchor: 'original-12-api-routes', kind: 'wiki', label: 'API Routes · 早期阶段覆盖范围' }
          ],
          preserve: '保留已覆盖的文本路由内容；它不能证明音频资源被正确释放。',
          repair: '补充 Challenge 4/5 的媒体资源所有权与停止条件。'
        }
      }
    },
    {
      id: 'final-model-config',
      categoryId: 'configuration',
      title: '修改公共模型设置，最终版本就会跟着改？',
      question: '把公共设置里的模型名称换掉，最终版本实际调用的模型是否会改变？',
      kind: 'fact',
      impact: '如果把同名常量当作同一配置源，模型切换可能改错位置而没有改变实际请求。',
      truth: {
        summary: '最终版本的文字聊天接口在自己的文件里另设了模型名称，没有读取公共设置里的 MODEL。只改公共设置，不会改变这个接口实际使用的模型；前几个教学版本的做法不能直接套用。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/get_response/route.ts#L1-L21'
      },
      reviewNote: '旧条目 LS-07 把 Local Skill 的集中配置介绍视为“修改共享 MODEL 一定控制最终路由”的断言。原文没有明确作出这一操作承诺，因此收窄为没有解释最终生效点。其他工具若明确写错导入来源或修改位置，仍按其具体原文判定。',
      localIssueIds: ['LS-07'],
      tags: ['Challenge 5', '同名独立常量', '旧审计结论收窄'],
      tools: {
        'local-skill': {
          status: 'not_covered',
          summary: '列出常量模块中的模型值，但没有追到最终路由的独立 MODEL；没有明确承诺改共享常量就能改变最终文字模型。',
          evidence: [
            { quote: '模型和连接参数也集中在同一文件中：普通文本模型为 gpt-4o，实时模型为 gpt-4o-realtime-preview，实时端点为 OpenAI Realtime API，另有 VOICE 常量设置为 coral。', page: 'local-skill.html', match: '模型和连接参数也集中在同一文件中', kind: 'wiki', label: '1.4 旅行助手能力面 · 常量位置说明' }
          ],
          preserve: '保留模型、实时端点与声音值的索引材料。',
          repair: '补出最终路由独立 MODEL 的实际生效点，把声明位置与消费者位置分开；不将省略消费者直接改写为已作出错误操作承诺。'
        },
        codewiki: {
          status: 'not_covered',
          summary: '维护表提示检查 MODEL 等配置，但没有明确指出最终路由存在同名独立常量。',
          evidence: [
            { quote: 'MODEL、REALTIME_MODEL、行程路由内模型名', page: 'codewiki.html', match: 'MODEL、REALTIME_MODEL、行程路由内模型名', kind: 'wiki', label: '8.1 常见修改落点 · 模型配置范围' }
          ],
          preserve: '保留普通、实时和行程模型的分类导航。',
          repair: '在修改位置中明确标注 Challenge 5 get_response 的路由内 MODEL，不能由维护表存在就推定已覆盖该生效点。'
        },
        openwiki: {
          status: 'same_issue',
          summary: '给出在 constants.ts 修改 MODEL 的模型切换指引，却没有包含最终文字路由的独立定义。',
          evidence: [
            { quote: '更换模型可在 constants.ts 的 MODEL / REALTIME_MODEL 修改；常用文本对话同时受后端 app.py 的 MODEL 影响。', page: 'openwiki.html', match: '更换模型可在 constants.ts 的 MODEL / REALTIME_MODEL 修改', kind: 'wiki', label: '常量配置 · 配置与运行的关系' }
          ],
          preserve: '保留实时模型和 Python 模型的配置入口，但它们不替代最终 Next.js 路由的消费点。',
          repair: '按阶段和后端列出有效定义，明确最终文字路由使用局部 MODEL；不要把共享常量当成唯一修改入口。'
        },
        'deepwiki-open': {
          status: 'same_issue',
          summary: '在明确标为 Challenge 5 get_response 的代码示例中，错误注释 MODEL 从 constants.ts 导入。',
          evidence: [
            { quote: 'model: MODEL,  // 从 constants.ts 导入', page: 'deepwiki-open.html', match: 'model: MODEL, // 从 constants.ts 导入', anchor: 'page-12', kind: 'wiki', label: '配置管理 · 最终路由模型来源注释' }
          ],
          preserve: '保留配置分类和实际默认模型值的说明。',
          repair: '更正最终路由的导入来源注释，并说明路由局部定义与共享导出相互独立。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '“从 constants 导入模型”的原文引用 Challenge 1，在该早期范围成立，不能直接判成最终阶段的错误断言。',
          evidence: [
            { quote: 'The model is imported from the constants file, ensuring consistency across the application.', page: 'devinwiki.html', match: 'The model is imported from the constants file, ensuring consistency across the application.', anchor: 'original-12-api-routes', kind: 'wiki', label: 'API Routes · Challenge 1 模型来源' }
          ],
          preserve: '保留有阶段证据支撑的早期模型导入说明。',
          repair: '新增最终路由差异并标出快照范围，不把早期正确描述强套到 Challenge 5。'
        }
      }
    },
    {
      id: 'backend-substitution',
      categoryId: 'data-contract',
      title: '换成 Python 后端，只改地址就能使用？',
      question: '切换请求地址后，最终版本的流式聊天和语音能否直接兼容？',
      kind: 'fact',
      impact: '仅更换 URL 可能让客户端拿到无法按原协议消费的响应，也会遗漏实时会话代理。',
      truth: {
        summary: '最终前端等待逐段返回的流式消息，Python 后端却一次返回整条消息；Python 也缺少创建语音会话的接口。因此，只改地址不能完整替换最终版后端，还要处理返回格式和缺失接口。地点搜索与行程规划需另外核对。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/python-backend/app.py#L95-L107',
        codeUrls: [
          { label: 'Flask 返回完整 JSON', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/python-backend/app.py#L95-L107' },
          { label: 'Next.js 返回 SSE', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/get_response/route.ts#L88-L97' },
          { label: '独立的实时会话代理', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/session/route.ts#L1-L23' }
        ]
      },
      localIssueIds: [],
      tags: ['Challenge 5', '后端协议差异', '同页结论不一致'],
      tools: {
        'local-skill': {
          status: 'correct',
          summary: '明确说明只改地址不够，并区分最终客户端的 SSE 预期与 Flask 的单个 JSON 响应。',
          evidence: [
            { quote: '因此只修改请求地址并不足以让 challenge5 客户端兼容 Python 响应：客户端当前期待 SSE 分帧，而 Flask 返回单个 JSON 对象。', page: 'local-skill.html', match: '因此只修改请求地址并不足以让 challenge5 客户端兼容 Python 响应', kind: 'wiki', label: '1.3 双后端集成边界' }
          ],
          preserve: '保留按阶段核对输入输出、而不是只看路由名称的边界分析。',
          repair: '本问题无需改判；维护说明继续按文本流、工具、实时会话分别列出切换要求。'
        },
        codewiki: {
          status: 'correct',
          summary: '明确指出 Python 缺少 Realtime session 和最终 SSE 协议，不能完整替代最终 Next.js 后端。',
          evidence: [
            { quote: 'Python 后端没有 Realtime session 端点，也没有实现 challenge5 的 SSE 协议，因此不能完整替代最终阶段的 Next.js 后端。', page: 'codewiki.html', match: 'Python 后端没有 Realtime session 端点', kind: 'wiki', label: '7.4 Python 后端限制' }
          ],
          preserve: '保留按协议与功能范围定义可替代性的判断。',
          repair: '本问题无需改判；如果未来统一协议，再依据新提交重新核查。'
        },
        openwiki: {
          status: 'mixed',
          summary: '同页称只需改 fetch URL、Flask 是等价替代，又明确提醒 Flask 不流式且客户端解析需同步修改。',
          evidence: [
            { quote: '切换后端只需改变一个 fetch URL', page: 'openwiki.html', match: '切换后端只需改变一个 fetch URL', kind: 'wiki', label: 'API 路由 · 过宽的替换指引' },
            { quote: 'Flask 后端是 Next.js 路由的等价替代而非子集。', page: 'openwiki.html', match: 'Flask 后端是 Next.js 路由的等价替代而非子集。', kind: 'wiki', label: 'API 路由 · 等价替代断言' },
            { quote: '切换后端需同步调整客户端解析方式。', page: 'openwiki.html', match: '切换后端需同步调整客户端解析方式。', kind: 'wiki', label: 'API 路由 · 正确的流协议限定' }
          ],
          preserve: '保留非流式响应和解析适配的正确提醒，以及工具路由对应关系。',
          repair: '把开头的完全等价结论改为分阶段、分端点兼容性说明，使其与同页已有的限制一致。'
        },
        'deepwiki-open': {
          status: 'not_covered',
          summary: '说明 Flask 有对应的工具端点，但没有覆盖最终 SSE 或 session 的不等价边界。',
          evidence: [
            { quote: '该后端使用 Flask 框架，提供了与 Next.js 路由对应的端点。', page: 'deepwiki-open.html', match: '该后端使用 Flask 框架，提供了与 Next.js 路由对应的端点。', anchor: 'page-11', kind: 'wiki', label: '工具系统 · Python 对应端点范围' }
          ],
          preserve: '保留搜索、行程工具端点的对应材料，不把局部对应自动解读为全部功能等价。',
          repair: '补充最终响应协议及实时会话缺口；本项不能因“可选后端”这一表述就直接判成同类错误。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '替代 Python 后端的说明引用早期 Challenge 1，未覆盖最终阶段协议差异。',
          evidence: [
            { quote: 'The application supports an alternative Python backend configuration.', page: 'devinwiki.html', match: 'The application supports an alternative Python backend configuration.', anchor: 'original-10-openai-integration', kind: 'wiki', label: 'OpenAI Integration · 早期后端切换范围' }
          ],
          preserve: '保留早期非流式阶段的后端切换指引。',
          repair: '标出该说明的阶段范围，并补充 Challenge 5 的 SSE 和 Realtime session 差异，而不是据此判早期说明错误。'
        }
      }
    },
    {
      id: 'completion-diagram-direction',
      categoryId: 'diagram-consistency',
      title: '谁向谁请求？流程图的箭头画反了',
      question: '是应用服务器请模型生成答案，还是模型请应用服务器生成？',
      kind: 'fact',
      impact: '即使相邻文字正确，反向箭头仍会让读者误解服务调用方和返回方。',
      truth: {
        summary: '实际是应用服务器向 AI 模型发出“请生成回答”的请求，再接收模型回复。OpenWiki 的图却把请求与回复两个方向都画反了。本例指出的是请求方与响应方颠倒，不是图表加载失败，也不是额外认定流程先后顺序有错。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/get_response/route.ts#L18-L39',
        codeUrls: [
          { label: '最终流式请求方向', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/app/api/get_response/route.ts#L18-L39' },
          { label: '早期工具回合的同一方向', url: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge2/frontend/app/api/get_response/route.ts#L13-L21' }
        ]
      },
      localIssueIds: [],
      tags: ['独立的图示问题', '参与者身份', '图文并存'],
      tools: {
        'local-skill': {
          status: 'correct',
          summary: '图中 Route 是响应路由、Model 是聊天模型，补全请求从 Route 发向 Model，增量沿相反方向返回。此项仅核对这组方向。',
          evidence: [
            { quote: 'Route->>+Model: 请求流式补全', page: 'local-skill.html', match: '请求流式补全', kind: 'wiki', label: '3 对话架构与流式消息流程 · 请求箭头' },
            { quote: 'Model-->>Route: 文本或工具增量', page: 'local-skill.html', match: '文本或工具增量', kind: 'wiki', label: '3 对话架构与流式消息流程 · 返回箭头' }
          ],
          preserve: '保留模型请求与流式响应的明确方向，不据此推定整张图其他语义都已验证。',
          repair: '这组箭头无需修改；图示中的理想完成路径仍应与其他案例揭示的实现限制分开。'
        },
        codewiki: {
          status: 'correct',
          summary: '早期工具循环图把 R 标为 /api/get_response、M 标为 OpenAI，请求与 assistant message 返回方向正确。',
          evidence: [
            { quote: 'R->>M: Chat Completions + tools', page: 'codewiki.html', match: 'Chat Completions + tools', kind: 'wiki', label: '4.1 普通文本与工具循环 · 请求箭头' },
            { quote: 'M-->>R: assistant message', page: 'codewiki.html', match: 'assistant message', kind: 'wiki', label: '4.1 普通文本与工具循环 · 返回箭头' }
          ],
          preserve: '保留参与者身份与请求方向；该图原本限定在 Challenge 2-4。',
          repair: '这组箭头无需修改；此处不把早期流程图当作最终阶段所有事件行为的证明。'
        },
        openwiki: {
          status: 'mixed',
          summary: '相邻文字正确说明路由把 tools 传给 OpenAI，但图中的前两条请求、返回箭头与参与者身份相反。',
          evidence: [
            { quote: 'M->>R: 请求补全（含 tools 定义）', page: 'openwiki.html', match: '请求补全（含 tools 定义）', kind: 'wiki', label: '挑战演进 · OpenAI 模型 M 向路由 R 的反向箭头' },
            { quote: 'R->>M: assistant tool_calls（search_location / arguments）', page: 'openwiki.html', match: 'assistant tool_calls（search_location / arguments）', kind: 'wiki', label: '挑战演进 · 路由 R 向模型 M 的反向返回' },
            { quote: 'tools 数组定义的函数 Schema 原样传给 OpenAI API', page: 'openwiki.html', match: 'tools 数组定义的函数 Schema 原样传给 OpenAI API', kind: 'wiki', label: '挑战演进 · 相邻正确文字' }
          ],
          preserve: '保留工具 schema 传给模型及按工具名分派路由的正确文字。',
          repair: '按已标注的参与者身份修正两条箭头；不要把此案例复用为语音事件不可达问题，也不要将箭头方向误写成工具执行时序倒置。'
        },
        'deepwiki-open': {
          status: 'correct',
          summary: '图中由应用路由向 OpenAI 发出请求，OpenAI 再把结果返回路由，这组方向正确。本项不代表图中的模型配置、响应格式或整条工具流程都正确。',
          evidence: [
            { quote: 'Route->>OpenAI: chat.completions.create()\n    Note over OpenAI: 处理消息\n    OpenAI-->>Route: 返回响应', page: 'deepwiki-open.html', match: 'Route->>OpenAI: chat.completions.create() Note over OpenAI: 处理消息 OpenAI-->>Route: 返回响应', anchor: 'page-12', kind: 'wiki', label: 'OpenAI 模型集成 · 路由与模型的请求返回方向' }
          ],
          preserve: '保留明确的路由身份和请求、返回方向。',
          repair: '这组箭头无需修改；不要据此推定相邻配置、调用方式和最终响应协议也已核验。'
        },
        devinwiki: {
          status: 'correct',
          summary: '英文图中，请求从应用接口发向 OpenAI，模型回答反向返回。图基于早期版本，只在这组基础调用方向上正确，不代表覆盖了最终版的工具和流式实现。',
          evidence: [
            { quote: 'API->>OpenAI: Forward request to OpenAI\n    OpenAI-->>API: Return assistant response', page: 'devinwiki.html', match: 'API->>OpenAI: Forward request to OpenAI OpenAI-->>API: Return assistant response', anchor: 'original-10-openai-integration', kind: 'wiki', label: 'OpenAI Integration · 请求与响应方向' }
          ],
          preserve: '保留有明确参与者身份的基础请求方向。',
          repair: '这组箭头无需修改；继续标注早期阶段范围，不能替代最终阶段的流程核查。'
        }
      }
    },
    {
      id: 'source-reference-navigation',
      categoryId: 'source-navigation',
      title: '想核对说明，引用能带到对应源码吗？',
      question: '行程说明中的两处源码引用，能直接点击跳转，还是只能手动查找？',
      kind: 'quality',
      impact: '读者虽然拿到路径和行号，却需要自己重新定位源码。这是引用导航质量问题，不表示相邻技术结论一定错误。',
      truth: {
        summary: '在 Local Skill 的行程说明里，选取的两处引用虽写出了文件位置和行号，却不能直接点击跳过去。本例只评价这两处引用的可定位性，不代表说明本身错误，也不代表所有引用都不能点击。',
        codeUrl: 'https://github.com/openai/openai-builder-lab-solution/blob/e87f060e4e86d599ee54bdc7b752484944278f85/challenge5/frontend/lib/tools.ts#L17-L29'
      },
      localIssueIds: ['LS-Q05'],
      reviewNote: '本例检查当前归档正文的引用可点击性，不评价工具原生查看器。OpenWiki 原始 Markdown 还保留 sources 元数据，不能由这两处正文引用推断它没有任何源码入口。',
      tags: ['质量问题', '代表性样本', '不计为事实错误'],
      tools: {
        'local-skill': {
          status: 'same_issue',
          summary: '所列两处原文引用只有路径行号，缺少可点击的源码链接。该问题限定于这些已核验样本。',
          evidence: [
            { quote: 'challenge5/frontend/lib/tools.ts:L17-L29', page: 'local-skill.html', match: 'challenge5/frontend/lib/tools.ts:L17-L29', kind: 'wiki', label: '4.2 多站点行程契约 · 分发器纯文本引用' },
            { quote: 'challenge5/frontend/app/api/create_itinerary/route.ts:L5-L25', page: 'local-skill.html', match: 'challenge5/frontend/app/api/create_itinerary/route.ts:L5-L25', kind: 'wiki', label: '4.2 多站点行程契约 · 路由纯文本引用' }
          ],
          preserve: '保留已有路径和行号信息，以及其他页面已经可用的链接形式。',
          repair: '把这些位置转换成固定提交的源码链接，并检查生成后的可点击性；不以引用数量或页面数量作工具排名。'
        },
        codewiki: {
          status: 'correct',
          summary: '行程工具说明后的来源段落包含工具分派器与行程接口的可点击链接，目标均为对应固定版本源码。本项只评价这两个样本的可定位性。',
          evidence: [
            { quote: '工具定义与实现见 challenge5/lib/tools.ts，服务端实现见 search_location 和 create_itinerary。', page: 'codewiki.html', match: '工具定义与实现见 challenge5/lib/tools.ts，服务端实现见 search_location 和 create_itinerary。', anchor: 'original-1-openai-builder-lab-仓库-wiki', kind: 'wiki', label: '工具系统 · 分发器与行程路由来源链接' }
          ],
          preserve: '保留已能直接访问对应源文件的链接。',
          repair: '这两个样本不存在纯文本无法点击的问题；可进一步增加行号，但不据此评价全部引用。'
        },
        openwiki: {
          status: 'same_issue',
          summary: '行程分派和行程接口的两处正文源码位置都只是代码格式的文字，没有对应超链接。结论仅限这两处正文导航，不评价原始文件元数据或原生查看器。',
          evidence: [
            { quote: 'challenge5/frontend/lib/tools.ts#L58-L95 与 #L17-L29', page: 'openwiki.html', match: 'challenge5/frontend/lib/tools.ts#L58-L95 与 #L17-L29', anchor: 'original-11-函数调用-工具调用-流程', kind: 'wiki', label: '工具调用 · 行程分派的纯文本引用' },
            { quote: '/api/create_itinerary（challenge5/frontend/app/api/create_itinerary/route.ts）', page: 'openwiki.html', match: '/api/create_itinerary（challenge5/frontend/app/api/create_itinerary/route.ts）', anchor: 'original-11-函数调用-工具调用-流程', kind: 'wiki', label: '工具调用 · 行程路由的纯文本引用' }
          ],
          preserve: '保留已有路径、行号与附近实现说明；原始 Markdown 的 sources 元数据也包含对应文件。',
          repair: '将这两个正文位置映射为固定提交源码链接。不能从归档正文的导航缺口推定原生查看器完全没有源码入口。'
        },
        'deepwiki-open': {
          status: 'correct',
          summary: '快速开始页列出了工具分派器与行程接口的来源，两条链接都指向对应固定版本的源文件及行号。本项只评价这些链接，不评价附近事实判断。',
          evidence: [
            { quote: 'Sources: README.md:1-96, challenge5/frontend/lib/tools.ts:1-45, challenge5/frontend/app/api/create_itinerary/route.ts:1-28', page: 'deepwiki-open.html', match: 'Sources: README.md:1-96, challenge5/frontend/lib/tools.ts:1-45, challenge5/frontend/app/api/create_itinerary/route.ts:1-28', anchor: 'page-2', kind: 'wiki', label: '快速开始 · 工具分派与行程路由来源链接' }
          ],
          preserve: '保留这两个可点击的源码及行号入口。',
          repair: '这些样本无需修复不可点击问题；引用可定位不等于引用旁边的技术结论必然正确。'
        },
        devinwiki: {
          status: 'not_covered',
          summary: '英文原文只有通用工具框架介绍，没有实际行程参数与接口说明，不能为不存在的对应引用判定可点击性。',
          evidence: [
            { quote: 'The Tools System provides a framework for defining, executing, and displaying tool calls made by the assistant.', page: 'devinwiki.html', match: 'The Tools System provides a framework for defining, executing, and displaying tool calls made by the assistant.', anchor: 'original-11-tools-system', kind: 'wiki', label: 'Tools System · 通用工具说明范围' }
          ],
          preserve: '保留通用工具框架材料，但不将其当作实际行程契约引用。',
          repair: '先补充真实行程工具与路由说明，再检查对应引用。此项未覆盖不表示所有源码链接都有问题。'
        }
      }
    }
  ]
};

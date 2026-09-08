window.WIKI_ISSUE_SOURCE_DATA = {
  repository: 'openai/openai-builder-lab-solution',
  commit: 'e87f060e4e86d599ee54bdc7b752484944278f85',
  cases: {
    'voice-tool-reachability': {
      sourceExcerpts: [
        {
          id: 'voice-search-declaration', title: '工具清单确实声明了语音搜索',
          file: 'challenge5/frontend/lib/constants.ts', startLine: 33, endLine: 36,
          code: "export const REALTIME_TOOLS = [\n  {\n    name: 'search_location',\n    description: 'Search for landmarks or hotels in a specific location',\n",
          takeaway: '清单中有搜索工具，但有声明不代表实际事件能进入执行分支。'
        },
        {
          id: 'voice-event-condition', title: '同一事件字段被要求等于两个不同值',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 175, endLine: 182,
          code: "        const event = JSON.parse(e.data)\n        if (event.type === 'conversation.item.created') {\n          //const output = event.response.output[0];\n          const output = event\n          if (output?.type === 'function_call') {\n            handleToolCall(output)\n          }\n        }\n",
          takeaway: 'output 与 event 是同一对象，两个 type 条件不能同时成立；当前入口不会调用工具处理函数。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '概览说语音搜索已经形成可用流程；专页又明确指出工具入口进不去。',
          explanation: '专页诊断正确，问题是概览没有采用它。不能只保留乐观概括，也不能抹掉已有正确分析。',
          skillAction: '生成总览前汇总专页的可达性结论，让每项能力状态都回查实际执行路径。',
          sourceIds: ['voice-search-declaration', 'voice-event-condition']
        },
        codewiki: {
          wikiMeaning: '当前事件判断使语音工具入口不可达，图中的后续步骤只是设计意图。',
          explanation: '它区分了想实现的流程与当前能运行的流程，准确识别了同一字段的互斥条件。',
          skillAction: '保留“声明、入口条件、设计意图”三项核查，并在最终一致性检查中同步到能力概览。',
          sourceIds: ['voice-event-condition']
        },
        openwiki: {
          wikiMeaning: '收到语音事件后就会执行搜索，再把结果交回模型继续回答。',
          explanation: '这把写好的处理步骤当成了能够到达的流程；实际入口条件先把它阻断了。',
          skillAction: '先追踪事件对象及别名，再检查路径条件是否能同时满足，之后才判断功能是否支持。',
          sourceIds: ['voice-search-declaration', 'voice-event-condition']
        },
        'deepwiki-open': {
          wikiMeaning: '语音组件负责采集、播放声音和管理连接，没有说明这个工具入口是否可达。',
          explanation: '缺少的是事件分支核查，不是这些组件职责描述被证伪。',
          skillAction: '为已声明工具建立“注册到事件入口”的覆盖清单，未验证的执行链明确列为缺口。',
          sourceIds: ['voice-search-declaration', 'voice-event-condition']
        },
        devinwiki: {
          wikiMeaning: '英文 API 章节主要介绍早期文字聊天，没有分析最终版本的语音事件入口。',
          explanation: '它没有回答本例问题，不能因此说它明确承诺过语音搜索可用。',
          skillAction: '先按挑战阶段盘点能力，再为最终阶段补齐事件入口证据，避免早期 API 页代表整个仓库。',
          sourceIds: ['voice-event-condition'],
          scopeNote: '这里的代码是第五关核查基准；英文原文主要对应第一关，中文编辑摘要不作为补充证据。'
        }
      }
    },
    'itinerary-parameter-contract': {
      sourceExcerpts: [
        {
          id: 'itinerary-caller', title: '调用工具前已经解析了参数',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 211, endLine: 216,
          code: "    else if (event === 'function_arguments_done') {\n      // Get tool call result\n      const toolCallResult = await handleTool(\n        data.name,\n        parse(functionArguments)\n      )\n",
          takeaway: '调用方先解析模型参数，再将解析结果交给工具分发器。'
        },
        {
          id: 'itinerary-parser', title: '行程分支又解析一次，随后才准备发请求',
          file: 'challenge5/frontend/lib/tools.ts', startLine: 17, endLine: 24,
          code: "  if (toolName === 'plan_itinerary') {\n    console.log('Handling tool plan_itinerary', parameters)\n    const { stops } = JSON.parse(parameters)\n    // If using the python backend, use the following endpoint:\n    //const response = await fetch('http://localhost:8000/plan_itinerary', {\n    const response = await fetch('/api/create_itinerary', {\n      method: 'POST',\n      body: JSON.stringify({ stops }),\n",
          takeaway: '普通对象再次进入 JSON.parse 会触发 SyntaxError，失败发生在 HTTP 请求之前。'
        },
        {
          id: 'search-parameter-shape', title: '同一分发器的搜索分支直接读取对象',
          file: 'challenge5/frontend/lib/tools.ts', startLine: 1, endLine: 4,
          code: "export const handleTool = async (toolName: string, parameters: any) => {\n  if (toolName === 'search_location') {\n    console.log('Handling tool search_location', parameters)\n    const { location, search_query } = parameters\n",
          takeaway: '两个工具分支采用不同参数形态，不能用搜索分支概括整个分发器。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '概览称行程工具已经形成执行流程，分发器专页却准确写出对象重复解析会在请求前失败。',
          explanation: '这是概览与已有诊断不一致。对“普通对象输入”的条件性证明，不应被概览中谨慎的措辞或修复建议覆盖。',
          skillAction: '把跨函数参数契约与已发现失败条件汇入能力清单，再执行概览和专页的一致性检查。',
          sourceIds: ['itinerary-caller', 'itinerary-parser']
        },
        codewiki: {
          wikiMeaning: '前面已把参数变成对象，行程分支又做 JSON 解析，因此会失败。',
          explanation: '核心因果链正确；普通对象输入触发的是 SyntaxError，原文“类型错误”不要理解成 JavaScript TypeError。',
          skillAction: '用最小输入验证异常类型，并让生成的诊断同时注明输入前提和准确异常名。',
          sourceIds: ['itinerary-caller', 'itinerary-parser']
        },
        openwiki: {
          wikiMeaning: '分别写出了调用前解析与行程分支再次解析，也区分早期字符串和最终对象，但没说明接起来的结果。',
          explanation: '局部步骤有用，缺的是跨函数失败分析；没有明确错误断言时，应判缺漏而不是判整个流程说明为假。',
          skillAction: '生成接口说明时逐边记录输入输出类型，把调用方与被调用方放在同一契约表中核对。',
          sourceIds: ['itinerary-caller', 'itinerary-parser']
        },
        'deepwiki-open': {
          wikiMeaning: '阶段表说第五关直接使用参数对象，专页又注意到搜索和行程分支处理不同。',
          explanation: '分支差异观察正确，但统一对象的概括过宽，且还没串起请求前失败的完整原因。',
          skillAction: '逐个分支核对参数形态，再把例外合并回阶段对比表，禁止用单一分支代表全部工具。',
          sourceIds: ['itinerary-caller', 'itinerary-parser', 'search-parameter-shape']
        },
        devinwiki: {
          wikiMeaning: '英文工具章节介绍定义、执行和展示工具的一般框架，没有讲实际行程工具的解析链。',
          explanation: '通用框架介绍不等于覆盖这个最终阶段缺陷，也不是对该缺陷作了错误判断。',
          skillAction: '从真实工具注册名生成覆盖清单，为每个工具追踪一次调用方、分发器与后端参数。',
          sourceIds: ['itinerary-caller', 'itinerary-parser'],
          scopeNote: '所示第五关代码用于说明缺失的具体检查点，不把早期通用工具介绍当作对这段代码的断言。'
        }
      }
    },
    'voice-config-consumer': {
      sourceExcerpts: [
        {
          id: 'voice-session-import', title: '服务端路由明确导入声音配置',
          file: 'challenge5/frontend/app/api/session/route.ts', startLine: 1, endLine: 1,
          code: "import { REALTIME_MODEL, VOICE } from '@/lib/constants'\n",
          takeaway: 'VOICE 的消费者在服务端创建会话的路由，不只可能在浏览器组件。'
        },
        {
          id: 'voice-session-body', title: '声音配置进入创建会话的请求体',
          file: 'challenge5/frontend/app/api/session/route.ts', startLine: 12, endLine: 16,
          code: "      body: JSON.stringify({\n        model: REALTIME_MODEL,\n        voice: VOICE\n      })\n    })\n",
          takeaway: '不只是存在导入，VOICE 还实际被放进会话创建请求。'
        },
        {
          id: 'voice-browser-imports', title: '浏览器的这组导入不含 VOICE',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 4, endLine: 9,
          code: "import {\n  REALTIME_BASE_URL,\n  REALTIME_MODEL,\n  REALTIME_PROMPT,\n  REALTIME_TOOLS\n} from '@/lib/constants'\n",
          takeaway: '只看这一个导入点，无法判断整条语音链路是否使用了声音配置。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '会话专页说服务端路由读取声音配置；概览提醒浏览器没有直接导入它。',
          explanation: '实际消费者的说明是正确的。概览没有明确断言声音配置未使用，不能把这句提醒反向解释成事实错误。',
          skillAction: '建立配置的全部消费者索引，并在概览引用已确认的跨服务端、浏览器消费关系。',
          sourceIds: ['voice-session-import', 'voice-session-body', 'voice-browser-imports']
        },
        codewiki: {
          wikiMeaning: '浏览器先从会话接口拿临时凭据，但原文没有解释声音配置在这里如何使用。',
          explanation: '凭据流程没有错，缺的是具体配置从定义到请求体的追踪。',
          skillAction: '对每项运行配置追踪“导出、导入、请求字段”，不要用端点介绍替代配置消费核查。',
          sourceIds: ['voice-session-import', 'voice-session-body']
        },
        openwiki: {
          wikiMeaning: '声音选项 coral 会在服务端申请实时会话时传给 Realtime。',
          explanation: '它找到了声音配置的真实消费位置，浏览器不必再直接导入。',
          skillAction: '将已有的配置到请求字段对应关系纳入生成校验，并对其他配置逐项独立验证。',
          sourceIds: ['voice-session-import', 'voice-session-body']
        },
        'deepwiki-open': {
          wikiMeaning: '展示了服务端会话请求代码，里面有 voice: VOICE。',
          explanation: '这段代码足以证明配置已被使用，但不能据此推定同文件所有其他配置也有同样消费者。',
          skillAction: '让生成的配置说明同时提供消费代码和职责解释，而不是仅列常量名称或值。',
          sourceIds: ['voice-session-import', 'voice-session-body']
        },
        devinwiki: {
          wikiMeaning: '英文 API 页主要讲早期文字请求，没有讲实时会话的声音配置。',
          explanation: '它没有覆盖这个配置问题，并没有明确说 VOICE 未使用。',
          skillAction: '按阶段核对新增端点与配置，为实时会话新增独立的消费者追踪条目。',
          sourceIds: ['voice-session-import', 'voice-session-body'],
          scopeNote: '源码片段来自第五关；第一关的文字 API 说明不能代替第五关会话配置说明。'
        }
      }
    },
    'async-error-boundary': {
      sourceExcerpts: [
        {
          id: 'async-unawaited-callback', title: '调用回调没有 await，外层随后结束',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 73, endLine: 82,
          code: "    if (buffer && buffer.startsWith('data: ')) {\n      const dataStr = buffer.slice(6)\n      if (dataStr !== '[DONE]') {\n        const data = JSON.parse(dataStr)\n        onMessage(data)\n      }\n    }\n  } catch (error) {\n    console.error('Error handling turn:', error)\n  }\n",
          takeaway: 'try/catch 包着调用动作，但没有接住回调返回的 Promise；异步拒绝不会自动进入这个 catch。'
        },
        {
          id: 'async-callback-declaration', title: '实际传入的是 async 回调',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 104, endLine: 104,
          code: "  await handleTurn(allConversationItems, async ({ event, data }) => {\n",
          takeaway: '等待 handleTurn 不等于 handleTurn 内部会等待传入的 async 回调。'
        },
        {
          id: 'async-tool-work', title: '工具请求发生在这个异步回调内部',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 211, endLine: 216,
          code: "    else if (event === 'function_arguments_done') {\n      // Get tool call result\n      const toolCallResult = await handleTool(\n        data.name,\n        parse(functionArguments)\n      )\n",
          takeaway: '工具失败会影响回调的 Promise；如果调用者不等待或另行捕获，它不属于外层的错误处理。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '阶段页说回调异常会由外层 catch 记录；工具续轮专页又指出读取器没等待异步回调。',
          explanation: '专页的等待边界观察正确，但阶段页的异常保证过宽。同步解析错误与稍后的 Promise 拒绝不是一回事。',
          skillAction: '为每个异步调用标注谁等待、谁捕获，再把这份错误传播关系用于跨页结论一致性检查。',
          sourceIds: ['async-unawaited-callback', 'async-callback-declaration', 'async-tool-work']
        },
        codewiki: {
          wikiMeaning: '异步回调没有被等待，工具和后续回合可能出现未捕获的拒绝。',
          explanation: '这准确区分了读取器完成和回调工作完成，覆盖了本例真正的异常边界。',
          skillAction: '保留 Promise 传播检查，并用可控的回调失败用例验证诊断；明确区分建议测试与实际执行结果。',
          sourceIds: ['async-unawaited-callback', 'async-callback-declaration']
        },
        openwiki: {
          wikiMeaning: '列出了几层错误处理和日志位置，但没有分析未等待回调产生的拒绝。',
          explanation: '列出 catch 并没有错，只是还没有证明哪些异步失败能被它处理；原文也未明确保证全部拒绝都能接住。',
          skillAction: '从 catch 清单继续追踪每条 async 调用的返回值，把未被等待的边单独列出。',
          sourceIds: ['async-unawaited-callback', 'async-callback-declaration']
        },
        'deepwiki-open': {
          wikiMeaning: '消息模块负责前端与接口之间的收发，没有说明回调的异步错误边界。',
          explanation: '这是机制覆盖不足，其他服务端路由的错误处理描述不能替代这个客户端回调问题。',
          skillAction: '逐层区分路由、流读取器和事件回调的错误责任，禁止跨层借用 catch 作为保证。',
          sourceIds: ['async-unawaited-callback', 'async-callback-declaration']
        },
        devinwiki: {
          wikiMeaning: '英文原文说早期前端会捕获网络和 API 错误，没有涉及最终流式回调。',
          explanation: '早期错误处理说明不能被套到后来新增的回调结构上，也不能因此判它在早期范围内错误。',
          skillAction: '比较阶段间异步结构的变化，只对实际出现新回调的阶段追加 Promise 传播分析。',
          sourceIds: ['async-unawaited-callback', 'async-callback-declaration'],
          scopeNote: '此处展示第五关新增的检查点；英文原文的错误处理证据引用第一关，不是这段回调。'
        }
      }
    },
    'utf8-stream-boundary': {
      sourceExcerpts: [
        {
          id: 'utf8-read-decode', title: '先逐块解码，再拼接字符串记录',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 45, endLine: 57,
          code: "    const reader = response.body!.getReader()\n    const decoder = new TextDecoder()\n    let done = false\n    let buffer = ''\n\n    while (!done) {\n      const { value, done: doneReading } = await reader.read()\n      done = doneReading\n      const chunkValue = decoder.decode(value)\n      buffer += chunkValue\n\n      const lines = buffer.split('\\n\\n')\n      buffer = lines.pop() || ''\n",
          takeaway: 'decode 没有启用 stream 选项；后续字符串缓冲不能修复已经在字节边界解坏的多字节字符。'
        },
        {
          id: 'utf8-early-json', title: '第一关读取完整 JSON，不是这个逐块解码器',
          file: 'challenge1/frontend/lib/assistant.ts', startLine: 55, endLine: 55,
          code: "    const data: MessageItem = await response.json()\n",
          takeaway: '早期响应读取方式不同，不能把早期 JSON 介绍当作已分析最终流式解码。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '读取器把网络分块组合成应用事件，原文重点解释字符串缓冲和记录分帧。',
          explanation: '它没有明确保证所有中文都能无损还原。本项缺的是字节解码边界，不应把已有分帧分析直接判为错误。',
          skillAction: '把字节解码与记录拼接拆成两个检查点，用跨字符字节边界的样例验证后再描述可靠性。',
          sourceIds: ['utf8-read-decode']
        },
        codewiki: {
          wikiMeaning: '没有开启流式解码，多字节字符恰好跨网络块时存在风险。',
          explanation: '条件性风险判断正确；默认解码可能产生替换字符，原文“解码异常”不宜理解为一定抛出异常。',
          skillAction: '用最小分块样例核对实际输出，生成时区分替换字符、抛异常和正常记录重组。',
          sourceIds: ['utf8-read-decode']
        },
        openwiki: {
          wikiMeaning: '每块先解码为字符串，再追加到缓冲区，之后按事件记录拆分。',
          explanation: '正常步骤说明有用，但没有回答一个字符被拆在两块之间时怎样处理。',
          skillAction: '为分块协议建立字节、文本、记录三层检查表，不以文本缓冲替代解码状态核查。',
          sourceIds: ['utf8-read-decode']
        },
        'deepwiki-open': {
          wikiMeaning: '服务端使用 TextEncoder 把文本变成字节流，没有讲客户端跨块解码。',
          explanation: '编码说明并非错误，但编码端与解码端是两个独立检查点，前者不能证明后者无损。',
          skillAction: '成对追踪编码端和解码端，并为客户端保留跨块字符测试项及覆盖状态。',
          sourceIds: ['utf8-read-decode']
        },
        devinwiki: {
          wikiMeaning: '英文原文描述早期接口返回完整 JSON，没有分析逐块显示文本。',
          explanation: '第一关使用完整 JSON 读取；第五关的解码风险是后来出现的具体机制，原文没有覆盖它。',
          skillAction: '按响应协议对阶段分类，再为新增流式阶段单独检查解码状态和分块边界。',
          sourceIds: ['utf8-early-json', 'utf8-read-decode'],
          scopeNote: '早期 JSON 示例用于说明原文范围，不是第五关字符安全性的证据。'
        }
      }
    },
    'microphone-cleanup': {
      sourceExcerpts: [
        {
          id: 'mic-state', title: '供停止函数使用的流状态初始为空',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 23, endLine: 23,
          code: "  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)\n",
          takeaway: '停止函数后面检查的是这个 state，不是启动函数中的局部变量。'
        },
        {
          id: 'mic-acquire', title: '取得麦克风流后，只在局部变量中使用',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 55, endLine: 64,
          code: "        const stream = await navigator.mediaDevices.getUserMedia({\n          audio: true\n        })\n\n        stream.getTracks().forEach(track => {\n          const sender = pc.addTrack(track, stream)\n          if (sender) {\n            tracks.current = [...(tracks.current || []), sender]\n          }\n        })\n",
          takeaway: '这里把音轨加入连接，没有把 stream 保存到 audioStream。全文件检查也没有 setAudioStream(stream)。'
        },
        {
          id: 'mic-close-connection', title: '连接关闭步骤确实存在',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 100, endLine: 106,
          code: "  function stopSession() {\n    if (dataChannel) {\n      dataChannel.close()\n    }\n    if (peerConnection.current) {\n      peerConnection.current.close()\n    }\n",
          takeaway: '关闭数据通道和连接是真实操作，不能因音轨缺口就说整个停止动作不存在。'
        },
        {
          id: 'mic-stop-tracks', title: '停止音轨依赖没有保存成功的状态',
          file: 'challenge5/frontend/components/voice-mode.tsx', startLine: 112, endLine: 117,
          code: "    if (audioStream) {\n      audioStream.getTracks().forEach(track => track.stop())\n    }\n    setAudioStream(null)\n    audioTransceiver.current = null\n  }\n",
          takeaway: '启动路径没有使 audioStream 变成真实流，因此这个分支不能停止之前申请的麦克风音轨。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '生命周期专页已经指出真实麦克风流没保存，停止函数找不到它；阶段概述只笼统说“可停止”。',
          explanation: '具体诊断是正确的。“可停止”可以指连接关闭，不能把含糊概述直接当作完整音轨释放的错误保证。',
          skillAction: '用资源的获取、保存、释放关系核查生命周期，再让摘要明确区分连接关闭与音轨释放。',
          sourceIds: ['mic-acquire', 'mic-close-connection', 'mic-stop-tracks']
        },
        codewiki: {
          wikiMeaning: '麦克风流没有写入状态，所以显式停止音轨的分支不会执行。',
          explanation: '它追到了资源没有交给清理函数这一原因，而不是只看函数里有没有 stop 调用。',
          skillAction: '保留资源所有权追踪，并将释放分支的前提纳入生成时的生命周期检查清单。',
          sourceIds: ['mic-state', 'mic-acquire', 'mic-stop-tracks']
        },
        openwiki: {
          wikiMeaning: '停止流程会关掉连接，并停止本地音轨以释放麦克风。',
          explanation: '连接关闭部分成立，但音轨释放被写成已发生；实际流没有保存，停止分支取不到它。',
          skillAction: '从释放语句反向追踪资源赋值与条件，验证前提满足后才描述为实际完成的清理。',
          sourceIds: ['mic-acquire', 'mic-close-connection', 'mic-stop-tracks']
        },
        'deepwiki-open': {
          wikiMeaning: '语音组件承担音频和连接管理，没有细讲麦克风流保存与停止条件。',
          explanation: '本项是资源生命周期未覆盖，不代表它的全部音频职责说明错误。',
          skillAction: '对每个媒体资源生成获取、持有者、释放者的关系表，缺失环节明确记为待核查。',
          sourceIds: ['mic-acquire', 'mic-stop-tracks']
        },
        devinwiki: {
          wikiMeaning: '英文原文主要讲早期文本接口，没有麦克风资源管理说明。',
          explanation: '没有同一语音生命周期可供判断；不能给它加上“已经正确释放麦克风”的承诺。',
          skillAction: '先识别各阶段新增资源，再补齐语音阶段的所有权与清理核查，而不是复用文本接口模板。',
          sourceIds: ['mic-acquire', 'mic-stop-tracks'],
          scopeNote: '这里展示第五关媒体代码；原文的早期文本范围不包含这一资源。'
        }
      }
    },
    'final-model-config': {
      sourceExcerpts: [
        {
          id: 'model-shared-export', title: '共享文件中确实有一个 MODEL',
          file: 'challenge5/frontend/lib/constants.ts', startLine: 1, endLine: 1,
          code: "export const MODEL = 'gpt-4o'\n",
          takeaway: '常量存在只能证明有这项声明，还需要核对最终请求是否读取它。'
        },
        {
          id: 'model-final-local', title: '第五关路由定义了自己的同名常量',
          file: 'challenge5/frontend/app/api/get_response/route.ts', startLine: 1, endLine: 6,
          code: "import OpenAI from 'openai'\nimport { tools } from '@/lib/tools'\nimport { ChatCompletionTool } from 'openai/resources/chat/completions.mjs'\nconst openai = new OpenAI()\n\nconst MODEL = 'gpt-4o'\n",
          takeaway: '完整导入段没有导入共享 MODEL；随后在路由文件内定义了一个独立 MODEL。'
        },
        {
          id: 'model-final-call', title: '最终请求读取路由内的 MODEL',
          file: 'challenge5/frontend/app/api/get_response/route.ts', startLine: 18, endLine: 22,
          code: "          const openaiStream = openai.beta.chat.completions.stream({\n            model: MODEL,\n            messages,\n            tools: tools as ChatCompletionTool[]\n          })\n",
          takeaway: '这个引用绑定到路由内常量，仅修改共享文件不会改变本次请求的模型。'
        },
        {
          id: 'model-early-import', title: '第一关确实导入共享 MODEL',
          file: 'challenge1/frontend/app/api/get_response/route.ts', startLine: 1, endLine: 3,
          code: "import { MODEL } from '@/lib/constants'\nimport OpenAI from 'openai'\nconst openai = new OpenAI()\n",
          takeaway: '早期阶段与第五关的配置来源不同，不能混用结论。'
        },
        {
          id: 'model-early-call', title: '第一关请求实际使用导入的值',
          file: 'challenge1/frontend/app/api/get_response/route.ts', startLine: 11, endLine: 18,
          code: "    const response = await openai.chat.completions.create({\n      model: MODEL,\n      // System prompt is already included in the messages array\n      messages\n    })\n\n    const result = response.choices[0].message\n    return new Response(JSON.stringify(result))\n",
          takeaway: '在第一关，“从 constants 导入模型”的描述同时得到导入和使用位置支持。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '介绍了共享常量文件中的模型配置，但没有解释第五关文字请求另用局部 MODEL。',
          explanation: '共享声明的位置没有说错；缺少的是最终生效点，原文未明确承诺改共享值就会改变最终模型。',
          skillAction: '从每个实际模型请求反向追踪变量绑定，再按阶段生成配置消费表。',
          sourceIds: ['model-shared-export', 'model-final-local', 'model-final-call']
        },
        codewiki: {
          wikiMeaning: '维护表提醒检查 MODEL、实时模型和行程模型，没有具体点出第五关的局部定义。',
          explanation: '这是修改位置索引不完整，不等于已经作出错误的导入断言。',
          skillAction: '让维护索引覆盖每个请求调用点及其配置定义，检查同名常量是否属于不同作用域。',
          sourceIds: ['model-final-local', 'model-final-call']
        },
        openwiki: {
          wikiMeaning: '更换模型可以去共享常量文件修改 MODEL，但指引漏掉了最终文字路由的独立值。',
          explanation: '对最终 Next.js 文字请求，仅改共享 MODEL 不会生效；这个操作指引的范围因此过宽。',
          skillAction: '生成配置操作指引前，按阶段和后端核验真实消费者，逐项验证修改会影响哪个请求。',
          sourceIds: ['model-shared-export', 'model-final-local', 'model-final-call']
        },
        'deepwiki-open': {
          wikiMeaning: '第五关路由示例的注释说 MODEL 从共享常量文件导入。',
          explanation: '这与该路由完整导入段和局部定义不符，是明确的来源判断错误，而不仅是少写一个位置。',
          skillAction: '代码示例和来源注释必须同时对照原始导入段与使用点，禁止从旧阶段模板补全。',
          sourceIds: ['model-final-local', 'model-final-call']
        },
        devinwiki: {
          wikiMeaning: '英文原文说模型从 constants 文件导入，引用的是第一关路由。',
          explanation: '这个早期描述成立；第五关另有局部定义，但原文没有覆盖该差异，不能据此反判早期描述为假。',
          skillAction: '给每条配置结论绑定阶段来源，再对最终阶段重新追踪变量绑定，避免跨版本沿用。',
          sourceIds: ['model-early-import', 'model-early-call', 'model-final-local', 'model-final-call'],
          scopeNote: '第一关代码解释英文原文为何成立；第五关代码说明本例还缺少哪项最终生效点分析。'
        }
      }
    },
    'backend-substitution': {
      sourceExcerpts: [
        {
          id: 'backend-next-sse', title: '最终 Next.js 接口返回事件流',
          file: 'challenge5/frontend/app/api/get_response/route.ts', startLine: 90, endLine: 96,
          code: "    return new Response(stream, {\n      headers: {\n        'Content-Type': 'text/event-stream',\n        'Cache-Control': 'no-cache',\n        Connection: 'keep-alive'\n      }\n    })\n",
          takeaway: '最终接口返回 stream，并明确声明 text/event-stream，而非一个完整 JSON 消息。'
        },
        {
          id: 'backend-flask-json', title: '最终 Flask 仍使用完整消息的 JSON 返回路径',
          file: 'challenge5/python-backend/app.py', startLine: 96, endLine: 107,
          code: "def get_response():\n    data = request.get_json()\n    messages = data['messages']\n    print(\"Incoming messages\", messages)\n    completion = client.chat.completions.create(\n      model=MODEL,\n      # System prompt is already included in the messages array\n      messages=messages,\n      tools=tools\n    )\n    response_message = completion.choices[0].message\n    return jsonify(response_message)\n",
          takeaway: '这里先取得完整 message，再交给 jsonify；没有生成客户端所期待的 SSE 事件。'
        },
        {
          id: 'backend-client-framing', title: '最终客户端按 data 事件读取内容',
          file: 'challenge5/frontend/lib/assistant.ts', startLine: 59, endLine: 67,
          code: "      for (const line of lines) {\n        if (line.startsWith('data: ')) {\n          const dataStr = line.slice(6)\n          if (dataStr === '[DONE]') {\n            done = true\n            break\n          }\n          const data = JSON.parse(dataStr)\n          onMessage(data)\n",
          takeaway: '客户端读取的是带 data 前缀的事件记录，不能只换地址就把单个 JSON 响应当作等价输入。'
        },
        {
          id: 'backend-next-session', title: 'Next.js 另有实时会话创建入口',
          file: 'challenge5/frontend/app/api/session/route.ts', startLine: 3, endLine: 7,
          code: "// Get an ephemeral session token from the /realtime/sessions endpoint\nexport async function GET() {\n  try {\n    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {\n      method: 'POST',\n",
          takeaway: '这个片段证明 Next.js 有实时会话代理；Flask 没有对应路由的结论另经完整文件核查。'
        },
        {
          id: 'backend-early-next-json', title: '第一关 Next.js 返回完整 JSON',
          file: 'challenge1/frontend/app/api/get_response/route.ts', startLine: 11, endLine: 18,
          code: "    const response = await openai.chat.completions.create({\n      model: MODEL,\n      // System prompt is already included in the messages array\n      messages\n    })\n\n    const result = response.choices[0].message\n    return new Response(JSON.stringify(result))\n",
          takeaway: '早期文字接口还没有采用第五关的事件流协议。'
        },
        {
          id: 'backend-early-flask-json', title: '第一关 Flask 也采用完整消息路径',
          file: 'challenge1/python-backend/app.py', startLine: 18, endLine: 29,
          code: "@app.route('/get_response', methods=['POST'])\ndef get_response():\n    data = request.get_json()\n    messages = data['messages']\n    print(\"Incoming messages\", messages)\n    completion = client.chat.completions.create(\n      model=MODEL,\n      # System prompt is already included in the messages array\n      messages=messages\n    )\n    response_message = completion.choices[0].message\n    return jsonify(response_message)\n",
          takeaway: '早期两条文字路径都基于完整消息；这不能证明最终流式和语音能力也能直接替换。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '只换请求地址不足以接入最终 Flask 后端，因为客户端要事件流，而 Flask 走完整 JSON。',
          explanation: '这个边界判断正确，核对了响应格式和客户端读取方式，而不是只比较端点名称。',
          skillAction: '保留“响应格式对消费者”的双向核查，并按阶段生成后端兼容性表。',
          sourceIds: ['backend-next-sse', 'backend-flask-json', 'backend-client-framing']
        },
        codewiki: {
          wikiMeaning: 'Python 后端没有最终事件流协议和实时会话接口，不能完整替代 Next.js。',
          explanation: '它明确区分了部分工具端点相似和最终全部能力可替代，这个结论得到源码支持。',
          skillAction: '把端点清单、响应协议和客户端预期一起比较，不以名称对应作为完整等价条件。',
          sourceIds: ['backend-next-sse', 'backend-flask-json', 'backend-next-session'],
          scopeNote: '未发现 Flask 会话路由来自完整 app.py 核查；这里只展示响应差异及 Next.js 入口，不用一小段代码证明整个文件的缺失。'
        },
        openwiki: {
          wikiMeaning: '一处说只改 URL 就是等价替代，另一处又提醒 Flask 不流式、客户端解析需要调整。',
          explanation: '正确的协议限制已写出，却与同页的完全等价结论冲突，不能只选其中一种说法代表全文。',
          skillAction: '从兼容性表生成切换指引，再检查同页摘要是否遗漏任何协议或端点限制。',
          sourceIds: ['backend-next-sse', 'backend-flask-json', 'backend-client-framing']
        },
        'deepwiki-open': {
          wikiMeaning: 'Flask 有与 Next.js 对应的工具端点，但没有讨论最终文本流和实时会话边界。',
          explanation: '局部端点对应不等于全部兼容；原文没有明确的完全等价保证，因此本项是覆盖不足。',
          skillAction: '分别核对文字响应、搜索、行程和实时会话，给每一类标注已验证的兼容范围。',
          sourceIds: ['backend-next-sse', 'backend-flask-json']
        },
        devinwiki: {
          wikiMeaning: '英文原文介绍可以改用 Python 后端，证据范围是第一关文字聊天。',
          explanation: '早期说明不能直接套用到第五关的事件流和语音；这里缺少最终阶段对比，不是早期指引已被证伪。',
          skillAction: '将后端切换指引绑定具体阶段，遇到响应协议变化时重新生成兼容性检查。',
          sourceIds: ['backend-early-next-json', 'backend-early-flask-json', 'backend-next-sse'],
          scopeNote: '前两个片段解释英文原文的早期范围；最后一个展示第五关的新协议，不据此承诺早期端点所有运行细节完全一致。'
        }
      }
    },
    'completion-diagram-direction': {
      sourceExcerpts: [
        {
          id: 'diagram-final-request', title: '第五关由应用路由向模型请求补全',
          file: 'challenge5/frontend/app/api/get_response/route.ts', startLine: 18, endLine: 22,
          code: "          const openaiStream = openai.beta.chat.completions.stream({\n            model: MODEL,\n            messages,\n            tools: tools as ChatCompletionTool[]\n          })\n",
          takeaway: '调用表达式位于 get_response 路由中，请求方向是路由到 OpenAI。'
        },
        {
          id: 'diagram-final-read', title: '路由读取模型返回的增量',
          file: 'challenge5/frontend/app/api/get_response/route.ts', startLine: 29, endLine: 31,
          code: "          for await (const part of openaiStream) {\n            const delta = part.choices[0].delta\n            const finishReason = part.choices[0].finish_reason\n",
          takeaway: '数据从模型流返回路由，不能把路由画成向模型返回 assistant 消息的一方。'
        },
        {
          id: 'diagram-early-tool-request', title: '第二关的工具聊天也遵循同一请求方向',
          file: 'challenge2/frontend/app/api/get_response/route.ts', startLine: 13, endLine: 21,
          code: "    const response = await openai.chat.completions.create({\n      model: MODEL,\n      // System prompt is already included in the messages array\n      messages,\n      tools: tools as ChatCompletionTool[]\n    })\n\n    const result = response.choices[0].message\n    return new Response(JSON.stringify(result))\n",
          takeaway: '带工具定义的请求由路由发出，模型 message 被路由接收后再返回客户端。'
        },
        {
          id: 'diagram-first-request', title: '第一关英文图对应的实际请求与返回',
          file: 'challenge1/frontend/app/api/get_response/route.ts', startLine: 11, endLine: 18,
          code: "    const response = await openai.chat.completions.create({\n      model: MODEL,\n      // System prompt is already included in the messages array\n      messages\n    })\n\n    const result = response.choices[0].message\n    return new Response(JSON.stringify(result))\n",
          takeaway: '第一关也是路由调用模型、读取回复；此片段不包含最终阶段工具或流式处理。'
        }
      ],
      tools: {
        'local-skill': {
          wikiMeaning: '图中响应路由向聊天模型请求补全，模型把文本或工具增量返回路由。',
          explanation: '这组请求与返回箭头方向正确。只核对这组方向，不代表图中的整轮完成或其他异步语义也都正确。',
          skillAction: '将每个参与者绑定到实际文件和调用点，逐箭头核对方向，同时保留图示范围限定。',
          sourceIds: ['diagram-final-request', 'diagram-final-read']
        },
        codewiki: {
          wikiMeaning: '早期工具循环图由应用路由向 OpenAI 发出请求，模型返回 assistant 消息。',
          explanation: '明确的参与者身份与实际调用方向一致，但这是早期非流式流程图，不能代替最终全部事件分析。',
          skillAction: '给图绑定阶段来源，再核对请求表达式与返回值的流向，不把基础方向正确扩成整图正确。',
          sourceIds: ['diagram-early-tool-request'],
          scopeNote: '原图范围为第二至第四关；这里展示第二关的同一调用关系。'
        },
        openwiki: {
          wikiMeaning: '相邻文字说路由把工具定义交给 OpenAI，图却画成模型向路由请求补全、路由向模型返回回答。',
          explanation: '文字和图并存且相互冲突；错在已标明身份的请求方与响应方颠倒，不是新增一个工具执行先后错误。',
          skillAction: '从实际调用点生成带身份绑定的箭头表，再逐边检查图与相邻文字的一致性。',
          sourceIds: ['diagram-final-request', 'diagram-final-read']
        },
        'deepwiki-open': {
          wikiMeaning: '所引图中 API 路由向 OpenAI 请求补全，OpenAI 将结果反向返回。',
          explanation: '这一组方向正确。此判断不覆盖图旁的模型配置、API 调用方式或完整响应格式。',
          skillAction: '将箭头方向、接口参数和响应协议分开验收，避免一个检查点通过就给整图背书。',
          sourceIds: ['diagram-final-request', 'diagram-final-read'],
          scopeNote: '只对照所引图的路由与模型这两个参与者，不评价其他简化图省略中间层的方式。'
        },
        devinwiki: {
          wikiMeaning: '英文图中 get_response 接口向 OpenAI 请求回答，OpenAI 再把 assistant response 返回。',
          explanation: '第一关的实际代码支持这组基础方向；它没有因此覆盖第五关的工具调用和流式实现。',
          skillAction: '保留英文原图与阶段来源的关联，只把已核验关系复用到跨阶段比较中。',
          sourceIds: ['diagram-first-request'],
          scopeNote: '英文原图基于第一关；本项正确仅指请求与返回方向。'
        }
      }
    },
    'source-reference-navigation': {
      sourceExcerpts: [],
      tools: {
        'local-skill': {
          wikiMeaning: '行程说明给出了两处源码路径与行号，但公开正文中只是文字，不能直接点击。',
          explanation: '问题是这两个引用样本的导航体验，不是相邻技术说明一定错误，也不表示所有引用都失效。',
          skillAction: '生成后检查源码引用是否成为真实链接，并验证固定提交、文件和行号，而不是只统计引用数量。',
          sourceIds: [],
          scopeNote: '本项依据已列原文的链接结构，不由应用源码证明，所以不附应用代码片段。'
        },
        codewiki: {
          wikiMeaning: '行程工具说明后的分发器和行程接口引用，都能点击到对应固定版本的源文件。',
          explanation: '这两个导航样本可用，不代表所有引用或引用旁的事实判断都已验证。',
          skillAction: '保留有上下文的源码链接，并在生成完成检查中抽验目标文件；将可点击性与事实支撑分开检查。',
          sourceIds: [],
          scopeNote: '只检查公开归档正文中所列两处链接，链接本身是证据，无需展示应用代码来证明它能点击。'
        },
        openwiki: {
          wikiMeaning: '行程分派和行程接口的两处正文位置是代码格式文字，没有对应超链接。',
          explanation: '这是所列归档正文的导航缺口。原始文件还有来源元数据，不能据此断言原生查看器完全没有源码入口。',
          skillAction: '静态导出时将正文源码位置与来源元数据建立映射，再检查输出为链接而非仅代码格式文本。',
          sourceIds: [],
          scopeNote: '只评价两个公开正文样本，不评价原始元数据或原生查看器；应用源码不能证明文档链接结构。'
        },
        'deepwiki-open': {
          wikiMeaning: '快速开始页的分发器和行程接口来源，均提供固定版本源码及行号链接。',
          explanation: '所列链接可定位到对应文件；引用可定位不等于附近每个结论都被源码支持。',
          skillAction: '保留提交与行号解析校验，同时另做“引用是否支撑结论”的检查，避免把链接有效当成内容正确。',
          sourceIds: [],
          scopeNote: '仅检查公开归档的代表性来源段落，不评价全部引用或原生查看器。'
        },
        devinwiki: {
          wikiMeaning: '英文原文介绍通用工具框架，没有实际行程参数和接口说明。',
          explanation: '没有同一说明，就不能给不存在的对应引用打通过或失败；未覆盖不代表其他链接都不可用。',
          skillAction: '先按真实工具与端点核对内容覆盖，再检查这些说明的源码引用，禁止对缺失章节默认判通过。',
          sourceIds: [],
          scopeNote: '此判断只依据英文原文的实际覆盖，不能用中文编辑摘要的引用补齐。'
        }
      }
    }
  }
};

window.WIKI_OUTPUT_PROFILES = {
  commit: 'e87f060e4e86d599ee54bdc7b752484944278f85',
  tools: {
    'local-skill': {
      label: 'Local Skill',
      observations: [
        {
          title: '把运行过程拆成独立专题',
          text: '双轨会话单独成篇，区分屏幕上显示的消息和下一次发给模型的消息。',
          evidence: {
            page: 'local-skill.html',
            anchor: 'original-14-双轨会话状态',
            match: 'chatMessages 保存用户真正看到的界面条目，conversationItems 保存下一次 Chat Completions 请求需要的协议消息。'
          }
        },
        {
          title: '专页追到具体执行条件',
          text: '语音工具专页不仅列流程，还检查入口条件能否成立；这是可逐句核对的分析材料。',
          evidence: {
            page: 'local-skill.html',
            anchor: 'original-28-语音工具回填桥',
            match: '因为 output 与 event 是同一个对象，同一个 type 字段无法同时满足两个不同字符串，所以 handleToolCall 在这段活动代码中不会被调用。'
          }
        }
      ]
    },
    codewiki: {
      label: 'CodeWiki',
      observations: [
        {
          title: '在同一篇内串起主要内容',
          text: '仓库边界、主要流程、安装、接口和维护入口放在同一篇中，可按小节连续阅读。',
          evidence: {
            page: 'codewiki.html',
            anchor: 'compare-section-1-4',
            match: '4. 主要执行流程'
          }
        },
        {
          title: '集中列出异常和限制',
          text: '参数解析、异步回调和语音等限制集中在一个小节，本例解释行程参数为什么会失败。',
          evidence: {
            page: 'codewiki.html',
            anchor: 'compare-section-1-7',
            match: 'processMessages 已把工具参数解析成对象后传给 handleTool；search_location 接受对象，但 plan_itinerary 又执行 JSON.parse(parameters)'
          }
        }
      ]
    },
    openwiki: {
      label: 'OpenWiki',
      observations: [
        {
          title: '沿一次用户操作说明流程',
          text: '聊天流程单独成篇，从用户输入追到回复展示，并对照早期一次性返回和最终流式返回。',
          evidence: {
            page: 'openwiki.html',
            anchor: 'original-8-聊天对话执行流程',
            match: '本文档梳理文本聊天从用户输入到助手回复的单次完整回合的数据流。'
          }
        },
        {
          title: '按接口列请求和返回信息',
          text: '后端对照篇逐个说明接口的输入、返回和调用关系；可以据此寻找待核验的接口约定。',
          evidence: {
            page: 'openwiki.html',
            anchor: 'original-1-next-js-api-路由与-python-后端对照',
            match: 'POST /api/create_itinerary 接收 { stops }，用 model o1 和 ITINERARY_PROMPT'
          }
        }
      ]
    },
    'deepwiki-open': {
      label: 'DeepWiki Open',
      observations: [
        {
          title: '按模块展开多组小节',
          text: '界面、状态和后端等内容展开成多组小节；本例从三个层次说明消息处理。',
          evidence: {
            page: 'deepwiki-open.html',
            anchor: 'compare-section-1-30',
            match: '整个流程涉及三个核心层次：前端 UI 组件层（负责展示与交互）、状态管理层'
          }
        },
        {
          title: '正文直接放入代码示例',
          text: '请求和工具分发等说明配有成段代码示例；示例是否对应当前源码，需要另外核对。',
          evidence: {
            page: 'deepwiki-open.html',
            anchor: 'compare-section-1-32',
            match: 'export async function sendMessage(message: string)'
          }
        }
      ]
    },
    devinwiki: {
      label: 'DeepWiki（Devin 托管版）',
      observations: [
        {
          title: '用完整章节说明对话过程',
          text: '英文对话流程章串起用户输入、消息保存、模型调用和回复展示。',
          evidence: {
            page: 'devinwiki.html',
            anchor: 'original-9-conversation-flow',
            match: 'It covers the journey from user input to assistant response, including state management and API communication.'
          }
        },
        {
          title: '另设扩展和定制指南',
          text: '扩展章列出增加工具、修改助手行为、调整界面及接入外部服务的方向。',
          evidence: {
            page: 'devinwiki.html',
            anchor: 'original-14-extending-the-application',
            match: "It covers adding new tools, customizing the assistant's behavior, modifying the UI, and integrating with external services."
          }
        }
      ]
    }
  }
}

/**
 * AI搜索核心逻辑模块
 * 从main.js中提取的核心搜索功能
 */

const { OpenAI } = require('openai');
const EverythingSearch = require('./everything-search');

class AISearchEngine {
  constructor(store, debugWindow = null) {
    this.store = store;
    this.debugWindow = debugWindow;
    this.everythingSearch = new EverythingSearch();
    
    // 初始化OpenAI
    this.openai = null;
    this.initializeOpenAI();
  }

  /**
   * 初始化OpenAI客户端
   */
  initializeOpenAI() {
    const apiKey = this.store.get('openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: this.store.get('openai.baseUrl') || 'https://api.openai.com/v1'
      });
    }
  }

  /**
   * 核心搜索方法
   * @param {string} query - 用户自然语言查询
   * @param {boolean} enableStreamDebug - 是否启用流式调试
   * @returns {Promise<Object>} 搜索结果
   */
  async search(query, enableStreamDebug = false) {
    try {
      // 步骤1: 将自然语言转换为Everything查询语法
      const everythingQuery = await this.convertToEverythingQuery(query, enableStreamDebug);
      
      // 步骤2: 执行Everything搜索
      const searchResult = await this.executeEverythingSearch(everythingQuery, enableStreamDebug);
      
      // 步骤3: 保存搜索历史并返回结果
      return this.processSearchResults(query, everythingQuery, searchResult);
      
    } catch (error) {
      console.error('搜索失败:', error);
      
      if (enableStreamDebug) {
        this.sendDebugMessage('error', `搜索过程出现错误: ${error.message}`);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 自然语言转Everything查询语法
   * @param {string} query - 用户查询
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {Promise<string>} 转换后的查询语法
   */
  async convertToEverythingQuery(query, enableStreamDebug) {
    let everythingQuery = query;

    if (this.openai && query.length > 3) {
      try {
        everythingQuery = await this.convertWithAI(query, enableStreamDebug);
      } catch (error) {
        console.error('AI转换失败，使用本地优化:', error);
        
        if (enableStreamDebug) {
          this.sendDebugMessage('error', `AI转换失败: ${error.message}，使用本地优化`);
        }
        
        // 回退到本地优化规则
        everythingQuery = this.everythingSearch.optimizeQuery(query);
      }
    } else {
      // 没有OpenAI配置或查询太短，使用本地优化
      everythingQuery = this.everythingSearch.optimizeQuery(query);
    }

    return everythingQuery;
  }

  /**
   * 使用AI进行查询转换
   * @param {string} query - 用户查询
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {Promise<string>} AI转换后的查询
   */
  async convertWithAI(query, enableStreamDebug) {
    // 构建AI提示词
    const aiMessages = this.buildAIMessages(query);
    
    let responseContent = '';

    if (enableStreamDebug) {
      this.sendDebugMessage('info', '🚀 开始AI转换自然语言查询...');
      
      // 流式调用模式
      responseContent = await this.makeStreamingAICall(aiMessages, enableStreamDebug);
    } else {
      // 标准调用模式
      responseContent = await this.makeStandardAICall(aiMessages);
    }

    // 清理和解析响应
    return this.parseAIResponse(responseContent, enableStreamDebug);
  }

  /**
   * 构建AI消息
   * @param {string} query - 用户查询
   * @returns {Array} AI消息数组
   */
  buildAIMessages(query) {
    return [{
      role: 'system',
      content: `你是一个专业的Everything搜索语法生成器。请将用户的自然语言查询转换为Everything搜索语法，并以JSON格式返回结果。`
    }, {
      role: 'user',
      content: this.buildEverythingSyntaxPrompt(query)
    }];
  }

  /**
   * 构建Everything语法提示词
   * @param {string} query - 用户查询
   * @returns {string} 完整的提示词
   */
  buildEverythingSyntaxPrompt(query) {
    return `
根据everything搜索语法，将以下自然语言转化为合规语法:

【语法定义】
Syntax
Operators

space	AND
|	OR
!	NOT
< >	Grouping
" "	Search for an exact phrase

Wildcards

*	Matches zero of more characters.
?	Matches one character.

【核心函数】
size:<size>	搜索指定大小的文件
datemodified:<date>	搜索指定日期修改的文件
ext:<list>	搜索指定扩展名的文件
content:<text>	搜索文件内容
parent:<path>	在指定路径中搜索
*.mp3	搜索mp3文件
dm:today	搜索今天修改的文件
dm:thisweek	搜索本周修改的文件

【时间语法】
today, yesterday, thisweek, thismonth, thisyear
lastweek, lastmonth, lastyear

【大小语法】
size:>1mb	大于1MB的文件
size:<100kb	小于100KB的文件
size:>1mb..10mb	1MB到10MB之间的文件

【文件类型】
图片: *.jpg;*.png;*.gif;*.bmp;*.jpeg
文档: *.doc;*.docx;*.pdf;*.txt
视频: *.mp4;*.avi;*.mkv;*.mov
音频: *.mp3;*.wav;*.flac

【参考案例】
搜索今天的PDF文档: dm:today *.pdf
搜索大于1MB的视频: size:>1mb *.mp4;*.avi;*.mkv
搜索本周修改的图片: dm:thisweek *.jpg;*.png;*.gif

【用户搜索需求】
${query}

【输出格式要求】
请严格按照以下JSON格式返回，不要包含任何其他文本：
{
  "confidence": 0.95,
  "original_query": "用户的原始查询",
  "rules_used": ["使用的语法规则列表"],
  "alternatives": ["可选的替代查询1", "可选的替代查询2"],
  "query": "合规搜索语法"
}
    `;
  }

  /**
   * 流式AI调用
   * @param {Array} messages - AI消息
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {Promise<string>} 完整响应
   */
  async makeStreamingAICall(messages, enableStreamDebug) {
    const aiResponse = await this.openai.chat.completions.create({
      model: this.store.get('openai.model', 'gpt-3.5-turbo'),
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
      stream: true,
      response_format: { type: "json_object" }
    });

    let fullResponse = '';
    
    // 处理流式响应
    for await (const chunk of aiResponse) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        
        if (enableStreamDebug) {
          this.sendDebugMessage('stream', content);
        }
      }
    }

    return fullResponse.trim();
  }

  /**
   * 标准AI调用
   * @param {Array} messages - AI消息
   * @returns {Promise<string>} AI响应
   */
  async makeStandardAICall(messages) {
    const aiResponse = await this.openai.chat.completions.create({
      model: this.store.get('openai.model', 'gpt-3.5-turbo'),
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return aiResponse.choices[0].message.content.trim();
  }

  /**
   * 解析AI响应
   * @param {string} responseContent - AI响应内容
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {string} 解析后的查询
   */
  parseAIResponse(responseContent, enableStreamDebug) {
    // 清理响应内容
    const cleanedContent = this.cleanResponseContent(responseContent);
    
    console.log('清理前响应:', responseContent);
    console.log('清理后响应:', cleanedContent);

    try {
      const parsedResponse = JSON.parse(cleanedContent);

      // 验证JSON结构
      if (parsedResponse.query && typeof parsedResponse.query === 'string') {
        const query = parsedResponse.query.trim();
        
        console.log('AI搜索转换结果:', {
          original: parsedResponse.original_query,
          converted: query,
          confidence: parsedResponse.confidence || 'unknown',
          rules: parsedResponse.rules_used || [],
          alternatives: parsedResponse.alternatives || []
        });

        return query;
      } else {
        throw new Error('JSON响应格式不正确：缺少query字段');
      }
    } catch (parseError) {
      console.error('解析AI响应JSON失败:', parseError);
      
      if (enableStreamDebug) {
        this.sendDebugMessage('info', `JSON解析失败: ${parseError.message}`);
      }

      // 回退到简单文本提取
      return this.extractQueryFallback(cleanedContent, enableStreamDebug);
    }
  }

  /**
   * 清理响应内容
   * @param {string} content - 原始内容
   * @returns {string} 清理后的内容
   */
  cleanResponseContent(content) {
    let cleaned = content.trim();
    
    // 移除开头的markdown标识符
    if (cleaned.startsWith('json')) {
      cleaned = cleaned.substring(4).trim();
    } else if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7).trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3).trim();
    }
    
    // 移除结尾的代码块标识
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3).trim();
    }
    
    return cleaned;
  }

  /**
   * 回退查询提取
   * @param {string} content - 清理后的内容
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {string} 提取的查询
   */
  extractQueryFallback(content, enableStreamDebug) {
    const fallbackMatch = content.match(/"query"\s*:\s*"([^"]+)"/);
    
    if (fallbackMatch) {
      const query = fallbackMatch[1].trim();
      
      if (enableStreamDebug) {
        this.sendDebugMessage('info', `🔧 回退方案成功提取查询: ${query}`);
      }
      
      return query;
    } else {
      if (enableStreamDebug) {
        this.sendDebugMessage('error', '无法从AI响应中提取查询语句，将使用原始查询');
      }
      
      throw new Error('无法从AI响应中提取查询语句');
    }
  }

  /**
   * 执行Everything搜索
   * @param {string} query - Everything查询语法
   * @param {boolean} enableStreamDebug - 是否启用调试
   * @returns {Promise<Object>} 搜索结果
   */
  async executeEverythingSearch(query, enableStreamDebug) {
    if (enableStreamDebug) {
      this.sendDebugMessage('info', `🔍 执行Everything搜索: ${query}`);
    }

    const searchResult = await this.everythingSearch.search(query, {
      count: 1000
    });

    if (!searchResult.success) {
      if (enableStreamDebug) {
        this.sendDebugMessage('error', `Everything搜索失败: ${searchResult.error || '未知错误'}`);
      }
      
      throw new Error(searchResult.error || 'Everything搜索失败');
    }

    if (enableStreamDebug) {
      this.sendDebugMessage('info', `✅ 搜索完成，找到 ${searchResult.results?.length || 0} 个结果`);
    }

    return searchResult;
  }

  /**
   * 处理搜索结果
   * @param {string} originalQuery - 原始查询
   * @param {string} everythingQuery - 转换后的查询
   * @param {Object} searchResult - 搜索结果
   * @returns {Object} 处理后的结果
   */
  processSearchResults(originalQuery, everythingQuery, searchResult) {
    // 保存搜索历史（这里需要实现保存逻辑）
    this.saveSearchHistory(originalQuery, everythingQuery);

    return {
      success: true,
      query: originalQuery,
      everythingQuery: everythingQuery,
      results: searchResult.results,
      totalResults: searchResult.totalResults
    };
  }

  /**
   * 保存搜索历史
   * @param {string} originalQuery - 原始查询
   * @param {string} convertedQuery - 转换后的查询
   */
  saveSearchHistory(originalQuery, convertedQuery) {
    // 这里需要实现搜索历史保存逻辑
    console.log('保存搜索历史:', { originalQuery, convertedQuery });
  }

  /**
   * 发送调试消息
   * @param {string} type - 消息类型
   * @param {string} content - 消息内容
   */
  sendDebugMessage(type, content) {
    const debugData = { type, content };
    
    // 发送到主窗口（如果存在）
    // 这里需要根据实际的IPC通信机制实现
    
    // 发送到调试窗口（如果存在）
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.webContents.send('ai-debug-stream', debugData);
    }
  }

  /**
   * 更新OpenAI配置
   * @param {string} apiKey - API密钥
   * @param {string} baseUrl - 基础URL
   */
  updateOpenAIConfig(apiKey, baseUrl = null) {
    this.store.set('openai.apiKey', apiKey);
    if (baseUrl) {
      this.store.set('openai.baseUrl', baseUrl);
    }
    
    this.initializeOpenAI();
  }

  /**
   * 检查AI是否可用
   * @returns {boolean} AI是否可用
   */
  isAIAvailable() {
    return this.openai !== null;
  }
}

module.exports = AISearchEngine;
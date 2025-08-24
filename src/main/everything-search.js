const http = require('http');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

class EverythingSearch {
  constructor(host = 'localhost', port = 80) {
    this.host = host;
    this.port = port;
    this.baseUrl = `http://${host}:${port}`;
    this.username = null;
    this.password = null;
  }

  /**
   * 设置认证凭据
   */
  setCredentials(username, password) {
    this.username = username;
    this.password = password;
  }

  /**
   * 测试Everything HTTP服务是否可用
   */
  async testConnection() {
    return new Promise((resolve) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/',
        method: 'GET',
        timeout: 5000
      };

      // 如果有认证凭据，添加基本认证头
      if (this.username && this.password) {
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        options.headers = {
          'Authorization': `Basic ${auth}`
        };
      }

      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * 执行搜索
   */
  async search(query, options = {}) {
    const searchParams = {
      search: query,
      json: 1,
      count: options.count || 1000,
      offset: options.offset || 0,
      sort: options.sort || 'name',
      ascending: options.ascending !== undefined ? options.ascending : 1,
      // 根据官方API文档，只使用支持的列参数
      path_column: 1,                    // 完整路径
      size_column: 1,                    // 文件大小
      date_modified_column: 1,           // 修改日期
      // 可选的搜索参数
      case: options.case || 0,           // 大小写匹配
      wholeword: options.wholeword || 0, // 全词匹配
      path: options.path || 0,           // 路径搜索
      regex: options.regex || 0,         // 正则表达式搜索
      diacritics: options.diacritics || 0 // 匹配变音符号
    };

    const queryStr = querystring.stringify(searchParams);
    const url = `${this.baseUrl}/?${queryStr}`;

    console.log('🌐 [Everything API] 请求URL:', url);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: `/?${queryStr}`,
        method: 'GET',
        timeout: 30000
      };

      // 如果有认证凭据，添加基本认证头
      if (this.username && this.password) {
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        options.headers = {
          'Authorization': `Basic ${auth}`
        };
      }

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 401) {
              throw new Error('认证失败：用户名或密码错误');
            }
            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            }

            const result = JSON.parse(data);

            const formattedResults = this.formatResults(result.results || []);

            resolve({
              success: true,
              results: formattedResults,
              totalResults: result.totalResults || 0
            });
          } catch (error) {
            reject(new Error(`解析Everything响应失败: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Everything连接失败: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('搜索请求超时'));
      });

      req.end();
    });
  }

  /**
   * 格式化搜索结果
   */
  formatResults(results) {

    return results.map((item, index) => {

      let filePath, fileName, fileDir, fileExt;

      if (item.path) {
        // 如果有完整路径，使用完整路径
        filePath = path.join(item.path, item.name);
        fileName = item.name;
        fileDir = path.dirname(filePath);
        fileExt = path.extname(fileName);
      } else if (item.name) {
        // 如果只有文件名，使用文件名
        fileName = item.name;
        filePath = item.name; // 暂时使用文件名作为路径
        fileDir = ''; // 目录未知
        fileExt = path.extname(fileName);
      } else {
        // 都没有的话使用空值
        fileName = '';
        filePath = '';
        fileDir = '';
        fileExt = '';
      }

      // 确保文件名包含扩展名
      if (fileExt && fileName && !fileName.includes('.')) {
        fileName = fileName + fileExt;
      }

      // 获取文件信息
      let fileSize = '';
      let modifiedDate = '';

      try {
        if (filePath && fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          fileSize = stats.size.toString();
          modifiedDate = stats.mtime.toISOString();
        }
      } catch (error) {
        // 忽略文件状态获取错误
        console.log(`⚠️ [formatResults] 获取文件状态失败:`, error.message);
      }

      // 处理文件大小
      let finalSize = '';
      if (item.size !== undefined && item.size !== null) {
        finalSize = item.size.toString();
      } else {
        finalSize = fileSize;
      }

      // Windows FILETIME转换函数
      const convertFileTime = (filetime) => {
        if (!filetime) return '';

        // FILETIME是从1601年1月1日开始的100纳秒间隔数
        // 转换为JavaScript Date对象
        try {
          const timestamp = parseInt(filetime);
          if (isNaN(timestamp)) return filetime;

          // FILETIME转换：从1601年1月1日开始，单位是100纳秒
          // JavaScript Date从1970年1月1日开始，单位是毫秒
          const epochDiff = 11644473600000; // 1601到1970的毫秒差
          const jsTimestamp = (timestamp / 10000) - epochDiff;

          return new Date(jsTimestamp).toISOString();
        } catch (error) {
          console.log('时间转换失败:', error);
          return filetime;
        }
      };

      // 处理时间字段（只处理API支持的字段）
      const finalModified = convertFileTime(item.date_modified) || modifiedDate;

      const formatted = {
        // 基本信息
        name: fileName,
        path: filePath,
        directory: fileDir,
        extension: fileExt.replace('.', '').toUpperCase(),
        type: this.getFileType(fileExt),

        // 文件大小
        size: finalSize,

        // 时间信息（只包含API支持的字段）
        modified: finalModified,

        // 原始数据（调试用，包含Everything返回的所有字段）
        raw_data: item
      };

      return formatted;
    });
  }

  /**
   * 根据扩展名获取文件类型
   */
  getFileType(extension) {
    const ext = extension.toLowerCase();

    const typeMap = {
      // 文档
      '.pdf': 'PDF',
      '.doc': 'Word',
      '.docx': 'Word',
      '.xls': 'Excel',
      '.xlsx': 'Excel',
      '.ppt': 'PowerPoint',
      '.pptx': 'PowerPoint',
      '.txt': 'Text',
      '.rtf': 'RTF',

      // 图片
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.png': 'Image',
      '.gif': 'Image',
      '.bmp': 'Image',
      '.svg': 'Image',
      '.webp': 'Image',

      // 视频
      '.mp4': 'Video',
      '.avi': 'Video',
      '.mkv': 'Video',
      '.mov': 'Video',
      '.wmv': 'Video',
      '.flv': 'Video',

      // 音频
      '.mp3': 'Audio',
      '.wav': 'Audio',
      '.flac': 'Audio',
      '.aac': 'Audio',
      '.ogg': 'Audio',

      // 压缩
      '.zip': 'Archive',
      '.rar': 'Archive',
      '.7z': 'Archive',
      '.tar': 'Archive',
      '.gz': 'Archive',

      // 代码
      '.js': 'Code',
      '.ts': 'Code',
      '.html': 'Code',
      '.css': 'Code',
      '.py': 'Code',
      '.java': 'Code',
      '.cpp': 'Code',
      '.c': 'Code',
      '.php': 'Code',
      '.go': 'Code',
      '.rs': 'Code',

      // 可执行文件
      '.exe': 'Program',
      '.msi': 'Installer',
      '.deb': 'Package',
      '.rpm': 'Package'
    };

    return typeMap[ext] || 'File';
  }

  /**
   * 搜索建议优化查询
   */
  optimizeQuery(naturalLanguage) {
    // 简单的规则转换，如果没有OpenAI的话
    let query = naturalLanguage;

    // 时间相关转换
    if (query.includes('今天') || query.includes('today')) {
      query = query.replace(/(今天|today)/gi, 'dm:today ');
    }
    if (query.includes('昨天') || query.includes('yesterday')) {
      query = query.replace(/(昨天|yesterday)/gi, 'dm:yesterday ');
    }
    if (query.includes('本周') || query.includes('this week')) {
      query = query.replace(/(本周|this week)/gi, 'dm:thisweek ');
    }
    if (query.includes('本月') || query.includes('this month')) {
      query = query.replace(/(本月|this month)/gi, 'dm:thismonth ');
    }
    if (query.includes('今年') || query.includes('this year')) {
      query = query.replace(/(今年|this year)/gi, 'dm:thisyear ');
    }
    if (query.includes('上周') || query.includes('last week')) {
      query = query.replace(/(上周|last week)/gi, 'dm:lastweek ');
    }
    if (query.includes('上个月') || query.includes('last month')) {
      query = query.replace(/(上个月|last month)/gi, 'dm:lastmonth ');
    }
    if (query.includes('去年') || query.includes('last year')) {
      query = query.replace(/(去年|last year)/gi, 'dm:lastyear ');
    }


    // 文件类型转换
    const typeReplacements = {
      '图片': '*.jpg;*.png;*.gif;*.bmp;*.jpeg',
      '照片': '*.jpg;*.png;*.jpeg',
      '文档': '*.doc;*.docx;*.pdf;*.txt',
      '视频': '*.mp4;*.avi;*.mkv;*.mov',
      '音频': '*.mp3;*.wav;*.flac',
      '音乐': '*.mp3;*.wav;*.flac',
      'PDF': '*.pdf',
      '表格': '*.xls;*.xlsx',
      '压缩包': '*.zip;*.rar;*.7z'
    };

    Object.entries(typeReplacements).forEach(([key, value]) => {
      if (query.includes(key)) {
        query = query.replace(new RegExp(key, 'gi'), value);
      }
    });

    // 大小转换
    if (query.includes('大于') || query.includes('>')) {
      query = query.replace(/大于\s*(\d+)\s*(KB|MB|GB)/gi, 'size:>$1$2');
    }
    if (query.includes('小于') || query.includes('<')) {
      query = query.replace(/小于\s*(\d+)\s*(KB|MB|GB)/gi, 'size:<$1$2');
    }

    return query;
  }
}

module.exports = EverythingSearch;

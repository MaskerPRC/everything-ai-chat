# Everything AI Chat - 智能文件搜索客户端

基于Everything搜索服务的Electron客户端，支持自然语言查询并通过AI转换为Everything复杂检索语法。

![Screenshot](screenshot.png)

## 功能特性

- 🔍 **自然语言搜索**: 支持中文自然语言输入，自动转换为Everything搜索语法
- 🤖 **AI智能转换**: 集成OpenAI GPT模型，智能理解搜索意图
- 📊 **多维度排序**: 支持按文件名、路径、大小、修改时间等排序
- 📝 **搜索历史**: 自动保存搜索历史，支持快速重复搜索
- ⚡ **高性能**: 基于Everything的极速本地文件搜索
- 🎨 **专业界面**: 简洁专业的界面设计，无圆角，适合办公场景

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Electron + Node.js
- **数据库**: SQLite (搜索历史存储)
- **AI服务**: OpenAI GPT API
- **搜索引擎**: Everything HTTP API

## 系统要求

- Windows 7/8/10/11
- Everything 软件 (1.4.1+)
- Node.js 16+

## 安装步骤

### 1. 安装Everything

1. 下载并安装 [Everything](https://www.voidtools.com/)
2. 启动Everything软件
3. 进入 `工具` → `选项` → `常规`
4. 勾选 `启用HTTP服务器`
5. 确认端口为80 (默认)

### 2. 克隆项目

```bash
git clone https://github.com/your-repo/everything-ai-chat.git
cd everything-ai-chat
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置OpenAI (可选)

如需使用AI自然语言转换功能，需要配置OpenAI API:

1. 启动应用后点击右下角设置按钮
2. 输入你的OpenAI API Key
3. 选择合适的模型 (推荐GPT-3.5 Turbo)

## 运行应用

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm run build:electron
```

## 使用方法

### 基础搜索

直接输入文件名或关键词:
- `报告.docx` - 查找包含"报告"的Word文档
- `*.pdf` - 查找所有PDF文件
- `图片` - 查找图片文件

### 自然语言搜索 (需配置OpenAI)

使用自然语言描述你的搜索需求:
- `找一下今天修改的PDF文件`
- `大于1MB的视频文件`
- `昨天创建的图片`
- `在桌面文件夹中的文档`

### Everything语法

支持Everything完整搜索语法:
- `dm:today` - 今天修改的文件
- `size:>1mb` - 大于1MB的文件
- `*.jpg;*.png` - JPG或PNG图片
- `path:desktop` - 桌面路径下的文件

## 快捷键

- `Enter` - 执行搜索
- `↑/↓` - 浏览搜索历史
- `双击文件` - 打开文件
- `右键文件` - 显示上下文菜单

## 搜索语法示例

| 自然语言 | Everything语法 | 说明 |
|---------|----------------|------|
| 今天的PDF | `*.pdf dm:today` | 今天修改的PDF文件 |
| 大于10MB的视频 | `*.mp4;*.avi size:>10mb` | 大于10MB的视频文件 |
| 桌面上的图片 | `*.jpg;*.png path:desktop` | 桌面目录的图片 |
| 本周的文档 | `*.doc;*.docx dm:thisweek` | 本周修改的文档 |

## 故障排除

### Everything连接失败

1. 确认Everything软件正在运行
2. 检查HTTP服务器是否已启用
3. 确认端口80未被占用
4. 尝试重启Everything软件

### OpenAI API错误

1. 检查API Key是否正确
2. 确认账户有足够余额
3. 检查网络连接
4. 尝试更换API端点

### 搜索结果为空

1. 确认Everything已完成文件索引
2. 检查搜索语法是否正确
3. 尝试使用更简单的关键词

## 开发说明

### 项目结构

```
everything-ai-chat/
├── src/
│   ├── main/              # Electron主进程
│   │   ├── main.js        # 主进程入口
│   │   ├── preload.js     # 预加载脚本
│   │   └── everything-search.js # Everything搜索模块
│   ├── renderer/          # Vue渲染进程
│   │   ├── components/    # Vue组件
│   │   ├── App.vue        # 主组件
│   │   ├── main.js        # Vue入口
│   │   └── style.css      # 全局样式
│   └── database/          # SQLite数据库文件
├── package.json           # 项目配置
├── vite.config.js         # Vite配置
└── README.md             # 说明文档
```

### 添加新功能

1. 在 `src/renderer/components/` 添加Vue组件
2. 在 `src/main/main.js` 添加IPC处理器
3. 更新 `src/main/preload.js` 暴露新的API

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 支持

如有问题，请提交Issue或联系开发者。 
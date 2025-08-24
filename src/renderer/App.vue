<template>
  <!-- 根容器，包含整个应用界面 -->
  <div class="app-container">
    <!-- 自定义标题栏区域 -->
    <div class="custom-titlebar">
      <!-- 标题栏左侧部分：图标、标题和状态 -->
      <div class="titlebar-left">
        <div class="app-icon">🔍</div>
        <div class="app-title">Everything AI Chat</div>
        <!-- Everything服务的连接状态指示器 -->
        <div class="everything-status">
          <!-- 状态点，根据连接状态改变颜色 -->
          <div class="status-dot" :class="everythingStatusClass"></div>
          <!-- 状态文本，显示连接状态 -->
          <span class="status-text">{{ everythingStatusText }}</span>
        </div>
      </div>
      <!-- 窗口控制按钮：最小化、最大化、关闭 -->
      <div class="window-controls">
        <button @click="minimizeWindow" class="control-button minimize" title="最小化">
          <span>−</span>
        </button>
        <button @click="toggleMaximize" class="control-button maximize" :title="isMaximized ? '还原' : '最大化'">
          <!-- 根据窗口是否最大化显示不同图标 -->
          <span>{{ isMaximized ? '⧉' : '□' }}</span>
        </button>
        <button @click="closeWindow" class="control-button close" title="关闭">
          <span>×</span>
        </button>
      </div>
    </div>

    <!-- 主要搜索功能区域 -->
    <div class="search-section">
      <div class="search-container">
        <div class="search-row">
          <div class="search-title">🔍 智能文件搜索</div>
          <div class="search-input-wrapper">
            <!-- 搜索输入框 -->
            <input v-model="searchQuery" @keydown.enter="performSearch" @keydown.down.prevent="navigateHistory(1)"
              @keydown.up.prevent="navigateHistory(-1)" @focus="showHistory = true" @blur="hideHistoryDelayed"
              class="search-input" placeholder="输入自然语言查询，AI将转换为Everything语法..." :disabled="isSearching"
              ref="searchInput" />
            <!-- 搜索按钮 -->
            <button @click="performSearch" :disabled="isSearching || !searchQuery.trim()" class="search-button"
              :class="{ 'searching': isSearching }">
              {{ isSearching ? '搜索中...' : '搜索' }}
            </button>

            <!-- 搜索历史下拉列表 -->
            <div v-if="showHistory && filteredHistory.length > 0" class="search-history">
              <!-- 遍历并显示过滤后的搜索历史 -->
              <div v-for="(item, index) in filteredHistory" :key="item.id" @click="selectHistoryItem(item)"
                :class="['search-history-item', { active: historySelectedIndex === index }]">
                <div class="search-history-query">{{ item.query }}</div>
                <!-- 如果AI转换后的查询与原始查询不同，则显示它 -->
                <div v-if="item.everything_query !== item.query" class="search-history-everything">
                  {{ item.everything_query }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示区域 -->
    <div class="results-section">
      <!-- 使用 <template> 进行条件渲染分组，仅在有搜索结果时显示内部所有内容 -->
      <template v-if="searchResults.length > 0">
        <!-- 结果头部信息和操作按钮 -->
        <div class="results-header">
          <div class="results-info">
            <!-- 显示找到的文件数量 -->
            <div class="results-count">
              找到 {{ searchResults.length.toLocaleString() }} 个文件
            </div>
            <!-- 如果AI转换了查询，则显示实际使用的Everything查询语句 -->
            <div v-if="lastEverythingQuery && lastEverythingQuery !== lastSearchQuery" class="everything-query">
              使用查询: <code>{{ lastEverythingQuery }}</code>
            </div>
          </div>
          <div class="results-actions">
            <!-- 导出结果按钮 -->
            <button @click="exportResults" class="action-button">
              <span class="button-icon">📤</span>
              导出结果
            </button>
            <!-- 清空结果按钮 -->
            <button @click="clearResults" class="action-button">
              <span class="button-icon">🗑️</span>
              清空结果
            </button>
          </div>
        </div>

        <!-- 文件列表 -->
        <div class="file-list">
          <!-- 文件列表的表头，点击可进行排序 -->
          <div class="file-list-header">
            <div @click="sortBy('name')" :class="['file-list-column', 'col-name', 'sortable', getSortClass('name')]">文件名
            </div>
            <div @click="sortBy('path')" :class="['file-list-column', 'col-path', 'sortable', getSortClass('path')]">路径
            </div>
            <div @click="sortBy('size')" :class="['file-list-column', 'col-size', 'sortable', getSortClass('size')]">大小
            </div>
            <div @click="sortBy('modified')"
              :class="['file-list-column', 'col-modified', 'sortable', getSortClass('modified')]">修改时间
            </div>
            <!-- 以下列根据配置动态显示 -->
            <div v-if="displayFields.created" @click="sortBy('created')"
              :class="['file-list-column', 'col-created', 'sortable', getSortClass('created')]">创建时间</div>
            <div v-if="displayFields.accessed" @click="sortBy('accessed')"
              :class="['file-list-column', 'col-accessed', 'sortable', getSortClass('accessed')]">访问时间
            </div>
            <div v-if="displayFields.attributes" @click="sortBy('attributes')"
              :class="['file-list-column', 'col-attributes', 'sortable', getSortClass('attributes')]">属性
            </div>
            <div v-if="displayFields.run_count" @click="sortBy('run_count')"
              :class="['file-list-column', 'col-run-count', 'sortable', getSortClass('run_count')]">运行次数
            </div>
            <div @click="sortBy('extension')"
              :class="['file-list-column', 'col-type', 'sortable', getSortClass('extension')]">类型</div>
          </div>

          <!-- 文件列表的主体内容，遍历排序后的结果 -->
          <div class="file-list-body">
            <div v-for="file in sortedResults" :key="file.path" @click="openFile(file)"
              @contextmenu.prevent="showFileContextMenu(file, $event)" class="file-row">
              <div class="file-cell col-name">
                <span class="file-icon">{{ getFileIcon(file.extension) }}</span>
                <span class="file-name">{{ getDisplayFileName(file) }}</span>
              </div>
              <div class="file-cell col-path"><span class="file-path">{{ file.directory }}</span></div>
              <div class="file-cell col-size"><span class="file-size">
                  {{ formatFileSize(file.size) }}
                </span></div>
              <div class="file-cell col-modified"><span class="file-modified">
                  {{ formatDate(file.modified) }}
                </span>
              </div>
              <!-- 以下单元格根据配置动态显示 -->
              <div v-if="displayFields.created" class="file-cell col-created"><span class="file-created">{{
                formatDate(file.created) }}</span></div>
              <div v-if="displayFields.accessed" class="file-cell col-accessed"><span class="file-accessed">{{
                formatDate(file.accessed) }}</span></div>
              <div v-if="displayFields.attributes" class="file-cell col-attributes"><span class="file-attributes">{{
                file.attributes || '-' }}</span></div>
              <div v-if="displayFields.run_count" class="file-cell col-run-count"><span class="file-run-count">{{
                file.run_count || 0 }}</span></div>
              <div class="file-cell col-type"><span class="file-type">{{ file.extension || 'FILE' }}
                </span></div>
            </div>
          </div>
        </div>
      </template>

      <!-- 当没有搜索结果时，此区域将根据不同状态显示对应内容 -->
      <div v-else class="state-container">
        <!-- 状态1: 优先显示错误信息 -->
        <div v-if="errorMessage" class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">{{ errorMessage }}</div>
          <!-- 允许用户清除错误信息 -->
          <button @click="clearError" class="action-button" style="margin-top: 15px;">知道了</button>
        </div>

        <!-- 状态2: 如果没有错误，则检查是否正在搜索，显示加载动画 -->
        <div v-else-if="isSearching" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">智能搜索中...</div>
        </div>

        <!-- 状态3: 如果搜索完成但没有结果，显示“未找到文件” -->
        <div v-else-if="hasSearched" class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">未找到匹配的文件</div>
          <div class="empty-state-subtext">尝试使用不同的关键词或检查Everything是否正在运行</div>
        </div>

        <!-- 状态4: 如果以上都不是（即初始状态），显示欢迎和使用提示 -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">✨🔍✨</div>
          <div class="empty-state-text">开始您的智能搜索之旅</div>
          <div class="empty-state-subtext">输入自然语言，AI 将为您转换为 Everything 精确搜索语法</div>
          <div class="search-suggestions">
            <div class="suggestion-title">💡 试试这些搜索：</div>
            <div class="suggestion-items">
              <span class="suggestion-item" @click="trySuggestion('今天的图片')">今天的图片</span>
              <span class="suggestion-item" @click="trySuggestion('大于10MB的视频')">大于10MB的视频</span>
              <span class="suggestion-item" @click="trySuggestion('本周修改的文档')">本周修改的文档</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span class="status-text">{{ isSearching ? '搜索中...' : '就绪' }}</span>
        <span v-if="everythingConnected" class="status-separator">|</span>
        <!-- 此处可以硬编码版本号，或从后端动态获取 -->
        <span v-if="everythingConnected" class="status-text">Everything v1.4.1</span>
      </div>
      <div class="status-right">
        <!-- 显示上一次搜索的耗时 -->
        <span v-if="searchDuration > 0" class="status-text">搜索耗时: {{ (searchDuration / 1000).toFixed(2) }}s
        </span>
        <!-- 打开设置对话框的按钮 -->
        <button @click="showConfigDialog = true" class="status-settings-button" title="设置">⚙️</button>
      </div>
    </div>

    <!-- 配置对话框组件，通过 v-if 控制显示和隐藏 -->
    <ConfigDialog v-if="showConfigDialog" @close="showConfigDialog = false" />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import ConfigDialog from './components/ConfigDialog.vue';

// --- 优化点: 将纯辅助函数移到 setup 外部 ---
// 这些函数不依赖于组件的响应式状态，将其移出可以使 setup 函数更整洁，也便于单独测试或复用。

/**
 * 格式化文件大小
 * @param {number|string} size - 文件字节数
 * @returns {string} 格式化后的大小字符串，如 "1.2 MB"
 */
const formatFileSize = (size) => {
  if (!size) return '';
  const bytes = parseInt(size);
  if (isNaN(bytes) || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1))} ${units[i]}`;
};

/**
 * 格式化日期时间字符串
 * @param {string} dateString - ISO 格式的日期字符串
 * @returns {string} 本地化的日期时间字符串，如 "2025/08/23 13:11"
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateString; }
};

/**
 * 根据文件扩展名获取对应的 Emoji 图标
 * @param {string} extension - 文件扩展名
 * @returns {string} 代表文件类型的 Emoji
 */
const getFileIcon = (extension) => {
  const ext = extension?.toLowerCase() || '';
  const iconMap = {
    // 文档类型
    'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📝', 'rtf': '📝',
    'xls': '📊', 'xlsx': '📊', 'csv': '📊',
    'ppt': '📈', 'pptx': '📈',
    // 图片类型
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'svg': '🖼️', 'webp': '🖼️', 'ico': '🖼️',
    // 视频类型
    'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬', 'wmv': '🎬', 'flv': '🎬', 'webm': '🎬',
    // 音频类型 
    'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵', 'ogg': '🎵', 'm4a': '🎵',
    // 压缩文件
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    // 代码文件
    'js': '💻', 'ts': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻', 'cpp': '💻',
    'c': '💻', 'php': '💻', 'go': '💻', 'rs': '💻', 'vue': '💻', 'jsx': '💻', 'tsx': '💻',
    // 可执行文件
    'exe': '⚙️', 'msi': '⚙️', 'deb': '⚙️', 'rpm': '⚙️', 'dmg': '⚙️',
    // 字体文件
    'ttf': '🔤', 'otf': '🔤', 'woff': '🔤', 'woff2': '🔤',
    // 其他
    'json': '📋', 'xml': '📋', 'log': '📜'
  };
  return iconMap[ext] || '📄'; // 默认返回通用文件图标
};

export default {
  name: 'App',
  components: { ConfigDialog },
  setup() {
    // --- 响应式数据定义 ---
    const searchQuery = ref(''); // 搜索输入框的内容
    const searchResults = ref([]); // 搜索结果列表
    const searchHistory = ref([]); // 搜索历史记录
    const isSearching = ref(false); // 是否正在执行搜索
    const hasSearched = ref(false); // 是否已经执行过至少一次搜索
    const errorMessage = ref(''); // 错误信息
    const showHistory = ref(false); // 是否显示搜索历史下拉框
    const historySelectedIndex = ref(-1); // 当前在历史记录中选中的项的索引
    const showConfigDialog = ref(false); // 是否显示配置对话框
    const lastSearchQuery = ref(''); // 上一次用户输入的查询
    const lastEverythingQuery = ref(''); // 上一次实际执行的Everything查询
    const everythingConnected = ref(false); // Everything服务是否连接
    const everythingTesting = ref(false); // 是否正在测试与Everything的连接
    const isMaximized = ref(false); // 窗口是否最大化
    const searchStartTime = ref(0); // 搜索开始时间戳
    const searchDuration = ref(0); // 搜索耗时（毫秒）
    const displayFields = ref({ // 控制结果列表中哪些列是可见的
      accessed: false, attributes: false, created: false,
      recently_changed: false, run_count: false, file_list_filename: false
    });
    const sortState = reactive({ field: 'name', direction: 'asc' }); // 排序状态
    const searchInput = ref(null); // 对输入框DOM元素的引用

    // --- 计算属性 ---

    // 根据当前输入过滤搜索历史
    const filteredHistory = computed(() => {
      if (!searchQuery.value.trim()) return searchHistory.value.slice(0, 10); // 未输入时显示最近10条
      return searchHistory.value.filter(item =>
        item.query.toLowerCase().includes(searchQuery.value.toLowerCase())
      ).slice(0, 10);
    });

    // 对搜索结果进行排序
    const sortedResults = computed(() => {
      const { field, direction } = sortState;
      const multiplier = direction === 'asc' ? 1 : -1; // 升序为1，降序为-1
      // 创建副本进行排序，避免直接修改原始数据
      return [...searchResults.value].sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        // 根据不同字段类型进行比较
        switch (field) {
          case 'size':
          case 'run_count':
            return ((parseInt(aValue) || 0) - (parseInt(bValue) || 0)) * multiplier;
          case 'modified':
          case 'created':
          case 'accessed':
            return ((new Date(aValue).getTime() || 0) - (new Date(bValue).getTime() || 0)) * multiplier;
          default: // 默认为字符串比较
            // 使用 localeCompare 进行更准确的本地化字符串排序
            return String(aValue).localeCompare(String(bValue), 'zh-CN', { sensitivity: 'base' }) * multiplier;
        }
      });
    });

    // 计算Everything连接状态的CSS类
    const everythingStatusClass = computed(() => {
      if (everythingTesting.value) return 'connecting';
      return everythingConnected.value ? 'connected' : 'disconnected';
    });

    // 计算Everything连接状态的显示文本
    const everythingStatusText = computed(() => {
      if (everythingTesting.value) return '连接中';
      return everythingConnected.value ? '已连接' : '未连接';
    });

    // --- 方法 ---

    /**
     * 执行搜索操作
     */
    const performSearch = async () => {
      const query = searchQuery.value.trim();
      if (!query) return;

      searchInput.value?.blur(); // 优化点: 搜索时让输入框失焦
      isSearching.value = true;
      errorMessage.value = ''; // 每次新搜索前清除旧错误
      hasSearched.value = true;
      lastSearchQuery.value = query;
      searchStartTime.value = Date.now();
      searchResults.value = []; // 立即清空旧结果，以触发加载状态

      try {
        const result = await window.electronAPI.searchFiles(query);
        if (result.success) {
          searchResults.value = result.results || [];
          lastEverythingQuery.value = result.everythingQuery || query;
          searchDuration.value = Date.now() - searchStartTime.value;
          await loadSearchHistory(); // 成功后刷新历史记录
        } else {
          errorMessage.value = result.error || '搜索失败，未知错误。';
          searchDuration.value = 0;
        }
      } catch (error) {
        console.error('搜索错误:', error);
        errorMessage.value = `搜索过程中发生错误: ${error.message}`;
        searchDuration.value = 0;
      } finally {
        isSearching.value = false;
        showHistory.value = false;
      }
    };

    /**
     * 清除错误信息
     */
    const clearError = () => {
      errorMessage.value = '';
      if (searchResults.value.length === 0) {
        hasSearched.value = false; // 重置搜索状态，返回初始欢迎界面
      }
    };

    /**
     * 从后端加载搜索历史
     */
    const loadSearchHistory = async () => {
      try {
        searchHistory.value = await window.electronAPI.getSearchHistory() || [];
      } catch (error) { console.error('加载搜索历史失败:', error); }
    };

    /**
     * 从后端加载列显示配置
     */
    const loadDisplayFieldsConfig = async () => {
      try {
        const config = await window.electronAPI.getOpenAIConfig();
        if (config?.displayFields) {
          displayFields.value = { ...displayFields.value, ...config.displayFields };
        }
      } catch (error) { console.error('加载字段显示配置失败:', error); }
    };

    /**
     * 点击历史记录项时，填充输入框并执行搜索
     */
    const selectHistoryItem = (item) => {
      searchQuery.value = item.query;
      showHistory.value = false;
      historySelectedIndex.value = -1;
      nextTick(performSearch); // 在下一个DOM更新周期执行搜索
    };

    /**
     * 使用上下箭头在搜索历史中导航
     */
    const navigateHistory = (direction) => {
      if (!showHistory.value || filteredHistory.value.length === 0) return;
      historySelectedIndex.value += direction;
      // 循环选择
      if (historySelectedIndex.value < 0) {
        historySelectedIndex.value = filteredHistory.value.length - 1;
      } else if (historySelectedIndex.value >= filteredHistory.value.length) {
        historySelectedIndex.value = 0;
      }
      // 更新输入框内容为选中的历史记录
      if (historySelectedIndex.value >= 0) {
        searchQuery.value = filteredHistory.value[historySelectedIndex.value].query;
      }
    };

    /**
     * 延迟隐藏历史记录，以便点击事件可以触发
     */
    const hideHistoryDelayed = () => {
      setTimeout(() => {
        showHistory.value = false;
        historySelectedIndex.value = -1;
      }, 200);
    };

    /**
     * 切换排序字段和方向
     */
    const sortBy = (field) => {
      if (sortState.field === field) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'; // 切换方向
      } else {
        sortState.field = field; // 切换字段
        sortState.direction = 'asc'; // 默认升序
      }
    };

    /**
     * 获取排序指示器的CSS类
     */
    const getSortClass = (field) => {
      if (sortState.field !== field) return '';
      return sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc';
    };

    /**
     * 打开文件
     */
    const openFile = (file) => {
      window.electronAPI?.openPath(file.path);
    };

    /**
     * 显示文件的右键上下文菜单
     */
    const showFileContextMenu = (file) => {
      // TODO: 实现右键菜单
      window.electronAPI?.showFileContextMenu(file.path);
    };

    /**
     * 导出搜索结果
     */
    const exportResults = () => {
      // TODO: 实现导出功能
      // 导出经过排序的结果
      window.electronAPI?.exportResults(sortedResults.value);
    };

    /**
     * 清空当前搜索结果和状态
     */
    const clearResults = () => {
      searchResults.value = [];
      hasSearched.value = false;
      errorMessage.value = '';
      searchQuery.value = '';
    };

    /**
     * 点击搜索建议时，填充并执行搜索
     */
    const trySuggestion = (suggestion) => {
      searchQuery.value = suggestion;
      performSearch();
    };

    /**
     * 获取用于显示的文件名（确保包含扩展名）
     */
    const getDisplayFileName = (file) => {
      if (!file?.name) return '';
      if (file.extension && file.name.toLowerCase().endsWith(`.${file.extension.toLowerCase()}`)) {
        return file.name;
      }
      return file.extension ? `${file.name}.${file.extension}` : file.name;
    };

    // --- 窗口控制方法 ---
    const minimizeWindow = () => window.electronAPI?.minimizeWindow();
    const toggleMaximize = () => {
      if (window.electronAPI?.toggleMaximize) {
        window.electronAPI.toggleMaximize();
        isMaximized.value = !isMaximized.value;
      }
    };
    const closeWindow = () => window.electronAPI?.closeWindow();

    /**
     * 检查与Everything服务的连接状态
     */
    const checkEverythingStatus = async () => {
      everythingTesting.value = true;
      try {
        everythingConnected.value = await window.electronAPI.testEverythingConnection();
      } catch (error) {
        everythingConnected.value = false;
      } finally {
        everythingTesting.value = false;
      }
    };

    // --- 生命周期钩子 ---
    onMounted(() => {
      // 组件挂载后，加载初始数据
      loadSearchHistory();
      loadDisplayFieldsConfig();
      checkEverythingStatus();
      // 定期检查Everything连接状态
      setInterval(checkEverythingStatus, 30000); // 每30秒检查一次
    });

    // 返回所有需要在模板中使用的数据和方法
    return {
      // 数据
      searchQuery, searchResults, searchHistory, isSearching, hasSearched, errorMessage,
      showHistory, historySelectedIndex, showConfigDialog, lastSearchQuery, lastEverythingQuery,
      searchInput, displayFields, everythingConnected, everythingTesting, isMaximized, searchDuration,
      // 计算属性
      filteredHistory, sortedResults, everythingStatusClass, everythingStatusText,
      // 方法
      performSearch, selectHistoryItem, navigateHistory, hideHistoryDelayed, sortBy, getSortClass,
      openFile, showFileContextMenu, exportResults, clearResults, trySuggestion,
      minimizeWindow, toggleMaximize, closeWindow, checkEverythingStatus,
      // 新增和外部方法
      clearError, formatFileSize, formatDate, getFileIcon, getDisplayFileName
    };
  }
};
</script>
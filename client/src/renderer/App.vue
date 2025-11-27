<template>
  <!-- 根容器，包含整个应用界面 -->
  <div class="app-container neu-raised-hard" style="border-radius: 30px; padding: 24px; margin: 2.5vh 2.5vw; width: 95vw; height: 90vh; display: flex; overflow: hidden;">
    <!-- 左侧导航栏 -->
    <aside class="sidebar" style="width: 80px; display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 16px 0; z-index: 20;">
      <!-- Brand -->
      <div class="neu-btn-circle active" style="cursor: default; color: var(--primary-color);">
        <i class="fa-solid fa-robot"></i>
      </div>

      <!-- Menu -->
      <nav style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Search (Active) -->
        <div class="neu-btn-circle active" :title="$t('search.title')">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <!-- Debug -->
        <div v-if="debugConfig.enableStreamDebug" class="neu-btn-circle" @click="openDebugWindow" :title="$t('settings.debug.title')">
          <div v-if="debugConfig.enableStreamDebug" style="position: absolute; right: 0; top: 0; width: 12px; height: 12px; background: var(--error-color); border-radius: 50%; border: 2px solid var(--bg-color);"></div>
          <i class="fa-solid fa-bug"></i>
        </div>
        <!-- Settings -->
        <div class="neu-btn-circle" @click="showConfigDialog = true" :title="$t('settings.title')">
          <i class="fa-solid fa-sliders"></i>
        </div>
      </nav>

      <!-- Bottom -->
      <div class="neu-btn-circle" style="margin-top: auto; color: var(--error-color);" @click="closeWindow" :title="$t('window.close')">
        <i class="fa-solid fa-power-off"></i>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <main style="flex: 1; display: flex; flex-direction: column; padding-left: 24px; gap: 24px;">
      <!-- 自定义标题栏区域 -->
      <div class="custom-titlebar">
        <!-- 标题栏左侧部分：标题和状态 -->
        <div class="titlebar-left">
          <div class="app-title">{{ $t('app.title') }}</div>
          <!-- Everything服务的连接状态指示器 -->
          <div class="everything-status">
            <!-- 状态点，根据连接状态改变颜色 -->
            <div class="status-dot" :class="everythingStatusClass"></div>
            <!-- 状态文本，显示连接状态 -->
            <span class="status-text">{{ everythingStatusText }}</span>
          </div>
        </div>
        <!-- 窗口控制按钮：最小化、关闭 -->
        <div class="window-controls">
          <button @click="minimizeWindow" class="control-button minimize" :title="$t('window.minimize')" style="width: 32px; height: 32px;">
            <i class="fa-solid fa-minus"></i>
          </button>
          <button @click="closeWindow" class="control-button close" :title="$t('window.close')" style="width: 32px; height: 32px; color: var(--error-color);">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 主要搜索功能区域 -->
      <div class="search-section" style="display: flex; flex-direction: column; gap: 16px;">
      <div class="search-container" style="position: relative; display: flex; align-items: center;">
        <div class="search-input-wrapper" style="flex: 1;">
            <!-- 搜索输入框 -->
            <input v-model="searchQuery" @keydown.enter="performSearch" @keydown.down.prevent="navigateHistory(1)"
              @keydown.up.prevent="navigateHistory(-1)" @focus="showHistory = true" @blur="hideHistoryDelayed"
              class="search-input" :placeholder="$t('search.placeholder')" :disabled="isSearching"
              ref="searchInput" />
            <!-- 搜索按钮 -->
            <button @click="performSearch" :disabled="isSearching || !searchQuery.trim()" class="search-button neu-action-btn"
              :class="{ 'searching': isSearching }">
              {{ isSearching ? $t('search.searching') : 'SEARCH' }}
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

      <!-- 结果显示区域 -->
      <div class="results-section">
      <!-- 使用 <template> 进行条件渲染分组，仅在有搜索结果时显示内部所有内容 -->
      <template v-if="searchResults.length > 0">
        <!-- 结果头部信息和操作按钮 -->
        <div style="display: flex; gap: 24px; height: 100%; overflow: hidden;">
          <!-- 左侧：结果摘要卡片 -->
          <div style="width: 25%; display: flex; flex-direction: column; gap: 16px;">
            <!-- 统计卡片 -->
            <div class="neu-flat" style="padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; height: 128px;">
              <div style="font-size: 36px; font-weight: 800; color: var(--primary-color);" class="glow-text">{{ searchResults.length.toLocaleString() }}</div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 1px;">Files Found</div>
            </div>

            <!-- AI解析代码展示 -->
            <div class="neu-flat" style="flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; display: flex; justify-content: space-between;">
                <span>AI Logic</span>
                <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary-color);"></i>
              </div>
              <!-- 模拟显示屏 -->
              <div class="neu-pressed" style="flex: 1; padding: 12px; font-size: 11px; font-family: var(--font-mono); color: var(--text-main); word-break: break-all; line-height: 1.6; user-select: text;">
                <span style="color: var(--text-light);">query > </span><br>
                <span v-if="lastEverythingQuery">{{ lastEverythingQuery }}</span>
                <span v-else style="color: var(--text-light);">等待搜索...</span>
              </div>

              <!-- 操作按钮 -->
              <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 8px;">
                <button @click="exportResults" class="neu-flat" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; color: var(--text-main); border: none; cursor: pointer;">
                  <i class="fa-solid fa-file-export" style="margin-right: 4px;"></i> Export
                </button>
                <button @click="clearResults" class="neu-flat" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; color: var(--text-main); border: none; cursor: pointer;">
                  <i class="fa-solid fa-trash" style="margin-right: 4px;"></i> Clear
                </button>
              </div>
            </div>
          </div>

          <!-- 右侧：文件列表 -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
            <!-- 文件列表 -->
            <div class="file-list-body neu-pressed" ref="fileListBody" style="padding: 16px; overflow-y: auto; flex: 1;">
              <div style="position: sticky; top: 0; z-index: 10; background: var(--bg-color); padding: 8px 16px; margin-bottom: 8px; display: flex; font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(186, 190, 204, 0.3);">
                <div style="width: 41.67%;">File Name</div>
                <div style="width: 33.33%;">Path</div>
                <div style="width: 25%; text-align: right;">Size / Date</div>
              </div>
              <div v-for="file in sortedResults" :key="file.path" @click="openFile(file)"
                @contextmenu.prevent="showFileContextMenu(file, $event)" class="file-row neu-flat">
                <div class="file-cell col-name" :style="getColumnStyle('name')" style="width: 41.67%;">
                  <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-color); display: flex; align-items: center; justify-content: center; box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light); margin-right: 12px;">
                    <span class="file-icon" style="font-size: 18px;">{{ getFileIcon(file.extension) }}</span>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div class="file-name">{{ getDisplayFileName(file) }}</div>
                    <div class="file-path" style="font-size: 11px; margin-top: 4px;">{{ file.directory }}</div>
                  </div>
                </div>
                <div style="width: 25%; text-align: right;">
                  <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  <div class="file-modified" style="font-size: 10px; margin-top: 4px;">{{ formatDate(file.modified) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 当没有搜索结果时，此区域将根据不同状态显示对应内容 -->
      <div v-else class="state-container">
        <!-- 状态0: 优先显示成功信息 -->
        <div v-if="showSuccessMessage" class="success-state">
          <div class="success-icon">✅</div>
          <div class="success-message">{{ showSuccessMessage }}</div>
        </div>

        <!-- 状态1: 显示错误信息 -->
        <div v-else-if="errorMessage" class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">{{ errorMessage }}</div>
          <!-- 允许用户清除错误信息 -->
          <button @click="clearError" class="action-button" style="margin-top: 15px;">{{ $t('messages.info.ok') }}</button>
        </div>

        <!-- 状态2: 如果没有错误，则检查是否正在搜索，显示加载动画 -->
        <div v-else-if="isSearching" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">{{ $t('search.searching') }}</div>
        </div>

        <!-- 状态3: 如果搜索完成但没有结果，显示“未找到文件” -->
        <div v-else-if="hasSearched" class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">{{ $t('search.noResults') }}</div>
          <div class="empty-state-subtext">{{ $t('search.noResultsHint') }}</div>
        </div>

        <!-- 状态4: 如果以上都不是（即初始状态），显示欢迎和使用提示 -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">✨🔍✨</div>
          <div class="empty-state-text">{{ $t('search.welcome') }}</div>
          <div class="empty-state-subtext">{{ $t('search.welcomeHint') }}</div>
          <div class="search-suggestions">
            <div class="suggestion-title">{{ $t('search.suggestions.title') }}</div>
            <div class="suggestion-items">
              <span class="suggestion-item" @click="trySuggestion($t('search.suggestions.today_images'))">{{ $t('search.suggestions.today_images') }}</span>
              <span class="suggestion-item" @click="trySuggestion($t('search.suggestions.large_videos'))">{{ $t('search.suggestions.large_videos') }}</span>
              <span class="suggestion-item" @click="trySuggestion($t('search.suggestions.recent_docs'))">{{ $t('search.suggestions.recent_docs') }}</span>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- 更新通知弹窗 -->
      <div v-if="showUpdateNotification && updateInfo" class="update-notification">
        <div class="update-notification-content">
        <div class="update-header">
          <div class="update-icon">🚀</div>
          <div class="update-title">发现新版本</div>
          <button @click="closeUpdateNotification" class="update-close-btn">×</button>
        </div>
        <div class="update-body">
          <div class="update-version-info">
            <div class="version-line">
              <span class="version-label">当前版本:</span>
              <span class="version-current">v{{ updateInfo.currentVersion }}</span>
            </div>
            <div class="version-line">
              <span class="version-label">最新版本:</span>
              <span class="version-latest">v{{ updateInfo.latestVersion }}</span>
            </div>
          </div>
          <div v-if="updateInfo.releaseNotes" class="update-notes">
            <div class="notes-title">更新内容:</div>
            <div class="notes-content">{{ updateInfo.releaseNotes.substring(0, 200) }}{{ updateInfo.releaseNotes.length > 200 ? '...' : '' }}</div>
          </div>
        </div>
        <div class="update-actions">
          <button @click="downloadUpdate" class="update-btn primary">
            <span class="btn-icon">⬇️</span>
            立即下载
          </button>
          <button @click="remindLater" class="update-btn secondary">
            <span class="btn-icon">⏰</span>
            稍后提醒
          </button>
          <button @click="ignoreVersion" class="update-btn tertiary">
            <span class="btn-icon">✖️</span>
            忽略
          </button>
        </div>
        <div class="update-publish-time" v-if="updateInfo.publishedAt">
          发布时间: {{ new Date(updateInfo.publishedAt).toLocaleDateString('zh-CN') }}
        </div>
      </div>
      </div>

      <!-- 底部状态栏 -->
      <div class="status-bar">
       <div class="status-left">
          <span class="status-text">{{ isSearching ? $t('status.searching') : $t('status.ready') }}</span>
          <span v-if="everythingConnected" class="status-separator">|</span>
          <!-- 此处可以硬编码版本号，或从后端动态获取 -->
          <span v-if="everythingConnected" class="status-text">Everything v1.4.1</span>
        </div>
        <div class="status-right">
          <!-- 显示上一次搜索的耗时 -->
          <span v-if="searchDuration > 0" class="status-text">{{ $t('search.duration', { duration: (searchDuration / 1000).toFixed(2) }) }}
          </span>
          <!-- 打开设置对话框的按钮 -->
          <button @click="showConfigDialog = true" class="status-settings-button" :title="$t('settings.title')">⚙️</button>
        </div>
      </div>

      <!-- 配置对话框组件，通过 v-if 控制显示和隐藏 -->
      <ConfigDialog v-if="showConfigDialog" @close="showConfigDialog = false" />
    </main>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
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
    const showSuccessMessage = ref(''); // 成功消息
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

    // 调试相关状态
    const debugConfig = ref({ enableStreamDebug: false }); // 调试配置

    // 列宽调整相关状态
    const columnWidths = ref({
      name: 240,
      path: 320,
      size: 100,
      modified: 140,
      type: 90,
      created: 140,
      accessed: 140,
      attributes: 100,
      run_count: 80
    });
    const isDragging = ref(false);
    const dragColumn = ref('');
    const dragStartX = ref(0);
    const dragStartWidth = ref(0);

    // 滚动条补偿相关状态
    const hasScrollbar = ref(false);
    const fileListBody = ref(null);
    const fileListHeader = ref(null);

    // 自动更新相关状态
    const updateInfo = ref(null); // 更新信息
    const showUpdateNotification = ref(false); // 显示更新通知
    const currentVersion = ref(''); // 当前版本

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

      // 调试模式：先清空旧的调试输出
      if (debugConfig.value.enableStreamDebug) {
        clearDebugOutput();
      }

      try {
        const result = await window.electronAPI.searchFiles(query, debugConfig.value.enableStreamDebug);
        if (result.success) {
          const results = result.results || [];
          searchResults.value = results;
          lastEverythingQuery.value = result.everythingQuery || query;
          searchDuration.value = Date.now() - searchStartTime.value;

          // 如果搜索结果为空，设置一个延时后自动清空搜索内容
          if (results.length === 0) {
            setTimeout(() => {
              // 只有在没有新的搜索操作时才清空
              if (!isSearching.value && searchResults.value.length === 0) {
                searchQuery.value = '';
                hasSearched.value = false;
                errorMessage.value = '';
              }
            }, 3000); // 3秒后自动清空
          }

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
    const showFileContextMenu = (file, event) => {
      // 阻止浏览器默认右键菜单
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // 调用 Electron 显示自定义右键菜单
      window.electronAPI?.showFileContextMenu(file.path);
    };

    /**
     * 导出搜索结果
     */
    const exportResults = async () => {
      try {
        const result = await window.electronAPI?.exportResults(sortedResults.value);
        if (result?.success) {
          // 显示成功消息，可以使用现有的状态显示机制
          console.log('导出成功:', result.message);
          // 可以在这里添加一个成功提示的状态
          showSuccessMessage.value = result.message;
          setTimeout(() => {
            showSuccessMessage.value = '';
          }, 3000);
        } else {
          // 显示错误消息
          errorMessage.value = result?.error || '导出失败';
          setTimeout(() => {
            errorMessage.value = '';
          }, 3000);
        }
      } catch (error) {
        console.error('导出失败:', error);
        errorMessage.value = `导出过程中发生错误: ${error.message}`;
        setTimeout(() => {
          errorMessage.value = '';
        }, 3000);
      }
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

    // --- 调试相关方法 ---

    /**
     * 打开调试窗口
     */
    const openDebugWindow = async () => {
      try {
        const result = await window.electronAPI.openDebugWindow();
        if (!result.success) {
          console.error('打开调试窗口失败:', result.error);
        }
      } catch (error) {
        console.error('打开调试窗口失败:', error);
      }
    };

    /**
     * 清空调试输出
     */
    const clearDebugOutput = async () => {
      try {
        await window.electronAPI.clearDebugOutput();
      } catch (error) {
        console.error('清空调试输出失败:', error);
      }
    };





    /**
     * 加载调试配置
     */
    const loadDebugConfig = async () => {
      try {
        const config = await window.electronAPI.getOpenAIConfig();
        debugConfig.value = {
          enableStreamDebug: config.enableStreamDebug || false
        };

        // 调试配置已加载
      } catch (error) {
        console.error('加载调试配置失败:', error);
      }
    };

    /**
     * 开始列宽拖拽调整
     */
    const startColumnResize = (columnName, event) => {
      if (event.button !== 0) return; // 只响应左键
      isDragging.value = true;
      dragColumn.value = columnName;
      dragStartX.value = event.clientX;
      dragStartWidth.value = columnWidths.value[columnName];

      // 添加全局拖拽样式
      document.body.classList.add('column-resizing');

      document.addEventListener('mousemove', handleColumnResize);
      document.addEventListener('mouseup', stopColumnResize);
      event.preventDefault();
      event.stopPropagation(); // 阻止点击排序
    };

    /**
     * 处理列宽拖拽
     */
    const handleColumnResize = (event) => {
      if (!isDragging.value) return;

      const deltaX = event.clientX - dragStartX.value;
      const newWidth = Math.max(60, dragStartWidth.value + deltaX);

      columnWidths.value[dragColumn.value] = newWidth;
    };

    /**
     * 停止列宽拖拽
     */
    const stopColumnResize = () => {
      if (isDragging.value) {
        isDragging.value = false;
        dragColumn.value = '';
        // 保存列宽设置到localStorage
        saveColumnWidths();
      }

      // 移除全局拖拽样式
      document.body.classList.remove('column-resizing');

      document.removeEventListener('mousemove', handleColumnResize);
      document.removeEventListener('mouseup', stopColumnResize);
    };

    /**
     * 保存列宽设置
     */
    const saveColumnWidths = () => {
      try {
        localStorage.setItem('file-list-column-widths', JSON.stringify(columnWidths.value));
      } catch (error) {
        console.error('保存列宽设置失败:', error);
      }
    };

    /**
     * 加载列宽设置
     */
    const loadColumnWidths = () => {
      try {
        const saved = localStorage.getItem('file-list-column-widths');
        if (saved) {
          const parsedWidths = JSON.parse(saved);
          columnWidths.value = { ...columnWidths.value, ...parsedWidths };
        }
      } catch (error) {
        console.error('加载列宽设置失败:', error);
      }
    };

    /**
     * 获取列的样式
     */
    const getColumnStyle = (columnName) => {
      return {
        width: `${columnWidths.value[columnName]}px`,
        minWidth: `${Math.min(columnWidths.value[columnName], 60)}px`,
        maxWidth: `${columnWidths.value[columnName]}px`,
        flex: 'none'
      };
    };

    /**
     * 检测表体是否存在滚动条
     */
    const checkScrollbar = () => {
      nextTick(() => {
        if (fileListBody.value) {
          const element = fileListBody.value;
          const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
          hasScrollbar.value = hasVerticalScrollbar;
        }
      });
    };

    /**
     * 同步表头和表体的横向滚动
     */
    const syncHorizontalScroll = (event) => {
      if (fileListHeader.value && fileListBody.value) {
        if (event.target === fileListBody.value) {
          // 表体滚动时同步表头
          fileListHeader.value.scrollLeft = event.target.scrollLeft;
        } else if (event.target === fileListHeader.value) {
          // 表头滚动时同步表体（如果需要支持表头直接滚动）
          fileListBody.value.scrollLeft = event.target.scrollLeft;
        }
      }
    };

    /**
     * 设置横向滚动同步
     */
    const setupScrollSync = () => {
      nextTick(() => {
        if (fileListBody.value) {
          // 为表体添加滚动事件监听器
          fileListBody.value.addEventListener('scroll', syncHorizontalScroll);
        }
      });
    };

    /**
     * 清理滚动同步事件监听器
     */
    const cleanupScrollSync = () => {
      if (fileListBody.value) {
        fileListBody.value.removeEventListener('scroll', syncHorizontalScroll);
      }
    };

    /**
     * 获取表头的样式，包含滚动条补偿
     */
    const getHeaderStyle = computed(() => {
      return {
        paddingRight: hasScrollbar.value ? '6px' : '0px'
      };
    });

    // --- 自动更新相关方法 ---

    /**
     * 处理更新通知
     */
    const handleUpdateNotification = (data) => {
      console.log('处理更新通知，数据:', data);
      if (data.hasUpdate) {
        console.log('设置更新信息并显示通知');
        updateInfo.value = data;
        showUpdateNotification.value = true;
        console.log('showUpdateNotification.value 设置为:', showUpdateNotification.value);
        console.log('updateInfo.value 设置为:', updateInfo.value);
      } else {
        console.log('数据中 hasUpdate 为 false');
      }
    };

    /**
     * 关闭更新通知
     */
    const closeUpdateNotification = () => {
      showUpdateNotification.value = false;
    };

    /**
     * 立即下载更新
     */
    const downloadUpdate = async () => {
      if (updateInfo.value?.downloadUrl) {
        try {
          await window.electronAPI.openDownloadPage(updateInfo.value.downloadUrl);
          closeUpdateNotification();
        } catch (error) {
          console.error('打开下载页面失败:', error);
        }
      }
    };

    /**
     * 稍后提醒
     */
    const remindLater = () => {
      closeUpdateNotification();
      // 30分钟后再次显示
      setTimeout(() => {
        if (updateInfo.value?.hasUpdate) {
          showUpdateNotification.value = true;
        }
      }, 30 * 60 * 1000); // 30分钟
    };

    /**
     * 忽略此版本
     */
    const ignoreVersion = () => {
      if (updateInfo.value?.latestVersion) {
        // 将忽略的版本号保存到本地存储
        try {
          localStorage.setItem('ignored-version', updateInfo.value.latestVersion);
        } catch (error) {
          console.error('保存忽略版本失败:', error);
        }
      }
      closeUpdateNotification();
    };

    /**
     * 检查是否应该显示更新通知
     */
    const shouldShowUpdateNotification = (version) => {
      try {
        const ignoredVersion = localStorage.getItem('ignored-version');
        console.log('忽略的版本:', ignoredVersion, '当前版本:', version);
        const result = !ignoredVersion || ignoredVersion !== version;
        console.log('shouldShowUpdateNotification 结果:', result);
        return result;
      } catch (error) {
        console.error('检查更新通知显示状态失败:', error);
        return true;
      }
    };

    /**
     * 获取当前版本号
     */
    const loadCurrentVersion = async () => {
      try {
        currentVersion.value = await window.electronAPI.getCurrentVersion();
        console.log('当前版本:', currentVersion.value);
      } catch (error) {
        console.error('获取当前版本失败:', error);
      }
    };

    /**
     * 手动检查更新（用于调试）
     */
    const manualCheckForUpdates = async () => {
      try {
        console.log('手动触发检查更新...');
        const result = await window.electronAPI.checkForUpdates();
        console.log('手动检查更新结果:', result);
        if (result.hasUpdate) {
          handleUpdateNotification(result);
        }
      } catch (error) {
        console.error('手动检查更新失败:', error);
      }
    };

    // 在开发环境下暴露到全局，方便调试
    if (process.env.NODE_ENV === 'development') {
      window.debugUpdateNotification = {
        manualCheck: manualCheckForUpdates,
        showNotification: () => {
          updateInfo.value = {
            hasUpdate: true,
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            releaseNotes: '这是一个测试更新通知',
            downloadUrl: 'https://github.com',
            publishedAt: new Date().toISOString()
          };
          showUpdateNotification.value = true;
        },
        hideNotification: () => {
          showUpdateNotification.value = false;
        }
      };
    }

    // --- 监听器 ---

    // 监听搜索结果变化，检测滚动条状态并重新设置滚动同步
    watch(searchResults, () => {
      checkScrollbar();
      setupScrollSync(); // 重新设置滚动同步，确保新的DOM元素正确绑定事件
    }, { flush: 'post' });

    // --- 生命周期钩子 ---

    // 窗口大小变化处理函数
    const handleResize = () => {
      checkScrollbar();
    };

    onMounted(() => {
      // 组件挂载后，加载初始数据
      loadSearchHistory();
      loadDisplayFieldsConfig();
      loadColumnWidths(); // 加载列宽设置
      loadDebugConfig(); // 加载调试配置
      checkEverythingStatus();
      // 定期检查Everything连接状态
      setInterval(checkEverythingStatus, 30000); // 每30秒检查一次

      // 监听窗口大小变化，重新检测滚动条
      window.addEventListener('resize', handleResize);

      // 设置横向滚动同步
      setupScrollSync();

      // 监听来自主进程的消息
      if (window.electronAPI?.on) {
        console.log('设置事件监听器...');

        window.electronAPI.on('open-settings', () => {
          showConfigDialog.value = true;
        });

        // 调试相关事件已移动到独立的调试窗口中处理

        // 监听配置更新事件
        window.electronAPI.on('config-updated', (data) => {
          console.log('收到配置更新通知:', data);
          if (data.type === 'openai') {
            // 重新加载调试配置
            loadDebugConfig();
          }
        });

        // 监听自动更新通知
        console.log('设置 update-available 事件监听器...');
        window.electronAPI.on('update-available', (data) => {
          console.log('收到更新通知:', data);
          // 检查是否应该显示此版本的更新通知
          const shouldShow = shouldShowUpdateNotification(data.latestVersion);
          console.log('是否应该显示更新通知:', shouldShow);
          if (shouldShow) {
            console.log('显示更新通知');
            handleUpdateNotification(data);
          } else {
            console.log('已忽略此版本更新通知');
          }
        });
        console.log('update-available 事件监听器设置完成');
      }

      // 加载当前版本号
      loadCurrentVersion();
    });

    // 组件卸载时清理事件监听器
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      cleanupScrollSync(); // 清理滚动同步事件监听器
    });

    // 返回所有需要在模板中使用的数据和方法
    return {
      // 数据
      searchQuery, searchResults, searchHistory, isSearching, hasSearched, errorMessage, showSuccessMessage,
      showHistory, historySelectedIndex, showConfigDialog, lastSearchQuery, lastEverythingQuery,
      searchInput, displayFields, everythingConnected, everythingTesting, isMaximized, searchDuration,
      // 调试相关数据
      debugConfig,
      // 列宽调整相关数据
      columnWidths, isDragging, dragColumn,
      // 滚动条补偿相关数据
      hasScrollbar, fileListBody, fileListHeader,
      // 自动更新相关数据
      updateInfo, showUpdateNotification, currentVersion,
      // 计算属性
      filteredHistory, sortedResults, everythingStatusClass, everythingStatusText, getHeaderStyle,
      // 方法
      performSearch, selectHistoryItem, navigateHistory, hideHistoryDelayed, sortBy, getSortClass,
      openFile, showFileContextMenu, exportResults, clearResults, trySuggestion,
      minimizeWindow, toggleMaximize, closeWindow, checkEverythingStatus,
      // 调试相关方法
      openDebugWindow, clearDebugOutput, loadDebugConfig,
      // 列宽调整方法
      startColumnResize, getColumnStyle,
      // 滚动条检测方法
      checkScrollbar,
      // 自动更新相关方法
      handleUpdateNotification, closeUpdateNotification, downloadUpdate, remindLater, ignoreVersion,
      // 新增和外部方法
      clearError, formatFileSize, formatDate, getFileIcon, getDisplayFileName
    };
  }
};
</script>

<style scoped>
/* 调试控制栏样式 */
.debug-controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 8px;
}

.debug-info .debug-status {
  color: #616161;
  font-weight: 500;
  font-size: 14px;
}

.debug-actions {
  display: flex;
  gap: 8px;
}

.debug-action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e5613a;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-action-button:hover {
  background: #d14c2a;
  transform: translateY(-1px);
}

.debug-action-button .button-icon {
  font-size: 14px;
}
</style>

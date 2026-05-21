<template>
  <main class="config-page">
    <header class="config-header">
      <div>
        <span class="eyebrow">Voice Gateway Console</span>
        <h1>语音唤醒配置中心</h1>
      </div>
      <RouterLink to="/" class="screen-link">返回大屏</RouterLink>
    </header>

    <a-alert
      v-if="error"
      class="config-alert"
      type="error"
      show-icon
      :message="error"
      closable
      @close="error = ''"
    />

    <a-form layout="vertical" :model="form" class="config-layout">
      <section class="config-section">
        <h2>唤醒设置</h2>
        <a-row :gutter="24">
          <a-col :xs="24" :md="12">
            <a-form-item label="主唤醒词">
              <a-input v-model:value="form.wake_word" placeholder="例如：小智小智" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="唤醒超时时间（秒）">
              <a-input-number v-model:value="form.active_timeout" :min="5" :max="60" class="full-control" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备用唤醒词">
          <a-textarea v-model:value="alternativesText" :rows="3" placeholder="多个唤醒词用换行分隔" />
        </a-form-item>
        <a-form-item label="唤醒欢迎语">
          <a-input v-model:value="form.greeting_text" placeholder="唤醒后自动播报" />
        </a-form-item>
      </section>

      <section class="config-section">
        <h2>语音能力</h2>
        <a-row :gutter="24">
          <a-col :xs="24" :md="12">
            <a-form-item label="语音 WebSocket 地址">
              <a-input v-model:value="form.voice_ws_url" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="对话 HTTP 服务地址">
              <a-input v-model:value="form.dialog_service_root" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="24">
          <a-col :xs="24" :md="8">
            <a-form-item label="ASR 引擎">
              <a-select v-model:value="form.asr_engine">
                <a-select-option value="mock">Mock 联调</a-select-option>
                <a-select-option value="baidu">百度语音</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="ASR 超时（秒）">
              <a-input-number v-model:value="form.asr_timeout_seconds" :min="5" :max="30" class="full-control" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="启用文字转语音">
              <a-switch v-model:checked="form.tts_enabled" />
            </a-form-item>
          </a-col>
        </a-row>
      </section>

      <section class="config-section">
        <h2>TTS 设置</h2>
        <a-row :gutter="24">
          <a-col :xs="24" :md="8">
            <a-form-item label="选择音色">
              <a-select v-model:value="form.tts_voice">
                <a-select-option value="zh-CN-XiaoxiaoNeural">晓晓 - 女声，温柔自然</a-select-option>
                <a-select-option value="zh-CN-YunxiNeural">云希 - 男声，清晰流畅</a-select-option>
                <a-select-option value="zh-CN-XiaoyiNeural">小艺 - 女声，活泼可爱</a-select-option>
                <a-select-option value="zh-CN-YunyangNeural">云扬 - 男声，沉稳大气</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="语速调节">
              <a-slider v-model:value="ttsRateValue" :min="-50" :max="100" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="音量调节">
              <a-slider v-model:value="ttsVolumeValue" :min="-50" :max="100" />
            </a-form-item>
          </a-col>
        </a-row>
      </section>

      <section class="config-section">
        <h2>声纹与讲解词</h2>
        <a-form-item label="启用声纹验证">
          <a-switch v-model:checked="form.voiceprint_enabled" />
        </a-form-item>
        <a-form-item label="已注册声纹">
          <a-tag v-for="user in form.voiceprint_users" :key="user" closable @close="removeVoiceprint(user)">
            {{ user }}
          </a-tag>
          <span v-if="form.voiceprint_users.length === 0" class="muted-text">暂无注册声纹</span>
        </a-form-item>
        <a-form-item label="讲解词配置 JSON">
          <a-textarea v-model:value="explanationWordsText" :rows="6" />
        </a-form-item>
      </section>

      <section class="config-section">
        <h2>历史记录</h2>
        <div class="history-toolbar">
          <a-input v-model:value="keyword" placeholder="搜索指令或播报内容" @keyup.enter="loadHistory" />
          <a-button type="primary" :loading="loadingHistory" @click="loadHistory">搜索</a-button>
          <a-button danger @click="confirmClearHistory">清空历史</a-button>
        </div>
        <a-table :data-source="history" :columns="historyColumns" row-key="id" :pagination="{ pageSize: 8 }" />
      </section>

      <footer class="config-footer">
        <a-space>
          <a-button type="primary" :loading="saving" @click="handleSave">保存配置</a-button>
          <a-button :loading="loading" @click="loadConfig">重置</a-button>
          <a-button :loading="reloading" @click="handleReload">重载到服务</a-button>
        </a-space>
      </footer>
    </a-form>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { clearHistory, getConfig, getHistory, reloadConfig, saveConfig } from '../../services/configApi'
import { defaultWakeConfig, type WakeConfig } from './configSchema'

const form = reactive<WakeConfig>({ ...defaultWakeConfig })
const loading = ref(false)
const saving = ref(false)
const reloading = ref(false)
const loadingHistory = ref(false)
const error = ref('')
const keyword = ref('')
const history = ref<Array<Record<string, unknown>>>([])

const historyColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
  { title: '唤醒词', dataIndex: 'wake_word', key: 'wake_word', width: 140 },
  { title: '识别文本', dataIndex: 'instruction_text', key: 'instruction_text', ellipsis: true },
  { title: '播报内容', dataIndex: 'tts_text', key: 'tts_text', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 190 }
]

const alternativesText = computed({
  get: () => form.wake_word_alternatives.join('\n'),
  set: (value: string) => {
    form.wake_word_alternatives = value.split('\n').map((item) => item.trim()).filter(Boolean)
  }
})

const ttsRateValue = computed({
  get: () => Number.parseInt(form.tts_rate.replace('%', ''), 10),
  set: (value: number) => {
    form.tts_rate = `${value > 0 ? '+' : ''}${value}%`
  }
})

const ttsVolumeValue = computed({
  get: () => Number.parseInt(form.tts_volume.replace('%', ''), 10),
  set: (value: number) => {
    form.tts_volume = `${value > 0 ? '+' : ''}${value}%`
  }
})

const explanationWordsText = computed({
  get: () => JSON.stringify(form.explanation_words, null, 2),
  set: (value: string) => {
    try {
      form.explanation_words = value ? JSON.parse(value) : {}
      error.value = ''
    } catch {
      error.value = '讲解词配置不是合法 JSON'
    }
  }
})

function assignConfig(config: WakeConfig) {
  Object.assign(form, { ...defaultWakeConfig, ...config })
}

async function loadConfig() {
  loading.value = true
  error.value = ''
  try {
    assignConfig(await getConfig())
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载配置失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (error.value) return
  saving.value = true
  try {
    assignConfig(await saveConfig({ ...form }))
    message.success('配置已保存')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存配置失败'
  } finally {
    saving.value = false
  }
}

async function handleReload() {
  reloading.value = true
  try {
    assignConfig(await reloadConfig())
    message.success('配置已重载')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重载配置失败'
  } finally {
    reloading.value = false
  }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    history.value = await getHistory(keyword.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载历史失败'
  } finally {
    loadingHistory.value = false
  }
}

function confirmClearHistory() {
  Modal.confirm({
    title: '确认清空历史',
    content: '清空后不可恢复，确定继续吗？',
    async onOk() {
      await clearHistory()
      history.value = []
      message.success('历史已清空')
    }
  })
}

function removeVoiceprint(user: string) {
  form.voiceprint_users = form.voiceprint_users.filter((item) => item !== user)
}

onMounted(() => {
  void loadConfig()
  void loadHistory()
})
</script>

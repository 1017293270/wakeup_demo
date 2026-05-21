<template>  
  <div class="wake-config-container">
    <a-card title="语音唤醒配置" bordered="false" class="config-card">
      <a-form layout="vertical" :model="configForm" ref="formRef">
        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="主唤醒词" name="wake_word">
              <a-input
                v-model:value="configForm.wake_word"
                placeholder="请输入主唤醒词，例如：小智小智"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="唤醒超时时间(秒)" name="active_timeout">
              <a-input-number
                v-model:value="configForm.active_timeout"
                :min="5"
                :max="60"
                style="width: 100%"
                placeholder="唤醒后无操作自动休眠的时间"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="唤醒欢迎语" name="greeting_text">
          <a-input
            v-model:value="configForm.greeting_text"
            placeholder="请输入唤醒后的欢迎语，例如：你好我是小智"
          />
          <div class="tip">唤醒成功后会自动播报该欢迎语</div>
        </a-form-item>

        <a-form-item label="备用唤醒词">
          <a-textarea
            v-model:value="alternativesText"
            :rows="3"
            placeholder="请输入备用唤醒词，多个用换行分隔"
          />
          <div class="tip">多个备用唤醒词请用换行分隔</div>
        </a-form-item>

        <a-divider>声纹验证设置</a-divider>

        <a-form-item label="启用声纹验证">
          <a-switch v-model:checked="configForm.voiceprint_enabled" />
          <div class="tip">启用后只有已注册的声纹才能唤醒系统</div>
        </a-form-item>

        <a-card title="声纹管理" size="small" style="margin-bottom: 16px">
          <a-space direction="vertical" style="width: 100%">
            <a-form-item label="注册新声纹">
              <a-space>
                <a-input v-model:value="newVoiceprintUserId" placeholder="输入用户ID，例如：admin" style="width: 200px" />
                <a-button @click="startRecord" :type="recording ? 'default' : 'primary'" :loading="recording">
                  {{ recording ? '录音中...点击停止' : '开始录音(2秒)' }}
                </a-button>
                <a-button @click="registerVoiceprint" :disabled="!recordedAudio">注册声纹</a-button>
              </a-space>
              <div class="tip">请说包含唤醒词的语句，例如："小智小智"，录音时长2秒左右</div>
            </a-form-item>

            <a-form-item label="已注册声纹">
              <a-tag v-for="user in configForm.voiceprint_users" :key="user" closable @close="deleteVoiceprint(user)">
                {{ user }}
              </a-tag>
              <div v-if="configForm.voiceprint_users.length === 0" class="tip">暂无注册的声纹</div>
            </a-form-item>
          </a-space>
        </a-card>

        <a-divider>语音合成设置</a-divider>

        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="选择音色" name="tts_voice">
              <a-select v-model:value="configForm.tts_voice" style="width: 100%">
                <a-select-option value="zh-CN-XiaoxiaoNeural">
                  晓晓 - 女声，温柔自然
                </a-select-option>
                <a-select-option value="zh-CN-YunxiNeural">
                  云希 - 男声，清晰流畅
                </a-select-option>
                <a-select-option value="zh-CN-XiaoyiNeural">
                  小艺 - 女声，活泼可爱
                </a-select-option>
                <a-select-option value="zh-CN-YunyangNeural">
                  云扬 - 男声，沉稳大气
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="语速调节">
              <a-slider
                v-model:value="ttsRateValue"
                :min="-50"
                :max="100"
                :marks="{ '-50': '-50%', 0: '0%', 50: '+50%', 100: '+100%' }"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="音量调节">
              <a-slider
                v-model:value="ttsVolumeValue"
                :min="-50"
                :max="100"
                :marks="{ '-50': '-50%', 0: '0%', 50: '+50%', 100: '+100%' }"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="讲解词配置">
          <a-textarea
            v-model:value="explanationWordsText"
            :rows="6"
            placeholder="请输入讲解词配置，JSON格式，例如：{&quot;welcome&quot;: &quot;欢迎使用语音服务&quot;}"
          />
          <div class="tip">请输入标准JSON格式的讲解词配置</div>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="saveConfig" :loading="saving">
              保存配置
            </a-button>
            <a-button @click="loadConfig">
              重置
            </a-button>
            <a-button @click="reloadConfig">
              重载配置到服务
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="交互历史记录" bordered="false" class="history-card">
      <a-space style="margin-bottom: 16px">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索指令或播报内容"
          style="width: 300px"
          @keyup.enter="loadHistory"
        />
        <a-button type="primary" @click="loadHistory">
          搜索
        </a-button>
        <a-button danger @click="clearHistory">
          清空历史
        </a-button>
      </a-space>

      <a-table :columns="historyColumns" :data-source="historyList" :loading="loadingHistory" :pagination="pagination">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'success' ? 'green' : 'red'">
              {{ record.status === 'success' ? '成功' : '失败' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'

const formRef = ref()
const saving = ref(false)
const loadingHistory = ref(false)
const searchKeyword = ref('')

// 声纹相关
const newVoiceprintUserId = ref('')
const recording = ref(false)
const recordedAudio = ref('')
let mediaRecorder: MediaRecorder | null = null
let audioChunks: BlobPart[] = []

// 配置表单
const configForm = ref({
  wake_word: '小智小智',
  wake_word_alternatives: ['小智'],
  active_timeout: 15,
  tts_voice: 'zh-CN-XiaoxiaoNeural',
  tts_rate: '+0%',
  tts_volume: '+0%',
  greeting_text: '你好我是小智',
  explanation_words: {},
  voiceprint_enabled: false,
  voiceprint_users: []
})

// 备用唤醒词文本
const alternativesText = computed({
  get: () => configForm.value.wake_word_alternatives.join('\n'),
  set: (val: string) => {
    configForm.value.wake_word_alternatives = val.split('\n').filter(item => item.trim())
  }
})

// 语速值转换
const ttsRateValue = computed({
  get: () => parseInt(configForm.value.tts_rate.replace('%', '')),
  set: (val: number) => {
    configForm.value.tts_rate = `${val > 0 ? '+' : ''}${val}%`
  }
})

// 音量值转换
const ttsVolumeValue = computed({
  get: () => parseInt(configForm.value.tts_volume.replace('%', '')),
  set: (val: number) => {
    configForm.value.tts_volume = `${val > 0 ? '+' : ''}${val}%`
  }
})

// 讲解词文本
const explanationWordsText = computed({
  get: () => JSON.stringify(configForm.value.explanation_words, null, 2),
  set: (val: string) => {
    try {
      configForm.value.explanation_words = val ? JSON.parse(val) : {}
    } catch (e) {
      // 解析失败不处理，保存的时候会校验
    }
  }
})

// 历史记录
const historyList = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

const historyColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '唤醒词', dataIndex: 'wake_word', key: 'wake_word', width: 120 },
  { title: '用户指令', dataIndex: 'instruction_text', key: 'instruction_text', ellipsis: true },
  { title: '播报内容', dataIndex: 'tts_text', key: 'tts_text', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '时长(秒)', dataIndex: 'duration', key: 'duration', width: 100 },
  { title: '创建时间', dataIndex: 'create_time', key: 'create_time', width: 180 }
]

// WebSocket连接
let ws: WebSocket | null = null
const wsUrl = 'ws://127.0.0.1:8765'

// 建立WebSocket连接
function connectWebSocket() {
  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket连接成功')
      loadConfig()
      loadHistory()
    }

    ws.onmessage = (event) => {
      const res = JSON.parse(event.data)
      handleWsMessage(res)
    }

    ws.onerror = (error) => {
      console.error('WebSocket连接错误:', error)
      message.error('语音服务连接失败，请检查服务是否启动')
    }

    ws.onclose = () => {
      console.log('WebSocket连接关闭')
      // 尝试重连
      setTimeout(connectWebSocket, 3000)
    }
  } catch (e) {
    console.error('WebSocket连接失败:', e)
    setTimeout(connectWebSocket, 3000)
  }
}

// 处理WebSocket消息
function handleWsMessage(res: any) {
  switch (res.event) {
    case 'configResult':
      Object.assign(configForm.value, res.data.config)
      break
    case 'saveConfigResult':
      saving.value = false
      if (res.data.success) {
        message.success(res.data.message)
        loadConfig()
      } else {
        message.error(res.data.message)
      }
      break
    case 'reloadConfigResult':
      if (res.data.success) {
        message.success(res.data.message)
      } else {
        message.error(res.data.message)
      }
      break
    case 'historyResult':
      loadingHistory.value = false
      const { list, total, page, page_size } = res.data.history
      historyList.value = list
      pagination.value = {
        current: page,
        pageSize: page_size,
        total: total
      }
      break
    case 'clearHistoryResult':
      if (res.data.success) {
        message.success(res.data.message)
        loadHistory()
      } else {
        message.error(res.data.message)
      }
      break
    case 'registerVoiceprintResult':
      if (res.data.success) {
        message.success(res.data.message)
        newVoiceprintUserId.value = ''
        recordedAudio.value = ''
        loadConfig() // 重新加载配置，更新用户列表
      } else {
        message.error(res.data.message)
      }
      break
    case 'deleteVoiceprintResult':
      if (res.data.success) {
        message.success(res.data.message)
        loadConfig() // 重新加载配置，更新用户列表
      } else {
        message.error(res.data.message)
      }
      break
  }
}

// 发送WebSocket消息
function sendWsMessage(action: string, data: any = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action, data }))
  } else {
    message.error('语音服务未连接，请稍后重试')
  }
}

// 加载配置
function loadConfig() {
  sendWsMessage('getConfig')
}

// 保存配置
function saveConfig() {
  // 校验讲解词JSON格式
  try {
    if (explanationWordsText.value) {
      JSON.parse(explanationWordsText.value)
    }
  } catch (e) {
    message.error('讲解词配置不是有效的JSON格式，请检查')
    return
  }

  saving.value = true
  sendWsMessage('saveConfig', {
    config: configForm.value
  })
}

// 重载配置
function reloadConfig() {
  sendWsMessage('reloadConfig')
}

// 加载历史记录
function loadHistory(page = 1, pageSize = 20) {
  loadingHistory.value = true
  sendWsMessage('getHistory', {
    page,
    page_size: pageSize,
    keyword: searchKeyword.value
  })
}

// 清空历史记录
function clearHistory() {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空所有历史记录吗？此操作不可恢复',
    onOk() {
      sendWsMessage('clearHistory')
    }
  })
}

// 开始/停止录音
async function startRecord() {
  if (recording.value) {
    // 停止录音
    mediaRecorder?.stop()
    recording.value = false
    return
  }

  if (!newVoiceprintUserId.value.trim()) {
    message.error('请先输入用户ID')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = () => {
        // 去掉base64前缀
        recordedAudio.value = (reader.result as string).split(',')[1]
        message.success('录音完成，点击注册声纹按钮完成注册')
      }
      // 关闭音频流
      stream.getTracks().forEach(track => track.stop())
    }

    recording.value = true
    mediaRecorder.start()
    message.info('开始录音，请说唤醒词，2秒后自动停止...')

    // 自动停止录音，2秒
    setTimeout(() => {
      if (recording.value) {
        mediaRecorder?.stop()
        recording.value = false
      }
    }, 2000)

  } catch (e) {
    console.error('录音失败:', e)
    message.error('录音失败，请允许麦克风权限')
  }
}

// 注册声纹
function registerVoiceprint() {
  if (!newVoiceprintUserId.value.trim()) {
    message.error('请输入用户ID')
    return
  }
  if (!recordedAudio.value) {
    message.error('请先录音')
    return
  }

  sendWsMessage('registerVoiceprint', {
    user_id: newVoiceprintUserId.value.trim(),
    audio: recordedAudio.value
  })
}

// 删除声纹
function deleteVoiceprint(userId: string) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除用户 ${userId} 的声纹吗？`,
    onOk() {
      sendWsMessage('deleteVoiceprint', { user_id: userId })
    }
  })
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  loadHistory(page, pageSize)
}

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
    ws = null
  }
})
</script>

<style scoped>
.wake-config-container {
  padding: 16px;
}

.config-card,
.history-card {
  margin-bottom: 16px;
}

.tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>

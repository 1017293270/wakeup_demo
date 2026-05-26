<template>
  <main class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>登录</h1>
        <p>语音唤醒 AI 指挥舱</p>
      </div>

      <a-form
        :model="form"
        layout="vertical"
        autocomplete="off"
        @finish="handleLogin"
      >
        <a-form-item
          label="手机号 / 用户名"
          name="phone"
          :rules="[{ required: true, message: '请输入手机号或用户名' }]"
        >
          <a-input
            v-model:value="form.phone"
            placeholder="手机号或用户名"
            size="large"
            allow-clear
          />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="form.password"
            placeholder="密码"
            size="large"
          />
        </a-form-item>

        <a-form-item
          label="验证码"
          name="captchaCode"
          :rules="[{ required: true, message: '请输入验证码' }]"
        >
          <a-row :gutter="12" align="middle">
            <a-col :span="14">
              <a-input
                v-model:value="form.captchaCode"
                placeholder="计算结果"
                size="large"
              />
            </a-col>
            <a-col :span="10">
              <img
                v-if="captchaImage"
                :src="captchaImage"
                class="auth-captcha-img"
                alt="验证码"
                title="点击刷新"
                @click="refreshCaptcha"
              />
              <div v-else class="auth-captcha-placeholder" @click="refreshCaptcha">
                <span v-if="captchaText">{{ captchaText }}</span>
                <span v-else>点击获取验证码</span>
              </div>
            </a-col>
          </a-row>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="loading"
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>

      <div class="auth-footer">
        还没有账号？<RouterLink to="/register">立即注册</RouterLink>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { message } from 'ant-design-vue'
import { getCaptcha, login } from '../../services/authApi'
import { useAuthStore } from '../../stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  phone: '',
  password: '',
  captchaCode: '',
})

const loading = ref(false)
const captchaImage = ref('')
const captchaText = ref('')
const captchaToken = ref('')

async function refreshCaptcha() {
  try {
    const data = await getCaptcha()
    captchaToken.value = data.captcha_token
    captchaImage.value = data.captcha_image
    captchaText.value = data.captcha_text || ''
  } catch {
    message.error('验证码加载失败')
  }
}

async function handleLogin() {
  if (!captchaToken.value) {
    message.warning('请先加载验证码')
    return
  }

  loading.value = true
  try {
    const data = await login(
      form.phone,
      form.password,
      form.captchaCode,
      captchaToken.value,
    )
    authStore.setAuth(data.token, data.user)
    message.success('登录成功')

    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err: any) {
    message.error(err.message || '登录失败')
    refreshCaptcha()
    form.captchaCode = ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

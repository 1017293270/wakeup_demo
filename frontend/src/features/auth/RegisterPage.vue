<template>
  <main class="auth-page">
    <div class="auth-card auth-card--register">
      <div class="auth-header">
        <h1>注册</h1>
        <p>创建您的 AI 指挥舱账号</p>
      </div>

      <a-form
        :model="form"
        layout="vertical"
        autocomplete="off"
        @finish="handleRegister"
      >
        <a-form-item
          label="用户名称"
          name="name"
          :rules="[
            { required: true, message: '请输入用户名称' },
            { max: 50, message: '用户名称不能超过50个字符' },
          ]"
        >
          <a-input
            v-model:value="form.name"
            placeholder="请输入用户名称"
            size="large"
            allow-clear
            maxlength="50"
          />
        </a-form-item>

        <a-form-item
          label="手机号"
          name="phone"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
          ]"
        >
          <a-input
            v-model:value="form.phone"
            placeholder="请输入手机号"
            size="large"
            allow-clear
            maxlength="11"
          />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入密码"
            size="large"
            @change="onPasswordChange"
          />
        </a-form-item>

        <!-- Password rules checklist -->
        <div class="auth-password-rules">
          <div
            v-for="rule in passwordRuleItems"
            :key="rule.key"
            class="auth-password-rules__item"
            :class="rule.pass ? 'auth-password-rules__item--pass' : 'auth-password-rules__item--fail'"
          >
            <svg v-if="rule.pass" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span>{{ rule.label }}</span>
          </div>
        </div>

        <a-form-item
          label="确认密码"
          name="confirmPassword"
          :rules="[
            { required: true, message: '请再次输入密码' },
            { validator: validateConfirmPassword, trigger: 'change' },
          ]"
        >
          <a-input-password
            v-model:value="form.confirmPassword"
            placeholder="请再次输入密码"
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
            注册
          </a-button>
        </a-form-item>
      </a-form>

      <div class="auth-footer">
        已有账号？<RouterLink to="/login">立即登录</RouterLink>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { checkPasswordRules, validatePassword } from '../../utils/passwordValidator'
import { getCaptcha, register } from '../../services/authApi'
import { useAuthStore } from '../../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
  captchaCode: '',
})

const loading = ref(false)
const captchaImage = ref('')
const captchaText = ref('')
const captchaToken = ref('')
const passwordRules = ref({
  minLength: false,
  hasUpper: false,
  hasLower: false,
  hasSpecial: false,
  noConsecutiveDigits: true,
  noConsecutiveLetters: true,
  noKeyboardPattern: true,
})

const passwordRuleItems = computed(() => [
  { key: 'minLength', label: '密码长度至少8位', pass: passwordRules.value.minLength },
  { key: 'hasUpper', label: '包含大写字母', pass: passwordRules.value.hasUpper },
  { key: 'hasLower', label: '包含小写字母', pass: passwordRules.value.hasLower },
  { key: 'hasSpecial', label: '包含特殊字符', pass: passwordRules.value.hasSpecial },
  { key: 'noConsecutiveDigits', label: '不包含连续数字（如 123、456）', pass: passwordRules.value.noConsecutiveDigits },
  { key: 'noConsecutiveLetters', label: '不包含连续字母（如 abc、efg）', pass: passwordRules.value.noConsecutiveLetters },
  { key: 'noKeyboardPattern', label: '不包含键盘连续字符（如 qwerty）', pass: passwordRules.value.noKeyboardPattern },
])

function onPasswordChange() {
  if (form.password) {
    passwordRules.value = checkPasswordRules(form.password)
  } else {
    passwordRules.value = {
      minLength: false, hasUpper: false, hasLower: false, hasSpecial: false,
      noConsecutiveDigits: true, noConsecutiveLetters: true, noKeyboardPattern: true,
    }
  }
}

function validateConfirmPassword(_rule: Rule, value: string) {
  if (value && value !== form.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

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

async function handleRegister() {
  if (!captchaToken.value) {
    message.warning('请先加载验证码')
    return
  }

  if (form.password !== form.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }

  // Client-side validation for better UX
  const result = validatePassword(form.password)
  if (!result.valid) {
    message.error('密码不符合要求：' + result.errors.join('；'))
    return
  }

  loading.value = true
  try {
    const data = await register(
      form.phone,
      form.password,
      form.captchaCode,
      captchaToken.value,
      form.name,
    )
    authStore.setAuth(data.token, data.user)
    message.success('注册成功')
    router.push('/')
  } catch (err: any) {
    message.error(err.message || '注册失败')
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

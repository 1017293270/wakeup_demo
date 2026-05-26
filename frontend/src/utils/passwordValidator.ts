const KEYBOARD_SEQUENCES: Set<string> = new Set()

function buildKeyboardPatterns(): void {
  const rows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
  ]
  const diagonals = ['1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm']

  const allSeqs = [
    ...rows,
    ...rows.map((r) => r.split('').reverse().join('')),
    ...diagonals,
    ...diagonals.map((d) => d.split('').reverse().join('')),
  ]

  for (const seq of allSeqs) {
    for (let i = 0; i < seq.length - 2; i++) {
      KEYBOARD_SEQUENCES.add(seq.substring(i, i + 3).toLowerCase())
    }
  }
}

buildKeyboardPatterns()

export interface PasswordRulesStatus {
  minLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasSpecial: boolean
  noConsecutiveDigits: boolean
  noConsecutiveLetters: boolean
  noKeyboardPattern: boolean
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

function hasConsecutiveDigits(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    const chunk = password.substring(i, i + 3)
    if (/^\d{3}$/.test(chunk)) {
      const d0 = parseInt(chunk[0]), d1 = parseInt(chunk[1]), d2 = parseInt(chunk[2])
      if (d1 - d0 === 1 && d2 - d1 === 1) return true
      if (d0 - d1 === 1 && d1 - d2 === 1) return true
    }
  }
  return false
}

function hasConsecutiveLetters(password: string): boolean {
  const lower = password.toLowerCase()
  for (let i = 0; i < lower.length - 2; i++) {
    const chunk = lower.substring(i, i + 3)
    if (/^[a-z]{3}$/.test(chunk)) {
      const c0 = chunk.charCodeAt(0), c1 = chunk.charCodeAt(1), c2 = chunk.charCodeAt(2)
      if (c1 - c0 === 1 && c2 - c1 === 1) return true
      if (c0 - c1 === 1 && c1 - c2 === 1) return true
    }
  }
  return false
}

function hasKeyboardPattern(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    if (KEYBOARD_SEQUENCES.has(password.substring(i, i + 3).toLowerCase())) {
      return true
    }
  }
  return false
}

export function checkPasswordRules(password: string): PasswordRulesStatus {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[^a-zA-Z0-9\s]/.test(password),
    noConsecutiveDigits: !hasConsecutiveDigits(password),
    noConsecutiveLetters: !hasConsecutiveLetters(password),
    noKeyboardPattern: !hasKeyboardPattern(password),
  }
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  const rules = checkPasswordRules(password)

  if (!rules.minLength) errors.push('密码长度至少8位')
  if (!rules.hasUpper) errors.push('密码必须包含大写字母')
  if (!rules.hasLower) errors.push('密码必须包含小写字母')
  if (!rules.hasSpecial) errors.push('密码必须包含特殊字符')
  if (!rules.noConsecutiveDigits) errors.push('密码不能包含连续数字（如 123、456）')
  if (!rules.noConsecutiveLetters) errors.push('密码不能包含连续字母（如 abc、efg）')
  if (!rules.noKeyboardPattern) errors.push('密码不能包含键盘连续字符（如 qwerty、asdfg）')

  return { valid: errors.length === 0, errors }
}

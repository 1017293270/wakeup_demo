# Live2D 加载问题完整排查记录

> 日期：2026-05-14
> 项目：`D:\wakeup_demo\frontend`
> 参考项目：`D:\社群联动\zhongyi\community-linkage\jeecgboot-vue3`

---

## 一、最终有效的配置

### 1.1 依赖版本

```json
{
  "pixi.js": "^6.5.10",
  "pixi-live2d-display": "^0.4.0"
}
```

### 1.2 Cubism Core（关键！）

**不能用 npm 包** `live2dcubismcore@1.0.2`（Cubism 4.2.2，仅支持 MOC3 version ≤ 4）

**必须用 Cubism 5.0.0 Core**（支持 MOC3 version 5），放在 `public/live2dcubismcore.min.js`，通过 `<script>` 标签在应用启动前加载：

```html
<!-- index.html -->
<head>
  <script src="/live2dcubismcore.min.js"></script>
</head>
```

### 1.3 代码模板

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

let app: PIXI.Application | null = null
let model: any = null

async function initLive2D() {
  const width = canvasRef.value.clientWidth || 520
  const height = canvasRef.value.clientHeight || 620

  app = new PIXI.Application({
    view: canvasRef.value,
    autoStart: true,
    backgroundColor: 0x000000,
    backgroundAlpha: 0,
    width,
    height,
  })

  // 必须：暴露 PIXI 到全局，注册 Ticker
  ;(window as any).PIXI = PIXI
  Live2DModel.registerTicker(PIXI.Ticker)

  // 加载模型
  model = await Live2DModel.from('/robot/robot.model3.json')
  model.anchor.set(0.5, 0.5)
  model.x = width / 2
  model.y = height / 2
  model.scale.set(0.2)

  app.stage.addChild(model)
}

onMounted(initLive2D)
onBeforeUnmount(() => {
  model?.destroy()
  app?.destroy(true)
})
</script>
```

---

## 二、问题排查全过程

### 问题 1：Cubism Core 版本不匹配（根本原因）

**现象**：
```
[CSM] [E]csmReviveMocInPlace is failed. The Core unsupport later than moc3 ver:[4]. This moc3 ver is [5].
```

**原因**：

Live2D 的模型文件 `.moc3` 有版本概念，写在文件第 5 个字节（偏移量 4）：

| 版本字节 | Cubism 版本 | 说明 |
|---------|------------|------|
| `0x03` | Cubism 3.3 | 旧版模型 |
| `0x04` | Cubism 4.0 | 多数公开模型 |
| `0x05` | Cubism 4.1+ | 用较新 Cubism Editor 导出的模型 |

我们遇到的情况：

- **机器人模型**：MOC3 version 5（Cubism 4.1+ 导出）
- **HiYori 模型**：MOC3 version 4（Cubism 4.0）
- **npm 包** `live2dcubismcore@1.0.2`：Cubism Core 4.2.2，**只支持 MOC3 ≤ 4**

所以：
- HiYori 能加载（version 4 ≤ 4），但看不到渲染（另有原因，见问题 4）
- 机器人加载失败（version 5 > 4），报错 `csmReviveMocInPlace is failed`

**解决**：
从参考项目复制 `live2dcubismcore.min.js`（Cubism 5.0.0 Core，206KB），放到 `public/` 目录，通过 `<script>` 标签加载。

**如何判断你的模型需要什么版本的 Core**：

```bash
node -e "
const fs = require('fs');
const buf = fs.readFileSync('your-model.moc3');
const version = buf[4];
console.log('MOC3 version:', version);
// 0x04 → Cubism 4 Core 即可
// 0x05 → 需要 Cubism 5 Core
"
```

### 问题 2：Cubism 5 Core 的 `renderOrders` 属性改名

**现象**：
```
TypeError: Cannot read properties of undefined (reading '0')
at cubism.es.js:13388 CubismRenderer_WebGL.doDrawModel
```

**原因**：

Cubism 5 Core 将 `Drawables.renderOrders` 改名为 `Drawables.drawOrders`，而 `pixi-live2d-display` 内部仍然读取 `renderOrders`，导致取到 `undefined`。

**解决**：

用 Cubism 4 Core（参考项目的那个），不存在这个问题。如果必须用 Cubism 5 Core，可以加别名兼容：

```typescript
const { Drawables } = (window as any).Live2DCubismCore
if (Drawables && !Object.prototype.hasOwnProperty.call(Drawables.prototype, 'renderOrders')) {
  Object.defineProperty(Drawables.prototype, 'renderOrders', {
    get() { return this.drawOrders }
  })
}
```

**但最稳妥的做法是直接用 Cubism 5.0.0 Core + renderOrders 别名补丁。** 参考项目的 Core 恰好是 5.0.0 且兼容 MOC3 version 5，所以不需要补丁。

### 问题 3：导入路径不对

**现象**：
```
Error: Could not find Cubism 2 runtime. This plugin requires live2d.min.js to be loaded.
```

**原因**：

```typescript
// 错误：加载主入口，包含 Cubism 2 运行时检查
import { Live2DModel } from 'pixi-live2d-display'

// 正确：只加载 Cubism 4 运行时
import { Live2DModel } from 'pixi-live2d-display/cubism4'
```

`pixi-live2d-display` 的包结构：

```
pixi-live2d-display/
├── dist/
│   ├── index.js          # 主入口：Cubism 2 + Cubism 4 合并版
│   ├── cubism2.js        # 仅 Cubism 2
│   └── cubism4.js        # 仅 Cubism 4（推荐）
└── ...
```

主入口 `index.js` 同时包含 Cubism 2 和 Cubism 4 代码，加载时会检查 `live2d.min.js`（Cubism 2 runtime），如果没有就报错。用 `/cubism4` 子路径只加载 Cubism 4 运行时，不需要 Cubism 2 文件。

### 问题 4：PIXI 未暴露到全局 + Ticker 未注册

**现象**：
- 模型能加载但 Canvas 全黑
- 或者报 `TypeError: ticker.count is not a function`

**原因**：

`pixi-live2d-display` 内部通过 `window.PIXI` 访问 PIXI 的 Ticker 系统来驱动模型动画。如果不做以下两步：

1. **暴露 PIXI 到全局**：
   ```typescript
   ;(window as any).PIXI = PIXI
   ```

2. **注册 Ticker**：
   ```typescript
   Live2DModel.registerTicker(PIXI.Ticker)
   ```

模型虽然能加载，但不会渲染/动画。

**参考项目的做法**：

参考项目实际上**没有显式注册 Ticker**，因为它用的是 `pixi-live2d-display` 主入口（`import { Live2DModel } from 'pixi-live2d-display'`），主入口在模块初始化时会自动注册 Ticker。但我们用了 `/cubism4` 子路径，就需要手动注册。

### 问题 5：Playwright 无头模式无法渲染 WebGL

**现象**：
- 在真实浏览器里正常，但 Playwright 截图是全黑的

**原因**：

Playwright 的 Chromium 无头模式使用 SwiftShader 软件渲染，不支持完整的 WebGL 2.0。`gl.readPixels()` 在无头模式下返回全 0 或报错。

**排查技巧**：
- 看控制台日志判断模型是否加载成功
- 用真实浏览器验证渲染效果
- 不要在 Playwright 里用 `gl.readPixels` 验证 WebGL 内容

---

## 三、新项目接入 Live2D 清单

### 3.1 安装依赖

```bash
npm install pixi.js@6.5.10 pixi-live2d-display@0.4.0
# 不需要安装 live2dcubismcore npm 包
```

### 3.2 准备 Cubism Core

1. 从官网下载 [Cubism SDK for Web](https://www.live2d.com/download/cubism-sdk/download-web/)
2. 或直接使用参考项目验证过的 `public/live2dcubismcore.min.js`（Cubism 5.0.0，206KB）
3. 放到项目的 `public/` 目录

### 3.3 配置 index.html

```html
<head>
  <meta charset="UTF-8" />
  <script src="/live2dcubismcore.min.js"></script>
  <title>你的项目</title>
</head>
```

### 3.4 检查模型版本

```bash
node -e "
const buf = require('fs').readFileSync('public/your-model.moc3');
const v = buf[4];
console.log('MOC3 version:', v, v >= 5 ? '→ 需要 Cubism 5 Core' : '→ Cubism 4 Core 即可');
"
```

### 3.5 Vue 组件

完整可运行模板：

```vue
<template>
  <canvas ref="canvasRef" class="live2d-canvas" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

const canvasRef = ref<HTMLCanvasElement>()
let app: PIXI.Application | null = null
let model: any = null

async function initLive2D() {
  if (!canvasRef.value) return

  const width = canvasRef.value.clientWidth || 520
  const height = canvasRef.value.clientHeight || 620

  // 1. 创建 PIXI Application
  app = new PIXI.Application({
    view: canvasRef.value,
    autoStart: true,
    backgroundColor: 0x000000,
    backgroundAlpha: 0,  // 透明背景
    width,
    height,
  })

  // 2. 暴露 PIXI 到全局 + 注册 Ticker（必须）
  ;(window as any).PIXI = PIXI
  Live2DModel.registerTicker(PIXI.Ticker)

  // 3. 加载模型
  model = await Live2DModel.from('/robot/robot.model3.json')
  model.anchor.set(0.5, 0.5)
  model.x = width / 2
  model.y = height / 2
  model.scale.set(0.2)

  // 4. 添加到场景
  app.stage.addChild(model)
}

onMounted(initLive2D)
onBeforeUnmount(() => {
  model?.destroy()
  app?.destroy(true)
})
</script>

<style scoped>
.live2d-canvas {
  width: 100%;
  height: 100%;
}
</style>
```

---

## 四、版本兼容性矩阵

| Cubism Core | 支持 MOC3 version | 来源 |
|-------------|------------------|------|
| `live2dcubismcore@1.0.2` (npm) | ≤ 4 | `npm install live2dcubismcore` |
| Cubism 4 SDK Core | ≤ 4 | 官网 Cubism 4 SDK |
| **Cubism 5 SDK Core (5.0.0+)** | **≤ 5（推荐）** | 官网 Cubism 5 SDK 或参考项目 |

**结论：新项目一律使用 Cubism 5.0.0+ Core，可以兼容 MOC3 version 4 和 5 的模型。**

---

## 五、常见问题速查

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `csmReviveMocInPlace is failed... moc3 ver:[5]` | Core 版本太旧，不支持 MOC3 version 5 | 换 Cubism 5 Core |
| `Cannot read properties of undefined (reading '0')` | Cubism 5 Core 的 renderOrders 改名 | 换 Cubism 4 Core 或加别名 |
| `Could not find Cubism 2 runtime` | 用了 `pixi-live2d-display` 主入口 | 改用 `/cubism4` 子路径 |
| `Cannot read properties of undefined (reading 'add')` | Ticker 未注册 | `Live2DModel.registerTicker(PIXI.Ticker)` |
| Canvas 全黑但无报错 | 1) Ticker 未注册 2) 浏览器无 WebGL | 检查 Ticker + 用真实浏览器验证 |
| `ticker.count is not a function` | Ticker 注册方式不对 | 传入 `PIXI.Ticker` 类而非实例 |

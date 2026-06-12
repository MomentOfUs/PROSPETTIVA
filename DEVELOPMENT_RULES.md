# YIBO_WORKSPACE — 终端风 UI 开发规范 & 禁止手册

> **CLI-Inspired Neo-Brutalism** · 命令行风格新粗野主义
> 形式绝对服从于高密度的数据展示和工具操作。

---

## 一、✅ 核心开发规范

### 1. 色彩系统 — 单一数据源

色彩定义 **仅允许** 在 `src/style.css` 的 `@theme` 块中声明。禁止在组件 template 中硬编码任何十六进制色值。

**合法 Tailwind 语义类映射表：**

| CSS 变量 | Tailwind 类 | 色值 | 用途 |
|---|---|---|---|
| `--color-bg-base` | `bg-base` | `#000000` | 网页背景、输入框背景 |
| `--color-bg-surface` | `bg-surface` | `#0A0A0A` | 卡片面板底色 |
| `--color-border` | `border-line` | `#262626` | 全站唯一合法边框色 |
| `--color-text-primary` | `text-primary` | `#FFFFFF` | 纯白强调文本 |
| `--color-text-secondary` | `text-secondary` | `#999999` | 通用正文（≈ text-neutral-400） |
| `--color-text-dim` | `text-dim` | `#555555` | 次要信息（≈ text-neutral-500） |
| `--color-accent` | `text-accent` / `bg-accent` / `border-accent` | `#FF5F1F` | ❯ 游标、闪烁光标、STATUS: ACTIVE |
| `--color-bg-input` | `bg-input` | `#000000` | 输入框底色 |
| `--color-btn-base` | `bg-btn-base` | `#111111` | 按钮底色 |

**禁用类引用白名单**（仅在不支持 CSS 变量的场景使用）：

| 使用 | 色值 |
|---|---|
| `text-neutral-300` | `#D4D4D4`（代替 `text-main`） |
| `text-neutral-400` | `#A3A3A3` |
| `text-neutral-500` | `#737373`（代替 `text-muted`） |
| `text-neutral-600` | `#525252` |
| `neutral-700` | `#404040` |
| `neutral-800` | `#262626`（与 `border-line` 同色，可用于 bento 父容器底色） |

### 2. 布局结构

**Bento Box 1px 网格（强制）：**

```html
<!-- ✅ 正确：父容器用 bg-neutral-800 + gap-[1px] 自然挤出边框 -->
<div class="grid grid-cols-4 bg-neutral-800 gap-[1px]">
  <div class="bg-surface">...卡片内容...</div>
  <div class="bg-surface">...卡片内容...</div>
</div>
```

- 子卡片**禁止**使用 `border` 属性（边框由 gap 透出的父容器底色自然形成）
- 禁止使用 `gap-4`、`gap-2` 等大于 `gap-[1px]` 的间距值作为网格边框
- `p-4` 等内边距仍然可用

**零圆角：**
- 标准区块：`rounded-none`（默认已全局设置）
- 仅极小元素（≤ 24px）：可允许 `rounded-sm`（2px）用于物理抗锯齿
- 禁止使用 `rounded-md`、`rounded-lg`、`rounded-xl`、`rounded-full`

**零阴影：**
- 禁止使用所有 `shadow-*` / `drop-shadow-*` 类
- 层级关系全部由实线边框 `border-line` 解决

### 3. 字体排印

```css
/* 全局已自动注入 */
font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace !important;
font-variant-numeric: tabular-nums;
```

- 所有结构化的英文标签（标题、分类、按钮）**强制 ALL CAPS**
- 中文名称必须以 `[ ]` 包裹：`<span class="text-dim">[</span> 中文名 <span class="text-dim">]</span>`
- 禁止使用非等宽字体，禁止覆盖 `font-family`
- `tracking-widest` 用于标题，`tracking-wide` 用于正文

### 4. 交互与动效

**底色反转（Inverted Hover）—— 按钮、链接的唯一合法 hover 模式：**

| 状态 | 背景 | 文字 | 边框 |
|---|---|---|---|
| Normal | `bg-base` 或 `bg-surface` | `text-secondary` 或 `text-dim` | `border-line` |
| Hover | `bg-neutral-200` | `text-black` | `border-neutral-200` |
| Active | `active:translate-y-[1px]` | — | — |

```html
<!-- ✅ 标准按钮 hover 模板 -->
<button class="border border-line bg-base text-secondary
               hover:bg-neutral-200 hover:text-black hover:border-neutral-200
               active:translate-y-[1px] transition-none">
```

> **禁止**在普通按钮 hover 上使用 `bg-accent` / `text-accent`。accent 色仅限以下场景使用：
> - ❯ 命令行提示符
> - 闪烁光标 `.cursor-blink-accent`
> - `STATUS: ACTIVE` / `STATUS: WARN` 标记
> - 错误、告警信息

**其他动效规则：**
- `transition-none` —— 所有状态切换必须瞬时完成，禁止使用 ease 过渡
- `animate-[pulse_1s_steps(2,start)_infinite]` —— 仅用于等待/编译状态指示器
- `.glitch-on-click` —— 仅用于按钮点击反馈（已全局注册）
- `opacity-0` → `opacity-100` 切换 —— 必须配合 `group-hover` 使用 `transition-none`

### 5. 机器语态 — Machine Voice Lexicon

所有面向用户的文本必须使用以下映射表，**禁止**使用自然语言。

| 场景 | 规范输出 |
|---|---|
| 搜索提示 | `❯ Awaiting_query...` 或 `[ EXEC_SEARCH ]` |
| 新增创建 | `[ + MOUNT ]` |
| 编辑 | `[ EDIT ]` |
| 删除 | `[ DESTROY ]` |
| 复制 | `[ COPY_PAYLOAD ]` |
| 保存/提交 | `[ COMMIT ]` |
| 取消/放弃 | `[ ABORT ]` |
| 设置面板 | `SYS_CONFIG` |
| 登录 | `AUTH_LOGIN` |
| 退出 | `AUTH_LOGOUT` |
| 空状态 | `// EMPTY //` 或 `// NO_DATA //` |
| 加载中 | `[ LOADING... ]` |
| 错误 | `[ERROR] <code>: <message>` |
| 成功 | `[OK] <message>` |
| 外部链接 | `[ <name> ] EXT_NET` |
| AI/API 平台 | `<NAME>_NODE` 或 `<NAME>_TOKEN_USAGE` |
| 提示词库 | `> TARGET_STYLE: <name>` |
| 进度系统 | `<NAME>_DIMENSION_TRACKER` |

### 6. 标准组件模板

**卡片/面板模板：**

```html
<div class="border border-line bg-surface p-4 flex flex-col">
  <div class="text-xs text-dim uppercase border-b border-line pb-2 mb-4 flex justify-between items-center">
    <span>[ MODULE_NAME ]</span>
    <span class="text-accent">STATUS: ACTIVE</span>
  </div>
  <div class="flex-grow font-mono text-sm">
    <!-- 内容 -->
  </div>
</div>
```

**列表项交互模板（链接/快捷方式）：**

```html
<a href="#" class="group flex items-center justify-between py-1.5 px-2
                  cursor-pointer transition-none
                  hover:bg-neutral-200 hover:text-black">
  <span class="flex items-center gap-1.5">
    <span class="text-transparent group-hover:text-accent mr-1">❯</span>
    <span class="text-dim group-hover:text-black">[</span>
    <span class="font-bold text-secondary group-hover:text-black">名称</span>
    <span class="text-dim group-hover:text-black">]</span>
  </span>
  <span class="text-[10px] text-dim group-hover:text-black">TAG</span>
</a>
```

---

## 二、🚫 绝对禁止清单

### 色彩

| # | 禁止行为 | 原因 | 替代方案 |
|---|---|---|---|
| 1 | 在 `*.vue` template 中写 `#000000`、`#FF5F1F` 等十六进制色值 | 破坏单点维护原则 | 使用 `bg-base`、`text-accent` 等语义类 |
| 2 | 在新位置使用 `#FFB000`、`#FF5722`、`#FF9800` 等近似橙 | accent 色唯一为 `#FF5F1F` | `#FF5F1F` |
| 3 | 使用 `gray-*`、`neutral-*` 以外的色系（如 red-500、green-500） | 破坏单色系 + 单 accent 原则 | 用 `accent` / `neutral-*` 组合 |
| 4 | 在 `style.css` 的 `@theme` 之外定义颜色变量 | 颜色定义必须集中管理 | 编辑 `@theme` 块 |

### 布局

| # | 禁止行为 | 原因 | 替代方案 |
|---|---|---|---|
| 5 | 在 bento grid 场景下给子卡片加 `border` | 边框由父容器 gap 产生 | 切到 `bg-neutral-800 gap-[1px]` 模式 |
| 6 | `gap-4`、`gap-2` 用于 bento 卡片间距 | 破坏 1px 线框 | `gap-[1px]` |
| 7 | `rounded-md`、`rounded-lg`、`rounded-xl`、`rounded-full` | 非零圆角 | `rounded-none`（或极小元素 `rounded-sm`） |
| 8 | `shadow-*`、`drop-shadow-*` | 禁止光影 | 实线边框 |
| 9 | 在父容器上使用 `bg-white` 或除黑/灰外的颜色作为底层 | 破坏黑暗终端基调 | `bg-base` 或 `bg-surface` 或 `bg-neutral-800` |

### 交互

| # | 禁止行为 | 原因 | 替代方案 |
|---|---|---|---|
| 10 | hover 使用 `bg-accent`（除非是 "激活态" 而非 "悬停态"） | 破坏反转规矩 | `hover:bg-neutral-200 hover:text-black` |
| 11 | 使用 CSS `transition` / `transition-all` 或 `duration-*` | 破坏瞬时反馈 | `transition-none` |
| 12 | 使用 `ease-in`、`ease-out` 等缓动函数 | 禁止平滑过渡 | `steps()` 函数或 `transition-none` |
| 13 | 在普通文本上使用 `text-accent` 做强调 | accent 仅用于特定终端反馈 | 用 `text-primary`（白）或 `text-secondary` |

### 文本 & 内容

| # | 禁止行为 | 原因 | 替代方案 |
|---|---|---|---|
| 14 | 使用自然语言（"请输入内容"、"保存成功"、"操作失败"） | 破坏机器语态 | 见 Machine Voice 映射表 |
| 15 | 中文标题不使用 `[ ]` 包裹 | 破坏混合排版规范 | `<span class="text-dim">[</span> 名称 <span class="text-dim">]</span>` |
| 16 | 覆盖全局 font-family | 必须保持等宽字体 | 直接使用现有类 |
| 17 | 使用 `font-sans`、`font-serif` | 非等宽 | `font-mono` |

### 架构

| # | 禁止行为 | 原因 | 替代方案 |
|---|---|---|---|
| 18 | 创建新的 `tailwind.config.*` 配置文件 | Tailwind v4 仅认 `style.css @theme` | 编辑 `src/style.css` |
| 19 | 在 `@theme` 中定义的颜色不在 Tailwind 类中使用而硬编码引用 | 维护负担 | 始终通过 `bg-*`/`text-*`/`border-*` 使用 |
| 20 | 新组件使用图片作为背景 | 破坏纯 CSS 线框风格 | CSS 边框 + 纯色背景 |

---

## 三、🔧 架构决策记录

### Tailwind 版本策略

- **版本**：Tailwind CSS v4（当前已锁定）
- **插件**：`@tailwindcss/vite`（`vite.config.ts`）
- **配置文件**：**无** `tailwind.config.*`，所有主题变量在 `src/style.css` 的 `@theme` 块中定义
- **传入方式**：`@import "tailwindcss"` 在 `style.css` 中

### 组件架构

- 所有公共 UI 基元（按钮、卡片、模态框）放在 `src/components/` 目录
- 所有 Widget 组件放在 `src/components/widgets/`，通过 `WidgetRegistry.ts` 注册
- Widget 必须导出一个默认组件，并接受 `compact`、`preview` 两个 props
- 禁止 Widget 直接操作 localStorage（应通过 composable 或事件机制）

### Git 提交约定

- 前缀：`feat:` / `fix:` / `style:` / `refactor:` / `docs:` / `chore:`
- 提交信息使用英文

---

> 最后更新：2026-06-12
> 基于 YIBO_WORKSPACE UI 开发全局规范 v1.0 审计生成

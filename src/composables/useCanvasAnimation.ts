/**
 * useCanvasAnimation — 赛博机械星盘 (Cyber-Astrolabe) 动态全息背景 Composable
 * 负责：同心机械环自转、45°/90° 折弯 PCB 走线生成、流动电荷粒子系统、坠落二进制数据雨、方形像素级数码星尘、色值与系统 CSS Accent 强调色同步
 */
import { ref, onUnmounted } from 'vue'

interface PathPoint {
  x: number
  y: number
}

interface CircuitTrace {
  points: PathPoint[]
  lengths: number[] // segment lengths
  totalLength: number
  terminalType: 'dot' | 'square' | 'none'
}

interface Electron {
  traceIndex: number
  progress: number
  speed: number
  size: number
  history: PathPoint[]
}

interface BinaryColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  opacity: number
}

interface Stardust {
  x: number
  y: number
  size: number
  pulseSpeed: number
  pulsePhase: number
  maxAlpha: number
}

// 十六进制颜色转 RGB 字符辅助函数
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `${r}, ${g}, ${b}`
  }
  return '255, 95, 31' // 默认活力橙
}

export function useCanvasAnimation(bgCanvas: { value: HTMLCanvasElement | null }) {
  const paperBgUrl = ref('')
  let animationFrameId: number | null = null

  // 动画状态定义
  const traces: CircuitTrace[] = []
  const electrons: Electron[] = []
  const binaryColumns: BinaryColumn[] = []
  const stardusts: Stardust[] = []

  // 星盘圆环自转相位
  let rotRing1 = 0
  let rotRing2 = 0
  let rotRing3 = 0
  let rotRing4 = 0

  const TARGET_FPS = 30
  const FRAME_INTERVAL = 1000 / TARGET_FPS
  let lastFrameTime = 0

  // 距离计算
  function dist(p1: PathPoint, p2: PathPoint): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
  }

  // 计算电子在折线路径上的即时坐标
  function getElectronCoord(trace: CircuitTrace, progress: number): PathPoint {
    let acc = 0
    for (let i = 0; i < trace.points.length - 1; i++) {
      const p1 = trace.points[i]
      const p2 = trace.points[i + 1]
      const segmentL = trace.lengths[i]
      if (progress <= acc + segmentL) {
        const t = (progress - acc) / segmentL
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        }
      }
      acc += segmentL
    }
    const last = trace.points[trace.points.length - 1]
    return { x: last.x, y: last.y }
  }

  // 初始化所有背景元素
  function initElements(width: number, height: number) {
    const cx = width / 2
    const cy = height / 2

    // 1. 生成 PCB 风格 45°/90° 拐弯电路走线 (源自中心星盘外侧)
    traces.length = 0
    const traceCount = 12
    for (let i = 0; i < traceCount; i++) {
      const angle = (i * (360 / traceCount) + Math.random() * 8) * Math.PI / 180

      // 起始点定在最外层圆环外 (R = 180)
      const r1 = 180
      const p1 = { x: Math.cos(angle) * r1, y: Math.sin(angle) * r1 }

      // 阶段一：平直引出
      const r2 = r1 + 35 + Math.random() * 30
      const p2 = { x: Math.cos(angle) * r2, y: Math.sin(angle) * r2 }

      // 阶段二：45度折弯
      const bendDir = Math.random() > 0.5 ? 1 : -1
      const p3Angle = angle + bendDir * Math.PI / 4
      const d2 = 50 + Math.random() * 50
      const p3 = { x: p2.x + Math.cos(p3Angle) * d2, y: p2.y + Math.sin(p3Angle) * d2 }

      // 阶段三：水平/垂直延伸至主板边缘
      const runDir = Math.random() > 0.5 ? 0 : Math.PI / 2
      const finalAngle = Math.random() > 0.5 ? runDir : runDir + Math.PI
      const d3 = 80 + Math.random() * 120
      const p4 = { x: p3.x + Math.cos(finalAngle) * d3, y: p3.y + Math.sin(finalAngle) * d3 }

      // 计算各段长度及总长
      const points = [p1, p2, p3, p4]
      const lengths: number[] = []
      let totalLength = 0
      for (let j = 0; j < points.length - 1; j++) {
        const segL = dist(points[j], points[j + 1])
        lengths.push(segL)
        totalLength += segL
      }

      traces.push({
        points,
        lengths,
        totalLength,
        terminalType: Math.random() > 0.4 ? (Math.random() > 0.5 ? 'dot' : 'square') : 'none'
      })
    }

    // 2. 生成流动的电荷粒子 (Electrons)
    electrons.length = 0
    const electronCount = 14
    for (let i = 0; i < electronCount; i++) {
      electrons.push({
        traceIndex: Math.floor(Math.random() * traces.length),
        progress: Math.random() * 120, // 随机初始化进度位置
        speed: 1.2 + Math.random() * 1.8,
        size: 1.2 + Math.random() * 1.5,
        history: []
      })
    }

    // 3. 生成方形像素数码星尘 (Pixel Stardust)
    stardusts.length = 0
    const starCount = 110
    for (let i = 0; i < starCount; i++) {
      stardusts.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() > 0.85 ? (Math.random() > 0.9 ? 3.5 : 2.2) : 1.2, // 不同尺寸的数码像素星
        pulseSpeed: 0.0012 + Math.random() * 0.0025,
        pulsePhase: Math.random() * Math.PI * 2,
        maxAlpha: 0.2 + Math.random() * 0.4 // 提高亮度
      })
    }

    // 4. 生成屏幕两侧的降雨二进制流 (0 / 1 Code rain)
    binaryColumns.length = 0
    const columnCount = 18
    const stepX = width / (columnCount + 1)
    for (let i = 0; i < columnCount; i++) {
      const relX = stepX * (i + 1)
      const offsetFromCenter = Math.abs(relX - cx)
      // 避免与核心的 220px 机械星盘区域发生遮挡冲突，保持阅读性
      if (offsetFromCenter < 220) continue

      binaryColumns.push({
        x: relX,
        y: Math.random() * height,
        speed: 0.8 + Math.random() * 1.5,
        chars: Array.from({ length: 7 + Math.floor(Math.random() * 8) }, () => Math.random() > 0.5 ? '1' : '0'),
        opacity: 0.05 + Math.random() * 0.08 // 增加可见度
      })
    }
  }

  function initCanvas() {
    try {
      // 科技感背景废除纸张材质生成，改由纯透明或 Canvas 自绘纯黑背景底板
      paperBgUrl.value = ''

      const canvas = bgCanvas.value
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let width = (canvas.width = window.innerWidth)
      let height = (canvas.height = window.innerHeight)

      initElements(width, height)

      const handleResize = () => {
        if (canvas) {
          width = canvas.width = window.innerWidth
          height = canvas.height = window.innerHeight
          initElements(width, height)
        }
      }
      window.addEventListener('resize', handleResize)

      // 渲染主循环
      function draw(timestamp: number) {
        if (timestamp - lastFrameTime < FRAME_INTERVAL) {
          animationFrameId = requestAnimationFrame(draw)
          return
        }
        lastFrameTime = timestamp

        if (!canvas || !ctx) return

        // 绘制深黑黑客色基座背景
        ctx.fillStyle = '#020202'
        ctx.fillRect(0, 0, width, height)

        // 动态抓取 CSS 强调色变量
        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#FF5F1F'
        const accentRgb = hexToRgb(accentHex)

        const cx = width / 2
        const cy = height / 2

        // 1. 渲染数码方形像素星尘
        for (let i = 0; i < stardusts.length; i++) {
          const s = stardusts[i]
          const pulse = 0.2 + 0.8 * Math.sin(timestamp * s.pulseSpeed + s.pulsePhase)
          const a = s.maxAlpha * pulse

          ctx.fillStyle = `rgba(${accentRgb}, ${a})`
          ctx.fillRect(s.x * width, s.y * height, s.size, s.size)

          // 较大星尘绘制微弱的十字星芒发光，增强画面层次和艺术感
          if (s.size > 2.0) {
            ctx.fillStyle = `rgba(${accentRgb}, ${a * 0.45})`
            ctx.fillRect(s.x * width - 4, s.y * height + s.size / 2 - 0.5, 8 + s.size, 1)
            ctx.fillRect(s.x * width + s.size / 2 - 0.5, s.y * height - 4, 1, 8 + s.size)
          }
        }

        // 2. 渲染渐隐下落二进制数据流 (增加头部流星高亮，提升明亮度)
        ctx.textAlign = 'center'
        for (let i = 0; i < binaryColumns.length; i++) {
          const col = binaryColumns[i]
          col.y += col.speed
          if (col.y > height + 150) {
            col.y = -100
            col.speed = 0.8 + Math.random() * 1.5
          }

          for (let j = 0; j < col.chars.length; j++) {
            const charY = col.y - j * 13
            if (charY < 0 || charY > height) continue
            // 头部（j=0）特别高亮，后面逐渐渐隐
            const baseAlpha = col.opacity * (1.0 - j / col.chars.length)
            if (j === 0) {
              ctx.fillStyle = `rgba(255, 255, 255, ${col.opacity * 7.5})`
              ctx.font = 'bold 10px monospace'
            } else {
              ctx.fillStyle = `rgba(${accentRgb}, ${baseAlpha})`
              ctx.font = '9px monospace'
            }
            ctx.fillText(col.chars[j], col.x, charY)
          }

          // 概率随机微变数值
          if (Math.random() < 0.06) {
            const idx = Math.floor(Math.random() * col.chars.length)
            col.chars[idx] = Math.random() > 0.5 ? '1' : '0'
          }
        }

        // 3. 渲染 PCB 风格铜箔走线 (增强可见度并增加局部双排总线效果)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.save()
        ctx.translate(cx, cy) // 原点对齐屏幕正中

        for (let i = 0; i < traces.length; i++) {
          const t = traces[i]
          ctx.beginPath()
          ctx.moveTo(t.points[0].x, t.points[0].y)
          for (let j = 1; j < t.points.length; j++) {
            ctx.lineTo(t.points[j].x, t.points[j].y)
          }
          ctx.strokeStyle = `rgba(${accentRgb}, 0.22)`
          ctx.lineWidth = 0.9
          ctx.stroke()

          // 局部双排引线
          if (i % 4 === 0) {
            ctx.beginPath()
            ctx.moveTo(t.points[0].x + 3, t.points[0].y + 3)
            for (let j = 1; j < t.points.length; j++) {
              ctx.lineTo(t.points[j].x + 3, t.points[j].y + 3)
            }
            ctx.strokeStyle = `rgba(${accentRgb}, 0.1)`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }

          // 绘制走线末梢芯片焊盘
          const end = t.points[t.points.length - 1]
          if (t.terminalType === 'dot') {
            ctx.fillStyle = `rgba(${accentRgb}, 0.32)`
            ctx.beginPath()
            ctx.arc(end.x, end.y, 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.lineWidth = 0.6
            ctx.strokeStyle = `rgba(${accentRgb}, 0.55)`
            ctx.stroke()
          } else if (t.terminalType === 'square') {
            ctx.fillStyle = `rgba(${accentRgb}, 0.32)`
            ctx.fillRect(end.x - 2, end.y - 2, 4, 4)
            ctx.lineWidth = 0.6
            ctx.strokeStyle = `rgba(${accentRgb}, 0.55)`
            ctx.strokeRect(end.x - 2, end.y - 2, 4, 4)
          }
        }

        // 4. 更新与渲染流动电荷能量点 (Electrons) - 增加拖尾发光效果 (Comet Trail)
        for (let i = 0; i < electrons.length; i++) {
          const el = electrons[i]
          const trace = traces[el.traceIndex]

          el.progress += el.speed
          if (el.progress >= trace.totalLength) {
            el.progress = 0
            el.traceIndex = Math.floor(Math.random() * traces.length)
            el.speed = 1.2 + Math.random() * 1.8
            el.history = [] // 重新开始时清空历史
          }

          const coord = getElectronCoord(trace, el.progress)
          
          // 记录足迹以绘制拖尾
          el.history.push({ ...coord })
          if (el.history.length > 7) {
            el.history.shift()
          }

          // 绘制能量拖尾线
          if (el.history.length > 1) {
            ctx.beginPath()
            ctx.moveTo(el.history[0].x, el.history[0].y)
            for (let h = 1; h < el.history.length; h++) {
              ctx.lineTo(el.history[h].x, el.history[h].y)
            }
            ctx.strokeStyle = `rgba(${accentRgb}, 0.45)`
            ctx.lineWidth = el.size * 1.4
            ctx.stroke()
          }

          // 核心发光亮色
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(coord.x, coord.y, el.size, 0, Math.PI * 2)
          ctx.fill()

          // 外围霓虹光晕 (调亮)
          ctx.fillStyle = `rgba(${accentRgb}, 0.75)`
          ctx.beginPath()
          ctx.arc(coord.x, coord.y, el.size * 3.6, 0, Math.PI * 2)
          ctx.fill()
        }

        // 5. 绘制赛博同心机械全息星盘 (增加雷达扫掠线、卫星节点等科技艺术要素)
        // 自转角度角速度递增
        rotRing1 += 0.00035
        rotRing2 -= 0.00055
        rotRing3 += 0.00085
        rotRing4 -= 0.0013

        // A. 刻度分度齿轮环 1 (R = 180) - 增强亮度
        ctx.save()
        ctx.rotate(rotRing1)
        ctx.lineWidth = 1.2
        ctx.strokeStyle = `rgba(${accentRgb}, 0.35)`
        ctx.setLineDash([20, 10, 4, 10])
        ctx.beginPath()
        ctx.arc(0, 0, 180, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // B. 罗盘分度物理线环 2 (R = 150)
        ctx.save()
        ctx.rotate(rotRing2)
        ctx.lineWidth = 0.8
        ctx.strokeStyle = `rgba(${accentRgb}, 0.38)`

        const tickCount = 72
        for (let j = 0; j < tickCount; j++) {
          const a = (j * (360 / tickCount)) * Math.PI / 180
          const tickL = j % 6 === 0 ? 8 : 4
          const innerR = 150 - tickL
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * 150, Math.sin(a) * 150)
          ctx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR)
          ctx.stroke()
        }

        // 绘制极小数字量规
        ctx.fillStyle = `rgba(${accentRgb}, 0.55)`
        ctx.font = '8px monospace'
        ctx.fillText('000°', 0, -135)
        ctx.fillText('090°', 135, 3)
        ctx.fillText('180°', 0, 142)
        ctx.fillText('270°', -135, 3)
        ctx.restore()

        // F. 雷达扫掠线与余晖 (Radar Sweep)
        ctx.save()
        ctx.rotate(rotRing2 * 1.3)
        ctx.strokeStyle = `rgba(${accentRgb}, 0.38)`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(0) * 180, Math.sin(0) * 180)
        ctx.stroke()
        
        // 余晖尾巴 (Fading sweeps)
        const tailCount = 18
        for (let j = 1; j <= tailCount; j++) {
          const tailAngle = -j * (1.2 * Math.PI / 180)
          ctx.strokeStyle = `rgba(${accentRgb}, ${0.35 * (1 - j / tailCount)})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(tailAngle) * 180, Math.sin(tailAngle) * 180)
          ctx.stroke()
        }
        ctx.restore()

        // C. 全息二进制铜轨环 3 (R = 120)
        ctx.save()
        ctx.rotate(rotRing3)
        ctx.fillStyle = `rgba(${accentRgb}, 0.45)`
        ctx.font = '7px monospace'
        const binCount = 42
        for (let j = 0; j < binCount; j++) {
          const a = (j * (360 / binCount)) * Math.PI / 180
          const x = Math.cos(a) * 120
          const y = Math.sin(a) * 120
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(a + Math.PI / 2)
          ctx.fillText(j % 3 === 0 ? '1' : '0', 0, 0)
          ctx.restore()
        }
        ctx.restore()

        // D. 虚线重合避震环 4 (R = 85)
        ctx.save()
        ctx.rotate(rotRing4)
        ctx.lineWidth = 0.9
        ctx.strokeStyle = `rgba(${accentRgb}, 0.24)`
        ctx.setLineDash([40, 20])
        ctx.beginPath()
        ctx.arc(0, 0, 85, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([10, 5])
        ctx.beginPath()
        ctx.arc(0, 0, 80, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // E. 核心六角芯片中央星体 (R = 36) - 增强发光
        ctx.save()
        ctx.rotate(rotRing1 * 2.2)
        ctx.lineWidth = 1.2
        ctx.strokeStyle = `rgba(${accentRgb}, 0.48)`
        ctx.fillStyle = `rgba(${accentRgb}, 0.08)`

        ctx.beginPath()
        const hexSide = 36
        for (let j = 0; j < 6; j++) {
          const a = (j * 60) * Math.PI / 180
          const x = Math.cos(a) * hexSide
          const y = Math.sin(a) * hexSide
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // 内部晶片圆形区
        ctx.fillStyle = `rgba(${accentRgb}, 0.16)`
        ctx.beginPath()
        ctx.arc(0, 0, 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // 芯片内部逆向旋转的精细三角线路，增加视觉密集度
        ctx.save()
        ctx.rotate(rotRing3 * 1.8)
        ctx.strokeStyle = `rgba(${accentRgb}, 0.5)`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        for (let j = 0; j < 3; j++) {
          const a = (j * 120) * Math.PI / 180
          const x = Math.cos(a) * 10
          const y = Math.sin(a) * 10
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.restore()

        // 中心光源核心呼吸发光
        const pulseCore = 0.5 + 0.5 * Math.sin(timestamp * 0.005)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.45 * pulseCore})`
        ctx.beginPath()
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // G. 绘制绕轨道旋转的外围全息卫星节点
        const satConfig = [
          { angle: rotRing1 * 1.8, r: 180, size: 4.5, shape: 'square' },
          { angle: rotRing2 * -1.2, r: 150, size: 3.5, shape: 'dot' },
          { angle: rotRing3 * 2.2, r: 120, size: 3, shape: 'diamond' },
          { angle: rotRing4 * -2.0, r: 85, size: 3, shape: 'square' }
        ]
        
        for (let k = 0; k < satConfig.length; k++) {
          const conf = satConfig[k]
          const satX = Math.cos(conf.angle) * conf.r
          const satY = Math.sin(conf.angle) * conf.r

          // 连接线 (从卫星到中心)
          ctx.strokeStyle = `rgba(${accentRgb}, 0.09)`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(satX, satY)
          ctx.stroke()

          // 核心光圈
          ctx.fillStyle = `rgba(${accentRgb}, 0.4)`
          ctx.beginPath()
          ctx.arc(satX, satY, conf.size * 1.8, 0, Math.PI * 2)
          ctx.fill()

          // 卫星形态
          ctx.fillStyle = '#FFFFFF'
          if (conf.shape === 'square') {
            ctx.fillRect(satX - conf.size/2, satY - conf.size/2, conf.size, conf.size)
            ctx.strokeStyle = `rgba(${accentRgb}, 0.8)`
            ctx.lineWidth = 0.8
            ctx.strokeRect(satX - conf.size/2, satY - conf.size/2, conf.size, conf.size)
          } else if (conf.shape === 'diamond') {
            ctx.save()
            ctx.translate(satX, satY)
            ctx.rotate(Math.PI / 4)
            ctx.fillRect(-conf.size/2, -conf.size/2, conf.size, conf.size)
            ctx.strokeStyle = `rgba(${accentRgb}, 0.8)`
            ctx.lineWidth = 0.8
            ctx.strokeRect(-conf.size/2, -conf.size/2, conf.size, conf.size)
            ctx.restore()
          } else {
            ctx.beginPath()
            ctx.arc(satX, satY, conf.size/2 + 0.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = `rgba(${accentRgb}, 0.8)`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.arc(satX, satY, conf.size/2 + 0.5, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        ctx.restore() // 还原中央坐标系 (还原 Save #1)

        animationFrameId = requestAnimationFrame(draw)
      }

      animationFrameId = requestAnimationFrame(draw)

      onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
      })
    } catch (err) {
      console.warn('Canvas 赛博占星背景初始化失败，降级为纯背景模式：', err)
    }
  }

  function destroyCanvas() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  return {
    paperBgUrl,
    initCanvas,
    destroyCanvas
  }
}

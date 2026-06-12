/**
 * useCanvasAnimation — Canvas 占星术金银墨动画 Composable
 * 负责：纸张纹理生成、神秘占星图案绘制（星盘、日月、星座、几何矩阵）、自转与星点呼吸动画、动态流星划过、多样化闪烁繁星背景、30fps 节流帧率
 */
import { ref, onUnmounted } from 'vue'

interface PathPoint {
  x: number
  y: number
}

interface BezierPath {
  p0: PathPoint
  p1: PathPoint
  p2: PathPoint
  p3: PathPoint
}

interface ActiveSketch {
  id: string
  cx: number
  cy: number
  scale: number
  paths: BezierPath[]
  progress: number
  drawSpeed: number
  alpha: number
  maxAlpha: number
  state: 'drawing' | 'completed'
  age: number
  lineWidth: number
  // 占星动效属性
  type: 'astrolabe' | 'sunMoon' | 'constellation' | 'mysticGeometry'
  rotation: number      // 当前旋转弧度
  rotSpeed: number      // 自转角速度
  starNodes: PathPoint[] // 需要绘制发光星点的相对坐标
  pulsePhase: number    // 星点呼吸动画的基础相位
}

interface Stardust {
  x: number
  y: number
  size: number
  pulseSpeed: number
  pulsePhase: number
  maxAlpha: number
  style: 'dot' | 'cross' | 'sparkle' // 不同的星星样式
  color: string // 偏色：暖金、银蓝、紫白
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  width: number
  alpha: number
  life: number
  maxLife: number
}

// ── 几何生成辅助函数 ──

function makeLine(x1: number, y1: number, x2: number, y2: number): BezierPath {
  return {
    p0: { x: x1, y: y1 },
    p1: { x: x1, y: y1 },
    p2: { x: x2, y: y2 },
    p3: { x: x2, y: y2 }
  }
}

function makeCircle(R: number): BezierPath[] {
  const k = 0.5522847
  const rk = R * k
  return [
    { p0: { x: R, y: 0 }, p1: { x: R, y: rk }, p2: { x: rk, y: R }, p3: { x: 0, y: R } },
    { p0: { x: 0, y: R }, p1: { x: -rk, y: R }, p2: { x: -R, y: rk }, p3: { x: -R, y: 0 } },
    { p0: { x: -R, y: 0 }, p1: { x: -R, y: -rk }, p2: { x: -rk, y: -R }, p3: { x: 0, y: -R } },
    { p0: { x: 0, y: -R }, p1: { x: rk, y: -R }, p2: { x: R, y: -rk }, p3: { x: R, y: 0 } }
  ]
}

function generatePaperTexture(): string {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 古雅金墨纸张基色：暗褐色调
  ctx.fillStyle = '#14100e'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 5
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // 微弱金丝线
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.01)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30
    )
    ctx.stroke()
  }

  // 极细暗纹线
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.025)'
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15,
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20
    )
    ctx.stroke()
  }

  return canvas.toDataURL()
}

function spawnSketch(width: number, height: number): ActiveSketch {
  const types: ('astrolabe' | 'sunMoon' | 'constellation' | 'mysticGeometry')[] = [
    'astrolabe', 'sunMoon', 'constellation', 'mysticGeometry'
  ]
  const type = types[Math.floor(Math.random() * types.length)]

  const blueprintPaths: BezierPath[] = []
  let starNodes: PathPoint[] = []

  if (type === 'astrolabe') {
    // 组装星盘 / 占星仪
    blueprintPaths.push(...makeCircle(70))
    blueprintPaths.push(...makeCircle(65))
    blueprintPaths.push(makeLine(-75, 0, 75, 0))
    blueprintPaths.push(makeLine(0, -75, 0, 75))
    blueprintPaths.push(...makeCircle(42))
    blueprintPaths.push(makeLine(-45, -45, 45, 45))
    blueprintPaths.push(makeLine(-45, 45, 45, -45))
    
    // 内置六角星 (交错双三角形)
    // 向上三角形
    blueprintPaths.push(makeLine(0, -32, 27.71, 16))
    blueprintPaths.push(makeLine(27.71, 16, -27.71, 16))
    blueprintPaths.push(makeLine(-27.71, 16, 0, -32))
    // 向下三角形
    blueprintPaths.push(makeLine(0, 32, 27.71, -16))
    blueprintPaths.push(makeLine(27.71, -16, -27.71, -16))
    blueprintPaths.push(makeLine(-27.71, -16, 0, 32))

    blueprintPaths.push(...makeCircle(16))

    starNodes = [
      { x: 0, y: 0 },
      { x: 0, y: -32 },
      { x: 27.71, y: 16 },
      { x: -27.71, y: 16 },
      { x: 0, y: 32 },
      { x: 27.71, y: -16 },
      { x: -27.71, y: -16 }
    ]
  } else if (type === 'sunMoon') {
    // 组装日月同辉
    // 新月外圆弧 (R=45 的左半圆，两个1/4圆弧拼接)
    blueprintPaths.push({
      p0: { x: 0, y: 45 },
      p1: { x: -24.85, y: 45 },
      p2: { x: -45, y: 24.85 },
      p3: { x: -45, y: 0 }
    })
    blueprintPaths.push({
      p0: { x: -45, y: 0 },
      p1: { x: -45, y: -24.85 },
      p2: { x: -24.85, y: -45 },
      p3: { x: 0, y: -45 }
    })
    // 新月内凹弧线 (0,-45) -> (0,45)
    blueprintPaths.push({
      p0: { x: 0, y: -45 },
      p1: { x: -14, y: -20 },
      p2: { x: -14, y: 20 },
      p3: { x: 0, y: 45 }
    })

    // 太阳 (中心在 16, 0，半径 18)
    const cx = 16, cy = 0, R = 18
    const k = 0.5522847
    const rk = R * k
    blueprintPaths.push({ p0: { x: cx + R, y: cy }, p1: { x: cx + R, y: cy + rk }, p2: { x: cx + rk, y: cy + R }, p3: { x: cx, y: cy + R } })
    blueprintPaths.push({ p0: { x: cx, y: cy + R }, p1: { x: cx - rk, y: cy + R }, p2: { x: cx - R, y: cy + rk }, p3: { x: cx - R, y: cy } })
    blueprintPaths.push({ p0: { x: cx - R, y: cy }, p1: { x: cx - R, y: cy - rk }, p2: { x: cx - rk, y: cy - R }, p3: { x: cx, y: cy - R } })
    blueprintPaths.push({ p0: { x: cx, y: cy - R }, p1: { x: cx + rk, y: cy - R }, p2: { x: cx + R, y: cy - rk }, p3: { x: cx + R, y: cy } })

    // 太阳放射光线
    blueprintPaths.push(makeLine(cx + R, cy, cx + R + 10, cy))
    blueprintPaths.push(makeLine(cx - R, cy, cx - R - 6, cy))
    blueprintPaths.push(makeLine(cx, cy - R, cx, cy - R - 10))
    blueprintPaths.push(makeLine(cx, cy + R, cx, cy + R + 10))
    // 对角光芒
    const d1 = R * 0.7071
    const d2 = (R + 8) * 0.7071
    blueprintPaths.push(makeLine(cx + d1, cy - d1, cx + d2, cy - d2))
    blueprintPaths.push(makeLine(cx - d1, cy - d1, cx - d2, cy - d2))
    blueprintPaths.push(makeLine(cx - d1, cy + d1, cx - d2, cy + d2))
    blueprintPaths.push(makeLine(cx + d1, cy + d1, cx + d2, cy + d2))

    starNodes = [
      { x: cx, y: cy },
      { x: 0, y: -45 },
      { x: 0, y: 45 },
      { x: -28, y: -26 },
      { x: 26, y: 28 }
    ]

    // 周围两颗十字星线条
    blueprintPaths.push(makeLine(-32, -26, -24, -26))
    blueprintPaths.push(makeLine(-28, -30, -28, -22))
    blueprintPaths.push(makeLine(22, 28, 30, 28))
    blueprintPaths.push(makeLine(26, 24, 26, 32))
  } else if (type === 'constellation') {
    // 组装星座 (仙后座 Cassiopeia 或 北斗七星 Big Dipper)
    const isCass = Math.random() > 0.5
    if (isCass) {
      const pts = [
        { x: -45, y: -20 },
        { x: -20, y: 12 },
        { x: 0, y: -10 },
        { x: 20, y: 15 },
        { x: 45, y: -15 }
      ]
      for (let i = 0; i < pts.length - 1; i++) {
        blueprintPaths.push(makeLine(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y))
      }
      starNodes = pts
    } else {
      const pts = [
        { x: -55, y: 25 },
        { x: -35, y: 15 },
        { x: -16, y: 12 },
        { x: 0, y: 0 },
        { x: 8, y: -18 },
        { x: 32, y: -18 },
        { x: 42, y: 0 },
        { x: 22, y: 12 }
      ]
      blueprintPaths.push(makeLine(pts[0].x, pts[0].y, pts[1].x, pts[1].y))
      blueprintPaths.push(makeLine(pts[1].x, pts[1].y, pts[2].x, pts[2].y))
      blueprintPaths.push(makeLine(pts[2].x, pts[2].y, pts[3].x, pts[3].y))
      blueprintPaths.push(makeLine(pts[3].x, pts[3].y, pts[4].x, pts[4].y))
      blueprintPaths.push(makeLine(pts[4].x, pts[4].y, pts[5].x, pts[5].y))
      blueprintPaths.push(makeLine(pts[5].x, pts[5].y, pts[6].x, pts[6].y))
      blueprintPaths.push(makeLine(pts[6].x, pts[6].y, pts[7].x, pts[7].y))
      blueprintPaths.push(makeLine(pts[7].x, pts[7].y, pts[3].x, pts[3].y))
      starNodes = pts
    }
  } else {
    // 组装神秘学几何矩阵
    blueprintPaths.push(...makeCircle(65))
    // 正方形 1
    blueprintPaths.push(makeLine(0, -65, 65, 0))
    blueprintPaths.push(makeLine(65, 0, 0, 65))
    blueprintPaths.push(makeLine(0, 65, -65, 0))
    blueprintPaths.push(makeLine(-65, 0, 0, -65))
    
    // 正方形 2
    const L = 46.0
    blueprintPaths.push(makeLine(-L, -L, L, -L))
    blueprintPaths.push(makeLine(L, -L, L, L))
    blueprintPaths.push(makeLine(L, L, -L, L))
    blueprintPaths.push(makeLine(-L, L, -L, -L))

    blueprintPaths.push(...makeCircle(30))
    // 8向刻度与放射线
    blueprintPaths.push(makeLine(0, 0, 0, -65))
    blueprintPaths.push(makeLine(0, 0, 0, 65))
    blueprintPaths.push(makeLine(0, 0, -65, 0))
    blueprintPaths.push(makeLine(0, 0, 65, 0))
    blueprintPaths.push(makeLine(0, 0, -L, -L))
    blueprintPaths.push(makeLine(0, 0, L, -L))
    blueprintPaths.push(makeLine(0, 0, -L, L))
    blueprintPaths.push(makeLine(0, 0, L, L))

    blueprintPaths.push(...makeCircle(10))

    starNodes = [
      { x: 0, y: 0 },
      { x: 0, y: -65 },
      { x: 65, y: 0 },
      { x: 0, y: 65 },
      { x: -65, y: 0 },
      { x: -L, y: -L },
      { x: L, y: -L },
      { x: -L, y: L },
      { x: L, y: L }
    ]
  }

  const margin = 120
  const cx = margin + Math.random() * (width - margin * 2)
  const cy = margin + Math.random() * (height - margin * 2)
  const baseScale = Math.min(width, height) * 0.0016
  const scale = baseScale * (0.85 + Math.random() * 0.45)

  // 极缓慢自转角速度 (-0.0006 ~ +0.0006 rad/frame)
  const rotDir = Math.random() > 0.5 ? 1 : -1
  const rotSpeed = rotDir * (0.00018 + Math.random() * 0.00035)

  return {
    id: Math.random().toString(),
    cx,
    cy,
    scale,
    paths: blueprintPaths,
    progress: 0,
    drawSpeed: 0.03 + Math.random() * 0.015,
    alpha: 0,
    maxAlpha: 0.12 + Math.random() * 0.1,
    state: 'drawing',
    age: 0,
    lineWidth: 0.8 + Math.random() * 0.4,
    type,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed,
    starNodes,
    pulsePhase: Math.random() * Math.PI * 2
  }
}

function spawnMeteor(width: number, height: number): Meteor {
  // 随机起始坐标：主要集中在左上方至中上方区域
  const x = Math.random() * (width + 150) - 100
  const y = Math.random() * (height * 0.35) - 30
  
  // 向右斜下方飞，角度 32 到 52 度
  const angle = (32 + Math.random() * 20) * Math.PI / 180
  const speed = 7.5 + Math.random() * 9.5
  const vx = Math.cos(angle) * speed
  const vy = Math.sin(angle) * speed

  return {
    x,
    y,
    vx,
    vy,
    length: 65 + Math.random() * 80,
    width: 1.2 + Math.random() * 1.3,
    alpha: 0,
    life: 0,
    maxLife: 38 + Math.random() * 24
  }
}

function getBezierPoint(p0: PathPoint, p1: PathPoint, p2: PathPoint, p3: PathPoint, t: number) {
  const u = 1 - t
  const uu = u * u
  const uuu = uu * u
  const tt = t * t
  const ttt = tt * t
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  }
}

function drawBezierSegment(
  ctx: CanvasRenderingContext2D,
  path: BezierPath,
  maxT: number,
  cx: number, cy: number, scale: number,
  rotation: number,
  offsetX: number, offsetY: number
) {
  const cosA = Math.cos(rotation)
  const sinA = Math.sin(rotation)

  const rotateAndTranslate = (pt: PathPoint) => {
    const xs = pt.x * scale
    const ys = pt.y * scale
    const rx = xs * cosA - ys * sinA
    const ry = xs * sinA + ys * cosA
    return {
      x: cx + rx + offsetX,
      y: cy + ry + offsetY
    }
  }

  const p0 = rotateAndTranslate(path.p0)
  const p1 = rotateAndTranslate(path.p1)
  const p2 = rotateAndTranslate(path.p2)
  const p3 = rotateAndTranslate(path.p3)

  ctx.beginPath()
  const startPt = getBezierPoint(p0, p1, p2, p3, 0)
  ctx.moveTo(startPt.x, startPt.y)

  const steps = Math.ceil(maxT * 18)
  for (let s = 1; s <= steps; s++) {
    const t = Math.min(maxT, s / 18)
    const pt = getBezierPoint(p0, p1, p2, p3, t)
    ctx.lineTo(pt.x, pt.y)
  }
  ctx.stroke()
}

function drawStarNode(
  ctx: CanvasRenderingContext2D,
  pt: PathPoint,
  cx: number, cy: number, scale: number,
  rotation: number,
  alpha: number,
  pulsePhase: number,
  timestamp: number
) {
  const cosA = Math.cos(rotation)
  const sinA = Math.sin(rotation)
  const xs = pt.x * scale
  const ys = pt.y * scale
  const rx = xs * cosA - ys * sinA
  const ry = xs * sinA + ys * cosA
  const x = cx + rx
  const y = cy + ry

  // 呼吸闪烁幅度
  const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.0022 + pulsePhase)
  const currentAlpha = alpha * pulse

  // 绘制星光晕（外圈，半透明淡银白）
  ctx.beginPath()
  ctx.arc(x, y, 4.2 * scale * (0.85 + 0.15 * Math.sin(timestamp * 0.004 + pulsePhase)), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(224, 231, 255, ${currentAlpha * 0.28})`
  ctx.fill()

  // 绘制内部核心（纯白色）
  ctx.beginPath()
  ctx.arc(x, y, 1.5 * scale, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.95})`
  ctx.fill()

  // 极细弱四角金线十字芒
  const beam = 6 * scale * (0.8 + 0.2 * pulse)
  ctx.strokeStyle = `rgba(235, 220, 185, ${currentAlpha * 0.45})`
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(x - beam, y)
  ctx.lineTo(x + beam, y)
  ctx.moveTo(x, y - beam)
  ctx.lineTo(x, y + beam)
  ctx.stroke()
}

export function useCanvasAnimation(bgCanvas: { value: HTMLCanvasElement | null }) {
  const paperBgUrl = ref('')
  let animationFrameId: number | null = null
  const activeSketches: ActiveSketch[] = []
  const activeMeteors: Meteor[] = []
  let framesSinceLastSpawn = 0
  const stardusts: Stardust[] = []

  const TARGET_FPS = 30
  const FRAME_INTERVAL = 1000 / TARGET_FPS
  let lastFrameTime = 0

  function initCanvas() {
    try {
      paperBgUrl.value = generatePaperTexture()

      const canvas = bgCanvas.value
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let width = (canvas.width = window.innerWidth)
      let height = (canvas.height = window.innerHeight)

      // 初始化全局背景星尘 (生成多样式的繁星：dot, cross, sparkle，并随机颜色)
      stardusts.length = 0
      const dustCount = 85 // 略微增加密度
      
      const starColors = [
        '235, 220, 185', // 暖白金
        '224, 231, 255', // 银蓝白
        '242, 228, 250'  // 淡紫白
      ]

      for (let i = 0; i < dustCount; i++) {
        // 样式分配：70% dot, 20% cross, 10% sparkle
        const rand = Math.random()
        let style: 'dot' | 'cross' | 'sparkle' = 'dot'
        if (rand > 0.9) {
          style = 'sparkle'
        } else if (rand > 0.7) {
          style = 'cross'
        }

        const color = starColors[Math.floor(Math.random() * starColors.length)]

        stardusts.push({
          x: Math.random(),
          y: Math.random(),
          size: style === 'dot' ? (0.4 + Math.random() * 0.9) : (0.7 + Math.random() * 0.6),
          pulseSpeed: 0.0006 + Math.random() * 0.0016,
          pulsePhase: Math.random() * Math.PI * 2,
          maxAlpha: style === 'dot' ? (0.05 + Math.random() * 0.15) : (0.08 + Math.random() * 0.18),
          style,
          color
        })
      }

      activeSketches.length = 0
      activeMeteors.length = 0
      activeSketches.push(spawnSketch(width, height))
      framesSinceLastSpawn = 0

      const handleResize = () => {
        if (canvas) {
          width = canvas.width = window.innerWidth
          height = canvas.height = window.innerHeight
          activeSketches.length = 0
          activeMeteors.length = 0
          activeSketches.push(spawnSketch(width, height))
          framesSinceLastSpawn = 0
        }
      }
      window.addEventListener('resize', handleResize)

      function draw(timestamp: number) {
        if (timestamp - lastFrameTime < FRAME_INTERVAL) {
          animationFrameId = requestAnimationFrame(draw)
          return
        }
        lastFrameTime = timestamp

        if (!canvas || !ctx) return

        ctx.clearRect(0, 0, width, height)

        // 1. 绘制全局多样化背景繁星 (Stardust & Constellation Stars)
        for (let i = 0; i < stardusts.length; i++) {
          const d = stardusts[i]
          const x = d.x * width
          const y = d.y * height
          const pulse = 0.35 + 0.65 * Math.sin(timestamp * d.pulseSpeed + d.pulsePhase)
          const a = d.maxAlpha * pulse
          
          if (d.style === 'dot') {
            // A. 圆点星
            ctx.beginPath()
            ctx.arc(x, y, d.size, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${d.color}, ${a})`
            ctx.fill()
          } else if (d.style === 'cross') {
            // B. 四角十字星
            const r = d.size * 2.8 * pulse
            ctx.strokeStyle = `rgba(${d.color}, ${a * 0.9})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(x - r, y)
            ctx.lineTo(x + r, y)
            ctx.moveTo(x, y - r)
            ctx.lineTo(x, y + r)
            ctx.stroke()
            
            // 中心微亮核
            ctx.beginPath()
            ctx.arc(x, y, d.size * 0.4, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${d.color}, ${a * 1.1})`
            ctx.fill()
          } else {
            // C. 八角光芒星
            const rMain = d.size * 3.8 * pulse
            const rSub = rMain * 0.45
            ctx.strokeStyle = `rgba(${d.color}, ${a * 0.85})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            // 主十字
            ctx.moveTo(x - rMain, y)
            ctx.lineTo(x + rMain, y)
            ctx.moveTo(x, y - rMain)
            ctx.lineTo(x, y + rMain)
            // 对角十字
            ctx.moveTo(x - rSub, y - rSub)
            ctx.lineTo(x + rSub, y + rSub)
            ctx.moveTo(x - rSub, y + rSub)
            ctx.lineTo(x + rSub, y - rSub)
            ctx.stroke()
            
            // 核心白亮圆心
            ctx.beginPath()
            ctx.arc(x, y, d.size * 0.5, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${a * 1.2})`
            ctx.fill()
          }
        }

        // 2. 绘制和更新流星效果
        if (activeMeteors.length < 2 && Math.random() < 0.007) {
          activeMeteors.push(spawnMeteor(width, height))
        }

        for (let i = activeMeteors.length - 1; i >= 0; i--) {
          const m = activeMeteors[i]

          m.x += m.vx
          m.y += m.vy
          m.life++

          if (m.life < m.maxLife * 0.15) {
            m.alpha = m.life / (m.maxLife * 0.15)
          } else if (m.life > m.maxLife * 0.6) {
            m.alpha = Math.max(0, 1.0 - (m.life - m.maxLife * 0.6) / (m.maxLife * 0.4))
          } else {
            m.alpha = 1.0
          }

          if (m.life >= m.maxLife || m.y > height + 50 || m.x > width + 100 || m.x < -100) {
            activeMeteors.splice(i, 1)
            continue
          }

          const angle = Math.atan2(m.vy, m.vx)
          const cosA = Math.cos(angle)
          const sinA = Math.sin(angle)
          
          const x_head = m.x
          const y_head = m.y
          const x_tail = m.x - cosA * m.length
          const y_tail = m.y - sinA * m.length

          // 创建尾迹渐变色 (从透明金墨色 -> 亮金 -> 亮白头部)
          const grad = ctx.createLinearGradient(x_tail, y_tail, x_head, y_head)
          grad.addColorStop(0, 'rgba(212, 175, 55, 0)')
          grad.addColorStop(0.65, `rgba(212, 175, 55, ${m.alpha * 0.18})`)
          grad.addColorStop(0.9, `rgba(235, 220, 185, ${m.alpha * 0.65})`)
          grad.addColorStop(1, `rgba(255, 255, 255, ${m.alpha * 0.9})`)

          ctx.strokeStyle = grad
          ctx.lineWidth = m.width
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(x_tail, y_tail)
          ctx.lineTo(x_head, y_head)
          ctx.stroke()

          // 绘制头部摩擦微闪光晕
          const headPulse = 0.95 + 0.3 * Math.sin(timestamp * 0.05)
          const glowR = 4.2 * m.width * headPulse
          ctx.beginPath()
          ctx.arc(x_head, y_head, glowR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha * 0.26})`
          ctx.fill()

          ctx.beginPath()
          ctx.arc(x_head, y_head, 1.2 * m.width, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`
          ctx.fill()
        }

        // 3. 更新和生成 Sketch
        framesSinceLastSpawn++
        if (activeSketches.length < 3 && framesSinceLastSpawn > 200) {
          activeSketches.push(spawnSketch(width, height))
          framesSinceLastSpawn = 0
        }

        for (let i = activeSketches.length - 1; i >= 0; i--) {
          const p = activeSketches[i]

          // 物理更新
          p.rotation += p.rotSpeed

          if (p.state === 'drawing') {
            p.progress += p.drawSpeed
            p.alpha = Math.min(p.maxAlpha, (p.progress / Math.max(1, p.paths.length * 0.15)) * p.maxAlpha)
            if (p.progress >= p.paths.length) {
              p.progress = p.paths.length
              p.state = 'completed'
            }
          } else if (p.state === 'completed') {
            p.age++
            if (p.age > 450) {
              p.alpha -= 0.0035
            }
          }

          if (p.alpha <= 0 && p.state === 'completed') {
            activeSketches.splice(i, 1)
            continue
          }

          // A. 绘制铅笔草稿线 (以微弱偏差渲染，创造手稿拟真感)
          ctx.lineWidth = p.lineWidth * 0.55
          ctx.strokeStyle = `rgba(189, 147, 56, ${p.alpha * 0.22})`
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          for (let j = 0; j < p.paths.length; j++) {
            if (j < Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], 1, p.cx, p.cy, p.scale, p.rotation, 1.2, 1.2)
            } else if (j === Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], p.progress - j, p.cx, p.cy, p.scale, p.rotation, 1.2, 1.2)
            }
          }

          // B. 绘制金墨主线条
          ctx.lineWidth = p.lineWidth
          ctx.strokeStyle = `rgba(212, 175, 55, ${p.alpha})`

          for (let j = 0; j < p.paths.length; j++) {
            if (j < Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], 1, p.cx, p.cy, p.scale, p.rotation, 0, 0)
            } else if (j === Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], p.progress - j, p.cx, p.cy, p.scale, p.rotation, 0, 0)
            }
          }

          // C. 独立绘制发光的银白星点
          const starThreshold = p.paths.length * 0.4
          if (p.progress > starThreshold && p.starNodes && p.starNodes.length > 0) {
            const visibleCount = Math.min(
              p.starNodes.length,
              Math.ceil(((p.progress - starThreshold) / (p.paths.length - starThreshold)) * p.starNodes.length)
            )
            for (let k = 0; k < visibleCount; k++) {
              drawStarNode(ctx, p.starNodes[k], p.cx, p.cy, p.scale, p.rotation, p.alpha, p.pulsePhase + k * 1.5, timestamp)
            }
          }
        }

        animationFrameId = requestAnimationFrame(draw)
      }

      animationFrameId = requestAnimationFrame(draw)

      onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
      })
    } catch (err) {
      console.warn('Canvas 占星动画初始化失败，降级为纯背景色模式：', err)
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

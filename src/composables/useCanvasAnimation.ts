/**
 * useCanvasAnimation — Canvas 金墨动画 Composable
 * 负责：纸张纹理生成、文艺复兴图案绘制、30fps 节流帧率
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
}

// 3 种文艺复兴贵族图样：佛罗伦萨百合、美第奇莨苕、皇冠
const blueprints = {
  fleurDeLis: [
    { p0: { x: 0, y: 15 }, p1: { x: -12, y: -2 }, p2: { x: -8, y: -28 }, p3: { x: 0, y: -50 } },
    { p0: { x: 0, y: 15 }, p1: { x: 12, y: -2 }, p2: { x: 8, y: -28 }, p3: { x: 0, y: -50 } },
    { p0: { x: 0, y: 8 }, p1: { x: -18, y: -8 }, p2: { x: -40, y: -24 }, p3: { x: -45, y: -8 } },
    { p0: { x: -45, y: -8 }, p1: { x: -45, y: 8 }, p2: { x: -22, y: 16 }, p3: { x: 0, y: 18 } },
    { p0: { x: 0, y: 8 }, p1: { x: 18, y: -8 }, p2: { x: 40, y: -24 }, p3: { x: 45, y: -8 } },
    { p0: { x: 45, y: -8 }, p1: { x: 45, y: 8 }, p2: { x: 22, y: 16 }, p3: { x: 0, y: 18 } },
    { p0: { x: -18, y: 18 }, p1: { x: -8, y: 22 }, p2: { x: 8, y: 22 }, p3: { x: 18, y: 18 } },
    { p0: { x: -18, y: 25 }, p1: { x: -8, y: 29 }, p2: { x: 8, y: 29 }, p3: { x: 18, y: 25 } },
    { p0: { x: -12, y: 27 }, p1: { x: -20, y: 38 }, p2: { x: -16, y: 52 }, p3: { x: 0, y: 54 } },
    { p0: { x: 12, y: 27 }, p1: { x: 20, y: 38 }, p2: { x: 16, y: 52 }, p3: { x: 0, y: 54 } }
  ],
  acanthusScroll: [
    { p0: { x: 0, y: 40 }, p1: { x: -4, y: 15 }, p2: { x: -4, y: -15 }, p3: { x: 0, y: -40 } },
    { p0: { x: 0, y: 40 }, p1: { x: 4, y: 15 }, p2: { x: 4, y: -15 }, p3: { x: 0, y: -40 } },
    { p0: { x: 0, y: -30 }, p1: { x: -35, y: -65 }, p2: { x: -65, y: -25 }, p3: { x: -35, y: 0 } },
    { p0: { x: -35, y: 0 }, p1: { x: -15, y: 15 }, p2: { x: -20, y: -15 }, p3: { x: -30, y: -8 } },
    { p0: { x: 0, y: -30 }, p1: { x: 35, y: -65 }, p2: { x: 65, y: -25 }, p3: { x: 35, y: 0 } },
    { p0: { x: 35, y: 0 }, p1: { x: 15, y: 15 }, p2: { x: 20, y: -15 }, p3: { x: 30, y: -8 } },
    { p0: { x: 0, y: 25 }, p1: { x: -40, y: 65 }, p2: { x: -65, y: 25 }, p3: { x: -25, y: 10 } },
    { p0: { x: -25, y: 10 }, p1: { x: -10, y: 0 }, p2: { x: -15, y: 25 }, p3: { x: -20, y: 18 } },
    { p0: { x: 0, y: 25 }, p1: { x: 40, y: 65 }, p2: { x: 65, y: 25 }, p3: { x: 25, y: 10 } },
    { p0: { x: 25, y: 10 }, p1: { x: 10, y: 0 }, p2: { x: 15, y: 25 }, p3: { x: 20, y: 18 } },
    { p0: { x: -20, y: 18 }, p1: { x: -35, y: 45 }, p2: { x: -5, y: 55 }, p3: { x: 0, y: 60 } },
    { p0: { x: 20, y: 18 }, p1: { x: 35, y: 45 }, p2: { x: 5, y: 55 }, p3: { x: 0, y: 60 } }
  ],
  nobleCrown: [
    { p0: { x: -40, y: 35 }, p1: { x: -20, y: 38 }, p2: { x: 20, y: 38 }, p3: { x: 40, y: 35 } },
    { p0: { x: -40, y: 42 }, p1: { x: -20, y: 45 }, p2: { x: 20, y: 45 }, p3: { x: 40, y: 42 } },
    { p0: { x: -40, y: 35 }, p1: { x: -42, y: 37 }, p2: { x: -42, y: 40 }, p3: { x: -40, y: 42 } },
    { p0: { x: 40, y: 35 }, p1: { x: 42, y: 37 }, p2: { x: 42, y: 40 }, p3: { x: 40, y: 42 } },
    { p0: { x: -38, y: 35 }, p1: { x: -35, y: 10 }, p2: { x: -25, y: 0 }, p3: { x: -22, y: -5 } },
    { p0: { x: -22, y: -5 }, p1: { x: -20, y: 15 }, p2: { x: -15, y: 25 }, p3: { x: -10, y: 37 } },
    { p0: { x: 38, y: 35 }, p1: { x: 35, y: 10 }, p2: { x: 25, y: 0 }, p3: { x: 22, y: -5 } },
    { p0: { x: 22, y: -5 }, p1: { x: 20, y: 15 }, p2: { x: 15, y: 25 }, p3: { x: 10, y: 37 } },
    { p0: { x: 0, y: -22 }, p1: { x: -10, y: -10 }, p2: { x: -8, y: 15 }, p3: { x: -10, y: 37 } },
    { p0: { x: 0, y: -22 }, p1: { x: 10, y: -10 }, p2: { x: 8, y: 15 }, p3: { x: 10, y: 37 } },
    { p0: { x: -22, y: -5 }, p1: { x: -25, y: -8 }, p2: { x: -19, y: -8 }, p3: { x: -22, y: -5 } },
    { p0: { x: 22, y: -5 }, p1: { x: 25, y: -8 }, p2: { x: 19, y: -8 }, p3: { x: 22, y: -5 } },
    { p0: { x: 0, y: -22 }, p1: { x: -4, y: -26 }, p2: { x: 4, y: -26 }, p3: { x: 0, y: -22 } }
  ]
}

function generatePaperTexture(): string {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#161210'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.012)'
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

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)'
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
  const blueprintKeys = Object.keys(blueprints) as (keyof typeof blueprints)[]
  const key = blueprintKeys[Math.floor(Math.random() * blueprintKeys.length)]
  const blueprintPaths = blueprints[key]

  const margin = 120
  const cx = margin + Math.random() * (width - margin * 2)
  const cy = margin + Math.random() * (height - margin * 2)
  const baseScale = Math.min(width, height) * 0.0016
  const scale = baseScale * (0.85 + Math.random() * 0.45)

  return {
    id: Math.random().toString(),
    cx,
    cy,
    scale,
    paths: blueprintPaths,
    progress: 0,
    drawSpeed: 0.038 + Math.random() * 0.018,
    alpha: 0,
    maxAlpha: 0.16 + Math.random() * 0.14,
    state: 'drawing',
    age: 0,
    lineWidth: 0.85 + Math.random() * 0.4
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
  offsetX: number, offsetY: number
) {
  const p0 = { x: cx + path.p0.x * scale, y: cy + path.p0.y * scale }
  const p1 = { x: cx + path.p1.x * scale, y: cy + path.p1.y * scale }
  const p2 = { x: cx + path.p2.x * scale, y: cy + path.p2.y * scale }
  const p3 = { x: cx + path.p3.x * scale, y: cy + path.p3.y * scale }

  ctx.beginPath()
  const startPt = getBezierPoint(p0, p1, p2, p3, 0)
  ctx.moveTo(startPt.x + offsetX, startPt.y + offsetY)

  const steps = Math.ceil(maxT * 18)
  for (let s = 1; s <= steps; s++) {
    const t = Math.min(maxT, s / 18)
    const pt = getBezierPoint(p0, p1, p2, p3, t)
    ctx.lineTo(pt.x + offsetX, pt.y + offsetY)
  }
  ctx.stroke()
}

export function useCanvasAnimation(bgCanvas: { value: HTMLCanvasElement | null }) {
  const paperBgUrl = ref('')
  let animationFrameId: number | null = null
  const activeSketches: ActiveSketch[] = []
  let framesSinceLastSpawn = 0

  // 30fps 节流相关
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

      activeSketches.length = 0
      activeSketches.push(spawnSketch(width, height))
      framesSinceLastSpawn = 0

      const handleResize = () => {
        if (canvas) {
          width = canvas.width = window.innerWidth
          height = canvas.height = window.innerHeight
          activeSketches.length = 0
          activeSketches.push(spawnSketch(width, height))
          framesSinceLastSpawn = 0
        }
      }
      window.addEventListener('resize', handleResize)

      function draw(timestamp: number) {
        // 30fps 节流：跳过间隔不足的帧
        if (timestamp - lastFrameTime < FRAME_INTERVAL) {
          animationFrameId = requestAnimationFrame(draw)
          return
        }
        lastFrameTime = timestamp

        if (!canvas || !ctx) return

        ctx.clearRect(0, 0, width, height)

        framesSinceLastSpawn++
        if (activeSketches.length < 3 && framesSinceLastSpawn > 180) {
          activeSketches.push(spawnSketch(width, height))
          framesSinceLastSpawn = 0
        }

        for (let i = activeSketches.length - 1; i >= 0; i--) {
          const p = activeSketches[i]

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
              p.alpha -= 0.003
            }
          }

          if (p.alpha <= 0 && p.state === 'completed') {
            activeSketches.splice(i, 1)
            continue
          }

          // 草稿铅笔线
          ctx.lineWidth = p.lineWidth * 0.55
          ctx.strokeStyle = `rgba(189, 147, 56, ${p.alpha * 0.28})`
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          for (let j = 0; j < p.paths.length; j++) {
            if (j < Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], 1, p.cx, p.cy, p.scale, 1.2, 1.2)
            } else if (j === Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], p.progress - j, p.cx, p.cy, p.scale, 1.2, 1.2)
            }
          }

          // 主金墨线
          ctx.lineWidth = p.lineWidth
          ctx.strokeStyle = `rgba(212, 175, 55, ${p.alpha})`

          for (let j = 0; j < p.paths.length; j++) {
            if (j < Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], 1, p.cx, p.cy, p.scale, 0, 0)
            } else if (j === Math.floor(p.progress)) {
              drawBezierSegment(ctx, p.paths[j], p.progress - j, p.cx, p.cy, p.scale, 0, 0)
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
      console.warn('Canvas 动画初始化失败，降级为纯背景色模式：', err)
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

import UPNG from '@pdf-lib/upng'
import DeltaE from 'delta-e'
import { lab, rgb, color } from 'd3-color'
import knitShader from './knit.frag?raw'
import './app.sass'

const hex2lab = (hex: string) => {
  const { l, a, b } = lab(hex)
  return { L: l, A: a, B: b }
}

const colorDistance = (hex1: string, hex2: string) => {
  return DeltaE.getDeltaE00(hex2lab(hex1), hex2lab(hex2))
}

// constants
const CANVAS_SIZES = [32, 48, 64, 96, 128]
const THREAD_COLORS = [
  '#111111',
  '#55ffff',
  '#ff55ff',
  '#fafafa',
  '#ff0000',
  '#38ee88',
  '#4ba322',
  '#bc898b',
]

// custom $ simple function
const $ = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id) as T
  if (element === null) {
    throw new Error(`Missing element with id ${id}`)
  }
  return element
}

const getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    throw new Error(`Couldn't get canvas context`)
  }
  return context
}

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val))

// get all required html elements
const app = $('app')
const canvas = $<HTMLCanvasElement>('canvas')
const glslCanvas = $<HTMLCanvasElement>('glslCanvas')
const cursor = $('cursor')
const ctx = getContext(canvas)

const glslViewer = new GlslCanvas(glslCanvas)
const filepicker = $<HTMLInputElement>('filepicker')
const serialBtn = $('serialBtn')
const paletteBtns = [
  $('paletteBtn0'),
  $('paletteBtn1'),
  $('paletteBtn2'),
  $('paletteBtn3'),
]
const paletteConfigBtn = $('paletteConfigBtn')
const canvasSizeBtn0 = $('canvasSizeBtn0')
const canvasSizeSpan = $('canvasSizeSpan')
const canvasSizeBtn1 = $('canvasSizeBtn1')

// app state
let port = null
let mouseDown = false
let paletteConfigOn = false
let x = 0
let y = 0
let mouseX = 0
let mouseY = 0
let cellWidth: number
let cellHeight: number
let canvasSizeIndex = 0
let paletteIndex = 0
// image data
let imageData = null

const threadIndexes = [0, 1, 2, 3]
const getPngPalette = () =>
  threadIndexes
    .map((i) => {
      const { r, g, b } = rgb(THREAD_COLORS[i])
      return [r, g, b]
    })
    .flat()

const updateCursorSize = () => {
  const { clientWidth, clientHeight, width, height } = canvas

  cellWidth = clientWidth / width
  cellHeight = clientHeight / height

  cursor.style.width = `${Math.floor(cellWidth)}px`
  cursor.style.height = `${Math.floor(cellHeight)}px`
}

const handleCanvasMouseDown = () => {
  mouseDown = true
  if (paletteConfigOn) {
    const size = CANVAS_SIZES[canvasSizeIndex]
    const cellSize = size / 4

    const i = Math.floor(y / cellSize) * 4 + Math.floor(x / cellSize)

    // change the thread if not out of bounds and not used already
    if (i < THREAD_COLORS.length && !threadIndexes.includes(i)) {
      threadIndexes[paletteIndex] = i
      updateSelectedColor()
    }
  } else {
    paintCell()
  }
}

const handleCanvasMouseUp = () => {
  mouseDown = false
}

const handleCanvasMouseMove = (ev: MouseEvent) => {
  mouseX = ev.offsetX
  mouseY = ev.offsetY
}

const handleCanvasMouseEnter = () => {
  cursor.style.display = 'block'
}

const handleCanvasMouseLeave = () => {
  cursor.style.display = 'none'
}

const paintCell = () => {
  ctx.fillRect(x, y, 1, 1)
  updateTextureUniform()
  saveState()
}

const loadIndexedImage = (img) => {
  const colors = img.tabs.PLTE.reduce((acc, _, index, array) => {
    if (index % 3 === 0) {
      const hex = color(
        `rgb(${array.slice(index, index + 3).join(',')})`
      )?.formatHex()
      acc.push(hex)
    }
    return acc
  }, [])

  // auto pick thread colors based on closest
  // color distances
  const taken: number[] = []
  colors.forEach((color, i) => {
    let minDistance: number | undefined

    for (let j = 1; j < THREAD_COLORS.length; j++) {
      const distance = colorDistance(THREAD_COLORS[j], color)
      if (
        !taken.includes(j) &&
        (minDistance === undefined || distance < minDistance)
      ) {
        minDistance = distance
        threadIndexes[i] = j
        taken.push(j)
      }
    }
  })

  // override palette
  img.tabs.PLTE = getPngPalette()
  //remove transparency
  img.tabs.tRNS = [255, 255, 255, 255]

  // get the image data buffer
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // convert to RGBA
  const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0])

  imageData.data.set(buf8)
  ctx.putImageData(imageData, 0, 0)

  updateTextureUniform()
  updateSelectedColor()
}

const handleFileChange = (ev: Event) => {
  if (ev.target === null) return

  const target = ev.target as HTMLInputElement

  if (target.files === null || target.files.length === 0) return

  const [file] = target.files

  const reader = new FileReader()

  // load to image to get it's width/height
  const img = new Image()
  img.onload = () => {
    const size = CANVAS_SIZES[canvasSizeIndex]
    ctx.clearRect(0, 0, size, size)
    // draw image into the canvas
    ctx.drawImage(img, 0, 0, size, size)

    // extract canvas image data
    const imageData = ctx.getImageData(0, 0, size, size)

    // re-encode to 4 color PNG
    const data = UPNG.encode([imageData.data.buffer], size, size, 4)

    // re-decode PNG data
    const png = UPNG.decode(data)

    loadIndexedImage(png)

    // save the state
    saveState()
  }
  // this is to setup loading the image
  reader.onloadend = (ev) => {
    img.src = ev.target?.result as string
  }
  // this is to read the file
  reader.readAsDataURL(file)
  // remove the file so onchange event
  // still triggers if we pick the same file
  filepicker.value = ''
}

const changeCanvasSize = (index: number) => {
  canvasSizeIndex = index
  const size = CANVAS_SIZES[index]

  // Create a new canvas with the desired size
  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width = size
  tmpCanvas.height = size
  const tmpCtx = tmpCanvas.getContext('2d')

  if (tmpCtx === null) return

  // Draw the original canvas onto the new canvas, scaling it up
  tmpCtx.imageSmoothingEnabled = false
  tmpCtx.drawImage(canvas, 0, 0, size, size)

  // Replace the original canvas with the scaled canvas
  canvas.width = size
  canvas.height = size
  canvasSizeSpan.innerText = `${size}`

  ctx.drawImage(tmpCanvas, 0, 0, size, size)

  updateTextureUniform()
  updateSelectedColor()
  updateCursorSize()
}

const base64ToArrayBuffer = (base64: string) => {
  const binary_string = atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

// maybe it would be better to have a isDirty approach
let saveId = null

const saveState = () => {
  if (saveId) {
    clearTimeout(saveId)
  }
  saveId = setTimeout(saveStateDelayed, 500)
}

const updateTextureUniform = () => {
  const dataUrl = canvas.toDataURL()
  glslViewer.setUniform('u_tex0', dataUrl)
}

const saveStateDelayed = () => {
  // TODO: save metadata along with img
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = UPNG.encode(
    [imageData.data.buffer],
    canvas.width,
    canvas.height,
    4
  )
  const str = btoa(String.fromCharCode(...new Uint8Array(data)))

  // push the state
  window.history.pushState(null, null, `#${str}`)
}

const tryLoadState = () => {
  return
  // TODO: load metadata along with img
  const parts = location.hash.split('#')
  if (parts.length === 2) {
    const str = parts[1]
    const data = base64ToArrayBuffer(str)
    const img = UPNG.decode(data)
    loadIndexedImage(img)
  }
}

const sendPattern = async () => {
  // create a 32bit palette to match image data as 32bit pixels
  const palette = getPngPalette()
  const pal32 = new Uint32Array([
    (255 << 24) | (palette[2] << 16) | (palette[1] << 8) | palette[0],
    (255 << 24) | (palette[5] << 16) | (palette[4] << 8) | palette[3],
    (255 << 24) | (palette[8] << 16) | (palette[7] << 8) | palette[6],
    (255 << 24) | (palette[11] << 16) | (palette[10] << 8) | palette[9],
  ])

  // get the image data buffer
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // read the image data buffer as uint32 (rgba)
  const buf32 = new Uint32Array(imageData.data.buffer)

  // transform from full color to indexed color
  const indexes = buf32.map((a) => {
    const i = pal32.indexOf(a)
    return i !== -1 ? i : 0
  })

  const needles = canvas.width
  const rows = canvas.height
  const pattern = indexes.join('')

  const pad = (num, places) => String(num).padStart(places, ' ')

  // motif is the data that is going to be streamed (as bytes)
  // and has the following format
  const message = `4${pad(needles, 4)}${pad(rows, 4)} ${pattern}`

  const writer = port.writable.getWriter()
  const encoder = new TextEncoder()
  const encoded = encoder.encode(message)

  const len = 8

  for (let i = 0; i < encoded.length;) {
    const chunk = encoded.slice(i, i + len)
    //await writer.ready
    await writer.write(chunk)
    i += chunk.length

    // const percent = Math.round((i * 100) / encoded.length)
    // progress.children[0].style.width = `${percent}%`
  }

  // Allow the serial port to be closed later.
  writer.releaseLock()

  // progress.children[0].style.width = `0%`
}


const onSerialClick = async () => {
  if (!navigator.serial) {
    alert(
      `Sólo funciona en chrome\n\nHabilita el puerto serie:\n\nchrome://flags/#enable-experimental-web-platform-features`
    )
    return
  }

  // if port is already connected
  if (port) {
    await sendPattern()
  } else {
    try {
      // request the serial port
      const port = await navigator.serial.requestPort()
      await connectSerial(port)
    } catch (e) {
      console.log(e)
    }
  }
}

const tryConnectSerial = async () => {
  const ports = await navigator.serial.getPorts()

  // try to connect to the first non failing serial port allowed
  for (let i = 0; i < ports.length; i++) {
    try {
      await connectSerial(ports[i])
      // exit if connected succesfully
      return
    } catch (e) {
      // silently ignore
    }
  }
}

/*
navigator.serial.addEventListener('connect', (e) => {
  console.log(e);
  // Connect to `e.target` or add it to a list of available ports.
});

navigator.serial.addEventListener('disconnect', (e) => {
  console.log(e);
  // Remove `e.target` from the list of available ports.
});
*/

const connectSerial = async (_port) => {
  const options = {
    baudRate: 1200,
    parity: 'even',
    stopBits: 1,
    dataBits: 8,
  }

  await _port.open(options)

  serialBtn.innerText = 'Send Pattern'
  // save a reference to the port
  port = _port
}

const changePaletteIndex = (i) => {
  paletteIndex = i
  updateSelectedColor()
}

const updateSelectedColor = () => {
  paletteBtns.forEach((btn) => btn.classList.remove('selected'))
  paletteBtns[paletteIndex].classList.add('selected')

  const colors = threadIndexes.map((i) => THREAD_COLORS[i])

  paletteBtns.forEach((btn, i) => (btn.style.cssText = `background-color:${colors[i]}`))
  const currentColor = colors[paletteIndex]
  ctx.fillStyle = currentColor
  cursor.style.background = currentColor
}

const drawPaletteConfigColors = () => {
  const size = CANVAS_SIZES[canvasSizeIndex]
  const cellSize = size / 4

  // clear canvas
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)

  THREAD_COLORS.forEach((c, i) => {
    const x = (i % 4) * cellSize
    const y = Math.floor(i / 4) * cellSize
    ctx.fillStyle = c
    ctx.fillRect(x, y, cellSize, cellSize)
  })

  updateTextureUniform()
}

const togglePaletteConfig = () => {
  paletteConfigOn = !paletteConfigOn
  if (paletteConfigOn) {
    // save the image data buffer
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    drawPaletteConfigColors()
    app.classList.add('paletteConfigOn')
  } else {
    ctx.putImageData(imageData, 0, 0)

    updateTextureUniform()
    updateSelectedColor()
    app.classList.remove('paletteConfigOn')
  }
}

const onDecreaseCanvasSize = () => {
  if (canvasSizeIndex > 0) {
    changeCanvasSize(canvasSizeIndex - 1)
  }
}

const onIncreaseCanvasSize = () => {
  if (canvasSizeIndex < CANVAS_SIZES.length - 1) {
    changeCanvasSize(canvasSizeIndex + 1)
  }
}

const init = () => {
  if (navigator.serial) {
    tryConnectSerial()
  }

  updateSelectedColor()
  changeCanvasSize(canvasSizeIndex)
  updateCursorSize()

  // Load only the Fragment Shader
  glslViewer.load(knitShader)

  updateTextureUniform()

  ctx.imageSmoothingEnabled = false

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(canvas, { box: 'content-box' })

  // Add event listeners for canvas
  canvas.addEventListener('mousedown', handleCanvasMouseDown, false)
  canvas.addEventListener('mouseup', handleCanvasMouseUp, false)
  canvas.addEventListener('mousemove', handleCanvasMouseMove, false)
  canvas.addEventListener('mouseenter', handleCanvasMouseEnter, false)
  canvas.addEventListener('mouseleave', handleCanvasMouseLeave, false)

  filepicker.addEventListener('change', handleFileChange)
  serialBtn.addEventListener('click', onSerialClick)
  paletteBtns.map((btn, i) => {
    btn.addEventListener('click', () => {
      changePaletteIndex(i)
    })
  })

  paletteConfigBtn.addEventListener('click', togglePaletteConfig)

  canvasSizeBtn0.addEventListener('click', onDecreaseCanvasSize)
  canvasSizeBtn1.addEventListener('click', onIncreaseCanvasSize)

  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Digit1':
          paletteIndex = 0
          break
        case 'Digit2':
          paletteIndex = 1
          break
        case 'Digit3':
          paletteIndex = 2
          break
        case 'Digit4':
          paletteIndex = 3
          break
      }
      updateSelectedColor()
    },
    true
  )

  tryLoadState()

  // deshabilitar click derecho ( menu contextual)
  // window.oncontextmenu = (ev) => ev.preventDefault()

  // setup an update loop
  const raf = () => {
    onUpdate()
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)
}

const onResize = () => {
  updateCursorSize()
}

const onUpdate = () => {
  const newX = clamp(Math.floor(mouseX / cellWidth), 0, canvas.width - 1)
  const newY = clamp(Math.floor(mouseY / cellHeight), 0, canvas.height - 1)

  if (x !== newX || y !== newY) {
    x = newX
    y = newY
    cursor.style.top = `${canvas.offsetTop + y * cellHeight}px`
    cursor.style.left = `${canvas.offsetLeft + x * cellWidth}px`
    if (mouseDown && !paletteConfigOn) {
      paintCell()
    }
  }
}

init()

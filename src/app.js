import UPNG from '@pdf-lib/upng';
import Picker from 'vanilla-picker'
import '@fortawesome/fontawesome-free/css/all.css'

// constants
const WIDTH = 50
const HEIGHT = 50

const paletteSelector = document.getElementById("palette")
const serialBtn = document.getElementById("serial")
const canvas = document.getElementById("canvas")
const cursor =  document.getElementById("cursor")
const ctx = canvas.getContext("2d")

const picker = new Picker({
  popup: 'top',
  onChange: (color) => {
    const el = picker.settings.parent
    const i = paletteIndex(el)
    palette[i*3 + 0] = color.rgba[0]
    palette[i*3 + 1] = color.rgba[1]
    palette[i*3 + 2] = color.rgba[2]
    renderPallete()
  },
  onDone: (color) => {
    renderImage()
  },
});

// app state
let port = null
let mouseDown = false
let x = 0
let y = 0
let mouseX = 0
let mouseY = 0
let palette = [0x11, 0x11, 0x11, 0x55, 0xff, 0xff, 0xff, 0x55, 0xff, 0xfa, 0xfa, 0xfa]
let cellWidth
let cellHeight


const onCanvasMouseDown = () => {
  mouseDown = true
  paintCell()
}

const onCanvasMouseUp = () => {
  mouseDown = false
}


const onCanvasMouseMove = (ev) => {
  mouseX = ev.offsetX
  mouseY = ev.offsetY

  if (mouseDown) {
    paintCell()
  }

}

const onCanvasMouseEnter = () => {
  cursor.style.display = 'block'
}

const onCanvasMouseLeave = () => {
  cursor.style.display = 'none'
  mouseDown = false
}


const paintCell = () => {
  ctx.fillRect(x, y, 1, 1)
  saveState()
}

const paletteIndex = el => {
  for(let i = 0; i< 4; i++) {
    if(paletteSelector.children[i] === el)
      return i
  }
}

const onPaletteClick = (ev) => {

  const index = paletteIndex(ev.target)
  const color = paletteColor(index)
  ctx.fillStyle = color
  cursor.style.background = color
}

const onPaletteRightClick = (ev) => {

  const index = paletteIndex(ev.target)
  const color = paletteColor(index)
  //open color picker
  const options = {
    parent: ev.target,
    color
  }
  picker.movePopup(options, true)

}

const renderPallete = () => {

  for(let i = 0; i< 4; i++) {
    paletteSelector.children[i].style = `background: ${paletteColor(i)};`
  }

  cursor.style.background = paletteColor(1)
  ctx.fillStyle = paletteColor(1)

}

const paletteColor = index => {
  const rgb = palette.slice( index * 3 , (index+1) * 3 )
  return `rgb(${rgb.join(',')})`
}

const renderImage = () => {

  // get the image data buffer
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // decode PNG buffer
  const data = UPNG.encode([imageData.data.buffer], canvas.width, canvas.height, 4)
  const img = UPNG.decode(data)

  // override palette
  img.tabs.PLTE = palette

  // convert to RGBA
  const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0])

  imageData.data.set(buf8);
  ctx.putImageData(imageData, 0, 0);

  // encode data
  //saveState()

}

const loadIndexedImage = (img) => {

  // save palette
  palette = img.tabs.PLTE
  //remove transparency
  img.tabs.tRNS = [255,255,255,255]
  renderPallete()
  // easier to decode this way
  canvas.width = img.width
  canvas.height = img.height
  onResize()

  // get the image data buffer
  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  
  // convert to RGBA
  const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0])

  imageData.data.set(buf8);
  ctx.putImageData(imageData, 0, 0);

  // encode data
  //saveState()

}

const onFileChange = (ev) => {

  const reader = new FileReader()

  reader.onload = (ev) => {
    const buffer = ev.target.result

    // decode PNG buffer
    const img = UPNG.decode(buffer)

    // convert to RGBA
    const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0])

    // re-encode to 4 color PNG 
    const data = UPNG.encode([buf8], img.width, img.height, 4)
    
    // re-decode PNG data
    const img2 = UPNG.decode(data)

    loadIndexedImage(img2)
  }

  reader.readAsArrayBuffer(ev.target.files[0]);

}

const download = () => {
  const link = document.createElement('a')
  link.download = 'pattern.png'
  link.href = document.getElementById('canvas').toDataURL()
  link.click()
}

const saveState = () => {

  return

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = UPNG.encode([imageData.data.buffer], canvas.width, canvas.height, 4)
  console.log(data)
  return

  window.history.replaceState(null, null, `#${d}`)

}

const tryLoadState =  () => {
  const parts = location.hash.split("#")
  if(parts.length === 2){
    //const d = lzw_decode(parts[1])
    //console.log(d);
  }
}

const sendPattern = async () => {

  // get the image data buffer
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // read the image data buffer as uint32 (rgba)
  const buf32 = new Uint32Array(imageData.data.buffer)

  // create a 32bit palette to match image data as 32bit pixels
  const pal32 = new Uint32Array( [
    255 << 24 | (palette[2] << 16)  | (palette[1] << 8) | (palette[0] ),
    255 << 24 | (palette[5] << 16)  | (palette[4] << 8) | (palette[3] ),
    255 << 24 | (palette[8] << 16)  | (palette[7] << 8) | (palette[6] ),
    255 << 24 | (palette[11] << 16)  | (palette[10] << 8) | (palette[9] ),
  ])

  // transform from full color to indexed color
  const indexes = buf32.map( a => pal32.indexOf(a))


  const needles = canvas.width
  const rows = canvas.height
  const pattern = indexes.join('')

  const pad = (num, places) => String(num).padStart(places, '0')

  // motif is the data that is going to be streamed (as bytes)
  // and has the following format
  const motif = `4${pad(needles,4)}${pad(rows,4)} ${pattern}`

  // make bytestream from motif
  const data = new Uint8Array(motif.split('').map( c => c.charCodeAt(0)))
  console.log(data);

  const writer = port.writable.getWriter()

  await writer.write(data)

  // Allow the serial port to be closed later.
  writer.releaseLock()

  // just for fun
  let str = ''
  for(let i = 0; i< canvas.height; i++){
    str += indexes.slice(i * canvas.width, (i+1) * canvas.width).join('') + '\n'
  }
  console.log(str);


}

const onSerialBtnClick = async () => {

  // if port is already connected
  if(port){
    await sendPattern()
  }
  else{

    try {
      // request the serial port
      const port = await navigator.serial.requestPort();
      await connectSerial(port)
    } catch (e) {
      console.log(e);
    }

  }

}

const tryConnectSerial = async () => {
  const ports = await navigator.serial.getPorts();
  console.log(ports);
  if(ports.length > 0){
    await connectSerial(ports[0])
  }
}

const connectSerial = async (_port) => {

  try {

    await _port.open({
      baudRate: 1200,
      parity: "even",
      stopBits: 1,
      dataBits: 8
    })

    serialBtn.innerText = "Send Pattern"
    // save a reference to the port
    port = _port
      
  } catch (e) {
    /* handle error */
  }


}


const init = () => {

  tryConnectSerial()
  serialBtn.addEventListener('click', onSerialBtnClick, false)

  canvas.width = WIDTH
  canvas.height = HEIGHT
  ctx.imageSmoothingEnabled = false;

  saveState()
  tryLoadState()

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas, {box: 'content-box'});

  // Add event listeners for canvas
  canvas.addEventListener('mousedown', onCanvasMouseDown, false)
  canvas.addEventListener('mouseup', onCanvasMouseUp, false)
  canvas.addEventListener('mousemove', onCanvasMouseMove, false)
  canvas.addEventListener('mouseenter', onCanvasMouseEnter, false)
  canvas.addEventListener('mouseleave', onCanvasMouseLeave, false)

  for(let i = 0; i< 4; i++) {
    const span = document.createElement('span')
    paletteSelector.appendChild(span)
  }

  paletteSelector.addEventListener('click', onPaletteClick, false)
  paletteSelector.addEventListener('contextmenu', onPaletteRightClick, false)

  document.getElementById("filepicker").addEventListener('change', onFileChange, false)
  document.getElementById("download").addEventListener('click', download, false)

  renderPallete()

  // deshabilitar click derecho ( menu contextual)
  window.oncontextmenu = (ev) => ev.preventDefault()

  // setup an update loop
  const raf =  () => {
    onUpdate()
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)


}

const onResize = () => {

  const {clientWidth, clientHeight, width, height} = canvas

  cellWidth = clientWidth/ width
  cellHeight = clientHeight/ height

  cursor.style.width = `${ Math.floor(cellWidth) }px`
  cursor.style.height = `${ Math.floor(cellHeight) }px`
}

const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

const onUpdate =  () => {

  const newX = clamp( Math.floor(mouseX / cellWidth), 0, canvas.width - 1)
  const newY = clamp( Math.floor(mouseY / cellHeight), 0, canvas.height - 1)

  if (x !== newX || y !== newY) {
    x = newX
    y = newY
    cursor.style.top = `${ canvas.offsetTop + y * cellHeight }px`
    cursor.style.left = `${ canvas.offsetLeft + x * cellWidth }px`
  }

}

init()

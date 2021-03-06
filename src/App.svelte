<script>
  import { onMount } from "svelte";
  import UPNG from "@pdf-lib/upng";
  import Picker from "vanilla-picker";
  import knitShader from "./knit.frag";
  import Header from "./components/Header.svelte";
  import Toolbar from "./components/Toolbar.svelte";

  // constants
  const WIDTH = 50;
  const HEIGHT = 50;

  let canvas;
  let cursor;
  let ctx;
  let ctx2;
  let glslCanvas;
  let glslViewer;

  const picker = new Picker({
    popup: "top",
    onChange: (color) => {
      const el = picker.settings.parent;
      const i = paletteIndex;
      palette[i * 3 + 0] = color.rgba[0];
      palette[i * 3 + 1] = color.rgba[1];
      palette[i * 3 + 2] = color.rgba[2];
      renderImage();
      saveState();
      console.log(el, i);
    },
    onDone: (color) => {},
  });

  // app state
  let port = null;
  let mouseDown = false;
  let mouseOver = false;
  let x = 0;
  let y = 0;
  let mouseX = 0;
  let mouseY = 0;
  let palette = [
    0x11, 0x11, 0x11, 0x55, 0xff, 0xff, 0xff, 0x55, 0xff, 0xfa, 0xfa, 0xfa,
  ];
  let cellWidth;
  let cellHeight;
  let paletteIndex = 0

  const paletteColor = (index) => {
    const rgb = palette.slice(index * 3, (index + 1) * 3);
    return `rgb(${rgb.join(",")})`;
  };


  $: colors = [0,1,2,3].map(c => paletteColor(c))
  $: currentColor = colors[paletteIndex]
  $: {
    if(ctx){
      ctx.fillStyle = currentColor;
    }
    if(cursor){
      cursor.style.background = currentColor;
    }
  }
 
  const onCanvasMouseDown = () => {
    paintCell();
  };

  const onCanvasMouseUp = () => {
    mouseDown = false;
  };

  const onAppMouseDown = () => {
    mouseDown = true;
  };

  const onAppMouseUp = () => {
    mouseDown = false;
  };

  const onCanvasMouseMove = (ev) => {
    mouseX = ev.offsetX;
    mouseY = ev.offsetY;

    if (mouseDown) {
      paintCell();
    }
  };

  const onCanvasMouseEnter = () => {
    mouseOver = true;
    cursor.style.display = "block";
  };

  const onCanvasMouseLeave = () => {
    mouseOver = false;
    cursor.style.display = "none";
  };

  const paintCell = () => {
    ctx.fillRect(x, y, 1, 1);
    saveState();
  };

  const onColorClick = (ev) => {
    console.log(ev.detail, paletteIndex)
    return
    const index = paletteIndex;
    const color = paletteColor(index);
    ctx.fillStyle = color;
    cursor.style.background = color;
  };

  const onPaletteRightClick = (ev) => {
    const index = paletteIndex;
    const color = paletteColor(index);
    //open color picker
    const options = {
      parent: ev.target,
      color,
    };
    picker.movePopup(options, true);
  };

  const renderImage = () => {
    // get the image data buffer
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // decode PNG buffer
    const data = UPNG.encode(
      [imageData.data.buffer],
      canvas.width,
      canvas.height,
      4
    );
    const img = UPNG.decode(data);

    // override palette
    img.tabs.PLTE = palette;

    // convert to RGBA
    const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0]);

    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);
  };

  const loadIndexedImage = (img) => {
    // save palette
    palette = img.tabs.PLTE;
    //remove transparency
    img.tabs.tRNS = [255, 255, 255, 255];
    // easier to decode this way
    canvas.width = img.width;
    canvas.height = img.height;
    onResize();

    // get the image data buffer
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // convert to RGBA
    const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0]);

    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);

    updateTextureUniform();
  };

  const onFileChange = (ev) => {
    const { file } = ev.detail;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const buffer = ev.target.result;

      // decode PNG buffer
      const img = UPNG.decode(buffer);

      // convert to RGBA
      const buf8 = new Uint8Array(UPNG.toRGBA8(img)[0]);

      // re-encode to 4 color PNG
      const data = UPNG.encode([buf8], img.width, img.height, 4);

      // re-decode PNG data
      const img2 = UPNG.decode(data);

      loadIndexedImage(img2);

      // save the state
      saveState();
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadClick = () => {
    const link = document.createElement("a");
    link.download = "pattern.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportClick = () => {
    const link = document.createElement("a");
    link.download = "pattern.jpg";
    link.href = glslCanvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  function base64ToArrayBuffer(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // maybe it would be better to have a isDirty approach
  let saveId = null;

  const saveState = () => {
    if (saveId) {
      clearTimeout(saveId);
    }
    saveId = setTimeout(saveStateDelayed, 500);

    updateTextureUniform();
  };

  const updateTextureUniform = () => {
    const dataUrl = canvas.toDataURL();
    glslViewer.setUniform("u_tex0", dataUrl);
  };

  const saveStateDelayed = () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = UPNG.encode(
      [imageData.data.buffer],
      canvas.width,
      canvas.height,
      4
    );
    const str = btoa(String.fromCharCode(...new Uint8Array(data)));

    // push the state
    window.history.pushState(null, null, `#${str}`);
  };

  const tryLoadState = () => {
    const parts = location.hash.split("#");
    if (parts.length === 2) {
      const str = parts[1];
      const data = base64ToArrayBuffer(str);
      const img = UPNG.decode(data);
      loadIndexedImage(img);
    }
  };

  const sendPattern = async () => {
    // create a 32bit palette to match image data as 32bit pixels
    const pal32 = new Uint32Array([
      (255 << 24) | (palette[2] << 16) | (palette[1] << 8) | palette[0],
      (255 << 24) | (palette[5] << 16) | (palette[4] << 8) | palette[3],
      (255 << 24) | (palette[8] << 16) | (palette[7] << 8) | palette[6],
      (255 << 24) | (palette[11] << 16) | (palette[10] << 8) | palette[9],
    ]);

    // get the image data buffer
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // read the image data buffer as uint32 (rgba)
    const buf32 = new Uint32Array(imageData.data.buffer);

    // transform from full color to indexed color
    const indexes = buf32.map((a) => {
      const i = pal32.indexOf(a);
      return i !== -1 ? i : 0;
    });

    const needles = canvas.width;
    const rows = canvas.height;
    const pattern = indexes.join("");

    const pad = (num, places) => String(num).padStart(places, " ");

    // motif is the data that is going to be streamed (as bytes)
    // and has the following format
    const message = `4${pad(needles, 4)}${pad(rows, 4)} ${pattern}`;

    const writer = port.writable.getWriter();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const len = 8;

    for (let i = 0; i < encoded.length; ) {
      const chunk = encoded.slice(i, i + len);
      //await writer.ready
      await writer.write(chunk);
      i += chunk.length;

      const percent = Math.round((i * 100) / encoded.length);
      progress.children[0].style.width = `${percent}%`;
    }

    // Allow the serial port to be closed later.
    writer.releaseLock();

    progress.children[0].style.width = `0%`;
  };

  const copy2clip = (text) => {
    const dummy = document.createElement("input");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
  };

  const onShareClick = (ev) => {
    ev.preventDefault();
    const str = window.location.href;
    copy2clip(str);

    // flash message
    shareBtn.classList.add("copied");
    setTimeout(() => {
      shareBtn.classList.remove("copied");
    }, 1000);
  };

  const onSerialClick = async () => {
    if (!navigator.serial) {
      alert(
        `Sólo funciona en chrome\n\nHabilita el puerto serie:\n\nchrome://flags/#enable-experimental-web-platform-features`
      );
      return;
    }

    // if port is already connected
    if (port) {
      await sendPattern();
    } else {
      try {
        // request the serial port
        const port = await navigator.serial.requestPort();
        await connectSerial(port);
      } catch (e) {
        console.log(e);
      }
    }
  };

  const tryConnectSerial = async () => {
    const ports = await navigator.serial.getPorts();

    // try to connect to the first non failing serial port allowed
    for (let i = 0; i < ports.length; i++) {
      try {
        await connectSerial(ports[i]);
        // exit if connected succesfully
        return;
      } catch (e) {}
    }
  };

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
      parity: "even",
      stopBits: 1,
      dataBits: 8,
    };

    await _port.open(options);

    serialBtn.innerText = "Send Pattern";
    // save a reference to the port
    port = _port;
  };

  const init = () => {
    const app = document.getElementById("app");
    canvas = document.getElementById("canvas");
    glslCanvas = document.getElementById("glslCanvas");
    cursor = document.getElementById("cursor");
    ctx = canvas.getContext("2d");
    // FIXME: this is needed to be able to export the webgl image
    // but has performance impact.
    // it would be better to create the context, render the image, export, and destroy the context
    ctx2 = glslCanvas.getContext("webgl", {preserveDrawingBuffer: true})
    glslViewer = new GlslCanvas(glslCanvas);

    if (navigator.serial) {
      tryConnectSerial();
    }

    // Load only the Fragment Shader
    glslViewer.load(knitShader);

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    ctx.imageSmoothingEnabled = false;

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, { box: "content-box" });

    app.addEventListener("mousedown", onAppMouseDown, false);
    app.addEventListener("mouseup", onAppMouseUp, false);
    // Add event listeners for canvas
    canvas.addEventListener("mousedown", onCanvasMouseDown, false);
    canvas.addEventListener("mouseup", onCanvasMouseUp, false);
    canvas.addEventListener("mousemove", onCanvasMouseMove, false);
    canvas.addEventListener("mouseenter", onCanvasMouseEnter, false);
    canvas.addEventListener("mouseleave", onCanvasMouseLeave, false);

    tryLoadState();

    // deshabilitar click derecho ( menu contextual)
    window.oncontextmenu = (ev) => ev.preventDefault();

    // setup an update loop
    const raf = () => {
      onUpdate();
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  };

  const onResize = () => {
    const { clientWidth, clientHeight, width, height } = canvas;

    cellWidth = clientWidth / width;
    cellHeight = clientHeight / height;

    cursor.style.width = `${Math.floor(cellWidth)}px`;
    cursor.style.height = `${Math.floor(cellHeight)}px`;
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const onUpdate = () => {
    const newX = clamp(Math.floor(mouseX / cellWidth), 0, canvas.width - 1);
    const newY = clamp(Math.floor(mouseY / cellHeight), 0, canvas.height - 1);

    if (x !== newX || y !== newY) {
      x = newX;
      y = newY;
      cursor.style.top = `${canvas.offsetTop + y * cellHeight}px`;
      cursor.style.left = `${canvas.offsetLeft + x * cellWidth}px`;
    }
  };

  onMount(init);
</script>

<main>
  <div id="app">
    {currentColor}
    {paletteIndex}
    <Header />
    <div id="canvasWrapper">
      <Toolbar
        {colors}
        bind:paletteIndex={paletteIndex}
        on:serialClick={onSerialClick}
        on:downloadClick={downloadClick}
        on:exportClick={exportClick}
        on:shareClick={onShareClick}
        on:fileChange={onFileChange}
      />
      <span id="cursor" />
      <canvas id="canvas" />
      <canvas id="glslCanvas" width="1024" height="1024" />
    </div>
    <canvas id="mirrorCanvas" width="1024" height="1024" />
  </div>
</main>

<style lang="sass" type="text/sass">

:global(body)
  margin: 0
  padding: 0
  background-color: #111
  color: #fafafa
  font-family: Inconsolata
  font-size: 16px
  a
    color: inherit
    cursor: pointer

:global(::-webkit-scrollbar)
  width: 0

#app
  position: relative
  padding: 20px
  margin: auto

#canvasWrapper
  margin: auto
  max-width: 75vh
  position: relative
  font-size: 0
  border: 1px solid #fafafa
  box-sizing: border-box
#cursor
  position: absolute
  display: none
  pointer-events: none
  z-index: 1000
#canvas
  width: 100%
  image-rendering: pixelated
#glslCanvas
  top: 0
  left: 0
  pointer-events: none
  position: absolute
  width: 100%
  opacity: 1

.copied
  position: relative
  &::after
    user-select: none
    pointer-events: none
    content: "Copied to clipboard!"
    position: absolute
    font-size: 1.5em
    width: 10em
    height: 1em
    padding: 0.5em
    bottom: -2.5em
    left: 0
    background: #111
    color: #fafafa
    z-index: 100

</style>

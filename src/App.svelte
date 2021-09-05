<script>
  import Header from './components/Header.svelte'
  import Toolbar from './components/Toolbar.svelte'
</script>

<main>
  <div id="app">
    <Header/>
    <div id="canvasWrapper">
      <Toolbar />
      <span id="cursor"></span>
      <canvas id="canvas"></canvas>
      <canvas id="glslCanvas" width="1024" height="1024"></canvas>
    </div>
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

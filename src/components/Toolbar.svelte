<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let colors;
  export let paletteIndex;
  export let canvasSize;
  export let CANVAS_SIZES;
  export let canvasSizeIndex;

  let files;
  $: if (files) {
    for (const file of files) {
      dispatch("fileChange", { file });
    }
  }

  const onPaletteClick = (i) => {
    paletteIndex = i;
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
    const btn = ev.currentTarget;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.classList.remove("copied");
    }, 1000);
  };

  const onDecreaseCanvasSize = () => {
    if (canvasSizeIndex > 0) {
      canvasSizeIndex -= 1;
    }
  };

  const onIncreaseCanvasSize = () => {
    if (canvasSizeIndex < CANVAS_SIZES.length - 1) {
      canvasSizeIndex += 1;
    }
  };
</script>

<div id="toolbar">
  <label for="filepicker" id="filepicker-label">
    <i class="las la-file-upload" />
  </label>
  <input
    id="filepicker"
    type="file"
    accept="image/png, image/jpeg"
    bind:files
  />
  <button title="Download" on:click={() => dispatch("downloadClick")}>
    <i class="las la-save" />
  </button>
  <button title="Export" on:click={() => dispatch("exportClick")}>
    <i class="las la-download" />
  </button>
  <button title="Share" on:click={onShareClick}>
    <i class="las la-share" />
  </button>
  <button on:click={() => dispatch("serialClick")}>
    <i class="las la-plug" />
  </button>
  {#each colors as color, i}
    <button
      class="palette"
      class:selected={paletteIndex === i}
      on:click={() => onPaletteClick(i)}
      style="background-color:{color}"
    />
  {/each}
  <button on:click={onDecreaseCanvasSize}>
    <i class="las la-minus" />
  </button>
  <span class="canvasSize">{canvasSize}</span>
  <button on:click={onIncreaseCanvasSize}>
    <i class="las la-plus" />
  </button>
</div>

<style lang="sass" type="text/sass">

:global(.copied)
  position: relative
  &::after
    font-size: 1rem
    user-select: none
    pointer-events: none
    content: "Copied to clipboard!"
    position: absolute
    font-size: 1.5em
    width: 10em
    height: 1em
    padding: 0.5em
    bottom: -2.5em
    left: -5em 
    background: #111
    color: #fafafa
    z-index: 100


#toolbar
  padding: 0
  position: absolute
  left: -64px
  width: 48px
  display: flex
  flex-direction: column

  .palette
    position: relative
    &:after
      display: block
      content: ""
      height: 48px

  button, label, .canvasSize
    text-align: center
    font-size: 32px
    flex: 1
    border: 1px solid #fafafa
    padding: 0
    color: #fafafa
    box-sizing: border-box
    cursor: pointer
    background: #111
    height: 48px
    line-height: 48px
    &:hover
      background: #333
    &.selected
      box-shadow: inset 2px 2px 0 #111,inset -2px -2px 0 #111
      &:after
        border: 2px dashed #fff
        height: 44px

  .canvasSize
    font-size: 20px
  input[type="file"] 
    display: none

</style>

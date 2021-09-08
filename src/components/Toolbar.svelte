<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let colors;
  export let paletteIndex;

  let files;
 	$: if (files) {
		for (const file of files) {
      dispatch("fileChange", { file });
		}
	}

  const onPaletteClick = (i) => {
    paletteIndex = i
  }

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
  <button title="Share" on:click={() => dispatch("shareClick")}>
    <i class="las la-share" />
  </button>
  <button on:click={() => dispatch("serialClick")}>
    <i class="las la-plug" />
  </button>
  {#each colors as color, i}
      <button 
        class="palette" 
        on:click={() => onPaletteClick(i)}
        style="background-color:{color}"
      >{i}</button
    >
  {/each}
</div>

<style lang="sass" type="text/sass">

#toolbar
  padding: 0
  position: absolute
  left: -64px
  width: 48px
  display: flex
  flex-direction: column

  .palette
    font-size: 0
    position: relative
    div
      button
        font-size: 16px
        height: auto

  input[type="file"] 
    display: none

  button, label
    text-align: center
    font-size: 32px
    flex: 1
    border: 1px solid #fafafa
    color: #fafafa
    box-sizing: border-box
    cursor: pointer
    background: #111
    height: 48px
    line-height: 48px
    &:hover
      background: #333
  input
    overflow: hidden
    &::-webkit-file-upload-button
      width: 1px
      visibility: hidden

</style>

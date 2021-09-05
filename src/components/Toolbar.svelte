<script>
  let colors = [0,1,2,3]
  const handleClick = (color) => {
    colors = colors.filter( (c) => c !== color)
  }
</script>

<div id="toolbar">
  <label for="filepicker" id="filepicker-label">
    <i class="las la-file-upload"></i>
  </label>
  <input id="filepicker" type="file" />
  <button id="download" title="Download">
    <i class="las la-save"></i>
  </button>
  <button id="export" title="Export">
    <i class="las la-download"></i>
  </button>
  <button id="share" title="Share">
    <i class="las la-share"></i>
  </button>
  <button id="serial">
    <i class="las la-plug"></i>
  </button>
  {#each colors as color}
    <button class="palette" on:click={() => handleClick(color)}>{color}</button>
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

<script>
    export let texto = "Texto"
    export let emoji = ""
</script>
<button class="btn btn-outline-dark" on:click {...$$restProps} >
    {#if emoji}
    {emoji}<br/>
    {/if}
    {texto}
</button>
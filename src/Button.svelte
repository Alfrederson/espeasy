<script>
    export let texto = "Texto"
    export let emoji = ""
</script>
<button class="btn btn-primary" on:click {...$$restProps} >
    {#if emoji}
    {emoji}<br/>
    {/if}
    {texto}
</button>
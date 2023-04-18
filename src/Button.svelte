<script>
    export let texto = "Texto"
    export let emoji = ""
</script>

<button class="btn btn-primary" on:click {...$$restProps} style="max-width:8em" >
    {#if emoji}
    {emoji}<br/>
    {/if}
    {texto}
</button>
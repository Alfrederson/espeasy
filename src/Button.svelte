<script>
    export let texto = "Texto"
</script>
<button class="btn btn-primary" on:click {...$$restProps} >
    {texto}
</button>
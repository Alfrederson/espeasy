<style>
    .fullscreen{
        height: 100vh;
        width: 100vw;
        display:flex;
        flex-flow:row;
        padding: 0px;
    }
    :global(.fullscreen > div) {
        display:flex;
        flex-flow:column;
    }
    :global(.overlay){
        display:block;
        top: 0px;
        position:fixed;
        width:100vw;
        height:100vh;
        background-color:rgba(0,0,0,0.25);
    }
</style>
<div class="container-fluid fullscreen bg-light">
    <div class="container-fluid pb-3 pt-3">
        <slot/>
    </div>
</div>
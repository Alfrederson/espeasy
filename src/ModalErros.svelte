<script>
    export let title=""
    export let erro =""

    /**
     * @type {string[]}
     */
     export let linhas=[]

    export let aberto=false;
    /**
     * @param {string} _title
     * @param {string} _erro
     * @param {string} mensagens
     */
     export function abrir(_title, _erro, mensagens){
        title = _title
        erro  = _erro
        linhas = mensagens ? mensagens.split("\\n") : []
        
        aberto=true
    }
    function fecharModal(){
        aberto=false
    }
</script>
{#if aberto}
<div class="modal fade {aberto ? "show" : ""}"
    style="display:block; top: 0px; position:fixed; width:100vw; height:100vh; background-color:rgba(0,0,0,0.25)">
    <div class="modal-dialog {aberto ? "show" : ""} modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="staticBackdropLabel">{title}</h5>
            </div>
            <div class="modal-body">
                <p>Parece que tem algo errado no seu código.</p>
                <ul>
                {#each linhas as linha}
                    <li>{linha}</li>
                {/each}
                </ul>
                {erro}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" on:click={fecharModal}>OK</button>
            </div>
        </div>
    </div>
</div>
{/if}
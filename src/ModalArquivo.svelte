<script>
    import { fly, fade } from "svelte/transition"
    
    /**
     * @typedef {Object} Arquivo
     * @property {string} nome
     * @property {number} tamanho
    */
   
    /** @type{Arquivo[]}*/
    export let arquivos = []
    let aberto = false

    function ok(){
        aberto=false
    }
    export function abrir(){
        aberto=true
    }
</script>
{#if aberto}
<div class="modal fade show"
    style="display:block; top: 0px; position:fixed; width:100vw; height:100vh; background-color:rgba(0,0,0,0.25)">
    <div class="modal-dialog show modal-lg"
        in:fly={{ x: -200, duration: 200 }}
        out:fade={{ duration: 100 }}>
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="staticBackdropLabel">Arquivos na memória:</h5>
            </div>
            <div class="modal-body">
                <ul class="list-group-flush">
                    {#each arquivos as arquivo}
                        <li class="list-group-item">
                            {arquivo.nome} {arquivo.tamanho} bytes
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-primary" on:click={ok}>OK</button>
            </div>
        </div>
    </div>
</div>
{/if}
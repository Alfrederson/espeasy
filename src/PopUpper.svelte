<script>
    import { fly, fade } from 'svelte/transition';

    let uid = 0;

    /**
    @typedef Mensagem
    @property {number } [id] 
    @property {string } [emoji] 
    @property {string } [msg] 
    @property {number } [tempo] 
    */

    /** @type {Mensagem[]} */
    let mensagens = [
    ]

    /**
     * @param {number | undefined} id
     */
    function remover(id){
        if(!id)
            return;
        let qual = id
        mensagens = mensagens.filter( (elemento) => elemento.id !== qual)
    }


    /**
     * @param {Mensagem} msg
     */
     export function adicionar(msg){
        let novaMensagem = {...msg, id: ++uid }
        mensagens.unshift( novaMensagem )
        mensagens = mensagens

        if(msg.tempo){
            setTimeout(()=>{
                remover(novaMensagem.id)
            },msg.tempo)
        }
    }

</script>




<div class="container fixed-top" style="margin-top: 8em">
    {#each mensagens as mensagem, i (mensagem)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="alert alert-primary alert-dismissible shadow-sm"
        in:fly={{ x: -200, duration: 200 }}
        out:fly={{ x: 200, duration: 200 }}>
        {mensagem.emoji}
        <strong>{mensagem.msg}</strong>
        
        {#if !mensagem.tempo}
            <button type="button" class="btn-close" on:click={() => remover(mensagem.id)}>
            </button>
        {/if}
    </div>
    {/each}
</div>



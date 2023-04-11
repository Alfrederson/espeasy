<script>
    import { codigo } from "../codigo";

    import Button from "../Button.svelte";
    import ModalErros from "../ModalErros.svelte";

    /**
     * @type {ModalErros}
     */
    let modalErros

    const compiler_url = import.meta.env.VITE_COMPILER_URL
    /**
     * @typedef {Object} Erro
     * @property {string} err?
     * @property {string} msg?
     * @property {string} res?
    */
    /**
     * @typedef {Object} Estado
     * @property {boolean} aguardando - Indicates whether the estado is currently waiting for something
     * @property {string} fonte - The source code associated with the estado
     * @property {Uint8Array|undefined} bytes - The raw bytes associated with the estado, if any
     * @property {Erro|undefined} erro - Any error message associated with the estado
     * @property {string} info - Any information message associated with the estado
     * @property {boolean} podeUpar - Indicates whether the estado can be uploaded
     */

    /** @type {Estado} */
    const estado = {
        aguardando : false,
        fonte      : codigo,
        bytes      : undefined,
        erro       : undefined,
        info       : "",
        podeUpar   : false,
    }

    // Isso vai fazer o seguinte:
    // - pega o código fonte
    // - faz uma requisição POST em compiler_url.
    // - se o status for 200, faço download do arquivo pra uma variável.
    // - se não for 200, transformo a resposta em JSON e exibo as mensagens/erros.

    async function compilar(){
        if(estado.aguardando)
            return;
        estado.podeUpar = false
        estado.aguardando = true
        estado.erro = undefined
        estado.info = ""

        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "text/plain");

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: estado.fonte,
        };

        let response = await fetch(compiler_url +"/compila", requestOptions)

        estado.aguardando = false

        if(response.status != 200){
            let erro = await response.json()
            estado.erro = erro

            modalErros.abrir(
                erro.msg,
                erro.err,
                erro.res
            )

            return
        }
        let buffer = await response.arrayBuffer()
        estado.bytes    = new Uint8Array(buffer);   
        estado.info     = "OK! Sketch tem "+estado.bytes.length + " bytes."
        estado.podeUpar = true
    }

    // Isso vai fazer o seguinte:
    // - ver se a última compilação foi válida.
    // - ver o tamanho do firmware.
    // - enviar o comando _up( "firmware.lc" , tamanho ) pro interpretador de lua
    // - quando terminar, vai enviar o comando dofile("firmware.lc")
    function upar(){
        if(!estado.bytes)
            return;

        let str = ""
        for(let i = 0; i < estado.bytes.length; i++){
            str += (estado.bytes[i]).toString(16).padStart(2,"0") + " "
        }     
        console.log(str)   
    }

</script>

<svelte:head>
    <title>ESPEasy</title>
</svelte:head>

<ModalErros bind:this={modalErros} />
    
<div class="row">
    <div class="col sm-4">
        <h5>ESPEasy</h5>
    </div>
    <div class="col sm-5">
        {#if estado.aguardando}
            <h5>Aguardando...</h5>
        {/if}
        {#if estado.info}
            <h5>{estado.info}</h5>
        {/if}
            
    </div>
</div>
<h6>
    URL do compilador: {compiler_url.slice(0,20) + "..." }
</h6>  


<textarea class="form-control" rows="20" bind:value={estado.fonte} />

<div class="is-dark mt-3">
    <Button texto="Compilar" on:click={compilar}/>
    <Button texto="Upar"     on:click={upar}    disabled={ !estado.podeUpar }/>
</div>


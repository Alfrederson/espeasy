<script>
    // 100% GERADO PELO CHAT-GPT VERSÃO FREE
    // será que tem como fazer isso de um jeito melhor? no idea
    import firmwares from "../firmwares/firmwares";

    import { codigo }   from "../codigo";
    import { uploader } from "../uploader";

    import SerialPort from "../serial/serial";

    import { fade } from "svelte/transition"

    import Button from "../Button.svelte";
    import ModalErros from "../ModalErros.svelte";
    import PopUpper from "../PopUpper.svelte";
    import ModalArquivo from "../ModalArquivo.svelte";

    /** @type {ModalErros}*/
    let modalErros 

    /** @type {ModalArquivo}*/
    let modalArquivo

    /** @type {PopUpper}*/
    let popUpper   

    const compiler_url = import.meta.env.VITE_COMPILER_URL

    /**
     * @typedef {Object} Arquivo
     * @property {string} nome
     * @property {number} tamanho
    */

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
     * @property {any} info - Any information message associated with the estado
     * @property {string} arquivoNome - Any information message associated with the estado
     * @property {boolean} podeUpar - Indicates whether the estado can be uploaded
     * @property {number} estadoConexao - estado atual
     * @property {SerialPort|undefined} serialPort
     * @property {string} recebido
     * @property {Arquivo[]} fileList
     * @property {boolean} showFiles
     */

     const DESCONECTADO =0,
           CONECTANDO   =1,
           CONECTADO    =2
    // isso é o label do botão lá em baixo.
    const estadosConexao = [
        "Conectar",
        "Conectando",
        "Desconectar"
    ]


    /** @type {Estado} */
    const estado = {
        aguardando : false,
        fonte      : "",
        bytes      : undefined,
        erro       : undefined,
        info       : {compilados: 0, tempo : "0ms"},
        podeUpar   : false,
        arquivoNome: "user.lua",

        estadoConexao : DESCONECTADO,

        serialPort : undefined,
        recebido   : "",

        fileList : [
            {nome : "teste.lua", tamanho: 123}
        ],
        showFiles : false
    }


    // Isso vai fazer o seguinte:
    // - pega o código fonte
    // - faz uma requisição POST em compiler_url.
    // - se o status for 200, faço download do arquivo pra uma variável.
    // - se não for 200, transformo a resposta em JSON e exibo as mensagens/erros.
    if(typeof window !== 'undefined')
        estado.fonte = localStorage.getItem("codigo") ?? codigo
    async function compilar(){
        localStorage.setItem("codigo", estado.fonte)
        if(estado.aguardando)
            return;
        estado.aguardando = true
        

        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "text/plain");

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: estado.fonte,
        }
        let response = await fetch(compiler_url +"/compila/53", requestOptions)

        estado.aguardando = false
        
        if(response.status != 200){
            let erro = await response.json()
            modalErros.abrir(
                erro.msg,
                erro.err,
                erro.res
            )
            return
        }
        let buffer = await response.arrayBuffer()
        estado.bytes    = new Uint8Array(buffer);   

        popUpper.adicionar({ emoji: "🌐", msg: "OK! Sketch tem "+estado.bytes.length + " bytes."})
        fetch( compiler_url +"/status" ).then( result=> result.json() ).then( result => estado.info = result)
    }


    // Isso vai fazer o seguinte:
    // - ver se a última compilação foi válida.
    // - ver o tamanho do firmware.
    // - enviar o comando _up( "firmware.lc" , tamanho ) pro interpretador de lua
    // - quando terminar, vai enviar o comando dofile(estado.arquivoNome)
    /**
     * @param {number | undefined} x
     */
    async function delay(x){
        await new Promise( (resolve,reject)=>{
            setTimeout(resolve,x)
        })
    }

    /**
     * Envia uma string pro esp32 com a minha api horrorosa
     * @param {string} str - The input string to convert.
     */
    function sendString(str){
        if(!estado || !estado.serialPort)
            return;
        const uintArray = Array.from({ length: str.length })
        for (let i = 0; i < str.length; i++) {
            uintArray[i] = str.charCodeAt(i);
        }
        estado.serialPort.sendBytes(uintArray)
    }

    /**
     * Isso vai depender do "estado" atual da "Máquina."
     * @param {string} msg
     */
     function processar_mensagem(msg){
        if(msg == "READY"){
            estado.podeUpar=true   
            estado.estadoConexao = CONECTADO               
            return
        }
        if(!msg)
            return;

        let parts = msg.split(" ")

        if(parts[0] == "BEGIN"){
            // segunda parte é o tamanho do pacote.
            console.log("Pack size: "+parts[1])
            uploader.setPackSize(  parseInt( parts[1] )  )
            uploader.sendPart()
            return
        }

        if(parts[0] == "FILES"){
            estado.fileList = []
            return
        }
        if(parts[0] == "FILE"){
            estado.fileList.push({
                "nome"   : parts[1],
                "tamanho": parseInt(parts[2])
            })
            estado.fileList = estado.fileList
        }

        if(parts[0] == "OK"){
            uploader.sendPart()
            return
        }

        if(parts[0] == "END"){
            // sendString(`dofile('"${estado.arquivoNome}"')\n`)
            popUpper.adicionar({ emoji: "🆙", msg : "Pronto!"})
            return
        }

        if(parts[0] == "SAY" || parts[0] == "ERRO"){
            popUpper.adicionar({ emoji: "🤖", msg : msg.slice(4), cor: "success"})
        }

    }

    async function upar(){
        if(!estado.bytes){
            popUpper.adicionar({ msg: "Compile o código antes de upar.", cor: "warning"})
            modalErros.abrir(
                "Ops",
                "Não tem um sketch compilado ainda.",
                ""
            )
            return;
        }
        if(estado.estadoConexao !== CONECTADO){
            popUpper.adicionar({ msg: "Não estou conectado na placa", cor: "warning"})
            return;
        }
        if(uploader.busy){
            popUpper.adicionar({ msg: "Upando...", cor: "warning"})
            return;
        }

        sendString('uart.up("'+estado.arquivoNome+'",'+estado.bytes.length+")\n")        
        uploader.prepareUpload(estado.bytes, estado.serialPort, {
            onFinished(){
                estado.podeUpar = true
            }
        })
    }  
    
    async function rodar(){
        if(estado.estadoConexao !== CONECTADO)
            return;

        sendString(`dofile("${estado.arquivoNome}")\n`)
    }

    function conectar(){
        if(!estado.serialPort){
            estado.serialPort = new SerialPort( x =>{
                console.log("LOG: ",x)
            })            
        }

        if(estado.estadoConexao == CONECTADO){
            estado.serialPort.disconnect()
            estado.estadoConexao = DESCONECTADO
            return;
        }
        estado.estadoConexao = CONECTANDO
        estado.serialPort.connect({baud: "115200"},{
            onListen(x){
                for(let i = 0; i < x.length; i++){
                    estado.recebido += String.fromCharCode(x[i])
                    if(estado.recebido.length<2)
                        continue;
                    if(  estado.recebido[ estado.recebido.length -1] === "\n" ){
                        let msg = estado.recebido.trim()
                        processar_mensagem(msg)
                        console.log(msg)
                        estado.recebido = ""
                    }                    
                }
            },
            onConnect(x){
                console.log("Conectado!")
                estado.estadoConexao = CONECTADO

                popUpper.adicionar({ emoji: "🔌", msg: "Conectado!", tempo: 1500})
            },
            onDisconnect(){
            },
            onError(){
                
            }
        }).catch( e =>{
            modalErros.abrir("Não consegui conectar!",e,"")
            estado.estadoConexao = DESCONECTADO
        })        
    }
    let textoBotaoUpar = "Upar";
    let textoBotaoConectar = "Conectar";

    let uparDisabled = true

    $: uparDisabled = !estado.podeUpar || uploader.busy
    $: textoBotaoConectar = estadosConexao[estado.estadoConexao] ?? ""


</script>

<style>
    .editor{
        display:flex;
    }
</style>

<svelte:head>
    <title>ESPEasy</title>
</svelte:head>

<PopUpper bind:this={popUpper}/>
<ModalErros bind:this={modalErros} />
<ModalArquivo
    bind:this={modalArquivo}
    arquivos={estado.fileList} />

<div class="header">
        <strong>espeasy</strong>
        {#if estado.info}
        <div in:fade={{duration: 1000}}>
        {estado.info.compilados} códigos compilados em {estado.info.tempo}
        </div>
        {/if}        
</div>

<div class="editor mb-2" style="display:flex; flex-flow:row; flex-grow:1">
    <textarea class="form-control" style="height: 100%; flex-grow:1" bind:value={estado.fonte} />
</div>

{#if estado.showFiles}
    <div class="container fixed-top bg-white">
        <ul class="list-group list-group-flush">
            {#each estado.fileList as file}
                <li class="list-group-item bg-transparent" style="white-space:nowrap">{file.nome} {file.tamanho} bytes </li>
            {/each}
        </ul>
    </div>
{/if}

<div class="input-group" style="max-width:36em">
    <div class="input-group-text">Nome do arquivo:</div>
    <input type="text" class="form-control" placeholder="init.lua" bind:value={estado.arquivoNome}/>
    <button class="btn input-group-button" on:click={ modalArquivo.abrir }>Ver arquivos...</button>
</div>
<div class="btn-group mt-2 gap-1" style="max-width:40em">
    <Button emoji="🔌" texto="{textoBotaoConectar} " on:click={conectar} disabled={ estado.estadoConexao == CONECTANDO }/>
    <Button emoji="🛠️" texto="Compilar"  on:click={compilar} disabled={estado.aguardando}/>
    <Button emoji="🔥" texto="{textoBotaoUpar}"     on:click={upar}    disabled={ uparDisabled }/>
    <Button emoji="🚀" texto="Executar" on:click={rodar} disabled={ estado.estadoConexao !== CONECTADO}/> 

</div>


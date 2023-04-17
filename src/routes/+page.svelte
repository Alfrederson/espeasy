<script>
    // será que tem como fazer isso de um jeito melhor? no idea
    import flashConfig from "../firmware/esp32-wroom";

    import { codigo } from "../codigo";

    import SerialPort from "../serial/serial";
    import { uploader } from "../uploader";

    import Button from "../Button.svelte";
    import ModalErros from "../ModalErros.svelte";

    import PopUpper from "../PopUpper.svelte";

    /** @type {ModalErros}*/
    let modalErros 

    /** @type {PopUpper}*/
    let popUpper   

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
     * @property {string} arquivoNome - Any information message associated with the estado
     * @property {boolean} podeUpar - Indicates whether the estado can be uploaded
     * @property {number} estadoConexao - estado atual
     * @property {SerialPort|undefined} serialPort
     * @property {string} recebido
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
        info       : "",
        podeUpar   : false,
        arquivoNome: "user.lua",

        estadoConexao : DESCONECTADO,

        serialPort : undefined,
        recebido   : "",
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
        estado.erro = undefined
        estado.info = ""

        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "text/plain");

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: estado.fonte,
        };

        let response = await fetch(compiler_url +"/compila/53", requestOptions)

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

        popUpper.adicionar({ emoji: "🌐", msg: "OK! Sketch tem "+estado.bytes.length + " bytes."})
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

    const STATE_BOOTING = 0;
    const STATE_IDLE    = 1;

    let modo = STATE_IDLE;



    /**
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
            popUpper.adicionar({ emoji: "🤖", msg : msg.slice(4)})
        }

    }

    async function upar(){
        if(!estado.bytes){
            modalErros.abrir(
                "Ops",
                "Não tem um sketch compilado ainda.",
                ""
            )
            return;
        }
        if(estado.estadoConexao !== CONECTADO){
            console.log("estadoConexão != ",CONECTADO,"(",estado.estadoConexao,")")
            return;
        }
        if(uploader.busy){
            console.log("Uploader busy")
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
        flex-grow:1;
    }
</style>

<svelte:head>
    <title>ESPEasy</title>
</svelte:head>

<PopUpper bind:this={popUpper}/>
<ModalErros bind:this={modalErros} />
    
<div class="row">
    <div class="col sm-4">
        <h5>ESPEasy</h5>
    </div>
    <div class="col sm-5">
        <h5>{estado.info ?? ""}</h5>
    </div>
</div>


<textarea class="form-control editor mb-3" rows="20" bind:value={estado.fonte} />

<div class="input-group" style="max-width:36em">
    <div class="input-group-text">Nome do arquivo:</div>
    <input type="text" class="form-control" placeholder="init.lua" bind:value={estado.arquivoNome}/>
</div>
<div class="btn-group mt-3" style="max-width:36em">
    <Button emoji="🔌" texto="{textoBotaoConectar} " on:click={conectar} disabled={ estado.estadoConexao == CONECTANDO }/>
    <Button emoji="🛠️" texto="Compilar"  on:click={compilar} disabled={estado.aguardando}/>
    <Button emoji="🔥" texto="{textoBotaoUpar}"     on:click={upar}    disabled={ uparDisabled }/>
    <Button emoji="🚀" texto="Executar" on:click={rodar} disabled={ estado.estadoConexao !== CONECTADO}/> 
</div>


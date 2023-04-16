<script>
    // será que tem como fazer isso de um jeito melhor? no idea
    import flashConfig from "../firmware/esp32-wroom";

    import { codigo } from "../codigo";

    import SerialPort from "../serial/serial";

    import Button from "../Button.svelte";
    import ModalErros from "../ModalErros.svelte";
    import Layout from "./+layout.svelte";


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
        estado.info     = "OK! Sketch tem "+estado.bytes.length + " bytes."
    }

    // Isso vai fazer o seguinte:
    // - ver se a última compilação foi válida.
    // - ver o tamanho do firmware.
    // - enviar o comando _up( "firmware.lc" , tamanho ) pro interpretador de lua
    // - quando terminar, vai enviar o comando dofile("firmware.lc")
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


    const uploader = {
        bytes : new Uint8Array(0),
        to_go : 0,
        start : 0,
        end   : 16,
        finished: false,
        busy    : false,
        /**
         * @param {Uint8Array} bytes
         */
        prepareUpload(bytes){
            this.bytes    = bytes
            this.to_go    = bytes.length
            this.start    = 0
            this.end      = 16
            this.finished=false
            this.busy    =true
            console.log("Enviarei "+bytes.length+" bytes")
        },
        sendPart(){
            if(!this.bytes)
                return;
            // ooooooooooooooooooooooooooooo
            // ^start      ^end
            // ooooooooooooooooooooooooooooo
            //              ^start      ^end
            // ooooooooooooooooooooooooooooo
            //                          ^s.^end
            let pack = this.bytes.slice( this.start, this.end)
            this.start = this.end
            this.end = this.to_go >= 16 ? this.start + 16 : this.start+ this.to_go
            this.to_go -= this.to_go >= 16 ? 16 : this.to_go
            // manda...
            estado.serialPort?.sendBytes([...pack])

            if(this.to_go == 0){
                this.finished = true
                this.busy     = false
                estado.podeUpar = true
                return
            }

        }
    }

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

        if(parts[0] == "BEGIN" || parts[0] == "OK"){
            uploader.sendPart()
            return
        }

        if(parts[0] == "END"){
            sendString(`dofile("user.lua")\n`)
            return
        }

    }

    async function upar(){
        if(!estado.bytes){
            console.log("E 100 bytes")
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
        sendString("uart.up("+estado.bytes.length+")\n")        
        uploader.prepareUpload(estado.bytes)
    }  
    
    async function rodar(){
        if(estado.estadoConexao !== CONECTADO)
            return;

        sendString(`dofile("user.lua")\n`)
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
                        console.log("L["+msg+"]")
                        estado.recebido = ""
                    }                    
                }
            },
            onConnect(x){
                console.log("Conectado!")
                estado.estadoConexao = CONECTADO
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

<svelte:head>
    <title>ESPEasy</title>
</svelte:head>

<ModalErros bind:this={modalErros} />
    
<div class="row">
    <div class="col sm-4">
        <h5>ESPEasy</h5>
    </div>
    <div class="col sm-5">
        <h5>{estado.info ?? ""}</h5>
    </div>
</div>
<h6>Lua.cross.cloud: {compiler_url.slice(0,20) + "..." }</h6>  

<textarea class="form-control" rows="20" bind:value={estado.fonte} />

<p>
    {estado.podeUpar}
    {estado.estadoConexao}
    {uploader.busy}
    {!estado.podeUpar || uploader.busy}
    {uparDisabled}
</p>
<div class="is-dark mt-3">
    <Button emoji="🛠️" texto="Compilar"  on:click={compilar} disabled={estado.aguardando}/>
    <Button emoji="🔌" texto="{textoBotaoConectar} " on:click={conectar} disabled={ estado.estadoConexao == CONECTANDO }/>
    <Button emoji="🔥" texto="{textoBotaoUpar}"     on:click={upar}    disabled={ uparDisabled }/>
    <Button emoji="🚀" texto="Executar" on:click={rodar} disabled={ estado.estadoConexao !== CONECTADO}/> 
</div>


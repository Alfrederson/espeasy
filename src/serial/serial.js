
/**
 * @typedef {function(any): void} Handler
 */

/**
 * @typedef {Object} Handlers
 * @property {Handler | undefined} onListen A callback function to be called when the server starts listening.
 * @property {Handler | undefined} onConnect A callback function to be called when a client connects to the server.
 * @property {Handler | undefined} onDisconnect A callback function to be called when a client disconnects from the server.
 * @property {Handler | undefined} onError A callback function to be called when an error occurs on the server.
 */
 


export const Helper = {
    intToBytes : (/** @type{Number} */ val, /** @type{Number} */ length) =>
    new Uint8Array(length).map( (x,k) =>
      (val & (0xFF << 8*k)) >> (8*k) // picks k'th byte and shift right until it's the first byte
    )
}


/**
 * @param {{ (...data: any[]): void; (message?: any, ...optionalParams: any[]): void; }} logger
 */
function SerialPort(logger){
    // só pra ter definição.

    /**
     * An object containing callback functions for handling server events.
     * @type {Handlers}
     */
        this.handlers = {
        onListen : undefined,
        onConnect : undefined,
        onDisconnect : undefined,
        onError : undefined,
    }

    this._port = null
    this._isConnected = false
    this._reader = null // urgh
    this._keepReading = false
    // @ts-ignore
    this._serial = navigator["serial"]
    this._logger = logger ?? console.log

    return this
}

SerialPort.prototype = {
    hasSerial(){
        return this._serial ?? false
    },
    isConnected(){
        return this._isConnected
    },

    /**
     * @param {((arg0: any) => void) | undefined} listener
     */
    async readUntilClosed(listener){
        while(this._port.readable && this._keepReading){
            this._reader = this._port.readable.getReader()
            try{
                while(true){
                    const { value, done} = await this._reader.read()
                    if(done)
                        break
                    if(listener)
                        listener(value)
                }
            }catch(error){
                // dá pra ignorar esses erros na força do ódio
                console.log("Ignorando: "+error)
            }finally{
                this._reader.releaseLock()
            }
        }
    },
    /**
     * @param {{ baud: string; }} options
     * @param {{ onListen: undefined|Handler; onConnect: undefined|Handler; onDisconnect: undefined|Handler; onError: undefined|Handler; }} handlers
     */
    async connect(options, handlers){        
        this.handlers = handlers

        this._logger("Tentando conectar...")
        if(!this.hasSerial())
            throw "Navegador não suporta WebSerial."
        
        if(!this._port){
            this._port = await this._serial.requestPort()

            this._port.addEventListener("disconnect", () =>{
                this._logger("Dispositivo desconectado.")
                this.disconnect()
                this._port = null
            })
        }

        await this._port.open({
            baudRate: options.baud
        })

        this._logger("Abrindo com baud: "+options.baud)
        this._isConnected=true

        if(this.handlers.onConnect){
            // @ts-ignore
            this.handlers.onConnect()
        }
        this._logger("Conectado.")

        this._keepReading = true
        await this.readUntilClosed(this.handlers.onListen)
    },
    async dtr(){
        if(this._port){
            await this._port.setSignals({dataTerminalReady: false})
            await new Promise(r => setTimeout(r,100))
            await this._port.setSignals({dataTerminalReady: true});
        }
    },
    async disconnect(){
        if(!this._isConnected){
            console.log("Desconectando porta já desconectada.")
            return
        }
        //this._keepReading=false
        try{
            this._keepReading = false
            await this._reader.cancel()
            await this._port.close()
        }catch(e){
            // isso é ignorável.
            this._logger("Erro fechando porta: "+e)
        }
        this._isConnected=false
    },
    async sendBytes(/** @type { number[] }*/bytes){
        try{
            const writer = this._port.writable.getWriter()
            await writer.write(new Uint8Array(bytes) )
            writer.releaseLock()
        }catch(e){
            this._logger("Erro enviando bytes:"+e)
        }
    }
}

export default SerialPort;




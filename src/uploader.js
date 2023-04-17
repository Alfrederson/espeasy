
export const uploader = {
    serialPort: { sendBytes : (/** @type {number[]} */ b) =>{} },
    bytes : new Uint8Array(0),
    packSize: 0,
    to_go : 0,
    start : 0,
    end   : 0,
    finished: false,
    busy    : false,
    callbacks : {
        onFinished : () => {}
    },
    /**
     * @param {Uint8Array} bytes
     * @param {any} serialPort
     * @param {any} callbacks
     */
    prepareUpload(bytes, serialPort, callbacks){
        this.serialPort = serialPort
        this.bytes    = bytes
        this.to_go    = bytes.length
        this.start    = 0
        this.packSize = 0
        this.end      = 0
        this.finished=false
        this.busy    =true
        this.callbacks = callbacks
        console.log("Enviarei "+bytes.length+" bytes")
    },
    // isso chamado quando o ESP32 manda "BEGIN x y".
    // s é o x, representando quantos bytes eu mando em cada pacote.
    /**
     * @param {number} s = quantos bytes eu vou enviar em cada pacote.
     */
    setPackSize(s){
        this.packSize = s
    },
    sendPart(){
        if(!this.bytes){
            return;
        }
        if(this.packSize == 0){
            return;
        }
        let partSize = this.packSize
        if(this.end == 0){
            this.end = partSize
        }
        
        // ooooooooooooooooooooooooooooo
        // ^start      ^end
        // ooooooooooooooooooooooooooooo
        //              ^start      ^end
        // ooooooooooooooooooooooooooooo
        //                          ^s.^end
        let pack = this.bytes.slice( this.start, this.end)
        this.start = this.end
        this.end = this.to_go >= partSize ? this.start + partSize : this.start+ this.to_go
        this.to_go -= this.to_go >= partSize ? partSize : this.to_go
        // manda...
        this.serialPort?.sendBytes([...pack])

        if(this.to_go == 0){
            this.finished = true
            this.busy     = false
            if(this.callbacks  && this.callbacks.onFinished){
                this.callbacks.onFinished()
            }
            return
        }

    }
}


import { Transport } from 'esptool-js'

const estado = {
    conectado : false
}

/**
 * @param {{ [x: string]: number; }} config é só a posição dos arquivos na memória flash.
 */
function upar_firmware(
    config
){
    // config é só uma série de 
    // envia o troço lá
    console.log(
        config["partition.bin"],
        config["Nodemcu.bin"],
        config["bootloader.bin"]
    )
}

export {
    upar_firmware
}
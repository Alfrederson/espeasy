// cada entrada nesse dicionário deve corresponder a uma pasta
// dentro do diretório static/firmware.
//
// ex: esp32-wroom tem todos os .bin dentro da pasta static/firmware/esp32-wroom


const firmwares = {
    "esp32-wroom" : {
        "bootloader.bin": 0x1000,
        "partitions.bin": 0x8000,
        "NodeMCU.bin"   : 0x10000    
    }
}

export default firmwares
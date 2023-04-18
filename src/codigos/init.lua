
function inicializar()
  -- listar arquivos
  l = file.list();
  print("FILES")
  for k,v in pairs(l) do
    print("FILE ".. k .. " " .. v)
  end
  
  wifi.start()
  -- wifi
  wifi.sta.on( "got_ip", function(ev,info)
    print("SAY Estou na rede!")
    dofile("conectado.lua")
  end )

  wifi.mode(wifi.STATION)
  station_cfg={}
  station_cfg.ssid="ssid"
  station_cfg.pwd="senha"
  wifi.sta.config(station_cfg)
  wifi.sta.connect()

  dofile("user.lua")
end

if _G._inicializado == nil then
 inicializar()
 _G._inicializado = true
else
 print("ERRO nao posso rodar init duas vezes.")
end
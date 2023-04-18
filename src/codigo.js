export let codigo = 

`
sclk = 18
mosi = 23
cs   = 15
dc   = 4
res  = 2

if _G.bus == nil then
 _G.bus = spi.master(spi.HSPI, {sclk=sclk, mosi=mosi})
end

if _G.disp == nil then
 _G.disp = u8g2.pcd8544_84x48(bus, cs, dc, res)
end

disp:setFontRefHeightExtendedText()
disp:setContrast(125)
disp:setFontPosTop()
disp:setFont( u8g2.font_6x10_tf )

contador = 0
x = 8
y = 10

vx = 3
vy = 2

function exibir()
  contador = contador + 1
  x = x + vx
  if x >= 79 or x <= 5 then
   vx = vx * -1
  end
  y = y + vy
  if y >= 43 or y <= 5 then
   vy = vy * -1
  end
  disp:clearBuffer()
  disp:drawCircle(x, y, 10, u8g2.DRAW_ALL)
  disp:drawStr(x-6,y-5,contador)
  disp:drawStr(1,1,"Hello world!")
  disp:drawStr(1,30,"espeasy")
  disp:drawStr(1,36,node.heap())
  disp:sendBuffer()
end

if _G.timer ~= nil then
 timer:stop()
end

timer = tmr.create()
timer:register(
  150,
  tmr.ALARM_AUTO,
  exibir
)
timer:start()    
`
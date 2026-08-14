// 章节：I2C 与 SPI 通信
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-08'] = {
  id: 'chapter-08',
  order: 8,
  icon: '📡',
  title: 'I2C 与 SPI 通信',
  summary: '认识总线协议的意义，掌握 I2C 两线制与 SPI 四线制的工作原理，学会用 Wire 库和 SPI 库读写 EEPROM、OLED 等常用器件，并能按场景选型。',
  sections: [
    {
      type: 'text',
      html: '<h3>为什么要用总线协议</h3><p>回顾前面的章节：我们用 GPIO 控制 LED，用 UART（串口）和电脑通信。假如现在要接一个温度传感器、一个 OLED 显示屏、一块 EEPROM（电可擦写存储器）存储芯片、一个电机驱动模块……如果每个模块都靠几根独立的 GPIO 线直连，单片机的引脚很快就会不够用，连线也变得又长又乱、容易出错。</p><p>于是出现了<b>总线（bus）</b>：一组共享的信号线，加上一套约定的<b>通信协议（protocol）</b>，让单片机用尽量少的引脚挂接多个设备。本章学习最常用的两种<b>同步串行总线</b>：<b>I2C（Inter-Integrated Circuit，集成电路间总线）</b>与<b>SPI（Serial Peripheral Interface，串行外设接口）</b>，并和上一章的 UART 对比。它们有一个共同点：都有独立的<b>时钟线</b>，收发双方靠时钟信号对齐数据位，因此叫"同步"。</p>',
    },
    {
      type: 'table',
      title: '三种常用串行总线对比（I2C / SPI / UART）',
      headers: ['对比项', 'I2C', 'SPI', 'UART'],
      rows: [
        ['信号线数量', '2 根（SDA + SCL）', '4 根（MOSI + MISO + SCK + CS）', '2 根（TX + RX）'],
        ['时钟', '同步：SCL 提供时钟', '同步：SCK 提供时钟', '异步：无时钟线，靠波特率'],
        ['传输方向', '半双工', '全双工', '全双工'],
        ['设备寻址', '7 位从机地址', '片选信号 CS（低有效）', '无地址，点对点'],
        ['典型速率', '100 kbit/s、400 kbit/s', '可达数十 Mbit/s', '常用 9600 ~ 115200 bit/s'],
        ['典型应用', 'EEPROM、传感器、OLED', 'SD 卡、SPI Flash、显示屏', '调试、GPS、蓝牙模块'],
      ],
    },
    {
      type: 'text',
      html: '<h3>I2C 总线的工作原理</h3><p>I2C 只需要两根线：<b>SDA（Serial Data，串行数据线）</b>和 <b>SCL（Serial Clock，串行时钟线）</b>。所有设备挂在同一条总线上，分两种角色：<b>主机（master）</b>负责产生时钟、发起通信；<b>从机（slave）</b>被主机寻址后才参与通信。总线可以挂接多个从机，靠<b>7 位从机地址（slave address）</b>区分彼此。</p><p>一次完整的 I2C 传输大致是：</p><ul><li><b>起始条件（START）</b>：SCL 为高电平时，SDA 由高变低，宣告传输开始。</li><li><b>发送地址</b>：主机发出 7 位从机地址 + 1 位读写位（R/W），地址匹配的从机应答。</li><li><b>数据传输</b>：每传 8 位数据后，接收方在第 9 个时钟拉低 SDA，给出<b>应答位 ACK（Acknowledge）</b>表示"收到"；收不到 ACK 说明从机没有响应。</li><li><b>停止条件（STOP）</b>：SCL 为高电平时，SDA 由低变高，传输结束。</li></ul><p>速率方面：<b>标准模式（Standard Mode）100 kbit/s</b>、<b>快速模式（Fast Mode）400 kbit/s</b>，高速模式可达 3.4 Mbit/s。I2C 的 SDA/SCL 是<b>开漏输出（open-drain）</b>，必须外接<b>上拉电阻（pull-up resistor）</b>（常见 4.7kΩ）才能产生高电平，这也是排查 I2C 不通时的第一检查点。</p>',
    },
    {
      type: 'code',
      title: 'Arduino Wire 库读写 I2C EEPROM（AT24C02）',
      code: `// Arduino Uno + AT24C02 EEPROM 模块（I2C 接口）
// 接线：A4(SDA) -> EEPROM 的 SDA，A5(SCL) -> EEPROM 的 SCL，VCC=5V，GND 共地
// AT24C02 的 7 位从机地址：A0/A1/A2 全部接地时为 0x50
#include <Wire.h>

#define EEPROM_ADDR 0x50   // 7 位从机地址（Wire 内部会自动左移 1 位）

void setup() {
  Serial.begin(9600);
  Wire.begin();            // 主机模式，默认引脚 A4(SDA)/A5(SCL)

  // ---- 向 EEPROM 地址 0x00 写入一个字节 0xAB ----
  Wire.beginTransmission(EEPROM_ADDR);  // 起始条件 + 从机地址
  Wire.write(0x00);                     // EEPROM 内部的字节地址
  Wire.write(0xAB);                     // 要写入的数据
  Wire.endTransmission();               // 停止条件
  delay(10);                            // EEPROM 写周期约 5ms

  // ---- 从地址 0x00 读回一个字节 ----
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write(0x00);                     // 先发送要读的内存地址
  Wire.endTransmission(false);          // 不发送停止条件（准备重复起始）
  Wire.requestFrom(EEPROM_ADDR, 1);     // 请求从机发回 1 个字节
  if (Wire.available()) {
    byte val = Wire.read();
    Serial.print("Read back: 0x");
    Serial.println(val, HEX);           // 应打印 0xAB
  }
}

void loop() {}`,
      note: '目标平台：Arduino Uno（实物接线或 Wokwi 仿真 I2C 器件），SDA=A4、SCL=A5；AT24C02 模块 A0/A1/A2 接地，7 位地址 0x50。注意 Wire 库传入的是 7 位地址，库内部会自动左移一位并附加读写位，所以不要写成数据手册上的 8 位地址 0xA0。',
    },
    {
      type: 'code',
      title: '用 Wire 库直接驱动 SSD1306 OLED（简化版）',
      code: `// Arduino Uno + SSD1306 OLED（128x64，I2C 接口）
// 接线：A4(SDA) -> OLED SDA，A5(SCL) -> OLED SCL，VCC=5V(或3.3V)，GND 共地
// 常见 SSD1306 模块的 7 位从机地址为 0x3C
#include <Wire.h>

#define OLED_ADDR 0x3C

// 发送命令：控制字节 0x00 表示"后面是命令"
void oledCmd(byte cmd) {
  Wire.beginTransmission(OLED_ADDR);
  Wire.write(0x00);
  Wire.write(cmd);
  Wire.endTransmission();
}

// 简化初始化：关闭显示 -> 水平寻址 -> 开电荷泵 -> 开启显示
void oledInit() {
  oledCmd(0xAE);
  oledCmd(0x20); oledCmd(0x00);   // 水平寻址模式
  oledCmd(0x8D); oledCmd(0x14);   // 电荷泵开启（内部升压）
  oledCmd(0xAF);                  // 开启显示
}

// 清屏：8 页 x 128 列全部写 0
void oledClear() {
  for (byte page = 0; page < 8; page++) {
    oledCmd(0xB0 | page);   // 选择页地址 0~7
    oledCmd(0x00);          // 列地址低 4 位
    oledCmd(0x10);          // 列地址高 4 位
    Wire.beginTransmission(OLED_ADDR);
    Wire.write(0x40);       // 控制字节：后面是显示数据
    for (int i = 0; i < 128; i++) Wire.write(0x00);
    Wire.endTransmission();
  }
}

void setup() {
  Wire.begin();
  oledInit();
  oledClear();
}

void loop() {}`,
      note: '目标平台：Arduino Uno + SSD1306 OLED（I2C 接口，Wokwi 可直接仿真），SDA=A4、SCL=A5，7 位地址 0x3C。示例演示了 I2C 设备常见的"控制字节"用法：0x00 表示随后是命令、0x40 表示随后是显示数据。运行后屏幕应全黑（已清屏），可作为理解显示库底层原理的最小驱动。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>I2C 排查清单：</b>① 必须接上拉电阻（4.7kΩ 左右），否则 SDA/SCL 一直为低、无法通信；② 分清 7 位地址与 8 位地址：数据手册常写 8 位写地址（如 0xA0），Arduino Wire 库需要 7 位地址（0x50），两者差一位；③ 3.3V 模块与 5V 单片机混接时注意电平匹配，必要时加双向电平转换模块；④ 如果 SDA 一直被拉低不释放，多半是某个从机把总线拉死（常见于从机供电异常），断电后重试；⑤ 先用 I2C 扫描程序确认设备实际地址，再写读写代码，能省大量排查时间。</p>',
    },
    {
      type: 'text',
      html: '<h3>SPI 总线的工作原理</h3><p>SPI 用<b>四根线</b>通信：</p><ul><li><b>MOSI（Master Out Slave In）</b>：主机输出、从机输入的数据线。</li><li><b>MISO（Master In Slave Out）</b>：从机输出、主机输入的数据线。</li><li><b>SCK（Serial Clock）</b>：主机产生的时钟线。</li><li><b>CS / SS（Chip Select，片选）</b>：低电平有效，选中哪个从机，哪个从机才参与通信。</li></ul><p>SPI 是<b>全双工（full-duplex）</b>：MOSI 发数据的同时，MISO 同步接收数据。原因是主从双方的<b>移位寄存器（shift register）</b>在同一个时钟节拍下同时移位——每来一个时钟沿，主机移出一位、从机也移出一位，收发互不阻塞。由于每个从机需要一根独立的 CS 线，挂的从机越多占用引脚越多，这是 SPI 相对 I2C 的代价。</p><p>SPI 的速率远高于 I2C（常用 1~数十 MHz），适合 SD 卡、SPI Flash、高速显示屏等大数据量场景。SPI 有 4 种模式，由 <b>CPOL（时钟极性）</b>与 <b>CPHA（时钟相位）</b>组合决定（Mode 0~3），Arduino 里用 <code>SPI.setDataMode()</code> 选择，常见器件用 Mode 0 或 Mode 3。</p>',
    },
    {
      type: 'code',
      title: 'Arduino SPI 写示例：74HC595 移位寄存器驱动 8 个 LED',
      code: `// Arduino Uno + 74HC595 移位寄存器（SPI 写方向示例）
// 接线：D11(MOSI) -> 74HC595 的 DS(14)，D13(SCK) -> SH_CP(11)
//      D10(SS)   -> ST_CP(12)，QA~QH 各接一个 LED（串 220Ω 限流电阻）
#include <SPI.h>

const int latchPin = 10;   // 借用 SS 引脚做锁存（ST_CP）

void setup() {
  pinMode(latchPin, OUTPUT);
  SPI.begin();                 // 主机模式，默认 MOSI=D11、SCK=D13
  SPI.setDataMode(SPI_MODE0);  // CPOL=0, CPHA=0，74HC595 常用
  SPI.setBitOrder(MSBFIRST);   // 高位先发出
}

// 把一个字节"移"进 74HC595，然后锁存到输出端
void shiftOut8(byte data) {
  digitalWrite(latchPin, LOW);   // 拉低：允许数据移位
  SPI.transfer(data);            // 通过 MOSI 逐位发出 8 位
  digitalWrite(latchPin, HIGH);  // 上升沿：输出端锁存并保持
}

void loop() {
  shiftOut8(0b10101010);   // 1、3、5、7 号 LED 亮
  delay(500);
  shiftOut8(0b01010101);   // 2、4、6、8 号 LED 亮
  delay(500);
}`,
      note: '目标平台：Arduino Uno；接线 D11(MOSI)→DS(14)、D13(SCK)→SH_CP(11)、D10(SS)→ST_CP(12)，输出端 QA~QH 各接一个 LED（串 220Ω 电阻）。SPI 主机模式默认占用 MOSI=D11、SCK=D13，这里借用 SS(D10) 作锁存引脚是 74HC595 的经典接法，可直接在 Wokwi 仿真运行。',
    },
    {
      type: 'code',
      title: 'SPI 全双工自测：MOSI 短接 MISO',
      code: `// Arduino Uno：用一根杜邦线把 D11(MOSI) 与 D12(MISO) 短接
// SPI.transfer() 发送一字节的同时，从 MISO 读回一字节（全双工）
#include <SPI.h>

void setup() {
  Serial.begin(9600);
  SPI.begin();
  SPI.setDataMode(SPI_MODE0);
  SPI.setBitOrder(MSBFIRST);
}

void loop() {
  byte sent = 0xA5;                     // 1010 0101
  byte received = SPI.transfer(sent);   // 发送的同时完成接收
  Serial.print("sent = 0x");
  Serial.print(sent, HEX);
  Serial.print("  received = 0x");
  Serial.println(received, HEX);
  delay(1000);
  // 若 MOSI 与 MISO 短接正确，received 应等于 0xA5
}`,
      note: '目标平台：Arduino Uno；需用杜邦线把 D11(MOSI) 与 D12(MISO) 短接。SPI.transfer() 在发出 8 位的同时读回 8 位，短接正确时收到的值应等于发送值 0xA5。这个实验直观展示了 SPI"一边发一边收"的全双工特性，也常用于排查接线。',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<b>为什么用总线</b>：用最少引脚、共享线路挂接多个设备，靠协议约定时序与寻址，避免"一个外设占一堆引脚"。',
        '<b>I2C</b>：两线（SDA/SCL）、开漏+上拉、7 位从机地址 + ACK 应答、起始/停止条件、半双工，速率 100k/400k，适合低速、引脚紧张、设备多的场合。',
        '<b>SPI</b>：四线（MOSI/MISO/SCK/CS）、全双工、靠片选 CS 寻址、速率高，适合大数据量高速传输（SD 卡、SPI Flash、显示屏）。',
        '<b>UART</b>：异步两线（TX/RX）、点对点、无时钟线，适合调试与简单设备互联。',
        '<b>选型口诀</b>：引脚少、速度慢、设备多 → I2C；速度快、数据量大 → SPI；与电脑/模块互联 → UART。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-08-q1',
      type: 'choice',
      question: '标准 I2C 总线一共使用几根信号线？',
      options: ['1 根，只有 SDA', '2 根，SDA 和 SCL', '3 根，SDA、SCL 和片选 CS', '4 根，MOSI、MISO、SCK、CS'],
      answer: 1,
      explanation: 'I2C 只用两根线：数据线 SDA + 时钟线 SCL，靠 SCL 同步传输，因此被称为两线制总线（电源线和地线不算信号线）。A 少了时钟线无法同步；C 的片选 CS 是 SPI 的概念，I2C 没有片选；D 是 SPI 的四线组合，不是 I2C。',
    },
    {
      id: 'chapter-08-q2',
      type: 'choice',
      question: 'I2C 总线上，主机靠什么区分不同的从机设备？',
      options: ['每个从机单独一根片选线', '7 位从机地址', '从机的波特率', '应答位 ACK'],
      answer: 1,
      explanation: '主机在起始条件之后先发出 7 位从机地址（外加 1 位读写位），地址匹配的从机才会应答并参与本次传输，所以靠地址区分设备。A 是 SPI 的做法（片选 CS）；C 波特率用于 UART 收发同步，与寻址无关；D 的 ACK 是数据字节后的应答机制，不是寻址机制。',
    },
    {
      id: 'chapter-08-q3',
      type: 'choice',
      question: '关于 I2C 的应答位 ACK，下列说法正确的是？',
      options: ['接收方在收到每个字节后拉低 SDA 表示"收到"', '主机发送起始条件之前必须先发送 ACK', 'ACK 用于在总线上选择从机', '没有 ACK 时总线会自动断开'],
      answer: 0,
      explanation: 'I2C 规定每传完 8 位数据，接收方在第 9 个时钟周期把 SDA 拉低表示 ACK，主机据此确认数据送达。B 顺序错误：先发地址和数据字节，之后才有应答；C 错误：选择从机靠地址字节而非 ACK；D 错误：读操作最后一个字节通常发 NACK（不拉低）表示"不要再发了"，随后由主机发停止条件结束传输，总线并不会自动断开。',
    },
    {
      id: 'chapter-08-q4',
      type: 'multiple',
      question: '关于 SPI 总线的特点，下列说法正确的有哪些？',
      options: ['全双工：同一时刻既能发送也能接收', '只有 2 根信号线', '用片选信号 CS 选中从机，无需从机地址', '典型速率通常高于 I2C'],
      answer: [0, 2, 3],
      explanation: 'SPI 的移位寄存器在同一个时钟节拍下同时移位，MOSI 发、MISO 收可同时进行，是全双工（A 对）；SPI 靠片选 CS 的低电平选中从机，没有地址概念（C 对）；SPI 常用速率可达数十 MHz，远高于 I2C 的 100k/400k（D 对）。B 错误：SPI 是四线制（MOSI/MISO/SCK/CS），两线制是 I2C。',
    },
    {
      id: 'chapter-08-q5',
      type: 'choice',
      question: 'I2C 的起始条件（START）是下列哪种电平变化？',
      options: ['SCL 为高电平期间，SDA 由高变低', 'SCL 为高电平期间，SDA 由低变高', 'SDA 为高电平期间，SCL 由高变低', 'SDA 与 SCL 同时变为低电平'],
      answer: 0,
      explanation: 'I2C 规定：SCL 为高电平期间 SDA 由高变低是起始条件（START），宣告一次传输开始；SCL 为高电平期间 SDA 由低变高是停止条件（STOP），也就是 B 描述的其实是停止条件。C、D 都不是协议定义的有效状态。数据位的变化发生在 SCL 为低电平时，而采样发生在 SCL 为高电平时，这组时序是最经典的易错考点。',
    },
    {
      id: 'chapter-08-q6',
      type: 'choice',
      question: 'I2C 标准模式（Standard Mode）与快速模式（Fast Mode）的典型速率分别是多少？',
      options: ['100 kbit/s 与 400 kbit/s', '10 kbit/s 与 100 kbit/s', '400 kbit/s 与 1 Mbit/s', '1 Mbit/s 与 10 Mbit/s'],
      answer: 0,
      explanation: 'I2C 标准模式为 100 kbit/s，快速模式为 400 kbit/s，高速模式可达 3.4 Mbit/s。B 的 10k/100k 不是标准档位；C 把快速模式误当标准；D 的 1M/10M 远超 I2C 常见速率，更像 SPI 的量级。记住"100k/400k"这两个数字，是面试和考试的常客。',
    },
    {
      id: 'chapter-08-q7',
      type: 'fill',
      question: 'Arduino Wire 库中，主机在发送数据前用哪个函数指定从机 7 位地址并开启一次传输？（填函数名，如 xxx()）',
      accept: ['beginTransmission', 'Wire.beginTransmission', 'beginTransmission()', 'Wire.beginTransmission()'],
      explanation: 'Wire.beginTransmission(addr) 用于开启一次向 addr 的传输（内部会发送起始条件和地址），随后用 Wire.write() 写入数据、Wire.endTransmission() 发送停止条件；接收方向则用 Wire.requestFrom(addr, n) 请求 n 个字节。注意传入的是 7 位从机地址，Wire 库会自动左移一位并附加读写位。',
    },
    {
      id: 'chapter-08-q8',
      type: 'choice',
      question: 'SPI 全双工（full-duplex）的含义是？',
      options: ['同一时刻只能单向发送', '同一时刻只能单向接收', '同一时刻 MOSI 发送数据、MISO 接收数据可以同时进行', '同一时刻两根数据线必须传输相同内容'],
      answer: 2,
      explanation: '全双工指收发可以同时进行：SPI 的 MOSI 发出数据的同时，MISO 同步接收数据，因为主从移位寄存器在同一个时钟下同时移位，这也是 SPI 速度快于半双工的 I2C 的原因之一。A、B 描述的是单工或半双工的特性；D 没有物理意义，两根线各自独立传输。',
    },
  ],
};

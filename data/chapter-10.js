// 章节：显示器件
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-10'] = {
  id: 'chapter-10',
  order: 10,
  icon: '📟',
  title: '显示器件',
  summary: '从数码管到 LCD1602 再到 OLED：掌握七段码、共阴共阳、动态扫描与字模概念，用 Arduino 驱动常见显示器件，让单片机"看得见"。',
  sections: [
    {
      type: 'text',
      html: '<h3>数码管：七段码与共阴共阳</h3><p>单片机常用的显示器件主要有三类：<b>数码管</b>（LED 七段显示）、<b>LCD1602</b>（字符液晶屏）和 <b>OLED</b>（有机发光二极管点阵屏）。本章按"从简单到复杂"的顺序逐一讲解，最后介绍它们共有的<b>字模（font bitmap）</b>概念。</p><p><b>数码管（7-segment display）</b>由 7 段条状 LED 加一个小数点（dp）组成，7 段分别命名为 <code>a、b、c、d、e、f、g</code>。点亮不同的段组合，就能拼出 0~9 的数字以及 A~F 等字母。把"一位数码管要显示的内容"编码成 8 位二进制数（每段 1 位，含小数点），就是<b>段码（segment code）</b>，一般用十六进制书写。</p><p>按公共端的接法，数码管分两种：<b>共阴（common cathode）</b>——所有段的阴极连在一起做公共端 COM，点亮某段时该段引脚输出<b>高电平</b>；<b>共阳（common anode）</b>——所有段的阳极连在一起，点亮某段时该段引脚输出<b>低电平</b>。同一个数字在两种接法下的段码<b>互为按位取反</b>，接线时一旦搞混，就会出现"该亮的段不亮"的现象，这是入门最常见的坑。</p>',
    },
    {
      type: 'table',
      title: '共阴七段码表（bit0=a，bit1=b，…，bit6=g；共阳段码 = 共阴段码按位取反）',
      headers: ['显示字符', '共阴段码', '共阳段码', '要点亮的段'],
      rows: [
        ['0', '0x3F', '0xC0', 'a、b、c、d、e、f'],
        ['1', '0x06', '0xF9', 'b、c'],
        ['2', '0x5B', '0xA4', 'a、b、d、e、g'],
        ['3', '0x4F', '0xB0', 'a、b、c、d、g'],
        ['4', '0x66', '0x99', 'b、c、f、g'],
        ['5', '0x6D', '0x92', 'a、c、d、f、g'],
        ['6', '0x7D', '0x82', 'a、c、d、e、f、g'],
        ['7', '0x07', '0xF8', 'a、b、c'],
        ['8', '0x7F', '0x80', 'a~g 全部点亮'],
        ['9', '0x6F', '0x90', 'a、b、c、d、f、g'],
        ['全部熄灭', '0x00', '0xFF', '无'],
      ],
    },
    {
      type: 'code',
      title: '单个数码管循环显示 0~9（Arduino）',
      code: `// Arduino Uno + 共阴数码管：段 a~g 依次接 D2~D8，公共端 COM 接 GND
// 共阴七段码表：bit0=a，bit1=b，…，bit6=g
const unsigned char segCode[] = {
  0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
};
const int pins[7] = {2, 3, 4, 5, 6, 7, 8};

void setup() {
  for (int i = 0; i < 7; i++) {
    pinMode(pins[i], OUTPUT);
  }
}

// 把数字 n 的段码按位输出到 a~g 引脚
void showDigit(int n) {
  unsigned char code = segCode[n];
  for (int i = 0; i < 7; i++) {
    digitalWrite(pins[i], (code >> i) & 0x01);
  }
}

void loop() {
  for (int n = 0; n < 10; n++) {
    showDigit(n);
    delay(500);   // 每个数字停留 0.5 秒
  }
}`,
      note: '目标平台：Arduino Uno，无需第三方库（纯 GPIO 操作）。引脚假设：段 a~g 接 D2~D8（对应 bit0~bit6），共阴数码管 COM 接 GND，每段建议串 220Ω 限流电阻。若换共阳数码管：把段码数组全部按位取反（如 0x3F→0xC0），并把 COM 改接 5V。Wokwi 中搜索 7-segment 可直接仿真。',
    },
    {
      type: 'text',
      html: '<h3>多位数码管与动态扫描原理</h3><p>要显示多位数字，最省引脚的办法是<b>动态扫描（dynamic scanning / multiplexing）</b>：多位数码管的<b>段选线全部并联共用</b>（约 8 根），每一位再单独引出一根<b>位选线（COM）</b>，单片机在同一时刻只点亮一位，轮流快速切换。由于<b>人眼视觉暂留（persistence of vision）</b>，当刷新频率足够高（一般 ≥50Hz）时，眼睛看到的就像所有位同时点亮。</p><p>扫描的三个关键点：① <b>刷新率</b> = 1 ÷（位数 × 每位停留时间），4 位、每位 2ms 时约 125Hz；② 切换位时先<b>熄灭所有位</b>再写入段码，否则会出现"串影/重影"；③ 位选线通常要经三极管或 <code>ULN2003</code> 扩流，因为多段同时点亮时电流较大。与之相对，每位独占一组段线、持续点亮的叫<b>静态显示</b>，I/O 占用多、驱动简单但亮度稳定无闪烁。</p>',
    },
    {
      type: 'code',
      title: '4 位数码管动态扫描显示 2024（Arduino）',
      code: `// Arduino Uno + 4 位共阴数码管：段 a~g 接 D2~D8，位选 COM1~COM4 接 D9~D12
// 位选建议经 ULN2003/三极管扩流；本例假设为小电流共阴管可直接驱动
const unsigned char segCode[] = {
  0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
};
const int segPins[7] = {2, 3, 4, 5, 6, 7, 8};
const int comPins[4] = {9, 10, 11, 12};

void setup() {
  for (int i = 0; i < 7; i++) pinMode(segPins[i], OUTPUT);
  for (int i = 0; i < 4; i++) pinMode(comPins[i], OUTPUT);
}

// 在第 pos 位（0=个位）显示数字 n
void showAt(int n, int pos) {
  // 先关断所有位选，避免上一位的残影（串影）
  for (int i = 0; i < 4; i++) digitalWrite(comPins[i], HIGH);
  unsigned char code = segCode[n];
  for (int i = 0; i < 7; i++) digitalWrite(segPins[i], (code >> i) & 0x01);
  digitalWrite(comPins[pos], LOW);   // 共阴：位选拉低才导通点亮
}

void loop() {
  int value = 2024;
  for (int pos = 0; pos < 4; pos++) {
    showAt(value % 10, pos);
    value /= 10;
    delay(2);   // 每位停留 2ms，刷新率约 125Hz
  }
}`,
      note: '目标平台：Arduino Uno，无需第三方库。引脚假设：段 a~g 接 D2~D8，位选 COM1~COM4 接 D9~D12（共阴管位选低电平选通）。刷新率 = 1 ÷ (4 × 2ms) ≈ 125Hz，远超 50Hz，肉眼无闪烁。共阳数码管接法：段码取反、位选改为高电平选通。',
    },
    {
      type: 'text',
      html: '<h3>LCD1602：引脚、接口模式与工作原理</h3><p><b>LCD1602</b> 是一块 16 列 × 2 行的字符液晶屏，内部控制器是 <b>HD44780</b>，自带 ASCII 字符库（含字母、数字与常用符号）。它有 16 个引脚，常用的是：<code>VSS</code>（地）、<code>VDD</code>（+5V）、<code>V0</code>（对比度调节，接电位器中点）、<code>RS</code>（寄存器选择）、<code>RW</code>（读写选择）、<code>E</code>（使能）、<code>D0~D7</code>（数据线）。</p><p>HD44780 内部有<b>指令寄存器</b>和<b>数据寄存器</b>：<code>RS=0</code> 时操作指令寄存器（清屏、设置光标位置等），<code>RS=1</code> 时操作数据寄存器（写入要显示的字符），<code>RW=0</code> 表示写、<code>RW=1</code> 表示读。数据线可全用 8 根（8 位模式），也可以只用高 4 位 <code>D4~D7</code>（4 位模式）来节省引脚，时序比 8 位模式略繁琐。Arduino 的 <code>LiquidCrystal</code> 库把底层时序全部封装好了，操作非常简单。</p>',
    },
    {
      type: 'code',
      title: 'LiquidCrystal 库驱动 LCD1602（Arduino）',
      code: `// Arduino Uno + LCD1602（HD44780，4 位数据模式）
// 接线：RS=D12，EN=D11，D4~D7 分别接 D5、D4、D3、D2
#include <LiquidCrystal.h>

// LiquidCrystal(rs, enable, d4, d5, d6, d7)
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);           // 初始化 16 列 × 2 行
  lcd.print("Hello, MCU!");   // 第一行第 0 列开始显示
  lcd.setCursor(0, 1);        // 光标移动到第二行开头
  lcd.print("LCD1602 Demo");  // 显示第二行
}

void loop() {
  // 静态显示场景：无需循环操作
}`,
      note: '目标平台：Arduino Uno，LiquidCrystal 库为 Arduino IDE 内置，无需额外安装。引脚假设：RS=D12、EN=D11、D4~D7 接 D5/D4/D3/D2，V0 接电位器中点调节对比度。若买的是带 I2C 转接板（PCF8574，地址 0x27）的 LCD1602，改用 LiquidCrystal_I2C 库，只需接 SDA=A4、SCL=A5 两根数据线。',
    },
    {
      type: 'text',
      html: '<h3>OLED：SSD1306、I2C/SPI 与显示中文要点</h3><p><b>OLED（Organic Light-Emitting Diode）</b>是自发光点阵屏，常见 0.96 英寸 128×64 像素，驱动控制器多为 <b>SSD1306</b>。接口有 <b>I2C</b>（仅 SDA/SCL 两根线，常用地址 0x3C，接线最省）和 <b>SPI</b>（刷新更快，但要占用 CS、DC、RST 等引脚）两种，多数模块背面有电阻可切换接口。常用驱动库有 <b>U8g2</b>（功能强大、字体丰富）与 <b>Adafruit_SSD1306</b>（配合 Adafruit GFX 画图）。</p><p><b>字模（font bitmap / glyph）</b>是显示中文的关键概念：OLED 控制器只认识"哪个点亮、哪个点灭"的点阵数据，一个 8×8 的字符需要 64 位 = 8 字节存储，一个 16×16 的汉字需要 32 字节。U8g2 的默认字体大多是西文字体，<b>要显示中文必须额外加载中文字体</b>（如 <code>u8g2_font_unifont_t_chinese2</code>），这类字体数据很大、占用较多 Flash；也可以先用取模软件（如 PCtoLCD2002）把汉字转成字模数组，再用 Adafruit 库逐字节绘制。</p>',
    },
    {
      type: 'code',
      title: 'U8g2 库驱动 SSD1306 OLED（Arduino）',
      code: `// Arduino Uno + 0.96 英寸 OLED（SSD1306，128×64，I2C）
// 接线：VCC=5V，GND=GND，SCL=A5，SDA=A4（I2C 地址默认 0x3C）
#include <U8g2lib.h>
#include <Wire.h>

// 硬件 I2C 版本构造函数；U8G2_R0 表示屏幕不旋转
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  u8g2.begin();                        // 初始化屏幕
  u8g2.setFont(u8g2_font_ncenB08_tr);  // 选用西文字体
}

void loop() {
  u8g2.clearBuffer();                  // 清空内存缓冲
  u8g2.drawStr(0, 12, "Hello OLED!");  // 在 (0,12) 绘制字符串
  u8g2.setCursor(0, 28);
  u8g2.print("Pi = ");                 // print 支持数字输出
  u8g2.print(3.14159, 3);
  u8g2.sendBuffer();                   // 把缓冲一次性发送到屏幕
  delay(200);
}`,
      note: '目标平台：Arduino Uno，库名：U8g2（在"库管理器"中搜索 U8g2 安装），另需 Wire 库（内置）。引脚假设：SDA=A4、SCL=A5、VCC=5V、GND=GND。若用 SPI 屏幕，把构造函数换成 U8G2_SSD1306_128X64_NONAME_F_4W_HW_SPI 并接 CS/DC/RST 引脚。U8g2 采用"先在内存缓冲画图、再 sendBuffer() 整体上屏"的两段式工作方式；显示中文需改用中文字体（如 u8g2_font_unifont_t_chinese2）。',
    },
    {
      type: 'tip',
      kind: 'info',
      html: '<p><b>显示器件怎么选：</b>只显示数字 → 数码管（最便宜、最亮）；显示英文字符和简单文本 → LCD1602；显示图形、曲线、中文字或追求轻薄省电 → OLED。OLED 有 I2C 与 SPI 两种接口版本，购买和接线前先确认模块背面的接口。</p><p><b>高频易错点：</b>① 共阴/共阳接反导致显示错乱——记住共阳段码 = 共阴段码按位取反；② 动态扫描刷新率低于 50Hz 会闪烁，每位停留时间不要超过几毫秒；③ 数码管每段要串 220Ω~1kΩ 限流电阻，否则电流过大；④ LCD1602 的 V0 不接电位器时，屏幕可能全黑或全白；⑤ OLED 显示中文必须先加载中文字体或自备字模，直接 print 中文字符只会得到乱码；⑥ 字模是"点阵"数据：8×8 字符需 8 字节，16×16 汉字需 32 字节。</p>',
    },
  ],
  exercises: [
    {
      id: 'chapter-10-q1',
      type: 'choice',
      question: '共阳数码管（common anode）的公共端 COM 应接到哪里，才能正常显示？',
      options: ['接地 GND', '接电源正极（如 +5V）', '悬空不接', '接单片机任意一个 I/O 引脚'],
      answer: 1,
      explanation: '共阳数码管所有段的阳极连在一起做公共端，点亮某段需要该段引脚输出低电平，电流从公共端（电源正极）经 LED 流到引脚，所以 COM 必须接电源正极。A 错：COM 接地是共阴数码管的接法；C 错：悬空没有电流回路，任何段都不会亮；D 错：公共端是电源轨，接到普通 I/O 引脚既点不亮也可能损坏引脚。',
    },
    {
      id: 'chapter-10-q2',
      type: 'choice',
      question: '七段数码管显示数字 5（共阴接法，段引脚高电平点亮），需要点亮的段是？',
      options: ['a、b、c、d、g', 'a、f、g、c、d', 'b、c、f、g', 'a、b、c、d、f、g'],
      answer: 1,
      explanation: '数字 5 由五段组成：上横 a、左上竖 f、中横 g、右上竖 c、下横 d，b 和 e 熄灭，所以点亮的是 a、f、g、c、d。A 点亮的是数字 3（a、b、c、d、g）；C 点亮的是数字 4（b、c、f、g）；D 点亮的是数字 9（a、b、c、d、f、g）。',
    },
    {
      id: 'chapter-10-q3',
      type: 'code',
      question: '下面的共阴七段码表原本用于共阴数码管，现把同一套硬件换成共阳数码管（公共端接 5V），要显示数字 0，应向段引脚写入的段码是？',
      code: `// 共阴七段码表（bit0=a，bit1=b，…，bit6=g）
const unsigned char seg[] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D}; // 对应 0 1 2 3 4 5`,
      options: ['0x3F', '0xC0', '0x7F', '0x06'],
      answer: 1,
      explanation: '共阴段码中为 1 的位表示该段点亮（输出高电平）；共阳接法点亮段需要输出低电平，因此共阳段码 = 共阴段码按位取反。0x3F = 0b00111111，取反得 0b11000000 = 0xC0。A 是共阴接法的段码，直接用于共阳会导致显示错乱；C 的 0x7F 表示共阴下 7 段全亮，不是 0 的共阳码；D 的 0x06 是数字 1 的共阴段码。',
    },
    {
      id: 'chapter-10-q4',
      type: 'multiple',
      question: '关于多位共阴数码管的动态扫描（dynamic scanning）显示，下列说法正确的有？',
      options: [
        '多位数码管共用一组段码数据线，靠轮流选通各位来显示',
        '刷新频率太低（如 10Hz）时人眼会看到明显闪烁',
        '动态扫描必须为每一位单独占用 8 根 I/O 引脚',
        '动态扫描利用人眼的视觉暂留（persistence of vision），使"轮流点亮"看起来像"同时点亮"',
      ],
      answer: [0, 1, 3],
      explanation: '动态扫描的核心就是段线共享、位选分时：所有位的 a~g 段线并在一起，同一时刻只点亮一位，靠快速轮流让眼睛"以为"全部同时点亮，A 正确。刷新率一般要求 ≥50Hz，10Hz 会明显闪烁，B 正确。C 错：每一位单独占 8 根线是静态显示的做法，动态扫描的初衷恰恰是节省 I/O。视觉暂留是动态扫描能正常工作的物理基础，D 正确。',
    },
    {
      id: 'chapter-10-q5',
      type: 'choice',
      question: 'LCD1602（HD44780）寄存器模式下，当 RS=1、RW=0 时，单片机执行的操作是？',
      options: ['向指令寄存器写入指令（如清屏）', '向数据寄存器写入要显示的字符数据', '读取忙标志（Busy Flag）', '从数据寄存器读回数据'],
      answer: 1,
      explanation: 'RS 用于选择寄存器：RS=0 选指令寄存器、RS=1 选数据寄存器；RW 用于选择读写：RW=0 写、RW=1 读。所以 RS=1、RW=0 表示"写数据寄存器"，即把要显示的字符（ASCII 码）送给 LCD。A 错：写指令时 RS 应为 0；C 错：读忙标志是 RW=1 且 RS=0 的操作；D 错：读数据需要 RW=1。',
    },
    {
      id: 'chapter-10-q6',
      type: 'multiple',
      question: '要在 OLED 屏幕上显示中文，下列说法正确的有？',
      options: [
        '汉字需要以点阵字模（font bitmap）形式存储，逐点绘制',
        'U8g2 库显示中文必须额外加载包含中文字符的字体，字体数据较大',
        '可以用取模软件把汉字转换成字模数组后写入程序',
        'I2C 接口的 OLED 无法显示任何内容',
      ],
      answer: [0, 1, 2],
      explanation: 'OLED 控制器（SSD1306）只认识"点阵"数据，不内置中文字库，汉字必须先转成点阵字模，A 正确。U8g2 默认字体是西文字体，要显示中文需加载 u8g2_font_unifont_t_chinese2 之类的中文字体，Flash 占用很大，B 正确。PCtoLCD2002 等取模软件可把汉字生成字模数组，配合 Adafruit_SSD1306 绘制，C 正确。D 错：I2C 只是通信接口，I2C 版的 OLED 完全可以正常显示，只是刷新速度比 SPI 慢一些。',
    },
    {
      id: 'chapter-10-q7',
      type: 'choice',
      question: '一个 8×8 点阵的字符（每个点占 1 位），存储这个字符需要多少字节（byte）？',
      options: ['4 字节', '8 字节', '16 字节', '64 字节'],
      answer: 1,
      explanation: '8×8 点阵共 64 个点，每个点占 1 位（bit），共 64 位；1 字节 = 8 位，所以需要 64 ÷ 8 = 8 字节。D 的 64 是位（bit）数而不是字节数，是常见易错点；A、C 与换算结果不符。作为对照，汉字一般用 16×16 点阵，需要 16×16 ÷ 8 = 32 字节。',
    },
  ],
};

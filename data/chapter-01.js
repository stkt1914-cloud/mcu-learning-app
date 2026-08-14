// 章节：单片机基础与开发环境（范例章节）
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-01'] = {
  id: 'chapter-01',
  order: 1,
  icon: '🔌',
  title: '单片机基础与开发环境',
  summary: '认识单片机是什么、有哪些主流系列，了解开发板、开发环境与烧录流程，搭建你的第一块开发环境。',
  sections: [
    {
      type: 'text',
      html: '<h3>什么是单片机</h3><p><b>单片机（Microcontroller，MCU）</b>就是把<b>中央处理器（CPU）、存储器（RAM/Flash）、各种外设</b>（定时器、串口、ADC、GPIO 等）集成到一块芯片上的微型计算机。它体积小、功耗低、成本低，广泛用于家电、汽车电子、智能硬件、物联网终端等。</p><p>和电脑上的 CPU 不同：单片机通常<b>裸机运行</b>（直接跑程序，不一定有操作系统），程序烧录进 Flash 后上电即运行。写程序时，我们通过操作<b>寄存器（register）</b>或调用厂商库函数来控制芯片的引脚和外设。</p>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<b>CPU</b>：执行指令的核心，常见 ARM Cortex-M、8051、AVR 内核。',
        '<b>存储器</b>：Flash 存程序（掉电不丢），RAM 存运行数据（掉电丢失）。',
        '<b>GPIO</b>：通用输入输出引脚，可输出高低电平、读取外部信号。',
        '<b>外设</b>：定时器（Timer）、串口（UART）、ADC、PWM、I2C/SPI 等。',
      ],
    },
    {
      type: 'text',
      html: '<h3>主流单片机系列</h3><p>初学者最常见三类：</p><ul><li><b>51 单片机（8051）</b>：经典入门型号（如 STC89C52），资料多、教学用广泛，8 位内核。</li><li><b>STM32</b>（意法半导体）：ARM Cortex-M 内核，性能强、外设丰富，工业与竞赛主流，32 位。</li><li><b>Arduino</b>（AVR 内核，如 ATmega328P）：封装好的开发板 + 简化库，适合快速原型与入门体验。</li></ul><p>还有 ESP32（带 Wi-Fi/蓝牙）、MSP430（低功耗）、PIC、GD32（国产 STM32 兼容）等。学习路径上，Arduino 最容易上手，STM32 更具工程价值。</p>',
    },
    {
      type: 'table',
      title: '三类主流平台对比',
      headers: ['平台', '内核', '位数', '特点', '典型工具链'],
      rows: [
        ['51 单片机', '8051', '8 位', '经典、便宜、教程多', 'Keil C51 / 烧录软件'],
        ['STM32', 'ARM Cortex-M', '32 位', '性能强、外设丰富', 'STM32CubeIDE / Keil MDK'],
        ['Arduino', 'AVR', '8 位', '上手最快、生态大', 'Arduino IDE / Wokwi 仿真'],
      ],
    },
    {
      type: 'tip',
      kind: 'tip',
      html: '<p><b>选型建议：</b>纯入门玩，Arduino Uno（约 ¥20~40）最省心；想深入学嵌入式，STM32F103C8T6 蓝板（约 ¥10~15）性价比高；只想在手机上先练，可以用 <b>Wokwi</b>（wokwi.com）或 Proteus 在电脑上仿真，不用买硬件也能跑通大部分实验。</p>',
    },
    {
      type: 'text',
      html: '<h3>开发环境的搭建</h3><p>一个完整的单片机开发流程是：<b>写代码 → 编译 → 烧录 → 运行调试</b>。需要三样东西：</p><ul><li><b>IDE（集成开发环境）</b>：Arduino IDE、STM32CubeIDE、Keil 等，负责编辑与编译。</li><li><b>烧录器/调试器</b>：如 ST-Link（STM32）、USB 下载线（51）、板载 USB 转串口（Arduino）。</li><li><b>目标板</b>：开发板本身 + 供电。</li></ul><p>以 Arduino 为例，插上 USB 线，Arduino IDE 里选好板型和端口，点"上传"即可完成"编译 + 烧录"，是最平滑的入门路径。</p>',
    },
    {
      type: 'code',
      title: '第一个 Arduino 程序：点亮板载 LED',
      code: `// Arduino Uno：板载 LED 接 D13 引脚
// setup() 上电执行一次，loop() 反复执行
void setup() {
  pinMode(13, OUTPUT);   // 把 D13 设为输出模式
}

void loop() {
  digitalWrite(13, HIGH);   // 输出高电平，LED 亮
  delay(1000);              // 延时 1000 毫秒
  digitalWrite(13, LOW);    // 输出低电平，LED 灭
  delay(1000);              // 再延时 1 秒
}`,
      note: 'Arduino 把复杂的寄存器操作封装成了 pinMode/digitalWrite/delay 三个函数，这正是它适合入门的原因。编译上传后，板载 LED 会以 1 秒间隔闪烁。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>易错点：</b>① 上传前必须先选对<b>开发板型号</b>和<b>串口端口</b>，否则报"找不到端口"；② 烧录时要保持 USB 连接稳定，拔线可能导致烧录失败；③ 5V 与 3.3V 逻辑电平不同，外接模块时注意电平匹配，接错可能损坏芯片。</p>',
    },
    {
      type: 'text',
      html: '<h3>最小系统与电路常识</h3><p>单片机要跑起来，芯片周围需要<b>最小系统</b>：电源、晶振（提供时钟）、复位电路、启动配置。我们在面包板上搭电路时，要记住几个基本概念：</p><ul><li><b>高低电平</b>：数字电路只有两种状态，一般 0V 附近为低（0），3.3V/5V 附近为高（1）。</li><li><b>上拉/下拉电阻</b>：把引脚在不确定状态时"拉"到确定电平，避免悬空。</li><li><b>限流电阻</b>：LED 等器件直接接引脚会过流，通常串 220Ω~1kΩ 电阻。</li><li><b>共地</b>：单片机与所有模块必须共用一个 GND，信号才有参考点。</li></ul>',
    },
    {
      type: 'code',
      title: 'STM32 标准库点亮 LED（对照参考）',
      code: `// STM32F103 蓝板：PB0 接 LED（低电平点亮）
#include "stm32f10x.h"

int main(void)
{
    // 打开 GPIOC 时钟
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);

    GPIO_InitTypeDef g;
    g.GPIO_Pin = GPIO_Pin_0;
    g.GPIO_Mode = GPIO_Mode_Out_PP;   // 推挽输出
    g.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOB, &g);

    while (1) {
        GPIO_SetBits(GPIOB, GPIO_Pin_0);   // PB0 = 1，LED 灭
        GPIO_ResetBits(GPIOB, GPIO_Pin_0); // PB0 = 0，LED 亮
    }
}`,
      note: '与 Arduino 相比，STM32 需要先"打开外设时钟"、配置结构体再初始化——流程繁琐但更接近底层原理，是进阶必学。',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '单片机 = CPU + 存储器 + 外设的完整微型计算机，程序烧进 Flash 后上电运行。',
        '主流平台：51（经典教学）、STM32（工程主流）、Arduino（快速上手）。',
        '开发流程：写代码 → 编译 → 烧录 → 调试。',
        '入门可选 Arduino + Wokwi 仿真，不买硬件也能学。',
        '电路基础：高低电平、上下拉电阻、限流电阻、共地。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-01-q1',
      type: 'choice',
      question: '单片机（MCU）与普通电脑 CPU 相比，最主要的区别是？',
      options: ['单片机没有存储器', '单片机把 CPU、存储器和外设集成在一颗芯片上，面向控制任务', '单片机必须运行操作系统', '单片机不能执行程序'],
      answer: 1,
      explanation: '单片机的核心特征是把 CPU、RAM/Flash、GPIO、定时器、串口等集成在一块芯片上，面向嵌入式控制。A 错：单片机内置 Flash 和 RAM；C 错：多数单片机裸机运行，不依赖操作系统；D 错：单片机正是靠执行 Flash 里的程序工作的。',
    },
    {
      id: 'chapter-01-q2',
      type: 'choice',
      question: '单片机烧录进 Flash 的程序，在断电后会怎样？',
      options: ['丢失，每次上电都要重新烧录', '保存在 Flash 中，掉电不丢失，上电自动运行', '只保存在 RAM 中', '会被自动清除'],
      answer: 1,
      explanation: 'Flash 是非易失性存储器，掉电后程序依然保存，上电后芯片从 Flash 加载程序并执行。RAM 才是易失的（掉电丢失），所以 A、C、D 都不对。',
    },
    {
      id: 'chapter-01-q3',
      type: 'multiple',
      question: '下面哪些属于 Arduino Uno 常用的开发流程步骤？',
      options: ['在 Arduino IDE 中选择正确的开发板型号', '选择正确的串口端口', '点击"上传"完成编译与烧录', '必须购买专用的 ST-Link 调试器才能烧录'],
      answer: [0, 1, 2],
      explanation: 'Arduino 的开发流程是：选板型（A）、选端口（B）、点上传（C，IDE 自动完成编译+烧录）。D 错：Arduino 通过板载 USB 转串口即可烧录，不需要 ST-Link（那是 STM32 用的）。',
    },
    {
      id: 'chapter-01-q4',
      type: 'code',
      question: '下面的 Arduino 程序会让板载 LED（D13）怎样闪烁？',
      code: `void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
      options: ['常亮不闪', '每秒亮、每秒灭，周期约 2 秒', '快速闪烁，肉眼看不清', '编译错误'],
      answer: 1,
      explanation: 'loop() 反复执行：亮 1 秒（delay(1000)）→ 灭 1 秒，所以 LED 以约 2 秒为周期闪烁。A 缺少了灭的过程；C 的延时是 1000 毫秒而非毫秒级；程序语法完全正确，D 错。',
    },
    {
      id: 'chapter-01-q5',
      type: 'choice',
      question: '把 LED 直接接在 GPIO 引脚上（不加电阻），最可能发生什么？',
      options: ['LED 亮度更高，效果更好', '电流过大，可能烧坏 LED 或引脚', '没有任何影响', '引脚自动变为输入模式'],
      answer: 1,
      explanation: 'LED 导通后电阻很小，引脚直接驱动会产生过大电流（远超 LED 与引脚允许值），可能损坏器件，所以必须串联限流电阻（如 220Ω~1kΩ）。A 是错误认知；C、D 与事实不符。',
    },
    {
      id: 'chapter-01-q6',
      type: 'choice',
      question: '开发板与外接传感器模块连接时，"共地"是指？',
      options: ['所有模块共用一个电源正极', '把所有 GND 接在一起，形成共同的参考电位', '给每个模块单独供电', '把信号线接到地上'],
      answer: 1,
      explanation: '共地就是把所有模块的 GND 引脚连接在一起，使信号电平有统一的参考点，这是数字电路工作的前提。A 是"共电源"不是共地；C 各模块单独供电仍需共地；D 把信号接地是错误操作。',
    },
    {
      id: 'chapter-01-q7',
      type: 'choice',
      question: '下面哪个平台适合"零基础快速体验"单片机开发？',
      options: ['STM32 + 寄存器裸机开发', 'Arduino + Arduino IDE', '自己设计 PCB 并手工焊接', '直接阅读芯片数据手册开发'],
      answer: 1,
      explanation: 'Arduino 把底层寄存器封装成简单函数（pinMode、digitalWrite、delay），IDE 一键上传，是零基础最快上手的路径。STM32 寄存器开发、读数据手册、自制 PCB 都需要更多基础，不适合起步阶段。',
    },
    {
      id: 'chapter-01-q8',
      type: 'fill',
      question: 'Arduino 程序中，上电只执行一次的函数名是什么？（写函数名，如 xxx()）',
      accept: ['setup()', 'setup', 'setup ();', 'setup();'],
      explanation: 'Arduino 程序由两个固定函数组成：setup() 上电时执行一次（初始化），loop() 随后反复执行。setup 里通常放引脚模式、串口初始化等一次性配置。',
    },
  ],
};

// 章节：GPIO 输入输出
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-04'] = {
  id: 'chapter-04',
  order: 4,
  icon: '💡',
  title: 'GPIO 输入输出',
  summary: '掌握 GPIO 的输入与输出：推挽与开漏、上下拉与浮空、按键检测与软件消抖，点亮 LED 也读懂按键。',
  sections: [
    {
      type: 'text',
      html: '<h3>什么是 GPIO</h3><p><b>GPIO（General Purpose Input/Output，通用输入输出）</b>是单片机最基础也最常用的外设：每一个 GPIO 引脚都可以在程序控制下<b>输出</b>高/低电平，或者<b>读取</b>外部送来的高/低电平。可以把引脚想象成芯片伸出的“手”——既能向外“推”电平（输出），也能伸出去“摸”电平（输入）。</p><p>数字世界里只有两种电平：高电平（约 3.3V 或 5V，逻辑 1）和低电平（接近 0V，逻辑 0）。GPIO 的工作本质就是围绕这两种电平的“写”与“读”。动手之前，必须先理解引脚可以配置成哪些<b>模式（mode）</b>——选错模式是新手最常见的坑：把输入引脚配成输出、把开漏当推挽用、让引脚悬空读取，都会得到莫名其妙的结果。</p>',
    },
    {
      type: 'table',
      title: 'GPIO 引脚模式总览（以 STM32 标准库命名为例）',
      headers: ['模式', '方向', '特点', '典型用途'],
      rows: [
        ['推挽输出 Out_PP（Push-Pull）', '输出', '能主动输出强高电平和强低电平，驱动能力强', 'LED、蜂鸣器、普通数字信号'],
        ['开漏输出 Out_OD（Open-Drain）', '输出', '只能把引脚拉低，输出高电平必须靠外部上拉电阻', 'I2C 总线、电平转换、线与逻辑'],
        ['浮空输入 In_Floating', '输入', '引脚悬空，电平由外部决定，极易受干扰', '外部电路已自带上下拉的场合'],
        ['上拉输入 IPU（Pull-Up）', '输入', '内部接上拉电阻，外部不接时默认为高电平', '按键一端接地、开关检测'],
        ['下拉输入 IPD（Pull-Down）', '输入', '内部接下拉电阻，外部不接时默认为低电平', '按键一端接电源、开关检测'],
        ['复用功能 AF（Alternate Function）', '双向', '引脚交给片内外设（串口、定时器等）控制', 'UART、I2C、SPI、PWM 输出'],
      ],
    },
    {
      type: 'text',
      html: '<h3>推挽输出与开漏输出：怎么选</h3><p><b>推挽输出（push-pull）</b>内部有两个互补的晶体管：输出高电平时“上管”导通，把引脚拉到电源；输出低电平时“下管”导通，把引脚拉到地。无论 0 还是 1，引脚都被<b>主动驱动</b>，所以驱动 LED、蜂鸣器这类需要电流的负载最合适。Arduino 的 <code>pinMode(引脚, OUTPUT)</code> 就是推挽输出。</p><p><b>开漏输出（open-drain）</b>内部只有“下管”，能把引脚拉到 0；但输出 1 时引脚实际上是<b>悬空</b>的，必须外部接一个<b>上拉电阻</b>才能获得高电平。它常用于 I2C 总线（多个设备可以“线与”，谁拉低谁发言）和电平转换（外部上拉到 3.3V 或 5V 都可以）。代价是上升沿靠电阻缓慢充放电，速度不如推挽。</p><p>另外，很多引脚还有<b>复用功能（Alternate Function，AF）</b>模式：把引脚的控制权交给片内外设。比如把某引脚配置成 USART_TX 发串口、TIMx_CH1 输出 PWM。配置成复用模式后，引脚高低电平由外设硬件决定，不再由 GPIO 寄存器控制——这正是下一章定时器输出 PWM 要做的事。</p>',
    },
    {
      type: 'code',
      title: 'Arduino 输出应用：点亮并闪烁 LED',
      code: `// Arduino Uno：LED 接 D13（板载 LED）
void setup() {
  pinMode(13, OUTPUT);      // 推挽输出模式
}

void loop() {
  digitalWrite(13, HIGH);   // 输出高电平，LED 亮
  delay(500);
  digitalWrite(13, LOW);    // 输出低电平，LED 灭
  delay(500);
}`,
      note: '目标平台：Arduino Uno / Wokwi 仿真，LED 正极接 D13、负极经 220Ω 限流电阻接 GND（板载 LED 已内置电阻）。pinMode 配 OUTPUT 即推挽输出，digitalWrite 写高/低电平。',
    },
    {
      type: 'code',
      title: 'STM32 标准库输出应用：推挽输出点亮 LED',
      code: `// STM32F103C8T6 蓝板 + 标准库：PB0 接 LED（低电平点亮）
#include "stm32f10x.h"

void delay_ms(uint32_t ms)   // 简易延时，72MHz 下约 1ms（工程上建议用 SysTick）
{
    uint32_t i;
    for (i = 0; i < ms * 4000; i++) {
        __NOP();
    }
}

void LED_Init(void)
{
    GPIO_InitTypeDef g;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);  // 打开 GPIOB 时钟

    g.GPIO_Pin = GPIO_Pin_0;
    g.GPIO_Mode = GPIO_Mode_Out_PP;   // 推挽输出
    g.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOB, &g);
}

int main(void)
{
    LED_Init();
    while (1) {
        GPIO_ResetBits(GPIOB, GPIO_Pin_0);  // 输出低电平，LED 亮
        delay_ms(500);
        GPIO_SetBits(GPIOB, GPIO_Pin_0);    // 输出高电平，LED 灭
        delay_ms(500);
    }
}`,
      note: '目标平台：STM32F103C8T6 + STM32 标准库（STM32CubeIDE 或 Keil），PB0 经 220Ω 电阻接 LED 负极、LED 正极接 3.3V（低电平点亮）。注意与 Arduino 的两处不同：必须先使能 GPIO 时钟，再用结构体配置模式。',
    },
    {
      type: 'text',
      html: '<h3>输入应用：按键检测</h3><p>读取按键，本质是判断引脚电平。机械按键（button）是纯机械触点，常用接法是：<b>按键一端接 GPIO 引脚，另一端接地（GND）</b>。但这样松开时引脚悬空、电平不确定，所以必须配合<b>内部上拉</b>（Arduino 的 <code>INPUT_PULLUP</code>，STM32 的上拉输入模式）：松开时读到高电平，按下时按键把引脚拉到地，读到低电平。</p><p>务必警惕<b>浮空输入（floating input）</b>：引脚内部既不接上拉也不接下拉，悬空时电平受手指、导线、环境电磁干扰影响而乱跳，读到的是不确定值。所以读按键、读开关几乎总是启用内部上拉或下拉。另一种常见接法是把按键一端接电源、另一端接引脚，并启用<b>下拉输入</b>（内部下拉电阻），按下时读到高电平——高低逻辑正好反过来。</p><p>除此之外，输入还有两个细节：一是<b>电平兼容</b>，3.3V 单片机读 5V 信号要加转换电路；二是<b>输入电流极小</b>，引脚输入阻抗很高，几乎不消耗外部电路电流。</p>',
    },
    {
      type: 'code',
      title: 'Arduino 输入应用：按键检测 + 软件消抖',
      code: `// Arduino Uno：按键一端接 D2，另一端接 GND（按下为低电平）
const int btnPin = 2;
const int ledPin = 13;

void setup() {
  pinMode(btnPin, INPUT_PULLUP);  // 启用内部上拉：松开读高，按下读低
  pinMode(ledPin, OUTPUT);
}

void loop() {
  if (digitalRead(btnPin) == LOW) {   // 第一次检测到按下
    delay(20);                        // 软件消抖：跳过 20ms 机械弹跳期
    if (digitalRead(btnPin) == LOW) { // 再次确认仍为低，才认定真正按下
      digitalWrite(ledPin, HIGH);     // 按下时点亮 LED
    }
  } else {
    digitalWrite(ledPin, LOW);
  }
}`,
      note: '目标平台：Arduino Uno / Wokwi 仿真，按键接 D2 与 GND，LED 接 D13。机械触点闭合时会弹跳（bounce）5~20ms，电平高低反复跳变；程序用“延时 20ms + 二次确认”跳过抖动，这就是最经典的软件消抖（software debounce）。',
    },
    {
      type: 'code',
      title: 'STM32 标准库输入应用：上拉输入 + 软件消抖',
      code: `// STM32F103C8T6 + 标准库：按键接 PA0，另一端接 GND（按下为低）
#include "stm32f10x.h"

void delay_ms(uint32_t ms)   // 简易延时，72MHz 下约 1ms
{
    uint32_t i;
    for (i = 0; i < ms * 4000; i++) {
        __NOP();
    }
}

int main(void)
{
    GPIO_InitTypeDef g;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);  // 打开 GPIOA 时钟

    g.GPIO_Pin = GPIO_Pin_0;
    g.GPIO_Mode = GPIO_Mode_IPU;   // 上拉输入：松开读高，按下读低
    g.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &g);

    while (1) {
        if (GPIO_ReadInputDataBit(GPIOA, GPIO_Pin_0) == 0) {  // 检测到按下
            delay_ms(20);              // 软件消抖
            if (GPIO_ReadInputDataBit(GPIOA, GPIO_Pin_0) == 0) {
                // 已确认按下：这里放处理代码（如翻转 LED 状态）
            }
        }
    }
}`,
      note: '目标平台：STM32F103C8T6 + 标准库（STM32CubeIDE/Keil），按键接 PA0 与 GND。上拉输入模式 GPIO_Mode_IPU 相当于 Arduino 的 INPUT_PULLUP；读取用 GPIO_ReadInputDataBit，消抖策略与 Arduino 完全一致。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>驱动蜂鸣器与继电器的要点：</b>GPIO 引脚能输出的电流非常有限（Arduino 约 20~40mA，STM32 一般不超过 25mA），而<b>继电器线圈</b>需要几十到上百毫安，<b>无源蜂鸣器</b>也需要较大电流，直接接引脚轻则吸合无力、声音小，重则烧坏引脚。</p><ul><li>通过<b>三极管/MOSFET</b>开关电路驱动，或直接用 <b>ULN2003</b> 达林顿驱动芯片（内含 7 路达林顿管）；</li><li>驱动继电器时，线圈两端必须并联一个<b>续流二极管</b>（反向接法），吸收断电瞬间的反向电动势，否则会打坏开关管；</li><li>“低电平触发”型的蜂鸣器模块可直接接引脚，但要注意 3.3V/5V 电平匹配。</li></ul><p>记住一句话：<b>GPIO 是“信号源”，不是“电源”</b>，明显超过 20mA 的负载都要交给驱动电路。</p>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<b>GPIO</b> 是单片机与外界的“手”：输出方向写电平，输入方向读电平，方向由寄存器或库函数配置。',
        '输出模式分<b>推挽</b>与<b>开漏</b>：推挽驱动能力强、高低都主动；开漏只能拉低、必须外接上拉，I2C 等总线常用。',
        '输入模式分<b>浮空、上拉、下拉</b>：浮空易受干扰，读按键通常用内部上拉。',
        '<b>复用功能（AF）</b>把引脚交给片内外设，PWM、串口等都需要它。',
        '<b>软件消抖</b>：机械触点会弹跳 5~20ms，用“延时 + 二次确认”即可可靠判断，不增加硬件成本。',
        '驱动蜂鸣器/继电器要加<b>三极管或 ULN2003</b>，继电器线圈还要并联<b>续流二极管</b>。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-04-q1',
      type: 'choice',
      question: 'GPIO 的英文全称及其含义是？',
      options: ['General Purpose Input/Output，通用输入输出，既可输出也可读取数字电平', 'General Power Input/Output，电源输入输出', 'Global Program Interface，全局编程接口', 'General Port Interface，通用端口接口'],
      answer: 0,
      explanation: 'GPIO 是 General Purpose Input/Output 的缩写，指可配置为输入或输出的通用数字引脚：输出方向用软件写高低电平，输入方向读取外部电平。B 把 General 换成 Power 是干扰项，GPIO 不是电源引脚；C、D 是凭空编造的缩写，均不正确。',
    },
    {
      id: 'chapter-04-q2',
      type: 'choice',
      question: '关于开漏输出（open-drain）模式，下列说法正确的是？',
      options: ['输出高电平时由内部晶体管强驱动，无需外部元件', '只能主动把引脚拉低，要输出高电平必须外接上拉电阻', '与推挽输出完全一样，只是名字不同', '开漏输出可以直接驱动继电器线圈'],
      answer: 1,
      explanation: '开漏输出内部只有拉低用的下管：输出 0 时强驱动拉低，输出 1 时引脚处于高阻悬空，必须靠外部上拉电阻才能得到高电平，常用于 I2C 总线与电平转换。A 把开漏当成了推挽（推挽才能主动输出高电平）；C 说两者一样是错的；D 错，开漏输出电流能力有限且不能主动输出高电平，驱动继电器要用三极管/ULN2003 并加续流二极管。',
    },
    {
      id: 'chapter-04-q3',
      type: 'choice',
      question: '按键一端接 GPIO 引脚、另一端接 GND，并启用内部上拉（Arduino 的 INPUT_PULLUP）。松开与按下时引脚分别读到什么电平？',
      options: ['松开读高、按下读低', '松开读低、按下读高', '松开读高、按下读高', '松开读低、按下读低'],
      answer: 0,
      explanation: '内部上拉电阻把引脚默认拉高，松开时读到高电平（1）；按下时按键把引脚直接接到 GND，读到低电平（0）。B 把高低写反了；C 忽略了按下瞬间的接地通路；D 不符合上拉“默认高电平”的事实。判断按键电平前，先想清楚按键接的是电源还是地，以及引脚配置的是上拉还是下拉。',
    },
    {
      id: 'chapter-04-q4',
      type: 'code',
      question: '下面这段按键程序，下列说法正确的是？',
      code: `const int btnPin = 2;
void setup() {
  pinMode(btnPin, INPUT_PULLUP);
}
void loop() {
  if (digitalRead(btnPin) == LOW) {
    delay(20);
    if (digitalRead(btnPin) == LOW) {
      // 处理按键
    }
  }
}`,
      options: ['delay(20) 之后程序永远停在按键判断里，其他任务无法执行', '这是软件消抖：先检测到按下，延时 20ms 跳过机械弹跳，再确认一次仍为低才处理', '程序依赖外部上拉电阻，没有它完全无法工作', '按下瞬间读到的一定是高电平'],
      answer: 1,
      explanation: '机械按键触点闭合时会弹跳 5~20ms，电平在高低之间反复跳变。程序思路是：第一次读到低电平（按下）后 delay(20) 等待抖动过去，再读一次仍为低才认为真的按下——这就是最经典的软件消抖。A 错：delay(20) 只延时 20ms，loop 仍会继续循环；C 错：INPUT_PULLUP 已启用芯片内部上拉，不需要外部电阻；D 错：按下时按键接通 GND，读到的正是低电平。',
    },
    {
      id: 'chapter-04-q5',
      type: 'multiple',
      question: '下列哪些属于“软件消抖”的做法？',
      options: ['检测到电平变化后延时 10~20ms 再读取确认', '连续多次采样，结果多数一致才认为有效', '在按键两端并联电容做 RC 硬件消抖', '把机械按键换成触摸屏'],
      answer: [0, 1],
      explanation: '软件消抖不增加任何硬件，靠程序“等一等、再确认”：延时后二次读取（A）、多次采样取多数（B）都是常用做法。C 并联电容属于硬件消抖，不是软件方法；D 更换器件与消抖无关。工程上常常“软件为主、硬件为辅”：并联小电容加程序延时确认，效果最好。',
    },
    {
      id: 'chapter-04-q6',
      type: 'choice',
      question: 'GPIO 配置为浮空输入且外部什么都没接时，读取到的电平通常是？',
      options: ['稳定的高电平', '稳定的低电平', '不确定，容易受干扰而随机跳变', '必定是 0V'],
      answer: 2,
      explanation: '浮空输入内部既不接上拉也不接下拉，引脚完全悬空时电压不定，读到的电平随机且极易受手指、导线、环境电磁干扰影响。所以读按键、读开关这类应用几乎总是启用内部上拉或下拉。A、B 都太绝对；D 说必定 0V 也不对，悬空引脚不等于接地。',
    },
    {
      id: 'chapter-04-q7',
      type: 'choice',
      question: '直接用 GPIO 引脚驱动继电器线圈，最可能发生的情况是？',
      options: ['正常工作，线圈所需电流完全由引脚提供', '引脚输出电流不足，继电器无法可靠吸合，电流过大还可能损坏引脚', '继电器会反向工作，需要把引脚反过来接', '程序会编译失败'],
      answer: 1,
      explanation: 'GPIO 引脚输出电流很有限（Arduino 约 20~40mA，STM32 一般不超过 25mA），而继电器线圈吸合需要几十到上百毫安，直接驱动轻则吸合无力、重则烧坏引脚。正确做法是：用三极管/MOSFET 或 ULN2003 驱动，并在线圈两端并联续流二极管吸收断电时的反向电动势。A 高估了引脚能力；C 继电器不存在“反向工作”的说法；D 与电路无关，程序照常编译。',
    },
    {
      id: 'chapter-04-q8',
      type: 'fill',
      question: 'STM32 标准库中推挽输出模式写作 GPIO_Mode_Out_PP，其中 PP 是哪个英文单词（词组）的缩写？（写英文）',
      accept: ['push-pull', 'push pull', 'pushpull', '推挽', '推挽输出'],
      explanation: 'PP 是 Push-Pull（推挽）的缩写：内部上下两个晶体管互补导通，输出高电平时上管导通、输出低电平时下管导通，都能主动驱动。与之相对的是开漏（Open-Drain，OD），对应标准库的 GPIO_Mode_Out_OD，需要外部上拉才能输出高电平。',
    },
  ],
};

// 章节：定时器与延时
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-05'] = {
  id: 'chapter-05',
  order: 5,
  icon: '⏱️',
  title: '定时器与延时',
  summary: '从软件延时的局限说起，理解定时器原理与预分频/自动重装载，学会定时中断、millis() 非阻塞延时与 PWM 输出。',
  sections: [
    {
      type: 'text',
      html: '<h3>从“死等”到“定时”</h3><p>前面几章我们一直在用 <code>delay(1000)</code> 这类<b>软件延时</b>：让 CPU 空转等待，时间到了再继续。它的致命缺点是<b>阻塞（blocking）</b>——延时期间 CPU 什么事都做不了，按个键、读个传感器都会卡住，就像打电话时不能同时回消息。</p><p>更精确的做法是用<b>定时器（timer）</b>：单片机内部的硬件计数器，由<b>独立的时钟</b>驱动自动累加，数满溢出（overflow）时产生中断或事件，CPU 只需在“时间到”时响应一下，其余时间可以干别的活。定时器是单片机里使用频率最高的外设之一：定时、延时、PWM、输入捕获、看门狗都建立在它之上。</p>',
    },
    {
      type: 'text',
      html: '<h3>定时器原理：预分频器与自动重装载</h3><p>以 STM32F103 的通用定时器 TIM2 为例，它有三个关键参数：</p><ul><li><b>计数时钟</b>：定时器的“秒表节拍”，来自系统时钟经分频后得到。STM32F103 系统时钟通常为 72MHz。</li><li><b>预分频器（prescaler，PSC）</b>：把时钟分频，计数器每 <code>PSC+1</code> 个原始时钟脉冲才计一次数。PSC 越大，计数越慢，定时越长。</li><li><b>自动重装载寄存器（Auto-Reload Register，ARR）</b>：计数器从 0 数到 ARR 后<b>溢出</b>，回到 0 重新开始，同时产生“更新事件”（update event），可触发中断。</li></ul><p>于是核心公式：<b>溢出周期 = (PSC+1) × (ARR+1) ÷ 输入时钟频率</b>。例如 72MHz 时钟、PSC=7199、ARR=9999：计数时钟 = 72MHz ÷ 7200 = 10kHz（每 0.1ms 一次），数满 10000 次需要 10000 × 0.1ms = <b>1 秒</b>。这就是“配好两个数，定时 1 秒”的全部秘密。</p><p>Arduino 则把定时器封装成了 <code>millis()</code>：返回开机以来经过的毫秒数（约 49.7 天后 32 位计数回绕归零），配合“当前值 − 上次记录值 ≥ 间隔”的比较，就能实现非阻塞定时，效果与硬件定时器中断异曲同工。</p>',
    },
    {
      type: 'code',
      title: 'STM32 标准库：TIM2 定时 1 秒，中断中翻转 LED',
      code: `// STM32F103C8T6 + 标准库：TIM2 每 1 秒产生更新中断，翻转 PB0 上的 LED
#include "stm32f10x.h"

void TIM2_Init(void)
{
    TIM_TimeBaseInitTypeDef t;
    NVIC_InitTypeDef n;

    RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);  // 打开 TIM2 时钟（挂 APB1）

    // 72MHz / (7199+1) = 10kHz 计数节拍
    t.TIM_Prescaler = 7199;              // PSC
    t.TIM_Period = 9999;                 // ARR：数 10000 次 = 1 秒
    t.TIM_CounterMode = TIM_CounterMode_Up;  // 向上计数 0 -> ARR
    t.TIM_ClockDivision = TIM_CKD_DIV1;
    TIM_TimeBaseInit(TIM2, &t);

    n.NVIC_IRQChannel = TIM2_IRQn;
    n.NVIC_IRQChannelPreemptionPriority = 0;
    n.NVIC_IRQChannelSubPriority = 0;
    n.NVIC_IRQChannelCmd = ENABLE;
    NVIC_Init(&n);

    TIM_ITConfig(TIM2, TIM_IT_Update, ENABLE);  // 使能更新中断
    TIM_Cmd(TIM2, ENABLE);                      // 启动定时器
}

void TIM2_IRQHandler(void)   // 中断服务函数：每 1 秒进入一次
{
    if (TIM_GetITStatus(TIM2, TIM_IT_Update) != RESET) {
        TIM_ClearITPendingBit(TIM2, TIM_IT_Update);  // 必须清除更新标志！
        // 翻转 PB0 上的 LED
        GPIO_WriteBit(GPIOB, GPIO_Pin_0,
            (BitAction)(1 - GPIO_ReadOutputDataBit(GPIOB, GPIO_Pin_0)));
    }
}

int main(void)
{
    GPIO_InitTypeDef g;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
    g.GPIO_Pin = GPIO_Pin_0;
    g.GPIO_Mode = GPIO_Mode_Out_PP;
    g.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOB, &g);

    TIM2_Init();
    while (1) {
        // 主循环可以干别的事，LED 由中断自动翻转
    }
}`,
      note: '目标平台：STM32F103C8T6 + 标准库（STM32CubeIDE/Keil），LED 接 PB0。TIM2 挂在 APB1 总线，输入时钟 72MHz；PSC=7199、ARR=9999 定时 1 秒。中断服务函数里做完事必须调用 TIM_ClearITPendingBit 清除更新标志，否则会反复进入中断。',
    },
    {
      type: 'text',
      html: '<h3>定时器产生固定时长的配置流程</h3><p>无论哪颗芯片，定时都遵循同一套路：</p><ol><li><b>打开时钟</b>：使能定时器外设时钟。STM32 上 APB1/APB2 各自挂着不同的定时器（TIM2~TIM7 在 APB1，TIM1/TIM8 在 APB2），别开错总线。</li><li><b>确定节拍</b>：按“溢出周期 = (PSC+1)×(ARR+1)÷时钟频率”反推 PSC 与 ARR。工程惯例是先把计数频率取成整数值（如 1kHz 或 10kHz），再让 ARR 决定时长。</li><li><b>配置计数模式</b>：向上计数（0→ARR）、向下计数或中心对齐，一般用向上计数。</li><li><b>使能更新中断</b>：打开定时器中断，并到 NVIC 里使能对应中断通道。</li><li><b>启动定时器</b>：调用启动函数开始计数；中断服务函数里做想做的事，并且<b>必须清除更新标志</b>。</li></ol><p>对照上一节例子：72MHz ÷ (7199+1) = 10kHz，数 10000 次（ARR=9999）正好 1 秒。想定时 500ms，把 ARR 改成 4999 即可（10kHz 数 5000 次 = 0.5s）。想提高分辨率，就先加大 PSC 分频、缩小 ARR：例如 PSC=719、ARR=999，计数时钟 100kHz、溢出 10ms，配合软件计数就能做出 10ms 精度。</p>',
    },
    {
      type: 'code',
      title: 'Arduino：用 millis() 实现非阻塞 LED 闪烁',
      code: `// Arduino Uno：millis() 返回开机以来的毫秒数，实现非阻塞延时
const int ledPin = 13;
unsigned long previousMillis = 0;   // 上次翻转的时刻
const unsigned long interval = 500; // 间隔 500ms

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - previousMillis >= interval) {  // 距上次已过 500ms
    previousMillis = now;                  // 更新基准时刻
    digitalWrite(ledPin, !digitalRead(ledPin));  // 翻转 LED
  }
  // 这里可以继续做其他事情，不会被延时卡住
}`,
      note: '目标平台：Arduino Uno / Wokwi 仿真，板载 LED 接 D13。核心写法是“当前值 − 记录值 ≥ 间隔”，无符号减法保证即使 millis() 49.7 天回绕也判断正确；间隔只在时间到达时更新，LED 每 500ms 翻转一次。',
    },
    {
      type: 'text',
      html: '<h3>PWM：用定时器造出“假模拟”信号</h3><p><b>PWM（Pulse Width Modulation，脉宽调制）</b>是一种用数字引脚模拟连续信号的技术：在一个固定周期内让引脚交替输出高/低电平，通过改变<b>高电平占一个周期的比例</b>（占空比，duty cycle）来控制“平均电平”。例如周期 1ms、高电平 0.25ms，占空比就是 25%，LED 看起来只有约 1/4 亮度，直流电机转速约为额定值的 1/4。</p><p>两个关键参数：</p><ul><li><b>频率（frequency）</b>：每秒多少个周期。LED 用 1kHz 左右就足够平滑；电机通常在 10~20kHz，避免人耳听到啸叫。</li><li><b>占空比（duty cycle）</b>：高电平占比 0%~100%，决定平均输出大小。</li></ul><p>PWM 由定时器硬件生成：计数器与<b>比较寄存器（compare register，如 CCR）</b>比较，计数小于比较值时输出高电平，超过后输出低电平。因此<b>占空比 = 比较值 ÷ (ARR+1)</b>，修改比较值就修改亮度或转速。<b>呼吸灯（breathing LED）</b>的思路就是让占空比从 0 缓慢加到最大、再缓慢减回 0，循环往复。Arduino 里一行 <code>analogWrite(pin, 0~255)</code> 就能输出 PWM（0~255 对应占空比 0%~100%），但只能用于支持 PWM 的引脚（Uno 上是 D3/D5/D6/D9/D10/D11）。</p>',
    },
    {
      type: 'code',
      title: 'Arduino：analogWrite 输出 PWM 实现呼吸灯',
      code: `// Arduino Uno：LED 接 PWM 引脚 D9（D13 不支持 PWM！）
const int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // 由暗到亮：占空比 0 -> 255（对应 0% -> 100%）
  for (int duty = 0; duty <= 255; duty++) {
    analogWrite(ledPin, duty);
    delay(8);
  }
  // 由亮到暗：占空比 255 -> 0
  for (int duty = 255; duty >= 0; duty--) {
    analogWrite(ledPin, duty);
    delay(8);
  }
}`,
      note: '目标平台：Arduino Uno / Wokwi 仿真，LED 正极经 220Ω 电阻接 D9。analogWrite 虽然名字像“模拟输出”，实际输出的是 PWM 方波（Uno 上频率约 490Hz/980Hz）；D9/D10/D11 等才是支持 PWM 的引脚，D13 只能 digitalWrite 开关。',
    },
    {
      type: 'code',
      title: 'STM32 标准库：TIM2_CH1 输出 PWM 实现呼吸灯',
      code: `// STM32F103C8T6 + 标准库：TIM2_CH1（PA0）输出 1kHz PWM，占空比循环变化
#include "stm32f10x.h"

void delay_ms(uint32_t ms)   // 简易延时，72MHz 下约 1ms
{
    uint32_t i;
    for (i = 0; i < ms * 4000; i++) {
        __NOP();
    }
}

void PWM_Init(void)
{
    GPIO_InitTypeDef g;
    TIM_TimeBaseInitTypeDef t;
    TIM_OCInitTypeDef oc;

    RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);

    g.GPIO_Pin = GPIO_Pin_0;        // PA0 复用为 TIM2_CH1
    g.GPIO_Mode = GPIO_Mode_AF_PP;  // 复用推挽输出：引脚交给定时器
    g.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &g);

    t.TIM_Prescaler = 71;           // 72MHz/72 = 1MHz 计数节拍
    t.TIM_Period = 999;             // ARR=999：PWM 频率 = 1MHz/1000 = 1kHz
    t.TIM_CounterMode = TIM_CounterMode_Up;
    t.TIM_ClockDivision = TIM_CKD_DIV1;
    TIM_TimeBaseInit(TIM2, &t);

    oc.TIM_OCMode = TIM_OCMode_PWM1;          // PWM 模式 1
    oc.TIM_OutputState = TIM_OutputState_Enable;
    oc.TIM_Pulse = 0;                         // 初始占空比 0%
    oc.TIM_OCPolarity = TIM_OCPolarity_High;
    TIM_OC1Init(TIM2, &oc);
    TIM_OC1PreloadConfig(TIM2, TIM_OCPreload_Enable);
    TIM_Cmd(TIM2, ENABLE);
}

int main(void)
{
    uint16_t duty = 0;
    uint8_t dir = 1;              // 1 变亮，0 变暗
    PWM_Init();
    while (1) {
        TIM_SetCompare1(TIM2, duty);  // 占空比 = duty / 1000
        if (dir) {
            duty += 5;
            if (duty >= 999) dir = 0;
        } else {
            if (duty <= 5) dir = 1;
            duty -= 5;
        }
        delay_ms(10);
    }
}`,
      note: '目标平台：STM32F103C8T6 + 标准库（STM32CubeIDE/Keil），LED 接 PA0（TIM2 通道 1）。要点：① PA0 必须配成复用推挽 GPIO_Mode_AF_PP，引脚才交给定时器；② PSC=71、ARR=999 得到 1kHz PWM；③ 占空比 = 比较值 CCR ÷ (ARR+1)，TIM_SetCompare1 改比较值即改亮度。',
    },
    {
      type: 'tip',
      kind: 'info',
      html: '<p><b>看门狗（watchdog）简介：</b>看门狗本质上是一个<b>独立运行的定时器/计数器</b>，一旦启动就必须由程序定期“喂狗”（重置计数）。如果程序跑飞、死循环或卡死，没有按时喂狗，看门狗计数溢出就会<b>强制复位单片机</b>，让系统自动恢复，常用于工业设备、家电、汽车电子等“出故障要能自愈”的场景。</p><p>STM32 有独立看门狗 IWDG（用独立时钟，不受系统时钟影响）和窗口看门狗 WWDG 两种；Arduino 可用 <code>avr/wdt.h</code> 的 <code>wdt_enable()</code> 启用。两个要点：<b>喂狗间隔必须小于看门狗溢出时间</b>；不要把喂狗放在可能被卡住的分支里，否则看门狗形同虚设。</p>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '软件延时（delay）会<b>阻塞 CPU</b>；定时器由硬件独立计数，精确且不占 CPU。',
        '核心公式：<b>溢出周期 = (PSC+1) × (ARR+1) ÷ 时钟频率</b>；预分频器决定节拍，ARR 决定数多少下。',
        '定时器中断里做完事后<b>必须清除更新标志</b>，否则会反复进入中断。',
        'Arduino 用 <code>millis()</code> 做非阻塞延时（当前值 − 记录值 ≥ 间隔），用 <code>analogWrite()</code> 输出 PWM。',
        'PWM 占空比 = 比较值 ÷ (ARR+1)，改比较值即可控制 LED 亮度或电机转速；呼吸灯就是占空比循环增减。',
        '看门狗靠“喂狗”防止程序跑飞，溢出即复位单片机，喂狗间隔必须短于溢出时间。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-05-q1',
      type: 'choice',
      question: '与软件延时 delay() 相比，用定时器延时的最大优势是？',
      options: ['定时更准，且延时期间 CPU 可以继续做其他任务，不阻塞', '定时器延时不需要配置任何寄存器', '定时器延时的精度只有秒级', '定时器延时不需要时钟驱动'],
      answer: 0,
      explanation: '软件延时让 CPU 空转“死等”，期间无法响应按键、刷新显示，且受中断影响精度一般；定时器由独立硬件时钟驱动计数，溢出时通过中断提醒 CPU，CPU 可并行处理其他任务。B 错：定时器必须配置预分频、自动重装载等参数；C 错：定时器精度可达微秒甚至更高；D 错：定时器恰恰依赖时钟驱动。',
    },
    {
      id: 'chapter-05-q2',
      type: 'fill',
      question: '定时器的预分频器（prescaler）的主要作用是什么？（写 2~4 个字）',
      accept: ['分频', '分频器', '降频', '降低频率', '降低计数频率', '时钟分频'],
      explanation: '预分频器把输入时钟按 PSC+1 分频后送给计数器，计数时钟 = 输入频率 ÷ (PSC+1)。它决定计数器的“节拍快慢”：分频越大计数越慢，配合自动重装载值 ARR 就可以把定时范围扩展到秒级甚至更长，同时也避免计数器过早溢出。',
    },
    {
      id: 'chapter-05-q3',
      type: 'choice',
      question: 'STM32F103 系统时钟 72MHz，配置 TIM2 的 PSC=71、ARR=999，定时器的溢出（更新）周期约为？',
      options: ['1 秒', '1 毫秒', '10 微秒', '1 分钟'],
      answer: 1,
      explanation: '推导：计数时钟 = 72MHz ÷ (PSC+1) = 72MHz ÷ 72 = 1MHz，即每 1 微秒计一次数；计数器从 0 数到 ARR=999 共 (999+1) = 1000 次，耗时 1000 × 1μs = 1 毫秒。A 把 ARR 误当成 999999 量级；C 忘了除以 (PSC+1)；D 明显离谱。牢记公式：溢出周期 = (PSC+1) × (ARR+1) ÷ 时钟频率。',
    },
    {
      id: 'chapter-05-q4',
      type: 'choice',
      question: '还是 72MHz 时钟，若 PSC=7199、ARR=9999，定时器溢出周期是多少？',
      options: ['0.1 秒', '0.5 秒', '1 秒', '10 秒'],
      answer: 2,
      explanation: '推导：计数时钟 = 72MHz ÷ (7199+1) = 10kHz，即每 0.1 毫秒计一次数；数满 (9999+1) = 10000 次需要 10000 × 0.1ms = 1 秒。A 只算了计数节拍没有乘次数；B 需要 ARR≈4999；D 需要把预分频再放大 10 倍。这是正文例子的原题：72MHz ÷ 7200 = 10kHz，数 10000 次正好 1 秒。',
    },
    {
      id: 'chapter-05-q5',
      type: 'code',
      question: '下面这段程序让 D13 上的 LED 怎样闪烁？',
      code: `unsigned long prev = 0;
const unsigned long interval = 250;
void setup() { pinMode(13, OUTPUT); }
void loop() {
  unsigned long now = millis();
  if (now - prev >= interval) {
    prev = now;
    digitalWrite(13, !digitalRead(13));
  }
}`,
      options: ['每 250ms 翻转一次，即 250ms 亮、250ms 灭，闪烁周期约 500ms', 'LED 恒亮，永远不翻转', '每 250ms 灭一次然后永远熄灭', '每秒翻转一次'],
      answer: 0,
      explanation: 'millis() 返回开机以来的毫秒数，当 now − prev ≥ 250 时执行翻转并更新 prev，所以每 250ms 电平翻转一次：亮 250ms、灭 250ms，完整周期约 500ms。B 错：interval 条件会周期性成立；C 错：digitalWrite(13, !digitalRead(13)) 是翻转而不是常灭；D 把间隔当成了 1000ms。注意“无符号时间差”写法即使 millis() 回绕也能正确判断，是工程标准写法。',
    },
    {
      id: 'chapter-05-q6',
      type: 'multiple',
      question: '定时器在单片机中常被用来做哪些事情？',
      options: ['生成精确定时中断，驱动周期性任务', '输出 PWM 控制 LED 亮度或电机转速', '作为看门狗，程序跑飞时自动复位单片机', '直接充当电源给外设供电'],
      answer: [0, 1, 2],
      explanation: '定时器既能定时（计数溢出产生更新中断，A），也能配合比较寄存器输出 PWM（B）；独立看门狗 IWDG 本质上也是一个独立时钟驱动的计数器（C）。D 错：定时器是数字逻辑外设，不提供电能，供电要靠电源电路。',
    },
    {
      id: 'chapter-05-q7',
      type: 'choice',
      question: 'Arduino 中执行 analogWrite(pin, 64)（参数范围 0~255），对应的占空比约为？',
      options: ['25%', '50%', '64%', '100%'],
      answer: 0,
      explanation: 'analogWrite 的 0~255 均匀对应占空比 0%~100%，64 ÷ 256 ≈ 25%，所以对应约 25% 占空比，LED 亮度约为全亮的四分之一。B 需要参数 128 左右；C 把 64 直接当成百分比是常见错误；D 需要参数 255。若换成 STM32：占空比 = 比较值 ÷ (ARR+1)，同样是按比例换算。',
    },
    {
      id: 'chapter-05-q8',
      type: 'choice',
      question: '关于看门狗（watchdog），下列说法正确的是？',
      options: ['看门狗溢出后程序暂停，需要人工重新启动', '程序定期“喂狗”清零计数器；若程序跑飞没有按时喂狗，看门狗溢出会强制复位单片机', '看门狗能检测并修复一切硬件故障', '喂狗间隔可以比看门狗溢出时间长，这样更省事'],
      answer: 1,
      explanation: '看门狗是独立计时电路：程序正常运行时会周期性“喂狗”（重置计数）；一旦程序跑飞、死循环导致喂狗超时，看门狗计数溢出就产生复位信号，把单片机自动拉回正常状态。A 错：复位是自动的，不需要人工；C 错：看门狗只防“程序异常”，检测不了也修不了硬件损坏；D 错：喂狗间隔必须小于溢出时间，否则看门狗总是在复位系统，形同虚设。',
    },
  ],
};

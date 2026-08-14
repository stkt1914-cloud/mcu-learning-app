// 章节：实战项目与进阶
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-12'] = {
  id: 'chapter-12',
  order: 12,
  icon: '🛠️',
  title: '实战项目与进阶',
  summary: '从呼吸灯、电子钟到温湿度采集与蓝牙小车，综合运用各章知识完成实战项目，并入门 RTOS、低功耗设计与调试技巧。',
  sections: [
    {
      type: 'text',
      html: '<h3>实战项目总览：从模块到系统</h3><p>前几章我们学会了点亮 LED、按键输入、定时器、串口、中断等单个模块。本章把这些模块组合成完整的实战项目：<b>呼吸灯</b>、<b>电子钟</b>、<b>温湿度采集显示</b>、<b>蓝牙遥控小车</b>，并介绍 <b>RTOS（实时操作系统，Real-Time Operating System）</b>、<b>低功耗设计</b>与<b>调试技巧</b>。做一个项目的一般流程是：</p><ol><li><b>拆解需求</b>：项目要完成哪些功能，拆成“输入 → 处理 → 输出”。</li><li><b>选型与接线</b>：确定传感器/执行器型号、引脚分配，画连接图。</li><li><b>先驱动后逻辑</b>：先单独调通每个模块（点灯、读温度、发串口），再写业务逻辑。</li><li><b>联调与测试</b>：用串口打印、示波器等工具观察，逐步定位问题。</li><li><b>优化与整理</b>：把代码拆成 .c/.h 模块，加注释，考虑功耗与异常处理。</li></ol><p>牢记一句话：<b>模块先跑通，再谈整合；整合出问题，先用打印定位</b>。</p><h3>PWM 原理：从数字电平到“模拟”效果</h3><p>单片机引脚只能输出 0V 或 3.3V/5V 的数字电平，怎样让 LED 亮度“连续”变化？答案是 <b>PWM（脉宽调制，Pulse Width Modulation）</b>：以固定频率反复输出“高→低”，通过改变<b>高电平在一个周期内所占的时间比例</b>——即<b>占空比（duty cycle）</b>——来改变平均电平。占空比越高，LED 平均电流越大、越亮；电机平均电压越高、转速越快。人眼有视觉暂留（约 1/24 秒），当 PWM 频率足够高（如 490Hz）时，看到的就是稳定亮度而非闪烁。</p><p>实现呼吸灯，就是让占空比从 0 缓慢升到 100%，再缓慢降回 0，如此循环。Arduino 用 <code>analogWrite(pin, duty)</code> 一条语句完成；STM32 则是用<b>定时器（timer）</b>产生 PWM 波形，主循环里修改<b>比较寄存器（compare register，CCR）</b>的值来改变占空比。两种平台的思路完全一致：<b>占空比随时间变化，输出就“呼吸”</b>。</p>',
    },
    {
      type: 'code',
      title: '呼吸灯：Arduino 实现',
      code: `// Arduino Uno：呼吸灯，LED 接 D9（Uno 上带 ~ 标记的 PWM 引脚）
// PWM 引脚：3、5、6、9、10、11
const int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);          // D9 设为输出
}

void loop() {
  // 由暗到亮：占空比从 0 逐渐升到 255（255/255 = 100%）
  for (int duty = 0; duty <= 255; duty++) {
    analogWrite(ledPin, duty);      // 输出 PWM，占空比 = duty / 255
    delay(10);                      // 每级停留 10ms
  }
  // 由亮到暗：占空比从 255 逐渐降到 0
  for (int duty = 255; duty >= 0; duty--) {
    analogWrite(ledPin, duty);
    delay(10);
  }
}`,
      note: '目标平台：Arduino Uno（或 Wokwi 仿真：选 Uno 板，LED 正极接 D9、负极串联 220Ω 电阻到 GND）。analogWrite 输出频率约 490Hz，占空比与亮度近似线性；把 delay(10) 改小可以让呼吸节奏更快。STM32 版本思路：用定时器输出 PWM（如 TIM2 的 CH1 接 PA0），主循环中修改比较值 CCR 实现同样效果，原理完全相同。',
    },
    {
      type: 'text',
      html: '<h3>电子钟项目：定时器计时 + 数码管/LCD 显示</h3><p>电子钟的核心问题是<b>时间基准</b>：不能靠 <code>delay(1000)</code> 累加计时——它不准（受中断、循环长短影响）而且会阻塞主循环。正确做法是用<b>定时器中断（timer interrupt）</b>：配置定时器每 1 秒产生一次更新中断，在中断服务函数里把“秒”加 1，满 60 进“分”，满 60 进“时”，满 24 清零。主循环只负责<b>显示刷新</b>与<b>按键校时</b>，互不干扰。</p><ul><li><b>时间基准</b>：72MHz 主频下，预分频（prescaler）取 7200-1，计数频率变为 10kHz；重装载值（period）取 10000-1，向上计数 10000 次正好 1 秒（计算见本章练习）。</li><li><b>显示方案一：数码管</b>。4 位共阴/共阳数码管用<b>动态扫描（dynamic scanning）</b>逐位快速点亮，或用 TM1650、74HC595 这类驱动芯片省引脚。</li><li><b>显示方案二：LCD1602</b>。4 线模式占 6 个引脚（RS、EN、D4~D7）；加 PCF8574 的 I2C 转接板后只需 SDA/SCL 两根线。</li><li><b>按键校时</b>：按键要<b>消抖（debounce）</b>（读到按下后延时 10~20ms 再确认一次），再区分“切换对象”与“数值加一”。</li></ul><p><b>易错点：</b>中断服务函数里只做“修改时间变量”这种短小操作，<b>不要</b>在里面做数码管扫描或 LCD 写屏——显示刷新放主循环；主循环与中断共享的时间变量要用 <code>volatile</code> 声明，防止编译器优化掉读取。</p>',
    },
    {
      type: 'code',
      title: '电子钟核心：定时器中断计时（STM32）',
      code: `// STM32F103 蓝板 + STM32 标准外设库：TIM2 每秒中断一次，维护时分秒
// LCD1602 使用项目自带的驱动 lcd1602.h（4 线模式：RS=D8, EN=D9, D4~D7=D10~D13）
#include "stm32f10x.h"
#include "lcd1602.h"      // 项目自带的 LCD1602 驱动（lcd_init / lcd_puts）
#include <stdio.h>

volatile uint8_t hour = 0, min = 0, sec = 0;   // 时间状态（中断中修改）

void TIM2_IRQHandler(void) {                   // 定时器中断服务函数
    if (TIM_GetITStatus(TIM2, TIM_IT_Update) != RESET) {
        TIM_ClearITPendingBit(TIM2, TIM_IT_Update);   // 必须清除中断标志！
        sec++;
        if (sec >= 60) { sec = 0; min++; }
        if (min >= 60) { min = 0; hour++; }
        if (hour >= 24) { hour = 0; }
    }
}

int main(void) {
    TIM_TimeBaseInitTypeDef t;

    RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);  // 打开 TIM2 时钟
    t.TIM_Prescaler = 7200 - 1;     // 72MHz / 7200 = 10kHz 计数频率
    t.TIM_Period = 10000 - 1;       // 计数 10000 次 -> 1 秒中断
    t.TIM_CounterMode = TIM_CounterMode_Up;
    TIM_TimeBaseInit(TIM2, &t);
    TIM_ITConfig(TIM2, TIM_IT_Update, ENABLE);
    NVIC_EnableIRQ(TIM2_IRQn);
    TIM_Cmd(TIM2, ENABLE);          // 启动定时器

    lcd_init();                     // LCD1602 初始化
    while (1) {
        char buf[17];
        sprintf(buf, "%02d:%02d:%02d", hour, min, sec);
        lcd_puts(0, 0, buf);        // 在第 0 行第 0 列显示当前时间
    }
}`,
      note: '目标平台：STM32F103C8T6 蓝板 + 标准外设库（Keil 或 STM32CubeIDE 配置标准库工程）。TIM2 挂在 APB1 总线。lcd1602.h 为项目自带的 LCD1602 驱动（函数 lcd_init/lcd_puts 未展开，属于“先驱动后逻辑”中的驱动部分）；若改用 4 位数码管，把 lcd_puts 换成 TM1650/74HC595 的动态扫描即可。这是“代码思路”级示例，重在展示定时器中断计时这一核心。',
    },
    {
      type: 'text',
      html: '<h3>温湿度采集显示：DHT11 单总线 + OLED</h3><p><b>DHT11</b> 是常见的温湿度一体传感器，采用<b>单总线（single bus）</b>通信：只有一根数据线，主机先发启动信号，DHT11 再回送 40 位数据（湿度整数、湿度小数、温度整数、温度小数、<b>校验和（checksum）</b>）。数据线空闲时被上拉电阻拉高，0 和 1 靠<b>高电平持续时间</b>区分：约 26~28 微秒为 0，约 70 微秒为 1。读取流程：主机把总线拉低 18ms 以上发起读取 → 释放总线 → DHT11 应答（先低 80us 再高 80us）→ 连续送出 40 位数据 → 总线恢复空闲。</p><ul><li><b>接线</b>：数据脚到单片机之间必须接 <b>4.7k~10k 上拉电阻</b>；供电 3.3V/5V 均可。</li><li><b>节奏</b>：两次读取间隔必须 ≥ 1 秒，否则 DHT11 不响应或数据出错。</li><li><b>校验</b>：把前 4 个字节相加，取低 8 位应等于校验字节，否则丢弃本次数据。</li><li><b>显示</b>：0.96 寸 OLED 多为 <b>I2C</b> 接口（地址常见 0x3C），用 U8g2 或 Adafruit SSD1306 库，几行代码即可显示文字。</li></ul><p><b>代码思路（Arduino）</b>：用 DHT 库一行 <code>dht.readTemperature()</code> 拿到温度、<code>dht.readHumidity()</code> 拿到湿度；若自己写时序读取，关键是用 <code>micros()</code> 精确计时并做超时判断。拿到数据后逐行 <code>oled.print()</code> 显示，循环末尾 <code>delay(2000)</code> 保证读取间隔。</p>',
    },
    {
      type: 'text',
      html: '<h3>蓝牙遥控小车：电机驱动与串口协议</h3><p>小车项目把前面学的 <b>PWM</b>、<b>GPIO</b>、<b>串口（UART）</b>全部用上。电机不能由 GPIO 直接驱动（电流不够），需要<b>电机驱动芯片</b>：经典的 <b>L298N</b> 双 H 桥驱动板。每个电机由 IN1/IN2 的电平组合决定转向（一个高一个低即正转/反转），<b>ENA/ENB 使能脚接 PWM</b>，占空比决定转速——“转向 + 调速”两个自由度就齐了。遥控链路用 <b>HC-05 蓝牙串口模块</b>：手机 App 与模块配对后，双方像普通串口一样收发字节，默认波特率 9600。</p><p>软件上要设计一个简单的<b>指令协议（protocol）</b>并用<b>状态机（state machine）</b>解析，例如每帧一个字节：</p><ul><li><code>F</code> 前进、<code>B</code> 后退、<code>S</code> 停车</li><li><code>L</code> 左转、<code>R</code> 右转（左右轮给不同占空比实现差速转弯）</li><li>可扩展“F+速度值”格式，如 <code>F150</code> 表示前进且 PWM = 150</li></ul><p><b>注意：</b>电机堵转电流很大，L298N 的电机供电（VM）与逻辑供电要分开且<b>共地</b>；电池电压波动会导致串口乱码，必要时给蓝牙模块单独稳压。调试时先用 USB 串口 + 电脑键盘发指令，跑通后再接蓝牙。</p>',
    },
    {
      type: 'text',
      html: '<h3>RTOS 入门：任务、调度器与信号量</h3><p>裸机程序是“一个死循环 + 中断”，一旦某个模块用 <code>delay()</code> 阻塞，其他功能全部停摆；功能一多，循环里的代码越来越乱，<b>实时性</b>（对事件的响应速度）也难以保证。于是有了 <b>RTOS（实时操作系统，Real-Time Operating System）</b>：把程序拆成多个独立的任务，由一个<b>调度器（scheduler）</b>决定“现在运行哪个任务”。最流行的开源 RTOS 是 <b>FreeRTOS</b>。</p><ul><li><b>任务（task）</b>：就是一个带独立栈的无限循环函数，<code>xTaskCreate()</code> 创建，可指定优先级与栈大小。</li><li><b>调度（scheduling）</b>：优先级高的任务先运行；同级任务按时间片轮流；任务调用 <code>vTaskDelay()</code> 或等待信号量时会主动让出 CPU。</li><li><b>信号量（semaphore）</b>：任务间的“消息”，一个任务 <code>xSemaphoreGive()</code> 释放，另一个任务 <code>xSemaphoreTake()</code> 等待——用于事件通知；计数型信号量还可用于共享资源互斥（比如保护串口不被两个任务同时写）。</li></ul><p>典型分工：按键检测任务（10ms 轮询）→ 释放信号量 → 显示/上报任务（阻塞等待信号量）。这样按键与显示互不拖累。STM32CubeIDE 内置 FreeRTOS，勾选即可生成工程。注意任务栈要开够，栈溢出会导致“莫名重启”，是新手最常见的坑。</p>',
    },
    {
      type: 'code',
      title: 'FreeRTOS 任务与信号量：核心示例',
      code: `// STM32F103 + FreeRTOS：任务 + 二值信号量（核心任务代码片段）
// PA0 接按键到 GND（按下为低电平），USART1 打印调试信息
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
#include "main.h"          // CubeIDE 生成的工程头文件（含 GPIO 定义）

SemaphoreHandle_t sem_btn;     // 二值信号量：按键事件通知

// 任务 1：每 10ms 轮询一次按键，按下时释放信号量
void vKeyTask(void *argument) {
    for (;;) {
        if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == GPIO_PIN_RESET) {
            xSemaphoreGive(sem_btn);            // 发送“按键按下”事件
        }
        vTaskDelay(pdMS_TO_TICKS(10));          // 延时 10ms 并让出 CPU
    }
}

// 任务 2：阻塞等待信号量，收到后串口打印一次
void vPrintTask(void *argument) {
    for (;;) {
        if (xSemaphoreTake(sem_btn, portMAX_DELAY) == pdPASS) {
            printf("key pressed\\r\\n");        // 需将 printf 重定向到 USART1
        }
    }
}

int main(void) {
    // 假设时钟、GPIOA、USART1 已初始化（CubeIDE 自动生成的 MX_XXX_Init）
    sem_btn = xSemaphoreCreateBinary();          // 创建二值信号量
    xTaskCreate(vKeyTask, "key", 128, NULL, 1, NULL);    // 创建任务，优先级 1
    xTaskCreate(vPrintTask, "print", 128, NULL, 1, NULL);
    vTaskStartScheduler();                       // 启动调度器，之后不再返回
    while (1) { }
}`,
      note: '目标平台：STM32F103 + FreeRTOS（STM32CubeIDE 勾选 FreeRTOS 组件自动生成工程，或自行移植 FreeRTOS 源码到 Keil 工程）。此为“核心任务代码片段”：演示两个任务 + 一个二值信号量（binary semaphore）的典型写法；在 CubeIDE 中通常把任务创建放进 MX_FREERTOS_Init 生成的位置。printf 需重定向到串口，PA0 按键接 GND。',
    },
    {
      type: 'text',
      html: '<h3>低功耗设计入门：睡眠模式与唤醒源</h3><p>电池供电的设备，功耗是硬指标。STM32 提供三档<b>低功耗模式（low-power mode）</b>，功耗越低、唤醒越麻烦：</p><ul><li><b>睡眠（Sleep）</b>：只停 CPU，外设与中断照常工作，任何中断都能唤醒，唤醒后从原位置继续执行——代价最小，适合“没事就歇着”的场景。</li><li><b>停止（Stop）</b>：主时钟停止，靠外部中断或 RTC 唤醒，唤醒后需要重新配置时钟。</li><li><b>待机（Standby）</b>：几乎全部断电，功耗最低（微安级），唤醒后程序相当于<b>复位重跑</b>，只能保留极少备份数据。</li></ul><p>进入睡眠模式，ARM 内核只需一条 <code>__WFI()</code>（wait for interrupt，等待中断）指令；常见的<b>唤醒源（wakeup source）</b>有：GPIO 外部中断、定时器中断、<b>RTC（实时时钟，Real-Time Clock）</b>闹钟、串口接收中断等。设计要点：<b>用中断代替轮询</b>、不用外设及时关闭时钟、GPIO 不要悬空（设上拉/下拉）、LED 用低功耗接法。Arduino 平台可用 LowPower 库（如 <code>LowPower.sleep()</code>）实现类似效果。功耗优化要“先测再改”：用万用表电流档实测各模式下的电流。</p>',
    },
    {
      type: 'tip',
      kind: 'tip',
      html: '<h3>调试三板斧：打印、看波形、模块化</h3><p><b>① 串口打印（最常用）</b>：在关键位置打印变量与状态标志，判断程序“走到哪、值是多少”。STM32 把 printf 重定向到串口，Arduino 用 <code>Serial.print()</code>。看到乱码先查<b>波特率</b>是否一致。</p><p><b>② 示波器 / 逻辑分析仪</b>：示波器看 PWM 波形与频率、信号边沿；逻辑分析仪（几十元、USB 接口）抓串口/I2C/单总线时序，数一数每个位的宽度就知道协议对不对。DHT11 读不出数据时，抓一次时序立刻真相大白。</p><p><b>③ 模块化与头文件组织</b>：每个外设一个 <code>.c</code> + <code>.h</code> 文件，头文件里写<b>防重复包含（include guard）</b>：</p><p><code>#ifndef MYLED_H</code><br><code>#define MYLED_H</code><br><code>void led_init(void);</code><br><code>void led_set(uint8_t on);</code><br><code>#endif</code></p><p>头文件只放<b>函数原型、宏、类型定义</b>，全局变量尽量用函数接口封装（如 <code>led_set(1)</code>），这样项目变大后依然清晰，也便于在 Wokwi 仿真器里逐步调试。</p>',
    },
  ],
  exercises: [
    {
      id: 'chapter-12-q1',
      type: 'choice',
      question: 'PWM 信号中，“占空比（duty cycle）”指的是什么？',
      options: ['信号周期（period）的长短', '一个周期内高电平时间占整个周期的比例', '信号电压幅值的大小', '输出引脚的数量'],
      answer: 1,
      explanation: '占空比 = 高电平时间 ÷ 整个周期 × 100%，它决定了 PWM 的平均电平，进而决定 LED 亮度、电机转速等。A 错：周期长短对应 PWM 频率，与占空比无关；C 错：单片机 PWM 的高低电平幅值是固定的（0/3.3V 或 0/5V），占空比不改变幅值；D 错：占空比与引脚数量毫无关系。',
    },
    {
      id: 'chapter-12-q2',
      type: 'choice',
      question: '呼吸灯程序中，通过 for 循环不断改变 analogWrite(ledPin, duty) 的 duty 值，本质上改变的是 PWM 的什么参数？',
      options: ['引脚输出电压的幅值', 'PWM 的占空比', 'PWM 的频率', '定时器的时钟源'],
      answer: 1,
      explanation: 'analogWrite 并不改变电压幅值（高低电平仍是 0/5V），而是改变高电平与低电平的时间比例，即占空比；占空比越大，LED 平均电流越大、越亮。A 错：幅值不变；C 错：PWM 频率由定时器配置决定，与 duty 参数无关；D 错：时钟源在初始化时确定。初学者最易混淆的点就是“PWM 调光/调速是调占空比，而不是调电压”。',
    },
    {
      id: 'chapter-12-q3',
      type: 'code',
      question: 'STM32F103 主频 72MHz，配置 TIM2：预分频（prescaler）设为 7200-1，重装载值（period）设为 10000-1，向上计数。定时器产生一次更新中断（update interrupt）的间隔是？',
      code: `TIM_TimeBaseInitTypeDef t;
t.TIM_Prescaler = 7200 - 1;   // 预分频
t.TIM_Period = 10000 - 1;     // 重装载值
t.TIM_CounterMode = TIM_CounterMode_Up;
TIM_TimeBaseInit(TIM2, &t);`,
      options: ['1ms', '10ms', '1 秒', '10 秒'],
      answer: 2,
      explanation: '计数时钟 = 72MHz ÷ 7200 = 10kHz（每 0.1ms 计一个数）；向上计数到 10000 次触发更新中断，间隔 = 10000 × 0.1ms = 1 秒。A 错：那是 72MHz 不分频直接计 72000 次的量级；B 错：若 period 取 1000-1（只计 1000 次）才是 0.1s；D 错：把预分频与重装载值搞反（10000 分频 + 7200 重装载）才会得到约 10s 的错觉。注意“7200-1”表示 7200 分频，寄存器值比实际分频数小 1，这是寄存器风格的常见易错点。',
    },
    {
      id: 'chapter-12-q4',
      type: 'multiple',
      question: '关于定时器中断的使用，下列说法正确的有哪些？',
      options: ['打开定时器时钟（如 RCC_APB1PeriphClockCmd）后才能配置和使用定时器', '在中断服务函数（ISR）中必须清除对应的中断标志，否则可能反复进入中断', '可以在中断服务函数里执行耗时的串口打印和延时操作', '预分频器（prescaler）用来分频定时器输入时钟，决定计数频率'],
      answer: [0, 1, 3],
      explanation: 'STM32 外设默认时钟关闭，必须先使能才能配置（A 对）；更新中断产生后标志位一直置位，不在 ISR 里清除会立刻再次触发中断，程序卡死（B 对，这是嵌入式大忌）；中断服务函数应短小精悍，耗时的打印与延时应放主循环（C 错）；预分频器降低计数时钟频率，计数频率 = 外设时钟 ÷（预分频值 + 1）（D 对）。',
    },
    {
      id: 'chapter-12-q5',
      type: 'choice',
      question: '在 FreeRTOS 中，xSemaphoreGive() 与 xSemaphoreTake() 用于实现什么？',
      options: ['任务之间的同步与互斥', '动态分配内存', '改变任务的优先级', '启动调度器'],
      answer: 0,
      explanation: '信号量（semaphore）是 RTOS 中经典的同步/互斥原语：Give 释放信号量，Take 获取（等待）信号量，一个任务“释放”、另一个任务“等待”，即可实现事件通知与共享资源互斥。B 错：内存分配用 pvPortMalloc 或 heap 管理函数；C 错：优先级在创建任务（xTaskCreate）时指定，运行中可用 vTaskPrioritySet 调整，与信号量无关；D 错：启动调度器用 vTaskStartScheduler()。',
    },
    {
      id: 'chapter-12-q6',
      type: 'choice',
      question: '与裸机“大循环 + 延时”的写法相比，引入 RTOS 的主要价值是？',
      options: ['程序运行速度一定会更快', '可以把不同实时性需求的任务交给调度器按优先级调度，代码结构更清晰、实时性更好', '不再需要编写任何代码', '系统功耗一定会降低'],
      answer: 1,
      explanation: 'RTOS 把程序拆成多个任务，由调度器按优先级与时间片调度，避免“一个延时阻塞全局”的裸机问题，实时性与可维护性都更好。A 错：RTOS 有任务切换开销，不保证程序更快；C 错：RTOS 只是组织代码的方式，代码照样要写；D 错：功耗取决于硬件设计与低功耗策略，与是否使用 RTOS 没有直接关系。',
    },
    {
      id: 'chapter-12-q7',
      type: 'choice',
      question: '关于 STM32 的睡眠模式（Sleep Mode，通过 __WFI() 进入），下列说法正确的是？',
      options: ['CPU 停止运行，但外设和中断仍工作，可被中断唤醒，唤醒后从原位置继续执行', '整颗芯片所有内容全部断电，唤醒后程序从头运行', '进入后无法再被唤醒', '唤醒后必须重新配置时钟树才能继续工作'],
      answer: 0,
      explanation: '睡眠模式只停止 CPU 内核，外设时钟与中断控制器仍工作，外部中断/定时器中断可将其唤醒，且唤醒后从 WFI 之后的指令继续执行，无需重新初始化（A 对）。B 描述的是待机模式（Standby）或近似断电效果，唤醒后相当于复位；C 错：睡眠模式正是靠中断唤醒的；D 错：停止（Stop）/待机模式唤醒后才需要重新配置时钟，睡眠模式不需要。睡眠/停止/待机三档功耗与恢复成本递增，是低功耗设计的核心知识。',
    },
    {
      id: 'chapter-12-q8',
      type: 'fill',
      question: 'L298N 电机驱动板中，用单片机控制电机转速，通常把使能脚（ENA/ENB）接到单片机的哪个功能引脚上？（填英文缩写，如 XXX）',
      accept: ['PWM', 'pwm', 'PWM 引脚', 'pwm 引脚'],
      explanation: 'L298N 的 ENA/ENB 是使能端，接到单片机的 PWM 输出引脚后，通过改变占空比即可改变加在电机上的平均电压，从而实现调速；转向则由 IN1~IN4 的电平组合决定。若把使能脚固定接高电平，电机只能全速转，无法调速；若悬空，电机根本不会转。这是电机驱动项目的核心接线知识点。',
    },
  ],
};

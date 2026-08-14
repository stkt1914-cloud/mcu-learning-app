// 章节：中断系统
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-06'] = {
  id: 'chapter-06',
  order: 6,
  icon: '⚡',
  title: '中断系统',
  summary: '理解中断与轮询的区别，认识中断源与向量表，学会用 Arduino 与 STM32 编写中断服务函数，掌握标志清除、优先级与临界区。',
  sections: [
    {
      type: 'text',
      html: '<h3>什么是中断（interrupt）</h3><p>单片机执行程序时是一条指令一条指令顺序执行的，但实际系统中，外部事件（按键按下、传感器电平变化、定时器溢出、串口收到数据）随时可能发生。如果 CPU 只能停下来"等着"这些事件，就浪费了大量时间。<b>中断（interrupt）</b>机制让外设或内部模块在事件发生时主动"打断"CPU 当前执行的程序，跳转去执行一段专门的处理代码，处理完再回到刚才被打断的地方继续执行。</p><p>与中断相对的是<b>轮询（polling）</b>：程序在循环里反复查询某个标志或引脚电平。两者对比：</p><ul><li><b>轮询</b>：实现简单、思路直观，但 CPU 必须不断查询，忙等浪费性能，两次查询之间还可能漏掉短事件，响应有延迟。</li><li><b>中断</b>：CPU 平时专心做主任务，事件到来时由硬件自动通知并跳转处理，响应及时、不忙等，是嵌入式系统最核心的机制之一。</li></ul>',
    },
    {
      type: 'table',
      title: '常见中断源一览',
      headers: ['中断源', '触发时机', '典型应用'],
      rows: [
        ['外部中断（EXTI）', '引脚电平变化或边沿触发', '按键检测、传感器信号'],
        ['定时器中断', '计数溢出、比较匹配', '周期性任务、时基、PWM'],
        ['串口中断（UART）', '收到数据或发送完成', '通信收发、命令解析'],
        ['ADC 中断', '模数转换完成', '采样就绪后取结果'],
        ['DMA 中断', '数据搬运完成', '大批量数据搬移，减少 CPU 参与'],
      ],
    },
    {
      type: 'code',
      title: 'Arduino 外部中断：按键触发翻转 LED',
      code: `// Arduino Uno：按键接 D2（中断引脚 INT0，内部上拉），LED 接 D13
volatile bool pressFlag = false;   // ISR 与主循环共享的标志，必须 volatile

// 中断服务函数：只置标志，尽快返回
void onButtonPress() {
  pressFlag = true;
}

void setup() {
  pinMode(2, INPUT_PULLUP);        // 内部上拉，按键按下引脚变为低电平
  pinMode(13, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(2), onButtonPress, FALLING);
}

void loop() {
  if (pressFlag) {                 // 具体事务放到主循环处理
    pressFlag = false;
    delay(50);                     // 简单消抖（在主循环做，不在 ISR 里）
    digitalWrite(13, !digitalRead(13));  // 翻转 LED
  }
  // 主循环其余任务照常运行，不会被按键"堵住"
}`,
      note: 'Arduino Uno 上只有 D2、D3 支持外部中断。FALLING 表示下降沿触发；使用 INPUT_PULLUP 时按键按下为高→低跳变。关键原则：ISR 只置标志，具体处理放到主循环。',
    },
    {
      type: 'text',
      html: '<h3>中断源与中断向量表（vector table）</h3><p>每个能产生中断的外设或模块都称为一个<b>中断源（interrupt source）</b>，每个中断源有一个固定编号。芯片内部维护一张<b>中断向量表（vector table）</b>，表中每个表项存放对应中断服务函数的入口地址。当某个中断被触发，CPU 就按编号查表，跳转到对应函数执行。</p><p>在 STM32 上，中断服务函数（ISR，Interrupt Service Routine）的名字是固定的，由启动文件规定：外部中断 0 的处理函数必须叫 <code>EXTI0_IRQHandler</code>、定时器 2 的必须叫 <code>TIM2_IRQHandler</code>。名字写错编译不会报错，但中断永远不会被响应。Arduino 则把细节封装起来：<code>attachInterrupt</code> 注册一个普通函数作为 ISR，由框架在底层挂钩。无论哪种方式，ISR 的编写原则都一样：<b>短、快、准</b>——尽量只做置标志、搬运数据等轻量操作。</p>',
    },
    {
      type: 'code',
      title: 'STM32 标准库外部中断 EXTI：按键翻转板载 LED',
      code: `// STM32F103 蓝板：PA0 接按键（低电平有效），PC13 接板载 LED
#include "stm32f10x.h"
#include "stm32f10x_exti.h"

// 外部中断 0 的服务函数：名字由启动文件固定
void EXTI0_IRQHandler(void)
{
    if (EXTI_GetITStatus(EXTI_Line0) != RESET) {
        // 翻转 PC13
        GPIO_WriteBit(GPIOC, GPIO_Pin_13,
                      (BitAction)(1 - GPIO_ReadOutputDataBit(GPIOC, GPIO_Pin_13)));
        EXTI_ClearITPendingBit(EXTI_Line0);   // 清除中断标志！否则会反复进中断
    }
}

int main(void)
{
    GPIO_InitTypeDef gpio;
    EXTI_InitTypeDef exti;
    NVIC_InitTypeDef nvic;

    // 打开 GPIOA、GPIOC 与 AFIO 时钟（EXTI 需要 AFIO 做引脚映射）
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_GPIOC
                           | RCC_APB2Periph_AFIO, ENABLE);

    // PA0 上拉输入（按键按下接地，产生下降沿）
    gpio.GPIO_Pin = GPIO_Pin_0;
    gpio.GPIO_Mode = GPIO_Mode_IPU;
    GPIO_Init(GPIOA, &gpio);
    // PC13 推挽输出
    gpio.GPIO_Pin = GPIO_Pin_13;
    gpio.GPIO_Mode = GPIO_Mode_Out_PP;
    gpio.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOC, &gpio);

    // 把 PA0 映射到 EXTI 第 0 号线
    GPIO_EXTILineConfig(GPIO_PortSourceGPIOA, GPIO_PinSource0);

    exti.EXTI_Line = EXTI_Line0;
    exti.EXTI_Mode = EXTI_Mode_Interrupt;
    exti.EXTI_Trigger = EXTI_Trigger_Falling;   // 下降沿触发
    exti.EXTI_LineCmd = ENABLE;
    EXTI_Init(&exti);

    // 配置 NVIC：使能 EXTI0 中断
    nvic.NVIC_IRQChannel = EXTI0_IRQn;
    nvic.NVIC_IRQChannelPreemptionPriority = 1;
    nvic.NVIC_IRQChannelSubPriority = 0;
    nvic.NVIC_IRQChannelCmd = ENABLE;
    NVIC_Init(&nvic);

    while (1) {
        // 主循环空闲，按键由中断处理
    }
}`,
      note: '标准库开发流程：开时钟 → 配 GPIO → 配 EXTI → 配 NVIC。注意 ISR 末尾的 EXTI_ClearITPendingBit 必不可少，否则标志未清会立刻再次进入中断。',
    },
    {
      type: 'code',
      title: 'STM32 HAL 定时器中断：每秒翻转一次 LED',
      code: `// STM32F103 蓝板：TIM2 定时 1 秒产生更新中断，翻转 PC13 板载 LED
// 前提：CubeMX 已生成工程并配置好 72MHz 系统时钟
#include "stm32f1xx_hal.h"

TIM_HandleTypeDef htim2;

// HAL 的回调函数：所有定时器共用，靠 Instance 区分
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM2) {
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
        // 更新中断的标志（UIF）由 HAL 在 IRQHandler 里自动清除
    }
}

int main(void)
{
    HAL_Init();
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_TIM2_CLK_ENABLE();

    GPIO_InitTypeDef gpio = {0};
    gpio.Pin = GPIO_PIN_13;
    gpio.Mode = GPIO_MODE_OUTPUT_PP;
    gpio.Pull = GPIO_NOPULL;
    gpio.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(GPIOC, &gpio);

    // 72MHz / 7200（预分频）/ 10000（周期）= 1Hz
    htim2.Instance = TIM2;
    htim2.Init.Prescaler = 7199;               // 预分频：7200 分频 → 10kHz 计数时钟
    htim2.Init.CounterMode = TIM_COUNTERMODE_UP;
    htim2.Init.Period = 9999;                  // 计满 10000 个脉冲 → 1 秒
    htim2.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
    HAL_TIM_Base_Init(&htim2);

    HAL_TIM_Base_Start_IT(&htim2);             // 启动定时器并使能更新中断

    while (1) { }
}`,
      note: 'CubeMX 会自动生成 TIM2_IRQHandler（内部调用 HAL_TIM_IRQHandler）以及 MspInit 里的 NVIC 配置。HAL 封装的回调里无需手动清标志，但理解"标志由谁清除"依然是重点。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>易错点：中断标志（flag）必须及时清除。</b>很多外设触发中断后会产生一个"事件发生"的标志位，例如 STM32 的 EXTI 挂起位、定时器更新标志 UIF、串口接收标志 RXNE。如果处理完不清除：</p><ul><li>EXTI 标志不清除：退出中断后 CPU 发现标志仍为 1，会<b>立刻再次进入中断</b>，反复触发，主程序永远跑不回来。</li><li>定时器/串口标志不清除：同类中断将无法再次触发。</li><li>Arduino/HAL 的封装多数会自动清除（如 HAL 在 IRQHandler 中清除），但标准库/寄存器开发需要手动调用 <code>EXTI_ClearITPendingBit</code> 或读取数据寄存器来清标志。</li></ul><p>写中断代码时，先问自己一句："这个中断的标志清了吗？"</p>',
    },
    {
      type: 'text',
      html: '<h3>中断优先级与嵌套（nested interrupt）</h3><p>多个中断可能同时到来，系统需要决定先响应谁，这就是<b>优先级（priority）</b>。STM32 的 NVIC（嵌套向量中断控制器）支持两级优先级：<b>抢占优先级（preemption priority）</b>和<b>子优先级（sub priority）</b>。注意：<b>数值越小，优先级越高</b>。</p><ul><li>抢占优先级不同：高抢占优先级的中断可以<b>打断</b>正在执行的低抢占优先级 ISR，处理完再回去继续——这就是<b>中断嵌套</b>。</li><li>抢占优先级相同：按子优先级排队；都相同时按中断号，且后到的要等前面的处理完。</li><li>同抢占优先级的中断之间不能互相打断。</li></ul><p>Arduino（AVR 内核）只有一级优先级：ISR 执行期间其他中断默认被屏蔽，所以嵌套问题在 STM32 上更常见。合理分配优先级是实时系统设计的关键。</p>',
    },
    {
      type: 'text',
      html: '<h3>临界区（critical section）与关中断</h3><p>主循环和 ISR 可能访问同一份数据（如计数变量、缓冲区）。如果主循环读到一半被 ISR 改写，数据就会不一致。这种"不允许被打断"的代码段称为<b>临界区（critical section）</b>，保护办法是进入前<b>关中断</b>、退出后<b>开中断</b>：STM32（Cortex-M）用 <code>__disable_irq()</code> 与 <code>__enable_irq()</code>；AVR（Arduino）用 <code>cli()</code> 与 <code>sei()</code>。关中断期间所有中断都被推迟响应，所以临界区必须<b>尽可能短</b>，否则会拖垮系统实时性。</p><p><b>ISR 里绝对不要做的事：</b></p><ul><li>不要用 <code>delay()</code> 长时间延时——ISR 里"睡觉"会让系统卡死，延时期间其他中断也无法响应。</li><li>不要调用 <code>printf</code> 等慢速、阻塞函数——串口发送可能占用几百微秒到毫秒。</li><li>不要用 <code>malloc()</code>/<code>new</code> 动态分配内存——不可重入且耗时，还可能改变中断上下文。</li><li>不要做复杂运算、浮点运算或大数组拷贝。</li></ul><p>正确姿势：ISR 里置标志、搬运数据，主循环里慢慢处理。</p>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '中断让 CPU 从"忙等轮询"中解放出来，事件发生时由硬件通知。',
        '常见中断源：外部中断、定时器、串口、ADC、DMA，各有向量表入口。',
        'ISR 三原则：短、快、准；只置标志，主循环处理事务。',
        '中断标志必须及时清除，否则会反复触发或无法再触发。',
        'STM32 优先级数值越小越优先，高抢占优先级可嵌套低优先级。',
        '临界区用关中断保护共享数据，关中断时间越短越好。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-06-q1',
      type: 'choice',
      question: '关于轮询（polling）与中断（interrupt），下列说法正确的是？',
      options: ['轮询方式下 CPU 无需反复查询，效率最高', '中断方式下，事件到来时硬件通知 CPU 转去处理，处理完再回来，响应及时', '中断方式下 CPU 完全空闲', '轮询永远不会漏掉任何事件'],
      answer: 1,
      explanation: '中断的核心价值：CPU 平时执行主任务，事件发生时由硬件"打断"并跳转处理，处理完回到断点，响应及时且不忙等，B 对。A 错：轮询恰恰需要反复查询、浪费 CPU；C 错：中断方式下 CPU 照常执行主任务，只是偶尔被打断；D 错：两次查询之间发生的短事件很可能被轮询漏掉。',
    },
    {
      id: 'chapter-06-q2',
      type: 'multiple',
      question: '在中断服务函数（ISR）中，下列哪些做法应该避免？',
      options: ['调用 delay() 长时间延时', '使用 printf() 向串口打印调试信息', '使用 malloc()/new 动态分配内存', '置一个 volatile 标志让主循环去处理'],
      answer: [0, 1, 2],
      explanation: 'ISR 必须短小快速：delay 会让系统在 ISR 期间完全卡死（A 错）；printf 阻塞且耗时，串口发送期间其他中断无法响应（B 错）；动态内存分配不可重入且耗时（C 错）。D 是推荐做法——ISR 只置标志，具体事务交给主循环，这正是编写 ISR 的正确姿势，所以 D 不需要避免。',
    },
    {
      id: 'chapter-06-q3',
      type: 'code',
      question: '下面的 Arduino 程序中，按键（接 D2）按下并松开一次（无抖动），串口会打印什么？',
      code: `volatile bool flag = false;
void onPress() { flag = true; }
void setup() {
  pinMode(2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2), onPress, FALLING);
  Serial.begin(9600);
}
void loop() {
  if (flag) {
    flag = false;
    Serial.println("pressed");
  }
}`,
      options: ['持续打印，直到松开按键', '打印一次 "pressed"', '不会打印任何内容', '程序编译错误'],
      answer: 1,
      explanation: 'FALLING 表示下降沿触发，按键按下产生一次下降沿，ISR 只执行一次，把 flag 置 true；主循环检测到后打印一次并立即清零，所以打印一次（B 对）。A 错：ISR 不是电平触发，不会持续打印；C 错：flag 确实被置位，主循环会打印；D 错：程序语法正确，volatile、attachInterrupt 用法都没问题。注意：若按键存在机械抖动，实际可能触发多次，需要消抖处理。',
    },
    {
      id: 'chapter-06-q4',
      type: 'choice',
      question: 'STM32 外部中断处理完毕后，如果忘记清除 EXTI 的中断挂起标志（Pending bit），会发生什么？',
      options: ['没有任何影响，下次中断照常触发', '中断只会触发一次，之后被硬件自动屏蔽', '退出中断后标志仍为 1，会立即再次进入中断，反复触发', '程序崩溃并重启'],
      answer: 2,
      explanation: 'EXTI 的挂起标志是中断是否重新触发的依据：处理完不清除，标志保持 1，CPU 退出 ISR 后再次检测到挂起，立即重新进入中断，形成反复触发、主程序被"饿死"（C 对）。A 错：影响非常大；B 错：硬件不会自动屏蔽或清除；D 错：通常不会崩溃重启，而是反复进中断。这也是"中断标志必须清除"这一易错点的典型场景。',
    },
    {
      id: 'chapter-06-q5',
      type: 'choice',
      question: '关于中断优先级与嵌套（nested interrupt），下列说法正确的是？',
      options: ['所有中断源的优先级都一样，谁先到谁先处理', 'STM32 中优先级数值越大，优先级越高', '高抢占优先级的中断可以打断正在执行的低优先级 ISR，形成嵌套', '单片机硬件上不可能实现中断嵌套'],
      answer: 2,
      explanation: 'STM32 的 NVIC 支持抢占优先级，高抢占优先级中断可以打断低抢占优先级的中断服务函数，处理完再返回继续，这就是中断嵌套，C 对。A 错：不同中断源的优先级可以配置且互不相同；B 错：STM32 中数值越小优先级越高，恰好相反；D 错：Cortex-M 等主流内核原生支持嵌套。',
    },
    {
      id: 'chapter-06-q6',
      type: 'fill',
      question: 'ISR 与主循环共享的变量，在 C 语言中通常需要用哪个关键字修饰，防止编译器优化导致读取不到最新值？（写英文关键字）',
      accept: ['volatile', 'volatile;', 'volatile int', 'volatile int;'],
      explanation: 'volatile 告诉编译器"该变量可能在程序流程之外被改变（如被 ISR 修改）"，禁止把它缓存到寄存器里做优化，保证每次都从内存读取最新值。如果不加 volatile，编译器可能把变量的值优化进寄存器，导致主循环永远读不到 ISR 写入的新值。',
    },
    {
      id: 'chapter-06-q7',
      type: 'multiple',
      question: '关于临界区（critical section）与关中断，下列说法正确的有？',
      options: ['进入临界区前关闭中断，可防止 ISR 打断正在执行的临界操作', '临界区通常用于保护主循环与 ISR 之间共享的数据', '关中断的时间越短越好，否则影响系统实时性', '关中断是万能方法，可以一直关着不用打开'],
      answer: [0, 1, 2],
      explanation: '关中断能保证临界区内的读写不被 ISR 插队，从而保护共享数据的一致性，A、B 对。但关中断期间所有中断都被推迟，时间过长会错过外部事件、拖垮实时性，所以必须越短越好，C 对。D 错：一直关中断等于禁用整个中断系统，任何事件都无法响应，绝不是万能方法。',
    },
    {
      id: 'chapter-06-q8',
      type: 'choice',
      question: 'STM32F103 系统时钟 72MHz，若把 TIM2 的预分频器（Prescaler）设为 7199（即 7200 分频），定时器计数时钟为多少？',
      options: ['72MHz', '10kHz', '100kHz', '1kHz'],
      answer: 1,
      explanation: '计数时钟 = 系统时钟 ÷（预分频值 + 1）= 72MHz ÷ (7199 + 1) = 72MHz ÷ 7200 = 10kHz，所以 B 对。A 错：7200 分频后不可能还是 72MHz；C 错：100kHz 对应 720 分频；D 错：1kHz 对应 72000 分频。这类预分频计算是定时器章节的经典易错题，务必记住公式"实际分频系数 = Prescaler + 1"。',
    },
  ],
};

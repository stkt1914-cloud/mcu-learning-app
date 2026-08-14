// 章节：单片机 C 语言与寄存器操作
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-03'] = {
  id: 'chapter-03',
  order: 3,
  icon: '🔧',
  title: '单片机 C 语言与寄存器操作',
  summary: '了解嵌入式 C 的特点与寄存器（SFR）概念，理解 volatile 关键字为什么必不可少，学会用位操作宏、定宽类型与延时函数编写高效、可移植的底层代码。',
  sections: [
    {
      type: 'text',
      html: '<h3>嵌入式 C 语言的特点</h3><p>嵌入式 C 和桌面 C 语法完全一样，但<b>使用习惯</b>很不一样，因为单片机的资源非常有限：Flash 通常只有几十 KB 到几 MB，RAM 只有几 KB 到几百 KB。</p><ul><li><b>一般不用动态内存分配</b>：<code>malloc</code>/<code>free</code> 在裸机程序里几乎不用——内存碎片、分配失败、耗时不可控，嵌入式要求运行时间和资源都可预测。</li><li><b>尽量不用浮点</b>：多数 8/16 位单片机没有硬件浮点单元（FPU），float 运算要靠软件模拟，既慢又占大量 Flash/RAM；能用整数和定点运算就尽量用整数。</li><li><b>直接访问硬件</b>：通过指针读写寄存器地址、操作内存映射的外设。</li><li><b>大量使用位运算、宏和 static 变量</b>，追求体积小、效率高、行为可预测。</li></ul><p>为了写出“多大就是多大”的确定类型，C99 标准头文件 <code>stdint.h</code> 定义了 <code>uint8_t</code>（无符号 8 位）、<code>uint16_t</code>（无符号 16 位）、<code>uint32_t</code> 等<b>定宽整数类型</b>，单片机代码里应优先使用它们，而不是 int、char 这种宽度随编译器变化的类型。</p>',
    },
    {
      type: 'table',
      title: 'Arduino 风格与 STM32 寄存器风格对比',
      headers: ['对比项', 'Arduino 风格', 'STM32 寄存器风格'],
      rows: [
        ['初始化引脚', 'pinMode(13, OUTPUT)', '配置 GPIOB->CRL / CRH 寄存器'],
        ['设置引脚电平', 'digitalWrite(13, HIGH)', 'GPIOB->ODR |= 0x08;'],
        ['底层原理', '封装隐藏，调用库函数', '直接面对寄存器地址与位域'],
        ['可读性', '高，新手友好', '低，但更透明'],
        ['运行效率', '略低（函数调用开销）', '最高（一条汇编指令）'],
      ],
    },
    {
      type: 'text',
      html: '<h3>寄存器（register）与特殊功能寄存器（SFR）</h3><p><b>寄存器（register）</b>是芯片内部一块很小的存储单元，用来保存配置或状态。CPU 本身有通用寄存器；而单片机外设的寄存器，比如 GPIO 的配置寄存器、串口的数据寄存器，都<b>映射到固定的内存地址</b>上，叫作<b>特殊功能寄存器（Special Function Register，SFR）</b>。</p><p>在 C 里操作寄存器就是“往固定地址读写”。STM32 标准库已经把这些地址封装成了结构体指针：<code>GPIOB</code> 指向 GPIOB 外设的寄存器组，<code>GPIOB-&gt;ODR</code> 就是它的输出数据寄存器（Output Data Register）。51 单片机则用 <code>sfr</code>、<code>sbit</code> 关键字直接描述 SFR。</p><p>每个寄存器的每一位都有明确含义（例如“第 3 位控制 PB3 引脚输出”），这正是上一章学的位运算成为寄存器操作核心工具的原因。</p>',
    },
    {
      type: 'code',
      title: '纯寄存器操作点亮 LED（STM32）',
      code: `// STM32F103C8T6（Wokwi 可仿真）：纯寄存器点亮 LED
#include "stm32f10x.h"

int main(void)
{
    // 1. 打开 GPIOB 外设时钟（RCC->APB2ENR 的 IOPBEN 位）
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN;

    // 2. 配置 PB0 为推挽输出（CRL 低 4 位：CNF=00、MODE=11，即 0x3）
    GPIOB->CRL &= ~0x0000000F;   // 清零 PB0 的配置位
    GPIOB->CRL |= 0x00000003;    // 0011：通用推挽输出，50MHz

    // 3. 点亮：把 ODR 第 0 位置 1
    GPIOB->ODR |= (1 << 0);      // 等价于 GPIOB->ODR |= 0x01;

    while (1) {
        // 主循环保持，LED 常亮
    }
}`,
      note: '目标平台：STM32F103C8T6 蓝板或 Wokwi 仿真；LED 正极接 PB0、负极经 220Ω 电阻接 GND（高电平点亮）。若板子 LED 是低电平点亮，把最后一句改成 GPIOB->ODR &= ~(1 << 0);',
    },
    {
      type: 'text',
      html: '<h3>volatile 关键字的作用与必要性</h3><p><code>volatile</code> 告诉编译器：<b>这个变量的值可能被“当前代码之外”的东西改变</b>——比如中断服务程序、硬件外设、另一个线程——所以<strong>每次使用都必须重新从内存读取</strong>，禁止编译器把它优化到寄存器里，或合并掉重复读取。</p><p>为什么必要？以主循环 <code>while (flag == 0) { }</code> 等待中断置位为例：编译器开优化后，看到 <code>flag</code> 在本函数里从未被赋值，就会认定它的值不会变化，于是只从内存读一次、以后直接复用旧值，甚至把整个循环“优化”成死循环——而中断实际上早已把 <code>flag</code> 改成 1，程序却永远退不出循环。加上 <code>volatile</code> 之后，每次循环都真实地读内存，程序行为才正确。</p><p>需要 <code>volatile</code> 的典型场景：① 中断里修改、主程序里读取的全局变量；② 映射到外设寄存器地址的指针，如 <code>(volatile uint32_t *)0x40010C0C</code>；③ 由 DMA 硬件更新的缓冲区数据。</p>',
    },
    {
      type: 'code',
      title: 'volatile 标志位等待示例',
      code: `// STM32F103 + 标准库：volatile 防止标志位读取被优化掉
#include "stm32f10x.h"

volatile uint8_t flag = 0;   // 中断里修改、主循环读取，必须 volatile

// TIM2 更新中断：每 1 秒把 flag 置 1（定时器初始化见正文）
void TIM2_IRQHandler(void)
{
    if (TIM_GetITStatus(TIM2, TIM_IT_Update)) {
        flag = 1;                                  // 中断里修改标志
        TIM_ClearITPendingBit(TIM2, TIM_IT_Update);
    }
}

int main(void)
{
    while (flag == 0) {        // 若去掉 volatile 且开优化，可能永远等不到
        // 空转等待
    }

    flag = 0;                  // 处理完标志，准备下一次
    while (1) {
    }
}`,
      note: '目标平台：STM32F103 + 标准库。正式工程还需配置 TIM2（时钟、预分频、自动重载、NVIC 使能），这里只演示 volatile 的用法。去掉 volatile 后，在 -O2 优化下编译器可能把循环变成死循环。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>volatile 易错点：</b>① volatile 要加在<b>变量定义</b>上，不是每次使用处；② volatile 只保证“每次重新读取”，<b>不保证原子性</b>，多字节或多语句的读写仍可能被中断打断，必要时还要关中断保护；③ 普通变量别滥用 volatile，否则禁止优化会拖慢程序；④ 用指针访问硬件寄存器地址时记得写 <code>(volatile uint32_t *)</code>，否则编译器可能把寄存器读取优化掉，读到的永远是旧值。</p>',
    },
    {
      type: 'text',
      html: '<h3>头文件、库函数与位操作宏</h3><p>单片机工程用<b>头文件（header file）</b>把寄存器地址、位常量、函数声明组织起来：Arduino 自动包含 <code>Arduino.h</code>，STM32 标准库包含 <code>stm32f10x.h</code>。标准库把寄存器位定义成有意义的常量，例如 <code>GPIO_ODR_ODR0</code> 就是 ODR 寄存器的第 0 位（值为 1）。</p><p>库函数（如 <code>GPIO_SetBits</code>、<code>digitalWrite</code>）可读性好但有一定调用开销；寄存器直接操作效率最高但难读。工程里常用的折中方案是<b>位操作宏</b>：用宏把“寄存器 |= 某位”这类操作包装成函数样式的名字：</p><p><code>#define LED_ON() GPIOB-&gt;ODR |= GPIO_ODR_ODR0</code></p><p>宏在编译时直接展开成寄存器语句，没有函数调用开销，又保留了可读性。注意宏不是函数：它不检查类型、没有作用域，参数要加括号；像 LED_ON() 这样的“函数式宏”定义时要写空括号，调用时也必须带括号。</p>',
    },
    {
      type: 'code',
      title: '位操作宏 + 软件延时：LED 闪烁',
      code: `// STM32F103 + 标准库：位操作宏控制 LED
#include "stm32f10x.h"

#define LED_ON()     GPIOB->ODR |= GPIO_ODR_ODR0     // PB0 置 1
#define LED_OFF()    GPIOB->ODR &= ~GPIO_ODR_ODR0    // PB0 清 0
#define LED_TOGGLE() GPIOB->ODR ^= GPIO_ODR_ODR0    // PB0 翻转

void Delay(uint32_t t);   // 软件延时函数声明

int main(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN;   // 打开 GPIOB 时钟
    GPIOB->CRL &= ~0x0000000F;            // 清 PB0 配置位
    GPIOB->CRL |= 0x00000003;             // 推挽输出 50MHz

    while (1) {
        LED_ON();         // 亮
        Delay(500000);
        LED_OFF();        // 灭
        Delay(500000);
    }
}

// 软件延时：空循环消耗时间，精度受主频与优化等级影响
void Delay(uint32_t t)
{
    while (t--) {
        __NOP();          // 空操作指令，防止循环被完全优化掉
    }
}`,
      note: '目标平台：STM32F103C8T6，LED 接 PB0、高电平点亮。GPIO_ODR_ODR0 是标准库预定义的位常量，等价于 (1 << 0)。软件延时的实际时长需按主频实测调整，精确延时请用 SysTick 或定时器。',
    },
    {
      type: 'text',
      html: '<h3>软件延时与硬件延时</h3><p><b>软件延时（software delay）</b>就是让 CPU 空转：执行一大堆空操作来“消磨时间”，例如上节的 <code>Delay()</code>。它简单、不占用外设，但缺点明显：① 延时长度依赖主频和编译优化等级，换芯片或改优化就“失准”；② 空转时 CPU 被占死，无法同时响应其他任务；③ 空循环可能被优化器删掉，所以要配合 <code>__NOP()</code> 或 volatile 变量。</p><p><b>硬件延时（hardware delay）</b>用定时器（timer）计时：配置好定时器后 CPU 可以继续干别的，定时器到点产生中断或置位标志，程序据此判断时间到。STM32 内核自带的 <b>SysTick</b>（系统滴答定时器）就是为此设计的，很多库的 <code>Delay</code>、Arduino 的 <code>delay()</code> 底层都基于硬件定时器。要点：需要精确、不阻塞的延时时，优先用硬件定时器。</p>',
    },
  ],
  exercises: [
    {
      id: 'chapter-03-q1',
      type: 'choice',
      question: '嵌入式 C 程序里“尽量不用浮点数”的主要原因是什么？',
      options: ['编译器不支持 float 类型', '多数 8/16 位单片机没有硬件浮点单元（FPU），浮点运算靠软件模拟，既慢又占 Flash/RAM', '浮点数计算结果一定是错的', '浮点数只能用在中断服务函数里'],
      answer: 1,
      explanation: 'A 错：GCC 等主流工具链都完整支持 float/double；B 对：没有 FPU 时浮点运算要调用软件库逐位模拟，慢且代码体积大，所以能用整数就用整数；C 错：浮点本身没错，只是代价高，在资源受限时不合算；D 错：浮点没有“只能用在哪里”的限制。',
    },
    {
      id: 'chapter-03-q2',
      type: 'choice',
      question: 'uint8_t 类型在内存中占几个字节？',
      options: ['1 个字节（8 位）', '2 个字节（16 位）', '4 个字节（32 位）', '不固定，取决于编译器'],
      answer: 0,
      explanation: 'stdint.h 的意义就是“定宽”：uint8_t 在任何平台上都保证是 8 位、1 个字节。B 是 uint16_t，C 是 uint32_t。D 错：普通 int 的宽度才随编译器变化，这正是引入定宽类型的原因。',
    },
    {
      id: 'chapter-03-q3',
      type: 'choice',
      question: 'uint16_t 能表示的无符号整数范围是？',
      options: ['0 ~ 255', '0 ~ 65535', '-32768 ~ 32767', '0 ~ 4294967295'],
      answer: 1,
      explanation: '16 位无符号数有 2^16 = 65536 种取值，范围 0~65535。A 的 0~255 是 8 位（uint8_t）的范围；C 的 -32768~32767 是 16 位有符号（int16_t）的范围；D 的 0~4294967295 是 32 位无符号（uint32_t）的范围。',
    },
    {
      id: 'chapter-03-q4',
      type: 'choice',
      question: '关于 volatile 关键字，下列说法正确的是？',
      options: ['它让变量运算更快', '它告诉编译器该变量的值可能被中断、硬件等外部因素改变，每次使用都应重新读取', '它把变量变成只读常量', '它把变量存放在 Flash 中'],
      answer: 1,
      explanation: 'B 是 volatile 的标准定义：禁止编译器优化掉对该变量的读写。A 反了：volatile 禁止优化，通常会让访问变慢而不是变快；C 是 const 的作用，volatile 与只读无关；D 是 const/段属性（如 PROGMEM）的作用，volatile 只影响访问方式，不决定存放位置。',
    },
    {
      id: 'chapter-03-q5',
      type: 'code',
      question: '下面主循环等待中断置位。如果把 flag 定义里的 volatile 去掉并开启编译器优化，最可能发生什么？',
      code: `volatile uint8_t flag = 0;
// 中断服务程序里会执行 flag = 1;

while (flag == 0) {
} // 等待中断`,
      options: ['编译直接报错', '编译器认为 flag 在本函数中不会变化，可能把循环优化成死循环，程序永远卡住', '程序一定变慢', '程序行为完全不变'],
      answer: 1,
      explanation: '去掉 volatile 后，编译器看到 flag 在 main 里从未被赋值，开优化时可能只读一次内存、以后复用旧值，甚至把等待循环优化成“读到 0 就死循环”的形态，中断把 flag 改成 1 也救不回来。A 错：语法仍然合法，不会报错；C 错：优化通常更快，问题在于行为错误；D 错：行为恰恰会变，这正是 volatile 存在的意义。',
    },
    {
      id: 'chapter-03-q6',
      type: 'code',
      question: '调用一次 LED_ON() 后，GPIOB->ODR 寄存器会怎样？',
      code: `#define LED_ON() GPIOB->ODR |= GPIO_ODR_ODR0
// GPIO_ODR_ODR0 是第 0 位的常量，值为 0x0001`,
      options: ['第 0 位置 1，其余位保持不变', '全部位都变成 1', '全部位清零', '第 0 位清零，其余位保持不变'],
      answer: 0,
      explanation: '宏展开后就是 GPIOB->ODR |= 0x0001：|= 是置位操作，只把掩码中为 1 的第 0 位置 1，其余位或 0 保持原值。B 是 |= 0xFFFF 的效果；C 是 &= 0x0000 的效果；D 是 &= ~0x0001 的效果，方向正好相反。',
    },
    {
      id: 'chapter-03-q7',
      type: 'fill',
      question: 'STM32 内核自带的、常用于实现精确硬件延时的定时器名称是什么？（写英文名，如 XXX）',
      accept: ['SysTick', 'systick', 'SysTick 定时器', 'systick定时器', '系统滴答定时器'],
      explanation: 'SysTick（系统滴答定时器）是 ARM Cortex-M 内核自带的 24 位递减定时器，不占用片内外设，常用来做精确延时和操作系统的心跳。相比软件空循环延时，它不受编译器优化影响、精度更高，且 CPU 可以在等待期间做别的事。',
    },
    {
      id: 'chapter-03-q8',
      type: 'multiple',
      question: '下列哪些场合通常必须使用 volatile？',
      options: ['中断服务函数中修改、主循环中读取的全局标志变量', '直接映射到外设寄存器地址的指针（如 (volatile uint32_t *)0x40010C0C）所指向的数据', '普通 for 循环的循环计数变量', '由 DMA 硬件直接更新的缓冲区数据'],
      answer: [0, 1, 3],
      explanation: 'A、B、D 的值都可能被“当前代码之外”的中断或硬件修改，编译器无法预知，必须 volatile 才能保证每次都真实读取。C 的循环计数变量只在本函数内被修改，编译器看得清清楚楚，不需要 volatile；如果误加反而会阻止优化、拖慢循环。',
    },
  ],
};

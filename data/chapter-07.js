// 章节：串口通信 UART
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-07'] = {
  id: 'chapter-07',
  order: 7,
  icon: '📡',
  title: '串口通信 UART',
  summary: '理解串行与并行通信、UART 帧格式与波特率，学会用 Arduino 和 STM32 收发数据，掌握 printf 重定向与串口调试助手排查乱码。',
  sections: [
    {
      type: 'text',
      html: '<h3>串行（serial）与并行（parallel）通信</h3><p>设备之间传输数据有两种基本方式。<b>并行通信（parallel communication）</b>用多根数据线同时传输多位数据（如 8 根线一次传 1 字节），速度快，但占用引脚多、线缆成本高，高速时线间干扰大，只适合短距离。<b>串行通信（serial communication）</b>只用一根（或一对）数据线，把数据<b>按位（bit）依次</b>发送，引脚占用少、成本低、抗干扰强，可以传输较远距离，代价是速率相对较低。</p><p>串行通信家族庞大：UART、SPI、I2C、USB、CAN 等都属于串行。本章的主角 <b>UART（Universal Asynchronous Receiver/Transmitter，通用异步收发器）</b>是单片机最常用、最基础的通信方式：发送端把并行数据逐位输出，接收端逐位收齐再拼成字节。STM32 上对应的外设叫 <b>USART</b>（多了同步模式，异步用法与 UART 一致）。</p>',
    },
    {
      type: 'text',
      html: '<h3>UART 帧格式（frame）</h3><p>UART 是<b>异步</b>通信——收发双方没有共享时钟，接收端靠<b>约定的波特率</b>采样。为了让接收端知道"从哪一位开始读"，数据必须按固定格式打包成一<b>帧（frame）</b>：</p><ul><li><b>起始位（start bit）</b>：1 位低电平。空闲时数据线保持高电平，低电平的跳变通知接收端"数据要开始了"。</li><li><b>数据位（data bits）</b>：通常 5~9 位，最常见 8 位，先传<b>最低位（LSB）</b>。</li><li><b>校验位（parity bit）</b>：可选。偶校验让"数据位+校验位"中 1 的个数为偶数，奇校验为奇数，用于检错。</li><li><b>停止位（stop bit）</b>：1 位（或 1.5/2 位）高电平，标志一帧结束。</li></ul><p>以发送字符 A（ASCII 码 0x41，二进制 0100 0001）为例，8 数据位、无校验、1 停止位：先发低电平起始位，再依次发 1→0→0→0→0→0→1→0（LSB 在前），最后发高电平停止位，共 10 位。收发双方必须约定完全相同的<b>数据位、校验位、停止位与波特率</b>，否则无法正确解析。</p>',
    },
    {
      type: 'table',
      title: '常见波特率与单比特时长',
      headers: ['波特率', '典型用途', '单比特时长'],
      rows: [
        ['9600', '低速调试、常见传感器模块', '约 104 µs'],
        ['115200', '串口调试助手、日志输出', '约 8.7 µs'],
        ['250000', '与舵机、飞控等设备通信', '4 µs'],
        ['460800 / 921600', '高速透传、固件升级', '约 2.2 µs / 1.1 µs'],
      ],
    },
    {
      type: 'code',
      title: 'Arduino Serial 收发：回显并控制 LED',
      code: `// Arduino Uno：USB 虚拟串口，无需额外接线
void setup() {
  Serial.begin(9600);              // 初始化串口，波特率 9600
  pinMode(13, OUTPUT);
  Serial.println("Hello MCU!");
}

void loop() {
  if (Serial.available() > 0) {    // 缓冲区有数据？
    char c = Serial.read();        // 读取一个字节
    if (c == '1') {
      digitalWrite(13, HIGH);      // 收到 '1' 点亮板载 LED
      Serial.println("LED ON");
    } else if (c == '0') {
      digitalWrite(13, LOW);       // 收到 '0' 熄灭
      Serial.println("LED OFF");
    } else {
      Serial.print("Echo: ");      // 其他字符原样回显
      Serial.println(c);
    }
  }
}`,
      note: 'Arduino Uno 通过板载 USB 转串口芯片与电脑通信，Serial 对象直接可用。在 Arduino IDE 的"串口监视器"中把波特率选为 9600，发送 1 或 0 即可控制 D13 上的 LED。',
    },
    {
      type: 'text',
      html: '<h3>波特率（baud rate）的概念与计算</h3><p><b>波特率（baud rate）</b>表示每秒传输的符号（位）数，单位 bps（bit per second）。它同时决定收发双方的采样节奏：波特率不同，接收端会在错误的时刻采样，读出的就是乱码。1 位占用的时间 <code>t = 1 / 波特率</code>：9600bps 时每位约 104 微秒，115200bps 时每位约 8.7 微秒。</p><p>注意"波特率"与"字节速率"的区别：每传 1 字节，除了 8 个数据位还要带起始位与停止位（有校验再加 1 位）。以 8N1（8 数据位、无校验、1 停止位）为例，一帧共 10 位，所以 <code>字节速率 = 波特率 / 10</code>：9600bps 时每秒最多约 960 字节，115200bps 时约 11520 字节。</p><p>STM32 通过 USART 的分频寄存器（BRR）把外设时钟分频得到目标波特率，标准库的 <code>USART_Init</code> 或 HAL 的 <code>HAL_UART_Init</code> 会根据时钟与目标波特率自动计算分频值，我们只需指定目标波特率即可。</p>',
    },
    {
      type: 'code',
      title: 'STM32 标准库 USART1 收发：接收中断回显',
      code: `// STM32F103 蓝板：USART1，TX=PA9，RX=PA10，波特率 115200
// 通过 USB 转 TTL 模块（如 CH340）连接电脑
#include "stm32f10x.h"
#include "stm32f10x_usart.h"

// 接收中断：收到一个字节就原样回显
void USART1_IRQHandler(void)
{
    if (USART_GetITStatus(USART1, USART_IT_RXNE) != RESET) {
        uint8_t c = (uint8_t)USART_ReceiveData(USART1);  // 读数据同时清除 RXNE 标志
        USART_SendData(USART1, c);                        // 回显
        while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);  // 等发送完成
    }
}

int main(void)
{
    GPIO_InitTypeDef gpio;
    USART_InitTypeDef usart;
    NVIC_InitTypeDef nvic;

    // 打开 GPIOA 与 USART1 时钟
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_USART1, ENABLE);

    // PA9 = TX，复用推挽输出
    gpio.GPIO_Pin = GPIO_Pin_9;
    gpio.GPIO_Mode = GPIO_Mode_AF_PP;
    gpio.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &gpio);
    // PA10 = RX，浮空输入
    gpio.GPIO_Pin = GPIO_Pin_10;
    gpio.GPIO_Mode = GPIO_Mode_IN_FLOATING;
    GPIO_Init(GPIOA, &gpio);

    // 8 数据位、无校验、1 停止位、波特率 115200
    usart.USART_BaudRate = 115200;
    usart.USART_WordLength = USART_WordLength_8b;
    usart.USART_StopBits = USART_StopBits_1;
    usart.USART_Parity = USART_Parity_No;
    usart.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;
    usart.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
    USART_Init(USART1, &usart);

    USART_ITConfig(USART1, USART_IT_RXNE, ENABLE);   // 使能接收中断

    nvic.NVIC_IRQChannel = USART1_IRQn;
    nvic.NVIC_IRQChannelPreemptionPriority = 2;
    nvic.NVIC_IRQChannelSubPriority = 0;
    nvic.NVIC_IRQChannelCmd = ENABLE;
    NVIC_Init(&nvic);

    USART_Cmd(USART1, ENABLE);   // 使能串口
    USART_SendData(USART1, 'A'); // 上电先发一个字符验证通路

    while (1) { }
}`,
      note: '接线：USART1 的 TX(PA9) 接 USB 转 TTL 模块的 RX，RX(PA10) 接模块的 TX，并且两块板的 GND 必须相连。USART_ReceiveData 读取数据寄存器会自动清除 RXNE 标志，这也是一种"读即清"的清标志方式。',
    },
    {
      type: 'code',
      title: 'printf 重定向到串口：调试利器',
      code: `// STM32F103 蓝板：USART1 输出到串口调试助手，波特率 115200
#include "stm32f10x.h"
#include "stm32f10x_usart.h"
#include <stdio.h>

// 重定向：printf 最终会调用 fputc，把它指向串口即可
int fputc(int ch, FILE *f)
{
    USART_SendData(USART1, (uint8_t)ch);
    while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);  // 等发送完成
    return ch;
}

void uart_init(void)
{
    GPIO_InitTypeDef gpio;
    USART_InitTypeDef usart;

    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_USART1, ENABLE);

    gpio.GPIO_Pin = GPIO_Pin_9;
    gpio.GPIO_Mode = GPIO_Mode_AF_PP;
    gpio.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &gpio);

    usart.USART_BaudRate = 115200;
    usart.USART_WordLength = USART_WordLength_8b;
    usart.USART_StopBits = USART_StopBits_1;
    usart.USART_Parity = USART_Parity_No;
    usart.USART_Mode = USART_Mode_Tx;   // 调试输出只需发送
    usart.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
    USART_Init(USART1, &usart);
    USART_Cmd(USART1, ENABLE);
}

int main(void)
{
    uart_init();
    printf("Hello, MCU!\\r\\n");
    printf("3 + 4 = %d\\r\\n", 3 + 4);
    while (1) { }
}`,
      note: '在 Keil MDK 中勾选 MicroLIB 即可直接使用 printf 重定向；若用 STM32CubeIDE（GCC 工具链），原理相同，但需要重定向 _write 函数而不是 fputc。有了 printf，调试任何变量都只需一行代码。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>易错点：串口收到乱码怎么排查？</b>按下面顺序检查：</p><ul><li><b>波特率不一致</b>：这是乱码最常见原因。开发板 115200、调试助手却设成 9600，必然乱码，先核对两边设置。</li><li><b>未共地（GND）</b>：两个设备的信号电平没有共同参考点，接收端无法判断高低电平，表现为乱码或完全收不到。开发板 GND 必须与 USB 转 TTL 模块 GND 相连。</li><li><b>TX/RX 接反</b>：发送端 TX 应接接收端 RX（交叉连接），同接 TX 会收不到任何数据。</li><li><b>电平不匹配</b>：3.3V 逻辑的 STM32 直接接 5V TTL 电平设备时要注意兼容；接 RS232 电平必须加电平转换芯片。</li><li><b>时钟不准</b>：使用内部 RC 振荡器且波特率很高时，累积误差会导致乱码，可降低波特率或改用外部晶振。</li></ul><p>排查口诀：先对波特率，再查共地，然后看 TX/RX 交叉，最后怀疑电平与时钟。</p>',
    },
    {
      type: 'text',
      html: '<h3>串口调试助手的使用</h3><p><b>串口调试助手（serial assistant）</b>是电脑端与单片机互发数据的工具，开发必备。Arduino IDE 自带"串口监视器"，也可以使用 SSCOM、XCOM、MobaXterm、Putty 等。基本使用步骤：</p><ol><li>插好 USB 转串口设备，在<b>设备管理器</b>里确认端口号（如 COM3）。</li><li>打开助手，选择该端口，设置<b>波特率、数据位 8、校验 None、停止位 1</b>，与单片机程序保持一致。</li><li>点击"打开串口"。注意：一个串口同一时刻只能被一个程序占用，调试助手与 IDE 的串口监视器不能同时打开。</li><li>发送区输入内容（可勾选"发送新行"，对应收到 <code>\\r\\n</code> 结尾），点发送；在接收区观察单片机回传的数据。</li></ol><p>技巧：发送 ASCII 字符用于简单命令（如 1 开灯、0 关灯），发送十六进制（HEX）用于原始字节；接收区切换到 HEX 显示可以查看回车换行等不可见字符。</p>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '串行按位依次传输、引脚少，UART 是最常用的异步串行协议。',
        '一帧 = 起始位 + 数据位 + 校验位（可选）+ 停止位，空闲线保持高电平。',
        '波特率 = 每秒位数，收发双方必须一致；字节速率 = 波特率 / 帧位数。',
        'Arduino 用 Serial.begin/print/read 收发，STM32 用 USART 外设或 printf 重定向。',
        '串口调试助手要选对端口与参数，一个串口同一时刻只能被一个程序占用。',
        '乱码排查：波特率 → 共地 → TX/RX 交叉 → 电平与时钟。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-07-q1',
      type: 'choice',
      question: '关于并行通信与串行通信，下列说法正确的是？',
      options: ['并行通信用一根线逐位传输，节省引脚', '串行通信把数据按位依次传输，占用引脚少、成本低，适合较远距离', '串行通信一定比并行通信快', '并行通信不需要约定任何参数'],
      answer: 1,
      explanation: '串行通信用一根（或一对）线按位依次传数据，引脚占用少、线缆成本低、抗干扰强，可以传输较远距离，B 对。A 说反了：并行通信才是用多根线同时传多位，速度快但占引脚多；C 错：串行通常比并行慢，优势在引脚与距离；D 错：任何通信都必须约定电平、时序等参数，并行也不例外。',
    },
    {
      id: 'chapter-07-q2',
      type: 'multiple',
      question: '一个完整的 UART 帧（8 数据位、无校验、1 停止位）从开始到结束包含哪些部分？',
      options: ['1 位低电平的起始位', '8 位数据位（LSB 在前）', '1 位高电平的停止位', '8 位起始位'],
      answer: [0, 1, 2],
      explanation: '8N1 帧结构为：1 位起始位（低电平，标志数据开始）+ 8 位数据位（先发最低位 LSB）+ 1 位停止位（高电平，标志结束），共 10 位，A、B、C 都对。D 错：起始位只有 1 位而不是 8 位，且起始位是低电平，与空闲的高电平形成跳变，接收端正是靠这个跳变对齐采样。',
    },
    {
      id: 'chapter-07-q3',
      type: 'choice',
      question: '波特率 9600bps，帧格式 8N1（一帧共 10 位），每秒最多能传输多少字节？',
      options: ['9600 字节', '960 字节', '96 字节', '1152 字节'],
      answer: 1,
      explanation: '每传 1 字节实际要发 10 位（1 起始 + 8 数据 + 1 停止），所以字节速率 = 9600 ÷ 10 = 960 字节/秒，B 对。A 错：把"位"当成了"字节"，忽略了起始位和停止位；C 错：少算了一个数量级；D 错：1152 是把 115200 波特率的数值错套到 9600 上，属于典型干扰项。',
    },
    {
      id: 'chapter-07-q4',
      type: 'choice',
      question: '串口调试助手收到的数据全是乱码，下列哪个是最常见的原因？',
      options: ['两端波特率设置不一致', '数据位设为 8 而校验位设为 None', '发送的是 ASCII 而接收区用 HEX 显示', 'USB 线太短'],
      answer: 0,
      explanation: '乱码几乎都是波特率不符导致的：接收端按错误的节奏采样，在每个位的错误时刻读取，解析出的字节完全错位，A 对。B 错：8 数据位、无校验（8N1）是常规配置，不会引起乱码；C 错：HEX 与 ASCII 只是显示方式，数据本身没变，不会产生乱码；D 错：USB 线短反而更稳定，与乱码无关。除波特率外，未共地、TX/RX 接反也可能表现为乱码或收不到。',
    },
    {
      id: 'chapter-07-q5',
      type: 'code',
      question: '下面的 Arduino 程序烧录后，在串口监视器（波特率 9600）发送字符 1，D13 上的板载 LED 会怎样？',
      code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}
void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') digitalWrite(13, HIGH);
    else if (c == '0') digitalWrite(13, LOW);
  }
}`,
      options: ['保持点亮，直到发送 0 才熄灭', '点亮后立即熄灭', '以 1 秒间隔闪烁', '无任何反应'],
      answer: 0,
      explanation: '收到 1 时命中第一个分支，digitalWrite(13, HIGH) 把 LED 置为点亮状态，且程序没有自动熄灭的代码，所以 LED 保持点亮，直到发送 0 才会被熄灭，A 对。B 错：程序中没有延时或熄灭动作；C 错：代码里没有任何闪烁逻辑；D 错：发送 1 会进入第一个分支并点亮 LED，并非无反应。',
    },
    {
      id: 'chapter-07-q6',
      type: 'choice',
      question: 'STM32 的 USART1_TX（PA9）与 USB 转 TTL 模块连接时，应接到模块的哪个引脚？',
      options: ['模块的 TX 引脚', '模块的 RX 引脚', '模块的 VCC 引脚', '模块的 3V3 引脚'],
      answer: 1,
      explanation: '串口收发是交叉连接的：本机发送（TX）要接到对方的接收（RX），本机接收（RX）接对方的发送（TX）。所以 PA9（TX）应接 USB 转 TTL 模块的 RX，B 对。A 错：TX 接 TX 两个都在发送，谁也收不到；C、D 错：VCC/3V3 是电源引脚，接数据线毫无意义，接错甚至可能损坏设备。同时别忘了两板 GND 相连（共地）。',
    },
    {
      id: 'chapter-07-q7',
      type: 'multiple',
      question: '关于 UART 通信，下列说法正确的有？',
      options: ['UART 是全双工：TX 与 RX 相互独立，可同时收发', '通信双方必须共地，信号才有统一的参考电平', '波特率双方可以随便设置，不影响通信', '帧格式（数据位、校验位、停止位）必须一致'],
      answer: [0, 1, 3],
      explanation: 'UART 用独立的 TX、RX 两根线，可以同时发送和接收，是全双工，A 对。共地是所有设备通信的前提，否则接收端无法判断高低电平，B 对。帧格式包括数据位、校验位、停止位，双方不一致就无法解析数据，D 对。C 错：波特率必须一致（并且要尽量准确），否则采样时刻错位，必然乱码。',
    },
    {
      id: 'chapter-07-q8',
      type: 'fill',
      question: 'UART 总线空闲（没有数据传输）时，数据线保持的是什么电平？（写"高"或"低"）',
      accept: ['高', '高电平', 'high', 'HIGH', '1'],
      explanation: 'UART 空闲时数据线保持高电平。传输开始时发送端把电平拉低，产生一个下降沿作为起始位，接收端正是靠这个"高→低"的跳变来对齐采样时刻。如果空闲电平不是高，接收端就无法识别起始位，通信会彻底失败。这也是为什么 8N1 一帧（10 位）之外，总线绝大多数时间都停留在高电平。',
    },
  ],
};

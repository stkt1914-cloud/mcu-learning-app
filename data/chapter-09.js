// 章节：ADC 与 DAC
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-09'] = {
  id: 'chapter-09',
  order: 9,
  icon: '🎚️',
  title: 'ADC 与 DAC',
  summary: '理解模拟量与数字量的转换，掌握 ADC 采样、分辨率、参考电压与量化误差，学会电压换算公式，并用 PWM 加滤波实现"准模拟"输出。',
  sections: [
    {
      type: 'text',
      html: '<h3>模拟量与数字量</h3><p>现实世界中的很多物理量是<b>连续变化</b>的：温度、光照、声音、旋钮的角度……它们对应的电压信号也是连续的，称为<b>模拟量（analog quantity）</b>。而单片机内部的数字电路只认识 0 和 1，即<b>数字量（digital quantity）</b>——只有离散的高低电平。</p><p>要让单片机"感知"模拟世界，需要两座桥：</p><ul><li><b>ADC（Analog-to-Digital Converter，模数转换器）</b>：把连续的模拟电压转换成数字代码，供程序读取。</li><li><b>DAC（Digital-to-Analog Converter，数模转换器）</b>：把数字代码还原成模拟电压（或电流）。</li></ul><p>大多数单片机内部已集成 ADC（如 Arduino Uno 的 ATmega328P 有 6 路 10 位 ADC，STM32F103 有多路 12 位 ADC），而 DAC 则常通过 <b>PWM（脉宽调制）</b>加滤波"模拟"实现，本章都会讲到。</p>',
    },
    {
      type: 'text',
      html: '<h3>ADC 的工作原理</h3><p>一次 ADC 转换大致分四步：<b>采样（sampling）</b>→<b>保持（holding）</b>→<b>量化（quantization）</b>→<b>编码（encoding）</b>。采样按固定时间间隔抓取输入电压的瞬时值，保持电路把该值"冻结"住供量化使用，量化器把它归入最接近的电压档位，最后编码成二进制数字。</p><p>几个关键概念：</p><ul><li><b>分辨率（resolution）</b>：n 位 ADC 把满量程电压分成 <b>2 的 n 次方（2^n）</b>个档位。10 位 ADC 有 1024 档（编码 0~1023），12 位有 4096 档（编码 0~4095）。位数越高，能分辨的最小电压变化越小。</li><li><b>参考电压（reference voltage，Vref）</b>：满量程对应的电压值。例如 Vref = 5V 表示编码 1023（10 位）对应 5V；Vref 可以是内部基准，也可以是外部引脚（STM32 的 VREF+，Arduino 默认接 AVCC）。</li><li><b>量化误差（quantization error）</b>：量化是"就近取整"，必然产生舍入误差，最大约 ±1/2 LSB（LSB 是最低有效位对应的电压，即 Vref / 2^n）。</li><li><b>转换时间（conversion time）</b>：完成一次转换所需时间，受采样时间与 ADC 时钟频率影响。</li></ul>',
    },
    {
      type: 'code',
      title: 'Arduino analogRead 读取电位器（10 位 ADC）',
      code: `// Arduino Uno：电位器两端接 5V 与 GND，中间抽头接 A0
void setup() {
  Serial.begin(9600);          // 打开串口监视器（波特率 9600）
}

void loop() {
  int raw = analogRead(A0);            // 10 位 ADC，返回 0~1023
  float voltage = raw * (5.0 / 1023.0);  // 换算成电压，Vref = 5V
  Serial.print("ADC = ");
  Serial.print(raw);
  Serial.print("  voltage = ");
  Serial.println(voltage, 2);          // 保留 2 位小数
  delay(500);
}`,
      note: '目标平台：Arduino Uno；A0 接电位器抽头，Vref 默认 AVCC = 5V。旋转电位器时，串口监视器里能看到 ADC 值 0~1023 与电压 0~5V 同步变化，可以直观感受"分辨率"和"换算"的含义。',
    },
    {
      type: 'text',
      html: '<h3>电压换算公式</h3><p>把 ADC 读数换算回电压，公式为：</p><p><b>V = ADC 读数 × Vref / 满量程</b></p><p>其中满量程取 <b>2 的 n 次方减 1（2^n − 1）</b>，即编码最大值。例如 Arduino Uno：V = raw × 5 / 1023，约等于 raw × 0.004883 V。</p><p><b>算例 1：</b>10 位 ADC、Vref = 5V，读到 512。<br>V = 512 × 5 / 1023 ≈ 2.50V。因为 512 约是满量程 1023 的一半，所以电压也约是 5V 的一半。</p><p><b>算例 2：</b>STM32 的 12 位 ADC、Vref = 3.3V，读到 2048。<br>V = 2048 × 3.3 / 4095 ≈ 1.65V。2048 恰是 4096 的一半（半量程），电压约等于 Vref 的一半。</p><p>注意：有些资料用 2^n（如 1024）作分母，两者相差不超过 0.1%，本教材与多数库采用 2^n − 1；无论用哪个，先确认参考电压的数值，否则换算结果会整体偏差。</p>',
    },
    {
      type: 'code',
      title: 'Arduino + LM35 温度传感器（电压换算实战）',
      code: `// Arduino Uno + LM35 温度传感器（TO-92 封装）
// 接线：VCC 接 5V，GND 接地，OUT 接 A0
// LM35 输出 = 10mV/°C，0°C 时输出 0V
void setup() {
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);              // 10 位 ADC 读数
  float voltage = raw * (5.0 / 1023.0);  // 第一步：ADC 换算成电压
  float tempC = voltage * 100.0;         // 第二步：10mV/°C，乘 100 得摄氏度
  Serial.print("temperature = ");
  Serial.print(tempC);
  Serial.println(" C");
  delay(1000);
}`,
      note: '目标平台：Arduino Uno，A0 接 LM35 输出脚，Vref = 5V。室温下串口应显示约 20~30°C。换算分两步：先按公式把 ADC 读数变成电压，再按传感器的灵敏度（10mV/°C）把电压变成物理量——这是所有线性模拟传感器的通用套路。',
    },
    {
      type: 'code',
      title: 'STM32 标准库配置 ADC（单次转换，12 位）',
      code: `// STM32F103C8T6（蓝板）+ STM32 标准外设库
// PA1 接待测电压（0~3.3V），Vref 默认 3.3V
#include "stm32f10x.h"

uint16_t adc_value;
float voltage;

void ADC1_Init(void) {
    GPIO_InitTypeDef g;
    ADC_InitTypeDef a;

    // 1. 打开 ADC1 与 GPIOA 的时钟
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_ADC1 | RCC_APB2Periph_GPIOA, ENABLE);
    RCC_ADCCLKConfig(RCC_PCLK2_Div6);  // ADC 时钟 = 72MHz/6 = 12MHz（满足 ≤14MHz）

    // 2. PA1 配置为模拟输入
    g.GPIO_Pin = GPIO_Pin_1;
    g.GPIO_Mode = GPIO_Mode_AIN;
    GPIO_Init(GPIOA, &g);

    // 3. ADC1 配置：独立模式、单次转换、右对齐、12 位
    a.ADC_Mode = ADC_Mode_Independent;
    a.ADC_ScanConvMode = DISABLE;         // 非扫描
    a.ADC_ContinuousConvMode = DISABLE;   // 单次转换
    a.ADC_ExternalTrigConv = ADC_ExternalTrigConv_None;  // 软件触发
    a.ADC_DataAlign = ADC_DataAlign_Right;
    a.ADC_NbrOfChannel = 1;
    ADC_Init(ADC1, &a);

    // 4. 选择通道 1（对应 PA1），采样时间 55.5 周期
    ADC_RegularChannelConfig(ADC1, ADC_Channel_1, 1, ADC_SampleTime_55Cycles5);

    // 5. 使能并校准（提高精度）
    ADC_Cmd(ADC1, ENABLE);
    ADC_ResetCalibration(ADC1);
    while (ADC_GetResetCalibrationStatus(ADC1)) {}
    ADC_StartCalibration(ADC1);
    while (ADC_GetCalibrationStatus(ADC1)) {}
}

uint16_t ADC1_Read(void) {
    ADC_SoftwareStartConvCmd(ADC1, ENABLE);   // 软件触发转换
    while (ADC_GetFlagStatus(ADC1, ADC_FLAG_EOC) == RESET) {}  // 等待转换结束
    return ADC_GetConversionValue(ADC1);      // 12 位结果 0~4095
}

int main(void) {
    ADC1_Init();
    while (1) {
        adc_value = ADC1_Read();
        voltage = adc_value * (3.3f / 4095.0f);  // 换算公式：读数 x Vref/满量程
    }
}`,
      note: '目标平台：STM32F103C8T6 蓝板 + STM32 标准外设库（STM32CubeIDE 或 Keil 均可编译）；PA1 对应 ADC1 通道 1，Vref 默认 3.3V。流程四步：开时钟 → 模拟输入引脚 → ADC 初始化 → 校准，之后软件触发单次转换并读取 12 位结果。若用 HAL 库，核心配置思路相同，只是 API 名称不同。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>ADC 使用注意事项：</b>① 参考电压必须搞清：Arduino Uno 默认 Vref = 5V（AVCC），部分板子和模块是 3.3V，换算公式用错会整体偏差；② 输入引脚不要悬空，悬空时读数随机跳动，应接传感器或固定电平；③ 输入电压不能超过 Vref，否则可能损坏 ADC 或被钳位；④ 电源噪声影响精度，可在电源/Vref 引脚附近加 0.1µF 去耦电容，程序里对读数多次平均；⑤ 分辨率是精度上限：10 位 ADC 最多分辨约 5V/1023 ≈ 4.9mV，不要对精度有不切实际的期待。</p>',
    },
    {
      type: 'text',
      html: '<h3>DAC 与 PWM"准模拟"输出</h3><p><b>DAC</b> 把数字代码直接转换成对应的模拟电压。专用 DAC 芯片（如 MCP4921）输出的是平滑的直流电压，但很多低成本单片机没有片上 DAC，或引脚不够用。</p><p>更常用的方案是 <b>PWM（Pulse Width Modulation，脉宽调制）"准模拟"输出</b>：</p><ul><li>单片机输出<b>频率固定、占空比可调</b>的方波，如 Arduino 的 <code>analogWrite(pin, duty)</code>，duty 取 0~255。</li><li>方波的平均电压 = <b>占空比 × 高电平电压</b>。占空比 50%（约为 128）时平均电压约为 2.5V（Vcc = 5V）。</li><li>把方波经过 <b>RC 低通滤波器（low-pass filter）</b>，高频开关分量被滤除，剩下平滑的"准模拟"电压，残留的波动叫<b>纹波（ripple）</b>。</li></ul><p>所以 PWM 的"分辨率"由占空比的级数决定：8 位 PWM 有 256 级。它成本低、引脚省，被广泛用于 LED 调光、电机调速、简易电源控制等；只有需要高精度、低纹波的平滑电压时才选用真 DAC。</p>',
    },
    {
      type: 'code',
      title: 'Arduino PWM + RC 滤波输出"准模拟"电压',
      code: `// Arduino Uno：D9 输出 PWM，经 RC 低通滤波得到"准模拟"电压
// 接线：D9 -> 1kΩ 电阻 -> 10µF 电容到 GND，电阻与电容交点取 Vout
// D9 的 PWM 频率约 490Hz，RC 截止频率约 16Hz，可滤除大部分纹波
const int pwmPin = 9;

void setup() {
  pinMode(pwmPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // 占空比从 0 扫到 255（8 位 PWM，共 256 级）
  for (int duty = 0; duty <= 255; duty += 5) {
    analogWrite(pwmPin, duty);
    float vout = duty / 255.0 * 5.0;   // 平均电压 = 占空比 x Vcc
    Serial.print("duty = ");
    Serial.print(duty);
    Serial.print("  Vout ~= ");
    Serial.println(vout, 2);           // 万用表实测应接近此值
    delay(100);
  }
}`,
      note: '目标平台：Arduino Uno；D9 为 8 位 PWM（约 490Hz）。RC 低通：1kΩ + 10µF，截止频率 fc = 1/(2πRC) ≈ 16Hz。用万用表直流档在 Vout 处测量，电压会随占空比线性变化；若不接滤波，直接用 PWM 驱动 LED，看到的是平均亮度变化。',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<b>电位器（potentiometer）</b>：三端分压，抽头直接接 ADC，是最基础的模拟输入实验。',
        '<b>光敏电阻（photoresistor）</b>：与固定电阻串联分压，光线越强阻值越小、ADC 读数越大（接法不同方向可能相反）。',
        '<b>热敏电阻（thermistor）</b>：NTC 温度升高阻值减小，配合分压电阻，再查表或按公式换算温度。',
        '<b>LM35 / TMP36 等线性温度传感器</b>：输出电压与温度成正比（LM35 为 10mV/°C），接 ADC 后按灵敏度换算。',
        '<b>各类模块</b>：麦克风、电流/电压检测、土壤湿度等模块多数也是输出电压型，直接接 ADC 即可。',
        '<b>共同要点</b>：所有模拟传感器输出都要落在 0~Vref 之间，并与单片机<b>共地</b>；信号线尽量短，远离电机等干扰源。',
      ],
    },
  ],
  exercises: [
    {
      id: 'chapter-09-q1',
      type: 'choice',
      question: '一个 8 位 ADC 能把模拟电压分成多少个量化档位？',
      options: ['8 档', '2 的 8 次方 = 256 档', '2 的 8 次方减 1 = 255 档', '10 档'],
      answer: 1,
      explanation: 'n 位 ADC 的档位数为 2^n：8 位就是 2 的 8 次方 = 256 档，编码范围 0~255。A 把"位数"当成了"档数"；C 混淆了"档数"与"最大编码值"（最大编码是 255，但档数是从 0 数到 255 共 256 档）；D 的 10 是常见 ADC 的位数（如 Arduino 的 10 位），不是 8 位的档数。',
    },
    {
      id: 'chapter-09-q2',
      type: 'choice',
      question: 'Arduino Uno 的 ADC 是 10 位，参考电压 Vref = 5V。analogRead 读到 512，对应的输入电压约为多少？',
      options: ['1.00 V', '1.65 V', '2.50 V', '5.00 V'],
      answer: 2,
      explanation: '代入换算公式：V = 512 × 5 / 1023 ≈ 2.502V。推导：10 位满量程 1023 对应 5V，512 约是满量程的一半，所以电压也约是 5V 的一半，即 2.5V。A 是把 512 错当成 1024 的四分之一之类的错误算法；B 是 Vref = 3.3V 时的半量程结果；D 把满量程值当成了当前读数，忽略了比例关系。',
    },
    {
      id: 'chapter-09-q3',
      type: 'multiple',
      question: '关于量化误差（quantization error），下列说法正确的有哪些？',
      options: ['ADC 位数越多，量化误差通常越小', '量化误差是模数转换过程中固有的', '量化误差一定比 1mV 大', '参考电压越高，相同位数下每个档位对应的电压跨度越大'],
      answer: [0, 1, 3],
      explanation: '量化误差来自把连续电压"就近取整"到有限档位，任何 ADC 都无法避免（B 对）；位数越多档位越细，误差越小（A 对）；1 LSB 对应的电压跨度 = Vref / 2^n，参考电压越高、跨度越大（D 对）。C 是绝对化错误：误差大小取决于位数与参考电压，比如 12 位、Vref=3.3V 时 1 LSB 约 0.8mV，完全可能小于 1mV。',
    },
    {
      id: 'chapter-09-q4',
      type: 'choice',
      question: 'STM32F103 的 ADC 是 12 位，参考电压 Vref = 3.3V。读到最大编码 4095 时，对应的输入电压约为多少？',
      options: ['3.3 V', '5 V', '4095 V', '1.65 V'],
      answer: 0,
      explanation: '满量程编码 4095 对应的就是参考电压 3.3V（V = 4095 × 3.3 / 4095 = 3.3V）。B 的 5V 与本题 Vref = 3.3V 不符；C 把编码数字当成了电压值，单位都错了；D 的 1.65V 是半量程（约 2048）对应的电压，不是最大编码。ADC 读数换算后永远不超过 Vref，这是检查结果是否合理的快捷方法。',
    },
    {
      id: 'chapter-09-q5',
      type: 'choice',
      question: '12 位 ADC、Vref = 3.3V，读到 2048，输入电压约为多少？',
      options: ['3.3 V', '1.65 V', '0.825 V', '2.5 V'],
      answer: 1,
      explanation: '精确计算：V = 2048 × 3.3 / 4095 ≈ 1.65V。快速判断：2048 = 2 的 11 次方，是满量程 4096 的一半（半量程），半量程电压约等于 Vref 的一半 = 1.65V。A 是满量程对应的电压；C 的 0.825V 是四分之一量程（约 1024）对应的电压；D 的 2.5V 只有在 Vref = 5V 时半量程才成立，本题 Vref 是 3.3V。',
    },
    {
      id: 'chapter-09-q6',
      type: 'multiple',
      question: '关于用 PWM 实现"准模拟"输出，下列说法正确的有哪些？',
      options: ['改变占空比即可改变平均电压', '输出本质仍是高低电平的方波，加 RC 低通滤波可得到平滑电压', '占空比 50% 时平均电压约为 Vcc 的一半', '占空比越大，平均电压越低'],
      answer: [0, 1, 2],
      explanation: 'PWM 是频率固定、占空比可调的方波，平均电压 = 占空比 × 高电平电压，所以改变占空比就改变了平均电压（A 对）；方波本身仍是数字信号，只有经过 RC 低通滤波滤除高频分量后才得到平滑的"准模拟"电压（B 对）；占空比 50% 时平均电压约为 Vcc 的一半（C 对）。D 说反了：占空比越大，平均电压越高。',
    },
    {
      id: 'chapter-09-q7',
      type: 'choice',
      question: 'Arduino Uno 上 analogRead(A0) 的返回值范围是？',
      options: ['0 ~ 255', '0 ~ 1023', '0 ~ 4095', '0 ~ 5'],
      answer: 1,
      explanation: 'Uno 的 ATmega328P 内置 10 位 ADC，analogRead 返回 0~1023，共 1024 档。A 的 0~255 是 analogWrite 的 8 位 PWM 占空比范围，是输出不是输入；C 的 0~4095 是 12 位 ADC（如 STM32）的范围；D 的 0~5 是换算后的电压值，不是 ADC 的数字编码。',
    },
    {
      id: 'chapter-09-q8',
      type: 'fill',
      question: 'n 位 ADC 的量化档位数为多少？（用含 n 的表达式填空，如 2 的 n 次方）',
      accept: ['2^n', '2的n次方', '2 的 n 次方', '2**n'],
      explanation: 'n 位二进制编码共有 2^n 种取值，所以量化档位数为 2 的 n 次方，编码范围是 0 ~ (2^n − 1)。例如 10 位 ADC 有 2^10 = 1024 档，编码 0~1023；档位数与最大编码值相差 1，这是最容易被忽略的细节。',
    },
  ],
};

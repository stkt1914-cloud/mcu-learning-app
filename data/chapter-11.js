// 章节：传感器与执行器
window.CHAPTERS = window.CHAPTERS || {};
window.CHAPTERS['chapter-11'] = {
  id: 'chapter-11',
  order: 11,
  icon: '📡',
  title: '传感器与执行器',
  summary: '从温湿度、温度、超声波测距传感器到舵机、直流电机与继电器：学会读数据、算距离、控角度、驱动力，让单片机感知世界并驱动设备。',
  sections: [
    {
      type: 'text',
      html: '<h3>传感器与执行器总览</h3><p><b>传感器（sensor）</b>把物理量（温度、湿度、距离、光照等）变成电信号，是单片机的"感官"；<b>执行器（actuator）</b>（LED、舵机、直流电机、继电器等）把电信号变成机械或电气动作，是单片机的"手脚"。按输出形式，传感器可分为三类：</p><ul><li><b>数字输出（digital）</b>：直接输出 0/1 电平或串行数字协议，如按键、DHT11 数据脚、DS18B20（单总线）、HC-SR04 的 Echo。</li><li><b>模拟输出（analog）</b>：输出电压随物理量连续变化，需接 <b>ADC（模数转换器）</b>读取，如 NTC 热敏电阻、光敏电阻、电位器、LM35。</li><li><b>通信接口（bus）</b>：通过 UART、I2C、SPI 等总线把测量值以数字报文送出，如 BME280（I2C）、MPU6050（I2C）、GPS 模块（UART）。</li></ul><p>本章以 Arduino Uno 为主线，逐一实践温湿度、温度、超声波测距三种传感器，以及舵机、直流电机、继电器三种执行器。</p>',
    },
    {
      type: 'text',
      html: '<h3>DHT11 温湿度传感器与单总线时序</h3><p><b>DHT11</b> 是一款低成本的数字温湿度传感器，测温范围 0~50℃、精度约 ±2℃，测湿范围 20~90%RH、精度约 ±5%，通过一根数据线（<b>单总线，1-Wire</b>）与单片机通信。DHT11 数据脚是<b>开漏（open-drain）</b>输出，因此数据线与 VCC 之间必须接 <code>4.7kΩ~10kΩ</code> 的<b>上拉电阻</b>，空闲时总线保持高电平。</p><p>单总线时序要点：主机先把总线拉低 <b>≥18ms</b> 发起通信，然后释放；DHT11 响应后先输出 80μs 低电平 + 80μs 高电平应答，再连续发送 <b>40 位</b>数据（湿度高 8 位、湿度低 8 位、温度高 8 位、温度低 8 位、校验 8 位）。每位由"50μs 低电平 + 一段高电平"组成，高电平持续 <b>26~28μs 表示 0</b>、<b>70μs 左右表示 1</b>，靠测量高电平宽度区分。手工用 GPIO 翻转读取很容易受中断干扰，工程上一般直接使用 <b>DHT 库</b>（Adafruit DHT sensor library）。</p>',
    },
    {
      type: 'code',
      title: 'DHT11 读取温湿度（Arduino）',
      code: `// Arduino Uno + DHT11：DATA 接 D2，VCC=5V，DATA 与 VCC 间接 4.7kΩ 上拉
// 需要安装 Adafruit DHT sensor library 与 Adafruit Unified Sensor
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();      // 相对湿度（%RH）
  float t = dht.readTemperature();   // 温度（℃）
  if (isnan(h) || isnan(t)) {        // 读取失败时返回 NaN
    Serial.println("DHT read failed");
    return;
  }
  Serial.print("Temp = ");
  Serial.print(t);
  Serial.print(" C, Hum = ");
  Serial.println(h);
  delay(2000);   // DHT11 采样间隔建议 >= 1 秒
}`,
      note: '目标平台：Arduino Uno，库名：DHT（Adafruit DHT sensor library + Adafruit Unified Sensor）。引脚假设：DATA 接 D2，VCC=5V，DATA 与 VCC 间接 4.7kΩ 上拉电阻。DHT 库内部已按单总线时序完成"发起—应答—读 40 位—校验"，学习时序原理可用逻辑分析仪观察总线波形。Wokwi 中搜索 dht11 可直接仿真本示例。',
    },
    {
      type: 'text',
      html: '<h3>DS18B20 数字温度与 NTC 模拟温度</h3><p><b>DS18B20</b> 是 Maxim（原 Dallas）的数字温度传感器，同样走单总线：测温范围 -55~+125℃，分辨率可选 9~12 位（12 位时分辨率约 0.0625℃），而且<b>一根数据线上可以并联多片</b>，靠每片唯一的 64 位 ROM 码区分，非常适合多点测温（如机房多路温度监控）。供电可选外部 3~5.5V，或"寄生供电"仅用两根线。常用 <b>OneWire</b> + <b>DallasTemperature</b> 两个库驱动，先 <code>requestTemperatures()</code> 发起转换，再 <code>getTempCByIndex(0)</code> 读取结果。</p><p>作为对照，<b>模拟温度传感器</b>（如 <b>NTC 热敏电阻</b>、LM35）输出随温度变化的<b>模拟电压</b>，需要接单片机 <b>ADC</b> 采样，再用查表或公式换算温度。NTC 的阻值-温度关系是非线性的（可用 Steinhart-Hart 方程拟合），精度与一致性一般不如 DS18B20，但成本更低、响应更快。选型口诀：<b>单个点测温用 DS18B20，多点测温也用 DS18B20；成本敏感或要求响应快时，可考虑 NTC + ADC</b>。</p>',
    },
    {
      type: 'text',
      html: '<h3>HC-SR04 超声波测距：触发与回波</h3><p><b>HC-SR04</b> 超声波模块有 4 个引脚：<code>VCC</code>（5V）、<code>GND</code>、<code>Trig</code>（触发）和 <code>Echo</code>（回波）。测距流程：① 单片机给 Trig 一个 <b>≥10μs</b> 的高电平脉冲；② 模块自动发射 8 个 40kHz 的超声波脉冲并等待反射；③ 收到回波后，Echo 输出一段高电平，<b>高电平持续时间 = 声波"发射→障碍物→返回"的往返总时间</b>。</p><p><b>测距公式：</b>设声速 <code>v = 340 m/s</code>，Echo 高电平时间为 <code>t</code>（秒），往返路程 <code>2d = v·t</code>，所以距离 <code>d = v·t / 2</code>。换算成常用单位：<code>340 m/s = 0.034 cm/μs</code>，若 t 以微秒计，则 <code>d(cm) = t(μs) × 0.034 / 2</code>。例如 t = 1000μs 时：2d = 34cm，d = 17cm。<b>t 是往返时间，必须除以 2</b>，这是最常犯的错误。模块测量范围一般 2cm~4m；<b>声速受温度影响</b>（约 331.4 + 0.6×T℃ m/s），要求高精度时可测温后补偿。</p>',
    },
    {
      type: 'code',
      title: 'HC-SR04 超声波测距（Arduino）',
      code: `// Arduino Uno + HC-SR04：Trig=D10，Echo=D11，VCC=5V
const int trigPin = 10;
const int echoPin = 11;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  // 1. 触发：Trig 输出 >=10us 的高电平脉冲
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // 2. 测量 Echo 高电平宽度（微秒）；无回波时 pulseIn 超时返回 0
  unsigned long us = pulseIn(echoPin, HIGH);

  // 3. 距离 = 时间 x 声速 / 2（声波往返，必须除以 2）
  float cm = us * 0.034 / 2.0;

  Serial.print("Distance = ");
  Serial.print(cm);
  Serial.println(" cm");
  delay(200);
}`,
      note: '目标平台：Arduino Uno，无需第三方库（pulseIn 为 Arduino 内置函数）。引脚假设：Trig=D10、Echo=D11、VCC=5V。Echo 输出的是数字高/低电平，接普通数字输入即可，不需要 ADC。pulseIn() 默认阻塞等待回波、超时 1 秒；若读数乱跳，检查前方 45° 内无遮挡、供电稳定，并考虑多次测量取平均。',
    },
    {
      type: 'text',
      html: '<h3>舵机：PWM 占空比与角度</h3><p><b>舵机（servo）</b>内部由直流电机 + 减速齿轮 + 位置反馈电位器组成，信号线输入特定宽度的方波，舵机就转到对应角度并保持。标准舵机（如 SG90）的信号是<b>周期 20ms（频率 50Hz）</b>的 PWM（脉宽调制，pulse width modulation），角度与<b>高电平脉宽</b>近似线性对应：<code>0°→0.5ms</code>、<code>90°→1.5ms</code>（中位）、<code>180°→2.5ms</code>。占空比 = 脉宽 ÷ 周期：0.5/20 = <b>2.5%</b>（0°），1.5/20 = <b>7.5%</b>（90°），2.5/20 = <b>12.5%</b>（180°）。Arduino 的 <code>Servo</code> 库把"脉宽→角度"封装成 <code>write(angle)</code>，无需自己算占空比，但理解脉宽与角度的关系对调试至关重要——脉宽超出范围时舵机会堵转、发热甚至损坏。</p>',
    },
    {
      type: 'text',
      html: '<h3>直流电机驱动（L298N/H 桥）与继电器</h3><p><b>直流电机（DC motor）</b>的转速和方向都要控制：转速靠 PWM 改变平均电压（<b>调速</b>），方向靠改变电流方向（<b>换向</b>）。换向需要 <b>H 桥（H-bridge）</b>电路——由 4 个开关组成的 H 形拓扑，常用驱动芯片 <b>L298N</b>。L298N 模块的控制逻辑：<code>IN1/IN2</code> 决定方向（IN1=1、IN2=0 正转，IN1=0、IN2=1 反转，两者相同则刹车/停止），<code>ENA</code>（Enable A）接 PWM 决定转速。注意 L298N 的<b>逻辑电源 5V 与电机电源 7~12V 要分开供电，并且要与单片机共地</b>。电机是感性负载，关断瞬间会产生反向电动势，模块已内置续流二极管，若自制 H 桥务必自行加上。</p><p><b>继电器（relay）</b>是用小电流控制大电流的电磁开关：低压线圈得电产生磁场吸合触点，从而通断高压/大电流回路（如 <b>220V 交流负载</b>——灯、风扇、电磁阀）。其核心价值是<b>电气隔离（isolation）</b>：线圈侧（弱电）与触点侧（强电）之间没有电气连接，单片机低压电路与 220V 强电互不干扰、更安全。大多数成品继电器模块是<b>低电平触发</b>（IN 接 GND 吸合、接 5V 释放），但有的模块相反，务必以说明书为准；控制交流负载时，强电线必须接在<b>触点侧</b>，绝不能接到线圈侧，并保证高压部分绝缘良好。</p>',
    },
    {
      type: 'code',
      title: '舵机转动 + L298N 直流电机正反转调速（Arduino）',
      code: `// Arduino Uno：舵机信号线接 D9；L298N 模块 IN1=D7、IN2=D8、ENA=D5
// 电机接 OUT1/OUT2；L298N 逻辑电源 5V、电机电源 7~12V 分开供电并共地
#include <Servo.h>

Servo myServo;

const int enA = 5;
const int in1 = 7;
const int in2 = 8;

void setup() {
  myServo.attach(9);        // 舵机接 D9
  pinMode(enA, OUTPUT);
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
}

void loop() {
  // 舵机依次转到 0°、90°、180°
  myServo.write(0);   delay(1000);
  myServo.write(90);  delay(1000);
  myServo.write(180); delay(1000);

  // 电机正转，约 50% 速度（128/255）
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  analogWrite(enA, 128);
  delay(2000);

  // 电机反转，全速（255/255）
  digitalWrite(in1, LOW);
  digitalWrite(in2, HIGH);
  analogWrite(enA, 255);
  delay(2000);

  // 刹车停止：IN1=IN2=0
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  analogWrite(enA, 0);
  delay(2000);
}`,
      note: '目标平台：Arduino Uno，库名：Servo（Arduino IDE 内置）。引脚假设：舵机信号线接 D9；L298N 的 IN1=D7、IN2=D8、ENA=D5，电机接 OUT1/OUT2；逻辑电源 5V、电机电源 7~12V 分开供电并与单片机共地。Servo 库使用 Timer1（D9/D10），analogWrite 的 D5/D6 走 Timer0，二者互不冲突。analogWrite 输出 0~255 对应 0%~100% 占空比。Wokwi 中可搜索 servo 与 l298n 仿真。',
    },
    {
      type: 'tip',
      kind: 'warn',
      html: '<p><b>高频易错点：</b>① DHT11/DS18B20 的单总线必须接 4.7kΩ~10kΩ 上拉电阻，否则读数失败或乱跳；② 测距公式 <code>d = v·t/2</code> 中 t 是往返时间，漏掉除以 2 会把距离算大一倍；③ 舵机脉宽范围因型号而异（常见 0.5~2.5ms），超范围写入可能导致堵转发热；④ L298N 的逻辑地与电机电源地必须共地，IN1=IN2 时电机会刹车而不是继续转；⑤ 继电器控制 220V 交流负载时，强电必须接在触点侧并做好绝缘，线圈由弱电侧（三极管/ULN2003）驱动，线圈两端反向并联续流二极管——<b>任何时候都不要把交流电接到单片机或模块的逻辑电路上</b>。</p>',
    },
  ],
  exercises: [
    {
      id: 'chapter-11-q1',
      type: 'choice',
      question: '按输出形式分类，下面哪个属于数字输出（digital output）传感器？',
      options: ['NTC 热敏电阻', 'DHT11 温湿度模块的数据脚', '光敏电阻', '电位器'],
      answer: 1,
      explanation: 'DHT11 的数据脚输出单总线（1-Wire）数字信号，高低电平直接表示 0/1，单片机 GPIO 可直接读取，属于数字输出传感器。A、C、D 输出的都是随物理量连续变化的模拟电压（阻值变化引起分压变化），必须接 ADC（模数转换器）采样，属于模拟输出传感器。',
    },
    {
      id: 'chapter-11-q2',
      type: 'choice',
      question: '用 HC-SR04 测距，测得 Echo 高电平持续时间为 1ms，声速按 340m/s 计算，目标距离是多少？',
      options: ['17 cm', '34 cm', '170 cm', '3.4 cm'],
      answer: 0,
      explanation: '推导：Echo 高电平时间是声波从发射到返回的往返总时间，即 2d = v·t。t = 1ms = 1000μs，声速 340m/s = 0.034cm/μs，往返路程 2d = 0.034 × 1000 = 34cm，距离 d = 34 ÷ 2 = 17cm。B 错：34cm 是往返路程，忘记除以 2；C 错：单位换算错误（把 0.034 当 0.34）；D 错：数值计算不符。',
    },
    {
      id: 'chapter-11-q3',
      type: 'choice',
      question: '标准舵机（如 SG90）的 PWM 信号周期为 20ms，当高电平脉宽为 1.5ms 时，舵机大致转到什么角度？',
      options: ['0°', '45°', '90°', '180°'],
      answer: 2,
      explanation: '标准舵机的角度与脉宽近似线性对应：0.5ms→0°、1.5ms→90°（中位）、2.5ms→180°。1.5ms 恰好是中间值，对应 90°。A 错：0° 对应 0.5ms；B 错：约 1ms 对应 45°（线性插值）；D 错：180° 对应 2.5ms。实际舵机的脉宽范围可能略有差异，以数据手册为准。',
    },
    {
      id: 'chapter-11-q4',
      type: 'choice',
      question: '舵机信号周期为 20ms，若高电平脉宽为 0.5ms，该 PWM 信号的占空比（duty cycle）是多少？',
      options: ['2.5%', '5%', '10%', '12.5%'],
      answer: 0,
      explanation: '推导：占空比 = 高电平时间 ÷ 周期 × 100% = 0.5ms ÷ 20ms × 100% = 2.5%，对应舵机 0° 位置。B 的 5% 是 1ms ÷ 20ms 的结果；C 的 10% 是 2ms ÷ 20ms 的结果；D 的 12.5% 是 2.5ms ÷ 20ms 的结果，对应 180°。',
    },
    {
      id: 'chapter-11-q5',
      type: 'choice',
      question: '用 L298N 驱动直流电机，当 IN1=HIGH、IN2=LOW，且 ENA 输入 PWM 信号时，电机处于什么状态？',
      options: ['完全停止', '向一个方向转动，转速由 ENA 的 PWM 占空比决定', '必定反向转动', '以固定全速转动'],
      answer: 1,
      explanation: 'L298N 的 H 桥中，IN1/IN2 决定电流方向：IN1=1、IN2=0 时电机正转（约定方向），IN1=0、IN2=1 时反转；ENA 使能输出级，接入 PWM 后平均电压随占空比变化，实现调速。A 错：IN1≠IN2 时有电流通路，不会停止；C 错：正反转由 IN1/IN2 互换决定，本题是正转；D 错：ENA 的 PWM 会改变平均电压，转速随占空比变化，不是固定全速。',
    },
    {
      id: 'chapter-11-q6',
      type: 'multiple',
      question: '关于 HC-SR04 超声波测距，下列说法正确的有？',
      options: [
        'Trig 引脚需要 ≥10μs 的高电平触发脉冲',
        'Echo 高电平持续时间对应声波往返的总时间',
        '声速受温度影响，温度变化会带来测量误差',
        'Echo 引脚必须接到模拟输入引脚（ADC）上才能工作',
      ],
      answer: [0, 1, 2],
      explanation: 'HC-SR04 的完整流程：Trig 给 ≥10μs 高电平触发 → 模块发射 8 个 40kHz 超声波 → Echo 输出高电平，时长即往返时间，A、B 正确。声速 c ≈ 331.4 + 0.6×T（m/s），温度变化会改变声速，高精度应用需要温度补偿，C 正确。Echo 输出的是数字高/低电平，接普通数字输入引脚、用 pulseIn() 测宽度即可，不需要 ADC，D 错。',
    },
    {
      id: 'chapter-11-q7',
      type: 'fill',
      question: 'DHT11 的单总线数据脚是开漏（open-drain）输出，为保证总线空闲时为高电平，数据线与 VCC 之间需要接一个什么元件？（填元件名称）',
      accept: ['上拉电阻', '上拉', '上拉电阻器', 'pull-up', 'pull up', '上拉电阻（4.7kΩ~10kΩ）'],
      explanation: '单总线设备的数数据脚都是开漏输出：只能把总线拉低、不能主动输出高电平，空闲时靠外部电阻把总线"拉"到 VCC 电平，这个元件就是上拉电阻（pull-up resistor），典型取值 4.7kΩ~10kΩ。没有上拉电阻时总线处于不确定状态，通信会失败。',
    },
    {
      id: 'chapter-11-q8',
      type: 'multiple',
      question: '关于继电器（relay）控制交流负载，下列说法正确的有？',
      options: [
        '继电器线圈侧与触点侧在电气上是隔离的',
        '继电器线圈可以直接接到 220V 交流电上',
        '触点侧可以通断 220V 交流负载，单片机只需控制低压线圈',
        '单片机必须与 220V 交流电路共地，继电器才能工作',
      ],
      answer: [0, 2],
      explanation: '继电器靠电磁原理工作：低压线圈得电产生磁场吸合触点，线圈与触点之间没有电气连接，因此线圈侧（弱电）与触点侧（强电 220V）是电气隔离的，A 正确，这正是继电器用于隔离控制的意义。线圈是低压器件（如 5V），直接接 220V 会烧毁，B 错；交流负载接在触点侧，单片机通过三极管/ULN2003 驱动线圈即可，C 正确；正因为有隔离，弱电侧与强电侧不需要共地，D 错。此外线圈两端应反向并联续流二极管，吸收关断瞬间的反向电动势。',
    },
  ],
};

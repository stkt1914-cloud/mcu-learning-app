# 单片机学习 App（PWA）

一个专为 **iPhone / iPad（也支持 Android）** 优化的**单片机系统学习应用**：
**12 章精讲 + 95 道练习题**，支持**离线使用**、**学习进度追踪**、**暗色模式**。

> 无需 Mac、无需 Xcode、无需上架 App Store：用 Safari 打开后"添加到主屏幕"即可像原生 App 一样全屏使用，**断网也能学**。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 📖 系统课程 | 12 章：单片机基础与环境 → 数制与位运算 → C 语言与寄存器 → GPIO → 定时器与延时 → 中断 → 串口 UART → I2C/SPI → ADC/DAC → 显示器件 → 传感器与执行器 → 实战项目与进阶（呼吸灯、电子钟、RTOS、低功耗） |
| 💻 示例代码 | 每章多个可运行示例（Arduino / STM32 双风格，标注平台与引脚），语法高亮 + 一键复制 |
| ✏️ 习题练习 | 单选 / 多选 / 读代码 / 填空四种题型，答完立即给解析，章节练习分数自动记录 |
| 📊 学习进度 | 已完成章节、总进度环、每章最佳练习分数 |
| 🔍 全局搜索 | 搜索章节标题、知识点、代码 |
| 🌙 暗色模式 | 跟随系统 / 手动切换 |
| 📴 离线可用 | Service Worker 预缓存全部资源，断网也能学 |

## 📱 在线使用（推荐：GitHub Pages 部署后）

部署完成后，用 iPhone **Safari** 打开你的 HTTPS 网址：
1. **保持联网完整浏览一遍**（自动把 12 章内容缓存进手机）；
2. 点 Safari **分享 → 添加到主屏幕**；
3. 打开「设置 → 飞行模式」验证：**断网后 App 照常可用** ✅

## 🖥 本地预览（电脑上）

```bash
cd mcu-learning-app
node server.js          # 或 powershell -ExecutionPolicy Bypass -File serve.ps1
# 电脑浏览器打开 http://localhost:8000
# 手机（同一 Wi-Fi）打开 http://<电脑IP>:8000
```

> ⚠️ 局域网 HTTP 地址不支持 iOS 离线缓存；要断网可用必须部署到 HTTPS（见下）。

## 🚀 部署到公网（免费 HTTPS，支持离线）

任选其一：
- **GitHub Pages**：把 `mcu-learning-app` 文件夹推到新仓库 → Settings → Pages → Deploy from branch（main / root）。
- **Netlify Drop**：打开 app.netlify.com/drop，直接把 `mcu-learning-app` 文件夹拖进去。

## 📂 目录结构

```
mcu-learning-app/
├── index.html            # 入口页面
├── manifest.webmanifest  # PWA 清单
├── sw.js                 # Service Worker（离线缓存）
├── css/app.css           # 全部样式（iOS 风格、暗色主题）
├── js/
│   ├── app.js            # 应用逻辑（路由/阅读/练习/进度/搜索）
│   └── highlight.js      # C 语法高亮
├── data/
│   └── chapter-01.js … chapter-12.js   # 章节内容与习题数据
├── icons/                # App 图标（180/192/512）
└── docs/
    ├── CONTENT_SPEC.md   # 章节数据格式规范
    └── validate.js       # 数据校验脚本（node docs/validate.js）
```

## ✍️ 自定义 / 增删章节

1. 按 `docs/CONTENT_SPEC.md` 的格式新建 `data/chapter-XX.js`（参考 `data/chapter-01.js` 写法）。
2. 在 `index.html` 和 `sw.js` 的预缓存列表中加入该文件。
3. 运行 `node docs/validate.js` 校验。

## 🔧 技术要点

- 纯原生 HTML/CSS/JS，**零依赖、零 CDN**，完全离线可用。
- 进度与成绩保存在 `localStorage`（键 `mculearn.v1`）。
- Service Worker 采用"导航请求网络优先、静态资源缓存优先"策略，更新后刷新页面即可生效。

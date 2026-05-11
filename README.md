# Altar

一个基于 Tauri、Vue 3 和 TresJS 的 3D 祭坛桌面应用。

应用会加载祭坛与香灰模型，用户点击祭坛后可以上香并输入悼词。悼词会提交到远程消息接口，同时用于在场景中生成可点击的香灰对象；再次点击已点燃的祭坛会短暂显示隐藏角色。

## 功能

- 3D 祭坛场景渲染，支持鼠标旋转视角
- Draco 压缩 GLB 模型加载
- 点击祭坛触发上香状态
- 输入悼词并提交到消息接口
- 根据悼词列表生成香灰对象，点击香灰查看对应内容
- 可作为 Web 页面运行，也可通过 Tauri 打包为桌面应用

## 技术栈

- Tauri 2
- Vue 3
- TypeScript
- Vite
- TresJS / Three.js
- Poisson Disk Sampling

## 项目结构

```text
.
├── public/
│   ├── draco/          # Draco 解码器文件
│   └── models/         # main.glb、ashes.glb 等 3D 模型
├── src/
│   ├── App.vue         # 主要交互与 3D 场景
│   └── main.ts         # Vue 入口
├── src-tauri/          # Tauri 桌面端配置与 Rust 入口
├── index.html
└── package.json
```

## 开发

安装依赖：

```bash
npm install
```

启动 Web 开发服务器：

```bash
npm run dev
```

启动 Tauri 桌面开发环境：

```bash
npm run tauri dev
```

构建前端：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

构建桌面应用：

```bash
npm run tauri build
```

## 资源约定

应用依赖以下静态资源路径：

- `/models/main.glb`：祭坛主模型
- `/models/ashes.glb`：香灰模型
- `/draco/`：Draco 解码器目录

如果模型或解码器不可访问，页面会在加载超时后提示检查资源路径。

## 消息接口

悼词消息通过 `https://naroah.top/messages` 读取和提交：

- `GET /messages`：读取悼词列表
- `POST /messages`：提交 `{ "content": "..." }`

接口不可用时，应用会继续显示本地交互，但远程消息不会同步。

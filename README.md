# Formody · 拨形见声 — Melody Playground

**An interactive playground for melody, rhythm, and visual form.**

**一个让旋律、节奏与视觉形态彼此回响的互动场域。**

Formody is an experimental interactive space that explores how mathematical relationships can become visual structures, musical gestures, and responsive sound experiences. The current site is a verified single-Seed prototype: one movable point produces an Outer Billiards orbit and a real-time browser-synthesized phrase.

Formody 是一处实验性的感知空间：数学的秩序化作可触的动作，图形的变化牵引旋律与音色，交互让一次观看变成一场亲身参与的聆听。当前站点是已核验的单 Seed 原型：一个可移动的起点产生 Outer Billiards 轨迹，并由浏览器实时合成乐句。

## Community

This repository is public while the project prepares for an open-source release. The project license and contribution rules have not been selected yet. Stars and feedback are welcome; code contributions are not open yet.

If you enjoy exploring real mathematics through motion and sound, star the repository to follow the next experiments.

本仓库目前公开可见，项目正在准备开源；许可证和贡献规则尚未确定。欢迎 Star 和反馈，暂不开放代码贡献。

喜欢通过动态画面与声音探索真实数学吗？欢迎给仓库点 Star，关注后续实验。

## Current Site

The current Sites publication is titled `Formody · 拨形见声`. It is a playable mathematical-art prototype based on a regular pentagon and the Euclidean Outer Billiards map.

当前 Sites 站点名为 `Formody · 拨形见声`。它是一个以正五边形和欧几里得 Outer Billiards 映射为基础、可以被演奏的数学艺术原型。

- Live site: https://formody-shape-instrument.superspringsun.chatgpt.site
- Sites saved version: 1
- Sites source commit: `6efe8a58e5cf244fd06148fca6d82387dffaf447`
- Current source archive: 11 files, 40 KB

- 线上站点：https://formody-shape-instrument.superspringsun.chatgpt.site
- Sites 已保存版本：1
- Sites 源码提交：`6efe8a58e5cf244fd06148fca6d82387dffaf447`
- 当前源码归档：11 个文件，约 40 KB

## What Exists Now

The current implementation provides:

- A single Seed that can be placed and moved with pointer, touch, or keyboard input.
- A regular pentagon and up to 512 genuine Euclidean Outer Billiards iterations.
- A symbolic vertex sequence mapped to a 16-step monophonic phrase.
- A real-time Web Audio instrument with an audio-clock scheduler, triangle voice, envelope, filter, delay, pause, resume, and visibility handling.
- Mathematical status messages for interior points, singular tangencies, numerical limits, finite return detection, and iteration limits.
- An optional `document.modelContext.registerTool` integration for moving the visible Seed when the host supports it.

当前实现包括：

- 一个可通过鼠标、触控或键盘放置和移动的单一 Seed。
- 正五边形与最多 512 步真实欧几里得 Outer Billiards 迭代。
- 将切点顶点序列映射为 16 步单声部乐句。
- 基于 Web Audio 的实时乐器：音频时钟调度、triangle 音色、包络、滤波、延迟、暂停、恢复与页面隐藏处理。
- 对内部点、奇异切线、数值上限、有限回归和迭代上限的数学状态提示。
- 当宿主支持时，通过可选的 `document.modelContext.registerTool` 移动可见 Seed。

## Why Formody

Formody investigates the meeting point between structure and perception: how a rule can produce rhythm, how a pattern can become a phrase, and how interaction can become a form of composition.

- **Mathematical thinking** provides patterns, proportions, sequences, cycles, and transformations.
- **Artistic expression** shapes form, color, movement, atmosphere, and surprise.
- **Music as material** brings melody, rhythm, harmony, timbre, resonance, and silence into the experience.
- **Interaction as instrument** connects gesture, parameters, feedback, and improvisation.

我们寻找结构与感受相遇的瞬间：规则开始呼吸，图案长出节拍，手势写下乐句，反馈把偶然编成一段可以再次进入的经验。

- **数学，是骨架**：图案、比例、序列、循环与变换，构成潜在的秩序。
- **艺术，是光**：形式、色彩、运动、氛围与意外，让秩序拥有感情。
- **音乐，是流动的材料**：旋律、节奏、和声、音色、共鸣与静默，在空间中展开。
- **交互，是演奏**：手势、参数、反馈与即兴，让体验不再只是被观看，而是被亲手唤醒。

## Run Locally

The project is a dependency-free static site. It requires Node.js 22+ for tests and Python 3 for the local static server.

```sh
python3 -m http.server 5173 --directory dist

# in another terminal
/path/to/node --test tests/*.test.mjs
```

Open `http://localhost:5173`. The original `npm run dev` and `npm test` scripts remain available when npm is installed.

这是一个无第三方依赖的静态站点。测试需要 Node.js 22+，本地静态服务器需要 Python 3。

```sh
python3 -m http.server 5173 --directory dist

# 在另一个终端
/path/to/node --test tests/*.test.mjs
```

打开 `http://localhost:5173` 即可体验。安装 npm 的环境仍可使用原有的 `npm run dev` 与 `npm test`。

## Architecture

The deployable artifact remains in `dist/`; this preserves the current Sites hosting contract. Within the static site, responsibilities are separated into:

- `dist/src/math`: pure Outer Billiards geometry with no DOM, Canvas, or audio dependency.
- `dist/src/music`: symbolic mapping, audio-clock scheduling, and Web Audio synthesis.
- `dist/src/interaction`: pointer, touch, and keyboard input.
- `dist/src/render`: Canvas rendering only.
- `dist/src/app.js`: application orchestration and UI state.
- `tests/`: deterministic math and music tests plus optional browser checks.
- [AGENTS.md](AGENTS.md): project instructions for AI-assisted work.
- [docs/conversation-workflow.md](docs/conversation-workflow.md): chat naming, AI collaboration, and handoff rules.
- [docs/open-source-and-promotion.md](docs/open-source-and-promotion.md): public/private boundaries, launch readiness, and community promotion.
- `docs/`: mathematical basis, prototype evidence, current-site provenance, architecture, operations, and roadmap.

可部署产物继续保留在 `dist/`，以维持当前 Sites 的托管约定。静态站点内部按职责拆分：

- `dist/src/math`：不依赖 DOM、Canvas 或音频的纯 Outer Billiards 几何层。
- `dist/src/music`：符号映射、音频时钟调度与 Web Audio 合成层。
- `dist/src/interaction`：指针、触控与键盘输入层。
- `dist/src/render`：只负责 Canvas 绘制。
- `dist/src/app.js`：应用编排与界面状态。
- `tests/`：确定性的数学、音乐测试与可选浏览器检查。
- [AGENTS.md](AGENTS.md)：项目内 AI 协作与公开资料处理规则。
- [docs/conversation-workflow.md](docs/conversation-workflow.md)：对话命名、AI 协作与交接规范。
- [docs/open-source-and-promotion.md](docs/open-source-and-promotion.md)：公开/私密边界、开源准备和社区推广规则。
- `docs/`：数学依据、原型证据、站点来源、架构、运营与路线文档。

## Verification

The current source evidence records 16/16 Node tests passing. The saved browser check records desktop and touch checks passing, an audio signal with five pitches, no clipping, and no page errors. Native WebMCP was not available in that verification environment; the stub contract passed instead.

当前源码证据记录为 Node 测试 16/16 通过。已保存的浏览器检查记录了桌面与触控通过、五种音高的音频信号、无削波与无页面异常。该验证环境不提供原生 WebMCP，因此仅通过模拟注册契约检查。

These results are evidence for this prototype snapshot. They do not claim real iOS Safari acceptance, production-scale performance, a mathematical theorem, a public launch, or a finished multi-voice musical system.

这些结果只证明当前原型快照的对应边界，不等同于真实 iOS Safari 验收、生产规模性能、数学定理证明、公开发布或完成的多声部音乐系统。

## Operations Model

GitHub is the collaboration and development record. Sites saved versions and deployment status are the production record. A GitHub commit, a Sites saved version, a live deployment, and real-device acceptance are separate gates.

Recommended release flow:

1. Make a focused change in GitHub.
2. Run deterministic tests and the relevant browser check.
3. Record what was verified and what remains unverified.
4. Save a Sites version from the exact source commit.
5. Deploy only that saved version.
6. Observe the deployed site and record the live result.

GitHub 是协作与开发记录，Sites 已保存版本和部署状态是生产记录。GitHub 提交、Sites 保存版本、线上部署和真实设备验收是彼此独立的关卡。

建议的发布流程：

1. 在 GitHub 中完成一个聚焦的改动。
2. 运行确定性测试和相关浏览器检查。
3. 记录已验证内容与仍未验证的边界。
4. 从准确的源码提交保存 Sites 版本。
5. 只部署已保存的版本。
6. 观察线上站点并记录实际结果。

Do not commit access tokens, site credentials, user data, or private operational logs. The current site access policy remains managed by Sites and is not defined by this public source repository.

不要提交访问令牌、站点凭证、用户数据或私密运营日志。当前站点的访问策略仍由 Sites 管理，不由这个公开源码仓库定义。

## Roadmap

Near term: choose and validate a richer musical language while keeping one Seed and one mathematical model; consider melody, bass, rhythm, and controlled variation as separate musical layers.

Later: add reproducible capture and sharing, multiple Seeds only when the musical model needs them, alternate mathematical studies with independent validation, and public-facing release work only after product, privacy, device, and performance gates are explicit.

近期：在保持单 Seed 与单一数学模型的前提下，选择并验证更丰富的音乐语言；将旋律、低音、节奏与受控变化作为不同音乐层分别讨论。

后续：增加可复现的捕获与分享；只有在音乐模型确有需要时再引入多 Seed；每个新的数学研究独立核验；产品、隐私、设备与性能关卡明确后，才进入面向公众的发布工作。

## Provenance

The current site snapshot was imported from the Sites source at saved version 1, source commit `6efe8a58e5cf244fd06148fca6d82387dffaf447`. The original mathematical and prototype evidence remains in `docs/mathematical-basis.md`, `docs/prototype-status.md`, and `docs/browser-results.json`.

当前站点快照来自 Sites 已保存版本 1，对应源码提交 `6efe8a58e5cf244fd06148fca6d82387dffaf447`。原有数学与原型证据保留在 `docs/mathematical-basis.md`、`docs/prototype-status.md` 与 `docs/browser-results.json`。

Formody / 拨形见声
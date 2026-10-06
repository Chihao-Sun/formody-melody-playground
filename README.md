# Formody · 拨形见声 — 平台状态更新（2026-10-06）

新增独立原生微信小程序项目：[`wechat-native/`](wechat-native/README.md)，开发者工具项目名 `formody`，不使用 web-view 包装游戏，网站端未修改。小程序以已核对的线上 Sites 第 51 版夕阳湖岸投石为基线（源码提交 `38ee25d3f9cb41dac9307d93bd7c91f1e6571ca6`），保留画面、数学／音乐规则和玩法，分别适配微信触摸、音频、短震动、设备姿态与生命周期。

目前是可导入的开发项目，**未运行微信开发者工具编译／真机验收，未上传、提审、发布或提交比赛**。AppID 为占位，需 Formody 独立注册账号。21 项本机 Node 回归和静态检查通过；四个本机离屏画布场景与原绘制代码像素一致，不是微信真机截图。细节与差异见小程序 README 和验收清单。

GitHub 根目录的浏览器源码仍是较早的 Ripple 快照；下方 README 描述 2026-10-01 那次源码工作的范围，其“最后发布”段落是当时的历史记录，不代表当前网站状态。本次没有重新发布网站，也没有把网站后续调整自动同步到原生小程序。

---

# Formody · 拨形见声

**Play a shape. Find a melody.**

A browser-based art playground where real mathematical rules become moving images and playable sound.

一个让真实数学规律变成动态画面与可演奏声音的浏览器艺术游乐场。

## Current source: Ripple / 投石涟漪

The default source entry is now **Ripple**: throw a small sphere into a quiet field, watch simple ripples grow into layered full-screen patterns, then dissolve into color and a fading multi-voice phrase. One throw unfolds over approximately 38 seconds. Pointer, touch, keyboard, pause, mute, and reset are implemented.

当前源码首页为「投石涟漪」：一颗小球落下，简单涟漪逐渐交织为满屏纹样，再慢慢晕开。旋律、低音、和声和高音层随过程展开；一次投掷约 38 秒。支持拖动、点击、键盘、暂停、静音和重置。

The original regular-pentagon Outer Billiards demo is preserved at **`outer-billiards.html`**. Its mathematical engine and original application modules are unchanged. The former README is archived at [docs/README-before-ripple.md](docs/README-before-ripple.md).

原版正五边形外台球 demo 保留在 **`outer-billiards.html`**；原数学引擎和应用模块没有改写。

## Source is not deployment / 源码不等于上线

**This update does not record a new Sites save or deployment.** The last recorded live publication is Sites version 1, source commit `6efe8a58e5cf244fd06148fca6d82387dffaf447`, at https://formody-shape-instrument.superspringsun.chatgpt.site. That URL must not be advertised as serving Ripple until deployment is independently confirmed.

**本次只更新源码，没有完成新的 Sites 保存与部署。** 原网址最后记录的是单 Seed、单声部版本，不能把 GitHub 提交说成原网址已经更新。

## Run

The project remains a dependency-free static site. Serve the `dist` directory:

```sh
python3 -m http.server 5173 --directory dist
```

Open `http://localhost:5173` for Ripple or `http://localhost:5173/outer-billiards.html` for the preserved original demo. Use a static server for the modular source rather than opening its index file directly.

```sh
node --test tests/ripple.test.mjs
# Full repository suite, when running from a complete checkout:
node --test tests/*.test.mjs
```

## Mathematics and sound

Landing position and gesture strength explicitly map to a seed outside the regular pentagon. The unchanged `traceOrbit` implementation calculates up to 256 iterations; its symbolic vertex sequence supplies the melodic motif. Genuine computed orbit segments remain visible as a subtle layer.

The colored field is an artistic composition of radial wavefronts and five-, ten-, and fifteen-fold angular harmonics. It is **not** a fluid simulation or the Outer Billiards orbit itself. Musical repetition is not evidence of mathematical periodicity. Browser synthesis supplies the sound; there are no prerecorded orchestral samples.

落点与力度映射到五边形外的数学起点；真实切点序列提供旋律动机。彩色波纹使用径向波与角向谐波进行艺术化表达，不冒充流体仿真或外台球轨道。这里的「交响」指多声部的展开，不是交响乐团采样。

## Verification for this update

- 13 new deterministic Ripple tests passed.
- 24 browser checks passed in Chromium 144 using an inline bundle of the source modules, including actual audio output, pause, mute, reset, mouse drag, keyboard, and emulated touch.
- No page errors were observed in that run. The sampled onset and climax audio windows did not clip.
- Real iOS Safari, other browser engines, sustained device performance, full-length audio mastering, and a new live deployment remain **unverified**.
- The original suite and original demo browser checks were not rerun during this local session. Earlier 16-test evidence belongs to the baseline, not this update. Legacy browser checks must target `outer-billiards.html`, not the new homepage.

See [implementation and evidence boundaries](docs/ripple-study.md) and [browser result data](docs/ripple-browser-results.json). The older single-Seed status notes describe the baseline; this README and the Ripple study note describe the new source.

## Architecture and project rules

`dist/src/math` remains the pure geometry layer. New Ripple code lives under `dist/src/ripple`: `core.js` for deterministic composition, `audio.js` for the audio-clock scheduler and synthesis, `surface.js` for the wave field, and `app.js` for gestures and presentation. The `dist/` hosting contract is unchanged. No backend, accounts, recording, uploads, external fonts, or external sound assets were added.

Project guidance: [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), [operations](docs/operations.md), [conversation workflow](docs/conversation-workflow.md), and [public/private and promotion rules](docs/open-source-and-promotion.md).

## Community

This is a public prototype preparing for an open-source release. A project license and contribution terms have not been selected. Stars and feedback are welcome; code contributions are not open yet. No public launch or social announcement is implied by this source update.

本项目是正在准备开源的公开原型，许可证与贡献条款尚未确定。欢迎 Star 与反馈，暂不开放代码贡献。


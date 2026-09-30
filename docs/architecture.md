# Formody Architecture

**A durable boundary map for the Formody site.**

**一份面向长期维护的 Formody 网站边界图。**

## System Boundary

The current product is a static, browser-native interactive instrument. It has no backend, account system, database, upload pipeline, or server-side session state.

当前产品是一个静态、原生浏览器交互乐器。目前没有后端、账户系统、数据库、上传链路或服务端会话状态。

```text
User gesture / keyboard / touch
          ↓
interaction → application state → math orbit
                              ↘
                         music mapping → audio clock → Web Audio
                              ↘
                         render state → Canvas
```

## Current Layers

### Domain: Mathematics

`dist/src/math/outer-billiards.js` owns polygon construction, support-line selection, singularity handling, orbit tracing, tolerances, and finite numerical limits. It must remain independent of browser APIs.

### Application: Orchestration

`dist/src/app.js` owns the Seed, revision boundaries, phrase regeneration, user-facing status, playback state, and the optional host tool adapter. It coordinates layers but should not absorb their domain logic.

### Adapters: Interaction and Sound

`dist/src/interaction/seed.js` translates pointer, touch, and keyboard input into world coordinates. `dist/src/music/audio.js` and `clock.js` translate symbolic phrases into scheduled Web Audio voices. Browser-only behavior stays at these edges.

### Presentation: Rendering

`dist/src/render/scene.js` draws only from calculated geometry and playback state. It must not invent a trajectory or infer mathematical claims from visual appearance.

## Long-Term Rules

- Keep domain calculations deterministic and testable without a browser.
- Keep musical mapping explicit; geometry must not silently change sound through hidden visual heuristics.
- Keep the deployed `dist/` contract stable unless the Sites hosting configuration changes in the same reviewed update.
- Add a new mathematical study as a separate module with separate references and tests.
- Treat persistence, sharing, analytics, authentication, and uploads as new capabilities requiring their own privacy and recovery design.
- Keep production deployment separate from a GitHub commit; record both identifiers.

## 长期规则

- 数学计算保持确定性，并可在无浏览器环境中独立测试。
- 音乐映射保持显式；几何层不能通过隐藏的视觉启发式悄悄改变声音。
- 除非 Sites 托管配置在同一轮变更中被审查，否则保持 `dist/` 部署契约稳定。
- 新的数学研究使用独立模块、独立资料依据与独立测试。
- 持久化、分享、分析、认证与上传都视为需要单独设计隐私和恢复机制的新能力。
- 生产部署与 GitHub 提交分开记录，并同时保存两个标识。
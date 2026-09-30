# Formody Site Operations

**Release, provenance, and maintenance rules for the interactive site.**

**这是一套面向互动站点的发布、来源与维护规则。**

## Source of Truth

GitHub `main` is the development record. Sites saved versions and deployment status are the production record. The live URL is an observed output, not a substitute for source history.

GitHub `main` 是开发记录；Sites 已保存版本和部署状态是生产记录。线上 URL 是被观察到的结果，不能替代源码历史。

Every release note should identify:

- GitHub commit SHA
- Sites version number and version ID when available
- Deployment status
- Test evidence
- Device/browser coverage
- Known limitations

每条发布记录都应写明：

- GitHub 提交 SHA
- Sites 版本号，以及条件允许时的版本 ID
- 部署状态
- 测试证据
- 设备与浏览器覆盖范围
- 已知限制

## Release Gates

### 1. Development

Make a focused change. Do not mix visual polish, mathematical rule changes, audio redesign, and operations changes without recording the boundaries.

完成一个聚焦改动。视觉润色、数学规则、音频重设计和运营改动不要混在一起，除非同时记录清楚边界。

### 2. Verification

Run `node --test tests/*.test.mjs`. Run the browser check when interaction, audio, responsive behavior, or page lifecycle changes.

运行 `node --test tests/*.test.mjs`。当交互、声音、响应式行为或页面生命周期发生变化时，运行浏览器检查。

### 3. Sites Save

Save a Sites version from the exact commit that was verified. A saved version is not automatically proof of a successful production deployment.

从已经验证的准确提交保存 Sites 版本。保存版本本身不自动等同于生产部署成功。

### 4. Deployment and Observation

Deploy only the saved version, inspect deployment status, and observe the live site. Record failures as failures; do not call a mixed result complete.

只部署已保存的版本，检查部署状态并观察线上站点。失败就记录为失败；混合结果不能称为全部完成。

## Rollback

Rollback means selecting a previously saved Sites version whose source commit is known, then recording why it was restored. Do not repair production by silently editing a live artifact.

回滚意味着选择来源提交明确的历史 Sites 版本，并记录恢复原因。不要通过悄悄编辑线上产物来修生产环境。

## Privacy and Safety

Never place access tokens, source credentials, private visitor data, audio uploads, or operational secrets in this repository. The repository may be public even when the live Site remains restricted.

不要把访问令牌、源码凭证、私密访客数据、音频上传文件或运营密钥放入此仓库。源码仓库可以公开，但线上站点仍可以保持受限访问。

## Current Baseline

The imported baseline is Sites version 1, source commit `6efe8a58e5cf244fd06148fca6d82387dffaf447`. It is a single-Seed, monophonic Outer Billiards prototype. Multi-voice composition, capture/share, multiple Seeds, and new mathematical models remain future work.

当前导入基线为 Sites 版本 1，源码提交 `6efe8a58e5cf244fd06148fca6d82387dffaf447`。它是单 Seed、单声部的 Outer Billiards 原型。多声部作曲、捕获分享、多 Seed 与新的数学模型仍属于后续工作。
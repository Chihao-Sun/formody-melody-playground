# Open-Source, Community, and Promotion Policy

## Current status / 当前状态

The GitHub repository is public and the project is preparing for a community-facing open-source release. No project license or contribution terms have been selected yet. Until those are added, describe this as a **public prototype preparing for open source**, not as a fully licensed open-source release. Stars and feedback are welcome; do not invite code contributions yet.

GitHub 仓库目前公开可见，项目正在为社区开源做准备；项目许可证和贡献条款尚未确定。在补齐之前，统一称为**正在准备开源的公开原型**，不要宣传成已经完成授权的开源项目。欢迎 Star 和反馈，暂不征集代码贡献。

## Public and private information / 公开与私密信息

### Suitable for the public repository / 可同步到公开仓库

- General project goals, confirmed product decisions, mathematical explanations, architecture, reproducible setup steps, test evidence, known limitations, and a public roadmap.
- Community-ready AI and conversation rules after removing personal details and internal-only context.
- Public demos, screenshots, and promotional copy that the owner has approved for release.

- 项目目标、已确认的产品方向、数学解释、架构、可复现的运行步骤、测试证据、已知限制和公开路线图。
- 删除个人信息与内部上下文后的通用 AI 协作及对话规范。
- 经项目负责人确认可公开的试玩地址、截图和推广文案。

### Keep private / 保持私密

- Passwords, API keys, access tokens, private URLs, account or permission details.
- Private conversation transcripts, personal contact details, identifiable user research, support logs, and private operational notes.
- Unreleased business, financial, or partnership information that the owner has not approved for public release.

- 密码、API Key、访问令牌、私有链接、账号或权限信息。
- 私人对话全文、个人联系方式、可识别用户的研究资料、支持记录和内部运营笔记。
- 尚未获准公开的商业、财务或合作信息。

Store private material outside this public repository or in a separately controlled private store. The ignored local folders in `.gitignore` are only a convenience; they are not a safe place for secrets if the folder is copied, synced, or force-added.

私密资料放在本仓库之外，或单独受控的私有存储中。`.gitignore` 里的本地目录只是防误提交便利措施；如果目录会被复制、同步或强制加入版本控制，它就不是秘密保险箱。

When classification is uncertain, keep the material private until the owner explicitly approves public sharing. A useful public summary may be written without copying the private conversation itself.

边界不明确时，先按私密资料处理，直到负责人明确同意公开。可以提炼可公开的摘要，不要直接复制私人对话。

## Promotion principles / 推广原则

Core public description:

> A browser-based art playground where real mathematical rules become moving images and playable sound.

> 一个让真实数学规律变成动态画面与可演奏声音的浏览器艺术游乐场。

Tell the story in this order: **mathematical rule → user gesture → visible transformation → sound or musical phrase**. Lead with the experience and show the product early; keep technical explanation available for readers who want to go deeper.

对外表达按“**数学规则 → 用户动作 → 画面变化 → 声音或乐句**”展开。先让人看见体验，再逐步解释数学；技术细节留给想深入了解的读者。

Promotion must match the current build:

- Identify the current experience as an early prototype: one Seed, one regular pentagon, a finite Outer Billiards trajectory, and one monophonic phrase.
- Label multi-voice composition, further mathematical models, final visual direction, and iOS Safari acceptance as future or unverified work until each is complete.
- Do not invent performance numbers, user counts, testimonials, accessibility claims, device support, or mathematical proofs.
- Do not present a visual effect as mathematical evidence.
- Invite stars and thoughtful feedback. Do not promise an open contribution path before licensing and contribution guidance are ready.

推广内容必须与当前版本一致：

- 明确这是早期原型：一个 Seed、一个正五边形、有限步数的外台球轨迹和一段单声部乐句。
- 多声部、更多数学模型、最终视觉风格和 iOS Safari 验收，在完成前都标为后续方向或未验证事项。
- 不编造性能数据、用户数量、用户评价、无障碍或设备兼容结论，也不把有限数值实验说成数学证明。
- 不把视觉效果当成数学证据。
- 可以邀请用户点 Star 和反馈；许可证与贡献规则准备好之前，不承诺已经开放代码贡献。

Suggested README call to action:

> Enjoy exploring mathematics through sound and motion? Star the repository to follow the next experiments.

> 喜欢通过声音与动态画面探索数学吗？欢迎给仓库点 Star，关注后续实验。

Prepare promotional copy, images, and release notes in the repository only when they contain public-safe material. Do not publish social posts, press messages, or announcements on the owner's behalf unless specifically requested.

推广文案、图片和发布说明只纳入可公开内容。未经明确请求，不代替负责人向社交平台、媒体或社区发布内容。

## Open-source readiness checklist / 正式开源前检查

- [ ] Owner selects a license and adds the matching `LICENSE` file.
- [ ] Review dependency, font, sound, image, and reference attribution requirements.
- [ ] Add contribution instructions and decide whether a Code of Conduct is appropriate.
- [ ] State how to report bugs and security issues without posting secrets publicly.
- [ ] Confirm setup and test instructions work from a clean checkout.
- [ ] Review the README, roadmap, demo links, screenshots, and known limitations for accuracy.
- [ ] Check tracked files and commit history for private information before each public release.

- [ ] 由负责人选择许可证，并添加对应的 `LICENSE` 文件。
- [ ] 核对依赖、字体、声音、图片和参考资料的许可与署名要求。
- [ ] 补充贡献说明，并决定是否需要行为准则。
- [ ] 说明如何报告 Bug 和安全问题，避免把秘密直接贴到公开区。
- [ ] 在干净检出环境中核验运行与测试说明。
- [ ] 核对 README、路线图、试玩链接、截图和已知限制是否准确。
- [ ] 每次公开发布前检查受跟踪文件及提交历史中是否含私密信息。

## Keeping this policy current / 实时维护

Update this policy when the owner confirms a change to public-release plans, contribution access, privacy boundaries, or promotion claims. Record confirmed decisions separately from proposals and add a dated note to the change log.

负责人确认公开计划、贡献权限、私密边界或推广口径变化时，及时更新本规范；把已确认决定与提案分开，并在变更记录中标注日期。

### Change log

- 2026-10-01: Established public/private boundaries, promotion rules, and open-source readiness requirements.

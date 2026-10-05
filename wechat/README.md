# Formody · 拨形见声｜微信入口草稿

记录日期：2026-10-06（Asia/Shanghai）。这是现有 Formody 仓库中的独立微信开发者工具项目；不是已注册、已验收或已发布的小程序。

## 已落实的接入结构

打开微信开发者工具，导入本目录 `wechat/`。项目名为 `formody`，独立入口为 `miniprogram/pages/experience/index`。默认 `touristappid` 仅用于未绑定账号的开发草稿，实际预览能力以开发者工具和账号权限为准。

入口使用 web-view 承载当前公开网页，不复制旧版涟漪源码，不改变网站的交互、绘图、音乐编排。开发者工具能展示网页不代表正式业务域名已经通过。正式使用需把 project.config.json 的 appid 换成 Formody 独立 AppID。

## 版本基准和已知差异

- 当前站点：<https://formody-shape-instrument.superspringsun.chatgpt.site>。
- 直接核验 Sites v51 已成功发布，源提交 `38ee25d3f9cb41dac9307d93bd7c91f1e6571ca6`；实际源码包含 `src/pond` 湖岸投石、Canvas 2D、多声部 Web Audio、水声采样和传感器处理。
- 本 GitHub main 原基准为 `fefb2681d9d417b4aeba2113c84f56560478dce9`，仍是较早的 `src/ripple` 版本。因此根 README 的旧部署说明不能代表当前站点；此草稿不把两份网站源码当成已同步。
- 此入口直接加载站点，所以不依赖 GitHub 旧 `dist`。长期需要明确网站的权威源码，并让网站发布与 GitHub 版本记录对应；这项统一尚未实施。

## 首次上线需要的条件

1. 用组织主体注册独立 Formody 小程序；主体资格和具体服务类目以该 AppID 的后台为准。不得复用其他业务的小程序 AppID。
2. 在公众平台“开发管理 → 开发设置 → 业务域名”配置实际体验域名。需要 HTTPS 和域名校验文件；备案、认证及其他材料按后台当日要求核对。当前 chatgpt.site 域名尚未验证符合这些条件或在国内普通网络稳定可达；如不满足，使用符合条件的自有域名和托管。
3. 配置域名校验文件，并逐一检查网页内跳转、原数学体验、素材来源链接及其目标域名。保留水声署名。
4. 以当前网页为基准，在真实 iPhone 微信与安卓微信验证声音启用/静音、拿石/松手/多次触水、四石成章、低头寻石、切后台恢复、横竖屏、安全区、方向感应和持续性能。不得以桌面模拟替代声画验收。
5. 核对实际服务类目。若微信把实际玩法归入小游戏，需按小游戏规则重新评估承载和移植方式；web-view 的存在不保证审核通过。
6. 按该账号要求完成基础信息、备案及隐私声明，上传、提审、通过后发布。仓库、AppID、上传代码、审核和发布是五个不同状态。

## 以后怎么同步

| 改动 | 这条路线的同步方式 |
| --- | --- |
| 网页的涟漪、尾迹、音色、交互 | 发布同一网页后，小程序重新加载该地址获得更新；需正确设置缓存，不保证已打开页面实时变化 |
| 小程序入口、分享、权限、绑定地址 | 更新微信代码包，上传开发版本，再按微信审核/发布流程处理 |
| 产品性质、类目、资质有变化 | 重新核对后台要求，必要时更新类目和提审；网页更新不能用于绕过审核 |

不需要每次重写两套体验。web-view 加载在线网页，离线体验仍依赖网络；网页域名与托管需长期维护。

## 自动上传（已写脚本，尚未接通）

仓库新增 `.github/workflows/wechat-upload.yml`，仅在 main 的 `wechat/` 或此工作流变化时触发，也支持手动运行。不会因为旧网站 `dist` 变化而重复上传小程序。

正式启用前：

- 配置 GitHub Secrets `FORMODY_WECHAT_APPID` 和 `FORMODY_WECHAT_PRIVATE_KEY`，后者为 Formody 的代码上传密钥；不要填其他小程序密钥。
- 在微信后台配置自动运行机器的出口 IP 白名单。GitHub 托管运行器地址会变化，需选可维护的固定出口或自托管运行器；本草稿不假设直接放行一定可用。
- 完成业务域名和真机验收后，才将 `release-status.json` 两项验证标志改为 true。

上传脚本会在条件未齐时终止，不假报上传成功。自动上传只生成开发版本，不会自动提审或发布。更深的自动提审/发布需额外的开放平台授权和符合条件的接入，不作为本草稿默认能力。

依赖使用官方 miniprogram-ci@2.1.48；尚未安装或执行微信编译器。工具本身不代表零运维成本：域名续费、托管流量、主体认证及自动运行器成本需按实际账号报价核对，本次未订购服务。

## 可行性与体验边界

web-view 最接近保留现有网页并共用开发。原生小程序路线需要适配 DOM/HTML/CSS、Pointer Events、Canvas 初始化、音频节点、素材加载及页面生命周期；官方微信 WebAudio 支持实时合成的部分能力，不等于所有浏览器节点兼容。

微信系统导航/胶囊、音频策略、传感器与震动差异需要实测。当前网页的震动依赖 navigator.vibrate，不能保证在 iPhone 微信内生效；本入口不擅自新增震动桥接能力。

## 核验来源和当前验证范围

- 腾讯官方网页嵌入示例：<https://github.com/TencentCloudADP/adp-chat-client/blob/main/README.cn.md#微信小程序接入示例>，明确企业路线、HTTPS、业务域名和开发预览区别。
- 微信组件文档：<https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html>。
- 微信域名文档：<https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html>。
- 微信官方自动上传工具：<https://github.com/wechat-miniprogram/miniprogram-ci-dist>，上传密钥、IP 白名单、预览与上传能力。
- 微信官方 API 类型与注释：<https://github.com/wechat-miniprogram/api-typings>，WebAudioContext 接口。

本次可访问腾讯/微信官方 GitHub 来源；developers.weixin.qq.com 详情页直接读取失败，因此动态主体、类目、备案和发布条件仍需从当前后台核验。

草稿仅做 JSON 和 JavaScript 静态语法校验。微信开发者工具编译、微信真机加载、域名注册、自动上传及正式审核/发布均未执行。

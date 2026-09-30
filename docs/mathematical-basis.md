# Formody · 拨形见声：核验依据

## 读取的资料

1. 用户提供的 `FORMODY_PROJECT_CONTEXT_v0.1.docx`：已完整读取，保留 CONFIRMED / PROPOSED / LATER / REFERENCE 的区分。品牌名称和节奏/多声部愿景以之后用户消息为准。
2. Lael Costa, *Mathematical Billiards*, 2024-01-10：https://structures.uni-heidelberg.de/blog/posts/2024_01_costa/index.php 。已读取 Outer Billiards、非光滑形状、奇异点、欧几里得与双曲空间的章节。它明确给出左侧切线与中心反射规则，并解释奇异射线及后续奇异点。
3. 作者公开的配套视频工程旁白与数学实现：
   - https://github.com/2swap/swaptube/blob/master/src/Projects/Billiards.cpp
   - https://github.com/2swap/swaptube/blob/master/src/Host_Device_Shared/OuterBilliardsShared.h
   已读取本次可访问版本。旁白展示单步、周期、奇异线、稳定岛、Penrose kite、正多边形与双曲空间的推进。代码的欧几里得中心反射与上述文章一致。未复制任何源代码、UI、音乐、视觉身份或动画。
4. 用户在聊天中提供的视频内容总结，作为 REFERENCE。

YouTube 视频地址 https://www.youtube.com/watch?v=kL9BTbIGxLg 的直接访问被网络代理拒绝。本轮没有直接播放视频，也没有取得或分析视频画面截图。作者公开工程可以辅助理解，不能代替实际观看的声明。

## 精确说明

「经过顶点」本身不是奇异：对多边形而言，绝大多数合法迭代的切点就是顶点。奇异发生于本轮选择的支持切线沿整条边，导致切点不唯一；不是所有边延长线的两个方向都在所选映射的奇异域内。测试专门区分这两种情况。

对逆时针凸多边形，检验 `cross(v − p, w − p) ≥ 0`，其中 w 遍历所有顶点；通过支持线候选后检测是否有第二个共线顶点。只有唯一切点才反射。数值容差按多边形坐标尺度设置，原型范围内使用双精度浮点。

五边形测试不依赖画面是否好看：对每个迭代验证 `(p + T(p))/2 = v`，且整个多边形落在有向射线左侧。方形测试则以独立手算的四步轨道校准方向与顶点索引。

## 后续验证边界

目前实现的是欧几里得正五边形的标准 Outer Billiards。若增加 Penrose kite、outer length billiards、奇异集全场采样或双曲几何，应重新读取 PROJECT_CONTEXT 所列论文，为新规则添加独立验证；不以鱼眼扭曲替代双曲几何。未从有限数值实验推导任何无界性、非周期性或数学定理。

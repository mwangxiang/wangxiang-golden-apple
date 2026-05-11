# GPT Image 2 SBTI Poster Template

Use this template for Top10/SBTI/avatar portrait posters. Fill every placeholder from `sbti-persona-data.json`, `avatar-reference/top10-avatar-reference.json`, `avatar-reference/top10-avatar-reference-sheet.png`, and, when reference images cannot be attached, a manually inspected `avatar-traits.json`.

Save the filled prompt to:

```text
reports/visual-daily/RUN/image-model-pack/gpt-image-2-sbti-template-filled.md
```

Do not call the image model until this file exists and has passed a UTF-8 replacement-character check.

## Template

```text
生成一张横版信息图海报（4096x2816），高清细腻，适合社交媒体分享。

【标题】
顶部居中大字：「{{群名}} · 高频发言 Top10 · SBTI 人物画像」
副标题：「共 {{消息总数}} 条消息 | {{日期}} | 统计区间：{{时间窗口}}」

【整体风格】
- 浅米白色/奶油色温暖背景
- 卡片式网格布局：5列 x 2行，共10张人物卡片
- 每张人物卡片包含：日系写实动漫风半身像插画 + 文字信息区
- 画风参考：新海诚式细腻插画，柔和光影，精细线条
- 风格参考 prior approved posters: learning-community and professional-service SBTI avatar portraits
- 头像二创要求：不要直接粘贴原始微信头像；基于真实头像参考或 avatar traits 二次创作

【10张人物卡片】

第1张（左上角）：
- 姓名：{{TOP1姓名}}
- 发言数：{{TOP1数量}}条（占比{{TOP1百分比}}%）
- SBTI类型：{{TOP1类型码}} · {{TOP1类型名}}
- 插画场景：{{TOP1插画描述：必须结合头像视觉特征、行为特征、姿态、环境、光线}}
- 性格标签：{{TOP1性格描述：2-3句话，包含群内行为特征、口头禅或语气、金句：「{{TOP1金句}}」}}

第2张：
- 姓名：{{TOP2姓名}}
- 发言数：{{TOP2数量}}条（占比{{TOP2百分比}}%）
- SBTI类型：{{TOP2类型码}} · {{TOP2类型名}}
- 插画场景：{{TOP2插画描述}}
- 性格标签：{{TOP2性格描述，金句：「{{TOP2金句}}」}}

第3张：
- 姓名：{{TOP3姓名}}
- 发言数：{{TOP3数量}}条（占比{{TOP3百分比}}%）
- SBTI类型：{{TOP3类型码}} · {{TOP3类型名}}
- 插画场景：{{TOP3插画描述}}
- 性格标签：{{TOP3性格描述，金句：「{{TOP3金句}}」}}

第4张：
- 姓名：{{TOP4姓名}}
- 发言数：{{TOP4数量}}条（占比{{TOP4百分比}}%）
- SBTI类型：{{TOP4类型码}} · {{TOP4类型名}}
- 插画场景：{{TOP4插画描述}}
- 性格标签：{{TOP4性格描述，金句：「{{TOP4金句}}」}}

第5张：
- 姓名：{{TOP5姓名}}
- 发言数：{{TOP5数量}}条（占比{{TOP5百分比}}%）
- SBTI类型：{{TOP5类型码}} · {{TOP5类型名}}
- 插画场景：{{TOP5插画描述}}
- 性格标签：{{TOP5性格描述，金句：「{{TOP5金句}}」}}

第6张：
- 姓名：{{TOP6姓名}}
- 发言数：{{TOP6数量}}条（占比{{TOP6百分比}}%）
- SBTI类型：{{TOP6类型码}} · {{TOP6类型名}}
- 插画场景：{{TOP6插画描述}}
- 性格标签：{{TOP6性格描述，金句：「{{TOP6金句}}」}}

第7-10张：
- 如果没有真实活跃成员，不要伪造成成员。
- 使用非成员道具补位卡：工具经验、成本判断、工作流、案例复盘等。

【卡片设计规范】
- 每张卡片：白色圆角矩形，轻微投影
- 上部 60%：人物插画区，日系写实动漫风，每人场景不同，体现群内人设
- 下部 40%：文字信息区
  - 第一行：姓名 + 发言数
  - 第二行：SBTI 类型标签（彩色圆角药丸背景）
  - 第三行起：性格描述，必须包含金句精简版

【页面设计规范】
- 顶部标题栏：横跨全宽，浅色渐变底色
- 右上角水印：「数据来源：WeFlow 本地聊天记录」
- 中文字体：思源黑体（Noto Sans SC）
- 底部横幅标语：「一起把真实问题沉淀成可复用案例」

【硬性禁止】
- 不要生成没有 SBTI 类型的人物卡
- 不要省略金句
- 不要把真实头像原图直接拼贴进卡片
- 不要伪造第7-10位成员
- 不要使用只写风格、不填成员字段的短 prompt
```

## SBTI Types

Use existing `sbti-persona-data.json` first. If missing, infer from behavior:

- `CTRL · 拿捏者`: controls topic rhythm or decision frame
- `SAGE · 智者`: calm analysis and criteria
- `NERD · 技术宅`: technical deep dive
- `HYPE · 捧哏`: active response and atmosphere
- `WILD · 野生者`: sharp unexpected remarks
- `GLUE · 粘合剂`: connects topics and people
- `MEME · 梗王`: memes or humorous expression
- `RUSH · 冲锋者`: fast response and information flow
- `MALO · 吗喽`: self-mocking worker tone
- `CALC · 精算师`: cost, pricing, quota, and ROI calculation

## Validation

The final run should fail validation if `requiresAvatarRemix: true` and the output mode is `deterministic-avatar-linked/fallback`.

The prompt pack should fail human review if any real member card lacks:

- name
- count/percent
- SBTI code and Chinese type
- avatar-derived scene
- behavior/persona sentence
- gold quote

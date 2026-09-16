# 考研定制化复习系统 —— 数据契约 (Schema v1)

> 所有题库、套卷、错题、掌握度数据都必须严格遵守本文件。
> 后续新增功能时，**只允许向后兼容地新增字段**，不得改名或删除已有字段。

---

## 1. 科目代码 (subject)

| 代码 | 名称 | 显示 |
|---|---|---|
| `english1` | 英语一 | 英语一 |
| `math1` | 数学一 | 数学一 |
| `signals` | 信号与系统 | 信号与系统 |
| `politics` | 政治 | 政治 |

---

## 2. 知识点知识树 taxonomy

文件：`src/data/taxonomy.js`，挂载为 `KY.taxonomy`。

```js
KY.taxonomy = {
  english1: {
    name: '英语一',
    color: '#4f7cff',
    // modules = 卷面板块 / 章节
    modules: [
      {
        id: 'en1.m.cloze',            // 全局唯一
        name: '完形填空',
        points: [
          {
            id: 'en1.p.logic',        // 全局唯一，题目 knowledge 字段只能引用它
            name: '逻辑衔接与关联词',
            keywords: ['however', 'therefore', 'moreover', '转折', '递进', '因果', '上下文'],
            // 可选：该考点的前置考点，用于推题时做知识链延伸
            prereq: []
          }
        ]
      }
    ]
  },
  math1: {...},
  signals: {...},
  politics: {...}
}
```

约束：

- `modules[].id` 与 `points[].id` 全局唯一。
- `points[].keywords` 为小写优先的字符串数组；分类引擎按"命中次数 × 关键词权重"打分，长关键词权重更高。
- 知识点 id 命名规范：`<科目缩写>.p.<英文短语>`；科目缩写：`en1` / `m1` / `sig` / `pol`。

---

## 3. 题目 question

文件：`src/data/bank.<subject>.js`，每个文件向 `KY.banks.<subject>` 追加数组。

```js
{
  id: 'en1-2023-cloze-01',      // 全局唯一，格式 <subject缩写>-<年份或src>-<模块>-<序号>
  subject: 'english1',           // 必须是科目代码之一
  module: 'en1.m.cloze',         // 必须是 taxonomy 中该科目的 module id
  type: 'single',                // 见 §3.1
  stem: '题干纯文本（不含选项）',
  stemHtml: '',                  // 可选，需要数学公式/换行时使用；优先于 stem 渲染
  options: [                     // 客观题必填；主观题为 []
    { key: 'A', text: '选项内容' }
  ],
  answer: ['A'],                 // 见 §3.2
  explanation: '解析纯文本',
  knowledge: ['en1.p.logic'],    // 必须是 taxonomy 中该科目已存在的 point id，至少 1 个
  difficulty: 3,                 // 1~5 整数
  source: '2023年考研英语一真题',  // 来源描述，真题必须写清年份
  year: 2023,                    // 可选，真题年份；非真题省略
  tags: ['真题', '高频'],         // 可选
  video: {                       // 可选，B站详解
    bvid: '',                    // 真实 BVID 才填；为空时前端走搜索链接
    title: '',
    query: '考研英语一 完形填空 逻辑衔接 讲解'   // 搜索关键词，必填
  },
  score: 1                      // 分值权重，默认 1；套卷内以套卷自身定义为准确
}
```

### 3.1 type 取值

| type | 含义 | 判分方式 |
|---|---|---|
| `single` | 单选 | 自动 |
| `multi` | 多选（答案无序） | 自动 |
| `judge` | 判断题，answer 为 `['T']` / `['F']` | 自动 |
| `blank` | 填空，answer 为字符串数组（按空顺序） | 自动（可配 `blankTolerant`） |
| `cloze-item` | 完形/选词填空的单空 | 自动 |
| `subjective` | 主观题（解答题/翻译/作文/分析题） | 人工自评，交卷后进入自评面板 |

### 3.2 answer 规范

- `single` / `multi` / `judge` / `cloze-item`：选项 key 数组，如 `['A']`、`['A','C']`。
- `blank`：按空的顺序给出参考答案数组，如 `['2', 'x>1']`。
- `subjective`：给出参考答案/评分要点数组；`answer: []` 表示仅参考解析。
- 自动判分对大小写、首尾空格、全角半角做归一化；`blank` 额外忽略中英文标点差异。

### 3.3 主观题自评

`subjective` 题目可在题目上提供可选字段：

```js
rubric: [ { point: '写出特征方程', score: 3 }, { point: '求出零输入响应', score: 4 } ]
```

前端交卷后逐条勾选，折算得分。

---

## 4. 套卷 paper（英语一真题必需）

文件：`src/data/papers.shared.js`，挂载 `KY.papers.<科目代码>`（四科通用，题库就绪后自动汇编）。

```js
{
  id: 'en1-2023',
  subject: 'english1',
  title: '2023 年全国硕士研究生招生考试 英语（一）',
  year: 2023,
  durationMin: 180,              // 考试模式限时（分钟）
  totalScore: 100,
  sections: [
    {
      id: 'en1-2023.s1',
      name: 'Section I 完形填空',
      desc: '共 20 小题，每小题 0.5 分，共 10 分。',
      scorePerQuestion: 0.5,
      questions: ['en1-2023-cloze-01', 'en1-2023-cloze-02']   // 题目 id，引用题库
    }
  ],
  // 可选：允许套卷内联题目（题库里没有的整卷题目），优先引用
  inlineQuestions: []
}
```

说明：

- 套卷只引用 `question.id`，便于"同一道题同时出现在题库、错题本、套卷"三处而不产生副本。
- 考试模式从 `sections[].questions` 依次展开，按 `scorePerQuestion` 计分。
- 英语一真题的每道题都必须带 `video.query`，前端在每题下方提供 B站详解入口。

---

## 5. 用户数据（运行时，存浏览器 localStorage）

命名空间：`ky.v1.*`

| key | 内容 |
|---|---|
| `ky.v1.profile` | `{ name, targetSchool, examDate, createdAt }` |
| `ky.v1.wrongbook` | 错题本 `WrongItem[]` |
| `ky.v1.mastery` | 掌握度 `{ [pointId]: { score: 0~1, attempts, correct, lastAt, streak } }` |
| `ky.v1.practice` | 练习会话历史 |
| `ky.v1.exams` | 考试成绩记录 |
| `ky.v1.settings` | `{ ocr:{mode,apiKey,endpoint}, ai:{enabled,apiKey,endpoint,model}, video:{preferEmbed} }` |
| `ky.v1.userBank` | 用户导入的题库（数组，元素同 §3 的 question），与内置题库合并 |
| `ky.v1.videoOverrides` | 视频绑定（一题多讲），结构见 §7 |
| `ky.v1.seen` | 作答历史 `{ [questionId]: { count, correct, lastAt } }`，供推题的新鲜度/间隔重复使用 |

### 5.1 WrongItem（错题条目）

```js
{
  id: 'w-<timestamp>-<rand>',
  subject: 'math1',
  module: 'm1.m.calculus',
  stem: '题干（OCR 或手输，可编辑）',
  options: [...],
  myAnswer: '',                  // 用户当时的错误作答
  correctAnswer: [],             // 正确答案（用户可修正）
  explanation: '',
  imagePath: '',                 // 可选，原图 dataURL 缩略（超过 200KB 不落盘）
  knowledge: ['m1.p.limit'],     // 分类引擎给出的知识点
  knowledgeConfirmed: false,     // 用户是否已确认/修正分类
  errorType: 'concept',          // 见 §5.2
  errorSummary: '分类引擎生成的错因总结',
  difficulty: 3,
  createdAt: 1710000000000,
  reviewCount: 0,
  lastReviewAt: 0,
  mastered: false,               // 复习答对 2 次后自动置 true
  source: '手动上传'
}
```

### 5.2 errorType 错因类型

| 值 | 含义 |
|---|---|
| `concept` | 概念不清 |
| `formula` | 公式记错 |
| `calculation` | 计算失误 |
| `reading` | 审题偏差 |
| `method` | 方法/思路错误 |
| `vocab` | 词汇/术语障碍 |
| `logic` | 逻辑推理错误 |
| `careless` | 粗心 |
| `unknown` | 待人工确认 |

---

## 6. 掌握度模型（recommender 使用）

- `mastery[pointId].score` 初始 0.35（表示"未掌握"起步）。
- 答对：`score += (1 - score) * 0.25`；答错：`score += (0 - score) * 0.35`。
- 错题本新增一道该知识点的错题：额外 `score -= 0.10`（下限 0）。
- 推题优先级 = `(1 - score) * 真题加权 * 难度匹配 * 遗忘衰减`。
- `score < 0.6` 视为"未掌握"，错题复习页据此推题。

---

## 7. B站详解规约（支持一题多讲）

题库文件里的 `video` 字段：

```js
video: {
  bvid: '',            // 可选。真实 BVID 才填；为空时前端走搜索链接
  title: '',
  query: '考研英语一 完形填空 逻辑衔接 讲解'   // 搜索关键词，题目应尽量填
}
```

**运行时绑定（一题多讲）**存 `ky.v1.videoOverrides`：

```js
{
  "<questionId>": {
    list: [
      { bvid: 'BV1xx411c7mD', title: '某老师讲解' },
      { bvid: 'BV1yy411c7mE', title: '' }
    ]
  }
}
```

兼容旧的单视频写法 `{ bvid, title }`，读取时自动迁移。

规约：

- 一道题可绑定**任意多个**视频（不同老师讲法不同，让学生自己挑）。
- `bvid` 必须匹配 `/^BV[0-9A-Za-z]{10}$/`；不匹配的一律不写入——**禁止编造 BVID**。
- 没有绑定任何视频时，一律生成搜索深链：
  `https://search.bilibili.com/all?keyword=<encodeURIComponent(query)>`
- 有绑定时生成播放器：`https://player.bilibili.com/player.html?bvid=<BVID>`
- 绑定入口：题目 →「查看答案与详解」→「管理视频」；批量入口：「设置 → 视频绑定管理 → 批量导入链接」。
  批量文本每行格式为 `<题目ID 或题干关键词> <BV号1> [BV号2 ...]`，`#` 开头为注释。

---

## 9. 题库导入格式（用户自带题库）

导入的题目存在 `ky.v1.userBank`（数组，元素同 §3 的 question），与内置题库合并参与推题、组卷、判分。
**不修改任何源码文件**，所以升级程序不会冲掉用户导入的题。

### 9.1 CSV

首行为表头，从第二行起每题一行。中文表头与英文表头都认。

| 列 | 必填 | 说明 |
|---|---|---|
| `科目` | 是 | 英语一 / 数学一 / 信号与系统 / 政治，或 `english1` 等代码 |
| `题型` | 是 | 单选 / 多选 / 填空 / 判断 / 主观题 / 完形填空 |
| `题干` | 是 | 题目正文 |
| `选项A`~`选项H` | 选择题必填 | 每项一列 |
| `答案` | **是** | 选择：`A` 或 `AC`；填空：多空用 `\|` 分隔；主观：参考要点 |
| `解析` | 强烈建议 | 缺失会警告，但不阻断导入 |
| `考点` | 可留空 | 考点中文名或 id，多个用 `\|`；**留空则调用归类引擎自动判定并标注** |
| `板块` | 可留空 | 板块名或 module id，留空时按考点推断 |
| `难度` | 可留空 | 1~5 或 `★` 个数，默认 3 |
| `来源` / `年份` | 可留空 | 年份填 4 位数字即视为真题，会自动进入真题墙 |
| `评分要点` / `分值` | 主观题用 | `要点:分值\|要点:分值`；不写分值按总分平摊 |
| `B站关键词` | 可留空 | 留空则按科目+考点自动生成 |
| `B站视频` | 可留空 | BV 号，多个用 `\|`；导入时自动完成绑定 |

编码必须 UTF-8（导出的模板带 BOM，Excel 打开不乱码）。

### 9.2 JSON

接受以下任意形状：

- 本题库格式：`[{question}, ...]`
- `{ "questions": [{...}] }`
- `{ "banks": { "math1": [{...}] } }`
- 单个题目对象

记录里的键可以是 schema 字段名，也可以是上表的中文表头。
`options` 支持三种写法：`[{key,text}]`（原生）、`{A:'..',B:'..'}`、`['..','..']`；
`answer` 支持字符串或数组；`rubric` 支持 `[{point,score}]` 或 `"要点:分值|要点:分值"`；
`video` 支持 `{bvid,title,query}` 对象或 BV 号字符串。

### 9.3 导入校验（必须全部通过才入库）

1. 必须有题干；选择题必须有选项；
2. **必须有答案**（选择题答案必须在选项 key 之内；多选至少 2 项）；
3. 考点必须能落到 taxonomy 里的真实考点（中文名会被映射成 id；映射不到则调用归类引擎）；
4. `id` 非法或缺失时自动生成；重复 id 视为**更新**而非新增（不会产生副本）。

任何一条不满足，该行都会被跳过并在预览界面写明原因，**绝不静默丢数据**。

---

## 10. 共享题库（发布者维护、所有使用者可见的那一层）

### 10.1 三层题库与合并优先级

| 层 | 存放位置 | 谁能看到 | 怎么更新 |
|---|---|---|---|
| **内置题库** | `src/data/bank.*.js` | 所有使用者 | 改源码后重新发布 |
| **共享题库** | `src/data/bank.shared.js` → `KY.sharedBank` | **所有使用者**（刷新页面即得） | 发布者改文件后重新发布 |
| **个人题库** | 浏览器 `ky.v1.userBank` | 只有本机使用者自己 | 「题库导入」页自己传 |

**合并优先级：内置题库 > 共享题库 > 个人题库。**
实现方式是按此顺序插入索引、同 id 的后来者被跳过（见 `src/core/bank.js` 的 `rebuild()`）。

推论（很重要）：

- 发布者用共享题库**覆盖**一道内置题是**做不到**的——内置优先级更高。想改内置题得改源码。
- 发布者用共享题库**更新**一道自己以前发布的共享题，只要保持 `id` 不变即可，使用者会拿到新版。
- 使用者本地如果也有同 id 的个人副本，会被共享版覆盖，不会重复出现。

### 10.2 `bank.shared.js` 的结构

```js
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  /** 题目数组，元素结构同 §3 */
  KY.sharedBank = [ /* { id, subject, module, type, stem, options, answer, explanation, knowledge, difficulty, source, year, score, video } */ ];

  /** 发布元信息，便于排查"对方到底拿到哪一版" */
  KY.sharedBankMeta = {
    builtAt: '2025-06-01 15:30:15',
    count: 12,
    bySubject: { math1: 8, politics: 4 },
    source: 'import-page'   // 或 'release-json'
  };
})(window);
```

该文件只依赖 `global.KY`，因此既能被浏览器加载，也能被 Node 直接 `require`
（发布脚本靠这一点统计题数，无需重复实现解析逻辑）。

### 10.3 发布共享题库的两条路径

**路径 A：导出 JS 文件（本地开发也能看到）**

1. 网站「题库导入」页 → 上传题库 → 解析并预览
2. 点预览结果里的「导出为共享题库文件」→ 得到 `bank.shared.js`
3. 覆盖项目 `src/data/bank.shared.js`
4. 双击 `发布.cmd` → 上传 `dist` 里的内容

**路径 B：根目录放 JSON（不用碰 src 目录）**

1. 「题库导入」页 → 点「导出 JSON 到项目根目录」→ 得到 `共享题库.json`
2. 放到项目根目录（与 `发布.cmd` 同层）
3. 双击 `发布.cmd` —— `tools/release.js` 会自动读取并生成 `dist/src/data/bank.shared.js`

路径 B 是**整体替换**语义：每次发布会用该 JSON 完全决定共享题库内容。要追加题目，
需先把已有 JSON 在导入页重新上传，和新题一起导出。

### 10.4 id 冲突（发布者最容易踩的坑）

共享题库里若有题目的 `id` 与内置题库重复，**那些题不会生效**（内置优先），
而且会安静地消失。为避免"以为发出去了其实没有"，系统做了三件事：

1. `KY.bank.sharedConflictIds()` 返回未生效的 id 列表；
2. `KY.bank.stats()` 同时给出 `sharedFileCount`（文件里几题）、
   `sharedCount`（实际生效几题）、`sharedConflictCount`（冲突几题）；
3. 「题库导入」页与「设置」页会显式弹出红色警告并列出冲突 id。

**建议共享题 id 统一加前缀（如 `my-`），与内置题彻底隔开。**

### 10.5 使用者侧的数据安全

共享题库是网站文件的一部分，**不进入任何人的浏览器备份**（备份只含个人题库）。
发布者更新共享题库时：

- 使用者的错题本、掌握度、练习与考试记录**完全不受影响**（它们按考点 id 关联，不按题目 id）；
- 使用者个人题库里与共享题同 id 的副本会被共享版覆盖（这是有意的，见 §10.1）。

---

## 11. 共享每日计划（`plan.shared.js` → `KY.sharedPlan`）

### 11.1 结构

```js
KY.sharedPlan = {
  updatedAt: '2025-06-01 15:30:15',
  note: '',
  plans: [
    {
      id: 'plan-2025-06-01',     // 有日期时用 plan-<date>，否则 plan-<第N天>
      date: '2025-06-01',        // 可选，YYYY-MM-DD
      dayIndex: 1,               // 第几天
      title: '第 1 天 · 打基础',
      tasks: [ /* task */ ]
    }
  ]
};

KY.sharedPlanMeta = { builtAt, dayCount, taskCount, withDateCount, source };
```

### 11.2 task

```js
{
  id: 't3f9a2',          // 由任务文字派生，稳定；她是按这个记录打勾的
  seq: 0,
  text: '数学一 极限计算 20 题',
  kind: 'practice',      // practice | exam | plain
  subject: 'math1',      // practice / exam 时有值
  points: ['m1.p.limit.eval'],   // 必须存在于 taxonomy；为空时她只能按整科推题
  count: 20,             // 题量，可选
  paperId: '',           // kind=exam 时指向 KY.bank.paper(id)
  paperTitle: '',
  estMin: 60,            // 预计分钟
  inferred: false,       // true = 系统推断出来的，运营台会标出来让他核对
  issues: []             // 解析时发现的问题，会显示在运营台的预览里
}
```

### 11.3 运营者手写的文本格式

```
# 第 1 天 2025-06-01 打基础
- 数学一 极限计算 20 题 @60
- 英语一 阅读 2 篇 @50
- 政治 马原 唯物辩证法 @30
- 背昨天的生词 @15

# 第 2 天
- [math1|m1.p.limit.eval] 极限专项 15 题 @45
- 考试 2019 年英语一真题 @180
- [paper:english1-real-by-module] 真题精练 @120
```

规则：

| 写法 | 含义 |
|---|---|
| `# ...` | 新的一天。可含 `第N天`、`YYYY-MM-DD`、其余作为标题 |
| `- ...` | 一条任务 |
| `@数字` | 预计分钟数（会从显示文字里移除） |
| `[math1\|m1.p.limit.eval,...]` | 显式指定科目与考点（优先于自动识别） |
| `[paper:<套卷id>]` | 显式指定套卷（优先于自动识别） |
| `//` 开头 | 注释，忽略 |

自动识别优先级：**显式方括号 > 文字里的科目名 > 关键词引擎**。
计划文字是人写的，所以"文字里出现科目名"是最可靠的主路径（见 `plan.js` 的 `subjectFromText`）；
关键词引擎只在完全没有科目名时兜底，且**认不出就标成普通任务，不乱猜**。

### 11.4 使用者侧的打勾进度

存 `ky.v1.planProgress = { '<planId>::<taskId>': 时间戳 }`。
因为 taskId 由任务文字派生，运营者**调整任务顺序不会让她的打勾错位**；
但**改任务文字会重置那一项的勾**。

### 11.5 "今天"怎么判定（`KY.plan.resolveToday()`）

1. 有 `date` 等于今天 → 用它（`matched-date`）
2. 否则按顺序找第一份还没做完的（`next-unfinished`）
3. 全做完 → 用最后一份（`all-done`）
4. 没有计划 → `empty`

---

## 12. 共享错题推送（`push.shared.js` → `KY.sharedWrongPush`）

### 12.1 结构

```js
KY.sharedWrongPush = {
  updatedAt: '2025-06-01 15:30:15',
  title: '本周重点攻克',          // 她看到的标题
  note: '先重做一遍再往下走',      // 可选说明
  items: [
    { questionId: 'en1-2023-cloze-01', note: '逻辑衔接注意 however', addedAt: '' }
  ]
};

KY.sharedWrongPushMeta = { builtAt, count, source };
```

**只存 `questionId` 与备注，不存题目本体**——这样运营者更新题库后，她看到的自动是新版。

### 12.2 运营者手写的文本格式

每行：`题目ID 或 题干关键词` + 可选的 `| 备注`。`#` 与 `//` 开头为注释。

```
en1-2023-cloze-01 | 这道题的逻辑衔接你上次错了，注意 however 的用法
数学一 洛必达 | 你昨天错在这里，今天重做一遍
m1-2020-limit-01
```

关键词写法只在能唯一匹配到一道题时生效；匹配到多道会提示改用题目 ID。

### 12.3 使用者侧"收下"的语义

- 她点「全部收下」后，每一题用 `KY.classifier.fromQuestion()` 生成错题条目：
  `source` 标记为「老师布置的错题」，运营者的备注写进 `errorSummary`，并自动归类考点与错因。
- 同时下调对应考点的掌握度（−0.10），所以**这些题会立刻出现在她的推题里**。
- 已收下的记录存 `ky.v1.pushAdded`；重复收下会被跳过，不产生副本。
- 若某题的 `questionId` 在题库里找不到（例如运营者已删除），该条目被标记 `missing`，
  不会进错题本，并在界面上明确报出。

### 12.4 为什么是"推送"而不是"直接写进她的错题本"

她的错题本存在她自己浏览器里，运营者碰不到（不租服务器的必然结果）。
所以设计成"运营者发布清单 → 她一键收下"，收下之后数据完全归她自己管。
这一点在「运营台」页面上有明确说明，避免运营者误以为可以直接看/改她的错题本。

---

## 13. 共享资料库（`resources.shared.js` → `KY.sharedResources`）

### 13.1 为什么是链接而不是文件

GitHub 硬限制：**单个文件 100 MB**、仓库建议 < 1 GB、Pages 站点 1 GB，
且服务条款**禁止把仓库当大文件存储/CDN 用**。一集考研网课通常 300 MB ~ 1 GB，
一集就超限。所以资料库只存**网盘链接入口**，视频本体留在网盘。

### 13.2 结构

```js
KY.sharedResources = {
  updatedAt: '2025-06-01 15:30:15',
  note: '第一轮复习资料',
  items: [
    {
      id: 'r1a2b3',
      kind: 'video',              // video | doc | image | link
      title: '张宇高数基础班 第1讲 极限',
      subject: 'math1',           // 可为 ''（未分类）
      url: 'https://pan.baidu.com/s/1abc',
      code: 'abcd',               // 提取码，可为 ''
      provider: '百度网盘',        // 由链接自动识别
      duration: '45分钟',          // 展示用文本
      durationMin: 45,            // 分钟数，用于统计
      note: '先看这个',
      tags: []
    }
  ]
};

KY.sharedResourcesMeta = { builtAt, count, byKind, bySubject, source };
```

### 13.3 运营者手写的文本格式

```
# 数学一
视频 | 张宇高数基础班 第1讲 极限 | https://pan.baidu.com/s/1abc | 提取码: abcd | 45分钟 | 先看这个
文档 | 高数讲义 第一章 | https://pan.baidu.com/s/1def | 提取码: 1234

# 英语一
视频 | 唐迟阅读基础 | https://pan.quark.cn/s/xyz | 1小时20分
链接 | 考研数学公式大全 | https://example.com/formula
```

| 写法 | 含义 |
|---|---|
| `# 科目名` 或 `科目: 科目名` 单独一行 | 给后面所有条目设默认科目 |
| 每条一行，`\|` 分段 | 第一段可写类型（视频/文档/图片/链接），不写则按标题自动判断 |
| 含 `http(s)://` 的段 | 必填，就是资料链接；一行里只取第一个 |
| `提取码: xxxx` / `密码: xxxx` / `code:xxxx` | 自动识别提取码（也可以直接贴在链接后面） |
| `45分钟` / `1小时20分` | 自动识别时长并参与统计 |
| 其他段 | 拼成备注 |
| `//` 或 `;` 开头 | 注释，忽略 |

**网盘平台自动识别**（显示成标签，让她知道点进去是什么）：
百度网盘 / 阿里云盘 / 夸克网盘 / 天翼云盘 / 腾讯微云 / 移动云盘 / 蓝奏云 / 123云盘 /
迅雷云盘 / OneDrive / Google Drive / 坚果云 / 奶牛快传 / B站 / YouTube。

**硬错误必须报出，不静默丢弃**：某行没有 http(s) 链接 → 跳过并报错，
并告诉她"没写标题时用了域名兜底"、"认不出科目时归入未分类"。

### 13.4 使用者侧

- 按**科目分组**展示，可按科目/类型筛选、按关键词搜索；
- 提取码**点一下复制**；「复制链接和提取码」一键复制标题+链接+提取码；
- 顶部统计：总条数、各类型数量、视频总时长（小时）、覆盖科目数。

---

## 14. 访问口令门（`auth.shared.js` → `KY.sharedAuth`）

### 14.1 ⚠ 先说清楚它的强度

**它只能挡住"随手打开网址的人"（爬虫、误点链接的陌生人），挡不住会按 F12 的人。**

原因：纯静态网站没有服务端，验证逻辑全部在浏览器里跑、代码全部公开，
而且仓库是 Public，任何人都能下载源码。任何人都可以：
- 直接读代码找到校验逻辑；
- 在控制台手动设置 localStorage 里的令牌；
- 或者干脆绕过整个门（门只是个 DOM 覆盖层）。

**真正的访问控制需要服务端**，免费方案见 `部署说明.md`：
Cloudflare Pages + Cloudflare Access（邮箱验证码，真服务端鉴权），
或把仓库改成 Private（需要 GitHub Pro，付费）。

这条限制必须让运营者知道，不能让他以为"加了登录就安全了"。

### 14.2 结构

```js
KY.sharedAuth = {
  enabled: true,
  user: 'yxt123',
  salt: 'kaoyan-review-v1',
  passHash: '<sha256(user \\0 pass \\0 salt) 的十六进制>',
  title: '考研复习系统',
  hint: ''            // 登录框下面的提示语
};
```

**口令不存明文**，只存 `sha256(账号 + \u0000 + 口令 + \u0000 + 盐)`。
`src/services/auth.js` 自带一份同步 SHA-256 实现（不依赖 `crypto.subtle`，
这样 `file://` 直接打开也能用），并用标准测试向量在 `tools/smoke-test.js` 里验证正确性
（`""`、`"abc"`、`"考研"`、1000 个 `a`——含多分块 padding 与中文 UTF-8）。

### 14.3 令牌机制

登录成功后把 **`passHash` 本身**当作令牌存进 `localStorage`（勾"记住我"）
或 `sessionStorage`（不勾）。

这样设计的好处：**运营者一改口令，`passHash` 变了，所有人手里的旧令牌自动失效，
会被重新拦下**——不需要额外的过期或踢人逻辑。

### 14.4 已知的设计取舍

| 取舍 | 说明 |
|---|---|
| 令牌 = passHash | 简单、能自动失效；代价是拿到哈希的人（能读到源码）可以手工伪造令牌。反正门本身也挡不住这种人，所以不额外加复杂度 |
| 登录界面是覆盖层 | 应用在门后面已经初始化完毕。**没有任何私密数据因此在页面上暴露**（数据都在她自己的 localStorage 里），但如果你以后往里放敏感内容，必须换成服务端鉴权 |
| 没有"注册"功能 | 纯静态站点上的"注册"没有意义——任何人都能注册，等于没门。所以只提供固定账号+口令 |

---

## 8. 校验

运行 `node tools/validate.js` 会：

1. 检查所有题库的 `subject` / `module` / `knowledge` / `type` / `answer` 合法性；
2. 检查知识点 id 是否都存在于 taxonomy；
3. 检查套卷引用的题目 id 是否都存在；
4. 检查英语一真题题目是否都有 `video.query`；
5. 检查 id 全局唯一。

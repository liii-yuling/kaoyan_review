/*! bank.english1.js —— 英语一题库 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  KY.banks = KY.banks || {};

  KY.banks.english1 = [
    /* ================================================================== */
    /* 一、完形填空 en1.m.cloze                                            */
    /* ================================================================== */
    {
      id: 'en1-2019-cloze-gapyear',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stemHtml: '<p>Today, widespread social pressure to immediately go to college in conjunction with increasingly high expectations in a fast-moving world often causes students to completely overlook the possibility of taking a gap year. After all, if everyone you know is going to college in the fall, it seems silly to stay back a year, doesn\'t it? And after going to school for 12 years, it doesn\'t feel natural to spend a year doing something that isn\'t academic.</p><p>But while this may be true, it is not a good enough reason to condemn gap years. There is always a constant fear of falling behind everyone else on the socially perpetuated race to the finish line, <span style="text-decoration:underline">______</span> that finish line may be.</p>',
      stem: 'Today, widespread social pressure to immediately go to college often causes students to overlook the possibility of taking a gap year. But while this may be true, it is not a good enough reason to condemn gap years. There is always a constant fear of falling behind everyone else on the socially perpetuated race to the finish line, ______ that finish line may be.',
      options: [
        { key: 'A', text: 'wherever' },
        { key: 'B', text: 'whatever' },
        { key: 'C', text: 'whenever' },
        { key: 'D', text: 'however' }
      ],
      answer: ['B'],
      explanation: '空白处作 be 动词 may be 的表语，同时被句末的 that finish line 限定，需要一个既能作表语又能带名词性从句、表示"无论……是什么"的连接词。whatever 可引导让步状语从句并在从句中充当表语或定语，符合"无论终点线是什么"这一让步含义，故 B 正确。A wherever 表地点，与 finish line 无语义关联；C whenever 表时间；D however 后必须紧跟形容词或副词（如 however far that finish line may be），不能单独修饰名词，且此处不能被 however 直接修饰，故均排除。考点：让步状语从句连接词的语法选择 + 上下文语义。',
      knowledge: ['en1.p.cloze.logic', 'en1.p.grammar.clause'],
      difficulty: 4,
      source: '2019年考研英语一真题（完形填空）',
      year: 2019,
      tags: ['真题', '完形', '让步从句'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 让步状语从句 whatever 真题讲解' },
      score: 1
    },
    {
      id: 'en1-sim-cloze-01',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stemHtml: '<p>Forest bathing, or <em>shinrin-yoku</em>, has become a cornerstone of preventive health care in Japan and is increasingly being recognised elsewhere. Proponents claim that spending time among trees allows the body to relax and the mind to quieten. Researchers who <span style="text-decoration:underline">______</span> the practice have found that it can lower blood pressure, reduce stress hormones and improve mood.</p>',
      stem: 'Researchers who ______ the practice have found that it can lower blood pressure, reduce stress hormones and improve mood.',
      options: [
        { key: 'A', text: 'have studied' },
        { key: 'B', text: 'have been studied' },
        { key: 'C', text: 'studying at' },
        { key: 'D', text: 'are studying for' }
      ],
      answer: ['A'],
      explanation: '空格所在部分是一个由 who 引导的定语从句，先行词 researchers 与"研究"之间是主动关系，且主句谓语 have found 为现在完成时，从句可用现在完成时表示"迄今为止已做的研究"，故 A 正确。B 用被动语态，等于"研究者被研究"，逻辑不通；C studying at 后接机构名词，不能直接接 the practice（practice 指"这种做法"）；D are studying for 意为"为……而学习"，搭配与语义均不当。考点：定语从句中的语态判断与动词搭配。',
      knowledge: ['en1.p.cloze.context', 'en1.p.grammar.tense'],
      difficulty: 2,
      source: '考研英语一完形填空模拟题（真题风格）',
      tags: ['模拟题', '完形', '语态'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 定语从句 语态判断 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-cloze-02',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stem: 'Yet green space is not distributed evenly. City dwellers in low-income neighbourhoods often have far less access to parks than those in wealthier districts, ______ they face higher levels of air pollution and noise.',
      options: [
        { key: 'A', text: 'even though' },
        { key: 'B', text: 'as a result' },
        { key: 'C', text: 'for example' },
        { key: 'D', text: 'in contrast' }
      ],
      answer: ['A'],
      explanation: '前半句说低收入社区居民能使用的公园绿地"少得多"，后半句说他们同时面临更高的空气污染和噪音水平。两者是"劣势叠加"的让步—递进关系：即使/况且他们还面临另一重不利，空白处需要用表示让步的连词甚至强化这一对比，even though 引导让步状语从句，与后文并列的另一重不利形成"雪上加霜"的语义，故 A 最贴合篇章逻辑。B as a result 表因果，但"绿地少"并不是"污染高"的原因；C for example 表举例，后文不是前文的例证；D in contrast 表直接对立，而两句并非非此即彼的对立关系。考点：完形中的逻辑衔接与语义关系判断。',
      knowledge: ['en1.p.cloze.logic'],
      difficulty: 3,
      source: '考研英语一完形填空模拟题（真题风格）',
      tags: ['模拟题', '完形', '逻辑衔接'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 逻辑衔接 让步关系 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-cloze-03',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stem: 'Designing greener cities is not cheap. New parks must be built and maintained, and land in dense urban areas is expensive. ______, the long-term savings in public health spending may well outweigh the initial outlay.',
      options: [
        { key: 'A', text: 'Therefore' },
        { key: 'B', text: 'Nevertheless' },
        { key: 'C', text: 'Similarly' },
        { key: 'D', text: 'In addition' }
      ],
      answer: ['B'],
      explanation: '前两句强调"成本高、土地贵"，末句说"长期在公共卫生支出上的节省很可能超过初期投入"，语义由"不利/障碍"转向"有利/理由"，构成典型的转折，故 B Nevertheless（然而）正确。A Therefore 表结果，会把末句变成前文的结论，语义方向相反；C Similarly 表类比，前后并非同类并列；D In addition 表补充，无法体现"转折"这一核心逻辑。考点：段落内部的逻辑衔接与转折关系识别。',
      knowledge: ['en1.p.cloze.logic', 'en1.p.cloze.topic'],
      difficulty: 1,
      source: '考研英语一完形填空模拟题（真题风格）',
      tags: ['模拟题', '完形', '转折'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 转折逻辑 衔接词 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-cloze-04',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stem: 'Planners must therefore ______ the cost of maintaining green space against the health benefits it delivers, and only then decide where limited public money should go.',
      options: [
        { key: 'A', text: 'weigh' },
        { key: 'B', text: 'compare' },
        { key: 'C', text: 'measure' },
        { key: 'D', text: 'estimate' }
      ],
      answer: ['A'],
      explanation: '空格后是 the cost ... against the health benefits，构成 weigh A against B 这一固定搭配，意为"权衡、比较 A 与 B 的轻重"，与后半句"然后再决定有限公共资金投向何处"完全呼应，故 A 正确。B compare 的固定搭配是 compare A with/to B，后接 against 不合习惯；C measure 意为"测量"，宾语通常是具体的量，不能接 against 表示权衡；D estimate 意为"估算"，只涉及单向数值估计，无法体现"两面权衡"的含义。考点：动词与介词的固定搭配在完形中的辨析。',
      knowledge: ['en1.p.cloze.collocation', 'en1.p.word.collocation'],
      difficulty: 3,
      source: '考研英语一完形填空模拟题（真题风格）',
      tags: ['模拟题', '完形', '搭配'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 动词介词搭配 weigh against 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-cloze-05',
      subject: 'english1',
      module: 'en1.m.cloze',
      type: 'single',
      stem: 'The psychological benefits of urban greenery are also widely claimed but less firmly established, ______ because most studies rely on small samples and self-reported measures of well-being.',
      options: [
        { key: 'A', text: 'partly' },
        { key: 'B', text: 'hardly' },
        { key: 'C', text: 'never' },
        { key: 'D', text: 'instead' }
      ],
      answer: ['A'],
      explanation: '前半句说心理层面的益处"被广泛宣称但证据不够扎实"，后面 because 从句给出部分原因（样本小、依赖自评量表）。用 partly 表示"部分原因在于"，语气有保留，与 less firmly established 的谨慎口吻一致，故 A 正确。B hardly、C never 均为否定副词，会把 because 从句变成"几乎不因为"，前后因果不成立；D instead 表替代而非原因，与 because 冲突。考点：作者的谨慎态度与副词的语义色彩。',
      knowledge: ['en1.p.cloze.topic', 'en1.p.cloze.context'],
      difficulty: 3,
      source: '考研英语一完形填空模拟题（真题风格）',
      tags: ['模拟题', '完形', '态度色彩'],
      video: { bvid: '', title: '', query: '考研英语一 完形填空 态度色彩 副词辨析 讲解' },
      score: 1
    },

    /* ================================================================== */
    /* 二、阅读理解 Part A en1.m.reading                                   */
    /* ================================================================== */
    {
      id: 'en1-2013-read-01',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>Scientists have found that although we are prone to snap overreactions, if we take a moment and think about how we are likely to react, we can reduce or even eliminate the negative effects of our quick, hard-wired responses.</p><p>But snap decisions in reaction to rapid, even subliminal stimuli are not the exclusive preserve of the uninitiated. The best evidence for this is that we are hard-wired to react to immediate threats, but not to slow, cumulative dangers such as climate change: our ancestors could hardly have evolved a reflex for a threat that only materialises over decades.</p><p>Question: According to the author, why do humans tend to underreact to environmental problems such as climate change?</p>',
      stem: 'According to the author, why do humans tend to underreact to environmental problems such as climate change?',
      options: [
        { key: 'A', text: 'Because they are unable to understand the scientific evidence about such problems.' },
        { key: 'B', text: 'Because they are hard-wired to respond to immediate threats rather than slow, cumulative ones.' },
        { key: 'C', text: 'Because environmental problems are too abstract to be measured by scientists.' },
        { key: 'D', text: 'Because governments have failed to warn the public early enough.' }
      ],
      answer: ['B'],
      explanation: '文中明确指出 we are hard-wired to react to immediate threats, but not to slow, cumulative dangers such as climate change，即人类天生对即时威胁有反应机制，而对缓慢累积的危险缺乏这种本能反应，故 B 是对原文的同义转述。A 把"进化上缺乏反应机制"偷换成"看不懂科学证据"，原文未提及理解能力问题；C"太抽象而无法被科学家测量"属于无中生有，原文说的是人类反应机制而非测量问题；D 把原因归为政府预警不及时，原文完全未涉及政府行为。考点：事实细节题的同义替换与"偷换概念"型干扰项识别。',
      knowledge: ['en1.p.read.detail', 'en1.p.read.infer'],
      difficulty: 3,
      source: '2013年考研英语一真题（阅读理解 Text 3 改编）',
      year: 2013,
      tags: ['真题', '阅读', '细节题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 事实细节题 同义替换 真题讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-01',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>Habits, scientists say, emerge because the brain is constantly looking for ways to save effort. Left to its own devices, the brain will try to make almost any routine into a habit, because habits allow our minds to ramp down more often. This effort-saving instinct is a huge advantage. An efficient brain requires less energy, which leaves more room for other tasks.</p><p>The process works like this: first there is a cue, a trigger that tells your brain to go into automatic mode. Then there is the routine, which can be physical, mental or emotional. Finally, there is a reward, which helps your brain figure out whether this particular loop is worth remembering for the future.</p><p>Question: What is the main idea of the second paragraph?</p>',
      stem: 'What is the main idea of the second paragraph?',
      options: [
        { key: 'A', text: 'Habits are formed because the brain wants to save effort.' },
        { key: 'B', text: 'A habit loop consists of a cue, a routine and a reward.' },
        { key: 'C', text: 'Physical routines are harder to change than mental ones.' },
        { key: 'D', text: 'Rewards are the most important element of any habit.' }
      ],
      answer: ['B'],
      explanation: '第二段以 The process works like this 开头，随后依次介绍 cue（提示）、routine（惯常行为）、reward（奖励）三个环节，全段就是对该"习惯回路"的结构说明，故 B 准确概括段意。A 是全文第一段的观点（大脑为省力而形成习惯），不是第二段主旨；C 属于无中生有，原文只说 routine 可以是身体的、心理的或情绪的，并未比较改变难度；D 过度拔高 reward，原文只说奖励帮助大脑判断该回路是否值得记住，未说它是"最重要"的。考点：段落主旨题——抓段首主题句与并列结构。',
      knowledge: ['en1.p.read.main', 'en1.p.read.structure'],
      difficulty: 2,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '主旨题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 段落主旨题 主题句 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-02',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>For the past several decades, American colleges and universities have been asked to do more with less. State appropriations per student have fallen in most states, while demands for career preparation, mental-health services and remedial instruction have grown. Administrators have responded by enlarging classes, hiring more part-time instructors and trimming library budgets.</p><p>Question: The phrase "do more with less" (Paragraph 1) most probably means ______.</p>',
      stem: 'The phrase "do more with less" (Paragraph 1) most probably means ______.',
      options: [
        { key: 'A', text: 'offer better education while spending less money' },
        { key: 'B', text: 'enrol more students while hiring fewer teachers' },
        { key: 'C', text: 'accept more responsibilities with fewer resources' },
        { key: 'D', text: 'cut unnecessary courses while raising tuition' }
      ],
      answer: ['C'],
      explanation: '该短语后面用 while 引导的对比句作了展开：一方面州政府拨款下降（资源变少），另一方面对就业准备、心理健康服务、补习教学的需求增长（任务变多），因此 do more with less 指的是"以更少的资源承担更多的职责"，C 最全面。A 只强调"少花钱、办更好教育"，忽略"任务增多"这一半；B 把 more/less 窄化为"学生/教师"数量，是对字面的机械理解；D 完全背离原文，原文未提涨学费或砍课程，实际提到的削减对象是图书馆预算。考点：词义句意题——用上下文（尤其 while 对比结构）确定短语含义。',
      knowledge: ['en1.p.read.vocab', 'en1.p.read.long'],
      difficulty: 3,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '词义句意题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 词义句意题 上下文推断 讲解' },
      score: 2
    },
    {
      id: 'en1-2017-read-01',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stem: 'According to Paragraph 2, the modern American solar eclipse of 2017 was special because ______.',
      stemHtml: '<p>Directions: Read the following paragraph and choose the best answer.</p><p>In August 2017, a total solar eclipse swept across the United States from Oregon to South Carolina. Such eclipses are not rare in themselves, but this one was unusual: it was the first total eclipse whose path crossed only the United States, and the first to pass over the country from coast to coast since 1918. Millions of people travelled into the path of totality, and for a little over two minutes, day turned into night.</p><p>Question: According to the paragraph, the 2017 total solar eclipse was special because ______.</p>',
      options: [
        { key: 'A', text: 'total solar eclipses are extremely rare events' },
        { key: 'B', text: 'its path of totality crossed only the United States' },
        { key: 'C', text: 'it was the first eclipse ever observed by scientists' },
        { key: 'D', text: 'it lasted far longer than any previous eclipse' }
      ],
      answer: ['B'],
      explanation: '文中先用 Such eclipses are not rare in themselves 承认日全食本身并不罕见，随后用 but this one was unusual 引出特殊性：it was the first total eclipse whose path crossed only the United States，即首次出现"全食带只经过美国本土"的日全食，B 与之完全对应。A 与原文 not rare in themselves 直接相反；C"人类首次观测到的日食"属无中生有，原文只说是 1918 年以来首次横穿全国；D 讨论持续时间，原文仅说"两分多钟"，未与他次日食比较。考点：事实细节题——注意 but 转折后才是作者要强调的特殊性。',
      knowledge: ['en1.p.read.detail'],
      difficulty: 3,
      source: '2017年考研英语一真题（阅读理解 Part A 改编）',
      year: 2017,
      tags: ['真题', '阅读', '细节题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 细节题 转折强调 真题讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-03',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>What makes the current wave of automation different from earlier ones is not simply that machines can replace muscle, but that they increasingly replace judgement. Tasks once thought to require experience and intuition - screening loan applications, reading X-rays, drafting routine contracts - are now performed by algorithms that never tire and never complain. The result is a labour market that rewards a shrinking group of people who can design, supervise and correct those algorithms, while hollowing out the middle.</p><p>Question: What can be inferred from the last sentence of the passage?</p>',
      stem: 'What can be inferred from the last sentence of the passage?',
      options: [
        { key: 'A', text: 'Algorithms will eventually replace all white-collar workers.' },
        { key: 'B', text: 'Mid-level jobs are disappearing while a few highly skilled posts thrive.' },
        { key: 'C', text: 'Workers who complain about automation are more likely to be dismissed.' },
        { key: 'D', text: 'The labour market has become fairer because machines never tire.' }
      ],
      answer: ['B'],
      explanation: '末句说劳动力市场"奖励一小群能够设计、监督和修正算法的人（rewards a shrinking group）"，同时"掏空中间层（hollowing out the middle）"，即中等技能岗位萎缩、少数高技能岗位兴旺，B 是合理推断。A 把 hollowing out the middle 极端化为"取代所有白领"，range 过大；C 由 never complain 望文生义，说"抱怨的工人更易被解雇"，原文未建立该因果；D"市场更公平"与原文的"两极分化"倾向恰好相反。考点：推理判断题——避免绝对化与无据推断。',
      knowledge: ['en1.p.read.infer', 'en1.p.read.long'],
      difficulty: 4,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '推理题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 推理判断题 干扰项排除 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-04',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>Critics of the sharing economy argue that platforms such as ride-hailing apps have simply shifted risk from companies onto individuals: drivers bear the cost of the vehicle, the fuel and the downtime, yet enjoy none of the protections that come with employment. Defenders reply that flexibility is itself a benefit, and that many drivers value the freedom to choose their hours more than they value a pension. Both sides, however, tend to treat the arrangement as a single, uniform model, when in fact conditions vary enormously from city to city and from platform to platform.</p><p>Question: What is the author\'s attitude towards the debate described in the passage?</p>',
      stem: 'What is the author\'s attitude towards the debate described in the passage?',
      options: [
        { key: 'A', text: 'Strongly supportive of the critics.' },
        { key: 'B', text: 'Fully convinced by the defenders.' },
        { key: 'C', text: 'Detached, pointing out a shared flaw in both sides.' },
        { key: 'D', text: 'Indifferent, since the issue does not affect him.' }
      ],
      answer: ['C'],
      explanation: '作者先客观陈述批评者（风险转移）与辩护者（灵活性有价值）两种立场，末句用 Both sides, however, tend to treat the arrangement as a single, uniform model 指出双方共同的论证缺陷——把多样的现实当成单一模式，可见作者保持中立评述并点出问题，C 正确。A、B 都与 however 引出的批评相矛盾；D 说"漠不关心"，但作者显然在认真分析并作出评价，并非 indifferent。考点：态度观点题——关注 however、tend to 等评价性标记。',
      knowledge: ['en1.p.read.attitude', 'en1.p.read.structure'],
      difficulty: 4,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '态度题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 作者态度题 评价性词汇 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-05',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>The fashion industry produces roughly ten per cent of global carbon emissions, and the rise of "fast fashion" has shortened the average life of a garment dramatically. Campaigners have urged shoppers to buy less and mend more, but such appeals place the burden squarely on consumers. A more effective lever, several researchers argue, is to require brands to disclose the environmental cost of each item at the point of sale, since disclosure changes what companies choose to produce, not merely what shoppers choose to buy.</p><p>Question: Why do researchers consider disclosure at the point of sale a more effective lever?</p>',
      stem: 'Why do researchers consider disclosure at the point of sale a more effective lever?',
      options: [
        { key: 'A', text: 'Because it forces consumers to pay higher prices for clothes.' },
        { key: 'B', text: 'Because it changes what companies produce, not only what shoppers buy.' },
        { key: 'C', text: 'Because it makes fast fashion illegal in most countries.' },
        { key: 'D', text: 'Because it reduces the amount of clothing that consumers mend.' }
      ],
      answer: ['B'],
      explanation: '末句 because 从句明确给出理由：disclosure changes what companies choose to produce, not merely what shoppers choose to buy，即信息披露作用于生产端而不只是消费端，故 B 几乎是原文照搬。A 把"披露环境成本"曲解为"强制消费者付更高价格"；C"使快时尚违法"原文未提，属于无中生有且过度；D 因果颠倒且与 mending 无关，原文说倡导消费者"多修补"，并未说披露会减少修补量。考点：事实细节题——定位 because 因果标记。',
      knowledge: ['en1.p.read.detail'],
      difficulty: 2,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '细节题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 因果细节题 定位技巧 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-read-06',
      subject: 'english1',
      module: 'en1.m.reading',
      type: 'single',
      stemHtml: '<p>In recent years, governments have begun to treat loneliness not as private sorrow but as a public-health problem, appointing ministers for solitude and funding community cafés. The shift is welcome, yet it carries a risk: once loneliness is defined as a disease, the remedy is expected to be clinical. What the evidence actually supports is duller and cheaper - reliable transport, affordable housing and places where people may meet without spending money.</p><p>Question: What is the author\'s main point in this passage?</p>',
      stem: 'What is the author\'s main point in this passage?',
      options: [
        { key: 'A', text: 'Governments should stop funding community cafés.' },
        { key: 'B', text: 'Loneliness is best treated by medical professionals.' },
        { key: 'C', text: 'Framing loneliness as a disease may lead to the wrong remedies.' },
        { key: 'D', text: 'Affordable housing is too expensive for governments to provide.' }
      ],
      answer: ['C'],
      explanation: '作者先承认把孤独当作公共卫生问题是进步（The shift is welcome），随即用 yet 指出风险：一旦把它定义为疾病，人们就会期待临床式治疗方案，而证据支持的其实是交通、住房、免费公共空间等"乏味而便宜"的办法。可见主旨是批评"疾病化"框架可能导向错误药方，C 正确。A 过度推论，作者并未主张取消资助咖啡馆；B 与作者观点相反；D 原文只说这些措施 dull 且 cheaper，并未说政府承担不起。考点：主旨大意题——抓 yet 转折后的作者立场。',
      knowledge: ['en1.p.read.main', 'en1.p.read.attitude'],
      difficulty: 4,
      source: '考研英语一阅读理解模拟题（真题风格）',
      tags: ['模拟题', '阅读', '主旨题'],
      video: { bvid: '', title: '', query: '考研英语一 阅读理解 主旨大意题 转折词 讲解' },
      score: 2
    },

    /* ================================================================== */
    /* 三、新题型 Part B en1.m.newtype                                     */
    /* ================================================================== */
    {
      id: 'en1-sim-new-01',
      subject: 'english1',
      module: 'en1.m.newtype',
      type: 'single',
      stemHtml: '<p>Directions: Read the following text and choose the best sentence from the list A-G to fill each of the numbered blanks. <strong>(41) ______</strong></p><p>Reading a research paper is not the same as reading a novel, and it should not be attempted in the same way. ______ Instead, read the abstract, then the conclusion, and only then decide whether the methods section deserves your attention. Most papers are written to survive peer review rather than to be read from beginning to end, and their structure reflects that purpose.</p>',
      stem: 'Reading a research paper is not the same as reading a novel, and it should not be attempted in the same way. ______ Instead, read the abstract, then the conclusion, and only then decide whether the methods section deserves your attention.',
      options: [
        { key: 'A', text: 'Do not start at the first line of the introduction and plough straight through.' },
        { key: 'B', text: 'Novels, by contrast, are usually read in a single sitting.' },
        { key: 'C', text: 'Peer review is a process that few researchers enjoy.' },
        { key: 'D', text: 'The methods section is often the longest part of a paper.' },
        { key: 'E', text: 'This is why so many students give up on academic reading altogether.' },
        { key: 'F', text: 'Journals also differ greatly in their acceptance rates.' },
        { key: 'G', text: 'Statistical training, however, remains essential for any reader.' }
      ],
      answer: ['A'],
      explanation: '空格后一句以 Instead 开头，说明空格处必须提出一个"被否定的做法"，Instead 才有所指。A 项用否定祈使句 Do not start at the first line ... and plough straight through（不要从引言第一行一路硬读到底），恰好被后面的 Instead, read the abstract, then the conclusion 所否定并替代，衔接最紧密。B 重述上文"小说"话题但没有提出可被 Instead 否定的做法；C、F 谈论同行评审与期刊接受率，与本段"阅读顺序"主题无关；D 是方法部分的常识性补充，无法与 Instead 构成对照；E 的 This is why 需要前文已陈述一个"原因"，逻辑不通；G 引入统计训练，属新话题。考点：七选五中的逻辑衔接词（Instead）与承上启下。',
      knowledge: ['en1.p.new.seven', 'en1.p.new.cohesion'],
      difficulty: 5,
      source: '考研英语一新题型七选五模拟题（真题风格）',
      tags: ['模拟题', '新题型', '七选五'],
      video: { bvid: '', title: '', query: '考研英语一 新题型 七选五 逻辑衔接词 Instead 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-new-02',
      subject: 'english1',
      module: 'en1.m.newtype',
      type: 'single',
      stemHtml: '<p>Directions: The following paragraphs form a text, but the order is scrambled. Choose the correct order of the paragraphs.</p><p>[A] These early experiments, however, were expensive and unreliable, and few laboratories outside a handful of wealthy universities could repeat them.</p><p>[B] By the 1980s the technique had been simplified to such a degree that a trained undergraduate could perform it in an afternoon.</p><p>[C] When the method was first described in 1975, it was regarded as a curiosity rather than a revolution.</p><p>[D] The result was a decade of limited progress, during which discoveries depended less on ideas than on access to equipment.</p><p>[E] That democratisation, in turn, explains why the number of publications in the field exploded after 1990.</p>',
      stem: 'Which of the following is the correct order of the paragraphs?',
      options: [
        { key: 'A', text: 'C - A - D - B - E' },
        { key: 'B', text: 'C - D - A - B - E' },
        { key: 'C', text: 'A - C - B - D - E' },
        { key: 'D', text: 'C - A - B - D - E' }
      ],
      answer: ['A'],
      explanation: '通篇按时间与逻辑推进：C 用 When the method was first described in 1975 引入起点；A 用 These early experiments 指代 C 中的初始方法，并指出其昂贵、难以重复；D 用 The result was a decade of limited progress 承接 A 的"难以重复"给出后果；B 用 By the 1980s 把时间推进到技术简化普及；E 用 That democratisation 指代 B 中"人人可做"的普及化，并给出 1990 年后论文激增的结果。因此顺序为 C-A-D-B-E，选 A。B 项把 D 置于 A 前，The result 失去指代对象；C、D 项开头 A 之前无所指代的 These early experiments，指代断裂。考点：排序题——依靠时间标记与指代（These / The result / That democratisation）构建链条。',
      knowledge: ['en1.p.new.order', 'en1.p.new.cohesion'],
      difficulty: 4,
      source: '考研英语一新题型排序题模拟题（真题风格）',
      tags: ['模拟题', '新题型', '排序'],
      video: { bvid: '', title: '', query: '考研英语一 新题型 排序题 指代与时间线 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-new-03',
      subject: 'english1',
      module: 'en1.m.newtype',
      type: 'single',
      stemHtml: '<p>Directions: Match each numbered paragraph with the best heading from the list A-E.</p><p><strong>Paragraph (43):</strong> Teams that write down, at the end of every week, one thing that went wrong and one thing that went well, and then discuss both without assigning blame, tend to improve faster than teams that wait for the annual review. The value lies in the frequency and the safety of the conversation, not in the sophistication of the form.</p>',
      stem: 'Which heading best matches Paragraph (43)?',
      options: [
        { key: 'A', text: 'Why annual reviews take too long' },
        { key: 'B', text: 'Frequent, blame-free reflection speeds up improvement' },
        { key: 'C', text: 'The importance of sophisticated reporting forms' },
        { key: 'D', text: 'How to assign blame fairly within a team' },
        { key: 'E', text: 'The declining popularity of teamwork' }
      ],
      answer: ['B'],
      explanation: '该段的核心信息是：每周记录一好一坏、不作指责地讨论的团队进步更快，且价值在于"频率"与"安全感"而非表格的精巧。B 项"频繁且不追责的反思加速改进"完整覆盖了这两个要点，故正确。A 只抓到 annual review 这一对比项，把细节当主旨；C 与段末"不在表格精巧"直接矛盾；D 与 without assigning blame 相反；E 凭空捏造"团队合作日渐式微"。考点：小标题匹配——排除以偏概全与语义相反的标题。',
      knowledge: ['en1.p.new.heading', 'en1.p.new.cohesion'],
      difficulty: 3,
      source: '考研英语一小标题匹配模拟题（真题风格）',
      tags: ['模拟题', '新题型', '小标题'],
      video: { bvid: '', title: '', query: '考研英语一 新题型 小标题匹配 概括主旨 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-new-04',
      subject: 'english1',
      module: 'en1.m.newtype',
      type: 'single',
      stemHtml: '<p>Directions: Choose the best sentence from the list A-F to fill the blank. <strong>(44) ______</strong></p><p>Urban trees cool the air, absorb rainwater and shelter birds, and city governments increasingly cite these services when justifying planting programmes. ______ A park that is pleasant to walk through at noon in July will be used, and a park that is not will be abandoned, whatever its ecological statistics may say.</p>',
      stem: 'Urban trees cool the air, absorb rainwater and shelter birds ... ______ A park that is pleasant to walk through at noon in July will be used, and a park that is not will be abandoned, whatever its ecological statistics may say.',
      options: [
        { key: 'A', text: 'Yet the service people value most is often the simplest: shade.' },
        { key: 'B', text: 'Rainwater absorption is difficult to measure accurately.' },
        { key: 'C', text: 'Birds are therefore the best indicator of urban biodiversity.' },
        { key: 'D', text: 'Planting programmes are expensive and slow to deliver results.' },
        { key: 'E', text: 'Ecological statistics are frequently exaggerated by campaigners.' },
        { key: 'F', text: 'Few city governments have departments of urban forestry.' }
      ],
      answer: ['A'],
      explanation: '空格前一句列举树木的生态服务（降温、蓄水、庇护鸟类），空格后一句以"在七月正午走起来舒服的公园才会被人使用"说明"舒适体验"决定成败。A 项用 Yet 转折，指出人们最看重的服务其实最简单——遮阴（shade），随后用"正午七月"的例子具体说明遮阴带来的体感舒适，衔接自然且构成"生态功能 → 人的直观感受"的推进。B、C、D、F 都停留在生态或行政细节，无法与后文"是否宜人→是否被使用"的论证连接；E 讨论统计数字被夸大，虽然后文提到 statistics，但后文是用它作让步（whatever its ecological statistics may say），并非在质疑统计的真实性。考点：七选五中的词汇复现与"抽象—具体"衔接。',
      knowledge: ['en1.p.new.seven', 'en1.p.new.cohesion'],
      difficulty: 4,
      source: '考研英语一新题型七选五模拟题（真题风格）',
      tags: ['模拟题', '新题型', '七选五'],
      video: { bvid: '', title: '', query: '考研英语一 新题型 七选五 词汇复现 讲解' },
      score: 2
    },
    {
      id: 'en1-sim-new-05',
      subject: 'english1',
      module: 'en1.m.newtype',
      type: 'single',
      stemHtml: '<p>Directions: Match each numbered paragraph with the best heading from the list A-E.</p><p><strong>Paragraph (45):</strong> Between 1900 and 1970, more than six million black Americans left the rural South for cities in the North and West. They were pushed by the collapse of the cotton economy and pulled by the promise of industrial wages, and they carried with them churches, recipes and musical forms that would reshape the culture of the cities they entered.</p>',
      stem: 'Which heading best matches Paragraph (45)?',
      options: [
        { key: 'A', text: 'The collapse of the cotton economy' },
        { key: 'B', text: 'A great migration and its cultural consequences' },
        { key: 'C', text: 'Why northern cities declined after 1970' },
        { key: 'D', text: 'The history of American church music' },
        { key: 'E', text: 'Industrial wages in the early twentieth century' }
      ],
      answer: ['B'],
      explanation: '该段包含两大信息块：一是 1900—1970 年间六百多万黑人从南方农村迁往北方和西部城市及其推力/拉力（大迁徙本身）；二是移民把教会、饮食与音乐形式带到新城市并重塑当地文化（文化后果）。B 项"一场大迁徙及其文化后果"准确覆盖全部内容，故正确。A、E 各只截取一个细节（棉花经济崩溃、工业工资），属于以偏概全；C 把时间与趋势搞错，原文止于 1970 且不谈北方衰落；D 只抓住 musical/church 这一局部，且脱离"迁徙"主题。考点：小标题匹配——用"主题＋结果"的双要素检验标题覆盖度。',
      knowledge: ['en1.p.new.heading'],
      difficulty: 3,
      source: '考研英语一小标题匹配模拟题（真题风格）',
      tags: ['模拟题', '新题型', '小标题'],
      video: { bvid: '', title: '', query: '考研英语一 新题型 小标题匹配 以偏概全干扰项 讲解' },
      score: 2
    },

    /* ================================================================== */
    /* 四、翻译 Part C en1.m.translation                                   */
    /* ================================================================== */
    {
      id: 'en1-2015-trans-01',
      subject: 'english1',
      module: 'en1.m.translation',
      type: 'subjective',
      stem: 'Translate the following sentence into Chinese. Write your translation on the answer sheet.',
      stemHtml: '<p>Translate the following sentence into Chinese:</p><p><em>This movement, driven by powerful and diverse motivations, built a nation out of a wilderness and, by its nature, shaped the character and destiny of an uncharted continent.</em></p>',
      options: [],
      answer: [
        '这一迁移运动，受多种强大动机的驱使，在荒野之上建起了一个国家，并且从根本上塑造了这片未知大陆的国民性格与历史命运。',
        '参考要点：driven by powerful and diverse motivations 为过去分词短语作后置定语，宜译为"受到多种强大动机的驱使/推动"，并前置或插在主语之后。',
        '参考要点：built a nation out of a wilderness 中的 out of 表"从……中/在……之上"，译作"在荒野上建立起一个国家"。',
        '参考要点：by its nature 意为"就其本质而言、从根本上"，不可直译为"被它的自然"。',
        '参考要点：uncharted continent 译"未知的/未被绘制于地图上的大陆"；character and destiny 建议译为"性格与命运"，与"大陆"搭配时可引申为"国民性格与历史命运"。'
      ],
      rubric: [
        { point: '正确识别 driven by ... 为后置定语并译为"受……驱使/推动"', score: 2 },
        { point: '正确处理 out of a wilderness，译为"在荒野上/从荒野中建立国家"', score: 2 },
        { point: 'by its nature 译为"就其本质而言/从根本上"', score: 2 },
        { point: 'uncharted continent 与 character and destiny 词义准确、搭配通顺', score: 2 },
        { point: '全句汉语通顺，无欧化长句与硬译痕迹', score: 2 }
      ],
      explanation: '本句主干为 This movement built a nation ... and shaped the character and destiny，两个并列谓语由 and 连接。难点有三：其一，driven by powerful and diverse motivations 是插入的过去分词短语作后置定语，修饰 This movement，汉语宜用"受……的驱使"这类状语式表达或短句处理；其二，built a nation out of a wilderness 的 out of 表示"从……之中、以……为材料"，不能译成"建立国家出自荒野"；其三，by its nature 是固定短语，意为"就其本质而言"，若按字面译为"由其自然"则语义不通。翻译时应先摘出主干、再逐层安置修饰成分，最后按汉语习惯调整语序。考点：句子结构拆分 + 定语的处理 + 词义引申。',
      knowledge: ['en1.p.trans.structure', 'en1.p.trans.attributive', 'en1.p.grammar.nonfinite'],
      difficulty: 4,
      source: '2015年考研英语一真题（翻译 Part C，第 46 题）',
      year: 2015,
      tags: ['真题', '翻译', '分词作定语'],
      video: { bvid: '', title: '', query: '考研英语一 翻译 分词后置定语 结构拆分 真题讲解' },
      score: 10
    },
    {
      id: 'en1-sim-trans-01',
      subject: 'english1',
      module: 'en1.m.translation',
      type: 'subjective',
      stem: 'Translate the following sentence into Chinese.',
      stemHtml: '<p>Translate the following sentence into Chinese:</p><p><em>It is widely assumed that the benefits of technological change are distributed automatically, but the historical record suggests that they are in fact granted only after prolonged and often bitter negotiation.</em></p>',
      options: [],
      answer: [
        '人们普遍认为，技术变革带来的好处会自动分配到每个人手中；然而历史记录表明，这些好处实际上只有在经历漫长而往往激烈的博弈之后才会被给予。',
        '参考要点：It is widely assumed that ... 为形式主语句，宜译成汉语的无主句或增补泛指主语，如"人们普遍认为……"。',
        '参考要点：the benefits of technological change 译为"技术变革的好处/益处"，avoid 生硬的"技术变化的好处们"。',
        '参考要点：but 表转折，译为"然而/但是"；the historical record suggests that 译"历史记录表明"。',
        '参考要点：they are in fact granted only after ... 是被动语态，汉语宜转为主动或"得到/被给予"式表达。',
        '参考要点：prolonged and often bitter negotiation 引申为"漫长且往往激烈的博弈/谈判"，比直译"苦涩的协商"更符合汉语表达。'
      ],
      rubric: [
        { point: 'It is widely assumed that ... 正确译为汉语无主句或增补泛指主语', score: 3 },
        { point: '被动语态 they are granted 处理为汉语通顺的主动或"得到"式表达', score: 3 },
        { point: 'prolonged and often bitter negotiation 词义准确、表达自然', score: 2 },
        { point: '转折关系与全句逻辑层次清晰', score: 2 }
      ],
      explanation: '全句由 but 连接的两个分句构成。前一分句是形式主语句 It is widely assumed that ...，翻译时应把真正主语从句提前，用"人们普遍认为"这种汉语无主句处理，避免"它被广泛地认为"。后一分句宾语从句中 they are granted 是被动语态，英语的被动在汉语里常需转为主动或"得到……"的表达，否则"它们被给予"十分生硬。此外 prolonged and often bitter negotiation 若直译为"延长的和常常苦涩的协商"不符合汉语搭配，应引申为"漫长而往往激烈的博弈/谈判"。考点：被动语态与无主句处理 + 词义引申与汉语表达。',
      knowledge: ['en1.p.trans.passive', 'en1.p.trans.expression'],
      difficulty: 4,
      source: '考研英语一翻译模拟题（真题风格）',
      tags: ['模拟题', '翻译', '形式主语', '被动语态'],
      video: { bvid: '', title: '', query: '考研英语一 翻译 形式主语 被动语态 处理技巧 讲解' },
      score: 10
    },
    {
      id: 'en1-sim-trans-02',
      subject: 'english1',
      module: 'en1.m.translation',
      type: 'subjective',
      stem: 'Translate the following sentence into Chinese.',
      stemHtml: '<p>Translate the following sentence into Chinese:</p><p><em>Scientists who study the deep ocean, where pressure crushes ordinary instruments and light never reaches, must design machines that can work unattended for years.</em></p>',
      options: [],
      answer: [
        '研究深海的科学家必须设计出能够连续数年无人看管地工作的机器，因为在深海中，压力会压碎普通仪器，光线也永远无法到达。',
        '参考要点：who study the deep ocean 为定语从句，修饰 Scientists，汉语宜前置译为"研究深海的科学家"。',
        '参考要点：where pressure crushes ordinary instruments and light never reaches 是修饰 the deep ocean 的非限制性定语从句，因信息量大，宜拆分为独立的说明性小句，并用"因为/在那里"衔接。',
        '参考要点：pressure crushes ordinary instruments 译"压力会压碎普通仪器"，crushes 用其本义"压碎、压坏"。',
        '参考要点：must design machines that can work unattended for years 译"必须设计出能够常年无人值守地工作的机器"，unattended 引申为"无人看管/无人值守"。'
      ],
      rubric: [
        { point: '识别 who 引导的限制性定语从句并恰当前置', score: 3 },
        { point: '把 where 从句拆分为独立小句，语序与衔接自然', score: 3 },
        { point: 'crushes、unattended 等关键词词义准确', score: 2 },
        { point: '全句符合汉语科技语体，无修饰成分堆叠', score: 2 }
      ],
      explanation: '本句主干是 Scientists must design machines。难点在于两个定语从句层层嵌套：who study the deep ocean 限制修饰 Scientists，而 where pressure crushes ordinary instruments and light never reaches 又修饰 the deep ocean，使主语部分很长。汉语习惯把短定语前置（"研究深海的科学家"），而 where 从句信息量大且含两个并列小句，宜拆出来单独成句，译作"因为在深海中，压力会压碎普通仪器，光线也永远无法到达"。宾语后的 that can work unattended for years 同样是定语从句，可前置为"能够常年无人值守地工作的机器"。考点：句子结构拆分 + 定语的处理与语序调整。',
      knowledge: ['en1.p.trans.structure', 'en1.p.trans.attributive'],
      difficulty: 4,
      source: '考研英语一翻译模拟题（真题风格）',
      tags: ['模拟题', '翻译', '嵌套定语从句'],
      video: { bvid: '', title: '', query: '考研英语一 翻译 嵌套定语从句 拆分重组 讲解' },
      score: 10
    },
    {
      id: 'en1-sim-trans-03',
      subject: 'english1',
      module: 'en1.m.translation',
      type: 'subjective',
      stem: 'Translate the following sentence into Chinese.',
      stemHtml: '<p>Translate the following sentence into Chinese:</p><p><em>Social media, it is often said, has made us simultaneously more connected and more isolated; whether the first half of that claim is true is far less certain than the second.</em></p>',
      options: [],
      answer: [
        '人们常说，社交媒体使我们在联系更紧密的同时也更加孤立；这一说法中前半部分的真实性远不如后半部分那么确定。',
        '参考要点：it is often said 为插入语，可提到句首译为"人们常说"。',
        '参考要点：simultaneously more connected and more isolated 译"在联系更紧密的同时更加孤立"，simultaneously 表"同时"。',
        '参考要点：whether the first half of that claim is true 为主语从句，译"这一说法中前半部分是否/其真实性"，注意不能译为疑问句语序。',
        '参考要点：far less certain than the second 是比較结构，译"远不如后半部分那么确定"，需补出比较对象（后半部分）。'
      ],
      rubric: [
        { point: '正确识别插入语 it is often said 并置于句首', score: 2 },
        { point: 'whether 主语从句译为名词性成分而非疑问句', score: 3 },
        { point: '比较结构 far less certain than the second 比较对象补充完整', score: 3 },
        { point: 'simultaneously 与 connected/isolated 对举关系译出', score: 2 }
      ],
      explanation: '分号前是简单句，其中 it is often said 是插入语，翻译时移到句首最自然。分号后是一个复合句，主语为 whether the first half of that claim is true 这一主语从句；汉语不能保留英文的疑问语序作主语，需转成"这一说法前半部分的真实性"这样的名词短语。句末是 far less certain than the second 的比较结构，the second 指代 the second half of the claim，翻译必须补出"后半部分"才完整。考点：句子结构拆分 + 比较结构与主语从句的汉语转换。',
      knowledge: ['en1.p.trans.structure', 'en1.p.trans.expression'],
      difficulty: 4,
      source: '考研英语一翻译模拟题（真题风格）',
      tags: ['模拟题', '翻译', '主语从句'],
      video: { bvid: '', title: '', query: '考研英语一 翻译 主语从句 比较结构 讲解' },
      score: 10
    },

    /* ================================================================== */
    /* 五、写作 en1.m.writing                                              */
    /* ================================================================== */
    {
      id: 'en1-sim-writ-01',
      subject: 'english1',
      module: 'en1.m.writing',
      type: 'subjective',
      stem: 'Directions: Your friend Li Ming has asked you to recommend a book that helped you during your preparation for the postgraduate entrance examination. Write a letter of about 100 words to him. Do not sign your own name at the end of the letter; use "Li Hua" instead.',
      stemHtml: '<p><strong>Part A (10 points)</strong></p><p>Directions: Your friend Li Ming has asked you to recommend a book that helped you most during your preparation for the postgraduate entrance examination. Write him a letter of about 100 words. Do not sign your own name at the end of the letter; use "Li Hua" instead.</p>',
      options: [],
      answer: [
        'Dear Li Ming,',
        'I am glad to hear that you are preparing for the postgraduate entrance examination, and I am happy to recommend a book that helped me a great deal last year.',
        'The book is The Craft of Reading, a short collection of essays on how to read argumentative writing. What makes it worth your time is that it does not merely list reading skills; it shows you, step by step, how a writer builds an argument, which is exactly what the reading section tests. I read one chapter every evening and found that my speed and accuracy improved within a month.',
        'If you like, I can lend you my copy, and we can discuss one chapter a week.',
        'Yours sincerely,',
        'Li Hua'
      ],
      rubric: [
        { point: '书信格式完整：称呼 Dear Li Ming、正文、结束语 Yours sincerely、落款 Li Hua', score: 2 },
        { point: '首段点明写信目的（推荐一本书）并完成必要的寒暄', score: 2 },
        { point: '主体段给出书名/类型与两条具体理由（内容特点 + 自身使用效果）', score: 3 },
        { point: '语气得体友好，符合朋友间书信的语域', score: 1 },
        { point: '语言准确，句式有一定变化，无明显语法与拼写错误', score: 2 }
      ],
      explanation: '本题考查应用文中的推荐信。写作要点：①格式正确，私人朋友间的推荐信语气可以亲切，结束语用 Yours sincerely 或 Best wishes 均可；②首段开门见山说明写信目的；③主体段必须给出具体理由，推荐理由最好"一虚一实"——书的独特之处（shows how a writer builds an argument）加自己的使用体验（读一个月后阅读速度与正确率提高），这样才具体可信，避免空泛的 It is very useful；④结尾提出后续建议（借书、每周讨论一章），使书信有互动感。语言上注意 recommend sb sth / be worth your time / improve within a month 等地道表达，并避免中式英语如 I very like this book。考点：应用文书信格式与语气 + 论证展开与例证。',
      knowledge: ['en1.p.writ.letter', 'en1.p.writ.argument'],
      difficulty: 3,
      source: '考研英语一应用文写作模拟题（真题风格）',
      tags: ['模拟题', '写作', '应用文', '推荐信'],
      video: { bvid: '', title: '', query: '考研英语一 小作文 推荐信 模板与亮点句 讲解' },
      score: 10
    },
    {
      id: 'en1-sim-writ-02',
      subject: 'english1',
      module: 'en1.m.writing',
      type: 'subjective',
      stem: 'Directions: Write an essay of 160-200 words based on the following description. In your essay, you should (1) describe the picture briefly, (2) interpret its intended meaning, and (3) give your comments.',
      stemHtml: '<p><strong>Part B (20 points)</strong></p><p>Directions: Write an essay of 160-200 words based on the following description.</p><p>In the picture, a young man sits at a desk piled high with unopened books and course materials he has downloaded over the past year. He is busy taking a photograph of the pile to post online with the caption "Starting today!" On the wall behind him hangs a chart on which only the first two days of a 100-day plan have been ticked.</p><p>In your essay, you should (1) describe the picture briefly, (2) interpret its intended meaning, and (3) give your comments.</p>',
      options: [],
      answer: [
        '描述要点：画面中一位年轻人坐在书桌前，桌上堆满一年来下载却从未翻开的书籍与资料；他正忙着为这堆书拍照发到网上，配文"从今天开始"；墙上贴着百天计划表，却只有前两天被打了勾。',
        '寓意要点：图画讽刺了"以宣告代替行动"的现象——收集资料、发布宣言带来的心理满足，常常替代了真正的学习与坚持；准备工作的仪式感掩盖了行动的缺席。',
        '评论要点一（危害）：把计划公开化会带来虚假的成就感，使人误以为已经取得进展；只囤积不消化，最终一无所获。',
        '评论要点二（原因）：社交平台的点赞机制奖励表态而非结果；人也容易用"明天开始"来缓解当下的焦虑。',
        '评论要点三（建议）：把目标拆成小到可以立刻执行的一步，先完成再宣告；用可记录的过程（如每天的实际时数）代替宏大的计划表。',
        '范文框架：第一段用两句话客观描图（人物、动作、关键细节 caption 与 chart 的对比）；第二段点明寓意并展开一到两条分析，可用 the picture satirises / what the drawing really exposes 等句式；第三段给出评论与建议，用 To begin with / Worse still / Therefore 组织，结尾回到"行动优于宣言"。'
      ],
      rubric: [
        { point: '第一段简要描述图画，抓住"堆书拍照"与"计划表只勾两天"两个关键细节', score: 4 },
        { point: '第二段准确提炼寓意（以宣告代替行动、囤积代替消化）', score: 5 },
        { point: '第三段评论有层次，含原因或危害分析并给出建议', score: 5 },
        { point: '篇章连贯，恰当使用过渡词与指代', score: 3 },
        { point: '语言准确、句式多样，词汇有亮点，无明显语法错误', score: 3 }
      ],
      explanation: '本题为图画作文。写作三步走：描述—释义—评论。描述图画时不要逐笔罗列，只需抓住两个对比性细节（为书堆拍照配文"从今天开始"；百天计划只勾了两天），这一对比本身就暗含讽刺，为第二段的释义做好铺垫。释义要落到抽象命题上——"以宣告代替行动""囤积材料替代真正消化"，切忌仅复述画面。评论段是全篇得分重点，应至少包含一个原因分析（社交平台的点赞机制奖励表态）和一个后果分析（虚假成就感使人停滞），再给出可操作的建议（把目标拆到立即可做的一步）。语言上注意使用非谓语与名词性从句提升句式多样性，并避免只会用 very important、more and more 之类空泛表达。考点：图画描述与寓意提炼 + 论证展开与例证 + 篇章连贯。',
      knowledge: ['en1.p.writ.picture', 'en1.p.writ.argument'],
      difficulty: 5,
      source: '考研英语一图画作文模拟题（真题风格）',
      tags: ['模拟题', '写作', '大作文', '图画作文'],
      video: { bvid: '', title: '', query: '考研英语一 大作文 图画作文 三段式 范文讲解' },
      score: 20
    },
    {
      id: 'en1-sim-writ-03',
      subject: 'english1',
      module: 'en1.m.writing',
      type: 'subjective',
      stem: 'Directions: Suppose your university library plans to reduce its opening hours because of budget cuts. Write a letter of about 100 words to the library director, stating your concerns and suggesting one or two alternatives to the reduction. Do not sign your own name; use "Li Hua" instead.',
      stemHtml: '<p><strong>Part A (10 points)</strong></p><p>Directions: Suppose your university library plans to cut its opening hours because of budget cuts. Write a letter of about 100 words to the library director, stating your concerns and suggesting one or two alternatives. Do not use your own name; use "Li Hua" instead.</p>',
      options: [],
      answer: [
        'Dear Director,',
        'I am writing as a regular user of the university library to express my concern about the plan to shorten its opening hours.',
        'The library is the only quiet place on campus where students can study after nine in the evening, and many of us rely on it during the examination period. Rather than cutting the hours, I would suggest two alternatives: first, keeping the reading rooms open later while closing the service desk earlier; second, recruiting student assistants, whose wages would cost far less than extending staff shifts.',
        'I would be grateful if you could consider these suggestions, and I am willing to help collect signatures from fellow students.',
        'Yours sincerely,',
        'Li Hua'
      ],
      rubric: [
        { point: '格式规范：称呼、正文、结束语、落款齐全且得体', score: 2 },
        { point: '首段明确说明写信身份与目的（对缩短开馆时间表示关切）', score: 2 },
        { point: '给出具体理由（晚间自习需求、考试周依赖）', score: 2 },
        { point: '提出一至两条可行的替代方案，且方案具体、与预算问题对应', score: 3 },
        { point: '语气礼貌、措辞正式，语言准确无明显错误', score: 1 }
      ],
      explanation: '本题为正式的建议/投诉类书信。写作要点：①身份与目的句要清晰（I am writing as a regular user ... to express my concern about ...）；②表达关切时必须给出具体理由，否则显得无理取闹，本范文用"图书馆是晚九点后校园里唯一安静的学习场所"和"考试周高度依赖"两条支撑；③替代方案要与"预算削减"这一根因对应才有说服力——缩短服务台时间而保留阅览室、聘用学生助理以降低人工成本，都是"少花钱但保住功能"的思路；④结尾礼貌提出跟进意愿，符合正式书信的得体语气。注意避免情绪化指责，正式书信中不宜使用 I strongly protest 之类过激表达。考点：应用文书信格式与语气 + 论证展开与例证。',
      knowledge: ['en1.p.writ.letter', 'en1.p.writ.argument'],
      difficulty: 3,
      source: '考研英语一应用文写作模拟题（真题风格）',
      tags: ['模拟题', '写作', '应用文', '建议信'],
      video: { bvid: '', title: '', query: '考研英语一 小作文 建议信 正式语气 讲解' },
      score: 10
    },

    /* ================================================================== */
    /* 六、词汇与语法基础 en1.m.vocab                                      */
    /* ================================================================== */
    {
      id: 'en1-sim-vocab-01',
      subject: 'english1',
      module: 'en1.m.vocab',
      type: 'single',
      stem: 'The new regulations will ______ all companies that handle personal data to regular inspections, whether they are based at home or abroad.',
      options: [
        { key: 'A', text: 'subject' },
        { key: 'B', text: 'submit' },
        { key: 'C', text: 'subscribe' },
        { key: 'D', text: 'subordinate' }
      ],
      answer: ['A'],
      explanation: '此处考查 subject sb/sth to sth 这一固定搭配，意为"使……受到、使……服从"，subject all companies to regular inspections 即"使所有公司接受定期检查"，语态与搭配都成立，故 A 正确。B submit 意为"提交、屈服"，常用 submit to（不及物，主语自身屈服）或 submit sth to sb（把某物提交给某人），不能构成 submit sb to sth 的"使役"结构；C subscribe 意为"订阅、赞同"，与 inspections 无语义关联；D subordinate 意为"使处于次要地位"，subordinate sth to sth 指"使某事从属于另一事"，与"接受检查"含义不符。考点：固定搭配与短语动词在单句中的辨析。',
      knowledge: ['en1.p.word.collocation'],
      difficulty: 3,
      source: '考研英语一词汇语法模拟题（真题风格）',
      tags: ['模拟题', '词汇', '固定搭配'],
      video: { bvid: '', title: '', query: '考研英语一 词汇 固定搭配 subject to 辨析 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-vocab-02',
      subject: 'english1',
      module: 'en1.m.vocab',
      type: 'single',
      stem: 'By the time the committee finally published its report, the researchers ______ on the same problem for more than a decade.',
      options: [
        { key: 'A', text: 'worked' },
        { key: 'B', text: 'have worked' },
        { key: 'C', text: 'had been working' },
        { key: 'D', text: 'would work' }
      ],
      answer: ['C'],
      explanation: 'By the time 引导的时间状语从句用了一般过去时 published，主句动作发生在它之前并持续到那一刻，需要用"过去完成进行时"had been working 表示"在过去某时之前一直持续进行的动作"，且 for more than a decade 也提示持续性，故 C 正确。A 一般过去时无法表达"持续到过去某一时点之前"；B 现在完成时以"现在"为参照点，与 published 这一过去时点冲突；D would work 表过去将来，与"已经持续十年"的时间关系不符。考点：时态（过去完成进行时）与时间状语的呼应。',
      knowledge: ['en1.p.grammar.tense'],
      difficulty: 1,
      source: '考研英语一词汇语法模拟题（真题风格）',
      tags: ['模拟题', '语法', '时态'],
      video: { bvid: '', title: '', query: '考研英语一 语法 过去完成进行时 by the time 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-vocab-03',
      subject: 'english1',
      module: 'en1.m.vocab',
      type: 'single',
      stem: 'Had the warnings been taken seriously at the time, the scale of the damage ______ far smaller today.',
      options: [
        { key: 'A', text: 'would be' },
        { key: 'B', text: 'would have been' },
        { key: 'C', text: 'will be' },
        { key: 'D', text: 'had been' }
      ],
      answer: ['A'],
      explanation: '句首 Had the warnings been taken seriously 是省略 if 的倒装形式，属于与过去事实相反的虚拟条件从句。主句中 today 明确指向"现在"，因此应采用"混合虚拟"结构：从句与过去相反（had been taken），主句与现在相反（would be），表示"如果当时听取了警告，今天的损失规模就会小得多"，故 A 正确。B would have been 也是过去虚拟，但与 today 时间冲突；C will be 是真实条件句的将来时，不能与虚拟倒装从句搭配；D had been 无法构成主谓结构中的虚拟主句。考点：虚拟语气（省略 if 的倒装 + 混合时间虚拟）。',
      knowledge: ['en1.p.grammar.special'],
      difficulty: 5,
      source: '考研英语一词汇语法模拟题（真题风格）',
      tags: ['模拟题', '语法', '虚拟语气'],
      video: { bvid: '', title: '', query: '考研英语一 语法 虚拟语气 倒装 混合时间 讲解' },
      score: 1
    },
    {
      id: 'en1-sim-vocab-04',
      subject: 'english1',
      module: 'en1.m.vocab',
      type: 'single',
      stem: 'The report argues that the new tax is both efficient and fair, and that it should therefore be adopted ______ delay.',
      options: [
        { key: 'A', text: 'without' },
        { key: 'B', text: 'beyond' },
        { key: 'C', text: 'despite' },
        { key: 'D', text: 'except' }
      ],
      answer: ['A'],
      explanation: 'without delay 意为"毫不拖延地、立即"，是固定短语，与 therefore be adopted 的"应当尽快采纳"语义一致，故 A 正确。B beyond 常与 doubt、question、recognition 等搭配（beyond doubt 毋庸置疑），但不与 delay 构成"立即"之意；C despite 后需接名词且表让步，despite delay 意为"尽管有拖延"，与句子要表达的"应立即通过"相反；D except 表排除，语义完全不通。考点：介词固定搭配与语义方向判断。',
      knowledge: ['en1.p.word.collocation', 'en1.p.word.sense'],
      difficulty: 2,
      source: '考研英语一词汇语法模拟题（真题风格）',
      tags: ['模拟题', '词汇', '介词搭配'],
      video: { bvid: '', title: '', query: '考研英语一 词汇 介词短语 without delay 讲解' },
      score: 1
    }
  ];
})(window);

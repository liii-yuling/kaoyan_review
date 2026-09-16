/*!
 * taxonomy.js —— 四科考点知识树
 * 全局挂载：KY.taxonomy
 * 规范见 SCHEMA.md §2。points[].id 是题库 knowledge 字段唯一可引用的标识。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  KY.taxonomy = {
    /* =================================================================== */
    english1: {
      name: '英语一',
      short: 'en1',
      color: '#4f7cff',
      icon: '英',
      modules: [
        {
          id: 'en1.m.vocab',
          name: '词汇与语法基础',
          desc: '词义辨析、固定搭配、长难句结构',
          points: [
            { id: 'en1.p.word.sense', name: '词义辨析与近义词', keywords: ['词义', '近义词', '辨析', 'means', 'imply', 'suggest', '词性', '褒贬'] },
            { id: 'en1.p.word.collocation', name: '固定搭配与短语动词', keywords: ['搭配', 'collocation', 'phrase', '介词搭配', 'account for', 'subject to', '惯用法'] },
            { id: 'en1.p.grammar.clause', name: '从句（定语/状语/名词性）', keywords: ['从句', '定语从句', '状语从句', '宾语从句', '同位语', 'which', 'that', 'where', '关系代词', '关系副词'] },
            { id: 'en1.p.grammar.nonfinite', name: '非谓语动词', keywords: ['非谓语', '分词', '不定式', '动名词', '现在分词', '过去分词', 'doing', 'done', 'to do', '独立主格'] },
            { id: 'en1.p.grammar.special', name: '特殊句式（倒装/强调/虚拟/省略）', keywords: ['倒装', '强调句', '虚拟语气', '省略', 'it is that', 'were', 'had', 'inversion', 'subjunctive'] },
            { id: 'en1.p.grammar.agreement', name: '主谓一致与平行结构', keywords: ['主谓一致', '平行结构', 'parallel', 'agreement', '并列', '单复数'] },
            { id: 'en1.p.grammar.tense', name: '时态与语态', keywords: ['时态', '语态', '完成时', '被动', 'tense', 'voice', 'has been'] }
          ]
        },
        {
          id: 'en1.m.cloze',
          name: '完形填空',
          desc: '20 空，考查语境逻辑、词汇搭配与篇章连贯',
          points: [
            { id: 'en1.p.cloze.logic', name: '逻辑衔接与关联词', keywords: ['however', 'therefore', 'moreover', 'nevertheless', '转折', '递进', '因果', '并列', '逻辑', '上下文'] },
            { id: 'en1.p.cloze.context', name: '上下文语义线索', keywords: ['上下文', '语境', '语义', '复现', '同义复现', '反义', '线索', '指代'] },
            { id: 'en1.p.cloze.collocation', name: '动词/介词搭配填空', keywords: ['搭配', '介词', '动词短语', 'collocation', '固定用法'] },
            { id: 'en1.p.cloze.cohesion', name: '篇章连贯与代词指代', keywords: ['连贯', 'cohesion', '指代', 'this', 'they', '代词', '衔接'] },
            { id: 'en1.p.cloze.topic', name: '主题把握与态度色彩', keywords: ['主题', '态度', '褒义', '贬义', '感情色彩', '作者态度'] }
          ]
        },
        {
          id: 'en1.m.reading',
          name: '阅读理解 Part A',
          desc: '4 篇 × 5 题，共 40 分',
          points: [
            { id: 'en1.p.read.main', name: '主旨大意题', keywords: ['主旨', 'main idea', 'mainly about', 'best title', '中心', '主题', 'purpose'] },
            { id: 'en1.p.read.detail', name: '事实细节题', keywords: ['细节', 'according to', 'because', 'detail', 'states', 'mentions', '具体信息'] },
            { id: 'en1.p.read.infer', name: '推理判断题', keywords: ['infer', 'imply', 'suggest', '推断', '推理', 'learn from', 'conclude'] },
            { id: 'en1.p.read.vocab', name: '词义句意题', keywords: ['词义', '句意', 'means', 'refers to', 'closest in meaning', '划线', '短语含义'] },
            { id: 'en1.p.read.attitude', name: '态度观点题', keywords: ['attitude', '态度', 'tone', '语气', '观点', 'view', 'author'] },
            { id: 'en1.p.read.structure', name: '篇章结构与论证方法', keywords: ['结构', '论证', '举例', '对比', '转折', '段落', 'structure', 'example'] },
            { id: 'en1.p.read.long', name: '长难句理解', keywords: ['长难句', '复杂句', '嵌套', '修饰', '插入语', '句子主干'] }
          ]
        },
        {
          id: 'en1.m.newtype',
          name: '新题型 Part B',
          desc: '七选五 / 排序 / 小标题匹配',
          points: [
            { id: 'en1.p.new.seven', name: '七选五（语段填空）', keywords: ['七选五', '语段', '填空', '衔接', '承上启下'] },
            { id: 'en1.p.new.order', name: '排序题', keywords: ['排序', '顺序', 'order', '段落排序', '时间线'] },
            { id: 'en1.p.new.heading', name: '小标题匹配', keywords: ['小标题', 'heading', '概括', '主题句', '匹配'] },
            { id: 'en1.p.new.cohesion', name: '语篇衔接手段', keywords: ['衔接', '指代', '连接词', '词汇复现', '连贯'] }
          ]
        },
        {
          id: 'en1.m.translation',
          name: '翻译 Part C',
          desc: '英译汉 5 句，共 10 分',
          points: [
            { id: 'en1.p.trans.structure', name: '句子结构拆分', keywords: ['拆分', '结构', '主干', '从句', '修饰成分', '断句'] },
            { id: 'en1.p.trans.attributive', name: '定语与状语的处理', keywords: ['定语', '状语', '前置', '后置', '转换', '语序调整'] },
            { id: 'en1.p.trans.passive', name: '被动语态与无主句处理', keywords: ['被动', '无主句', '增补主语', 'it 形式主语'] },
            { id: 'en1.p.trans.expression', name: '词义引申与汉语表达', keywords: ['引申', '意译', '通顺', '表达', '润色', '词义选择'] }
          ]
        },
        {
          id: 'en1.m.writing',
          name: '写作（小作文+大作文）',
          desc: '应用文 10 分 + 图画作文 20 分',
          points: [
            { id: 'en1.p.writ.letter', name: '应用文书信格式与语气', keywords: ['书信', 'letter', '格式', '称呼', '落款', '语气', 'notice', 'email'] },
            { id: 'en1.p.writ.picture', name: '图画描述与寓意提炼', keywords: ['图画', '描述', '寓意', '象征', 'caption', 'cartoon', '揭示'] },
            { id: 'en1.p.writ.argument', name: '论证展开与例证', keywords: ['论证', '举例', '原因', '影响', '措施', 'argument', 'example'] },
            { id: 'en1.p.writ.coherence', name: '篇章连贯与衔接词', keywords: ['连贯', '衔接词', '过渡', '逻辑', 'firstly', 'moreover', 'therefore'] },
            { id: 'en1.p.writ.language', name: '语言准确性与句式多样', keywords: ['句式', '多样', '准确性', '语法错误', '高级表达', '亮点句'] }
          ]
        }
      ]
    },

    /* =================================================================== */
    math1: {
      name: '数学一',
      short: 'm1',
      color: '#27c093',
      icon: '数',
      modules: [
        {
          id: 'm1.m.limit',
          name: '高数·函数极限连续',
          points: [
            { id: 'm1.p.limit.eval', name: '极限计算（等价无穷小/洛必达/泰勒）', keywords: ['极限', '洛必达', '等价无穷小', '泰勒', '未定式', '0/0', '∞/∞', 'lim'] },
            { id: 'm1.p.limit.exist', name: '极限存在性与左右极限', keywords: ['左右极限', '存在性', '夹逼', '单调有界', '极限不存在', '跳跃'] },
            { id: 'm1.p.limit.infinitesimal', name: '无穷小阶的比较', keywords: ['无穷小', '阶', '同阶', '高阶', '等价', '比阶'] },
            { id: 'm1.p.cont.point', name: '连续性与间断点分类', keywords: ['连续', '间断点', '可去', '跳跃', '第二类', '连续性'] },
            { id: 'm1.p.cont.theorem', name: '闭区间连续函数性质（零点/介值）', keywords: ['零点定理', '介值定理', '最值定理', '根的存在性', '闭区间'] }
          ]
        },
        {
          id: 'm1.m.deriv',
          name: '高数·一元微分学',
          points: [
            { id: 'm1.p.deriv.def', name: '导数定义与可导性判定', keywords: ['导数定义', '可导', '可微', '左右导数', '导数存在'] },
            { id: 'm1.p.deriv.rule', name: '求导法则（复合/隐函数/参数/反函数）', keywords: ['复合函数', '隐函数', '参数方程', '反函数', '求导法则', '链式法则'] },
            { id: 'm1.p.deriv.higher', name: '高阶导数与莱布尼茨公式', keywords: ['高阶导数', 'n 阶导数', '莱布尼茨', '二阶导'] },
            { id: 'm1.p.deriv.mvt', name: '微分中值定理（罗尔/拉格朗日/柯西/泰勒）', keywords: ['罗尔', '拉格朗日', '柯西中值', '泰勒公式', '中值定理', '辅助函数'] },
            { id: 'm1.p.deriv.monotone', name: '单调性、极值与最值', keywords: ['单调', '极值', '最值', '驻点', '不可导点', '极大', '极小'] },
            { id: 'm1.p.deriv.concave', name: '凹凸性与拐点、渐近线', keywords: ['凹凸', '拐点', '渐近线', '曲率', '拐点判定'] },
            { id: 'm1.p.deriv.proof', name: '不等式证明与方程根的讨论', keywords: ['不等式证明', '根', '零点个数', '构造辅助函数', '证明'] }
          ]
        },
        {
          id: 'm1.m.integral',
          name: '高数·一元积分学',
          points: [
            { id: 'm1.p.int.indef', name: '不定积分（换元/分部/有理函数）', keywords: ['不定积分', '换元', '分部积分', '有理函数', '原函数', '凑微分'] },
            { id: 'm1.p.int.def', name: '定积分计算与性质', keywords: ['定积分', '牛顿-莱布尼茨', '变限积分', '对称性', '周期性', '积分中值'] },
            { id: 'm1.p.int.improper', name: '反常积分敛散性', keywords: ['反常积分', '广义积分', '收敛', '发散', '瑕点', '无穷限'] },
            { id: 'm1.p.int.app', name: '定积分几何物理应用', keywords: ['面积', '体积', '弧长', '旋转体', '形心', '做功', '应用'] }
          ]
        },
        {
          id: 'm1.m.multidiff',
          name: '高数·多元微分学',
          points: [
            { id: 'm1.p.multi.limit', name: '多元函数极限与连续', keywords: ['二元极限', '重极限', '多元连续', '路径', '累次极限'] },
            { id: 'm1.p.multi.partial', name: '偏导数与全微分', keywords: ['偏导数', '全微分', '可微', '偏导存在', '连续可偏导'] },
            { id: 'm1.p.multi.chain', name: '复合函数与隐函数求导', keywords: ['链式法则', '复合函数求偏导', '隐函数', '雅可比', '方程组确定'] },
            { id: 'm1.p.multi.extreme', name: '多元极值与条件极值（拉格朗日乘数）', keywords: ['极值', '条件极值', '拉格朗日乘数', '驻点', '最值', '海森矩阵'] },
            { id: 'm1.p.multi.geo', name: '空间曲线曲面与方向导数梯度', keywords: ['切平面', '法线', '方向导数', '梯度', '空间曲线', '切线'] }
          ]
        },
        {
          id: 'm1.m.multiint',
          name: '高数·多元积分学',
          points: [
            { id: 'm1.p.mi.double', name: '二重积分（直角/极坐标、换序）', keywords: ['二重积分', '极坐标', '交换积分次序', '累次积分', '区域'] },
            { id: 'm1.p.mi.triple', name: '三重积分（柱面/球面坐标）', keywords: ['三重积分', '柱面坐标', '球面坐标', '投影', '截面法'] },
            { id: 'm1.p.mi.curve', name: '曲线积分（第一/第二类、格林公式）', keywords: ['曲线积分', '格林公式', '对弧长', '对坐标', '路径无关', '保守场'] },
            { id: 'm1.p.mi.surface', name: '曲面积分（高斯/斯托克斯）', keywords: ['曲面积分', '高斯公式', '斯托克斯', '通量', '散度', '旋度', '对面积'] }
          ]
        },
        {
          id: 'm1.m.series',
          name: '高数·无穷级数',
          points: [
            { id: 'm1.p.ser.const', name: '常数项级数敛散性判别', keywords: ['正项级数', '比较判别', '比值判别', '根值判别', '交错级数', '莱布尼茨', '绝对收敛', '条件收敛'] },
            { id: 'm1.p.ser.power', name: '幂级数收敛域与和函数', keywords: ['幂级数', '收敛半径', '收敛域', '和函数', '逐项求导', '逐项积分'] },
            { id: 'm1.p.ser.taylor', name: '函数展开成幂级数', keywords: ['泰勒级数', '麦克劳林', '展开', '间接展开'] },
            { id: 'm1.p.ser.fourier', name: '傅里叶级数（数学一要求）', keywords: ['傅里叶级数', '狄利克雷', '正弦级数', '余弦级数', '周期延拓'] }
          ]
        },
        {
          id: 'm1.m.ode',
          name: '高数·常微分方程',
          points: [
            { id: 'm1.p.ode.first', name: '一阶方程（可分离/齐次/线性/伯努利）', keywords: ['可分离变量', '齐次方程', '一阶线性', '伯努利', '通解', '特解'] },
            { id: 'm1.p.ode.high', name: '可降阶高阶方程', keywords: ['可降阶', 'y\'\'=f(x)', '缺 y', '缺 x', '降阶'] },
            { id: 'm1.p.ode.const', name: '常系数线性方程与特征方程', keywords: ['常系数', '特征方程', '齐次通解', '特解形式', '待定系数', '重根'] },
            { id: 'm1.p.ode.app', name: '微分方程应用与几何/物理建模', keywords: ['应用', '变化率', '建模', '几何意义', '冷却', '混合'] }
          ]
        },
        {
          id: 'm1.m.geometry',
          name: '高数·向量代数与空间解析几何',
          points: [
            { id: 'm1.p.geo.vector', name: '向量运算（点积/叉积/混合积）', keywords: ['向量', '数量积', '向量积', '混合积', '共面', '垂直', '平行'] },
            { id: 'm1.p.geo.plane', name: '平面与直线方程', keywords: ['平面方程', '直线方程', '夹角', '距离', '交线', '法向量'] },
            { id: 'm1.p.geo.surface', name: '曲面与曲线（柱面/锥面/旋转面）', keywords: ['柱面', '锥面', '旋转曲面', '投影', '母线', '二次曲面'] }
          ]
        },
        {
          id: 'm1.m.linalg',
          name: '线性代数',
          points: [
            { id: 'm1.p.la.det', name: '行列式计算与性质', keywords: ['行列式', '余子式', '代数余子式', '范德蒙', '递推', '展开'] },
            { id: 'm1.p.la.matrix', name: '矩阵运算与逆矩阵', keywords: ['矩阵', '逆矩阵', '伴随矩阵', '转置', '初等变换', '分块矩阵', '秩'] },
            { id: 'm1.p.la.rank', name: '矩阵的秩与等价标准形', keywords: ['秩', '行阶梯', '等价', '满秩', 'r(A)', '秩的不等式'] },
            { id: 'm1.p.la.equation', name: '线性方程组解的结构', keywords: ['线性方程组', '基础解系', '通解', '同解', '无解', '无穷多解', '克拉默'] },
            { id: 'm1.p.la.vector', name: '向量组线性相关与极大无关组', keywords: ['线性相关', '线性无关', '极大无关组', '表出', '向量组等价', '线性组合'] },
            { id: 'm1.p.la.eigen', name: '特征值与特征向量、相似对角化', keywords: ['特征值', '特征向量', '相似', '对角化', '相似对角化', '特征多项式'] },
            { id: 'm1.p.la.quadratic', name: '二次型与正定性', keywords: ['二次型', '标准形', '规范形', '合同', '正定', '惯性指数', '配方法'] }
          ]
        },
        {
          id: 'm1.m.prob',
          name: '概率论与数理统计',
          points: [
            { id: 'm1.p.pr.event', name: '随机事件与概率公式', keywords: ['古典概型', '条件概率', '全概率', '贝叶斯', '独立性', '加法公式'] },
            { id: 'm1.p.pr.rv1', name: '一维随机变量及其分布', keywords: ['分布函数', '概率密度', '分布律', '正态分布', '指数分布', '均匀分布', '随机变量函数'] },
            { id: 'm1.p.pr.rv2', name: '二维随机变量与边缘/条件分布', keywords: ['联合分布', '边缘分布', '条件分布', '独立性', '二维', '卷积'] },
            { id: 'm1.p.pr.num', name: '数字特征（期望/方差/协方差/相关系数）', keywords: ['数学期望', '方差', '协方差', '相关系数', '矩', 'E(X)', 'D(X)'] },
            { id: 'm1.p.pr.law', name: '大数定律与中心极限定理', keywords: ['大数定律', '中心极限定理', '切比雪夫', '辛钦', '依概率收敛'] },
            { id: 'm1.p.pr.stat', name: '数理统计（抽样分布/参数估计/假设检验）', keywords: ['样本', '统计量', 'χ²分布', 't分布', 'F分布', '矩估计', '极大似然', '置信区间', '假设检验'] }
          ]
        }
      ]
    },

    /* =================================================================== */
    signals: {
      name: '信号与系统',
      short: 'sig',
      color: '#f2994a',
      icon: '信',
      modules: [
        {
          id: 'sig.m.basic',
          name: '信号与系统基础',
          points: [
            { id: 'sig.p.sig.classify', name: '信号的分类与基本运算', keywords: ['连续时间', '离散时间', '周期信号', '能量信号', '功率信号', '信号运算', '平移', '反转', '尺度变换'] },
            { id: 'sig.p.sig.elementary', name: '基本信号（阶跃/冲激/斜坡/指数）', keywords: ['单位阶跃', '冲激函数', 'δ(t)', 'u(t)', '冲激偶', '取样性质', '斜坡', '复指数'] },
            { id: 'sig.p.sys.props', name: '系统性质（线性/时不变/因果/稳定）', keywords: ['线性', '时不变', '因果', '稳定', 'BIBO', '记忆', '无记忆', '动态'] },
            { id: 'sig.p.sys.model', name: '系统数学模型与框图', keywords: ['微分方程', '差分方程', '框图', '模拟图', '算子', '系统模型'] }
          ]
        },
        {
          id: 'sig.m.cttime',
          name: '连续时间系统时域分析',
          points: [
            { id: 'sig.p.ct.conv', name: '卷积积分及其性质', keywords: ['卷积', '卷积积分', '交换律', '结合律', '分配律', '卷积图解', '卷积性质'] },
            { id: 'sig.p.ct.impulse', name: '冲激响应与阶跃响应', keywords: ['冲激响应', 'h(t)', '阶跃响应', 'g(t)', 'h(t)与g(t)关系'] },
            { id: 'sig.p.ct.response', name: '零输入响应与零状态响应', keywords: ['零输入响应', '零状态响应', '自由响应', '强迫响应', '暂态', '稳态', '初始状态'] },
            { id: 'sig.p.ct.diffeq', name: '微分方程经典解法', keywords: ['齐次解', '特解', '待定系数', '初始条件', '跳变', '微分方程求解'] }
          ]
        },
        {
          id: 'sig.m.fourier',
          name: '傅里叶变换与频域分析',
          points: [
            { id: 'sig.p.ft.series', name: '周期信号的傅里叶级数', keywords: ['傅里叶级数', '三角形式', '指数形式', '吉布斯', '频谱', '谐波', '狄利克雷'] },
            { id: 'sig.p.ft.transform', name: '傅里叶变换及其性质', keywords: ['傅里叶变换', 'FT', '对称性', '时移', '频移', '尺度变换', '卷积定理', '帕塞瓦尔'] },
            { id: 'sig.p.ft.common', name: '常用信号的频谱', keywords: ['矩形脉冲', 'sinc', '冲激频谱', '阶跃频谱', '抽样信号', 'Sa函数'] },
            { id: 'sig.p.ft.freqresp', name: '频率响应与无失真传输、滤波器', keywords: ['频率响应', 'H(jω)', '幅频', '相频', '无失真传输', '理想低通', '滤波器', '带宽'] },
            { id: 'sig.p.ft.sample', name: '抽样定理与调制解调', keywords: ['抽样定理', '奈奎斯特', '频谱混叠', '恢复', '调制', 'AM', 'DSB', '解调'] },
            { id: 'sig.p.ft.energy', name: '能量谱与功率谱', keywords: ['能量谱', '功率谱', '帕塞瓦尔定理', '能量密度', '自相关'] }
          ]
        },
        {
          id: 'sig.m.laplace',
          name: '拉普拉斯变换与复频域分析',
          points: [
            { id: 'sig.p.lap.def', name: '拉氏变换定义与收敛域', keywords: ['拉普拉斯变换', '收敛域', 'ROC', '单边', '双边', 's 域'] },
            { id: 'sig.p.lap.props', name: '拉氏变换性质（微分/积分/时移/初终值）', keywords: ['时域微分', '时域积分', '初值定理', '终值定理', '时移', 's 域平移', '卷积定理'] },
            { id: 'sig.p.lap.inverse', name: '拉氏反变换（部分分式展开）', keywords: ['部分分式', '反变换', '留数', '极点', '零点', '真分式'] },
            { id: 'sig.p.lap.solve', name: '用拉氏变换解微分方程与电路分析', keywords: ['s 域模型', '电路', '运算阻抗', '解微分方程', '初始条件带入'] },
            { id: 'sig.p.lap.sysfn', name: '系统函数 H(s) 与稳定性', keywords: ['系统函数', 'H(s)', '极点分布', '稳定', '因果', '罗斯', '劳斯判据'] }
          ]
        },
        {
          id: 'sig.m.dttime',
          name: '离散时间系统时域分析',
          points: [
            { id: 'sig.p.dt.conv', name: '卷积和及其性质', keywords: ['卷积和', '求和', '列表法', '卷积和性质'] },
            { id: 'sig.p.dt.response', name: '单位样值响应与差分方程求解', keywords: ['单位样值响应', 'h(n)', '差分方程', '迭代法', '齐次解', '特解'] },
            { id: 'sig.p.dt.response2', name: '零输入/零状态响应（离散）', keywords: ['零输入响应', '零状态响应', '初始状态', '离散'] }
          ]
        },
        {
          id: 'sig.m.ztrans',
          name: 'z 变换与 z 域分析',
          points: [
            { id: 'sig.p.z.def', name: 'z 变换定义与收敛域', keywords: ['z 变换', '收敛域', 'ROC', '双边 z', '单边 z', 'z 平面'] },
            { id: 'sig.p.z.props', name: 'z 变换性质', keywords: ['位移性质', 'z 域微分', '卷积定理', '初值定理', '终值定理', '尺度'] },
            { id: 'sig.p.z.inverse', name: 'z 反变换（部分分式/幂级数/留数）', keywords: ['z 反变换', '部分分式', '幂级数展开', '留数法', '长除法'] },
            { id: 'sig.p.z.sysfn', name: '系统函数 H(z) 与离散系统稳定性', keywords: ['H(z)', '极点', '单位圆', '稳定判据', '朱里判据', '因果'] },
            { id: 'sig.p.z.freq', name: '离散系统频率响应与 DFT/FFT', keywords: ['频率响应', 'DTFT', 'DFT', 'FFT', '圆周卷积', '频谱'] }
          ]
        },
        {
          id: 'sig.m.state',
          name: '状态变量分析',
          points: [
            { id: 'sig.p.st.build', name: '状态方程与输出方程的建立', keywords: ['状态变量', '状态方程', '输出方程', '状态矢量', '流图'] },
            { id: 'sig.p.st.solve', name: '状态转移矩阵与求解', keywords: ['状态转移矩阵', '矩阵指数', 'e^At', '凯莱-哈密顿', '拉氏变换法'] },
            { id: 'sig.p.st.reach', name: '可控性与可观测性', keywords: ['可控性', '可观测性', '能控', '能观', '判别矩阵', '秩判据'] }
          ]
        }
      ]
    },

    /* =================================================================== */
    politics: {
      name: '政治',
      short: 'pol',
      color: '#e8544f',
      icon: '政',
      modules: [
        {
          id: 'pol.m.marx',
          name: '马克思主义基本原理',
          points: [
            { id: 'pol.p.marx.philo.materialism', name: '辩证唯物论（物质与意识）', keywords: ['物质', '意识', '物质决定意识', '主观能动性', '实践', '世界的物质统一性'] },
            { id: 'pol.p.marx.philo.dialectics', name: '唯物辩证法（联系发展矛盾）', keywords: ['联系', '发展', '矛盾', '对立统一', '质量互变', '否定之否定', '普遍性与特殊性', '两点论'] },
            { id: 'pol.p.marx.philo.epistemology', name: '认识论（实践与认识、真理）', keywords: ['实践', '认识', '感性认识', '理性认识', '真理', '绝对真理', '相对真理', '检验真理'] },
            { id: 'pol.p.marx.philo.history', name: '唯物史观（社会存在与社会意识）', keywords: ['社会存在', '社会意识', '生产力', '生产关系', '经济基础', '上层建筑', '人民群众', '社会形态'] },
            { id: 'pol.p.marx.polieco.value', name: '劳动价值论与剩余价值论', keywords: ['商品', '使用价值', '价值', '劳动二重性', '剩余价值', '资本积累', '剥削', '劳动力商品'] },
            { id: 'pol.p.marx.polieco.monopoly', name: '垄断资本主义与当代资本主义', keywords: ['垄断', '金融资本', '国家垄断资本主义', '经济全球化', '资本输出', '垄断利润'] },
            { id: 'pol.p.marx.socialism', name: '社会主义与共产主义理想', keywords: ['社会主义', '共产主义', '两个必然', '预见未来', '远大理想', '共同理想'] }
          ]
        },
        {
          id: 'pol.m.mao',
          name: '毛泽东思想与中国特色社会主义理论体系',
          points: [
            { id: 'pol.p.mao.newdem', name: '新民主主义革命理论', keywords: ['新民主主义', '革命', '三大法宝', '统一战线', '武装斗争', '党的建设', '农村包围城市'] },
            { id: 'pol.p.mao.transform', name: '社会主义改造理论', keywords: ['社会主义改造', '过渡时期总路线', '一化三改', '农业合作化', '和平赎买'] },
            { id: 'pol.p.mao.explore', name: '社会主义建设道路初步探索', keywords: ['论十大关系', '正确处理人民内部矛盾', '初步探索', '工业化道路'] },
            { id: 'pol.p.dxp.essence', name: '邓小平理论与社会主义本质', keywords: ['社会主义本质', '解放思想', '实事求是', '一国两制', '市场经济', '三个有利于'] },
            { id: 'pol.p.dxp.three', name: '“三个代表”与科学发展观', keywords: ['三个代表', '科学发展观', '以人为本', '全面协调可持续', '第一要义'] },
            { id: 'pol.p.xjpsm.thought', name: '习近平新时代中国特色社会主义思想', keywords: ['新时代', '习近平新时代中国特色社会主义思想', '主要矛盾', '中国梦', '十个明确', '十四个坚持'] },
            { id: 'pol.p.xjpsm.layout', name: '“五位一体”总体布局与“四个全面”', keywords: ['五位一体', '四个全面', '新发展理念', '高质量发展', '乡村振兴', '全面深化改革', '依法治国'] }
          ]
        },
        {
          id: 'pol.m.history',
          name: '中国近现代史纲要',
          points: [
            { id: 'pol.p.hist.invasion', name: '近代中国国情与列强侵略', keywords: ['半殖民地半封建', '鸦片战争', '不平等条约', '列强侵略', '民族危机', '两大历史任务'] },
            { id: 'pol.p.hist.early', name: '早期探索与旧民主主义革命', keywords: ['太平天国', '洋务运动', '戊戌变法', '辛亥革命', '三民主义', '旧民主主义'] },
            { id: 'pol.p.hist.newdem', name: '新民主主义革命历程', keywords: ['五四运动', '中共成立', '国民革命', '土地革命', '抗日战争', '解放战争', '遵义会议'] },
            { id: 'pol.p.hist.found', name: '社会主义革命与建设时期', keywords: ['新中国成立', '抗美援朝', '三大改造', '社会主义建设', '文化大革命', '曲折'] },
            { id: 'pol.p.hist.reform', name: '改革开放与新时代', keywords: ['十一届三中全会', '改革开放', '南方谈话', '十九大', '二十大', '新时代'] }
          ]
        },
        {
          id: 'pol.m.ethics',
          name: '思想道德与法治',
          points: [
            { id: 'pol.p.eth.ideal', name: '领悟人生真谛、坚定理想信念', keywords: ['人生观', '人生价值', '理想信念', '马克思主义信仰', '个人理想', '社会理想'] },
            { id: 'pol.p.eth.spirit', name: '中国精神与爱国主义', keywords: ['中国精神', '爱国主义', '民族精神', '时代精神', '改革创新', '新时代爱国主义'] },
            { id: 'pol.p.eth.values', name: '社会主义核心价值观与道德', keywords: ['社会主义核心价值观', '道德', '中华传统美德', '社会公德', '职业道德', '家庭美德', '个人品德'] },
            { id: 'pol.p.eth.law', name: '法治素养与宪法法律', keywords: ['宪法', '法治', '依法治国', '法律权威', '权利与义务', '法治思维', '民法典'] }
          ]
        },
        {
          id: 'pol.m.current',
          name: '形势与政策及当代世界经济与政治',
          points: [
            { id: 'pol.p.cur.party', name: '党的重大会议与重要论述', keywords: ['二十大', '二十届三中全会', '全会', '报告', '重要讲话', '主题教育'] },
            { id: 'pol.p.cur.china', name: '中国方案与大国外交', keywords: ['人类命运共同体', '一带一路', '全球发展倡议', '全球安全倡议', '全球文明倡议', '中国特色大国外交'] },
            { id: 'pol.p.cur.world', name: '当代世界经济与政治格局', keywords: ['世界多极化', '经济全球化', '大国关系', '南北关系', '联合国', '国际秩序', '百年变局'] }
          ]
        }
      ]
    }
  };

  /* ------------------------------------------------------------------ */
  /* 便捷索引                                                            */
  /* ------------------------------------------------------------------ */

  /** 扁平化所有考点：{ [pointId]: { point, module, subject } } */
  KY.taxIndex = (function build() {
    var idx = Object.create(null);
    Object.keys(KY.taxonomy).forEach(function (sub) {
      var s = KY.taxonomy[sub];
      s.modules.forEach(function (m) {
        m.points.forEach(function (p) {
          idx[p.id] = {
            point: p,
            module: m,
            subject: sub,
            subjectName: s.name,
            moduleName: m.name
          };
        });
      });
    });
    return idx;
  })();

  /** 按 id 取考点元信息，找不到返回 null */
  KY.getTaxNode = function (pointId) {
    return KY.taxIndex[pointId] || null;
  };

  /** 取某科目的模块列表 */
  KY.getModules = function (subject) {
    var s = KY.taxonomy[subject];
    return s ? s.modules : [];
  };

  /** 取某科目下所有考点 */
  KY.getPoints = function (subject) {
    var s = KY.taxonomy[subject];
    if (!s) return [];
    var out = [];
    s.modules.forEach(function (m) {
      m.points.forEach(function (p) {
        out.push({ point: p, module: m });
      });
    });
    return out;
  };

  /** 科目代码 -> 中文名 */
  KY.subjectName = function (subject) {
    var s = KY.taxonomy[subject];
    return s ? s.name : subject;
  };

  /** 所有科目代码，固定顺序 */
  KY.SUBJECTS = ['english1', 'math1', 'signals', 'politics'];

  /** 错因类型字典 */
  KY.ERROR_TYPES = [
    { id: 'concept', name: '概念不清', desc: '对定义、定理、性质的理解有偏差', advice: '回到教材精读该考点定义，用自己的话复述一遍，再做 3 道同考点基础题。' },
    { id: 'formula', name: '公式记错', desc: '公式形式、适用条件记忆错误', advice: '把该考点公式单独抄成一张卡片，写明适用条件与常见变形，每天默写一次。' },
    { id: 'calculation', name: '计算失误', desc: '思路正确但运算过程出错', advice: '限时重做并在草稿上分步书写，重点检查符号、分母、代入环节。' },
    { id: 'reading', name: '审题偏差', desc: '漏看条件、答非所问、理解偏题', advice: '读题时圈画关键词与限定条件，先写"题目要我求什么"再动笔。' },
    { id: 'method', name: '方法思路错误', desc: '方法选择不当或未找到切入点', advice: '整理该考点的题型—方法对应表，归纳"看到什么特征用什么方法"。' },
    { id: 'vocab', name: '词汇术语障碍', desc: '关键单词或专业术语不认识', advice: '把该题生词加入生词本，并记忆其在本学科中的固定译法。' },
    { id: 'logic', name: '逻辑推理错误', desc: '论证链条断裂或推理方向错误', advice: '把解题步骤写成推理链，逐步标注依据，找出断点所在的环节。' },
    { id: 'careless', name: '粗心大意', desc: '抄错、漏选、单位错误等非知识性失误', advice: '交卷前留 3 分钟专项检查：单位、正负号、选项填涂。' },
    { id: 'unknown', name: '待人工确认', desc: '自动分类置信度不足，需人工指定', advice: '请在错题详情里手动选择知识点与错因，系统会据此重新推送练习。' }
  ];

  KY.getErrorType = function (id) {
    for (var i = 0; i < KY.ERROR_TYPES.length; i++) {
      if (KY.ERROR_TYPES[i].id === id) return KY.ERROR_TYPES[i];
    }
    return KY.ERROR_TYPES[KY.ERROR_TYPES.length - 1];
  };

  /** 题库容器，由 data/bank.*.js 填充 */
  KY.banks = KY.banks || {};
  /** 套卷容器，由 data/papers.*.js 填充 */
  KY.papers = KY.papers || {};
})(window);

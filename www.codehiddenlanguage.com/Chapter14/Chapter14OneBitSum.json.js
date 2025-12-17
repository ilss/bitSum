// Chapter14OneBitSum (c) Charles Petzold, 2024
//
// 单位求和演示电路 - 带有输入按钮和输出指示灯的完整 XOR 电路
//
// 功能：演示两个二进制位相加的"和"（不含进位）
//
// 电路结构示意图：
//
//   [Button A] ──┬──→ [OR  ]
//                │           ╲
//                └──→ [NAND] ─→ [AND] ──→ ● [Light] SUM
//                ┌──→ [NAND] ─╱
//   [Button B] ──┴──→ [OR  ]
//
// 真值表：
//   A | B | SUM (A ⊕ B)
//   0 | 0 |     0
//   0 | 1 |     1
//   1 | 0 |     1
//   1 | 1 |     0  ← 注意：1+1=10(二进制)，这里只显示和位，进位被忽略

let Chapter14OneBitSum = {
  // 组件名称标识符
  name: 'Chapter14OneBitSum',

  // ========== 画布变换设置 ==========
  // 控制整个电路在 Canvas 上的位置、缩放和旋转
  transform: {
    x: 0, // X 轴偏移（像素）
    y: 0, // Y 轴偏移（像素）
    scale: 1, // 缩放比例（1 = 原始大小）
    rotate: 0, // 旋转角度（度）
  },

  // ========== 信号传播延迟 ==========
  // 每个逻辑门处理信号的延迟时间（毫秒）
  // 设为 100ms 让用户可以看到信号在电路中传播的过程
  propagationDelay: 100,

  // ========== 组件定义 ==========
  components: [
    // ----- 核心电路：求和器（XOR 实现）-----
    // 引用外部组件 Chapter14OneBitSummer（包含 OR + NAND + AND）
    { name: 'summer', type: 'External', file: 'Chapter14OneBitSummer' },

    // ----- 用户输入：数字按钮 -----
    // DigitButton: 可点击切换 0/1 的方形按钮

    // 按钮 A：位于 OR 门 A 输入端口左侧 170 像素处
    {
      name: 'button1',
      type: 'DigitButton',
      x: -170,
      relative: { xy: { name: 'summer.or', io: 'A' } },
    },

    // 按钮 B：与按钮 A 同一 X 坐标，Y 与 NAND 门 B 输入对齐
    {
      name: 'button2',
      type: 'DigitButton',
      relative: { x: { name: 'button1' }, y: { name: 'summer.nand', io: 'B' } },
    },

    // ----- 输出显示 -----
    // BitLight: 显示结果的圆形指示灯（亮=1，暗=0）
    {
      name: 'light',
      type: 'BitLight',
      x: 100,
      relative: { xy: { name: 'summer.and', io: 'out' } },
    },

    // 标签：在指示灯下方显示 "SUM" 文字
    {
      name: 'label',
      type: 'Label',
      text: 'SUM',
      xAlign: 0.5, // 水平居中对齐
      yAlign: 0, // 垂直顶部对齐
      y: 50, // 向下偏移 50 像素
      relative: { xy: { name: 'light' } },
    },

    // ----- 信号分叉节点 -----
    // Node: 电线的分叉点，一个输入可以分成多个输出
    // 用于将按钮的信号同时发送到 OR 门和 NAND 门

    // 节点 A：分发按钮 A 的信号
    {
      name: 'nodeA',
      type: 'Node',
      x: 200,
      relative: { y: { name: 'button1' } },
    },

    // 节点 B：分发按钮 B 的信号
    {
      name: 'nodeB',
      type: 'Node',
      x: 150,
      relative: { y: { name: 'button2' } },
    },

    // ----- 电线转折点 -----
    // Joint: 电线的拐角点，用于走线布局

    // jtA: A 信号到 NAND 门的转折点
    {
      name: 'jtA',
      type: 'Joint',
      relative: { x: { name: 'nodeA' }, y: { name: 'summer.nand', io: 'A' } },
    },

    // jtB1: B 信号到 OR 门的转折点
    {
      name: 'jtB1',
      type: 'Joint',
      relative: { x: { name: 'nodeB' }, y: { name: 'summer.or', io: 'B' } },
    },
  ],

  // ========== 电线定义 ==========
  // 连接组件，定义信号传播路径
  wires: [
    // ----- 按钮 A 的信号分发 -----

    // 按钮 A → 节点 A（信号起点）
    { points: [{ name: 'button1', io: 'right' }, { name: 'nodeA' }] },

    // 节点 A → OR 门的 A 输入
    { points: [{ name: 'nodeA' }, { name: 'summer.or', io: 'A', input: 0 }] },

    // 节点 A → NAND 门的 A 输入（经过转折点 jtA）
    {
      points: [
        { name: 'nodeA' },
        { name: 'jtA' },
        { name: 'summer.nand', io: 'A', input: 0 },
      ],
    },

    // ----- 按钮 B 的信号分发 -----

    // 按钮 B → 节点 B（信号起点）
    { points: [{ name: 'button2', io: 'right' }, { name: 'nodeB' }] },

    // 节点 B → OR 门的 B 输入（经过转折点 jtB1）
    {
      points: [
        { name: 'nodeB' },
        { name: 'jtB1' },
        { name: 'summer.or', io: 'B', input: 1 },
      ],
    },

    // 节点 B → NAND 门的 B 输入
    { points: [{ name: 'nodeB' }, { name: 'summer.nand', io: 'B', input: 1 }] },

    // ----- 输出连接 -----

    // AND 门输出 → 指示灯（最终结果）
    {
      points: [
        { name: 'summer.and', io: 'out' },
        { name: 'light', io: 'left' },
      ],
    },
  ],
}

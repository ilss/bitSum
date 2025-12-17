// Chapter14OneBitHalfAdder (c) Charles Petzold, 2024
//
// 单位半加器演示电路（One-Bit Half Adder Demo）
//
// 功能：展示半加器的完整功能，包含 Sum（和）和 Carry（进位）两个输出
//
// 与 Chapter14OneBitSum 的区别：
//   - OneBitSum：只显示 Sum 输出（XOR 结果）
//   - OneBitHalfAdder：显示 Sum 和 Carry 两个输出（完整半加器）
//
// 电路结构示意图：
//
//   [Button A] ──┬──→ [OR  ] ─┐
//                │            └──→ [AND] ──→ ● [lightSum]  "SUM"
//                │   [NAND] ─┘
//                │      ↑
//   [Button B] ──┼──────┴──────→ [AND] ──→ ● [lightCarry] "CARRY"
//                │                  ↑
//                └──────────────────┘
//
// 真值表：
//   A | B | Sum | Carry | 十进制含义
//   0 | 0 |  0  |   0   | 0 + 0 = 0
//   0 | 1 |  1  |   0   | 0 + 1 = 1
//   1 | 0 |  1  |   0   | 1 + 0 = 1
//   1 | 1 |  0  |   1   | 1 + 1 = 10（二进制）= 2（十进制）

let Chapter14OneBitHalfAdder = {
  // 组件名称标识符
  name: 'Chapter14OneBitHalfAdder',

  // ========== 画布变换设置 ==========
  transform: {
    x: 0, // X 轴偏移
    y: 0, // Y 轴偏移
    scale: 1, // 缩放比例
    rotate: 0, // 旋转角度
  },

  // ========== 信号传播延迟 ==========
  // 每个逻辑门的处理延迟（毫秒）
  propagationDelay: 100,

  // ========== 组件定义 ==========
  components: [
    // ----- 核心电路：半加器 -----
    // 引用外部组件 Chapter14OneBitHalfer
    // 包含：Summer（XOR 实现）+ carryAnd（进位与门）
    {
      name: 'halfer',
      type: 'External',
      file: 'Chapter14OneBitHalfer',
    },

    // ----- 用户输入：数字按钮 -----

    // button1: 输入 A
    // 位于 halfer 的 OR 门 A 输入端口左侧 170 像素
    {
      name: 'button1',
      type: 'DigitButton',
      x: -170,
      relative: { xy: { name: 'halfer.summer.or', io: 'A' } },
    },

    // button2: 输入 B
    // 与 button1 同一 X 坐标，Y 与 nodeB2 对齐
    {
      name: 'button2',
      type: 'DigitButton',
      relative: { x: { name: 'button1' }, y: { name: 'halfer.nodeB2' } },
    },

    // ----- 输出显示：两个指示灯 -----

    // lightSum: Sum（和）输出指示灯
    // 显示 A XOR B 的结果
    {
      name: 'lightSum',
      type: 'BitLight',
      x: 100,
      relative: { xy: { name: 'halfer.summer.and', io: 'out' } },
    },

    // lightCarry: Carry（进位）输出指示灯
    // 显示 A AND B 的结果
    // 与 lightSum 同一 X 坐标，Y 与 carryAnd 对齐
    {
      name: 'lightCarry',
      type: 'BitLight',
      relative: { x: { name: 'lightSum' }, y: { name: 'halfer.carryAnd' } },
    },

    // ----- 标签 -----

    // labelSum: "SUM" 标签
    // 在 lightSum 下方 50 像素，水平居中
    {
      name: 'labelSum',
      type: 'Label',
      text: 'SUM',
      xAlign: 0.5, // 水平居中对齐
      yAlign: 0, // 垂直顶部对齐
      y: 50, // 向下偏移 50 像素
      relative: { xy: { name: 'lightSum' } },
    },

    // labelCarry: "CARRY" 标签
    // 在 lightCarry 下方 50 像素，水平居中
    {
      name: 'labelCarry',
      type: 'Label',
      text: 'CARRY',
      xAlign: 0.5,
      yAlign: 0,
      y: 50,
      relative: { xy: { name: 'lightCarry' } },
    },
  ],

  // ========== 电线定义 ==========
  wires: [
    // ----- 输入连接 -----

    // button1 (A) → halfer 的 A 输入 (nodeA1)
    {
      points: [{ name: 'button1', io: 'right' }, { name: 'halfer.nodeA1' }],
    },

    // button2 (B) → halfer 的 B 输入 (nodeB2)
    {
      points: [{ name: 'button2', io: 'right' }, { name: 'halfer.nodeB2' }],
    },

    // ----- 内部补充连接 -----
    // B 信号到 summer.or 的 B 输入
    // 这条线补充了 halfer 内部未完成的连接
    {
      points: [
        { name: 'halfer.nodeB2' },
        { name: 'halfer.jt0' },
        { name: 'halfer.summer.or', io: 'B', input: 1 },
      ],
    },

    // ----- 输出连接 -----

    // Sum 输出 → lightSum
    {
      points: [
        { name: 'halfer.summer.and', io: 'out' },
        { name: 'lightSum', io: 'left' },
      ],
    },

    // Carry 输出 → lightCarry
    {
      points: [
        { name: 'halfer.carryAnd', io: 'out' },
        { name: 'lightCarry', io: 'left' },
      ],
    },
  ],
}

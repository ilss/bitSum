// Chapter14EightBitComponent (c) Charles Petzold, 2024
//
// 8位加法器的单位组件（One-Bit Slice）
//
// 功能：封装一个完整的"位片"，包含：
//   - 一个全加器（计算 A + B + CarryIn）
//   - 两个输入按钮（用户输入 A 和 B）
//   - 一个输出指示灯（显示 Sum）
//   - 进位连接点（用于与相邻位串联）
//
// 8个这样的组件水平排列，就组成了完整的 8 位加法器
//
// 电路布局示意图（旋转90度后的视图）：
//
//        [Button A]  ← 第一个加数的该位
//             │
//        [Button B]  ← 第二个加数的该位
//             │
//     ┌───────┴───────┐
//     │    fuller     │
//     │  (全加器)     │←── Carry In (从右侧低位传入)
//     │               │
//     └───────┬───────┘
//             │         ├──→ Carry Out (向左侧高位传出)
//             ↓
//         [Light]     ← Sum 结果显示

let Chapter14EightBitComponent = {
  // 组件名称标识符
  name: 'Chapter14EightBitComponent',

  // ========== 组件定义 ==========
  components: [
    // ----- 核心电路：全加器 -----
    // 全加器被缩小到 20% 并旋转 90 度
    // 这样在 8 位加法器中可以垂直紧凑排列
    {
      name: 'fuller',
      type: 'External',
      file: 'Chapter14OneBitFuller',
      scale: 0.2, // 缩放到 20%（原尺寸太大）
      rotate: 90, // 旋转 90 度（让进位链水平传播）
      x: 0,
      y: 0,
    },

    // ----- 用户输入：数字按钮 -----

    // buttonA: 第一个加数的该位输入
    // 位置在全加器 halfer1.nodeB2 上方 175 像素
    {
      name: 'buttonA',
      type: 'DigitButton',
      y: -175,
      relative: { xy: { name: 'fuller.halfer1.nodeB2' } },
    },

    // jtA1: A 信号的第一个转折点（buttonA 下方 20 像素）
    {
      name: 'jtA1',
      type: 'Joint',
      y: 20,
      relative: { xy: { name: 'buttonA', io: 'bottom' } },
    },

    // jtA2: A 信号的第二个转折点（用于走线到 fuller.halfer1.nodeA1）
    {
      name: 'jtA2',
      type: 'Joint',
      relative: {
        x: { name: 'fuller.halfer1.nodeA1' },
        y: { name: 'jtA1' },
      },
    },

    // buttonB: 第二个加数的该位输入
    // 位置在 buttonA 下方 100 像素
    {
      name: 'buttonB',
      type: 'DigitButton',
      y: 100,
      relative: { xy: { name: 'buttonA' } },
    },

    // ----- 输出显示：结果指示灯 -----

    // light: 显示该位的 Sum 结果
    // 位置在全加器 Sum 输出下方 100 像素
    {
      name: 'light',
      type: 'BitLight',
      y: 100,
      relative: { xy: { name: 'fuller.halfer2.summer.and' } },
    },

    // ----- 进位链连接点 -----
    // 用于连接相邻位之间的进位信号
    // 进位方向：右边（低位）→ 左边（高位）

    // jtCarry1: 进位输出的第一个转折点
    // 位置在 carryOr 输出下方 20 像素
    {
      name: 'jtCarry1',
      type: 'Joint',
      y: 20,
      relative: { xy: { name: 'fuller.carryOr', io: 'out' } },
    },

    // jtCarry2: 进位输出的第二个转折点
    // 向左偏移 20 像素（用于水平走线）
    {
      name: 'jtCarry2',
      type: 'Joint',
      x: -20,
      relative: { xy: { name: 'jtCarry1' } },
    },

    // jtCarry3: 进位输入的连接点
    // 在 halfer2.nodeA1 (CarryIn 入口) 右侧 20 像素
    // 由父组件 (Chapter14EightBitAdder) 连接到相邻位的 jtCarry2
    {
      name: 'jtCarry3',
      type: 'Joint',
      x: 20,
      relative: { xy: { name: 'fuller.halfer2.nodeA1' } },
    },
  ],

  // ========== 电线定义 ==========
  wires: [
    // ----- 输入 A 的连接 -----
    // buttonA → jtA1 → jtA2 → 全加器的 A 输入
    {
      points: [
        { name: 'buttonA', io: 'bottom' },
        { name: 'jtA1' },
        { name: 'jtA2' },
        { name: 'fuller.halfer1.nodeA1' },
      ],
    },

    // ----- 输入 B 的连接 -----
    // buttonB → 全加器的 B 输入
    {
      points: [
        { name: 'buttonB', io: 'bottom' },
        { name: 'fuller.halfer1.nodeB2' },
      ],
    },

    // ----- 内部连接：B 信号到 halfer1 的 OR 门 -----
    // 这条线补充半加器内部缺少的 B → OR.B 连接
    {
      points: [
        { name: 'fuller.halfer1.nodeB2' },
        { name: 'fuller.halfer1.jt0' },
        { name: 'fuller.halfer1.summer.or', io: 'B', input: 1 },
      ],
    },

    // ----- Sum 输出到指示灯 -----
    // 全加器的 Sum 输出 → 指示灯
    {
      points: [
        { name: 'fuller.halfer2.summer.and', io: 'out' },
        { name: 'light', io: 'top' },
      ],
    },

    // 注意：进位链的连接（jtCarry1 → jtCarry2 → 下一位的 jtCarry3 → nodeA1）
    // 由父组件 Chapter14EightBitAdder 完成
  ],

  // ========== 对外接口 ==========
  // 供父组件 (Chapter14EightBitAdder) 连接的接口：
  //
  // 输入：
  //   - buttonA: 用户输入 A 位
  //   - buttonB: 用户输入 B 位
  //   - fuller.halfer2.nodeA1: Carry In（进位输入，通过 jtCarry3 连接）
  //
  // 输出：
  //   - light: Sum 结果显示
  //   - fuller.carryOr.out: Carry Out（进位输出，通过 jtCarry1、jtCarry2 连接）
}

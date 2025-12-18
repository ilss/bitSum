// Chapter14OneBitFuller (c) Charles Petzold, 2024
//
// 全加器（Full Adder）- 完整的单位二进制加法器
//
// 为什么叫"全"加器？
//   因为它有三个输入：A、B 和 Carry In（来自低位的进位）
//   而半加器只有两个输入（A 和 B），无法处理进位链
//
// 实现原理：用两个半加器级联
//   第一个半加器：计算 A + B，得到 Sum1 和 Carry1
//   第二个半加器：计算 Sum1 + CarryIn，得到最终 Sum 和 Carry2
//   最终进位：Carry = Carry1 OR Carry2
//
// 逻辑功能：
//   Sum      = A ⊕ B ⊕ CarryIn
//   CarryOut = (A · B) + ((A ⊕ B) · CarryIn)
//
// 真值表：
//   A | B | Cin | Sum | Cout | 含义
//   0 | 0 |  0  |  0  |   0  | 0 + 0 + 0 = 0
//   0 | 0 |  1  |  1  |   0  | 0 + 0 + 1 = 1
//   0 | 1 |  0  |  1  |   0  | 0 + 1 + 0 = 1
//   0 | 1 |  1  |  0  |   1  | 0 + 1 + 1 = 10
//   1 | 0 |  0  |  1  |   0  | 1 + 0 + 0 = 1
//   1 | 0 |  1  |  0  |   1  | 1 + 0 + 1 = 10
//   1 | 1 |  0  |  0  |   1  | 1 + 1 + 0 = 10
//   1 | 1 |  1  |  1  |   1  | 1 + 1 + 1 = 11
//
// 电路结构示意图：
//
//   A ─────────→ ┌──────────┐
//                │ halfer1  │─── Sum1 ──→ ┌──────────┐
//   B ─────────→ │(半加器1) │              │ halfer2  │──→ Sum (最终和)
//                └────┬─────┘   CarryIn ─→ │(半加器2) │
//                     │                    └────┬─────┘
//                     │ Carry1                  │ Carry2
//                     │                         │
//                     └────────→ [OR] ←─────────┘
//                                  │
//                                  ↓
//                             CarryOut (最终进位)

let Chapter14OneBitFuller = {
  // 组件名称标识符
  name: 'Chapter14OneBitFuller',

  // ========== 组件定义 ==========
  components: [
    // ----- 核心电路：两个半加器 -----

    // 半加器1：计算 A + B
    // 输入：A (通过 halfer1.nodeA1), B (通过 halfer1.nodeB2)
    // 输出：Sum1 (halfer1.summer.and.out), Carry1 (halfer1.carryAnd.out)
    {
      name: 'halfer1',
      type: 'External',
      file: 'Chapter14OneBitHalfer',
      x: 100,
    },

    // 半加器2：计算 Sum1 + CarryIn
    // 输入：Sum1 (从 halfer1 传来), CarryIn (通过 halfer2.nodeA1)
    // 输出：最终 Sum (halfer2.summer.and.out), Carry2 (halfer2.carryAnd.out)
    {
      name: 'halfer2',
      type: 'External',
      file: 'Chapter14OneBitHalfer',
      x: 600,
    },

    // ----- 中间连接节点 -----

    // nodeB1: Sum1 信号的分发点
    // 将半加器1的和输出分发到半加器2的两个输入（nodeB2 和 summer.or）
    {
      name: 'nodeB1',
      type: 'Node',
      relative: {
        x: { name: 'halfer2.nodeB2' },
        y: { name: 'halfer1.summer.and', io: 'out' },
      },
    },

    // ----- 进位合并电路 -----

    // carryOr: 进位或门
    // 将两个半加器的进位输出合并：CarryOut = Carry1 OR Carry2
    // 因为 A+B=1 且 Cin=1 时，两个进位不可能同时为1，所以用 OR 即可
    {
      name: 'carryOr',
      type: 'OrGate',
      relative: {
        x: { name: 'halfer2.summer.and' },
        y: { name: 'halfer2.carryAnd', io: 'B' },
      },
    },

    // ----- 进位走线的转折点 -----
    // 用于将 halfer1 的进位信号绕到 carryOr 的 B 输入

    // jtCarry1: Carry1 输出右侧的第一个转折点
    {
      name: 'jtCarry1',
      type: 'Joint',
      x: 125,
      relative: { xy: { name: 'halfer1.carryAnd', io: 'out' } },
    },

    // jtCarry2: 向下延伸的转折点
    {
      name: 'jtCarry2',
      type: 'Joint',
      y: 100,
      relative: { xy: { name: 'jtCarry1' } },
    },

    // jtCarry4: carryOr B 输入左侧的转折点
    {
      name: 'jtCarry4',
      type: 'Joint',
      x: -50,
      relative: { xy: { name: 'carryOr', io: 'B' } },
    },

    // jtCarry3: 连接 jtCarry2 和 jtCarry4 的拐角
    {
      name: 'jtCarry3',
      type: 'Joint',
      relative: { x: { name: 'jtCarry4' }, y: { name: 'jtCarry2' } },
    },
  ],

  // ========== 电线定义 ==========
  wires: [
    // ----- Sum1 信号传递（halfer1 → halfer2）-----

    // halfer1 的 Sum 输出 → 分发节点 nodeB1
    {
      points: [{ name: 'halfer1.summer.and', io: 'out' }, { name: 'nodeB1' }],
    },

    // nodeB1 → halfer2 的 B 输入（nodeB2）
    { points: [{ name: 'nodeB1' }, { name: 'halfer2.nodeB2' }] },

    // nodeB1 → halfer2 的 OR 门 B 输入
    // 这条线让 Sum1 同时进入 halfer2 的 OR 和 NAND（完成 XOR 计算）
    {
      points: [
        { name: 'nodeB1' },
        { name: 'halfer2.jt0' },
        { name: 'halfer2.summer.or', io: 'B', input: 1 },
      ],
    },

    // ----- 进位合并电路 -----

    // Carry2（halfer2 的进位）→ carryOr 的 A 输入
    {
      points: [
        { name: 'halfer2.carryAnd', io: 'out' },
        { name: 'carryOr', io: 'A', input: 0 },
      ],
    },

    // Carry1（halfer1 的进位）→ carryOr 的 B 输入
    // 经过 4 个转折点绕行到 OR 门
    {
      points: [
        { name: 'halfer1.carryAnd', io: 'out' }, // Carry1 输出
        { name: 'jtCarry1' }, // 转折点1：向右
        { name: 'jtCarry2' }, // 转折点2：向下
        { name: 'jtCarry3' }, // 转折点3：向右
        { name: 'jtCarry4' }, // 转折点4：向上
        { name: 'carryOr', io: 'B', input: 1 }, // OR 门 B 输入
      ],
    },

    // 缺失的 B 输入到 halfer1 OR 门的连接
    {
      points: [
        { name: 'halfer1.nodeB2' },
        { name: 'halfer1.jt0' },
        { name: 'halfer1.summer.or', io: 'B', input: 1 },
      ],
    },
  ],

  // ========== 对外接口 ==========
  // 输入：
  //   - halfer1.nodeA1: A 输入
  //   - halfer1.nodeB2: B 输入
  //   - halfer2.nodeA1: Carry In（进位输入）
  // 输出：
  //   - halfer2.summer.and.out: Sum（和位输出）
  //   - carryOr.out: Carry Out（进位输出）
}

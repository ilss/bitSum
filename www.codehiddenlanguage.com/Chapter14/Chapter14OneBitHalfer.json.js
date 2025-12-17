/*
 * @Author: Liang Liang
 * @Date: 2024-06-25 23:50:37
 * @Description: 单位半加器 - 计算两个二进制位相加的"和"与"进位"
 */

//
// 半加器（Half Adder）- 二进制加法的基础单元
//
// 为什么叫"半"加器？
//   因为它只能处理两个输入位（A 和 B），不能处理来自低位的进位输入。
//   需要两个半加器才能组成一个"全加器"（Full Adder）。
//
// 逻辑功能：
//   Sum   = A XOR B  （异或 - 和位）
//   Carry = A AND B  （与   - 进位）
//
// 真值表：
//   A | B | Sum | Carry | 含义
//   0 | 0 |  0  |   0   | 0 + 0 = 0
//   0 | 1 |  1  |   0   | 0 + 1 = 1
//   1 | 0 |  1  |   0   | 1 + 0 = 1
//   1 | 1 |  0  |   1   | 1 + 1 = 10 (二进制)，即 Sum=0, Carry=1
//
// 电路结构示意图：
//
//              ┌─────────────────────────────┐
//              │      Summer (XOR 实现)       │
//              │  ┌────┐                     │
//   A ──┬──────┼─→│ OR │─┐    ┌─────┐       │
//       │      │  └────┘ └───→│     │       │
//       │      │              │ AND │───────┼──→ Sum
//       │      │  ┌─────┐ ┌──→│     │       │
//       │  ┌───┼─→│NAND │─┘   └─────┘       │
//       │  │   │  └─────┘                   │
//   B ──┼──┤   └─────────────────────────────┘
//       │  │
//       │  │   ┌─────┐
//       └──┴──→│ AND │──────────────────────────→ Carry
//              └─────┘
//              (carryAnd)

let Chapter14OneBitHalfer = {
  // 组件名称标识符
  name: 'Chapter14OneBitHalfer',

  // ========== 组件定义 ==========
  components: [
    // ----- 核心电路 -----

    // 求和器：计算 Sum = A XOR B
    // 引用外部组件 Chapter14OneBitSummer（包含 OR + NAND + AND 实现的 XOR）
    { name: 'summer', type: 'External', file: 'Chapter14OneBitSummer' },

    // 进位与门：计算 Carry = A AND B
    // 当且仅当 A=1 且 B=1 时，产生进位
    {
      name: 'carryAnd',
      type: 'AndGate',
      x: 240,
      y: 400,
      fillColor: '#c3f5c3',
      showValue: true,
    },

    // ----- 信号分发节点 -----
    // Node: 将一个输入信号分发到多个目标（一进多出）

    // nodeA1: A 信号的第一级分发点
    // 将 A 分发到：nodeA2（继续分发）和 summer.or
    {
      name: 'nodeA1',
      type: 'Node',
      x: 200,
      relative: { y: { name: 'summer.or', io: 'A' } },
    },

    // nodeA2: A 信号的第二级分发点
    // 将 A 分发到：summer.nand 和 carryAnd
    {
      name: 'nodeA2',
      type: 'Node',
      x: 200,
      relative: { y: { name: 'summer.nand', io: 'A' } },
    },

    // nodeB2: B 信号的分发点
    // 将 B 分发到：summer.or、summer.nand 和 carryAnd
    {
      name: 'nodeB2',
      type: 'Node',
      x: 150,
      relative: { y: { name: 'summer.nand', io: 'B' } },
    },

    // ----- 电线转折点 -----
    // Joint: 电线的拐角点，用于整齐的走线布局

    // jt1: A 信号到进位与门的转折点
    {
      name: 'jt1',
      type: 'Joint',
      relative: { x: { name: 'nodeA2' }, y: { name: 'carryAnd', io: 'A' } },
    },

    // jt2: B 信号到进位与门的转折点
    {
      name: 'jt2',
      type: 'Joint',
      relative: { x: { name: 'nodeB2' }, y: { name: 'carryAnd', io: 'B' } },
    },

    // jt0: B 信号到 OR 门的转折点
    {
      name: 'jt0',
      type: 'Joint',
      relative: { x: { name: 'nodeB2' }, y: { name: 'summer.or', io: 'B' } },
    },
  ],

  // ========== 电线定义 ==========
  // 连接组件，定义信号传播路径
  wires: [
    // ----- A 信号的分发路径 -----

    // nodeA1 → OR 门的 A 输入（用于 XOR 计算）
    { points: [{ name: 'nodeA1' }, { name: 'summer.or', io: 'A', input: 0 }] },

    // nodeA1 → nodeA2（信号继续传递）
    { points: [{ name: 'nodeA1' }, { name: 'nodeA2' }] },

    // nodeA2 → NAND 门的 A 输入（用于 XOR 计算）
    {
      points: [{ name: 'nodeA2' }, { name: 'summer.nand', io: 'A', input: 0 }],
    },

    // nodeA2 → 进位与门的 A 输入（用于 Carry 计算）
    {
      points: [
        { name: 'nodeA2' },
        { name: 'jt1' }, // 转折点
        { name: 'carryAnd', io: 'A', input: 0 },
      ],
    },

    // ----- B 信号的分发路径 -----

    // nodeB2 → NAND 门的 B 输入（用于 XOR 计算）
    {
      points: [{ name: 'nodeB2' }, { name: 'summer.nand', io: 'B', input: 1 }],
    },

    // nodeB2 → 进位与门的 B 输入（用于 Carry 计算）
    {
      points: [
        { name: 'nodeB2' },
        { name: 'jt2' }, // 转折点
        { name: 'carryAnd', io: 'B', input: 1 },
      ],
    },

    // 注意：nodeB2 → summer.or 的连接由父组件（Chapter14OneBitHalfAdder 或 Fuller）完成
    // 这里的 jt0 只是预留的转折点位置
  ],

  // ========== 对外接口 ==========
  // 输入：
  //   - nodeA1: A 输入信号入口
  //   - nodeB2: B 输入信号入口
  // 输出：
  //   - summer.and.out: Sum（和位）输出
  //   - carryAnd.out: Carry（进位）输出
}

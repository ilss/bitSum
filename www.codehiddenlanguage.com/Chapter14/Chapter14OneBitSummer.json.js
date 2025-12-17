// Chapter14OneBitSummer (c) Charles Petzold, 2024
//
// 单位求和器 - 实现异或(XOR)逻辑，计算两个二进制位相加的"和"
//
// 逻辑原理：
//   XOR(A, B) = (A OR B) AND (A NAND B)
//            = (A + B) · !(A · B)
//            = A ⊕ B
//
// 真值表：
//   A | B | OR  | NAND | AND(最终输出)
//   0 | 0 |  0  |   1  |      0
//   0 | 1 |  1  |   1  |      1
//   1 | 0 |  1  |   1  |      1
//   1 | 1 |  1  |   0  |      0
//
// 电路图示意：
//        ┌────────┐
//   A ───┤        │
//        │   OR   ├───┐
//   B ───┤        │   │    ┌────────┐
//        └────────┘   └────┤ A      │
//                          │  AND   ├─── Sum (A ⊕ B)
//        ┌────────┐   ┌────┤ B      │
//   A ───┤        │   │    └────────┘
//        │  NAND  ├───┘
//   B ───┤        │
//        └────────┘

let Chapter14OneBitSummer = {
  // 组件名称标识符，用于被其他组件引用
  name: 'Chapter14OneBitSummer',

  // ========== 组件定义 ==========
  // 定义电路中的所有元件（逻辑门、连接点等）
  components: [
    // ----- 核心逻辑门 -----

    // OR 门：计算 A OR B
    // x, y 为绝对坐标位置（像素）
    { name: 'or', type: 'OrGate', x: 250, y: 100 },

    // NAND 门：计算 A NAND B = !(A AND B)
    // fillColor: 浅橙色背景
    {
      name: 'nand',
      type: 'NandGate',
      x: 240,
      y: 250,
      fillColor: '#ffd9a1',
      showValue: true,
    },

    // AND 门：将 OR 和 NAND 的输出相与，得到最终的 XOR 结果
    // fillColor: 设置门内部填充颜色（浅绿色）
    // showValue: 在门中心显示输出值（0 或 1）
    {
      name: 'and',
      type: 'AndGate',
      x: 480,
      y: 175,
      fillColor: '#c3f5c3',
      showValue: true,
    },

    // ----- 连接点（Joint）-----
    // Joint 是电线的转折点，用于布局走线

    // jtOr2: 位于 AND 门 A 输入端口左侧 50 像素处
    // relative.xy 表示相对于指定组件的端口位置
    {
      name: 'jtOr2',
      type: 'Joint',
      x: -50,
      relative: { xy: { name: 'and', io: 'A' } },
    },

    // jtOr1: x 与 jtOr2 对齐，y 与 OR 门输出端口对齐
    // 这样形成一个 "L" 形走线：or.out → jtOr1 → jtOr2 → and.A
    {
      name: 'jtOr1',
      type: 'Joint',
      relative: { x: { name: 'jtOr2' }, y: { name: 'or', io: 'out' } },
    },

    // jtNand2: 位于 AND 门 B 输入端口左侧 50 像素处
    {
      name: 'jtNand2',
      type: 'Joint',
      x: -50,
      relative: { xy: { name: 'and', io: 'B' } },
    },

    // jtNand1: x 与 jtNand2 对齐，y 与 NAND 门输出端口对齐
    // 形成走线：nand.out → jtNand1 → jtNand2 → and.B
    {
      name: 'jtNand1',
      type: 'Joint',
      relative: { x: { name: 'jtNand2' }, y: { name: 'nand', io: 'out' } },
    },
  ],

  // ========== 电线定义 ==========
  // 定义组件之间的连接关系和信号传播路径
  wires: [
    // 电线1: OR 门输出 → AND 门的 A 输入
    // points 数组定义电线经过的点（按顺序）
    // io: "out" 表示输出端口，io: "A" 表示 A 输入端口
    // input: 0 表示这是目标门的第一个输入（A输入）
    {
      points: [
        { name: 'or', io: 'out' }, // 起点：OR 门输出
        { name: 'jtOr1' }, // 转折点1
        { name: 'jtOr2' }, // 转折点2
        { name: 'and', io: 'A', input: 0 }, // 终点：AND 门 A 输入
      ],
    },

    // 电线2: NAND 门输出 → AND 门的 B 输入
    // input: 1 表示这是目标门的第二个输入（B输入）
    {
      points: [
        { name: 'nand', io: 'out' }, // 起点：NAND 门输出
        { name: 'jtNand1' }, // 转折点1
        { name: 'jtNand2' }, // 转折点2
        { name: 'and', io: 'B', input: 1 }, // 终点：AND 门 B 输入
      ],
    },
  ],

  // 注意：OR 和 NAND 门的输入（A, B）由父组件（Chapter14OneBitHalfer）连接
  // 最终输出（and.out）也由父组件读取并连接到下游
}

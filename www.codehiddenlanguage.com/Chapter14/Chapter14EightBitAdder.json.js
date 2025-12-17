// Chapter14EightBitAdder (c) Charles Petzold, 2024
//
// 完整的 8 位加法器（8-Bit Adder）- 顶层电路配置
//
// 功能：将两个 8 位二进制数相加，产生 9 位结果（8位和 + 1位进位）
//
// 布局示意图：
//
//   Bit 7    Bit 6    Bit 5    Bit 4    Bit 3    Bit 2    Bit 1    Bit 0
//     ↓        ↓        ↓        ↓        ↓        ↓        ↓        ↓
//   [A7]     [A6]     [A5]     [A4]     [A3]     [A2]     [A1]     [A0]   → num1 (十进制)
//   [B7]     [B6]     [B5]     [B4]     [B3]     [B2]     [B1]     [B0]   → num2 (十进制)
//     │        │        │        │        │        │        │        │
//   ┌─┴─┐    ┌─┴─┐    ┌─┴─┐    ┌─┴─┐    ┌─┴─┐    ┌─┴─┐    ┌─┴─┐    ┌─┴─┐
//   │FA7│←───│FA6│←───│FA5│←───│FA4│←───│FA3│←───│FA2│←───│FA1│←───│FA0│←── 0
//   └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘   (Ground)
//     │        │        │        │        │        │        │        │
//     ↓        ↓        ↓        ↓        ↓        ↓        ↓        ↓
//   [S7]     [S6]     [S5]     [S4]     [S3]     [S2]     [S1]     [S0]   → sum (十进制)
//     │
//     ↓
// [Carry] ← 溢出进位（第9位）
//
// ← 表示进位传播方向（Ripple Carry，波纹进位）

let Chapter14EightBitAdder = {
  // 组件名称标识符
  name: 'Chapter14EightBitAdder',

  // ========== 画布变换设置 ==========
  transform: {
    x: -10, // X 轴偏移（向左微调）
    y: 200, // Y 轴偏移（向下移动以留出标签空间）
    scale: 1, // 缩放比例（原始大小）
    rotate: 0, // 旋转角度
  },

  // ========== 全局参数 ==========
  propagationDelay: 100, // 信号传播延迟 100ms（让用户能看到波纹进位）
  nodeRadius: 3, // 节点圆点半径（比默认值小，更紧凑）
  wireCurveRadius: 5, // 电线转角圆弧半径（比默认值小）

  // ========== 组件定义 ==========
  components: [
    // ===== 8个单位加法器（从右到左排列）=====
    // x 坐标从大到小，对应 Bit 0 到 Bit 7
    // 每个 adder 包含：全加器 + 2个按钮 + 1个指示灯 + 进位连接点

    // Bit 0（最低位，最右边）- 接收来自 Ground 的 CarryIn = 0
    {
      name: 'adder0',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 1050,
    },

    // Bit 1
    {
      name: 'adder1',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 930,
    },

    // Bit 2
    {
      name: 'adder2',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 810,
    },

    // Bit 3
    {
      name: 'adder3',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 690,
    },

    // Bit 4
    {
      name: 'adder4',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 570,
    },

    // Bit 5
    {
      name: 'adder5',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 450,
    },

    // Bit 6
    {
      name: 'adder6',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 330,
    },

    // Bit 7（最高位，最左边）- CarryOut 送到 carryLight
    {
      name: 'adder7',
      type: 'External',
      file: 'Chapter14EightBitComponent',
      x: 210,
    },

    // ===== 位标签（显示 "Bit 0" 到 "Bit 7"）=====
    // 位于每个 adder 的 buttonA 上方 45 像素

    {
      name: 'b0',
      type: 'Label',
      text: 'Bit 0',
      y: -45,
      relative: { xy: { name: 'adder0.buttonA' } },
    },
    {
      name: 'b1',
      type: 'Label',
      text: 'Bit 1',
      y: -45,
      relative: { xy: { name: 'adder1.buttonA' } },
    },
    {
      name: 'b2',
      type: 'Label',
      text: 'Bit 2',
      y: -45,
      relative: { xy: { name: 'adder2.buttonA' } },
    },
    {
      name: 'b3',
      type: 'Label',
      text: 'Bit 3',
      y: -45,
      relative: { xy: { name: 'adder3.buttonA' } },
    },
    {
      name: 'b4',
      type: 'Label',
      text: 'Bit 4',
      y: -45,
      relative: { xy: { name: 'adder4.buttonA' } },
    },
    {
      name: 'b5',
      type: 'Label',
      text: 'Bit 5',
      y: -45,
      relative: { xy: { name: 'adder5.buttonA' } },
    },
    {
      name: 'b6',
      type: 'Label',
      text: 'Bit 6',
      y: -45,
      relative: { xy: { name: 'adder6.buttonA' } },
    },
    {
      name: 'b7',
      type: 'Label',
      text: 'Bit 7',
      y: -45,
      relative: { xy: { name: 'adder7.buttonA' } },
    },

    // ===== 接地（Ground）=====
    // Bit 0 的 CarryIn 接地，表示初始进位为 0

    {
      name: 'ground',
      type: 'Ground',
      x: 35,
      y: 25,
      relative: { xy: { name: 'adder0.fuller.halfer2.nodeA1' } },
    },

    // 接地连接的转折点
    {
      name: 'gndJoint',
      type: 'Joint',
      relative: {
        x: { name: 'ground' },
        y: { name: 'adder0.fuller.halfer2.nodeA1' },
      },
    },

    // ===== 加号标签 =====
    // 显示在第一行和第二行按钮之间，表示加法运算

    {
      name: 'plus',
      type: 'Label',
      text: '+',
      x: -75,
      y: 7,
      size: 4, // 字体大小倍数
      relative: { xy: { name: 'adder7.buttonB' } },
    },

    // ===== 最终进位指示灯 =====
    // 显示第 9 位（溢出进位），位于 adder7 左侧

    {
      name: 'carryLight',
      type: 'BitLight',
      x: -120,
      relative: { xy: { name: 'adder7.light' } },
    },

    // 最终进位的走线转折点
    {
      name: 'jt1',
      type: 'Joint',
      y: 25,
      relative: { xy: { name: 'adder7.fuller.carryOr', io: 'out' } },
    },
    {
      name: 'jt2',
      type: 'Joint',
      relative: { x: { name: 'carryLight' }, y: { name: 'jt1' } },
    },

    // ===== 动态十进制显示 =====
    // 实时显示输入和输出的十进制/十六进制值

    // num1: 第一个加数的十进制显示（第一行按钮）
    // digits 对象映射每一位到对应的按钮组件
    {
      name: 'num1',
      type: 'DynamicDecimal',
      text: '0',
      x: 120,
      relative: { xy: { name: 'adder0.buttonA' } },
      digits: {
        0: 'adder0.buttonA', // 2^0 = 1
        1: 'adder1.buttonA', // 2^1 = 2
        2: 'adder2.buttonA', // 2^2 = 4
        3: 'adder3.buttonA', // 2^3 = 8
        4: 'adder4.buttonA', // 2^4 = 16
        5: 'adder5.buttonA', // 2^5 = 32
        6: 'adder6.buttonA', // 2^6 = 64
        7: 'adder7.buttonA', // 2^7 = 128
      },
    },

    // num2: 第二个加数的十进制显示（第二行按钮）
    {
      name: 'num1', // 注：原文件名字重复，不影响功能
      type: 'DynamicDecimal',
      text: '0',
      x: 120,
      relative: { xy: { name: 'adder0.buttonB' } },
      digits: {
        0: 'adder0.buttonB',
        1: 'adder1.buttonB',
        2: 'adder2.buttonB',
        3: 'adder3.buttonB',
        4: 'adder4.buttonB',
        5: 'adder5.buttonB',
        6: 'adder6.buttonB',
        7: 'adder7.buttonB',
      },
    },

    // sum: 计算结果的十进制显示（9位，包含溢出进位）
    {
      name: 'sum',
      type: 'DynamicDecimal',
      text: '0',
      x: 120,
      relative: { xy: { name: 'adder0.light' } },
      digits: {
        0: 'adder0.light', // Sum 的第 0 位
        1: 'adder1.light', // Sum 的第 1 位
        2: 'adder2.light', // Sum 的第 2 位
        3: 'adder3.light', // Sum 的第 3 位
        4: 'adder4.light', // Sum 的第 4 位
        5: 'adder5.light', // Sum 的第 5 位
        6: 'adder6.light', // Sum 的第 6 位
        7: 'adder7.light', // Sum 的第 7 位
        8: 'carryLight', // Sum 的第 8 位（溢出进位，2^8 = 256）
      },
    },
  ],

  // ========== 电线定义 ==========
  // 主要连接进位链：从 Ground 开始，经过 8 个全加器，最后到 carryLight
  wires: [
    // ===== Ground 连接 =====
    // Bit 0 的 CarryIn 接地（初始进位 = 0）
    {
      points: [
        { name: 'adder0.fuller.halfer2.nodeA1' }, // Bit 0 的 CarryIn 入口
        { name: 'gndJoint' }, // 转折点
        { name: 'ground' }, // 接地符号
      ],
    },

    // ===== 进位链连接 =====
    // 波纹进位：每一位的 CarryOut 连接到下一位的 CarryIn
    // 路径：carryOr.out → jtCarry1 → jtCarry2 → (下一位) jtCarry3 → nodeA1

    // Bit 0 → Bit 1
    {
      points: [
        { name: 'adder0.fuller.carryOr', io: 'out' }, // Bit 0 的 CarryOut
        { name: 'adder0.jtCarry1' },
        { name: 'adder0.jtCarry2' },
        { name: 'adder1.jtCarry3' },
        { name: 'adder1.fuller.halfer2.nodeA1' }, // Bit 1 的 CarryIn
      ],
    },

    // Bit 1 → Bit 2
    {
      points: [
        { name: 'adder1.fuller.carryOr', io: 'out' },
        { name: 'adder1.jtCarry1' },
        { name: 'adder1.jtCarry2' },
        { name: 'adder2.jtCarry3' },
        { name: 'adder2.fuller.halfer2.nodeA1' },
      ],
    },

    // Bit 2 → Bit 3
    {
      points: [
        { name: 'adder2.fuller.carryOr', io: 'out' },
        { name: 'adder2.jtCarry1' },
        { name: 'adder2.jtCarry2' },
        { name: 'adder3.jtCarry3' },
        { name: 'adder3.fuller.halfer2.nodeA1' },
      ],
    },

    // Bit 3 → Bit 4
    {
      points: [
        { name: 'adder3.fuller.carryOr', io: 'out' },
        { name: 'adder3.jtCarry1' },
        { name: 'adder3.jtCarry2' },
        { name: 'adder4.jtCarry3' },
        { name: 'adder4.fuller.halfer2.nodeA1' },
      ],
    },

    // Bit 4 → Bit 5
    {
      points: [
        { name: 'adder4.fuller.carryOr', io: 'out' },
        { name: 'adder4.jtCarry1' },
        { name: 'adder4.jtCarry2' },
        { name: 'adder5.jtCarry3' },
        { name: 'adder5.fuller.halfer2.nodeA1' },
      ],
    },

    // Bit 5 → Bit 6
    {
      points: [
        { name: 'adder5.fuller.carryOr', io: 'out' },
        { name: 'adder5.jtCarry1' },
        { name: 'adder5.jtCarry2' },
        { name: 'adder6.jtCarry3' },
        { name: 'adder6.fuller.halfer2.nodeA1' },
      ],
    },

    // Bit 6 → Bit 7
    {
      points: [
        { name: 'adder6.fuller.carryOr', io: 'out' },
        { name: 'adder6.jtCarry1' },
        { name: 'adder6.jtCarry2' },
        { name: 'adder7.jtCarry3' },
        { name: 'adder7.fuller.halfer2.nodeA1' },
      ],
    },

    // ===== 最终进位输出 =====
    // Bit 7 的 CarryOut → carryLight（溢出指示灯）
    {
      points: [
        { name: 'adder7.fuller.carryOr', io: 'out' }, // Bit 7 的 CarryOut
        { name: 'jt1' }, // 转折点1
        { name: 'jt2' }, // 转折点2
        { name: 'carryLight', io: 'top' }, // 溢出进位指示灯
      ],
    },
  ],
}

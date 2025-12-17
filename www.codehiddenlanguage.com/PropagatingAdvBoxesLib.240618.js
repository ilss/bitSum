// PropagatingAdvBoxesLib (c) Charles Petzold, 2024
//
// 高级盒子组件库
// 定义位运算单元、算术运算单元和逻辑运算单元等高级组件
// 用于构建 ALU（算术逻辑单元）

/**
 * Bitwise 类
 * 位运算基类 - BitwiseAnd、BitwiseOr、BitwiseXor 的父类
 * 对两个 8 位输入进行按位运算
 */
class Bitwise extends Box {
  /**
   * 构造函数
   * @param {Object} layout - 布局对象（CircuitBuilder实例）
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {CanvasRenderingContext2D} ctx - 画布2D上下文
   * @param {string} id - 组件唯一标识符
   * @param {Object} params - 参数配置对象
   */
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.a = 0 // 输入 A（8位）
    this.b = 0 // 输入 B（8位）
  }

  /**
   * 设置输入值
   * @param {string} inp - 输入端口名称："a" 或 "b"
   * @param {number} value - 8位输入值（0-255）
   */
  setInput(inp, value) {
    switch (inp) {
      case 'a':
        this.a = value
        break

      case 'b':
        this.b = value
        break
    }
    this.setOutputs()
  }

  /**
   * 计算并设置输出
   * 调用 operation() 方法执行具体的位运算
   */
  setOutputs() {
    this.output = this.operation(this.a, this.b)
    this.propagate('output', this.output)
  }

  /**
   * 位运算操作（由派生类实现）
   * @param {number} a - 输入A
   * @param {number} b - 输入B
   * @returns {number} 运算结果
   */
  operation(a, b) {
    return 0
  }
}

/**
 * BitwiseAnd 类
 * 按位与运算 - 对两个 8 位数进行 AND 运算
 * 逻辑：output = a & b
 */
class BitwiseAnd extends Bitwise {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 按位与运算
   * @param {number} a - 输入A
   * @param {number} b - 输入B
   * @returns {number} a AND b
   */
  operation(a, b) {
    return a & b
  }
}

/**
 * BitwiseOr 类
 * 按位或运算 - 对两个 8 位数进行 OR 运算
 * 逻辑：output = a | b
 */
class BitwiseOr extends Bitwise {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 按位或运算
   * @param {number} a - 输入A
   * @param {number} b - 输入B
   * @returns {number} a OR b
   */
  operation(a, b) {
    return a | b
  }
}

/**
 * BitwiseXor 类
 * 按位异或运算 - 对两个 8 位数进行 XOR 运算
 * 逻辑：output = a ^ b
 */
class BitwiseXor extends Bitwise {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 按位异或运算
   * @param {number} a - 输入A
   * @param {number} b - 输入B
   * @returns {number} a XOR b
   */
  operation(a, b) {
    return a ^ b
  }
}

/**
 * ArithmeticUnit 类
 * 算术运算单元 - 执行加法和减法运算
 * 支持 4 种运算模式：ADD、ADC（带进位加）、SUB、SBB（带借位减）
 *
 * 功能选择（f1, f0）：
 *   00 = ADD（加法）
 *   01 = ADC（带进位加法）
 *   10 = SUB（减法）
 *   11 = SBB（带借位减法）
 */
class ArithmeticUnit extends Box {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.a = 0 // 输入 A（8位操作数）
    this.b = 0 // 输入 B（8位操作数）
    this.f1 = false // 功能选择位1
    this.f0 = false // 功能选择位0
    this.ci = false // 进位输入（Carry In）
    this.co = false // 进位输出（Carry Out）
  }

  /**
   * 设置输入值
   * @param {string} inp - 输入端口名称："a"、"b"、"f1"、"f0"、"ci"
   * @param {*} value - 输入值
   */
  setInput(inp, value) {
    switch (inp) {
      case 'a':
        this.a = value
        break

      case 'b':
        this.b = value
        break

      case 'f1':
        this.f1 = value
        break

      case 'f0':
        this.f0 = value
        break

      case 'ci':
        this.ci = value
        break
    }

    this.setOutputs()
  }

  /**
   * 计算并设置输出
   * 根据功能选择位执行相应的算术运算
   */
  setOutputs() {
    // 将功能选择位组合成 0-3 的数值
    let func = (this.f1 ? 2 : 0) + (this.f0 ? 1 : 0)

    switch (func) {
      case 0: // ADD：加法
        this.output = this.a + this.b
        this.co = this.output > 255 // 溢出产生进位
        break

      case 1: // ADC：带进位加法
        this.output = this.a + this.b + (this.ci ? 1 : 0)
        this.co = this.output > 255 // 溢出产生进位
        break

      case 2: // SUB：减法
        this.output = this.a - this.b
        this.co = this.output < 0 // 负数产生借位
        break

      case 3: // SBB：带借位减法
        this.output = this.a - this.b - (this.ci ? 1 : 0)
        this.co = this.output < 0 // 负数产生借位
        break
    }

    // 截取低8位（0-255）
    this.output &= 0xff

    // 传播输出信号
    this.propagate('output', this.output)
    this.propagate('co', this.co)
  }
}

/**
 * LogicUnit 类
 * 逻辑运算单元 - 执行按位逻辑运算
 * 继承自 TriStateBox，支持三态输出（高阻态）
 *
 * 功能选择（f2, f1, f0）：
 *   100 = AND（按位与）
 *   101 = XOR（按位异或）
 *   110 = OR（按位或）
 *   111 = CMP（比较/传递）
 *   其他 = 高阻态（禁用输出）
 */
class LogicUnit extends TriStateBox {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.a = 0 // 输入 A（8位操作数）
    this.b = 0 // 输入 B（8位操作数）
    this.f2 = false // 功能选择位2
    this.f1 = false // 功能选择位1
    this.f0 = false // 功能选择位0
    this.input = 0 // 计算结果
    this.output = NaN // 输出值（NaN 表示高阻态）
    this.enable = false // 输出使能
  }

  /**
   * 设置输入值
   * @param {string} inp - 输入端口名称："a"、"b"、"f2"、"f1"、"f0"
   * @param {*} value - 输入值
   */
  setInput(inp, value) {
    switch (inp) {
      case 'a':
        this.a = value
        break

      case 'b':
        this.b = value
        break

      case 'f2':
        this.f2 = value
        break

      case 'f1':
        this.f1 = value
        break

      case 'f0':
        this.f0 = value
        break
    }

    this.setOutputs()
  }

  /**
   * 计算并设置输出
   * 根据功能选择位执行相应的逻辑运算
   */
  setOutputs() {
    // 将功能选择位组合成 0-7 的数值
    let func = (this.f2 ? 4 : 0) + (this.f1 ? 2 : 0) + (this.f0 ? 1 : 0)

    switch (func) {
      case 4: // AND：按位与
        this.input = this.a & this.b
        this.enable = true
        break

      case 5: // XOR：按位异或
        this.input = this.a ^ this.b
        this.enable = true
        break

      case 6: // OR：按位或
        this.input = this.a | this.b
        this.enable = true
        break

      case 7: // CMP：比较（直接传递 A）
        this.input = this.a
        this.enable = true
        break

      default: // 其他值：禁用输出（高阻态）
        this.input = NaN
        this.enable = false
        break
    }

    // 重置三态输出
    this.resetTriStates()
  }
}

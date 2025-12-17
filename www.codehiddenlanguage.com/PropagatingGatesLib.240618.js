// PropagatingGatesLib (c) Charles Petzold, 2024
//
// 信号传播逻辑门库
// 定义各种逻辑门组件：缓冲器、反相器、与门、或门、与非门、或非门、异或门等

/**
 * Gate 类
 * 逻辑门基类 - 所有逻辑门的父类
 * 继承自 SinglePropagator，具有单一输出目标
 */
class Gate extends SinglePropagator {
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

    // 根据缩放比例调整线宽
    this.lineWidth = 2 / Math.sqrt(this.maxScale)
    // 反相器圆圈半径
    this.circleTipRadius = 12.5
  }

  /**
   * 信号传播
   * 逻辑门的传播带有延迟，模拟真实电路的传播延迟
   */
  propagate() {
    // 如果设置了无传播延迟属性，则立即传播
    if (
      this.propertyMap.has('noPropagationDelay') &&
      this.propertyMap.get('noPropagationDelay')
    ) {
      super.propagate()
    } else {
      // 否则延迟传播（默认100ms）
      setTimeout(super.propagate.bind(this), this.params.propagationDelay)
    }
  }

  /**
   * 渲染逻辑门
   * 先填充背景色（如果设置），再用白色擦除边框，最后用黑色绘制边框
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 调用派生类实现的路径创建方法
    this.createPath()
    this.ctx.restore()

    this.ctx.save()

    // 如果设置了填充颜色，先填充
    // 可在配置中使用 fillColor 属性，如: { name: "and", type: "AndGate", fillColor: "#90EE90" }
    if (this.propertyMap.has('fillColor')) {
      this.ctx.fillStyle = this.propertyMap.get('fillColor')
      this.ctx.fill()
    }

    // 先用白色擦除之前的图形
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = 'white'
    this.ctx.stroke()

    // 再用黑色绘制新图形
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'black'
    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * OneInputGate 类
 * 单输入门基类 - Buffer（缓冲器）和 Inverter（反相器）的父类
 */
class OneInputGate extends Gate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.input = false // 输入值
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号（单输入门忽略此参数）
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    this.input = value
    let output = this.calcOutput() // 计算输出

    // 如果输出改变，则传播信号
    if (output != this.output) {
      this.output = output
      this.propagate()
    }
  }

  /**
   * 计算输出值
   * 由派生类实现
   * @returns {boolean} 输出值
   */
  calcOutput() {}
}

/**
 * Buffer 类
 * 缓冲器 - 输出等于输入（用于信号增强或延迟）
 * 符号：三角形
 */
class Buffer extends OneInputGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.output = this.calcOutput()
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："out"
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'out':
        pt = { x: this.getTip(), y: 0 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 计算输出值
   * 缓冲器：输出 = 输入
   * @returns {boolean} 输出值
   */
  calcOutput() {
    return this.input
  }

  /**
   * 获取三角形顶点X坐标
   * 使用勾股定理计算：sqrt(100² - 50²)
   * @returns {number} 顶点X坐标
   */
  getTip() {
    return Math.sqrt(100 * 100 - 50 * 50)
  }

  /**
   * 创建缓冲器路径（三角形）
   */
  createPath() {
    this.ctx.beginPath()
    this.ctx.moveTo(0, -50) // 左上角
    this.ctx.lineTo(this.getTip(), 0) // 右顶点
    this.ctx.lineTo(0, 50) // 左下角
    this.ctx.closePath()
  }
}

/**
 * Inverter 类
 * 反相器（非门）- 输出是输入的取反
 * 符号：三角形 + 圆圈
 */
class Inverter extends Buffer {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 信号传播
   * 支持自定义传播延迟
   */
  propagate() {
    // 检查是否有自定义传播延迟
    if (this.propertyMap.has('propagationDelay')) {
      this.params.propagationDelay = this.propertyMap.get('propagationDelay')
    }

    super.propagate()
  }

  /**
   * 计算输出值
   * 反相器：输出 = !输入
   * @returns {boolean} 输出值
   */
  calcOutput() {
    return !this.input
  }

  /**
   * 创建反相器路径（三角形 + 圆圈）
   */
  createPath() {
    super.createPath() // 先绘制三角形

    // 在顶点处添加圆圈（表示取反）
    let tip = super.getTip()

    this.ctx.moveTo(tip + 2 * this.circleTipRadius, 0)
    this.ctx.arc(
      tip + this.circleTipRadius,
      0,
      this.circleTipRadius,
      0,
      radians(360)
    )
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："out"
   * @returns {Object} 端口坐标（包含圆圈的偏移）
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'out':
        pt = { x: this.getTip() + 2 * this.circleTipRadius, y: 0 }
        break
    }

    return this.xformLocal(pt)
  }
}

/**
 * TwoInputGate 类
 * 双输入门基类 - AND、OR、NAND、NOR、XOR 的父类
 */
class TwoInputGate extends Gate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 两个输入的值
    this.input = [false, false]

    // 导线连接点坐标
    this.ptA = { x: 0, y: 0 } // 输入A端口
    this.ptB = { x: 0, y: 0 } // 输入B端口
    this.ptOut = { x: 0, y: 0 } // 输出端口
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    // 支持多输入门（如3输入、4输入与门）
    if (key == 'inputs') {
      let inputs = this.propertyMap.get('inputs')
      for (let i = 0; i < inputs; i++) {
        this.input[i] = false
      }
    }
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："A"、"B"、"out" 或 "num/den" 格式
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    // 标准端口名称
    if (io == undefined || !io.includes('/')) {
      switch (io) {
        case 'out':
          pt = this.ptOut
          break
        case 'A':
          pt = this.ptA
          break
        case 'B':
          pt = this.ptB
          break
      }
    } else {
      // 多输入门的端口定位：使用 "分子/分母" 格式
      // 例如 "1/3" 表示三分之一位置
      let parts = io.split('/')
      let num = parts[0]
      let den = parts[1]

      // 计算Y坐标：根据分数位置分布
      pt.y = (100 * (2 * num - 1)) / (2 * den) - 50
      // 计算X坐标：根据门的形状曲线
      pt.x = this.getXfromY(pt.y)
    }

    return this.xformLocal(pt)
  }

  /**
   * 根据Y坐标计算X坐标（用于曲线形状的门）
   * 由派生类实现
   * @param {number} y - Y坐标
   * @returns {number} X坐标
   */
  getXfromY(y) {
    return 0
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号（0 或 1）
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    this.input[num] = value
    var output = this.calcOutput() // 计算输出

    // 如果输出改变，则传播信号并通知监听者
    if (output != this.output) {
      this.output = output
      this.propagate()

      this.notifyAll() // 通知所有监听者（如DynamicDecimal）
    }
  }
}

/**
 * AndGate 类
 * 与门 - 所有输入为1时输出为1
 * 符号：D形（直边 + 半圆）
 * 逻辑：A AND B
 */
class AndGate extends TwoInputGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 设置端口坐标
    this.ptA = { x: 0, y: -25 } // 输入A（上方）
    this.ptB = { x: 0, y: 25 } // 输入B（下方）
    this.ptOut = { x: 125, y: 0 } // 输出（右侧）
  }

  /**
   * 创建与门路径（D形）
   */
  createPath() {
    this.ctx.beginPath()

    // 绘制D形：左边直线 + 右边半圆
    this.ctx.moveTo(0, 50) // 左下角
    this.ctx.lineTo(0, -50) // 左上角
    this.ctx.lineTo(75, -50) // 上边
    this.ctx.arc(75, 0, 50, radians(270), radians(90)) // 右侧半圆
    this.ctx.closePath()
  }

  /**
   * 计算输出值
   * 与门：所有输入都为真时输出为真
   * @returns {boolean} 输出值
   */
  calcOutput() {
    // 标准双输入与门
    if (!this.propertyMap.has('inputs')) {
      return this.input[0] && this.input[1]
    }

    // 多输入与门
    let inputs = this.propertyMap.get('inputs')
    let val = true

    for (let i = 0; i < inputs; i++) {
      val &&= this.input[i]
    }

    return val
  }
}

/**
 * OrGate 类
 * 或门 - 任一输入为1时输出为1
 * 符号：盾牌形（曲线）
 * 逻辑：A OR B
 */
class OrGate extends TwoInputGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 设置端口坐标（考虑曲线偏移）
    this.ptA = { x: -4, y: -25 } // 输入A（上方，略向左偏移）
    this.ptB = { x: -4, y: 25 } // 输入B（下方，略向左偏移）
    this.ptOut = { x: 125, y: 0 } // 输出（右侧）
  }

  /**
   * 根据Y坐标计算X坐标（或门左侧曲线）
   * 使用圆的方程：x = sqrt(r² - y²) - r
   * @param {number} y - Y坐标
   * @returns {number} X坐标
   */
  getXfromY(y) {
    return Math.sqrt(Math.pow(100, 2) - Math.pow(y, 2)) - 100
  }

  /**
   * 创建或门路径（盾牌形）
   */
  createPath() {
    this.ctx.beginPath()

    // 绘制盾牌形：由多段圆弧组成
    this.ctx.moveTo(-13.5, -50)
    this.ctx.arc(-100, 0, 100, radians(-30), radians(30)) // 左侧凹曲线
    this.ctx.lineTo(38.5, 50)
    this.ctx.arc(38.5, -50, 100, radians(90), radians(30), true) // 右下曲线
    this.ctx.arc(38.5, 50, 100, radians(330), radians(270), true) // 右上曲线
    this.ctx.closePath()
  }

  /**
   * 计算输出值
   * 或门：任一输入为真时输出为真
   * @returns {boolean} 输出值
   */
  calcOutput() {
    // 标准双输入或门
    if (!this.propertyMap.has('inputs')) {
      return this.input[0] || this.input[1]
    }

    // 多输入或门
    let inputs = this.propertyMap.get('inputs')
    let val = false

    for (let i = 0; i < inputs; i++) {
      val ||= this.input[i]
    }

    return val
  }
}

/**
 * OrNode 类
 * 或节点 - 功能与或门相同，但渲染为小圆点
 * 用于 Chapter19 存储单元
 */
class OrNode extends OrGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.nodeRadius = this.params.nodeRadius // 节点半径
  }

  /**
   * 渲染为小圆点（而非或门符号）
   */
  render() {
    let pt = this.xformLocal({ x: 0, y: 0 })
    pt = this.xformGlobal(pt.x, pt.y)

    this.ctx.save()
    // 根据输出状态设置颜色：通电红色，否则黑色
    this.ctx.fillStyle = this.output ? '#FF0000' : '#000000'

    this.ctx.beginPath()
    this.ctx.arc(pt.x, pt.y, this.nodeRadius, 0, radians(360))
    this.ctx.fill()

    this.ctx.restore()
  }
}

/**
 * NandGate 类
 * 与非门 - 与门的取反
 * 符号：D形 + 圆圈
 * 逻辑：NOT (A AND B)
 */
class NandGate extends AndGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.output = true // 初始输出为真（因为输入都是假）
    // 输出端口位置加上圆圈的直径
    this.ptOut = { x: 125 + 2 * this.circleTipRadius, y: 0 }
  }

  /**
   * 创建与非门路径（D形 + 圆圈）
   */
  createPath() {
    super.createPath() // 先绘制与门形状

    // 在输出端添加圆圈（表示取反）
    this.ctx.moveTo(125 + 2 * this.circleTipRadius, 0)
    this.ctx.arc(
      125 + this.circleTipRadius,
      0,
      this.circleTipRadius,
      0,
      radians(360)
    )
  }

  /**
   * 计算输出值
   * 与非门：与门输出取反
   * @returns {boolean} 输出值
   */
  calcOutput() {
    return !super.calcOutput()
  }
}

/**
 * NorGate 类
 * 或非门 - 或门的取反
 * 符号：盾牌形 + 圆圈
 * 逻辑：NOT (A OR B)
 */
class NorGate extends OrGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.output = true // 初始输出为真（因为输入都是假）
    // 输出端口位置加上圆圈的直径
    this.ptOut = { x: 125 + 2 * this.circleTipRadius, y: 0 }
  }

  /**
   * 创建或非门路径（盾牌形 + 圆圈）
   */
  createPath() {
    super.createPath() // 先绘制或门形状

    // 在输出端添加圆圈（表示取反）
    this.ctx.moveTo(125 + 2 * this.circleTipRadius, 0)
    this.ctx.arc(
      125 + this.circleTipRadius,
      0,
      this.circleTipRadius,
      0,
      radians(360)
    )
  }

  /**
   * 计算输出值
   * 或非门：或门输出取反
   * @returns {boolean} 输出值
   */
  calcOutput() {
    return !super.calcOutput()
  }
}

/**
 * XorGate 类
 * 异或门 - 两输入不同时输出为1
 * 符号：盾牌形 + 额外曲线
 * 逻辑：A XOR B（A ≠ B）
 */
class XorGate extends OrGate {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 创建异或门路径（盾牌形 + 额外曲线）
   */
  createPath() {
    super.createPath() // 先绘制或门形状

    // 添加额外的曲线（异或门的特征）
    let xOffset = -15
    this.ctx.moveTo(-13.5 + xOffset, -50)
    this.ctx.arc(-100 + xOffset, 0, 100, radians(-30), radians(30))
  }

  /**
   * 计算输出值
   * 异或门：两输入不同时输出为真
   * @returns {boolean} 输出值
   */
  calcOutput() {
    return this.input[0] != this.input[1]
  }
}

// PropagatingIoLib (c) Charles Petzold, 2024
//
// 信号传播输入输出库
// 定义开关、灯泡、按钮等输入输出组件

/**
 * 开关组件 类
 * 开关组件：可点击切换开/关状态
 * 继承自 MultiPropagator，支持多目标信号传播
 */
class Switch extends MultiPropagator {
  /**
   * 构造函数
   * @param {Object} layout - 布局对象
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {string} id - 组件标识符
   * @param {Object} params - 参数配置
   * @param {boolean} value - 初始状态，默认为关闭
   */
  constructor(layout, canvas, ctx, id, params, value = false) {
    super(layout, canvas, ctx, id, params)

    this.width = 60 // 开关宽度
    this.output = value // 输出状态
    this.closed = value // 开关闭合状态

    // 注册点击事件监听器
    canvas.addEventListener('click', this.onClick.bind(this))
  }

  /**
   * 设置属性
   * @param {string} prop - 属性名
   * @param {*} value - 属性值
   */
  setProperty(prop, value) {
    if (prop == 'closed') {
      this.closed = value
      this.render()
      return
    }

    super.setProperty(prop, value)
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：out/middle/center
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'out':
        pt = { x: this.width, y: 0 }
        break
      case 'middle':
      case 'center':
        pt = { x: this.width / 2, y: 0 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 检查是否满足触发条件
   * @param {string} trigger - 触发条件
   * @returns {boolean} 是否满足条件
   */
  satisfiesCondition(trigger) {
    if (trigger == 'closed')
      // 唯一的条件值
      return this.output
  }

  /**
   * 渲染开关
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 首先擦除杠杆
    this.drawLever(!this.closed, '#FFFFFF')
    this.drawLever(this.closed, '#FFFFFF')

    // 然后绘制杠杆
    this.drawLever(this.closed, this.output ? '#FF0000' : '#000000')

    // 绘制两个连接点
    this.ctx.fillStyle = this.output ? '#FF0000' : '#000000'

    this.ctx.beginPath()
    this.ctx.arc(0, 0, 5, 0, radians(360))
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.arc(0 + this.width, 0, 5, 0, radians(360))
    this.ctx.fill()

    this.ctx.restore()
  }

  /**
   * 绘制开关杠杆
   * @param {boolean} closed - 是否闭合
   * @param {string} color - 颜色
   */
  drawLever(closed, color) {
    this.ctx.save()
    this.ctx.rotate(radians(!closed ? -20 : 0))
    this.ctx.strokeStyle = color

    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(0 + this.width + 7, 0 - 7)
    this.ctx.lineWidth = color == '#FFFFFF' ? 6 : 4
    this.ctx.lineCap = 'round'
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * 点击事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onClick(event) {
    if (
      this.hittest(
        event.offsetX,
        event.offsetY,
        { x: 0, y: -40 },
        { x: this.width, y: 10 }
      )
    ) {
      this.closed = !this.closed // 切换开关状态

      this.setOutput()

      // 通知状态变化
      if (this.notifyFunc != undefined) {
        this.notifyFunc(this.id)
      }
    }
  }

  /**
   * 设置输出状态并传播
   */
  setOutput() {
    if (this.doNotPropagate == undefined || !this.doNotPropagate) {
      this.output = this.closed
      this.propagate()
    }

    this.render()
  }

  /**
   * 设置状态变化通知回调
   * @param {Function} func - 回调函数
   */
  notifyChange(func) {
    this.notifyFunc = func
  }
}

/**
 * 灯泡组件 类
 * 灯泡组件：显示通电状态
 * 灯泡需要传播信号到另一个端子
 */
class Lightbulb extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：left/right
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'left':
        pt = { x: -10, y: 0 }
        break
      case 'right':
        pt = { x: 10, y: 0 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    if (value != this.output) {
      this.output = value

      if (!this.doNotPropagate) {
        this.propagate()
      }
      this.render()
    }
  }

  /**
   * 渲染灯泡
   */
  render() {
    const radius = 50 // 灯泡半径

    this.ctx.save()

    this.applyGlobalTransform()
    this.applyLocalTransform()
    this.ctx.translate(0, -1.5 * radius) // 移动到灯泡中心

    // 用白色擦除灯丝和光线
    this.ctx.save()
    this.ctx.lineWidth = 3
    this.ctx.strokeStyle = '#FFFFFF'
    this.filament()
    this.rays(radius)
    this.ctx.restore()

    // 绘制灯泡外壳
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#000000'
    this.bulb(radius)

    // 绘制灯丝
    if (this.output) {
      this.ctx.strokeStyle = '#FF0000' // 通电时为红色
    }
    this.filament()

    // 绘制光线（仅在通电时）
    if (this.output) {
      this.rays(radius)
    }

    this.ctx.restore()
  }

  /**
   * 绘制灯泡外壳
   * @param {number} radius - 灯泡半径
   */
  bulb(radius) {
    this.ctx.beginPath()
    this.ctx.moveTo(0, 1.5 * radius) // 底座中心
    this.ctx.lineTo(-radius / 2, 1.5 * radius) // 底座左边
    this.ctx.lineTo(-radius / 2, radius)
    // 左下角曲线
    this.ctx.bezierCurveTo(
      -radius / 2,
      0.6 * radius,
      -radius,
      0.55 * radius,
      -radius,
      0
    )
    // 左上四分之一圆
    this.ctx.bezierCurveTo(
      -radius,
      -0.55 * radius,
      -0.55 * radius,
      -radius,
      0,
      -radius
    )
    // 右上四分之一圆
    this.ctx.bezierCurveTo(
      0.55 * radius,
      -radius,
      radius,
      -0.55 * radius,
      radius,
      0
    )
    // 右下四分之一圆
    this.ctx.bezierCurveTo(
      radius,
      0.55 * radius,
      radius / 2,
      0.6 * radius,
      radius / 2,
      radius
    )
    this.ctx.lineTo(radius / 2, 1.5 * radius) // 底座右边
    this.ctx.lineTo(0, 1.5 * radius) // 底座中心
    this.ctx.stroke()
  }

  /**
   * 绘制灯丝
   */
  filament() {
    this.ctx.beginPath()
    this.ctx.moveTo(-10, 75)
    this.ctx.lineTo(-10, 35)
    this.ctx.lineTo(-30, 0)
    this.ctx.lineTo(-25, 0)
    // 绘制锯齿形灯丝
    this.ctx.lineTo(-20, -10)
    this.ctx.lineTo(-15, 10)
    this.ctx.lineTo(-10, -10)
    this.ctx.lineTo(-5, 10)
    this.ctx.lineTo(0, -10)
    this.ctx.lineTo(5, 10)
    this.ctx.lineTo(10, -10)
    this.ctx.lineTo(15, 10)
    this.ctx.lineTo(20, -10)
    this.ctx.lineTo(25, 0)
    this.ctx.lineTo(30, 0)
    this.ctx.lineTo(10, 35)
    this.ctx.lineTo(10, 75)
    this.ctx.stroke()
  }

  /**
   * 绘制光线
   * @param {number} radius - 灯泡半径
   */
  rays(radius) {
    this.ctx.beginPath()
    this.ctx.rotate(radians(135))

    // 绘制13条光线
    for (var i = 0; i < 13; i++) {
      var length = 1.7 - 0.2 * (i & 1) // 交替长短

      this.ctx.moveTo(1.2 * radius, 0)
      this.ctx.lineTo(length * radius, 0)
      this.ctx.rotate(radians(22.5))
    }

    this.ctx.stroke()
  }
}

/**
 * 电池组件 类
 * 电池组件：电源符号
 */
class Battery extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：neg（负极）/pos（正极）
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'neg':
        pt = { x: 0, y: 0 }
        break // 负极
      case 'pos':
        pt = { x: 80, y: 0 }
        break // 正极
    }

    return this.xformLocal(pt)
  }

  /**
   * 渲染电池
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2

    this.ctx.beginPath()

    // 绘制电池左端椭圆
    this.ctx.ellipse(0, 0, 5, 20, 0, 0, radians(360))

    // 绘制电池上下边线
    this.ctx.moveTo(0, -20)
    this.ctx.lineTo(70, -20)

    this.ctx.moveTo(0, 20)
    this.ctx.lineTo(70, 20)

    // 绘制电池右端半椭圆
    this.ctx.ellipse(70, 0, 5, 20, 0, radians(90), radians(270), true)

    // 绘制正极端子
    this.ctx.moveTo(75, -5)
    this.ctx.lineTo(77, -5)
    this.ctx.arcTo(80, -5, 80, -2, 3)
    this.ctx.lineTo(80, 2)
    this.ctx.arcTo(80, 5, 77, 5, 3)
    this.ctx.lineTo(75, 5)

    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * 数字按钮 类
 * 数字按钮：点击或触摸切换输出0或1
 * 继承自 MultiPropagator 而非 SinglePropagator，以支持第10章中连接V的情况
 */
class DigitButton extends MultiPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.width = 60
    this.height = 60

    canvas.addEventListener('click', this.onClick.bind(this))
  }

  /**
   * 设置属性
   * @param {string} prop - 属性名
   * @param {*} value - 属性值
   */
  setProperty(prop, value) {
    if (prop == 'initial') {
      this.output = value
      this.render()
      this.propagate()
      return
    }

    super.setProperty(prop, value)
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：top/right/bottom/left
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'top':
        pt = { x: 0, y: -this.height / 2 }
        break
      case 'right':
        pt = { x: this.width / 2, y: 0 }
        break
      case 'bottom':
        pt = { x: 0, y: this.height / 2 }
        break
      case 'left':
        pt = { x: -this.width / 2, y: 0 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 渲染数字按钮
   */
  render() {
    // 获取自定义标签（默认为0和1）
    let label0 = this.propertyMap.has('label0')
      ? this.propertyMap.get('label0')
      : '0'
    let label1 = this.propertyMap.has('label1')
      ? this.propertyMap.get('label1')
      : '1'

    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 背景色：激活时粉红色，否则灰色
    this.ctx.fillStyle = this.output ? '#FFC0C0' : '#E0E0E0'
    this.ctx.fillRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    )

    // 边框：激活时红色，否则深灰色
    this.ctx.strokeStyle = this.output ? '#FF0000' : '#404040'
    this.ctx.lineWidth = 4
    this.ctx.strokeRect(
      -this.width / 2 + 2,
      -this.height / 2 + 2,
      this.width - 4,
      this.height - 4
    )

    // 文字：黑色
    var fontSize = Math.round(0.75 * this.height)

    this.ctx.font = fontSize + 'px ' + this.fontFamily
    this.ctx.fillStyle = '#000000'
    this.centerText(this.output ? label1 : label0, 0, 0)

    this.ctx.restore()
  }

  /**
   * 点击事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onClick(event) {
    let ul = { x: -this.width / 2, y: -this.height / 2 }
    let lr = { x: this.width / 2, y: this.height / 2 }

    if (this.hittest(event.offsetX, event.offsetY, ul, lr)) {
      this.output = !this.output // 切换状态
      this.render()
      this.propagate()

      this.notifyAll()
    }
  }
}

/**
 * 简单指示灯 类
 * 简单指示灯：带灯丝和光线的圆形指示灯
 * 仅在第10章示例中使用
 */
class SimpleLight extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.radius = 30 // 指示灯半径
    this.rayInner = 1.2 // 光线内半径系数
    this.rayOuter = 1.7 // 光线外半径系数
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：inp/out（用于第10章解码器）
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'inp':
        pt = { x: -this.radius, y: 0 }
        break // 用于第10章解码器
      case 'out':
        pt = { x: this.radius, y: 0 }
        break // 用于第10章解码器
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    if (value != this.output) {
      this.output = value

      if (!this.doNotPropagate) {
        this.propagate()
      }
      this.render()
    }
  }

  /**
   * 渲染简单指示灯
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.clearRect(
      -this.radius,
      -this.radius,
      2 * this.radius,
      2 * this.radius
    )

    // 绘制灯丝
    this.ctx.strokeStyle = this.output ? '#FF0000' : '#000000'
    this.filament()

    // 绘制圆形外框
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.radius, radians(0), radians(360))
    this.ctx.stroke()

    // 绘制光线
    this.ctx.strokeStyle = this.output ? '#FF0000' : '#FFFFFF'
    this.ctx.lineWidth = this.output ? 1 : 3

    this.ctx.beginPath()

    for (let i = 0; i < 16; i++) {
      // 跳过左右两条（0和8）
      if (i != 0 && i != 8) {
        let length = this.rayOuter - 0.2 * (i & 1)
        this.ctx.moveTo(this.rayInner * this.radius, 0)
        this.ctx.lineTo(length * this.radius, 0)
      }
      this.ctx.rotate(radians(22.5))
    }

    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * 绘制灯丝
   */
  filament() {
    this.ctx.beginPath()

    let radius = this.radius

    this.ctx.moveTo(-radius, 0)
    this.ctx.lineTo(-radius + 6, 0)
    this.ctx.lineTo(-radius + 8, -10)

    // 绘制锯齿形灯丝
    for (let i = 0; i < 5; i++) {
      this.ctx.lineTo(-radius + 12 + 8 * i, 10) // 向下
      this.ctx.lineTo(-radius + 16 + 8 * i, -10) // 向上
    }

    this.ctx.lineTo(radius - 8, 10) // 向下
    this.ctx.lineTo(radius - 6, 0) // 半上
    this.ctx.lineTo(radius, 0)

    this.ctx.stroke()
  }
}

/**
 * 位指示灯 类
 * 位指示灯：显示0或1的圆角矩形指示灯
 */
class BitLight extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.width = 60 // 宽度（HexLight和WordLight会修改此值）
    this.height = 60 // 高度
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：inp/left/top/bottom
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'inp':
        pt = { x: -this.width / 2, y: 0 }
        break
      case 'left':
        pt = { x: -this.width / 2, y: 0 }
        break
      case 'top':
        pt = { x: 0, y: -this.height / 2 }
        break
      case 'bottom':
        pt = { x: 0, y: this.height / 2 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {*} value - 输入值
   */
  setInput(num, value) {
    if (value != this.output) {
      this.output = value

      if (!this.doNotPropagate) {
        this.propagate()
      }
      this.render()
    }

    this.notifyAll()
  }

  /**
   * 渲染位指示灯
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.clearRect(
      -this.width / 2 - 2,
      -this.height / 2 - 2,
      this.width + 4,
      this.height + 4
    )

    var fontSize = Math.round(0.75 * this.height)

    this.ctx.font = fontSize + 'px ' + this.fontFamily
    this.ctx.fillStyle = this.getColor()
    this.centerText(this.getText(), 0, 0)

    this.ctx.strokeStyle = this.getColor()
    this.ctx.lineWidth = 3
    this.ctx.beginPath()

    // 绘制圆角矩形（适用于HexLight和WordLight）
    let w = this.width
    let r = this.height / 2

    this.ctx.moveTo(-w / 2 + r, -r)
    this.ctx.lineTo(w / 2 - r, -r)
    this.ctx.arcTo(w / 2, -r, w / 2, 0, r) // 右上角
    this.ctx.arcTo(w / 2, r, w / 2 - r, r, r) // 右下角
    this.ctx.lineTo(-w / 2 + r, r)
    this.ctx.arcTo(-w / 2, r, -w / 2, 0, r) // 左下角
    this.ctx.arcTo(-w / 2, -r, -w / 2 + r, -r, r) // 左上角
    this.ctx.closePath()
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * 获取显示颜色
   * @returns {string} 颜色代码
   */
  getColor() {
    return this.output ? '#FF0000' : '#000000'
  }

  /**
   * 获取显示文本
   * @returns {string} 显示的文本
   */
  getText() {
    return this.output ? '1' : '0'
  }
}

/**
 * 十六进制指示灯 类
 * 十六进制指示灯：显示2位十六进制数
 * 继承自 BitLight
 */
class HexLight extends BitLight {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.output = NaN
    this.width = 120 // 更宽以容纳十六进制数
    this.numChars = 2 // 显示字符数
  }

  /**
   * 获取显示颜色（始终为黑色）
   * @returns {string} 颜色代码
   */
  getColor() {
    return '#000000'
  }

  /**
   * 获取显示文本（十六进制格式）
   * @returns {string} 十六进制文本
   */
  getText() {
    if (this.output == undefined || this.output == null || isNaN(this.output)) {
      return ''
    }

    return (
      this.output.toString(16).toUpperCase().padStart(this.numChars, '0') + 'h'
    )
  }
}

/**
 * 字指示灯 类
 * 字指示灯：显示4位十六进制数（16位）
 * 继承自 HexLight
 */
class WordLight extends HexLight {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.width = 180 // 更宽以容纳4位十六进制数
    this.numChars = 4 // 显示4个字符
  }
}

/**
 * 瞬时按钮 类
 * 瞬时按钮：按下时输出高电平，松开时输出低电平
 */
class MomentaryButton extends SinglePropagator {
  /**
   * 构造函数
   * @param {Object} layout - 布局对象
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {string} id - 组件标识符
   * @param {Object} params - 参数配置
   * @param {boolean} value - 初始状态
   */
  constructor(layout, canvas, ctx, id, params, value = false) {
    super(layout, canvas, ctx, id, params)

    this.width = 60
    this.height = 60

    this.output = value

    // 指针事件相关
    this.pointerId = -1
    canvas.addEventListener('pointerdown', this.pointerDown.bind(this))
    canvas.addEventListener('pointerup', this.pointerUp.bind(this))
    canvas.addEventListener(
      'lostpointercapture',
      this.lostPointerCapture.bind(this)
    )
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称：right/bottom/left/top
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    switch (io) {
      case 'right':
        pt = { x: this.width / 2, y: 0 }
        break
      case 'bottom':
        pt = { x: 0, y: this.height / 2 }
        break
      case 'left':
        pt = { x: -this.width / 2, y: 0 }
        break
      case 'top':
        pt = { x: 1, y: -this.height / 2 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 指针按下事件处理
   * @param {PointerEvent} event - 指针事件
   */
  pointerDown(event) {
    let ul = { x: -this.width / 2, y: -this.height / 2 }
    let lr = { x: this.width / 2, y: this.height / 2 }

    if (this.hittest(event.offsetX, event.offsetY, ul, lr)) {
      this.output = true
      this.render()
      this.propagate()

      // 捕获指针以跟踪松开事件
      this.canvas.setPointerCapture(event.pointerId)
      this.pointerId = event.pointerId
    }
  }

  /**
   * 指针松开事件处理
   * @param {PointerEvent} event - 指针事件
   */
  pointerUp(event) {
    if (event.pointerId == this.pointerId) {
      this.output = false
      this.render()
      this.propagate()

      this.canvas.releasePointerCapture(this.pointerId)
      this.pointerId = -1
    }
  }

  /**
   * 失去指针捕获事件处理
   * @param {PointerEvent} event - 指针事件
   */
  lostPointerCapture(event) {
    if (event.pointerId == this.pointerId) {
      this.output = false
      this.render()
      this.propagate()

      this.pointerId = -1
    }
  }

  /**
   * 渲染瞬时按钮
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 背景色：按下时粉红色，否则灰色
    this.ctx.fillStyle = this.output ? '#FFC0C0' : '#E0E0E0'
    this.ctx.fillRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    )

    // 边框：按下时红色，否则深灰色
    this.ctx.strokeStyle = this.output ? '#FF0000' : '#404040'
    this.ctx.lineWidth = 4
    this.ctx.strokeRect(
      -this.width / 2 + 2,
      -this.height / 2 + 2,
      this.width - 4,
      this.height - 4
    )
    /*
        // 文字：黑色（已注释）
        var fontSize = Math.round(0.75 * this.height);

        this.ctx.font = fontSize + "px " + this.fontFamily;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "#000000";
*/
    this.ctx.restore()
  }
}

/**
 * 操作码助记符数组
 * 8080/8085 CPU的所有256条指令助记符
 */
const opcodeMnemonics = [
  'NOP',
  'LXI B,data16',
  'STAC B',
  'INX B',
  'INR B',
  'DCR B',
  'MVI B,data',
  'RLC', // 00 - 07
  'undefined',
  'DAD B',
  'LDAX B',
  'DCX B',
  'INR C',
  'DCR C',
  'MVI C,data',
  'RRC', // 08 - 0F
  'undefined',
  'LXI D,data16',
  'STAX D',
  'INX D',
  'INR D',
  'DCR D',
  'MVI D,data',
  'RAL', // 10 - 17
  'undefined',
  'DAD D',
  'LDAX D',
  'DCX D',
  'INR E',
  'DCR E',
  'MVI E,data',
  'RAR', // 18 - 1F
  'RIM (8085)',
  'LXI H,data16',
  'SHLD addr',
  'INX H',
  'INR H',
  'DCR H',
  'MVI H,data',
  'DAA', // 20 - 27
  'undefined',
  'DAD H',
  'LHLD addr',
  'DCX H',
  'INR L',
  'DCR L',
  'MVI L,data',
  'CMA', // 28 - 2F
  'SIM (8085)',
  'LXI SP,data16',
  'STA addr',
  'INX SP',
  'INR M',
  'DCR M',
  'MVI M,data',
  'STC', // 30 - 37
  'undefined',
  'DAD SP',
  'LDA addr',
  'DCX SP',
  'INR A',
  'DCR A',
  'MVI A,data',
  'CMC', // 38 - 3F
  'MOV B,B',
  'MOV B,C',
  'MOV B,D',
  'MOV B,E',
  'MOV B,H',
  'MOV B,L',
  'MOV B,M',
  'MOV B,A', // 40 - 47
  'MOV C,B',
  'MOV C,C',
  'MOV C,D',
  'MOV C,E',
  'MOV C,H',
  'MOV C,L',
  'MOV C,M',
  'MOV C,A', // 48 - 4F
  'MOV D,B',
  'MOV D,C',
  'MOV D,D',
  'MOV D,E',
  'MOV D,H',
  'MOV D,L',
  'MOV D,M',
  'MOV D,A', // 50 - 57
  'MOV E,B',
  'MOV E,C',
  'MOV E,D',
  'MOV E,E',
  'MOV E,H',
  'MOV E,L',
  'MOV E,M',
  'MOV E,A', // 58 - 5F
  'MOV H,B',
  'MOV H,C',
  'MOV H,D',
  'MOV H,E',
  'MOV H,H',
  'MOV H,L',
  'MOV H,M',
  'MOV H,A', // 60 - 67
  'MOV L,B',
  'MOV L,C',
  'MOV L,D',
  'MOV L,E',
  'MOV L,H',
  'MOV L,L',
  'MOV L,M',
  'MOV L,A', // 68 - 6F
  'MOV M,B',
  'MOV M,C',
  'MOV M,D',
  'MOV M,E',
  'MOV M,H',
  'MOV M,L',
  'HLT',
  'MOV M,A', // 70 - 7F
  'MOV A,B',
  'MOV A,C',
  'MOV A,D',
  'MOV A,E',
  'MOV A,H',
  'MOV A,L',
  'MOV A,M',
  'MOV A,A', // 77 - 7F
  'ADD B',
  'ADD C',
  'ADD D',
  'ADD E',
  'ADD H',
  'ADD L',
  'ADD M',
  'ADD A', // 80 - 87
  'ADC B',
  'ADC C',
  'ADC D',
  'ADC E',
  'ADC H',
  'ADC L',
  'ADC M',
  'ADC A', // 88 - 8F
  'SUB B',
  'SUB C',
  'SUB D',
  'SUB E',
  'SUB H',
  'SUB L',
  'SUB M',
  'SUB A', // 90 - 97
  'SBB B',
  'SBB C',
  'SBB D',
  'SBB E',
  'SBB H',
  'SBB L',
  'SBB M',
  'SBB A', // 98 - 9F
  'ANA B',
  'ANA C',
  'ANA D',
  'ANA E',
  'ANA H',
  'ANA L',
  'ANA M',
  'ANA A', // A0 - A7
  'XRA B',
  'XRA C',
  'XRA D',
  'XRA E',
  'XRA H',
  'XRA L',
  'XRA M',
  'XRA A', // A8 - AF
  'ORA B',
  'ORA C',
  'ORA D',
  'ORA E',
  'ORA H',
  'ORA L',
  'ORA M',
  'ORA A', // B0 - B7
  'CMP B',
  'CMP C',
  'CMP D',
  'CMP E',
  'CMP H',
  'CMP L',
  'CMP M',
  'CMP A', // B8 - BF
  'RNZ',
  'POP B',
  'JNZ addr',
  'JMP addr',
  'CNZ addr',
  'PUSH B',
  'ADI data',
  'RST 0', // C0 - C7
  'RZ',
  'RET',
  'JZ addr',
  'undefined',
  'CZ addr',
  'CALL addr',
  'ACI data',
  'RST 1', // C8 - CF
  'RNC',
  'POP D',
  'JNC addr',
  'OUT data',
  'CNC addr',
  'PUSH D',
  'SUI data',
  'RST 2', // D0 - D7
  'RC',
  'undefined',
  'JC addr',
  'IN data',
  'CC addr',
  'undefined',
  'SBI data',
  'RST 3', // D8 - DF
  'RPO',
  'POP H',
  'JPO addr',
  'XTHL',
  'CPO addr',
  'PUSH H',
  'ANI data',
  'RST4', // E0 - E7
  'RPE',
  'PCHL',
  'JPE addr',
  'XCHG',
  'CPE addr',
  'undefined',
  'XRI data',
  'RST 5', // E8 - EF
  'RP',
  'POP PSW',
  'JP addr',
  'DI',
  'CP addr',
  'PUSH PSW',
  'ORI data',
  'RST 6', // F0 - F7
  'RM',
  'SPHL',
  'JM addr',
  'EI',
  'CM addr',
  'undefined',
  'CPI data',
  'RST 7', // F8 - FF
]

/**
 * 已实现指令标记数组
 * 第23章指令解码器实现的指令：1表示已实现，0表示未实现
 */
const implemented1 = [
  1,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // 0x
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // 1x
  0,
  0,
  0,
  1,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  1,
  0, // 2x
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  0, // 3x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 4x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 5x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 6x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 7x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 8x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 9x
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // Ax
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // Bx
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // Cx
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // Dx
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // Ex
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0, // Fx
]

/**
 * 动态十进制显示 类
 * 动态十进制显示：显示由多个位组成的数值
 * 支持十六进制、二进制补码、查找表等多种显示模式
 */
class DynamicDecimal extends Label {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.value = 0
    this.hexOnly = false // 仅显示十六进制
    this.twosComp = false // 二进制补码显示
    this.showBits = 0 // 显示位数

    this.isBytes = false // 是否为字节模式
    this.byteValues = [] // 字节值数组
    this.lookup = undefined // 查找表
    this.lookupOnly = false // 仅使用查找表
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    // 显示的数字由多个位组成
    if (key == 'digits') {
      for (var prop in value) {
        if (value.hasOwnProperty(prop)) {
          let bit = prop

          // 访问保存的布局对象中的全局compMap
          let gate = this.layout.compMap.get(value[prop])
          gate.setNotifyChange(this.onChange.bind(this), bit)

          // 初始化
          this.onChange(bit, gate.output)
        }
      }
    }

    // 显示的数字由多个字节组成
    else if (key == 'bytes') {
      this.isBytes = true

      for (var prop in value) {
        if (value.hasOwnProperty(prop)) {
          this.byteValues.push(0)

          let byte = prop
          let gate = this.layout.compMap.get(value[prop])
          gate.setNotifyChange(this.onChange.bind(this), byte)
        }
      }
    } else if (key == 'hexOnly') {
      this.hexOnly = value
    } else if (key == 'twosComp') {
      this.twosComp = value
    } else if (key == 'lookup') {
      this.lookup = new Map()

      // 处理操作码查找
      if (value.constructor === String && value.startsWith('opcodes')) {
        let type = parseInt(value.substring(7))
        let implemented = []

        switch (type) {
          case 1:
            implemented = implemented1
            break
        }

        opcodeMnemonics.forEach((element, index) =>
          this.lookup.set(
            index.toString(),
            element +
              (element == 'undefined' || implemented1[index] == 1
                ? ''
                : ' (not implemented)')
          )
        )
      } else {
        // 自定义查找表
        for (var prop in value) {
          this.lookup.set(prop, value[prop])
        }
      }
    } else if (key == 'lookupOnly') {
      this.lookupOnly = true
    } else if (key == 'showBits') {
      this.showBits = value
    }
  }

  /**
   * 值变化回调
   * @param {*} param - 位（或字节）位置
   * @param {*} value - true/false（或字节值）
   */
  onChange(param, value) {
    if (!this.isBytes) {
      // 位模式
      // 移位以隔离要设置的位
      let bit = 1 << param

      // 首先清除该位
      this.value &= ~bit

      // 然后可能设置该位
      if (value) {
        this.value |= bit
      }

      // 显示各个位
      if (this.showBits != 0) {
        this.text = ''

        for (let i = 0; i < this.showBits; i++) {
          this.text = ((this.value & (1 << i)) != 0 ? ' 1' : ' 0') + this.text
        }
      } else {
        // 使用基类Label渲染
        if (this.value < 256) {
          this.text =
            ('0' + this.value.toString(16)).substr(-2).toUpperCase() + 'h'
        } else {
          this.text = this.value.toString(16).toUpperCase() + 'h'
        }
      }

      // 处理查找表
      if (this.lookup != undefined) {
        let strValue = this.value.toString(10)

        if (this.lookup.has(strValue)) {
          if (this.lookupOnly) {
            this.text = this.lookup.get(strValue)
          } else {
            this.text += ' = ' + this.lookup.get(strValue)
          }
        } else {
          this.text = ''
        }
      } else if (!this.hexOnly) {
        this.text += ' = '

        // 处理二进制补码
        if (!this.twosComp || this.value < 128) {
          this.text += this.value
        } else {
          this.text += this.value - 256
        }
      }
    } else {
      // 字节模式
      this.byteValues[param] = value
      this.text = ''
      let totalValue = 0
      let isNegative =
        this.byteValues.length > 1 &&
        (this.byteValues[this.byteValues.length - 1] & 0x80) != 0

      // 从高字节到低字节处理
      for (let i = this.byteValues.length - 1; i >= 0; i--) {
        let byteValue = this.byteValues[i]
        totalValue = 256 * totalValue + byteValue

        this.text += ('0' + byteValue.toString(16)).substr(-2).toUpperCase()

        if (i > 0) this.text += ' '
      }

      if (this.byteValues.length == 1) {
        this.text += 'h'
      }

      // 处理查找表
      if (this.lookup != undefined) {
        let strValue = totalValue.toString(10)

        if (this.lookup.has(strValue)) {
          if (this.lookupOnly) {
            this.text = this.lookup.get(strValue)
          } else {
            this.text += ' = ' + this.lookup.get(strValue)
          }
        } else {
          this.text = ''
        }
      } else if (!this.hexOnly) {
        // 处理负数
        if (isNegative) {
          totalValue -= Math.pow(2, 8 * this.byteValues.length)
        }

        this.text += ' = ' + totalValue
      }
    }

    this.render.bind(this)()
  }
}

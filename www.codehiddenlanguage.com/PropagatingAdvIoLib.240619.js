// PropagatingAdvIoLib (c) Charles Petzold, 2024
//
// 高级输入输出组件库
// 定义十六进制微调器、圆形滑块、七段数码管、辉光管、文本框等高级显示和输入组件

/**
 * HexSpinner 类
 * 十六进制微调器 - 用于输入 8 位十六进制数值（00-FF）
 * 包含上下箭头按钮，支持鼠标/触摸交互
 */
class HexSpinner extends ComplexPropagator {
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

    this.output = 0 // 当前值（0-255）

    this.width = 160 // 组件宽度
    this.fontSize = Math.round((0.7 * this.width) / 2) // 字体大小
    this.initialize()

    // 指针事件相关变量
    this.pointerId = -1 // 当前捕获的指针ID
    this.pointerSpinButton = null // 当前按下的微调按钮

    // 注册指针事件监听器
    canvas.addEventListener('pointerdown', this.pointerDown.bind(this))
    canvas.addEventListener('pointerup', this.pointerUp.bind(this))
    canvas.addEventListener(
      'lostpointercapture',
      this.lostPointerCapture.bind(this)
    )
  }

  /**
   * 初始化微调按钮
   * 创建4个按钮：高位增/减、低位增/减
   */
  initialize() {
    this.height = this.width / 2 // 组件高度
    this.digits = 2 // 显示位数
    this.max = 256 // 最大值（不含）

    // 创建微调按钮数组
    this.spinButtons = []
    // 左上：高位+16
    this.spinButtons.push(
      new SpinButton(
        (-2 * this.width) / 4,
        -this.height / 2,
        this.width / 4,
        this.height / 2,
        false,
        16
      )
    )
    // 右上：低位+1
    this.spinButtons.push(
      new SpinButton(
        this.width / 4,
        -this.height / 2,
        this.width / 4,
        this.height / 2,
        false,
        1
      )
    )
    // 左下：高位-16
    this.spinButtons.push(
      new SpinButton(
        (-2 * this.width) / 4,
        0,
        this.width / 4,
        this.height / 2,
        true,
        -16
      )
    )
    // 右下：低位-1
    this.spinButtons.push(
      new SpinButton(
        this.width / 4,
        0,
        this.width / 4,
        this.height / 2,
        true,
        -1
      )
    )
  }

  /**
   * 设置输出并传播
   */
  setOutputs() {
    this.propagateAll()
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    // 设置初始值
    if (key == 'value') {
      this.output = value
      this.render()
      this.propagateAll()
    }
  }

  /**
   * 获取端口坐标
   * @param {string|number} io - 端口名称或位索引
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }
    let span = this.width - this.height

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

      // 用于指令解码器的位输出端口（0-7）
      case 0:
        pt = { x: (3.5 * span) / 8, y: this.height / 2 }
        break
      case 1:
        pt = { x: (2.5 * span) / 8, y: this.height / 2 }
        break
      case 2:
        pt = { x: (1.5 * span) / 8, y: this.height / 2 }
        break
      case 3:
        pt = { x: (0.5 * span) / 8, y: this.height / 2 }
        break
      case 4:
        pt = { x: (-0.5 * span) / 8, y: this.height / 2 }
        break
      case 5:
        pt = { x: (-1.5 * span) / 8, y: this.height / 2 }
        break
      case 6:
        pt = { x: (-2.5 * span) / 8, y: this.height / 2 }
        break
      case 7:
        pt = { x: (-3.5 * span) / 8, y: this.height / 2 }
        break
    }

    return this.xformLocal(pt)
  }

  /**
   * 指针按下事件处理
   * 检测点击的微调按钮并捕获指针
   * @param {PointerEvent} event - 指针事件
   */
  pointerDown(event) {
    for (let i = 0; i < this.spinButtons.length; i++) {
      let spinButton = this.spinButtons[i]
      let ul = { x: spinButton.x, y: spinButton.y }
      let lr = {
        x: spinButton.x + spinButton.width,
        y: spinButton.y + spinButton.height,
      }

      if (this.hittest(event.offsetX, event.offsetY, ul, lr)) {
        spinButton.pressed = true
        this.render()

        // 捕获指针以跟踪后续事件
        this.canvas.setPointerCapture(event.pointerId)
        this.pointerId = event.pointerId
        this.pointerSpinButton = spinButton
      }
    }
  }

  /**
   * 指针抬起事件处理
   * 应用增量并传播新值
   * @param {PointerEvent} event - 指针事件
   */
  pointerUp(event) {
    if (event.pointerId == this.pointerId) {
      this.pointerSpinButton.pressed = false
      // 应用增量并循环（0-255）
      this.output =
        (this.output + this.pointerSpinButton.increment + this.max) % this.max
      this.render()
      this.propagateAll()

      // 释放指针捕获
      this.canvas.releasePointerCapture(this.pointerId)
      this.pointerId = -1
    }
  }

  /**
   * 指针捕获丢失事件处理
   * @param {PointerEvent} event - 指针事件
   */
  lostPointerCapture(event) {
    if (event.pointerId == this.pointerId) {
      this.pointerSpinButton.pressed = false
      this.render()

      this.pointerId = -1
    }
  }

  /**
   * 传播所有输出
   * 传播8位整数值和各个位的布尔值
   */
  propagateAll() {
    // 传播整数输出
    this.propagate('output', this.output)

    // 传播各个位的布尔值（用于指令解码器）
    for (let i = 0; i < 8; i++) {
      this.propagate(i, (this.output & (1 << i)) == 0 ? false : true)
    }

    this.notifyAll()
  }

  /**
   * 渲染微调器
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 绘制背景和边框
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.strokeStyle = '#000000'
    this.ctx.fillRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    )
    this.ctx.strokeRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    )

    // 渲染所有微调按钮
    this.spinButtons.forEach((v) => {
      v.render(this.ctx)
    })

    // 在中央显示十六进制数值
    this.ctx.fillStyle = '#000000'
    this.ctx.font = this.fontSize + 'px ' + this.fontFamily
    this.ctx.fillStyle = '#000000'

    this.centerText(hexPad(this.output, this.digits), 0, 0)

    this.ctx.restore()
  }
}

/**
 * WordSpinner 类
 * 16位字微调器 - 用于输入 16 位十六进制数值（0000-FFFF）
 * 继承自 HexSpinner，扩展为4位数字
 */
class WordSpinner extends HexSpinner {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 初始化微调按钮
   * 创建8个按钮：4个增加、4个减少（每位一对）
   */
  initialize() {
    this.height = this.width // 组件高度（正方形）
    this.digits = 4 // 显示位数
    this.max = 65536 // 最大值（不含）

    // 创建微调按钮数组
    this.spinButtons = []
    // 上排：增加按钮（从左到右：+4096, +256, +16, +1）
    this.spinButtons.push(
      new SpinButton(
        (-2 * this.width) / 4,
        -this.height / 2,
        this.width / 4,
        this.height / 4,
        false,
        4096
      )
    )
    this.spinButtons.push(
      new SpinButton(
        -this.width / 4,
        -this.height / 2,
        this.width / 4,
        this.height / 4,
        false,
        256
      )
    )
    this.spinButtons.push(
      new SpinButton(
        0,
        -this.height / 2,
        this.width / 4,
        this.height / 4,
        false,
        16
      )
    )
    this.spinButtons.push(
      new SpinButton(
        this.width / 4,
        -this.height / 2,
        this.width / 4,
        this.height / 4,
        false,
        1
      )
    )

    // 下排：减少按钮（从左到右：-4096, -256, -16, -1）
    this.spinButtons.push(
      new SpinButton(
        (-2 * this.width) / 4,
        this.height / 4,
        this.width / 4,
        this.height / 4,
        true,
        -4096
      )
    )
    this.spinButtons.push(
      new SpinButton(
        -this.width / 4,
        this.height / 4,
        this.width / 4,
        this.height / 4,
        true,
        -256
      )
    )
    this.spinButtons.push(
      new SpinButton(
        0,
        this.height / 4,
        this.width / 4,
        this.height / 4,
        true,
        -16
      )
    )
    this.spinButtons.push(
      new SpinButton(
        this.width / 4,
        this.height / 4,
        this.width / 4,
        this.height / 4,
        true,
        -1
      )
    )
  }
}

/**
 * SpinButton 类
 * 微调按钮 - HexSpinner 和 WordSpinner 使用的箭头按钮
 * 显示上/下箭头，支持按下状态
 */
class SpinButton {
  /**
   * 构造函数
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {boolean} direction - 箭头方向（true=向下, false=向上）
   * @param {number} increment - 点击时的增量值
   */
  constructor(x, y, width, height, direction, increment) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.direction = direction // 箭头方向
    this.increment = increment // 增量值

    this.pressed = false // 是否被按下
  }

  /**
   * 渲染按钮
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   */
  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)

    // 绘制背景（按下时反色）
    ctx.fillStyle = this.pressed ? '#000000' : '#FFFFFF'
    ctx.fillRect(0, 0, this.width, this.height)

    // 绘制箭头
    let yPoint = (this.direction ? 4 : 1) * (this.height / 5)

    ctx.fillStyle = this.pressed ? '#FFFFFF' : '#000000'
    ctx.beginPath()
    ctx.moveTo(this.width / 2, yPoint) // 箭头顶点
    ctx.lineTo((4 * this.width) / 5, this.height - yPoint) // 右下角
    ctx.lineTo(this.width / 5, this.height - yPoint) // 左下角
    ctx.closePath()
    ctx.fill()

    // 绘制边框
    ctx.strokeStyle = '#000000'
    ctx.strokeRect(0, 0, this.width, this.height)

    ctx.restore()
  }
}

/**
 * CircularSlider 类
 * 圆形滑块 - 用于 Chapter10 编码器
 * 可拖动滑块选择 0-7 的值，用于演示 8 选 1 编码
 */
class CircularSlider extends ComplexPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.value = 0 // 整数值（0-7）
    this.slidePosition = 0 // 滑块位置（小数）

    // 绘图参数
    this.radius = 180 // 滑块半径
    this.dotRadius = 5 // 触点半径
    this.startAngle = 30 // 起始角度
    this.angleRange = 180 - 2 * this.startAngle // 角度范围
    this.barWidth = 5 * this.dotRadius // 滑块条宽度

    // 指针交互变量
    this.pointerDown = false
    this.xPointer = 0
    this.yPointer = 0

    // 注册指针事件监听器
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this))
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this))
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this))
  }

  /**
   * 指针按下事件处理
   * 检测是否点击了滑块条
   * @param {PointerEvent} event - 指针事件
   */
  onPointerDown(event) {
    // 获取相对于画布的鼠标坐标
    this.xPointer = event.offsetX
    this.yPointer = event.offsetY

    // 转换为相对于组件中心的坐标
    let point = this.translateCanvasToComponent(this.xPointer, this.yPointer)

    // 根据当前滑块位置反向旋转坐标
    let angle = this.contactAngle(this.slidePosition)
    let radians = (-Math.PI * angle) / 180

    let x = point.x * Math.cos(radians) - point.y * Math.sin(radians)
    let y = point.x * Math.sin(radians) + point.y * Math.cos(radians)

    // 检测是否在滑块条范围内
    if (
      x > 0 &&
      x < this.radius &&
      y > -this.barWidth / 2 &&
      y < this.barWidth / 2
    ) {
      this.pointerDown = true
      this.canvas.setPointerCapture(event.pointerId)
    }
  }

  /**
   * 指针移动事件处理
   * 更新滑块位置并输出新值
   * @param {PointerEvent} event - 指针事件
   */
  onPointerMove(event) {
    if (this.pointerDown) {
      // 累加移动量
      this.xPointer += event.movementX
      this.yPointer += event.movementY

      let point = this.translateCanvasToComponent(this.xPointer, this.yPointer)

      // 计算角度
      let radians = Math.atan2(point.x, point.y)
      let angle = (180 * radians) / Math.PI

      // 计算滑块位置（0-7范围，带边界）
      this.slidePosition = (7 * (angle + 2 * this.startAngle)) / this.angleRange
      this.slidePosition = Math.max(-0.35, Math.min(7.35, this.slidePosition))

      // 如果值改变，则传播信号
      if (this.value != Math.round(this.slidePosition)) {
        // 关闭旧值的输出
        this.propagate(this.value.toString(), false)
        this.propagate('V', false)

        // 更新值
        this.value = Math.round(this.slidePosition)

        // 打开新值的输出
        this.propagate(this.value.toString(), true)
        this.propagate('V', this.value != 0)
      }

      this.render()
    }
  }

  /**
   * 指针抬起事件处理
   * @param {PointerEvent} event - 指针事件
   */
  onPointerUp(event) {
    this.pointerDown = false
    this.render()
  }

  /**
   * 将画布坐标转换为组件坐标
   * @param {number} x - 画布X坐标
   * @param {number} y - 画布Y坐标
   * @returns {Object} 组件坐标
   */
  translateCanvasToComponent(x, y) {
    // 假设组件和布局没有缩放或旋转
    x -= this.localMatrix.e + this.globalMatrix.e
    y -= this.localMatrix.f + this.globalMatrix.f

    return { x: x, y: y }
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称（触点编号 0-7）
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let point = { x: 0, y: 0 }

    if (io != null && io != undefined) {
      let i = parseInt(io)
      point = this.contactPoint(i)
    }

    return this.xformLocal(point)
  }

  /**
   * 渲染圆形滑块
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 清除整个扇形区域
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.arc(0, 0, this.radius + 1, radians(5), radians(175))
    this.ctx.closePath()

    this.ctx.rect(
      -1.5 * this.barWidth,
      -this.barWidth,
      3 * this.barWidth,
      1.5 * this.barWidth
    )

    this.ctx.fill()

    let isConducting = this.value != 0

    // 绘制8个触点
    for (let i = 0; i < 8; i++) {
      let beg = this.contactAngle(i - 0.3)
      let end = this.contactAngle(i + 0.3)

      this.ctx.beginPath()
      this.ctx.arc(0, 0, this.radius, radians(beg), radians(end), true)
      this.ctx.lineCap = 'round'
      this.ctx.lineWidth = 2 * this.dotRadius
      // 当前选中的触点显示红色
      this.ctx.strokeStyle =
        isConducting && this.value == i ? '#FF0000' : '#000000'
      this.ctx.stroke()
    }

    // 绘制滑块条
    this.ctx.fillStyle = isConducting ? '#FF0000' : '#808080'

    this.ctx.save()
    this.ctx.rotate(radians(this.contactAngle(this.slidePosition)))

    // 绘制圆角矩形滑块
    this.ctx.beginPath()
    this.ctx.moveTo(-this.barWidth / 2, -this.barWidth / 2)
    this.ctx.lineTo(this.radius - this.barWidth / 2, -this.barWidth / 2)
    this.ctx.arcTo(
      this.radius,
      -this.barWidth / 2,
      this.radius,
      0,
      this.barWidth / 2
    )
    this.ctx.arcTo(
      this.radius,
      this.barWidth / 2,
      this.radius - this.barWidth / 2,
      this.barWidth / 2,
      this.barWidth / 2
    )
    this.ctx.lineTo(-this.barWidth / 2, this.barWidth / 2)
    this.ctx.closePath()

    this.ctx.fill()
    this.ctx.restore()

    // 绘制中心旋转点
    this.ctx.fillStyle = '#000000'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.dotRadius, 0, radians(360))
    this.ctx.fill()

    // 绘制连接导线
    this.ctx.strokeStyle = isConducting ? '#FF0000' : '#000000'
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(-40, 0)
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * 计算触点坐标
   * @param {number} i - 触点索引（0-7）
   * @returns {Object} 触点坐标
   */
  contactPoint(i) {
    let angle = this.contactAngle(i)
    return {
      x: this.radius * Math.cos((2 * Math.PI * angle) / 360),
      y: this.radius * Math.sin((2 * Math.PI * angle) / 360),
    }
  }

  /**
   * 计算触点角度
   * @param {number} i - 触点索引（0-7，可为小数）
   * @returns {number} 角度（度）
   */
  contactAngle(i) {
    return this.startAngle + ((7 - i) * this.angleRange) / 7
  }
}

/**
 * SevenSegment 类
 * 七段数码管 - 用于显示数字和部分字母
 * 由 7 个独立控制的线段组成（a-g）
 *
 *    --a--
 *   |     |
 *   f     b
 *   |     |
 *    --g--
 *   |     |
 *   e     c
 *   |     |
 *    --d--
 */
class SevenSegment extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 各线段的状态映射
    this.valueMap = new Map()
    this.valueMap.set('a', false)
    this.valueMap.set('b', false)
    this.valueMap.set('c', false)
    this.valueMap.set('d', false)
    this.valueMap.set('e', false)
    this.valueMap.set('f', false)
    this.valueMap.set('g', false)

    // 绘图尺寸参数
    this.SEGMENT = 100 // 线段长度
    this.WIDTH = 20 // 线段宽度
    this.POINT = 10 // 线段端点尖角长度
    this.GAP = 2 // 线段间隙
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称（a-g）
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined && io.length == 1) {
      switch (io) {
        case 'a': // 顶部水平线段
          pt.x = -this.SEGMENT / 2
          pt.y = -this.SEGMENT - 2 * this.GAP
          break

        case 'b': // 右上垂直线段
          pt.x = this.SEGMENT / 2 + this.WIDTH / 2 + this.GAP
          pt.y = -this.SEGMENT / 2
          break

        case 'c': // 右下垂直线段
          pt.x = this.SEGMENT / 2 + this.WIDTH / 2 + this.GAP
          pt.y = this.SEGMENT / 2
          break

        case 'd': // 底部水平线段
          pt.x = 0
          pt.y = this.SEGMENT + this.WIDTH / 2 + 2 * this.GAP
          break

        case 'e': // 左下垂直线段
          pt.x = -this.SEGMENT / 2 + -this.WIDTH / 2
          pt.y = this.SEGMENT / 2
          break

        case 'f': // 左上垂直线段
          pt.x = -this.SEGMENT / 2 + -this.WIDTH / 2
          pt.y = -this.SEGMENT / 2
          break

        case 'g': // 中间水平线段
          pt.x = this.SEGMENT / 2
          pt.y = 0
          break
      }
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {string} key - 线段名称（a-g）
   * @param {boolean} value - 是否点亮
   */
  setInput(key, value) {
    this.valueMap.set(key, value)
    this.render()
  }

  /**
   * 渲染七段数码管
   */
  render() {
    this.ctx.save()

    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 绘制水平线段
    this.horz(0, -this.SEGMENT - 2 * this.GAP, this.valueMap.get('a')) // 顶部
    this.horz(0, 0, this.valueMap.get('g')) // 中间
    this.horz(0, this.SEGMENT + 2 * this.GAP, this.valueMap.get('d')) // 底部

    // 绘制垂直线段
    this.vert(
      -this.SEGMENT / 2 - this.GAP,
      -this.SEGMENT / 2 - this.GAP,
      this.valueMap.get('f')
    ) // 左上
    this.vert(
      this.SEGMENT / 2 + this.GAP,
      -this.SEGMENT / 2 - this.GAP,
      this.valueMap.get('b')
    ) // 右上
    this.vert(
      -this.SEGMENT / 2 - this.GAP,
      this.SEGMENT / 2 + this.GAP,
      this.valueMap.get('e')
    ) // 左下
    this.vert(
      this.SEGMENT / 2 + this.GAP,
      this.SEGMENT / 2 + this.GAP,
      this.valueMap.get('c')
    ) // 右下

    this.ctx.restore()
  }

  /**
   * 绘制水平线段
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {boolean} isRed - 是否点亮（红色）
   */
  horz(x, y, isRed) {
    this.ctx.beginPath()
    // 绘制六边形线段
    this.ctx.moveTo(x - this.SEGMENT / 2, y)
    this.ctx.lineTo(x - this.SEGMENT / 2 + this.POINT, y - this.WIDTH / 2)
    this.ctx.lineTo(x + this.SEGMENT / 2 - this.POINT, y - this.WIDTH / 2)
    this.ctx.lineTo(x + this.SEGMENT / 2, y)
    this.ctx.lineTo(x + this.SEGMENT / 2 - this.POINT, y + this.WIDTH / 2)
    this.ctx.lineTo(x - this.SEGMENT / 2 + this.POINT, y + this.WIDTH / 2)
    this.ctx.closePath()

    this.ctx.fillStyle = isRed ? '#FF0000' : '#FFFFFF'
    this.ctx.fill()

    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()
  }

  /**
   * 绘制垂直线段
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {boolean} isRed - 是否点亮（红色）
   */
  vert(x, y, isRed) {
    this.ctx.beginPath()
    // 绘制六边形线段
    this.ctx.moveTo(x, y - this.SEGMENT / 2)
    this.ctx.lineTo(x - this.WIDTH / 2, y - this.SEGMENT / 2 + this.POINT)
    this.ctx.lineTo(x - this.WIDTH / 2, y + this.SEGMENT / 2 - this.POINT)
    this.ctx.lineTo(x, y + this.SEGMENT / 2)
    this.ctx.lineTo(x + this.WIDTH / 2, y + this.SEGMENT / 2 - this.POINT)
    this.ctx.lineTo(x + this.WIDTH / 2, y - this.SEGMENT / 2 + this.POINT)
    this.ctx.closePath()

    this.ctx.fillStyle = isRed ? '#FF0000' : '#FFFFFF'
    this.ctx.fill()

    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()
  }
}

/**
 * NixieTube 类
 * 辉光管（数码管）- 复古风格的数字显示器
 * 显示 0-9 的数字，未选中的数字半透明显示
 */
class NixieTube extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 10个数字的显示状态
    this.values = [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]

    // 绘图尺寸参数
    this.WIDTH = 50 // 管宽度
    this.HEIGHT = 125 // 管高度
    this.FONTSIZE = 150 // 数字字体大小
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称（数字 0-9）
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined && io.length == 1) {
      let i = parseInt(io, 10)
      pt.x = ((i - 4.5) * this.WIDTH) / 10
      pt.y = 0
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 数字索引（0-9）
   * @param {boolean} value - 是否点亮
   */
  setInput(num, value) {
    this.values[num] = value
    this.render()
  }

  /**
   * 渲染辉光管
   */
  render() {
    this.ctx.save()

    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 绘制管体轮廓（圆顶矩形）
    this.ctx.beginPath()
    this.ctx.moveTo(this.WIDTH / 2, 0)
    this.ctx.lineTo(this.WIDTH / 2, -this.HEIGHT)
    this.ctx.arc(
      0,
      -this.HEIGHT,
      this.WIDTH / 2,
      radians(0),
      radians(-180),
      true
    )
    this.ctx.lineTo(-this.WIDTH / 2, 0)

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fill()

    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // 使用细体 Helvetica 字体显示数字
    this.ctx.font = 'lighter ' + this.FONTSIZE + 'px Helvetica'

    // 从9到0绘制数字（后绘制的在前面）
    for (let i = 9; i >= 0; i--) {
      let num = i.toString()

      this.ctx.save()
      this.ctx.scale(0.6, 1) // 横向压缩
      // 点亮的数字全不透明，未点亮的半透明
      this.ctx.globalAlpha = this.values[i] ? 1 : 0.05
      this.ctx.fillStyle = this.values[i] ? '#FF0000' : '#000000'
      this.centerText(num, 0, -this.HEIGHT / 2 - this.WIDTH / 4)
      this.ctx.restore()
    }

    // 绘制底部底座
    this.ctx.beginPath()
    this.ctx.moveTo(-this.WIDTH / 2, -3)
    this.ctx.lineTo(this.WIDTH / 2, -3)
    this.ctx.lineWidth = 6
    this.ctx.lineCap = 'square'
    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * TextBox 类
 * 文本框 - 显示可自动换行的文本
 * 支持颜色随信号状态变化（红/黑）
 */
class TextBox extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 默认值
    this.text = '?' // 显示文本
    this.width = 100 // 文本框宽度
    this.horzAlign = 'center' // 水平对齐：left/center/right
    this.font = '14px ' + this.fontFamily // 字体
    this.attach = { x: 0.5, y: 0 } // 锚点位置
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    switch (key) {
      case 'text':
        this.text = value.trim()
        break
      case 'width':
        this.width = value
        break
      case 'horzAlign':
        this.horzAlign = value
        break
      case 'font':
        this.font = value
        break
      case 'attach':
        // 解析锚点坐标（格式："x,y"）
        let nums = value.split(',')
        let x = parseFloat(nums[0])
        let y = parseFloat(nums[1])
        this.attach = { x: x, y: y }
        break
    }
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }
    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    this.output = value
    this.propagate()
    this.render()
  }

  /**
   * 渲染文本框
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.font = this.font
    let metrics = this.ctx.measureText(' ')
    let lineSpace =
      metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent

    this.ctx.textAlign = this.horzAlign
    this.ctx.textBaseline = 'top'

    // 执行自动换行
    let lines = []
    this.wordwrap(lines, this.text)

    // 根据对齐方式和锚点设置X坐标和平移
    let x = 0

    switch (this.horzAlign) {
      case 'left':
        this.ctx.translate(-this.attach.x * this.width, 0)
        x = 0
        break

      case 'center':
        x = -this.width / 2
        this.ctx.translate((0.5 - this.attach.x) * this.width, 0)
        break

      case 'right':
        x = -this.width
        this.ctx.translate((1 - this.attach.x) * this.width, 0)
        break
    }

    // 清除文本区域
    this.ctx.clearRect(x, 0, this.width, lines.length * lineSpace)

    // 绘制文本（通电红色，否则黑色）
    this.ctx.fillStyle = this.output ? '#FF0000' : '#000000'
    let y = 0

    lines.forEach((line) => {
      this.ctx.fillText(line, 0, y)
      y += lineSpace
    })

    this.ctx.restore()
  }

  /**
   * 自动换行算法（递归）
   * @param {Array} lines - 输出的行数组
   * @param {string} text - 要处理的文本
   * @param {number} pos - 当前处理位置
   */
  wordwrap(lines, text, pos) {
    if (pos == undefined) pos = text.length

    let ss = text.substring(0, pos)

    // 如果当前子串宽度合适，或没有空格可断行
    if (this.ctx.measureText(ss).width < this.width || ss.indexOf(' ') == -1) {
      lines.push(ss)

      // 处理剩余文本
      if (pos < text.length) this.wordwrap(lines, text.substring(pos + 1))
    } else {
      // 在最近的空格处断行
      pos = text.lastIndexOf(' ', pos - 1)
      this.wordwrap(lines, text, pos)
    }
  }
}

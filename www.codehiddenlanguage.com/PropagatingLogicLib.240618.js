// PropagatingLogicLib (c) Charles Petzold, 2024
//
// 信号传播逻辑库
// 定义按钮、逻辑门、电线和指示灯等组件
// 这些组件可以相互连接，自动渲染并传播其状态

/**
 * 将角度转换为弧度
 * @param {number} degree - 角度值
 * @returns {number} 弧度值
 */
const radians = (degree) => (degree * Math.PI) / 180

/**
 * 将弧度转换为角度
 * @param {number} radians - 弧度值
 * @returns {number} 角度值
 */
const degrees = (radians) => (180 * radians) / Math.PI

/**
 * 数字前补零
 * @param {number|string} x - 要处理的数字
 * @param {number} n - 目标长度
 * @returns {string} 补零后的字符串
 */
function addZero(x, n) {
  while (x.toString().length < n) {
    x = '0' + x
  }
  return x
}

/**
 * 十六进制数补零
 * @param {number} x - 要转换的数字
 * @param {number} n - 目标长度
 * @returns {string} 补零后的十六进制字符串（大写）
 */
function hexPad(x, n) {
  let str = x.toString(16).toUpperCase()

  while (str.length < n) {
    str = '0' + str
  }

  return str
}

/**
 * 获取当前时间字符串
 * @returns {string} 格式化的时间字符串 HH:MM:SS:mmm
 */
function time() {
  var d = new Date()
  var h = addZero(d.getHours(), 2)
  var m = addZero(d.getMinutes(), 2)
  var s = addZero(d.getSeconds(), 2)
  var ms = addZero(d.getMilliseconds(), 3)
  return h + ':' + m + ':' + s + ':' + ms
}

/**
 * Component 类
 * 所有电路组件的基类
 * 提供变换、渲染、点击检测等基础功能
 */
class Component {
  /**
   * 构造函数
   * @param {Object} layout - 布局对象（CircuitBuilder实例）
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {CanvasRenderingContext2D} ctx - 画布2D上下文
   * @param {string} id - 组件唯一标识符
   * @param {Object} params - 参数配置对象
   */
  constructor(layout, canvas, ctx, id, params) {
    this.layout = layout
    this.canvas = canvas
    this.ctx = ctx
    this.id = id
    this.params = params

    this.doNotPropagate = false // 是否禁止信号传播
    this.propertyMap = new Map() // 属性映射表

    // 常用颜色
    this.black = '#000000'
    this.red = '#FF0000'
    this.white = '#FFFFFF'

    this.fontFamily = 'Tahoma,sans-serif' // 默认字体

    this.hidden = false // 是否隐藏

    // 输出状态：虽然不是所有派生类都使用，但大多数都需要
    this.output = false

    // 通知回调数组：用于TwoInputGate和Box等类
    this.notifies = []
  }

  /**
   * 设置状态变化通知回调
   * @param {Function} func - 回调函数
   * @param {*} param - 传递给回调的参数
   */
  setNotifyChange(func, param) {
    this.notifies.push({ func: func, param: param })

    // 调用以初始化
    func(param, this.output)
  }

  /**
   * 通知所有已注册的回调
   */
  notifyAll() {
    for (let i = 0; i < this.notifies.length; i++) {
      let notify = this.notifies[i]
      notify.func(notify.param, this.output)
    }
  }

  /**
   * 设置组件属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    this.propertyMap.set(key, value)

    // 只有少数地方实现了特殊处理
    if (key == 'hidden') this.hidden = value
  }

  /**
   * 保存局部变换矩阵
   * 在组件创建后不久调用
   * @param {DOMMatrix} matrix - 局部变换矩阵
   */
  saveLocalTransform(matrix) {
    this.localMatrix = matrix
  }

  /**
   * 保存全局变换矩阵
   * @param {DOMMatrix} matrix - 全局变换矩阵
   */
  saveGlobalTransform(matrix) {
    this.globalMatrix = matrix

    // 计算最大缩放比例
    this.maxScale = Math.max(
      Math.abs(this.globalMatrix.a),
      Math.abs(this.globalMatrix.b),
      Math.abs(this.globalMatrix.c),
      Math.abs(this.globalMatrix.d)
    )
  }

  /**
   * 使用局部矩阵变换点坐标
   * @param {Object} pt - 包含x和y的点对象
   * @returns {Object} 变换后的点坐标
   */
  xformLocal(pt) {
    let xp =
      this.localMatrix.a * pt.x + this.localMatrix.c * pt.y + this.localMatrix.e
    let yp =
      this.localMatrix.b * pt.x + this.localMatrix.d * pt.y + this.localMatrix.f

    return { x: xp, y: yp }
  }

  /**
   * 使用全局矩阵变换点坐标
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {Object} 变换后的点坐标
   */
  xformGlobal(x, y) {
    let xp =
      this.globalMatrix.a * x + this.globalMatrix.c * y + this.globalMatrix.e
    let yp =
      this.globalMatrix.b * x + this.globalMatrix.d * y + this.globalMatrix.f

    return { x: xp, y: yp }
  }

  /**
   * 将局部变换应用到画布上下文
   */
  applyLocalTransform() {
    this.applyTransform(this.localMatrix)
  }

  /**
   * 将全局变换应用到画布上下文
   */
  applyGlobalTransform() {
    this.applyTransform(this.globalMatrix)
  }

  /**
   * 将指定变换矩阵应用到画布上下文
   * @param {DOMMatrix} m - 变换矩阵
   */
  applyTransform(m) {
    this.ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)
  }

  /**
   * 获取组件端口坐标
   * @param {string} io - 端口名称
   * @returns {Object} 端口坐标
   */
  getCoordinates(io) {
    return this.xformLocal({ x: 0, y: 0 })
  }

  /**
   * 渲染组件
   * 基类为空实现，由派生类覆盖
   */
  render() {}

  /**
   * 点击测试：检查指定坐标是否在组件边界内
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   * @param {Object} ul - 左上角边界点
   * @param {Object} lr - 右下角边界点
   * @returns {boolean} 是否命中
   */
  hittest(x, y, ul, lr) {
    ul = this.xformLocal(ul)
    ul = this.xformGlobal(ul.x, ul.y)

    lr = this.xformLocal(lr)
    lr = this.xformGlobal(lr.x, lr.y)

    return x > ul.x && x < lr.x && y > ul.y && y < lr.y
  }

  /**
   * 居中绘制文本
   * 此函数独立于textAlign和textBaseline设置
   * @param {string} text - 要绘制的文本
   * @param {number} x - 中心X坐标
   * @param {number} y - 中心Y坐标
   * @returns {Object} 文本边界框 {x, y, width, height}
   */
  centerText(text, x, y) {
    // 获取高度信息
    let metrics = this.ctx.measureText(text)

    let ascent = metrics.actualBoundingBoxAscent
    let descent = metrics.actualBoundingBoxDescent

    let yText = y - (descent - ascent) / 2

    // 移除"组合上划线"字符以获取宽度信息
    // 因为Mac上存在bug
    metrics = this.ctx.measureText(text.replaceAll('\u0305', ''))

    let left = metrics.actualBoundingBoxLeft
    let right = metrics.actualBoundingBoxRight

    let xText = x - (right - left) / 2

    // 绘制文本
    this.ctx.fillText(text, xText, yText)

    // 返回边界框
    return {
      x: xText - left,
      y: yText - ascent,
      width: right + left,
      height: ascent + descent,
    }
  }
}

/**
 * Ground 类
 * 接地符号组件
 */
class Ground extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {boolean} value - 输入值
   */
  setInput(num, value) {
    this.output = value
    this.render()
  }

  /**
   * 渲染接地符号
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    // 绘制接地符号的四条水平线
    this.ctx.moveTo(-10, 0)
    this.ctx.lineTo(10, 0)

    this.ctx.moveTo(-7, 4)
    this.ctx.lineTo(7, 4)

    this.ctx.moveTo(-4, 8)
    this.ctx.lineTo(4, 8)

    this.ctx.moveTo(-1, 12)
    this.ctx.lineTo(1, 12)

    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * V 类
 * 电压源符号（V形）
 */
class V extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 渲染V形电压符号
   */
  render() {
    let pt = this.xformGlobal(0, 0)
    pt = this.xformLocal(pt)

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.moveTo(pt.x - 5, pt.y - 18)
    this.ctx.lineTo(pt.x, pt.y - 5)
    this.ctx.lineTo(pt.x + 5, pt.y - 18)

    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * Joint 类
 * 连接点：用于电线布线的辅助点，不可见
 */
class Joint extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }
}

/**
 * Label 类
 * 文本标签组件
 */
class Label extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.clearRect = undefined // 用于清除之前绘制区域的矩形
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    // 将值传递给this.text，主要是为了DynamicDecimal使用
    if (key == 'text') this.text = value
  }

  /**
   * 渲染文本标签
   */
  render() {
    // 清除之前的矩形区域（DynamicDecimal需要此功能）
    if (this.clearRect != undefined) {
      // 稍微扩大矩形范围
      this.ctx.clearRect(
        this.clearRect.x - 1,
        this.clearRect.y - 1,
        this.clearRect.width + 2,
        this.clearRect.height + 2
      )
    }

    if (this.text == undefined) return

    let size = this.propertyMap.get('size')
    let fontSize = 24 * (size == undefined ? 1 : size)

    let pt = this.xformGlobal(0, 0)
    pt = this.xformLocal(pt)

    this.ctx.save()
    this.ctx.font = fontSize + 'px ' + this.fontFamily
    this.ctx.fillStyle = '#000000'

    // 居中绘制文本
    this.clearRect = this.centerText(this.text, pt.x, pt.y)
    this.ctx.restore()
  }
}

/**
 * Brace 类
 * 大括号组件：用于分组标注
 */
class Brace extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 渲染大括号
   */
  render() {
    let orientation = this.propertyMap.get('orientation') // 方向：up或right
    let extent = this.propertyMap.get('extent') // 延伸范围
    let radius = 10 // 圆角半径

    let n1 = 25
    let n2 = 20
    let n3 = 10

    let pt = this.xformGlobal(0, 0)
    pt = this.xformLocal(pt)

    this.ctx.save()
    this.ctx.translate(pt.x, pt.y)
    this.ctx.beginPath()

    if (orientation == 'up') {
      // 向上的大括号
      this.ctx.moveTo(-extent, n1)
      this.ctx.lineTo(-extent, n2)
      this.ctx.arcTo(-extent, n3, -n3, n3, radius)
      this.ctx.arcTo(0, n3, 0, 0, radius)
      this.ctx.arcTo(0, n3, n3, n3, radius)
      this.ctx.arcTo(extent, n3, extent, n2, radius)
      this.ctx.lineTo(extent, n1)
    } else if (orientation == 'right') {
      // 向右的大括号
      this.ctx.moveTo(-n1, -extent)
      this.ctx.lineTo(-n2, -extent)
      this.ctx.arcTo(-n3, -extent, -n3, -n3, radius)
      this.ctx.arcTo(-n3, 0, 0, 0, radius)
      this.ctx.arcTo(-n3, 0, -n3, n3, radius)
      this.ctx.arcTo(-n3, extent, -n2, extent, radius)
      this.ctx.lineTo(-n1, extent)
    }

    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    this.ctx.restore()
  }
}

/**
 * Propagator 类
 * 信号传播器基类：大多数其他类的基类
 */
class Propagator extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }
}

/**
 * SinglePropagator 类
 * 单目标传播器：具有单一输出目标的组件
 */
class SinglePropagator extends Propagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 信号传播的目标对象和输入端口索引
    // 如果目标是双输入门，destinationNum为0或1表示输入端口
    this.destinationObj = null
    this.destinationNum = 0
  }

  /**
   * 设置传播目标
   * 设置后会立即传播当前输出值到目标
   * @param {Object} destinationObj - 目标对象
   * @param {number} destinationNum - 目标输入端口编号
   */
  setDestination(destinationObj, destinationNum) {
    this.destinationObj = destinationObj
    this.destinationNum = destinationNum
    this.propagate()
  }

  /**
   * 传播信号到目标
   */
  propagate() {
    // 当目标为null时避免传播
    if (this.destinationObj != null && this.destinationObj.setInput != null) {
      this.destinationObj.setInput(this.destinationNum, this.output)
    }
  }
}

/**
 * VPropagator 类
 * 电压源传播器：用于递增/递减器
 * 输出始终为true
 */
class VPropagator extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.output = true // 电压源始终输出高电平
  }

  /**
   * 渲染V形符号（从V类复制）
   */
  render() {
    let pt = this.xformGlobal(0, 0)
    pt = this.xformLocal(pt)

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.moveTo(pt.x - 5, pt.y - 18)
    this.ctx.lineTo(pt.x, pt.y - 5)
    this.ctx.lineTo(pt.x + 5, pt.y - 18)

    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#000000'
    this.ctx.stroke()

    this.ctx.restore()
  }
}

/**
 * MultiPropagator 类
 * 多目标传播器：类似SinglePropagator，但输出传播到多个目标
 * 是Node类的基类
 */
class MultiPropagator extends Propagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 目标数组：包含对象和端口编号
    this.destinations = []
  }

  /**
   * 添加传播目标
   * @param {Object} destObj - 目标对象
   * @param {number} destNum - 目标输入端口编号
   */
  addDestination(destObj, destNum) {
    this.destinations.push({ dest: destObj, num: destNum })
    this.propagate()
  }

  /**
   * 传播信号到所有目标
   */
  propagate() {
    for (let i = 0; i < this.destinations.length; i++) {
      this.destinations[i].dest.setInput(this.destinations[i].num, this.output)
    }
  }
}

/**
 * WireArray 类
 * 电线组件：由多个点组成的折线路径
 */
class WireArray extends SinglePropagator {
  /**
   * 构造函数
   * @param {Object} layout - 布局对象
   * @param {HTMLCanvasElement} canvas - 画布
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {string} id - 标识符
   * @param {Object} params - 参数
   * @param {Array} points - 路径点数组
   * @param {string} arrow - 箭头样式：none/beg/end/both
   * @param {boolean} hidden - 是否隐藏
   */
  constructor(layout, canvas, ctx, id, params, points, arrow, hidden) {
    super(layout, canvas, ctx, id, params)

    this.points = points // 路径点数组
    this.arrow = arrow // 箭头样式
    this.hidden = hidden // 是否隐藏

    this.lineWidth = 1.0 // 线宽
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {*} value - 输入值
   */
  setInput(num, value) {
    // 如果新旧值都是NaN，则不处理
    if (isNaN(value) && isNaN(this.output)) return

    if (value != this.output) {
      this.output = value

      if (!this.doNotPropagate) {
        this.propagate()
      }
      this.render()
    }
  }

  /**
   * 渲染电线
   */
  render() {
    if (this.hidden) return

    this.ctx.save()
    this.applyGlobalTransform()

    this.ctx.beginPath()
    this.ctx.moveTo(this.points[0].x, this.points[0].y)

    if (this.points.length == 2) {
      // 两点直线
      this.ctx.lineTo(this.points[1].x, this.points[1].y)
    } else {
      // 多点折线：使用圆角转角
      for (let i = 1; i < this.points.length - 1; i++) {
        this.ctx.arcTo(
          this.points[i].x,
          this.points[i].y,
          this.points[i + 1].x,
          this.points[i + 1].y,
          this.params.wireCurveRadius
        )
      }

      this.ctx.lineTo(
        this.points[this.points.length - 1].x,
        this.points[this.points.length - 1].y
      )
    }

    // 在起点添加箭头
    if (this.arrow == 'beg' || this.arrow == 'both') {
      this.addArrow(this.points[0], this.points[1])
    }
    // 在终点添加箭头
    if ((this.arrow == 'end') | (this.arrow == 'both')) {
      this.addArrow(
        this.points[this.points.length - 1],
        this.points[this.points.length - 2]
      )
    }

    this.ctx.restore()

    this.ctx.save()
    // 用较粗的白色线条擦除之前的线
    this.ctx.strokeStyle = '#FFFFFF'
    this.ctx.lineWidth = 2 * this.lineWidth
    this.ctx.stroke()

    // 绘制新线：通电为红色，否则为黑色
    this.ctx.strokeStyle = this.output ? '#FF0000' : '#000000'
    this.ctx.lineWidth = 1 * this.lineWidth
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * 添加箭头
   * @param {Object} ptLast - 箭头顶点
   * @param {Object} ptPrev - 箭头方向参考点
   * @param {number} arrowLength - 箭头长度
   * @param {number} arrowAngle - 箭头张角
   * @param {boolean} close - 是否闭合箭头
   */
  addArrow(ptLast, ptPrev, arrowLength = 10, arrowAngle = 25, close = false) {
    // 计算方向向量
    let vector = { x: ptPrev.x - ptLast.x, y: ptPrev.y - ptLast.y }
    let length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    vector.x /= length
    vector.y /= length

    // 计算箭头两侧的点
    let pt1 = this.arrowPoint(vector, arrowAngle, arrowLength)
    pt1.x += ptLast.x
    pt1.y += ptLast.y

    let pt2 = this.arrowPoint(vector, -arrowAngle, arrowLength)
    pt2.x += ptLast.x
    pt2.y += ptLast.y

    // 绘制箭头
    this.ctx.moveTo(pt1.x, pt1.y)
    this.ctx.lineTo(ptLast.x, ptLast.y)
    this.ctx.lineTo(pt2.x, pt2.y)

    if (close) this.ctx.closePath()
  }

  /**
   * 计算箭头端点坐标
   * @param {Object} vector - 方向向量
   * @param {number} arrowAngle - 旋转角度
   * @param {number} arrowLength - 箭头长度
   * @returns {Object} 端点坐标
   */
  arrowPoint(vector, arrowAngle, arrowLength) {
    let vArrow = { x: 0, y: 0 }
    let angle = radians(arrowAngle)

    // 旋转向量
    vArrow.x = vector.x * Math.cos(angle) - vector.y * Math.sin(angle)
    vArrow.y = vector.x * Math.sin(angle) + vector.y * Math.cos(angle)

    // 缩放到指定长度
    vArrow.x = arrowLength * vArrow.x
    vArrow.y = arrowLength * vArrow.y

    return vArrow
  }
}

/**
 * InlineText 类
 * 内联文本组件：可作为电线的一部分显示文本
 */
class InlineText extends SinglePropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
    this.text = ' undefined '
    this.overline = false // 是否显示上划线
    this.rtl = false // 是否从右到左
  }

  /**
   * 设置属性
   * @param {string} key - 属性名
   * @param {*} value - 属性值
   */
  setProperty(key, value) {
    super.setProperty(key, value)

    if (key == 'rtl') {
      this.rtl = value
    }

    if (key == 'text') {
      // 检查是否需要上划线（|OL标记）
      if (value.includes('|OL')) {
        value = value.replace('|OL', '')
        this.overline = true
      }

      this.text = ' ' + value + ' '
    }
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称
   * @returns {Object} 坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io == 'end') {
      pt = { x: (this.rtl ? -1 : 1) * this.measureText().width, y: 0 }
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {*} value - 输入值
   */
  setInput(num, value) {
    this.output = value
    this.propagate()
    this.render()
  }

  /**
   * 渲染内联文本
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.setFont()
    let metrics = this.measureText()

    // 清除矩形区域
    this.ctx.clearRect(
      -metrics.actualBoundingBoxLeft - (this.rtl ? metrics.width : 0),
      -metrics.fontBoundingBoxAscent - 2,
      metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent + 2
    )

    // 绘制文本：通电为红色，否则为黑色
    this.ctx.fillStyle = this.output ? '#FF0000' : '#000000'
    this.ctx.fillText(this.text, this.rtl ? -metrics.width : 0, 0)

    // 渲染可能的上划线（用于第23章的指令解码）
    // 注意：未针对RTL进行修改！
    if (this.overline) {
      this.ctx.strokeStyle = this.output ? '#FF0000' : '#000000'
      this.ctx.beginPath()
      this.ctx.moveTo(
        -metrics.actualBoundingBoxLeft,
        -metrics.fontBoundingBoxAscent
      )
      this.ctx.lineTo(
        metrics.actualBoundingBoxRight,
        -metrics.fontBoundingBoxAscent
      )
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  /**
   * 测量文本尺寸
   * @returns {TextMetrics} 文本度量对象
   */
  measureText() {
    this.ctx.save()
    this.setFont()
    let metrics = this.ctx.measureText(this.text)
    this.ctx.restore()

    return metrics
  }

  /**
   * 设置字体
   */
  setFont() {
    this.ctx.font = '14px ' + this.fontFamily
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'middle'
  }
}

/**
 * Node 类
 * 节点组件：多条电线的交汇点，显示为一个小圆点
 */
class Node extends MultiPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)
  }

  /**
   * 设置输入值
   * @param {number} num - 输入端口编号
   * @param {*} value - 输入值
   */
  setInput(num, value) {
    // 如果新旧值都是NaN，则不处理
    if (isNaN(value) && isNaN(this.output)) return

    if (value != this.output) {
      this.output = value

      if (!this.doNotPropagate) {
        this.propagate()
      }
      this.render()
    }
  }

  /**
   * 渲染节点（小圆点）
   */
  render() {
    if (this.hidden) return

    let pt = this.xformLocal({ x: 0, y: 0 })
    pt = this.xformGlobal(pt.x, pt.y)

    this.ctx.save()
    // 通电为红色，否则为黑色
    this.ctx.fillStyle = this.output ? '#FF0000' : '#000000'

    this.ctx.beginPath()
    this.ctx.arc(pt.x, pt.y, this.params.nodeRadius, 0, radians(360))
    this.ctx.fill()

    this.ctx.restore()
  }
}

/**
 * ComplexPropagator 类
 * 复杂传播器：具有多个输出端口的组件
 * 每个输出端口可以连接到不同的目标
 */
class ComplexPropagator extends Component {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    this.propagateMap = new Map() // 输出端口到目标的映射
  }

  /**
   * 设置扩展目标
   * @param {string} srcOut - 源输出端口名称
   * @param {Object} dstObj - 目标对象（通常是电线）
   * @param {number} dstInp - 目标输入端口（通常为0）
   */
  setDestinationEx(srcOut, dstObj, dstInp) {
    this.propagateMap.set(srcOut, { obj: dstObj, inp: dstInp })

    // 如果在输入已设置后才设置电线连接，需要更新输出
    this.setOutputs()
  }

  /**
   * 设置输出状态
   * 由派生类实现
   */
  setOutputs() {}

  /**
   * 传播指定输出端口的信号
   * @param {string} srcOut - 源输出端口名称
   * @param {*} value - 要传播的值
   */
  propagate(srcOut, value) {
    if (!this.propagateMap.has(srcOut)) return

    let destination = this.propagateMap.get(srcOut)

    destination.obj.setInput(destination.inp, value)
  }
}

// PropagatingSemiconductorsLib (c) Charles Petzold, 2024
//
// 半导体元件库 - 包含二极管矩阵、点阵显示屏和晶体管等组件
// 主要用于点阵时钟显示和指令解码器等高级电路

/**
 * NumericDiodeMatrix 类
 * 数字二极管矩阵 - 用于点阵时钟显示
 *
 * 功能：将列选择信号转换为行输出信号，用于驱动7行LED点阵
 * 包含0-9十个数字的点阵编码（每个数字5列×7行）
 *
 * 工作原理：
 *   - 50列输入（10个数字×5列/数字）
 *   - 7行输出
 *   - 当某列被激活时，该列中有二极管的行会输出高电平
 */
class NumericDiodeMatrix extends ComplexPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 布局参数
    this.separation = 20 // 列间距（像素）
    this.diagonal = 12 // 二极管对角线长度
    this.addlNumSep = 10 // 数字之间的额外间距
    this.dotRadius = 2 // 节点圆点半径
    this.currentCol = 0 // 当前激活的列

    // 二极管矩阵编码
    // 7行×50列，每5列表示一个数字（0-9）
    // 1 = 有二极管（LED亮），0 = 无二极管（LED暗）
    this.diodes = [
      //  0           1           2           3           4           5           6           7           8           9
      [
        0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1,
        0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1,
        1, 0,
      ], // 第1行
      [
        1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1,
        0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0,
        0, 1,
      ], // 第2行
      [
        1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1,
        0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0,
        0, 1,
      ], // 第3行
      [
        1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1,
        0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1,
        1, 1,
      ], // 第4行
      [
        1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
        0, 1,
      ], // 第5行
      [
        1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1,
        0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
        1, 0,
      ], // 第6行
      [
        0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1,
        0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1,
        0, 0,
      ], // 第7行
    ]
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："outN"（行输出）或 "colN"（列输入）
   * @returns {Object} 变换后的坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined) {
      if (io.startsWith('out')) {
        // 行输出端口（在右侧）
        let row = parseInt(io.substr(3))
        pt.x = 49 * this.separation + 9 * this.addlNumSep + this.diagonal
        pt.y = (row + 1) * this.separation - this.diagonal
      } else if (io.startsWith('col')) {
        // 列输入端口（在底部）
        let col = parseInt(io.substr(3))
        pt.x = col * this.separation + Math.floor(col / 5) * this.addlNumSep
        pt.y = 7 * this.separation
      }
    }

    return this.xformLocal(pt)
  }

  /**
   * 设置输入（列选择）
   * @param {number} col - 列编号（0-49）
   * @param {boolean} value - 是否激活
   */
  setInput(col, value) {
    if (value) {
      if (col != this.currentCol) {
        // 关闭当前列，传播 false 到相关行
        this.renderCol(this.currentCol, this.white, 2)
        this.renderCol(this.currentCol, this.black, 1)

        for (let row = 0; row < 7; row++) {
          if (this.diodes[row][this.currentCol] != 0) {
            this.propagate('out' + row, false)
          }
        }

        // 打开新列，传播 true 到相关行
        this.renderCol(col, this.white, 2)
        this.renderCol(col, this.red, 1)

        for (let row = 0; row < 7; row++) {
          if (this.diodes[row][col] != 0) {
            this.propagate('out' + row, true)
          }
        }

        this.currentCol = col
      }
    }
  }

  /**
   * 初始渲染 - 绘制所有列的初始状态（黑色）
   */
  render() {
    for (let col = 0; col < 50; col++) {
      this.renderCol(col, this.black, 1)
    }
  }

  /**
   * 渲染单列
   * @param {number} col - 列编号
   * @param {string} color - 颜色
   * @param {number} strokeWidth - 线宽
   */
  renderCol(col, color, strokeWidth) {
    this.ctx.save()
    this.ctx.strokeStyle = color
    this.ctx.fillStyle = color
    this.ctx.lineWidth = strokeWidth

    // 使用快捷方式：只应用全局平移
    let pt = { x: this.globalMatrix.e, y: this.globalMatrix.f }

    let didVert = false // 是否已绘制垂直线

    for (let row = 0; row < 7; row++) {
      let code = this.diodes[row][col]

      if (this.diodes[row][col] != 0) {
        let x =
          pt.x + col * this.separation + Math.floor(col / 5) * this.addlNumSep
        let y = pt.y + (row + 1) * this.separation

        // 绘制垂直连接线（只绘制一次）
        if (!didVert) {
          this.ctx.beginPath()
          this.ctx.moveTo(x, y)
          this.ctx.lineTo(x, pt.y + 7 * this.separation)
          this.ctx.stroke()
          didVert = true
        }

        // 绘制节点圆点
        this.ctx.beginPath()
        this.ctx.arc(x, y, this.dotRadius, 0, radians(360))
        this.ctx.fill()

        // 绘制二极管符号
        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.lineTo(x + 4, y - 4)
        this.ctx.lineTo(x + 6, y - 2)
        this.ctx.lineTo(x + 8, y - 8)
        this.ctx.lineTo(x + 2, y - 6)
        this.ctx.lineTo(x + 4, y - 4)

        this.ctx.moveTo(x + 10, y - 6)
        this.ctx.lineTo(x + 6, y - 10)

        this.ctx.moveTo(x + 8, y - 8)
        this.ctx.lineTo(x + this.diagonal, y - this.diagonal)

        // 绘制水平输出线
        this.ctx.lineTo(
          pt.x + 49 * this.separation + 9 * this.addlNumSep + this.diagonal,
          y - this.diagonal
        )
        this.ctx.stroke()

        // 绘制该行其他列的节点
        for (let xcol = col; xcol < 50; xcol++) {
          if (this.diodes[row][xcol] != 0) {
            let x =
              pt.x +
              xcol * this.separation +
              Math.floor(xcol / 5) * this.addlNumSep
            this.ctx.beginPath()
            this.ctx.arc(x + 12, y - 12, this.dotRadius, 0, radians(360))
            this.ctx.fill()
          }
        }
      }
    }
    this.ctx.restore()
  }
}

/**
 * InstructionDiodeMatrix 类
 * 指令二极管矩阵 - 用于 CPU 指令解码器
 *
 * 功能：将指令行选择信号转换为控制信号输出
 * 每行代表一条指令，每列代表一个控制信号
 *
 * 二极管编码：
 *   000 = 无节点，无二极管
 *   001 = 有二极管，无节点
 *   011 = 有二极管，有输出节点（行末尾）
 *   101 = 有二极管，有输入节点（列顶部）
 *   111 = 有二极管，有输入输出节点
 */
class InstructionDiodeMatrix extends ComplexPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 布局参数
    this.vertSeparation = 40 // 行间距
    this.horzSeparation = 50 // 列间距
    this.size = 24 // 二极管符号大小
    this.dotRadius = 2 // 节点圆点半径
    this.groupSeparation = 50 // 组间距

    // 指令解码矩阵
    // this.diodes[row][grp][col] - 行、组、列
    this.diodes = [
      // 地址总线 ----------------  数据总线 ---------------------------
      // EC1    EP1  EC2        EP2  EC1           EP1           EC2  EP2
      [[0, 0], [0], [0, 0, 0], [0], [5, 0, 0, 0], [1, 0, 0, 0], [0], [0]], // MOV r,r    - 寄存器到寄存器
      [[5, 0], [0], [0, 0, 0], [0], [0, 5, 0, 0], [3, 0, 0, 0], [0], [0]], // MOV r,M    - 内存到寄存器
      [[7, 0], [0], [0, 0, 0], [0], [7, 0, 0, 0], [0, 1, 0, 0], [0], [0]], // MOV M,r    - 寄存器到内存
      [[0, 0], [0], [0, 0, 0], [0], [0, 0, 5, 0], [3, 0, 0, 0], [0], [0]], // MVI r,data - 立即数到寄存器
      [[7, 0], [0], [0, 0, 0], [0], [0, 0, 7, 0], [0, 3, 0, 0], [0], [0]], // MVI M,data - 立即数到内存
      [[0, 0], [0], [0, 0, 0], [0], [7, 0, 0, 0], [0, 0, 5, 0], [5], [1]], // ADD r,...  - 加法（寄存器）
      [[7, 0], [0], [0, 0, 0], [0], [0, 7, 0, 0], [0, 0, 7, 0], [7], [3]], // ADD M,...  - 加法（内存）
      [[0, 0], [0], [0, 0, 0], [0], [0, 0, 7, 0], [0, 0, 7, 0], [7], [3]], // ADI data,. - 加立即数
      [[7, 0], [5], [5, 5, 0], [1], [0, 0, 0, 0], [0, 0, 0, 0], [0], [0]], // INX HL     - HL 自增
      [[7, 0], [7], [7, 0, 5], [3], [0, 0, 0, 0], [0, 0, 0, 0], [0], [0]], // DCX HL     - HL 自减
      [[0, 2], [0], [0, 0, 0], [0], [0, 7, 0, 0], [0, 0, 0, 1], [0], [0]], // LDA addr   - 加载累加器
      [[0, 7], [0], [0, 0, 0], [0], [0, 0, 0, 5], [0, 3, 0, 0], [0], [0]], // STA addr   - 存储累加器
    ]

    this.currentRow = -1 // 当前激活的行
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："rowN"（行输入）或 "outN"（列输出）
   * @returns {Object} 变换后的坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined) {
      if (io.startsWith('row')) {
        // 行输入端口（在左侧）
        let row = parseInt(io.substr(3))
        pt.x = 0
        pt.y = row * this.vertSeparation
      }

      if (io.startsWith('out')) {
        // 列输出端口（在底部）
        let out = parseInt(io.substr(3))

        pt.y = this.vertSeparation * this.diodes.length
        pt.x = this.size

        let grp = 0
        let col = 0

        // 计算输出端口的 X 坐标
        for (let i = 0; i < out; i++) {
          pt.x += this.horzSeparation

          if (++col == this.diodes[0][grp].length) {
            col = 0
            grp++
            pt.x += this.groupSeparation
          }
        }
      }
    }
    return this.xformLocal(pt)
  }

  /**
   * 设置输入（行选择）
   * @param {number} row - 行编号（指令编号）
   * @param {boolean} value - 是否激活
   */
  setInput(row, value) {
    if (value) {
      if (row != this.currentRow) {
        // 关闭当前行
        this.colorAndPropagate(this.currentRow, false)
        // 激活新行
        this.colorAndPropagate(row, true)

        this.currentRow = row
      }
    } else {
      this.colorAndPropagate(row, false)
    }
  }

  /**
   * 着色并传播信号
   * @param {number} row - 行编号
   * @param {boolean} state - 状态（true=激活，false=关闭）
   */
  colorAndPropagate(row, state) {
    if (row == -1) return

    // 渲染行颜色
    if (state) {
      this.renderRow(row, this.white, 2)
      this.renderRow(row, this.red, 1)
    } else {
      this.renderRow(row, this.white, 2)
      this.renderRow(row, this.black, 1)
    }

    // 传播信号到所有激活的列
    for (let grp = 0; grp < this.diodes[row].length; grp++) {
      for (let col = 0; col < this.diodes[row][grp].length; col++) {
        if (this.diodes[row][grp][col] != 0) {
          let out = this.grpColToOut(grp, col)
          this.propagate(out, state)
        }
      }
    }
  }

  /**
   * 将组和列转换为输出端口编号
   * @param {number} group - 组编号
   * @param {number} column - 列编号
   * @returns {number} 输出端口编号
   */
  grpColToOut(group, column) {
    let out = 0

    for (let grp = 0; grp < this.diodes[0].length; grp++) {
      for (let col = 0; col < this.diodes[0][grp].length; col++) {
        if (grp == group && col == column) break

        out++
      }
      if (grp == group) break
    }

    return out
  }

  /**
   * 初始渲染 - 绘制所有行的初始状态
   */
  render() {
    for (let row = 0; row < this.diodes.length; row++) {
      this.renderRow(row, this.black, 1)
    }
  }

  /**
   * 渲染单行
   * @param {number} row - 行编号
   * @param {string} color - 颜色
   * @param {number} strokeWidth - 线宽
   */
  renderRow(row, color, strokeWidth) {
    this.ctx.save()
    this.ctx.strokeStyle = color
    this.ctx.fillStyle = color
    this.ctx.lineWidth = strokeWidth

    // 使用快捷方式：只应用局部和全局平移
    let pt = {
      x: this.globalMatrix.e + this.localMatrix.e,
      y: this.globalMatrix.f + this.localMatrix.f,
    }
    let y = pt.y + row * this.vertSeparation
    let x = pt.x

    let lastDotx = pt.x

    // 遍历所有组和列
    for (let grp = 0; grp < this.diodes[row].length; grp++) {
      for (let col = 0; col < this.diodes[row][grp].length; col++) {
        if (this.diodes[row][grp][col] != 0) {
          // 绘制输入节点（位 2）
          if ((this.diodes[row][grp][col] & 0x04) != 0) {
            this.ctx.beginPath()
            this.ctx.arc(x, y, this.dotRadius, 0, radians(360))
            this.ctx.fill()
          }

          // 绘制水平连接线
          if (lastDotx != x) {
            this.ctx.beginPath()
            this.ctx.moveTo(lastDotx, y)
            this.ctx.lineTo(x, y)
            this.ctx.stroke()
          }

          // 绘制二极管符号
          this.ctx.save()
          this.ctx.translate(x, y)
          this.ctx.scale(this.size / 6, this.size / 6)

          this.ctx.beginPath()
          this.ctx.moveTo(0, 0)
          this.ctx.lineTo(2, 2)
          this.ctx.lineTo(3, 1)
          this.ctx.lineTo(4, 4)
          this.ctx.lineTo(1, 3)
          this.ctx.lineTo(2, 2)

          this.ctx.moveTo(5, 3)
          this.ctx.lineTo(3, 5)

          this.ctx.moveTo(4, 4)
          this.ctx.lineTo(6, 6)

          this.ctx.restore()
          this.ctx.stroke()

          lastDotx = x

          // 绘制垂直输出线和节点
          let rowDown = row
          let xDown = x + this.size
          let yDown = y + this.size
          let lastDoty = yDown

          while (rowDown < this.diodes.length) {
            // 绘制输出节点（位 1）
            if ((this.diodes[rowDown][grp][col] & 0x02) != 0) {
              this.ctx.beginPath()
              this.ctx.arc(xDown, yDown, this.dotRadius, 0, radians(360))
              this.ctx.fill()

              if (lastDoty != y) {
                this.ctx.beginPath()
                this.ctx.moveTo(xDown, lastDoty)
                this.ctx.lineTo(xDown, yDown)
                this.ctx.stroke()
              }
              lastDoty = yDown
            }
            rowDown++
            yDown += this.vertSeparation
          }

          yDown -= this.size

          // 绘制剩余的垂直线
          if (lastDoty != yDown) {
            this.ctx.beginPath()
            this.ctx.moveTo(xDown, lastDoty)
            this.ctx.lineTo(xDown, yDown)
            this.ctx.stroke()
          }
        }

        x += this.horzSeparation
      }
      x += this.groupSeparation
    }
    this.ctx.restore()
  }
}

/**
 * DotMatrixDisplay 类
 * 点阵显示屏 - 5×7 LED 矩阵显示
 *
 * 功能：接收行和列信号，显示 LED 点阵图案
 * 包含渐隐动画效果，模拟 LED 余辉
 */
class DotMatrixDisplay extends ComplexPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 列和行的当前状态
    this.cols = [false, false, false, false, false] // 5 列
    this.rows = [false, false, false, false, false, false, false] // 7 行

    // LED 亮度值（0-255）
    this.leds = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]

    // 显示参数
    this.radius = 15 // LED 圆点半径
    this.separation = 36 // LED 间距
    this.width = 5 * this.separation // 显示屏宽度
    this.height = 7 * this.separation // 显示屏高度

    // 启动渐隐动画（每30ms执行一次）
    setInterval(this.fadeOutAnimation.bind(this), 30)
  }

  /**
   * 渐隐动画 - LED 亮度逐渐衰减
   * 模拟 LED 的余辉效果
   */
  fadeOutAnimation() {
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        this.leds[row][col] *= 0.95 // 亮度衰减 5%
      }

    this.render()
  }

  /**
   * 设置输入
   * @param {number} num - 端口编号（>=0 为行，<0 为列）
   * @param {boolean} value - 信号值
   */
  setInput(num, value) {
    // 行输入（来自 NumericDiodeMatrix）
    if (num >= 0) {
      this.rows[num] = value
    }
    // 列输入（来自 Transistor）
    else {
      let col = Math.abs(num) - 1
      this.cols[col] = value

      if (value) {
        // 当列激活时，更新对应的 LED 亮度
        for (let row = 0; row < 7; row++) {
          this.leds[row][col] = this.rows[row] && this.cols[col] ? 255 : 0
        }
      }

      this.render()
    }
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："rowN" 或 "colN"
   * @returns {Object} 变换后的坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined) {
      if (io.startsWith('row')) {
        // 行端口（在左侧）
        let row = parseInt(io.substr(3))
        pt.y = (row + 0.5) * this.separation
      } else if (io.startsWith('col')) {
        // 列端口（在底部）
        let col = parseInt(io.substr(3))
        pt.x = (col + 0.5) * this.separation
        pt.y = this.height
      }
    }

    return this.xformLocal(pt)
  }

  /**
   * 渲染点阵显示屏
   */
  render() {
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    // 绘制外框
    this.ctx.beginPath()
    this.ctx.rect(0, 0, this.width, this.height)
    this.ctx.strokeStyle = this.black
    this.ctx.stroke()

    // 绘制所有 LED
    for (let row = 0; row < 7; row++) {
      let y = (row + 0.5) * this.separation

      for (let col = 0; col < 5; col++) {
        let x = (col + 0.5) * this.separation

        // 清除之前的 LED
        this.ctx.clearRect(
          x - this.radius - 1,
          y - this.radius - 1,
          2 * this.radius + 2,
          2 * this.radius + 2
        )

        // 绘制 LED 圆形
        this.ctx.beginPath()
        this.ctx.moveTo(x + this.radius, y)
        this.ctx.arc(x, y, this.radius, 0, radians(360))

        // 根据亮度设置颜色（红色渐变）
        let val = 255 - Math.floor(this.leds[row][col])
        this.ctx.fillStyle = `rgb(255, ${val}, ${val})`
        this.ctx.fill()

        this.ctx.strokeStyle = this.black
        this.ctx.stroke()
      }
    }
    this.ctx.restore()
  }
}

/**
 * Transistor 类
 * 晶体管 - NPN 型晶体管模拟
 *
 * 功能：模拟晶体管的开关行为
 * 当基极（B）和集电极（C）都为高时，发射极（E）输出高
 *
 * 特殊模式：
 *   - sink=true: 用于 LED 显示屏驱动，基极信号直接传递到集电极和发射极
 *
 * 符号说明：
 *   B = Base（基极）- 控制端
 *   C = Collector（集电极）- 输入端
 *   E = Emitter（发射极）- 输出端
 */
class Transistor extends ComplexPropagator {
  constructor(layout, canvas, ctx, id, params) {
    super(layout, canvas, ctx, id, params)

    // 几何参数
    this.radius = 25 // 圆形外框半径
    this.center = { x: 0, y: 0 } // 中心点
    this.ptB = { x: -this.radius, y: 0 } // 基极端口位置
    this.base = { x: -10, y: 0 } // 基极线起点
    this.baseLength = 30 // 基极线长度
    this.baseOffset = 5 // 基极线偏移量
    this.angle = (Math.PI * 22.5) / 180 // 集电极/发射极角度

    // 集电极和发射极端口位置
    this.ptC = {
      x: this.radius * Math.sin(this.angle),
      y: -this.radius * Math.cos(this.angle),
    }
    this.ptE = {
      x: this.radius * Math.sin(this.angle),
      y: this.radius * Math.cos(this.angle),
    }

    // 各端口状态
    this.B = false // 基极
    this.C = false // 集电极
    this.E = false // 发射极
  }

  /**
   * 获取端口坐标
   * @param {string} io - 端口名称："B"、"C"、"E" 或 "rowN"/"colN"
   * @returns {Object} 变换后的坐标
   */
  getCoordinates(io) {
    let pt = { x: 0, y: 0 }

    if (io != undefined) {
      switch (io) {
        case 'B':
          pt = this.ptB
          break // 基极
        case 'C':
          pt = this.ptC
          break // 集电极
        case 'E':
          pt = this.ptE
          break // 发射极
      }

      // 兼容点阵显示的行列端口
      if (io.startsWith('row')) {
        let row = parseInt(io.substr(3))
        pt.y = (row + 0.5) * this.separation
      } else if (io.startsWith('col')) {
        let col = parseIn(io.substr(3))
        pt.x = (col + 0.5) * this.separation
      }
    }

    pt = this.xformLocal(pt)

    return pt
  }

  /**
   * 设置输入
   * @param {number|string} num - 端口标识（"B" 或 "C"）
   * @param {boolean} value - 信号值
   */
  setInput(num, value) {
    // 特殊模式：sink（用于 LED 驱动）
    if (this.propertyMap.has('sink') && this.propertyMap.get('sink')) {
      // 基极信号直接传递到集电极和发射极
      this.output = value
      this.B = value
      this.C = value
      this.E = value

      this.propagate('C', value)
      this.propagate('E', value)

      this.render()
    }
    // 正常晶体管模式
    else {
      if (num == 'B') {
        this.B = value // 设置基极
      }
      if (num == 'C') {
        this.C = value // 设置集电极
      }

      // 发射极输出 = 基极 AND 集电极
      this.E = this.B && this.C
      this.output = this.E
      this.propagate('E', this.output)
      this.render()
    }
  }

  /**
   * 渲染晶体管
   */
  render() {
    this.ctx.save()

    // 先用白色擦除，再用黑色/红色绘制
    this.colorRender(true) // 擦除
    this.colorRender(false) // 绘制

    this.ctx.restore()
  }

  /**
   * 带颜色的渲染
   * @param {boolean} erase - 是否为擦除模式
   */
  colorRender(erase) {
    this.ctx.lineWidth = erase ? 2 : 1

    // 绘制基极
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    this.ctx.moveTo(this.base.x, this.base.y - this.baseLength / 2)
    this.ctx.lineTo(this.base.x, this.base.y + this.baseLength / 2)

    this.ctx.moveTo(this.base.x, this.base.y)
    this.ctx.lineTo(this.ptB.x, this.base.y)
    this.ctx.restore()

    this.ctx.strokeStyle = erase ? this.white : this.B ? this.red : this.black
    this.ctx.stroke()

    // 绘制集电极
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    this.ctx.moveTo(this.base.x, this.base.y - this.baseOffset)
    this.ctx.lineTo(this.ptC.x, this.ptC.y)
    this.ctx.restore()

    this.ctx.strokeStyle = erase ? this.white : this.C ? this.red : this.black
    this.ctx.stroke()

    // 绘制发射极
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    this.ctx.moveTo(this.base.x, this.base.y + this.baseOffset)
    this.ctx.lineTo(this.ptE.x, this.ptE.y)
    this.ctx.restore()

    this.ctx.strokeStyle = erase ? this.white : this.E ? this.red : this.black
    this.ctx.stroke()

    // 绘制发射极箭头
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    this.drawArrow(
      this.ptE,
      { x: this.base.x, y: this.base.y + this.baseOffset },
      10,
      25
    )
    this.ctx.restore()

    this.ctx.fillStyle = erase ? this.white : this.E ? this.red : this.black
    this.ctx.fill()

    // 绘制圆形外框
    this.ctx.save()
    this.applyGlobalTransform()
    this.applyLocalTransform()

    this.ctx.beginPath()
    this.ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI)
    this.ctx.restore()

    this.ctx.strokeStyle = erase ? this.white : this.black
    this.ctx.stroke()
  }

  /**
   * 绘制箭头
   * @param {Object} ptLast - 箭头尖端位置
   * @param {Object} ptPrev - 箭头来源方向点
   * @param {number} arrowLength - 箭头长度
   * @param {number} arrowAngle - 箭头张角（度）
   */
  drawArrow(ptLast, ptPrev, arrowLength, arrowAngle) {
    // 计算方向向量
    let xVector = ptPrev.x - ptLast.x
    let yVector = ptPrev.y - ptLast.y
    let length = Math.sqrt(xVector * xVector + yVector * yVector)
    xVector /= length
    yVector /= length

    // 计算箭头两侧的点
    let ptArrow1 = this.arrowPoint({ x: xVector, y: yVector }, arrowAngle)
    let x1 = ptLast.x + arrowLength * ptArrow1.x
    let y1 = ptLast.y + arrowLength * ptArrow1.y

    let ptArrow2 = this.arrowPoint({ x: xVector, y: yVector }, -arrowAngle)
    let x2 = ptLast.x + arrowLength * ptArrow2.x
    let y2 = ptLast.y + arrowLength * ptArrow2.y

    // 绘制箭头三角形
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(ptLast.x, ptLast.y)
    this.ctx.lineTo(x2, y2)
    this.ctx.closePath()
  }

  /**
   * 计算旋转后的箭头点
   * @param {Object} vector - 方向向量
   * @param {number} arrowAngle - 旋转角度（度）
   * @returns {Object} 旋转后的向量
   */
  arrowPoint(vector, arrowAngle) {
    let x =
      vector.x * Math.cos(radians(arrowAngle)) -
      vector.y * Math.sin(radians(arrowAngle))
    let y =
      vector.x * Math.sin(radians(arrowAngle)) +
      vector.y * Math.cos(radians(arrowAngle))
    return { x: x, y: y }
  }
}

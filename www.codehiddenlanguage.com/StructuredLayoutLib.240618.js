// StructuredLayoutLib (c) Charles Petzold, 2024
// 结构化布局库 - 用于构建和渲染交互式电路图

/**
 * CircuitBuilder 类
 * 电路构建器 - 负责解析电路配置、创建组件、连接电线并处理交互
 */
class CircuitBuilder {
  /**
   * 构造函数
   * @param {HTMLCanvasElement} canvas - 用于绘制电路的画布元素
   * @param {Object} circuit - 电路配置对象（包含组件和电线定义）
   */
  constructor(canvas, circuit) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    // this.ctx.textRendering = "optimizeLegibility";
    this.circuit = circuit

    // 默认参数配置
    this.params = {
      propagationDelay: 100, // 信号传播延迟（毫秒）
      nodeRadius: 5, // 节点半径（像素）
      wireCurveRadius: 20, // 电线转角曲线半径
      dataPathWidth: 18, // 数据通路宽度
      triStateMap: new Map(), // 三态门映射表
      cpuIncludeJumps: false, // 仅用于第23、24章的CPU：是否包含跳转指令
      cpuAltMemory: false, // 仅用于第23、24章的CPU：是否使用备用存储器
    }

    this.compMap = new Map() // 组件查找表：存储所有电路组件
    this.wireMap = new Map() // 电线查找表：用于"可测试"电路的电线存储

    this.externalMatrices = new Map() // 外部引用的变换矩阵
    this.accumulatedMatrix = new DOMMatrix() // 累积变换矩阵

    // 保存依赖关系，用于"可测试"电路
    this.dependencies = undefined

    // 闭合回路数组：存储所有形成完整回路的路径
    this.closedCircles = []

    // 阻止点击和指针事件选中画布外的文本
    canvas.onselectstart = this.onSelectStart.bind(this)

    // 开始构建电路
    this.BuildCircuit(this.circuit)
  }

  /**
   * 阻止文本选择事件
   * @param {Event} event - 选择开始事件
   * @returns {boolean} 返回false以阻止默认行为
   */
  onSelectStart(event) {
    return false
  }

  /**
   * 构建电路（第一阶段）
   * 解析电路配置，设置变换矩阵和参数
   * @param {Object} circuit - 电路配置对象
   */
  BuildCircuit(circuit) {
    // 保存依赖关系，用于"可测试"和"一致性"电路
    this.dependencies = circuit.dependencies

    // 如果定义了变换，构建变换矩阵
    if (circuit.transform != undefined) {
      let circuitMatrix = this.ConstructMatrix(
        circuit.transform.scale,
        circuit.transform.rotate,
        circuit.transform.x,
        circuit.transform.y
      )

      this.accumulatedMatrix = new DOMMatrix(circuitMatrix)
    }

    // 从电路配置中读取参数
    if (circuit.propagationDelay != undefined) {
      this.params.propagationDelay = circuit.propagationDelay
    }

    if (circuit.nodeRadius != undefined) {
      this.params.nodeRadius = circuit.nodeRadius
    }

    if (circuit.wireCurveRadius != undefined) {
      this.params.wireCurveRadius = circuit.wireCurveRadius
    }

    if (circuit.cpuIncludeJumps != undefined) {
      this.params.cpuIncludeJumps = circuit.cpuIncludeJumps
    }

    if (circuit.cpuAltMemory != undefined) {
      this.params.cpuAltMemory = circuit.cpuAltMemory
    }

    // 进入第二阶段构建
    this.BuildCircuit2(circuit)
  }

  /**
   * 构建外部引用的电路
   * 处理嵌套的外部电路模块
   * @param {Object} circuit - 外部电路配置
   * @param {string} fullName - 完整的组件名称
   * @param {Object} item - 包含位置和变换信息的项目
   */
  BuildExternal(circuit, fullName, item) {
    // 保存当前的全局变换矩阵
    let accumulatedMatrixSave = new DOMMatrix(this.accumulatedMatrix)

    // 获取应用于外部引用的变换矩阵
    let externalMatrix = this.ConstructMatrix(
      item.scale,
      item.rotate,
      item.x,
      item.y
    )

    // 使用fullName作为键保存到字典中
    this.externalMatrices.set(fullName, externalMatrix)

    // 将变换矩阵累乘到累积矩阵中
    this.accumulatedMatrix.multiplySelf(externalMatrix)

    // 递归构建外部电路
    this.BuildCircuit2(circuit, fullName)

    // 恢复之前的累积变换矩阵
    this.accumulatedMatrix = accumulatedMatrixSave
  }

  /**
   * 构建电路（第二阶段）
   * 创建所有组件和电线，设置信号传播链
   * @param {Object} circuit - 电路配置对象
   * @param {string|null} prefix - 组件名称前缀（用于嵌套电路）
   */
  BuildCircuit2(circuit, prefix = null) {
    // 首先处理所有组件（逻辑门、按钮、指示灯等）
    for (let i = 0; i < circuit.components.length; i++) {
      let item = circuit.components[i]

      // 跳过注释项
      if (item.comment != undefined) continue

      // 构建组件的完整名称
      let fullName = this.FormFullName(item.name, prefix)

      // 外部引用类型会触发递归调用
      if (item.type == 'External') {
        // fullName成为新的前缀
        // item用于构建和保存变换矩阵
        this.BuildExternal(eval(item.file), fullName, item)
      } else {
        // 获取组件的坐标位置
        let pos = this.GetCoordinates(item, prefix, this.compMap)

        // 创建组件实例
        let cl = eval(item.type)
        let component = new cl(
          this,
          this.canvas,
          this.ctx,
          fullName,
          Object.assign({}, this.params)
        )

        // 对于"可测试"电路，禁止自动信号传播
        if (circuit.testable != undefined && circuit.testable) {
          component.doNotPropagate = true
        }

        // 设置局部和全局变换矩阵
        let localMatrix = this.ConstructMatrix(
          item.scale,
          item.rotate,
          pos.x,
          pos.y
        )

        component.saveLocalTransform(localMatrix)
        component.saveGlobalTransform(this.accumulatedMatrix)

        // 设置组件特有的属性（最常见的是Label的"text"属性）
        for (var prop in item) {
          if (item.hasOwnProperty(prop)) {
            if (
              prop != 'name' &&
              prop != 'type' &&
              prop != 'relative' &&
              prop != 'x' &&
              prop != 'y' &&
              prop != 'scale' &&
              prop != 'rotate'
            ) {
              component.setProperty(prop, item[prop])
            }
          }
        }

        // 将组件保存到查找表中
        this.compMap.set(fullName, component)
      }
    }

    // 渲染所有组件
    for (let [name, component] of this.compMap) {
      component.render()
    }

    // 接下来处理电线
    if (circuit.wires != null) {
      for (let i = 0; i < circuit.wires.length; i++) {
        let item = circuit.wires[i]

        // 跳过注释项
        if (item.comment != undefined) continue

        let points = [] // 电线路径点数组
        let components = [] // 连接的组件数组
        let ptLast = { x: 0, y: 0 } // 上一个点的坐标

        // 遍历电线的所有路径点
        for (let j = 0; j < item.points.length; j++) {
          let ptref = item.points[j]

          // 检查是否定义了x和y坐标
          let x = ptref.x != undefined ? ptref.x : 0
          let y = ptref.y != undefined ? ptref.y : 0
          let pt = { x: x, y: y }

          // 如果引用了组件名称，获取组件的端口坐标
          if (ptref.name != undefined) {
            let fullName = this.FormFullName(ptref.name, prefix)
            let component = this.compMap.get(fullName)
            let ptComp = component.getCoordinates(ptref.io, true)
            ptComp = this.ApplyIntermediateTransform(ptref.name, prefix, ptComp)

            pt.x += ptComp.x
            pt.y += ptComp.y

            // 保存到wireMap的组件信息
            components.push({ name: fullName, io: ptref.io })
          }
          // 如果定义了相对偏移量dx或dy
          else if (ptref.dx != undefined || ptref.dy != undefined) {
            if (ptref.dx != undefined) pt.x = ptLast.x + ptref.dx

            if (ptref.dy != undefined) pt.y = ptLast.y + ptref.dy
          }

          ptLast = pt
          points.push(pt)
        }

        // 创建电线对象，解析各种可选属性
        let wide = item.wide != undefined ? item.wide : false // 是否为宽线（8位数据通路）
        let chars = item.chars != undefined ? item.chars : 2 // 显示字符数
        let beg = item.beg != undefined ? item.beg : 'close' // 起点样式
        let end = item.end != undefined ? item.end : 'arrow' // 终点样式
        let wide16 = item.wide16 != undefined ? item.wide16 : false // 是否为16位宽线
        let pos = item.pos != undefined ? item.pos : undefined // 标签位置
        let nudge = item.nudge != undefined ? item.nudge : 0 // 微调偏移
        let hidden = item.hidden != undefined ? item.hidden : false // 是否隐藏
        let arrow = item.arrow != undefined ? item.arrow : 'none' // 箭头样式

        // 根据宽度创建普通电线或数据通路
        let wire =
          !wide && !wide16
            ? new WireArray(
                this,
                this.canvas,
                this.ctx,
                i,
                this.params,
                points,
                arrow,
                hidden
              )
            : new DataPath(
                this,
                this.canvas,
                this.ctx,
                i,
                this.params,
                points,
                chars,
                beg,
                end,
                wide16,
                pos,
                nudge
              )

        wire.saveGlobalTransform(this.accumulatedMatrix)

        // 对于"可测试"电路，禁止自动信号传播
        if (circuit.testable != undefined && circuit.testable) {
          wire.doNotPropagate = true
        }

        wire.render()

        // 这是为了绕过继电器的一些问题（现在还需要吗？）
        if (item.propagate != false) {
          // 将第一个组件连接到电线
          let firstComponent = this.compMap.get(
            this.FormFullName(item.points[0].name, prefix)
          )

          // 如果定义了"hook"属性，使用它作为电线的信号源
          if (item.points[0].hook != undefined) {
            firstComponent = this.compMap.get(
              this.FormFullName(item.points[0].hook, prefix)
            )
          }

          // 根据组件类型设置信号传播目标
          if (typeof firstComponent.setDestination == 'function') {
            firstComponent.setDestination(wire, 0)
          } else if (typeof firstComponent.addDestination == 'function') {
            // 第二个参数在需要从ALU中的DataPathNode获取某一位之前一直是零
            if (item.points[0].output == undefined) {
              firstComponent.addDestination(wire, 0)
            } else {
              firstComponent.addDestination(wire, item.points[0].output)
            }
          }
          // 为盒子组件添加："output"可以是"q"或"qbar"；对于晶体管，"output"可以是"E"
          else if (typeof firstComponent.setDestinationEx == 'function') {
            firstComponent.setDestinationEx(item.points[0].output, wire, 0)
          }

          // 将电线连接到最后一个组件
          let lastPtref = item.points[item.points.length - 1]
          let lastComponent = this.compMap.get(
            this.FormFullName(lastPtref.name, prefix)
          )

          // 查找目标输入端口（对于逻辑门是0或1；对于触发器是"data"或"clk"）
          let input = lastPtref.input == undefined ? 0 : lastPtref.input

          wire.setDestination(lastComponent, input)
        }

        // 将电线保存到映射表中，用于"可测试"电路的测试
        if (item.name != undefined) {
          this.wireMap.set(this.FormFullName(item.name, prefix), {
            wire: wire,
            components: components,
          })
        }
      }
    }

    // 对于"可测试"电路，为Switch和Relay设置状态变化通知处理器
    if (circuit.testable != undefined && circuit.testable) {
      for (let [name, component] of this.compMap) {
        let compType = component.constructor.name

        if (compType == 'Switch' || compType == 'Relay') {
          component.notifyChange(this.CircuitChange.bind(this))
        }
      }

      // 初始化电路状态
      this.CircuitChange('')
    }

    // 这用于第8章的第二个小猫选择器，只是为了保持颜色开关的一致性
    else if (circuit.consistency != undefined && circuit.consistency) {
      for (let [name, component] of this.compMap) {
        let compType = component.constructor.name

        if (compType == 'Switch') {
          component.notifyChange(this.CircuitConsistency.bind(this))
        }
      }

      this.CircuitConsistency('')
    }
  }

  /**
   * 处理电路一致性
   * 根据依赖关系同步开关状态（用于小猫选择器等场景）
   * @param {string} name - 触发变化的开关名称
   */
  CircuitConsistency(name) {
    if (this.dependencies != undefined) {
      for (let i = 0; i < this.dependencies.length; i++) {
        let dependency = this.dependencies[i]

        if (dependency.name == name) {
          // 假设它是一个Switch开关
          let value = this.compMap.get(name).closed

          // 如果定义了特定值且不匹配，跳过
          if (dependency.value != undefined && dependency.value != value) {
            continue
          }

          // 处理"一致"依赖：设置为相同状态
          if (dependency.accordance != undefined) {
            for (let j = 0; j < dependency.accordance.length; j++) {
              let comp = this.compMap.get(dependency.accordance[j].name)
              comp.closed = value
              comp.setOutput()
            }
          }

          // 处理"相反"依赖：设置为相反状态
          if (dependency.contrary != undefined) {
            for (let j = 0; j < dependency.contrary.length; j++) {
              let comp = this.compMap.get(dependency.contrary[j].name)
              comp.closed = !value
              comp.setOutput()
            }
          }
        }
      }
    }
  }

  /**
   * 当开关或继电器状态改变时调用
   * 重新计算所有闭合回路并更新电路着色
   * @param {string} name - 发生变化的组件名称
   */
  CircuitChange(name) {
    // 首先检查依赖关系（仅在小猫选择器中使用）
    this.CircuitConsistency(name)

    // 初始化闭合回路数组为空
    this.closedCircles = []

    // 遍历所有组件，从电源开始搜索
    for (let [name, component] of this.compMap) {
      let compType = component.constructor.name

      // 电路的起点：电压源V或电池Battery
      if (compType == 'V' || compType == 'Battery') {
        this.TestCompleteCircuit(name, '', [])
      }
    }

    // 根据闭合回路给电路着色
    this.ColorCircuit(this.closedCircles)
  }

  /**
   * 测试完整电路回路
   * 从电源出发，递归搜索所有可能的闭合回路
   * 首次调用从V或Battery开始，后续调用是电线的端点
   * @param {string} name - 当前组件名称
   * @param {string} io - 当前端口名称
   * @param {Array} circle - 当前路径上的组件数组
   */
  TestCompleteCircuit(name, io, circle) {
    let component = this.compMap.get(name)
    let compType = component.constructor.name

    // 断开的开关 --> 停止搜索
    if (compType == 'Switch' && !component.closed) {
      return
    }
    // 电路终点 --> 保存组件和回路，停止搜索
    else if (
      (compType == 'Battery' && circle.length != 0) ||
      compType == 'Ground'
    ) {
      circle.push({ name: name, io: '' })
      this.closedCircles.push(circle)
      return
    }

    // 记录当前组件到路径中
    if (compType == 'Relay') {
      // 继电器的io值这里是coilIn和pivot
      circle.push({ name: name, io: io })
    } else {
      circle.push({ name: name, io: '' })
    }

    // 遍历所有电线，查找从当前组件出发的连接
    for (let [wireName, value] of this.wireMap) {
      // Prevent infinite loops: do not traverse wires already in the current path
      if (circle.some((item) => item.name == wireName)) continue

      let first = value.components[0]
      let last = value.components[value.components.length - 1]

      if (first.name == name) {
        let component = this.compMap.get(first.name)

        // 继电器需要特殊处理其内部连接
        if (component.constructor.name == 'Relay') {
          // 检查io端口是否可以完成连接
          if (
            ((io == 'pivot' || io == 'pivotSide') &&
              first.io == 'out0' &&
              !component.isTriggered) ||
            ((io == 'pivot' || io == 'pivotSide') &&
              first.io == 'out1' &&
              component.isTriggered) ||
            (io == 'coilIn' && first.io == 'coilOut') ||
            (io == 'out0' &&
              (first.io == 'pivot' || first.io == 'pivotSide') &&
              !component.isTriggered) ||
            (io == 'out1' &&
              (first.io == 'pivot' || first.io == 'pivotSide') &&
              component.isTriggered) ||
            (io == 'coilOut' && first.io == 'coilIn')
          ) {
            circle.push({ name: first.name, io: first.io })

            // 克隆当前路径并继续递归搜索
            let clone = [].concat(circle)
            clone.push({ name: wireName, io: '' })
            this.TestCompleteCircuit(last.name, last.io, clone)
          }
        } else {
          // 非继电器组件：直接继续搜索
          let clone = [].concat(circle)
          clone.push({ name: wireName, io: '' })
          this.TestCompleteCircuit(last.name, last.io, clone)
        }
      } else if (last.name == name) {
        let component = this.compMap.get(last.name)

        // For now, only support reverse traversal for non-Relay components
        // Relay logic is complex and direction-dependent
        if (component.constructor.name != 'Relay') {
          let clone = [].concat(circle)
          clone.push({ name: wireName, io: '' })
          this.TestCompleteCircuit(first.name, first.io, clone)
        }
      }
    }
  }

  /**
   * 根据闭合回路给电路着色
   * 遍历所有电线和组件，根据是否在闭合回路中设置输出状态
   * @param {Array} closedCircles - 所有闭合回路的数组
   */
  ColorCircuit(closedCircles) {
    // 更新所有电线的状态和颜色
    for (let [wireName, value] of this.wireMap) {
      let wire = value.wire
      wire.output = this.IsNameInClosedCollections(wireName, '', closedCircles)
      wire.render()
    }

    // 更新所有组件的状态和颜色
    for (let [name, component] of this.compMap) {
      if (component.constructor.name == 'Relay') {
        // 继电器有多个导电路径需要分别处理
        component.setConducting(
          0,
          this.IsNameInClosedCollections(name, 'coilOut', closedCircles)
        )
        component.setConducting(
          1,
          this.IsNameInClosedCollections(name, 'out0', closedCircles)
        )
        component.setConducting(
          2,
          this.IsNameInClosedCollections(name, 'out1', closedCircles)
        )
      } else {
        component.output = this.IsNameInClosedCollections(
          name,
          '',
          closedCircles
        )
      }
      component.render()
    }
  }

  /**
   * 检查回路数组是否包含指定的名称和端口
   * @param {Array} circle - 单个回路数组
   * @param {string} name - 要查找的名称
   * @param {string} io - 要查找的端口
   * @returns {boolean} 是否找到匹配
   */
  CircleArrayIncludesNameAndIo(circle, name, io) {
    for (let i = 0; i < circle.length; i++) {
      if (name == circle[i].name && io == circle[i].io) return true
    }
    return false
  }

  /**
   * 检查名称是否在任何闭合回路集合中
   * @param {string} name - 组件或电线名称
   * @param {string} io - 端口名称
   * @param {Array} closedCircles - 所有闭合回路的数组
   * @returns {boolean} 是否在闭合回路中
   */
  IsNameInClosedCollections(name, io, closedCircles) {
    let isInArray = false

    for (let i = 0; i < closedCircles.length; i++) {
      let circle = closedCircles[i]

      isInArray |= this.CircleArrayIncludesNameAndIo(circle, name, io)
    }

    return isInArray
  }

  /**
   * 构建2D变换矩阵
   * 根据缩放、旋转和平移参数创建DOMMatrix
   * @param {number} scale - 缩放比例
   * @param {number} rotate - 旋转角度（度）
   * @param {number} x - X轴平移
   * @param {number} y - Y轴平移
   * @returns {DOMMatrix} 变换矩阵
   */
  ConstructMatrix(scale, rotate, x, y) {
    // 设置默认值
    x = x == undefined ? 0 : x
    y = y == undefined ? 0 : y
    scale = scale == undefined ? 1 : scale
    rotate = rotate == undefined ? 0 : rotate

    // 将角度转换为弧度
    rotate = (Math.PI * rotate) / 180

    // 创建单位变换矩阵
    let m = new DOMMatrix()

    // 设置矩阵各元素
    // [ a  c  e ]     [ cos*s  -sin*s  x ]
    // [ b  d  f ]  =  [ sin*s   cos*s  y ]
    // [ 0  0  1 ]     [   0       0    1 ]
    m.a = scale * Math.cos(rotate)
    m.b = scale * Math.sin(rotate)
    m.c = scale * -Math.sin(rotate)
    m.d = scale * Math.cos(rotate)
    m.e = x
    m.f = y

    return m
  }

  /**
   * 构建完整的组件名称
   * 将前缀和名称用点号连接
   * @param {string} name - 组件名称
   * @param {string|null} prefix - 前缀（用于嵌套电路）
   * @returns {string} 完整名称
   */
  FormFullName(name, prefix) {
    if (prefix != null) {
      name = prefix + '.' + name
    }

    return name
  }

  /**
   * 获取组件坐标
   * 支持绝对坐标和相对坐标（相对于其他组件）
   * 此方法仅从一处调用，用于处理相对坐标
   * @param {Object} item - 组件项（包含坐标信息）
   * @param {string} prefix - 名称前缀
   * @param {Map} map - 组件映射表
   * @returns {Object} 坐标对象 {x, y}
   */
  GetCoordinates(item, prefix, map) {
    // 提示：在所有变换完成之前不要应用这些值
    let xItem = item.x == undefined ? 0 : item.x
    let yItem = item.y == undefined ? 0 : item.y

    // 查找由相对设置控制的位置
    let pos = { x: 0, y: 0 }

    if (item.relative != undefined) {
      let relative = item.relative

      // x和y都使用相对坐标
      if (relative.xy != undefined) {
        let port = relative.xy
        let name = this.FormFullName(port.name, prefix)
        let gate = map.get(name)
        let pt = gate.getCoordinates(port.io)
        pos = this.ApplyIntermediateTransform(port.name, prefix, pt)
      } else {
        // 仅x使用相对坐标
        if (relative.x != undefined) {
          let xport = relative.x
          let name = this.FormFullName(xport.name, prefix)
          let gate = map.get(name)
          let pt = gate.getCoordinates(xport.io)

          // 仅从变换后的坐标中获取x值
          pos.x = this.ApplyIntermediateTransform(xport.name, prefix, pt).x
        }

        // 仅y使用相对坐标
        if (relative.y != undefined) {
          let yport = relative.y
          let name = this.FormFullName(yport.name, prefix)
          let gate = map.get(name)
          let pt = gate.getCoordinates(yport.io)

          // 仅从变换后的坐标中获取y值
          pos.y = this.ApplyIntermediateTransform(yport.name, prefix, pt).y
        }
      }
    }

    // 将组件坐标加到相对坐标上
    return { x: pos.x + xItem, y: pos.y + yItem }
  }

  /**
   * 应用中间变换
   * 处理嵌套外部引用时的坐标变换
   * @param {string} name - 组件名称（可能包含多级前缀）
   * @param {string} prefix - 当前前缀
   * @param {Object} pt - 原始坐标点
   * @returns {Object} 变换后的坐标点
   */
  ApplyIntermediateTransform(name, prefix, pt) {
    let matx = new DOMMatrix()

    // 累积外部引用的变换矩阵（如果有的话）
    let index = name.indexOf('.', 0)

    while (index != -1) {
      let externalName = this.FormFullName(name.substr(0, index), prefix)
      let matxExternal = this.externalMatrices.get(externalName)
      matx.multiplySelf(matxExternal)
      index = name.indexOf('.', ++index)
    }

    // 应用变换矩阵
    let xp = matx.a * pt.x + matx.c * pt.y + matx.e
    let yp = matx.b * pt.x + matx.d * pt.y + matx.f

    pt.x = xp
    pt.y = yp

    return pt
  }
}

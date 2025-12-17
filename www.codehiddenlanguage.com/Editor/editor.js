// editor.js

// 初始电路状态
let circuit = {
    name: 'MyCircuit',
    transform: { x: 0, y: 0, scale: 1, rotate: 0 },
    testable: true,
    components: [],
    wires: []
};

let canvas = document.getElementById('circuitCanvas');
let ctx = canvas.getContext('2d');
let circuitBuilder = null;

// Monkey-patch Joint 以便在编辑器中可见
if (typeof Joint !== 'undefined') {
    Joint.prototype.render = function() {
        this.ctx.save();
        this.applyGlobalTransform();
        this.applyLocalTransform();
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        
        this.ctx.restore();
    };
}

// 连线的临时状态
let wiringStart = null; // { componentName, io }
let tempWire = null;

// 组件端口位置定义（用于命中测试的近似值）
const COMPONENT_PORTS = {
    'Switch': ['left', 'out'], // 'left' 对某些组件是隐含输入，'out' 是输出
    'Battery': ['pos', 'neg'],
    'Lightbulb': ['left', 'right'],
    'Joint': ['root'], // Joint 的特殊情况
    'Ground': ['root']
};

// 初始化
function init() {
    setupPalette();
    render();
    setupControls();
}

// 重新渲染电路
function render() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 为了避免事件监听器累积，我们克隆画布
    // 这有点重，但确保了库的干净状态
    let newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    canvas = newCanvas;
    ctx = canvas.getContext('2d');
    
    // 重新附加我们的交互监听器
    setupCanvasInteraction();
    setupCanvasDrop();

    // 使用库来构建和渲染
    try {
        circuitBuilder = new CircuitBuilder(canvas, circuit);
    } catch (e) {
        console.error("渲染电路时出错:", e);
    }

    // 如果有临时连线，绘制它
    if (wiringStart) {
        // 我们需要鼠标位置，在 mousemove 中处理
    }
}

function setupPalette() {
    const paletteItems = document.querySelectorAll('.palette-item');
    
    paletteItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', item.dataset.type);
        });
    });
}

function setupCanvasDrop() {
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        addComponent(type, x, y);
    });
}

function addComponent(type, x, y) {
    const name = type.toLowerCase() + (circuit.components.length + 1);
    
    const component = {
        name: name,
        type: type,
        x: Math.round(x),
        y: Math.round(y)
    };

    circuit.components.push(component);
    render();
}

function setupCanvasInteraction() {
    canvas.addEventListener('click', (e) => {
        // 我们想处理连线点击。
        // 但是库组件也处理点击（例如切换开关）。
        // 如果我们击中端口，我们将尝试优先处理连线。
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const port = findClickedPort(x, y);
        
        if (port) {
            handlePortClick(port);
            // 停止传播以防止触发组件动作（如开关切换）
            // 如果我们处于连线模式或刚刚点击了一个端口。
            e.stopPropagation(); 
        }
    });

    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const componentName = findClickedComponent(x, y);
        if (componentName) {
            deleteComponent(componentName);
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认上下文菜单
        if (wiringStart) {
            wiringStart = null;
            render(); // 清除临时连线
            console.log("连线已取消");
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (wiringStart) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 重绘以显示临时连线（这效率不高，但很简单）
            // 理想情况下我们会使用单独的层或 requestAnimationFrame
            // 现在，我们只是在上面绘制
            render(); // 这会清除并重绘所有内容！有点重。
            
            // 绘制从起点到鼠标的线
            const startPos = getPortPosition(wiringStart.componentName, wiringStart.io);
            if (startPos) {
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(mouseX, mouseY);
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    });
}

function findClickedPort(x, y) {
    // 遍历所有组件及其端口
    // 我们需要 CircuitBuilder 实例来获取精确坐标
    if (!circuitBuilder) return null;

    for (let [name, component] of circuitBuilder.compMap) {
        // 从电路定义获取组件类型以知道要检查哪些端口
        // circuitBuilder.compMap 键是全名。
        // 我们可以直接检查组件对象。
        
        // 找到原始组件配置以知道类型
        const compConfig = circuit.components.find(c => c.name === name);
        if (!compConfig) continue;

        const ports = COMPONENT_PORTS[compConfig.type] || [];
        
        for (let io of ports) {
            let pt;
            if (compConfig.type === 'Joint' || compConfig.type === 'Ground') {
                // Joint/Ground 通常不像 getCoordinates(io) 那样有命名端口？
                // 让我们检查库源码或假设中心。
                // 实际上 Joint 只是一个点。
                pt = component.getCoordinates ? component.getCoordinates(io) : {x: component.x, y: component.y};
                // 对于 Joint，如果它没有 'root'，getCoordinates 可能无法按预期工作
                // 让我们尝试 'center' 或者如果失败就使用组件位置
                 try {
                     pt = component.getCoordinates('center'); // 大多数有 center？
                 } catch(e) {
                     // 回退
                     pt = {x: 0, y: 0}; // 需要应用变换
                 }
            } else {
                 try {
                    pt = component.getCoordinates(io);
                 } catch(e) {
                     continue;
                 }
            }
            
            // getCoordinates 返回的坐标通常是全局的，如果我们使用了正确的方法？
            // 等等，库中的 getCoordinates 通常返回局部变换后的坐标。
            // 我们需要全局坐标。
            // 库组件有 `xformGlobal` 但它是内部的？
            // 让我们看看 CircuitBuilder.GetCoordinates 或类似的。
            
            // 实际上，`component.getCoordinates(io)` 返回由 `xformLocal` 变换的坐标。
            // 但我们也需要 `applyGlobalTransform`。
            // 让我们尝试使用组件的位置 + 局部端口偏移。
            
            // 更简单的方法：库渲染组件。
            // 我们只需根据组件 x,y 和已知偏移定义命中区域。
            // 这不如逆向工程矩阵堆栈健壮，但更容易。
            
            // 更好：使用组件实例。
            // component.xformGlobal(x, y) 从局部变换到全局？
            // 不，通常 xformGlobal 从全局变换到局部或反之亦然？
            // 在 PropagatingBoxesLib 中：pt = this.xformGlobal(pt.x, pt.y);
            
            // 让我们假设我们可以获取位置。
            // 现在，让我们对 "Joint" 使用简单的到组件中心的距离检查
            // 对其他组件使用估计的偏移。
            
            // 实际上，让我们看看库中的 `WireArray`。它连接点。
            // 它使用 `component.getCoordinates(io, true)`。
            // `true` 可能意味着 "返回全局"？
            // 让我们检查 `StructuredLayoutLib.js` -> `GetCoordinates`。
            
            // 在 `StructuredLayoutLib.js` 中：
            // `ptComp = component.getCoordinates(ptref.io, true)`
            // 让我们检查 `Switch.getCoordinates`。
            // 它调用 `this.xformLocal(pt)`。
            // `xformLocal` 应用组件的旋转/缩放/平移。
            // 它不应用全局电路变换（如果有）。
            // 我们的 circuit.transform 是恒等变换 (x:0, y:0, scale:1)。
            // 所以如果组件是顶层的，`xformLocal` 应该足够了。
            
            if (pt) {
                const dist = Math.hypot(pt.x - x, pt.y - y);
                if (dist < 15) { // 15px 命中半径
                    return { componentName: name, io: io };
                }
            }
        }
    }
    return null;
}

function getPortPosition(name, io) {
    if (!circuitBuilder) return null;
    const component = circuitBuilder.compMap.get(name);
    if (!component) return null;
    
    try {
        return component.getCoordinates(io);
    } catch (e) {
        return {x: 0, y: 0};
    }
}

function handlePortClick(port) {
    if (!wiringStart) {
        wiringStart = port;
        console.log("开始连线从", port);
    } else {
        // 完成连线
        if (wiringStart.componentName === port.componentName && wiringStart.io === port.io) {
            // 点击了同一个端口，取消
            wiringStart = null;
            render();
            return;
        }
        
        addWire(wiringStart, port);
        wiringStart = null;
        render();
    }
}

function addWire(start, end) {
    const wireName = 'wire' + (circuit.wires.length + 1);
    
    const wire = {
        name: wireName,
        points: [
            { name: start.componentName, io: start.io },
            { name: end.componentName, io: end.io }
        ]
    };
    
    circuit.wires.push(wire);
}

function setupControls() {
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
    document.getElementById('clearBtn').addEventListener('click', () => {
        circuit.components = [];
        circuit.wires = [];
        render();
    });
}

function exportJSON() {
    const jsonStr = JSON.stringify(circuit, null, 2);
    const fileContent = `// Generated by Circuit Editor\n\nlet ${circuit.name} = ${jsonStr};`;
    
    const blob = new Blob([fileContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${circuit.name}.json.js`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// 启动
window.onload = init;

function findClickedComponent(x, y) {
    if (!circuitBuilder) return null;

    for (let [name, component] of circuitBuilder.compMap) {
        // 简单的边界框检查或距离检查
        // 大多数组件有宽度/高度或半径
        // 如果 hittest 不可用或复杂，让我们假设一个通用的命中区域
        
        // 尝试使用组件的 hittest 如果可用
        // component.hittest(x, y, ul, lr) 需要 ul/lr 的局部坐标
        // 让我们只使用位置和标准尺寸
        
        // 获取全局位置
        let pos = {x: 0, y: 0};
        try {
            // 这有点 hacky，我们假设 getCoordinates('center') 或类似的工作
            // 或者我们只使用电路定义位置
            const compDef = circuit.components.find(c => c.name === name);
            if (compDef) {
                pos = {x: compDef.x, y: compDef.y};
            }
        } catch (e) {}
        
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < 30) { // 30px 半径用于组件选择
            return name;
        }
    }
    return null;
}

function deleteComponent(name) {
    // 从组件列表中移除
    const index = circuit.components.findIndex(c => c.name === name);
    if (index !== -1) {
        circuit.components.splice(index, 1);
        
        // 移除连接的电线
        circuit.wires = circuit.wires.filter(wire => {
            return !wire.points.some(pt => pt.name === name);
        });
        
        render();
    }
}

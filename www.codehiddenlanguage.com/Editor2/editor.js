// editor.js

// 初始电路状态
let circuit = {
    name: 'MyCircuit',
    transform: { x: 0, y: 0, scale: 1, rotate: 0 },
    testable: false,
    components: [],
    wires: []
};

let canvas = document.getElementById('circuitCanvas');
let ctx = canvas.getContext('2d');
let circuitBuilder = null;

// Monkey-patch Node to ensure it's visible even when scaled
if (typeof Node !== 'undefined') {
    const originalNodeRender = Node.prototype.render;
    Node.prototype.render = function() {
        if (this.hidden) return;

        let pt = this.xformLocal({ x: 0, y: 0 });
        pt = this.xformGlobal(pt.x, pt.y);

        this.ctx.save();
        // 通电为红色，否则为黑色
        this.ctx.fillStyle = this.output ? '#FF0000' : '#000000';

        this.ctx.beginPath();
        // Draw a fixed size circle (radius 4) regardless of scale
        this.ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
    };
}

// 连线的临时状态
let wiringStart = null; // { componentName, io }
let tempWire = null;
let lastRightClickTime = 0;

// 组件端口位置定义（用于命中测试的近似值）
const COMPONENT_PORTS = {
    'Switch': ['out'],
    'Battery': ['pos', 'neg'],
    'Lightbulb': ['left', 'right'],
    'Lightbulb': ['left', 'right'],
    'Ground': ['root'],
    'BitLight': ['inp', 'left', 'top', 'bottom'],
    'AndGate': ['A', 'B', 'out'],
    'OrGate': ['A', 'B', 'out'],
    'NandGate': ['A', 'B', 'out'],
    'NorGate': ['A', 'B', 'out'],
    'XorGate': ['A', 'B', 'out'],
    'Inverter': ['in', 'out'],
    'Buffer': ['in', 'out'],
    'Node': ['center'],
    'OrNode': ['center'], // OrNode inherits OrGate but renders as dot
    'DigitButton': ['top', 'bottom']
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
    const name = type.toLowerCase().replace(/[^a-z0-9]/g, '') + (circuit.components.length + 1);
    
    let component = {
        name: name,
        type: type,
        x: Math.round(x),
        y: Math.round(y)
    };

    if (type === 'Chapter14OneBitFuller') {
        component.type = 'External';
        component.file = 'Chapter14OneBitFuller';
        component.scale = 0.2;
        component.rotate = 90;
    } else if (type === 'CarryLight') {
        component.type = 'BitLight';
        // CarryLight specific config if needed, e.g. label or rotation
        // For now just a BitLight
    }

    circuit.components.push(component);
    render();
}

function setupCanvasInteraction() {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const port = findClickedPort(x, y);
        
        if (port) {
            handlePortClick(port);
            e.stopPropagation(); 
            return;
        }

        if (toggleBitLight(x, y)) {
            e.stopPropagation();
            return;
        }
    });

    // Double click listener removed as requested
    
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        
        const currentTime = new Date().getTime();
        if (currentTime - lastRightClickTime < 300) {
            // Double right click detected -> Delete component
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const componentName = findClickedComponent(x, y);
            if (componentName) {
                deleteComponent(componentName);
            }
            lastRightClickTime = 0;
        } else {
            lastRightClickTime = currentTime;
            
            if (wiringStart) {
                wiringStart = null;
                render(); 
                console.log("连线已取消");
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (wiringStart) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            render(); 
            
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

function toggleBitLight(x, y) {
    if (!circuitBuilder) return false;
    
    // Convert to array to iterate in reverse (top-most first)
    const components = Array.from(circuitBuilder.compMap.entries()).reverse();
    
    for (let [name, component] of components) {
        if (component.constructor.name === 'BitLight') {
            const w = component.width || 60;
            const h = component.height || 60;
            // BitLight is centered at (0,0) in local space
            if (component.hittest(x, y, {x: -w/2, y: -h/2}, {x: w/2, y: h/2})) {
                component.setInput(0, !component.output);
                return true;
            }
        }
    }
    return false;
}

function findClickedPort(x, y) {
    if (!circuitBuilder) return null;

    for (let [name, component] of circuitBuilder.compMap) {
        // 使用组件实例的构造函数名称来确定类型
        const type = component.constructor.name;
        const ports = COMPONENT_PORTS[type] || [];
        
        for (let io of ports) {
            let pt;
            try {
                // 对于 'in' 或 'center'，我们传递给 getCoordinates，如果它不支持，通常会返回默认位置（0,0）
                // 我们需要处理这种情况
                let ioArg = (io === 'in' || io === 'center' || io === 'root') ? undefined : io;
                pt = component.getCoordinates(ioArg);
                
                // getCoordinates 返回的是局部变换后的坐标，但没有应用全局变换（accumulatedMatrix）
                // Wait, CircuitBuilder usually saves global transform in component.
                // component.xformGlobal applies the saved global transform.
                // Let's check PropagatingGatesLib.js:
                // render() calls applyGlobalTransform() then applyLocalTransform().
                // getCoordinates() calls xformLocal(pt).
                // So we need to apply xformGlobal manually?
                // component.xformGlobal is a method that applies the matrix.
                
                if (component.xformGlobal) {
                    pt = component.xformGlobal(pt.x, pt.y);
                }
            } catch(e) {
                continue;
            }
            
            if (pt) {
                const dist = Math.hypot(pt.x - x, pt.y - y);
                if (dist < 20) { // 20px 命中半径
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
        let ioArg = (io === 'in' || io === 'center' || io === 'root') ? undefined : io;
        let pt = component.getCoordinates(ioArg);
        if (component.xformGlobal) {
            pt = component.xformGlobal(pt.x, pt.y);
        }
        return pt;
    } catch (e) {
        return {x: 0, y: 0};
    }
}

function handlePortClick(port) {
    if (!wiringStart) {
        wiringStart = port;
        console.log("开始连线从", port);
    } else {
        if (wiringStart.componentName === port.componentName && wiringStart.io === port.io) {
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
    
    let p1 = { name: start.componentName, io: (start.io === 'in' || start.io === 'center' || start.io === 'root') ? undefined : start.io };
    let p2 = { name: end.componentName, io: (end.io === 'in' || end.io === 'center' || end.io === 'root') ? undefined : end.io };

    // Smart directionality for BitLight
    // If one is BitLight and the other is not, determine direction based on the other's port
    const isBitLight1 = start.componentName.includes('bitlight') || start.componentName.includes('carrylight');
    const isBitLight2 = end.componentName.includes('bitlight') || end.componentName.includes('carrylight');

    if (isBitLight1 && !isBitLight2) {
        // Start is BitLight. Check End's port.
        // If End is an output port, then BitLight should be destination (End -> Start)
        if (isOutputPort(p2.io)) {
            [p1, p2] = [p2, p1];
        }
        // Else (End is input or Node), BitLight is source (Start -> End). Correct as is.
    } else if (!isBitLight1 && isBitLight2) {
        // End is BitLight. Check Start's port.
        // If Start is an output port, then BitLight should be destination (Start -> End). Correct as is.
        // If Start is not an output port (e.g. Node), assume BitLight is source (End -> Start)
        if (!isOutputPort(p1.io)) {
            [p1, p2] = [p2, p1];
        }
    }

    const wire = {
        name: wireName,
        points: [p1, p2]
    };
    
    circuit.wires.push(wire);
}

function isOutputPort(io) {
    if (!io) return false; // undefined/null usually means center/default which is often input or node
    const outPorts = ['out', 'output', 'q', 'qbar', 'co', 'so', 'xo', 'zo'];
    return outPorts.includes(io);
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

window.onload = init;

function findClickedComponent(x, y) {
    if (!circuitBuilder) return null;

    // 优先检查顶层组件
    // 但是 circuitBuilder.compMap 包含所有组件（扁平化）
    // 我们想删除的是用户添加的顶层组件
    
    for (let i = circuit.components.length - 1; i >= 0; i--) {
        const compDef = circuit.components[i];
        // 我们需要找到这个组件在屏幕上的位置
        // 如果是 External，它包含很多子组件
        // 我们只能估算位置
        
        // 尝试找到对应的组件实例（如果是简单组件）
        // 或者使用定义中的 x,y
        
        const dist = Math.hypot(compDef.x - x, compDef.y - y);
        if (dist < 40) { // 增加半径以更容易选中
            return compDef.name;
        }
    }
    return null;
}

function deleteComponent(name) {
    const index = circuit.components.findIndex(c => c.name === name);
    if (index !== -1) {
        circuit.components.splice(index, 1);
        
        // 移除连接的电线
        // 需要检查电线是否连接到该组件或其子组件
        circuit.wires = circuit.wires.filter(wire => {
            return !wire.points.some(pt => {
                // 检查 pt.name 是否以 name 开头（处理子组件）
                // 例如 name="fuller1", pt.name="fuller1.halfer1..."
                return pt.name === name || pt.name.startsWith(name + '.');
            });
        });
        
        render();
    }
}

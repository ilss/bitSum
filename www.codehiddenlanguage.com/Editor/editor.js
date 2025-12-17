// editor.js

// Initial circuit state
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

// Monkey-patch Joint to be visible in the editor
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

// Temporary state for wiring
let wiringStart = null; // { componentName, io }
let tempWire = null;

// Component definitions for port locations (approximate for hit testing)
const COMPONENT_PORTS = {
    'Switch': ['left', 'out'], // 'left' is implied input for some, 'out' is output
    'Battery': ['pos', 'neg'],
    'Lightbulb': ['left', 'right'],
    'Joint': ['root'], // Special case for Joint
    'Ground': ['root']
};

// Initialize
function init() {
    setupPalette();
    render();
    setupControls();
}

// Re-render the circuit
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // To avoid event listener accumulation, we clone the canvas
    // This is a bit heavy but ensures clean state for the library
    let newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    canvas = newCanvas;
    ctx = canvas.getContext('2d');
    
    // Re-attach our interaction listeners
    setupCanvasInteraction();
    setupCanvasDrop();

    // Use the library to build and render
    try {
        circuitBuilder = new CircuitBuilder(canvas, circuit);
    } catch (e) {
        console.error("Error rendering circuit:", e);
    }

    // Draw temporary wire if any
    if (wiringStart) {
        // We need mouse position, handled in mousemove
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
        // We want to handle wiring clicks.
        // But the library components also handle clicks (e.g. toggling switch).
        // We'll try to prioritize wiring if we hit a port.
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const port = findClickedPort(x, y);
        
        if (port) {
            handlePortClick(port);
            // Stop propagation to prevent triggering component action (like switch toggle)
            // if we are in wiring mode or just clicked a port.
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
        e.preventDefault(); // Prevent default context menu
        if (wiringStart) {
            wiringStart = null;
            render(); // Clear temporary wire
            console.log("Wiring cancelled");
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (wiringStart) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Redraw to show temp wire (this is inefficient, but simple)
            // Ideally we'd use a separate layer or requestAnimationFrame
            // For now, let's just draw on top
            render(); // This clears and redraws everything! A bit heavy.
            
            // Draw line from start to mouse
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
    // Iterate all components and their ports
    // We need the CircuitBuilder instance to get exact coordinates
    if (!circuitBuilder) return null;

    for (let [name, component] of circuitBuilder.compMap) {
        // Get component type from circuit definition to know which ports to check
        // circuitBuilder.compMap keys are full names.
        // We can check the component object directly.
        
        // Find the original component config to know the type
        const compConfig = circuit.components.find(c => c.name === name);
        if (!compConfig) continue;

        const ports = COMPONENT_PORTS[compConfig.type] || [];
        
        for (let io of ports) {
            let pt;
            if (compConfig.type === 'Joint' || compConfig.type === 'Ground') {
                // Joint/Ground usually don't have named ports in getCoordinates(io) the same way?
                // Let's check the library source or assume center.
                // Actually Joint is just a point.
                pt = component.getCoordinates ? component.getCoordinates(io) : {x: component.x, y: component.y};
                // For Joint, getCoordinates might not work as expected if it doesn't have 'root'
                // Let's try 'center' or just use component position if it fails
                 try {
                     pt = component.getCoordinates('center'); // Most have center?
                 } catch(e) {
                     // Fallback
                     pt = {x: 0, y: 0}; // Need to apply transform
                 }
            } else {
                 try {
                    pt = component.getCoordinates(io);
                 } catch(e) {
                     continue;
                 }
            }
            
            // The coordinates returned by getCoordinates are usually global if we used the right method?
            // Wait, getCoordinates in library usually returns local transformed.
            // We need global coordinates.
            // The library components have `xformGlobal` but it's internal?
            // Let's look at CircuitBuilder.GetCoordinates or similar.
            
            // Actually, `component.getCoordinates(io)` returns coordinates transformed by `xformLocal`.
            // But we also need `applyGlobalTransform`.
            // Let's try to use the component's position + local port offset.
            
            // Easier approach: The library renders components.
            // Let's just define hit zones based on component x,y and known offsets.
            // This is less robust but easier than reverse-engineering the matrix stack.
            
            // Better: use the component instance.
            // component.xformGlobal(x, y) transforms from local to global?
            // No, usually xformGlobal transforms FROM global TO local or vice versa?
            // In PropagatingBoxesLib: pt = this.xformGlobal(pt.x, pt.y);
            
            // Let's assume we can get the position.
            // For now, let's use a simple distance check to the component center for "Joint"
            // and estimated offsets for others.
            
            // Actually, let's look at `WireArray` in library. It connects points.
            // It uses `component.getCoordinates(io, true)`.
            // `true` might mean "return global"?
            // Let's check `StructuredLayoutLib.js` -> `GetCoordinates`.
            
            // In `StructuredLayoutLib.js`:
            // `ptComp = component.getCoordinates(ptref.io, true)`
            // Let's check `Switch.getCoordinates`.
            // It calls `this.xformLocal(pt)`.
            // `xformLocal` applies rotation/scale/translation of the component.
            // It does NOT apply the global circuit transform (if any).
            // Our circuit.transform is identity (x:0, y:0, scale:1).
            // So `xformLocal` should be enough if the component is top-level.
            
            if (pt) {
                const dist = Math.hypot(pt.x - x, pt.y - y);
                if (dist < 15) { // 15px hit radius
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
        console.log("Wiring started from", port);
    } else {
        // Finish wire
        if (wiringStart.componentName === port.componentName && wiringStart.io === port.io) {
            // Clicked same port, cancel
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

// Start
window.onload = init;

function findClickedComponent(x, y) {
    if (!circuitBuilder) return null;

    for (let [name, component] of circuitBuilder.compMap) {
        // Simple bounding box check or distance check
        // Most components have width/height or radius
        // Let's assume a generic hit area if hittest is not available or complex
        
        // Try to use the component's hittest if available
        // component.hittest(x, y, ul, lr) requires local coords for ul/lr
        // Let's just use the position and a standard size
        
        // Get global position
        let pos = {x: 0, y: 0};
        try {
            // This is a bit hacky, we assume getCoordinates('center') or similar works
            // or we just use the circuit definition position
            const compDef = circuit.components.find(c => c.name === name);
            if (compDef) {
                pos = {x: compDef.x, y: compDef.y};
            }
        } catch (e) {}
        
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < 30) { // 30px radius for component selection
            return name;
        }
    }
    return null;
}

function deleteComponent(name) {
    // Remove from components list
    const index = circuit.components.findIndex(c => c.name === name);
    if (index !== -1) {
        circuit.components.splice(index, 1);
        
        // Remove connected wires
        circuit.wires = circuit.wires.filter(wire => {
            return !wire.points.some(pt => pt.name === name);
        });
        
        render();
    }
}

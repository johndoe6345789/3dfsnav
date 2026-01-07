// Jurassic UNIX Navigator - WebGL Implementation
// A cinematic 3D file system navigator inspired by Jurassic Park

// Color scheme - authentic Jurassic Park FSN colors
const COLORS = {
    BG: [0, 0, 0, 1],
    FLOOR_RED: [0.7, 0.15, 0.25, 1],
    FLOOR_BLUE: [0.25, 0.35, 0.75, 1],
    GRID_LINE: [0, 0.7, 0.7, 0.8],
    FG: [119/255, 225/255, 255/255, 1],
    FG_DIM: [123/255, 193/255, 167/255, 1],
    WARN: [255/255, 239/255, 91/255, 1],
    ACCENT: [119/255, 225/255, 255/255, 1],
    NODE_DIR: [0.95, 0.15, 0.15, 1],
    WIRE: [123/255, 193/255, 167/255, 1],
    FILE_COLORS: [
        [19/255, 123/255, 177/255, 1],
        [255/255, 132/255, 0, 1],
        [255/255, 252/255, 0, 1],
        [32/255, 160/255, 152/255, 1],
        [0, 71/255, 255/255, 1],
        [168/255, 0, 255/255, 1],
        [154/255, 38/255, 103/255, 1]
    ]
};

// Mock file system for demonstration (since we can't access real filesystem in browser)
const MOCK_FS = {
    '/': {
        name: '/',
        isDir: true,
        children: ['home', 'usr', 'etc', 'var', 'tmp', 'opt', 'bin', 'lib']
    },
    '/home': {
        name: 'home',
        isDir: true,
        children: ['user', 'guest', 'admin']
    },
    '/home/user': {
        name: 'user',
        isDir: true,
        children: ['Documents', 'Downloads', 'Pictures', 'Videos', 'Music', 'Desktop', 'config.txt', 'notes.md', 'data.json']
    },
    '/home/user/Documents': {
        name: 'Documents',
        isDir: true,
        children: ['report.pdf', 'presentation.pptx', 'notes.txt', 'project']
    },
    '/home/user/Downloads': {
        name: 'Downloads',
        isDir: true,
        children: ['file1.zip', 'file2.tar.gz', 'image.png', 'video.mp4']
    },
    '/usr': {
        name: 'usr',
        isDir: true,
        children: ['bin', 'lib', 'share', 'local']
    },
    '/etc': {
        name: 'etc',
        isDir: true,
        children: ['config', 'hosts', 'passwd', 'group']
    }
};

// Add more file entries to the mock filesystem
function expandMockFS() {
    // Add some files to various directories
    for (let key in MOCK_FS) {
        if (MOCK_FS[key].isDir && MOCK_FS[key].children) {
            MOCK_FS[key].children = MOCK_FS[key].children.map(child => {
                const childPath = key === '/' ? '/' + child : key + '/' + child;
                if (!MOCK_FS[childPath]) {
                    // Create a file entry if not exists
                    MOCK_FS[childPath] = {
                        name: child,
                        isDir: false
                    };
                }
                return child;
            });
        }
    }
}
expandMockFS();

// Easing functions for smooth animations
const Easing = {
    linear: (t) => t,
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t) => t * (2 - t),
    easeIn: (t) => t * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

// Animation system
class Animation {
    constructor(from, to, duration, easingFn = Easing.easeInOutCubic, onUpdate, onComplete) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.easingFn = easingFn;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.startTime = Date.now();
        this.completed = false;
    }
    
    update() {
        if (this.completed) return true;
        
        const now = Date.now();
        const elapsed = now - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1.0);
        const eased = this.easingFn(progress);
        
        // Interpolate value
        const current = this.from + (this.to - this.from) * eased;
        
        if (this.onUpdate) {
            this.onUpdate(current, eased);
        }
        
        if (progress >= 1.0) {
            this.completed = true;
            if (this.onComplete) {
                this.onComplete();
            }
            return true;
        }
        
        return false;
    }
}

// Camera state
class Camera {
    constructor() {
        this.yaw = 0.3;
        this.pitch = 0.6;
        this.dist = 6.0;
        this.fov = 45.0; // degrees for perspective matrix
        this.position = [0, 2.5, 6.0];
        this.target = [0, 0, 0];
        this.up = [0, 1, 0];
        
        // Target values for smooth animation
        this.targetYaw = this.yaw;
        this.targetPitch = this.pitch;
        this.targetDist = this.dist;
    }
}

// Node representing a file or directory in 3D space
class Node {
    constructor(path, name, isDir, pos, parent) {
        this.path = path;
        this.name = name;
        this.isDir = isDir;
        this.pos = pos; // [x, y, z]
        this.parent = parent;
        this.scale = 0; // Start at 0 for fade-in animation
        this.targetScale = 1.0;
        this.hoverScale = 1.0;
        this.opacity = 0; // Start invisible for fade-in
        this.selected = false; // Track selection state
    }
}

// Main application class
class FSNavigator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }
        
        this.currentPath = '/home/user';
        this.limit = 140;
        this.camera = new Camera();
        this.nodes = [];
        this.hover = null;
        this.selected = null; // Track selected node
        this.dragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.lastClickTime = 0; // For double-click detection
        this.clickTimeout = null;
        this.animations = []; // Active animations
        this.isAnimating = false; // Flag for drill down/out animations
        this.nodeAppearTime = 0; // For staggered node appearance
        
        // Get 2D context for text labels
        this.labelCanvas = document.getElementById('labelCanvas');
        this.labelCtx = this.labelCanvas.getContext('2d');
        
        // Initialize WebGL
        this.initWebGL();
        this.initShaders();
        this.initBuffers();
        
        this.setupEventListeners();
        this.resize();
        this.refresh();
        this.render();
    }
    
    initWebGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    initShaders() {
        const gl = this.gl;
        
        // Vertex shader
        const vsSource = `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying vec4 vColor;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
                vColor = aColor;
            }
        `;
        
        // Fragment shader
        const fsSource = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `;
        
        const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);
        
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            alert('Shader program failed to link');
            return;
        }
        
        this.programInfo = {
            program: this.shaderProgram,
            attribLocations: {
                position: gl.getAttribLocation(this.shaderProgram, 'aPosition'),
                color: gl.getAttribLocation(this.shaderProgram, 'aColor'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
            },
        };
    }
    
    loadShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('Shader compilation error: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    initBuffers() {
        // Buffers will be created dynamically for floor and nodes
        this.floorBuffer = null;
        this.nodeBuffers = [];
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.dragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.dragging) {
                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;
                
                // Smooth camera rotation
                const newYaw = this.camera.yaw + dx * 0.008;
                const newPitch = Math.max(-1.4, Math.min(1.4, this.camera.pitch + dy * 0.006));
                
                this.animateCameraProperty('yaw', newYaw, 100, Easing.easeOut);
                this.animateCameraProperty('pitch', newPitch, 100, Easing.easeOut);
                
                this.lastMouse = { x: e.clientX, y: e.clientY };
            } else {
                this.updateHover(e.clientX, e.clientY);
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.dragging) {
                this.dragging = false;
                const hit = this.hitTest(e.clientX, e.clientY);
                if (hit) {
                    // Detect double-click
                    const now = Date.now();
                    const timeSinceLastClick = now - this.lastClickTime;
                    
                    if (timeSinceLastClick < 300) { // Double-click within 300ms
                        // Clear any pending single-click action
                        if (this.clickTimeout) {
                            clearTimeout(this.clickTimeout);
                            this.clickTimeout = null;
                        }
                        // Double-click: open/enter
                        this.openNode(hit);
                        this.lastClickTime = 0; // Reset
                    } else {
                        // Single-click: select and fly to object (with delay to detect double-click)
                        this.clickTimeout = setTimeout(() => {
                            this.selectNode(hit);
                            this.clickTimeout = null;
                        }, 300);
                        this.lastClickTime = now;
                    }
                }
            }
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom(-0.5 * Math.sign(e.deltaY));
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('Escape pressed - would close in desktop app');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this.goUp();
            } else if (e.key === 'Enter') {
                if (this.hover) {
                    this.openNode(this.hover);
                }
            } else if (e.key === '+' || e.key === '=') {
                this.zoom(-0.4);
            } else if (e.key === '-') {
                this.zoom(0.4);
            }
        });
    }
    
    updateCameraPosition() {
        const dist = this.camera.dist;
        const yaw = this.camera.yaw;
        const pitch = this.camera.pitch;
        
        this.camera.position = [
            Math.sin(yaw) * Math.cos(pitch) * dist,
            Math.sin(pitch) * dist + 1.5,
            Math.cos(yaw) * Math.cos(pitch) * dist
        ];
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Also resize label canvas
        this.labelCanvas.width = window.innerWidth;
        this.labelCanvas.height = window.innerHeight;
    }
    
    refresh() {
        this.nodes = this.makeNodes(this.currentPath);
        this.hover = null;
        this.updateHUD();
        this.nodeAppearTime = Date.now();
        
        // Animate nodes appearing
        this.nodes.forEach((node, i) => {
            node.scale = 0;
            node.opacity = 0;
            const delay = i * 30; // Stagger appearance
            setTimeout(() => {
                this.animateNodeAppear(node);
            }, delay);
        });
    }
    
    makeNodes(path) {
        const entry = MOCK_FS[path];
        if (!entry || !entry.isDir || !entry.children) {
            return [];
        }
        
        const children = entry.children.slice(0, this.limit);
        const positions = this.spiralPositions(children.length, 3.5, 0.2);
        
        return children.map((childName, i) => {
            const childPath = path === '/' ? '/' + childName : path + '/' + childName;
            const childEntry = MOCK_FS[childPath] || { name: childName, isDir: false };
            return new Node(
                childPath,
                childName,
                childEntry.isDir || false,
                positions[i],
                path
            );
        });
    }
    
    spiralPositions(n, radius, zStep) {
        const positions = [];
        for (let i = 0; i < n; i++) {
            const a = i * 0.72;
            const r = radius * (0.35 + 0.65 * (i / Math.max(1, n - 1)));
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            const y = 0.0; // All nodes on the floor plane
            positions.push([x, y, z]);
        }
        return positions;
    }
    
    // Matrix math utilities
    createPerspectiveMatrix(fov, aspect, near, far) {
        const f = 1.0 / Math.tan((fov * Math.PI / 180.0) / 2);
        const nf = 1 / (near - far);
        
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];
    }
    
    createLookAtMatrix(eye, target, up) {
        const zAxis = this.normalize([
            eye[0] - target[0],
            eye[1] - target[1],
            eye[2] - target[2]
        ]);
        const xAxis = this.normalize(this.cross(up, zAxis));
        const yAxis = this.cross(zAxis, xAxis);
        
        return [
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -this.dot(xAxis, eye), -this.dot(yAxis, eye), -this.dot(zAxis, eye), 1
        ];
    }
    
    createTranslationMatrix(x, y, z) {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ];
    }
    
    createScaleMatrix(x, y, z) {
        return [
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ];
    }
    
    multiplyMatrices(a, b) {
        const result = new Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 0;
                for (let k = 0; k < 4; k++) {
                    result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        return result;
    }
    
    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }
    
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    
    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (len > 0.00001) {
            return [v[0] / len, v[1] / len, v[2] / len];
        }
        return v;
    }
    
    hitTest(mx, my) {
        // Project each node and check if mouse is over it
        const rect = this.canvas.getBoundingClientRect();
        const x = ((mx - rect.left) / rect.width) * 2 - 1;
        const y = -((my - rect.top) / rect.height) * 2 + 1;
        
        // Simple proximity test - could be improved with ray casting
        let closest = null;
        let minDist = 0.15;
        
        for (const node of this.nodes) {
            const projected = this.projectPoint(node.pos);
            if (projected) {
                const dx = projected[0] - x;
                const dy = projected[1] - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = node;
                }
            }
        }
        
        return closest;
    }
    
    projectPoint(pos) {
        const viewMatrix = this.createLookAtMatrix(
            this.camera.position,
            this.camera.target,
            this.camera.up
        );
        const projMatrix = this.createPerspectiveMatrix(
            this.camera.fov,
            this.canvas.width / this.canvas.height,
            0.1,
            100.0
        );
        
        // Transform point
        const x = pos[0], y = pos[1], z = pos[2];
        
        // Apply view matrix
        let vx = viewMatrix[0] * x + viewMatrix[4] * y + viewMatrix[8] * z + viewMatrix[12];
        let vy = viewMatrix[1] * x + viewMatrix[5] * y + viewMatrix[9] * z + viewMatrix[13];
        let vz = viewMatrix[2] * x + viewMatrix[6] * y + viewMatrix[10] * z + viewMatrix[14];
        let vw = viewMatrix[3] * x + viewMatrix[7] * y + viewMatrix[11] * z + viewMatrix[15];
        
        // Apply projection matrix
        let px = projMatrix[0] * vx + projMatrix[4] * vy + projMatrix[8] * vz + projMatrix[12] * vw;
        let py = projMatrix[1] * vx + projMatrix[5] * vy + projMatrix[9] * vz + projMatrix[13] * vw;
        let pw = projMatrix[3] * vx + projMatrix[7] * vy + projMatrix[11] * vz + projMatrix[15] * vw;
        
        if (pw === 0) return null;
        
        return [px / pw, py / pw];
    }
    
    updateHover(mx, my) {
        const hit = this.hitTest(mx, my);
        if (hit !== this.hover) {
            this.hover = hit;
            this.updateHUD();
        }
    }
    
    zoom(delta) {
        const newDist = Math.max(2.5, Math.min(20.0, this.camera.dist + delta));
        this.animateCameraProperty('dist', newDist, 300, Easing.easeOut);
    }
    
    animateCameraProperty(property, targetValue, duration = 500, easingFn = Easing.easeInOutCubic) {
        const startValue = this.camera[property];
        const anim = new Animation(
            startValue,
            targetValue,
            duration,
            easingFn,
            (value) => {
                this.camera[property] = value;
                if (property === 'yaw' || property === 'pitch' || property === 'dist') {
                    this.updateCameraPosition();
                }
            }
        );
        this.animations.push(anim);
    }
    
    animateNodeAppear(node) {
        const scaleAnim = new Animation(
            0,
            1.0,
            400,
            Easing.easeOutElastic,
            (value) => {
                node.scale = value;
            }
        );
        const opacityAnim = new Animation(
            0,
            1.0,
            300,
            Easing.easeOut,
            (value) => {
                node.opacity = value;
            }
        );
        this.animations.push(scaleAnim);
        this.animations.push(opacityAnim);
    }
    
    goUp() {
        if (this.currentPath === '/') return;
        if (this.isAnimating) return; // Don't allow navigation during animation
        
        const lastSlash = this.currentPath.lastIndexOf('/');
        const newPath = lastSlash === 0 ? '/' : this.currentPath.substring(0, lastSlash);
        
        // Hollywood-style drill OUT animation
        this.drillOut(newPath);
    }
    
    selectNode(node) {
        // Deselect previous node
        if (this.selected) {
            this.selected.selected = false;
        }
        
        // Select new node
        this.selected = node;
        node.selected = true;
        
        // Fly camera to the selected object with cinematic movement
        this.flyToNode(node);
        this.updateHUD();
    }
    
    flyToNode(node) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const targetPos = node.pos;
        
        // Calculate optimal viewing angle
        const targetYaw = Math.atan2(targetPos[0], targetPos[2]);
        const targetPitch = 0.4;
        const targetDist = 3.5; // Get closer to the object
        
        // Animate camera to focus on the node
        this.animateCameraProperty('yaw', targetYaw, 800, Easing.easeInOutCubic);
        this.animateCameraProperty('pitch', targetPitch, 800, Easing.easeInOutCubic);
        this.animateCameraProperty('dist', targetDist, 800, Easing.easeInOutCubic);
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 900);
    }
    
    drillDown(node) {
        this.isAnimating = true;
        
        // Fade out all nodes except the target
        this.nodes.forEach(n => {
            if (n !== node) {
                const fadeAnim = new Animation(
                    n.opacity,
                    0,
                    400,
                    Easing.easeIn,
                    (value) => {
                        n.opacity = value;
                    }
                );
                this.animations.push(fadeAnim);
            }
        });
        
        // Zoom and dive into the target with spinning
        const startYaw = this.camera.yaw;
        const startPitch = this.camera.pitch;
        const startDist = this.camera.dist;
        
        const targetYaw = startYaw + Math.PI * 0.5; // Add spin
        const targetPitch = 0.3;
        const targetDist = 2.0; // Zoom way in
        
        // Animate camera with dramatic swooping
        this.animateCameraProperty('yaw', targetYaw, 600, Easing.easeInOutCubic);
        this.animateCameraProperty('pitch', targetPitch, 600, Easing.easeInOutCubic);
        this.animateCameraProperty('dist', targetDist, 600, Easing.easeIn);
        
        // After animation, navigate and zoom back out
        setTimeout(() => {
            this.currentPath = node.path;
            this.refresh();
            
            // Reset camera to normal viewing position
            this.camera.yaw = 0.3;
            this.camera.pitch = 0.6;
            this.camera.dist = 6.0;
            this.updateCameraPosition();
            
            this.isAnimating = false;
        }, 650);
    }
    
    drillOut(newPath) {
        this.isAnimating = true;
        
        // Fade out all nodes
        this.nodes.forEach(n => {
            const fadeAnim = new Animation(
                n.opacity,
                0,
                300,
                Easing.easeIn,
                (value) => {
                    n.opacity = value;
                }
            );
            this.animations.push(fadeAnim);
        });
        
        // Dramatic pull-back and rise
        const startYaw = this.camera.yaw;
        const startPitch = this.camera.pitch;
        const startDist = this.camera.dist;
        
        const targetYaw = startYaw - Math.PI * 0.3; // Spin opposite direction
        const targetPitch = 1.0; // Look down from above
        const targetDist = 12.0; // Pull way back
        
        // Animate camera with dramatic rise
        this.animateCameraProperty('yaw', targetYaw, 500, Easing.easeInOutCubic);
        this.animateCameraProperty('pitch', targetPitch, 500, Easing.easeOut);
        this.animateCameraProperty('dist', targetDist, 500, Easing.easeOut);
        
        // After animation, navigate and reset view
        setTimeout(() => {
            this.currentPath = newPath;
            this.refresh();
            
            // Reset camera to normal viewing position
            this.camera.yaw = 0.3;
            this.camera.pitch = 0.6;
            this.camera.dist = 6.0;
            this.updateCameraPosition();
            
            this.isAnimating = false;
        }, 550);
    }
    
    openNode(node) {
        if (this.isAnimating) return; // Don't allow navigation during animation
        
        if (node.isDir) {
            // Hollywood-style drill DOWN animation
            this.drillDown(node);
        } else {
            console.log('Opening file:', node.path);
            alert('Opening file: ' + node.name);
        }
    }
    
    updateHUD() {
        const hud = document.getElementById('hud');
        const hint = document.getElementById('hint');
        const helpText = 'Drag=rotate  Click=select  DblClick=enter  Backspace=up  Wheel=zoom  Esc=quit';
        hud.textContent = `${this.shortPath(this.currentPath)}   |   ${helpText}`;
        
        if (this.selected) {
            const tag = this.selected.isDir ? 'dir' : 'file';
            hint.textContent = `SELECTED ${tag}: ${this.shortPath(this.selected.path, 120)}`;
        } else if (this.hover) {
            const tag = this.hover.isDir ? 'dir' : 'file';
            hint.textContent = `${tag}: ${this.shortPath(this.hover.path, 120)}`;
        } else {
            hint.textContent = '';
        }
    }
    
    shortPath(path, maxLen = 52) {
        if (path.length <= maxLen) return path;
        return '…' + path.substring(path.length - maxLen + 1);
    }
    
    render() {
        const gl = this.gl;
        
        // Update all active animations
        this.animations = this.animations.filter(anim => !anim.update());
        
        // Update hover animation
        this.nodes.forEach(node => {
            const isHovered = this.hover && this.hover.path === node.path;
            const targetHover = isHovered ? 1.2 : 1.0;
            node.hoverScale += (targetHover - node.hoverScale) * 0.15;
        });
        
        // Clear
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Setup matrices
        const aspect = this.canvas.width / this.canvas.height;
        const projectionMatrix = this.createPerspectiveMatrix(this.camera.fov, aspect, 0.1, 100.0);
        const viewMatrix = this.createLookAtMatrix(
            this.camera.position,
            this.camera.target,
            this.camera.up
        );
        
        gl.useProgram(this.programInfo.program);
        
        // Draw floor
        this.drawFloor(projectionMatrix, viewMatrix);
        
        // Draw nodes
        this.drawNodes(projectionMatrix, viewMatrix);
        
        // Draw labels on top
        this.drawLabels(projectionMatrix, viewMatrix);
        
        requestAnimationFrame(() => this.render());
    }
    
    drawFloor(projectionMatrix, viewMatrix) {
        const gl = this.gl;
        const size = 20;
        const tileSize = 1.0;
        const vertices = [];
        const colors = [];
        
        // Create checkered floor pattern
        for (let x = -size/2; x < size/2; x++) {
            for (let z = -size/2; z < size/2; z++) {
                const isRed = (x + z) % 2 === 0;
                const color = isRed ? COLORS.FLOOR_RED : COLORS.FLOOR_BLUE;
                
                const x1 = x * tileSize;
                const z1 = z * tileSize;
                const x2 = (x + 1) * tileSize;
                const z2 = (z + 1) * tileSize;
                const y = -0.01;
                
                // Two triangles per tile
                vertices.push(
                    x1, y, z1,
                    x2, y, z1,
                    x2, y, z2,
                    x1, y, z1,
                    x2, y, z2,
                    x1, y, z2
                );
                
                for (let i = 0; i < 6; i++) {
                    colors.push(...color);
                }
            }
        }
        
        // Create and bind buffer
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        // Set uniforms
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, viewMatrix);
        
        // Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        
        // Color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.color);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
        
        // Draw grid lines
        this.drawGridLines(projectionMatrix, viewMatrix, size, tileSize);
    }
    
    drawGridLines(projectionMatrix, viewMatrix, size, tileSize) {
        const gl = this.gl;
        const vertices = [];
        const colors = [];
        const lineColor = COLORS.GRID_LINE;
        
        // Horizontal lines
        for (let z = -size/2; z <= size/2; z++) {
            vertices.push(
                -size/2 * tileSize, 0, z * tileSize,
                size/2 * tileSize, 0, z * tileSize
            );
            colors.push(...lineColor, ...lineColor);
        }
        
        // Vertical lines
        for (let x = -size/2; x <= size/2; x++) {
            vertices.push(
                x * tileSize, 0, -size/2 * tileSize,
                x * tileSize, 0, size/2 * tileSize
            );
            colors.push(...lineColor, ...lineColor);
        }
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, viewMatrix);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.color);
        
        gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    }
    
    drawNodes(projectionMatrix, viewMatrix) {
        const gl = this.gl;
        
        for (const node of this.nodes) {
            const isHover = this.hover && this.hover.path === node.path;
            const isSelected = this.selected && this.selected.path === node.path;
            let color;
            
            if (node.isDir) {
                // Enhanced red for directories, brighter if selected
                color = isSelected ? [1.0, 0.3, 0.3, node.opacity] : [0.95, 0.15, 0.15, node.opacity];
            } else {
                // Enhanced file colors with better visibility
                const colorIndex = this.hashCode(node.name) % COLORS.FILE_COLORS.length;
                const baseColor = COLORS.FILE_COLORS[Math.abs(colorIndex)];
                // Boost brightness for better visibility
                color = [
                    Math.min(1.0, baseColor[0] * 1.2),
                    Math.min(1.0, baseColor[1] * 1.2),
                    Math.min(1.0, baseColor[2] * 1.2),
                    node.opacity
                ];
            }
            
            this.drawNode(node, color, isHover, isSelected, projectionMatrix, viewMatrix);
        }
    }
    
    drawNode(node, color, isHover, isSelected, projectionMatrix, viewMatrix) {
        const gl = this.gl;
        const pos = node.pos;
        
        // Create box geometry with animation scale
        const baseWidth = node.isDir ? 0.3 : 0.25;
        const baseHeight = node.isDir ? 0.8 : 0.3;
        const baseDepth = node.isDir ? 0.3 : 0.25;
        
        // Apply scale from animations and hover
        const totalScale = node.scale * node.hoverScale;
        const width = baseWidth * totalScale;
        const height = baseHeight * totalScale;
        const depth = baseDepth * totalScale;
        
        // Add pulsing effect for selected nodes
        const pulseScale = isSelected ? 1.0 + Math.sin(Date.now() * 0.005) * 0.1 : 1.0;
        
        const vertices = this.createBoxVertices(width * pulseScale, height * pulseScale, depth * pulseScale);
        const colors = this.createBoxColors(color, vertices.length / 3, isHover, isSelected);
        
        // Create model matrix (translation)
        const modelMatrix = this.createTranslationMatrix(pos[0], pos[1] + height/2, pos[2]);
        const modelViewMatrix = this.multiplyMatrices(viewMatrix, modelMatrix);
        
        // Setup buffers
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        // Set uniforms
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        
        // Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        
        // Color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.color);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
    }
    
    createBoxVertices(w, h, d) {
        const w2 = w / 2;
        const h2 = h / 2;
        const d2 = d / 2;
        
        return [
            // Front face
            -w2, -h2, d2,  w2, -h2, d2,  w2, h2, d2,
            -w2, -h2, d2,  w2, h2, d2,  -w2, h2, d2,
            // Back face
            -w2, -h2, -d2,  -w2, h2, -d2,  w2, h2, -d2,
            -w2, -h2, -d2,  w2, h2, -d2,  w2, -h2, -d2,
            // Top face
            -w2, h2, -d2,  -w2, h2, d2,  w2, h2, d2,
            -w2, h2, -d2,  w2, h2, d2,  w2, h2, -d2,
            // Bottom face
            -w2, -h2, -d2,  w2, -h2, -d2,  w2, -h2, d2,
            -w2, -h2, -d2,  w2, -h2, d2,  -w2, -h2, d2,
            // Right face
            w2, -h2, -d2,  w2, h2, -d2,  w2, h2, d2,
            w2, -h2, -d2,  w2, h2, d2,  w2, -h2, d2,
            // Left face
            -w2, -h2, -d2,  -w2, -h2, d2,  -w2, h2, d2,
            -w2, -h2, -d2,  -w2, h2, d2,  -w2, h2, -d2,
        ];
    }
    
    createBoxColors(baseColor, numVertices, isHover, isSelected) {
        const colors = [];
        const brightness = isHover ? 1.4 : 1.0;
        const selectedGlow = isSelected ? 1.3 : 1.0;
        
        for (let i = 0; i < numVertices; i++) {
            // Vary brightness by face
            const faceBrightness = 0.7 + (i % 6) * 0.05;
            colors.push(
                Math.min(1.0, baseColor[0] * brightness * selectedGlow * faceBrightness),
                Math.min(1.0, baseColor[1] * brightness * selectedGlow * faceBrightness),
                Math.min(1.0, baseColor[2] * brightness * selectedGlow * faceBrightness),
                baseColor[3]
            );
        }
        
        return colors;
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
    
    drawLabels(projectionMatrix, viewMatrix) {
        const ctx = this.labelCtx;
        
        // Clear label canvas
        ctx.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
        
        // Set font style
        ctx.font = '11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (const node of this.nodes) {
            if (node.opacity < 0.1) continue; // Skip invisible nodes
            
            // Calculate label position (below the node)
            const labelY = node.pos[1] - 0.3;
            const labelPos = [node.pos[0], labelY, node.pos[2]];
            const projected = this.projectPoint(labelPos);
            
            if (!projected) continue;
            
            // Convert from normalized device coordinates to screen coordinates
            const screenX = (projected[0] * 0.5 + 0.5) * this.labelCanvas.width;
            const screenY = (1.0 - (projected[1] * 0.5 + 0.5)) * this.labelCanvas.height;
            
            // Skip if off-screen
            if (screenX < 0 || screenX > this.labelCanvas.width || 
                screenY < 0 || screenY > this.labelCanvas.height) continue;
            
            // Determine label color and style
            const isHovered = this.hover && this.hover.path === node.path;
            const isSelected = this.selected && this.selected.path === node.path;
            
            let labelColor;
            let shadowBlur = 3;
            
            if (isSelected) {
                labelColor = `rgba(255, 239, 91, ${node.opacity})`; // Bright yellow for selected
                shadowBlur = 8;
            } else if (isHovered) {
                labelColor = `rgba(119, 225, 255, ${node.opacity})`; // Cyan for hover
                shadowBlur = 6;
            } else if (node.isDir) {
                labelColor = `rgba(255, 150, 150, ${node.opacity})`; // Light red for directories
            } else {
                labelColor = `rgba(123, 193, 167, ${node.opacity * 0.9})`; // Dim green for files
            }
            
            // Draw label with glow effect
            ctx.shadowColor = labelColor;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = labelColor;
            
            // Truncate long names
            let displayName = node.name;
            if (displayName.length > 12) {
                displayName = displayName.substring(0, 10) + '…';
            }
            
            ctx.fillText(displayName, screenX, screenY);
        }
    }
}

// Start the application when page loads
window.addEventListener('load', () => {
    new FSNavigator();
});

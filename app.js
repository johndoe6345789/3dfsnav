// Jurassic UNIX Navigator - WebGL Implementation
// A cinematic 3D file system navigator inspired by Jurassic Park

// Color scheme - authentic Jurassic Park FSN colors
const COLORS = {
    BG: [0, 0, 0, 1],
    GRID: [25/255, 94/255, 48/255, 1],
    FG: [119/255, 225/255, 255/255, 1],
    FG_DIM: [123/255, 193/255, 167/255, 1],
    WARN: [255/255, 239/255, 91/255, 1],
    ACCENT: [119/255, 225/255, 255/255, 1],
    NODE_DIR: [255/255, 0, 0, 1],
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

// Camera state
class Camera {
    constructor() {
        this.yaw = 0.3;
        this.pitch = 0.4;
        this.dist = 4.5;
        this.fov = 1.2;
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
    }
}

// Screen point after projection
class ScreenPoint {
    constructor(x, y, z, r, node) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.r = r;
        this.node = node;
    }
}

// Main application class
class FSNavigator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.ctx) {
            alert('Canvas 2D not supported');
            return;
        }
        
        this.currentPath = '/home/user';
        this.limit = 140;
        this.camera = new Camera();
        this.nodes = [];
        this.screenPoints = [];
        this.hover = null;
        this.dragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        this.setupEventListeners();
        this.resize();
        this.refresh();
        this.render();
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
                this.camera.yaw += dx * 0.008;
                this.camera.pitch = Math.max(-1.2, Math.min(1.2, this.camera.pitch + dy * 0.006));
                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.compute();
            } else {
                this.updateHover(e.clientX, e.clientY);
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.dragging) {
                this.dragging = false;
                const hit = this.hitTest(e.clientX, e.clientY);
                if (hit) {
                    this.openNode(hit.node);
                }
            }
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom(-0.5 * Math.sign(e.deltaY));
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Cannot close browser window from JavaScript
                console.log('Escape pressed - would close in desktop app');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this.goUp();
            } else if (e.key === 'Enter') {
                if (this.hover) {
                    this.openNode(this.hover.node);
                }
            } else if (e.key === '+' || e.key === '=') {
                this.zoom(-0.4);
            } else if (e.key === '-') {
                this.zoom(0.4);
            }
        });
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.compute();
    }
    
    refresh() {
        this.nodes = this.makeNodes(this.currentPath);
        this.hover = null;
        this.compute();
        this.updateHUD();
    }
    
    makeNodes(path) {
        const entry = MOCK_FS[path];
        if (!entry || !entry.isDir || !entry.children) {
            return [];
        }
        
        const children = entry.children.slice(0, this.limit);
        const positions = this.spiralPositions(children.length, 3.5, 0.25);
        
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
            const y = Math.sin(a) * r;
            const z = -i * zStep;
            positions.push([x, y, z]);
        }
        return positions;
    }
    
    compute() {
        this.screenPoints = this.projectNodes();
    }
    
    projectNodes() {
        const points = [];
        for (const node of this.nodes) {
            const projected = this.project(node.pos);
            if (projected) {
                const [sx, sy, z] = projected;
                const r = this.nodeRadius(z, node.isDir);
                points.push(new ScreenPoint(sx, sy, z, r, node));
            }
        }
        points.sort((a, b) => b.z - a.z);
        return points;
    }
    
    rotateY(p, angle) {
        const [x, y, z] = p;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        return [x * ca + z * sa, y, -x * sa + z * ca];
    }
    
    rotateX(p, angle) {
        const [x, y, z] = p;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        return [x, y * ca - z * sa, y * sa + z * ca];
    }
    
    cameraSpace(p) {
        let p1 = this.rotateY(p, this.camera.yaw);
        let p2 = this.rotateX(p1, this.camera.pitch);
        return [p2[0], p2[1], p2[2] + this.camera.dist];
    }
    
    project(p) {
        const [x, y, z] = this.cameraSpace(p);
        if (z <= 0.08) return null;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        const s = (0.5 * w) / Math.tan(this.camera.fov * 0.5);
        const sx = (x * s) / z + w * 0.5;
        const sy = (-y * s) / z + h * 0.5;
        return [sx, sy, z];
    }
    
    nodeRadius(z, isDir) {
        const base = isDir ? 45.0 : 35.0;
        const clampedZ = Math.max(0.3, Math.min(40.0, z));
        return Math.max(15.0, Math.min(80.0, base * (2.8 / clampedZ)));
    }
    
    hitTest(mx, my) {
        // Convert mouse coordinates to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = mx - rect.left;
        const y = my - rect.top;
        
        for (const p of this.screenPoints) {
            const dx = x - p.x;
            const dy = y - p.y;
            if (dx * dx + dy * dy <= p.r * p.r) {
                return p;
            }
        }
        return null;
    }
    
    updateHover(mx, my) {
        const hit = this.hitTest(mx, my);
        if (hit !== this.hover) {
            this.hover = hit;
            this.updateHUD();
        }
    }
    
    zoom(delta) {
        this.camera.dist = Math.max(2.2, Math.min(18.0, this.camera.dist + delta));
        this.compute();
    }
    
    goUp() {
        if (this.currentPath === '/') return;
        const lastSlash = this.currentPath.lastIndexOf('/');
        this.currentPath = lastSlash === 0 ? '/' : this.currentPath.substring(0, lastSlash);
        this.refresh();
    }
    
    openNode(node) {
        if (node.isDir) {
            this.currentPath = node.path;
            this.refresh();
        } else {
            console.log('Opening file:', node.path);
            // In a real app, this would open the file
            alert('Opening file: ' + node.name);
        }
    }
    
    updateHUD() {
        const hud = document.getElementById('hud');
        const hint = document.getElementById('hint');
        const helpText = 'Drag=rotate  Enter=open  Backspace=up  Wheel=zoom  Esc=quit';
        hud.textContent = `${this.shortPath(this.currentPath)}   |   ${helpText}`;
        
        if (this.hover) {
            const tag = this.hover.node.isDir ? 'dir' : 'file';
            hint.textContent = `${tag}: ${this.shortPath(this.hover.node.path, 120)}`;
        } else {
            hint.textContent = '';
        }
    }
    
    shortPath(path, maxLen = 52) {
        if (path.length <= maxLen) return path;
        return '…' + path.substring(path.length - maxLen + 1);
    }
    
    render() {
        const ctx = this.ctx;
        
        // Clear with black background
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawWires();
        this.drawNodes();
        
        requestAnimationFrame(() => this.render());
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const step = 60;
        
        const toCSS = (c) => `rgba(${Math.floor(c[0] * 255)}, ${Math.floor(c[1] * 255)}, ${Math.floor(c[2] * 255)}, ${c[3]})`;
        
        ctx.strokeStyle = toCSS(COLORS.GRID);
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Vertical lines
        for (let x = 0; x <= w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        
        // Horizontal lines
        for (let y = 0; y <= h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        
        ctx.stroke();
    }
    
    drawWires() {
        const ctx = this.ctx;
        const toCSS = (c) => `rgba(${Math.floor(c[0] * 255)}, ${Math.floor(c[1] * 255)}, ${Math.floor(c[2] * 255)}, ${c[3]})`;
        
        ctx.strokeStyle = toCSS(COLORS.WIRE);
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (const p of this.screenPoints) {
            if (p.node.parent && p.node.parent !== this.getParentPath(p.node.path)) {
                // Find parent node in screen points
                for (const parent of this.screenPoints) {
                    if (parent.node.path === p.node.parent) {
                        ctx.moveTo(parent.x, parent.y);
                        ctx.lineTo(p.x, p.y);
                        break;
                    }
                }
            }
        }
        
        ctx.stroke();
    }
    
    getParentPath(path) {
        if (path === '/') return null;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === 0 ? '/' : path.substring(0, lastSlash);
    }
    
    drawNodes() {
        const ctx = this.ctx;
        
        for (const p of this.screenPoints) {
            const isHover = this.hover && this.hover.node.path === p.node.path;
            let fillColor;
            
            if (p.node.isDir) {
                fillColor = COLORS.NODE_DIR;
            } else {
                const colorIndex = this.hashCode(p.node.name) % COLORS.FILE_COLORS.length;
                fillColor = COLORS.FILE_COLORS[Math.abs(colorIndex)];
            }
            
            this.draw3DNode(ctx, p, fillColor, isHover);
        }
    }
    
    draw3DNode(ctx, p, color, isHover) {
        const size = p.r;
        const depth = size * 0.5;
        
        if (p.node.isDir) {
            // Draw as tall pedestal for directories
            const w = size * 1.4;
            const h = size * 2.2;
            this.draw3DBox(ctx, p.x, p.y, w, h, depth, color, isHover);
        } else {
            // Draw as smaller box for files
            const s = size * 1.0;
            this.draw3DBox(ctx, p.x, p.y, s, s * 0.7, depth, color, isHover);
        }
    }
    
    draw3DBox(ctx, x, y, width, height, depth, baseColor, isHover) {
        const depthX = depth * 0.5;
        const depthY = depth * 0.3;
        
        // Convert color array to CSS color
        const toCSS = (c, factor = 1) => {
            return `rgba(${Math.floor(c[0] * 255 * factor)}, ${Math.floor(c[1] * 255 * factor)}, ${Math.floor(c[2] * 255 * factor)}, ${c[3]})`;
        };
        
        // Right side (darker)
        ctx.fillStyle = toCSS(baseColor, 0.6);
        ctx.fillRect(x + width/2, y - height/2, depthX, height);
        
        // Top face
        ctx.fillStyle = toCSS(baseColor, 1.0);
        ctx.fillRect(x - width/2, y + height/2, width, depthY);
        
        // Top-right corner
        ctx.fillStyle = toCSS(baseColor, 0.8);
        ctx.fillRect(x + width/2, y + height/2, depthX, depthY);
        
        // Front face (brightest)
        ctx.fillStyle = toCSS(baseColor, 1.3);
        ctx.fillRect(x - width/2, y - height/2, width, height);
        
        // Outline
        ctx.strokeStyle = isHover ? toCSS(COLORS.FG) : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isHover ? 2 : 1;
        ctx.strokeRect(x - width/2, y - height/2, width, height);
        
        // Highlight on hover
        if (isHover) {
            ctx.fillStyle = toCSS(baseColor, 1.8);
            if (height > width) { // directory
                ctx.fillRect(x - width/2 + 2, y - height/2 + 2, 4, height - 4);
            } else { // file
                ctx.fillRect(x - width/2 + 1, y - height/2 + 1, 3, 3);
            }
        }
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
}

// Start the application when page loads
window.addEventListener('load', () => {
    new FSNavigator();
});

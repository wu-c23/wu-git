class CelestialSimulator {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pipCanvas = document.getElementById('pipCanvas');
        this.pipCtx = this.pipCanvas.getContext('2d');

        // 模拟参数
        this.timeScale = 1;
        this.viewMode = 'top';
        this.earthTexture = 'satellite';
        this.showEclipse = false;

        // 天体参数
        this.sun = { radius: 50, angle: 0, rotationSpeed: 0.01 };
        this.earth = {
            radius: 20,
            angle: 0,
            distance: 200,
            rotationSpeed: 0.02,
            orbitSpeed: 0.005,
            orbitAngle: 0 // 添加初始轨道角度
        };
        this.moon = {
            radius: 8,
            angle: 0,
            distance: 50,
            rotationSpeed: 0.03,
            orbitSpeed: 0.06,
            orbitAngle: 0 // 添加初始轨道角度
        };

        // 3D场景初始化
        this.init3DScene();

        // 初始化UI事件
        this.initEvents();

        // 开始动画循环
        this.lastTime = 0;
        this.animate(0);
    }

    init3DScene() {
        //使用第三方库Three.js创建场景
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.width / this.canvas.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.domElement.style.display = 'none'; // 默认隐藏
        this.canvas.parentNode.insertBefore(this.renderer.domElement, this.canvas.nextSibling);

        // 创建轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        // 创建3D天体
        this.create3DCelestialBodies();

        // 设置相机位置
        this.camera.position.set(0, 300, 400);
        this.camera.lookAt(0, 0, 0);
    }

    create3DCelestialBodies() {
        // 太阳
        const sunGeometry = new THREE.SphereGeometry(this.sun.radius, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: false
        });
        this.sun.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun.mesh);

        // 地球
        const earthGeometry = new THREE.SphereGeometry(this.earth.radius, 32, 32);
        const earthMaterial = new THREE.MeshBasicMaterial({
            color: 0x3498db,
            wireframe: false
        });
        this.earth.mesh = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth.mesh);

        // 月球
        const moonGeometry = new THREE.SphereGeometry(this.moon.radius, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            wireframe: false
        });
        this.moon.mesh = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon.mesh);

        // 创建轨道线
        this.createOrbitLines();
    }

    createOrbitLines() {
        // 地球轨道
        const earthOrbitGeometry = new THREE.BufferGeometry();
        const earthOrbitPoints = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            earthOrbitPoints.push(new THREE.Vector3(
                Math.cos(angle) * this.earth.distance,
                0,
                Math.sin(angle) * this.earth.distance
            ));
        }
        earthOrbitGeometry.setFromPoints(earthOrbitPoints);
        const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        this.earth.orbitLine = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
        this.scene.add(this.earth.orbitLine);

        // 月球轨道
        const moonOrbitGeometry = new THREE.BufferGeometry();
        const moonOrbitPoints = [];
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            moonOrbitPoints.push(new THREE.Vector3(
                Math.cos(angle) * this.moon.distance,
                0,
                Math.sin(angle) * this.moon.distance
            ));
        }
        moonOrbitGeometry.setFromPoints(moonOrbitPoints);
        const moonOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        this.moon.orbitLine = new THREE.Line(moonOrbitGeometry, moonOrbitMaterial);
        this.scene.add(this.moon.orbitLine);
    }

    initEvents() {
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            if (this.viewMode === '3d') {
                this.renderer.domElement.style.display = 'block';
                this.canvas.style.display = 'none';
            } else {
                this.renderer.domElement.style.display = 'none';
                this.canvas.style.display = 'block';
            }
        });

        document.getElementById('timeSpeed').addEventListener('input', (e) => {
            this.timeScale = parseInt(e.target.value);
        });

        document.getElementById('earthTexture').addEventListener('change', (e) => {
            this.earthTexture = e.target.value;
        });

        document.getElementById('toggleEclipse').addEventListener('click', () => {
            this.showEclipse = !this.showEclipse;
            document.getElementById('pipContainer').style.display =
                this.showEclipse ? 'block' : 'none';
        });
    }

    animate(timestamp) {
        // 计算时间增量
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 更新天体位置和旋转角度
        this.updateCelestialBodies(deltaTime);

        // 根据视图模式渲染
        switch (this.viewMode) {
            case 'top':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawTopView();
                break;
            case 'side':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawSideView();
                break;
            case '3d':
                this.update3DScene();
                this.renderer.render(this.scene, this.camera);
                this.controls.update();
                break;
        }

        // 显示日/月食
        if (this.showEclipse) {
            this.drawEclipseView();
        }

        // 继续动画循环
        requestAnimationFrame((t) => this.animate(t));
    }

    updateCelestialBodies(deltaTime) {
        // 计算旋转角度
        const timeFactor = deltaTime * this.timeScale * 0.01;

        this.sun.angle += this.sun.rotationSpeed * timeFactor;
        this.earth.angle += this.earth.rotationSpeed * timeFactor;
        this.earth.orbitAngle += this.earth.orbitSpeed * timeFactor;

        this.moon.angle += this.moon.rotationSpeed * timeFactor;
        this.moon.orbitAngle += this.moon.orbitSpeed * timeFactor;
    }

    update3DScene() {
        // 更新太阳自转
        this.sun.mesh.rotation.y = this.sun.angle;

        // 更新地球位置和自转
        this.earth.mesh.position.set(
            Math.cos(this.earth.orbitAngle) * this.earth.distance,
            0,
            Math.sin(this.earth.orbitAngle) * this.earth.distance
        );
        this.earth.mesh.rotation.y = this.earth.angle;

        // 更新月球位置和自转 
        this.moon.mesh.position.set(
            this.earth.mesh.position.x + Math.cos(this.moon.orbitAngle) * this.moon.distance,
            0,
            this.earth.mesh.position.z + Math.sin(this.moon.orbitAngle) * this.moon.distance
        );
        this.moon.mesh.rotation.y = this.moon.angle;
    }

    drawTopView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 绘制太阳
        this.drawSun(centerX, centerY);

        // 绘制地球轨道
        this.drawOrbit(centerX, centerY, this.earth.distance);

        // 计算地球位置
        const earthX = centerX + Math.cos(this.earth.orbitAngle) * this.earth.distance;
        const earthY = centerY + Math.sin(this.earth.orbitAngle) * this.earth.distance;

        // 绘制地球
        this.drawEarth(earthX, earthY);

        // 绘制月球轨道
        this.drawOrbit(earthX, earthY, this.moon.distance);

        // 计算月球位置
        const moonX = earthX + Math.cos(this.moon.orbitAngle) * this.moon.distance;
        const moonY = earthY + Math.sin(this.moon.orbitAngle) * this.moon.distance;

        // 绘制月球
        this.drawMoon(moonX, moonY);
    }

    drawSideView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 绘制太阳 
        this.drawSun(centerX, centerY);

        // 绘制地球轨道 
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.moveTo(centerX - this.earth.distance, centerY);
        this.ctx.lineTo(centerX + this.earth.distance, centerY);
        this.ctx.stroke();

        // 计算地球位置 
        const earthX = centerX + Math.cos(this.earth.orbitAngle) * this.earth.distance;
        const earthY = centerY;

        // 绘制地球
        this.drawEarth(earthX, earthY);

        // 绘制月球轨道
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.ellipse(
            earthX, earthY,
            this.moon.distance, this.moon.distance * 0.3, 
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();

        // 计算月球位置 
        const moonX = earthX + Math.cos(this.moon.orbitAngle) * this.moon.distance;
        const moonY = earthY + Math.sin(this.moon.orbitAngle) * this.moon.distance * 0.3; // Y轴压缩

        // 绘制月球
        this.drawMoon(moonX, moonY);
    }

    drawEclipseView() {
        // 清除画布
        this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);


        // 检查是否发生日/月食
        const isSolarEclipse = this.checkSolarEclipse();
        const isLunarEclipse = this.checkLunarEclipse();

        if (isSolarEclipse) {
            this.drawSolarEclipse();
        } else if (isLunarEclipse) {
            this.drawLunarEclipse();
        }
    }

    drawSun(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#ffff00';
        this.ctx.arc(x, y, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawEarth(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#3498db';
        this.ctx.arc(x, y, this.earth.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMoon(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#cccccc';
        this.ctx.arc(x, y, this.moon.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawOrbit(centerX, centerY, radius) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    checkSolarEclipse() {//这个函数是AI生成用来测试画中画的，后续需要重写
        const angleDiff = Math.abs(this.moon.orbitAngle - this.earth.orbitAngle) % (Math.PI * 2);
        return angleDiff < 0.17 || angleDiff > (Math.PI * 2 - 0.17); // ~10度阈值
    }

    checkLunarEclipse() {
        
        return false;
    }

    drawSolarEclipse() {//这个函数是AI生成用来测试画中画的，后续需要重写
        const pipCenterX = this.pipCanvas.width / 2;
        const pipCenterY = this.pipCanvas.height / 2;

        // 绘制太阳
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#ffff00';
        this.pipCtx.arc(pipCenterX, pipCenterY, this.sun.radius * 0.5, 0, Math.PI * 2);
        this.pipCtx.fill();

        // 绘制月球遮挡
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.arc(pipCenterX, pipCenterY, this.moon.radius * 0.5, 0, Math.PI * 2);
        this.pipCtx.fill();

        // 添加日冕效果
        this.pipCtx.beginPath();
        this.pipCtx.strokeStyle = '#ffff00';
        this.pipCtx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const startX = pipCenterX + Math.cos(angle) * this.sun.radius * 0.5;
            const startY = pipCenterY + Math.sin(angle) * this.sun.radius * 0.5;
            const endX = pipCenterX + Math.cos(angle) * this.sun.radius * 0.7;
            const endY = pipCenterY + Math.sin(angle) * this.sun.radius * 0.7;
            this.pipCtx.moveTo(startX, startY);
            this.pipCtx.lineTo(endX, endY);
        }
        this.pipCtx.stroke();

       
    }

    drawLunarEclipse() {
        
    }
}

// 页面加载完成后初始化模拟器
window.onload = function () {
    new CelestialSimulator();
};
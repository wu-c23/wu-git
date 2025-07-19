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
            semiMajorAxis: 200,
            eccentricity: 0.0167,
            rotationSpeed: 0.02,
            orbitSpeed: 0.005,
            orbitAngle: 0,
        };
        this.moon = {
         radius: 8,
            angle: 0,
            semiMajorAxis: 50,
            eccentricity: 0.0554,
            rotationSpeed: 0.03,
            orbitSpeed: 0.03,
            orbitAngle: 0,
        };

        // 3D场景初始化
        this.init3DScene();

        // 初始化UI事件
        this.initEvents();

        // 开始动画循环
        this.lastTime = 0;
        this.animate(0);
    }

    // 计算椭圆轨道上的位置
    getEllipticalPosition(semiMajorAxis, eccentricity, angle) {
        // 计算真近点角（从近地点开始的角度）
        const trueAnomaly = angle % (Math.PI * 2);
        
        // 计算半短轴
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        
        // 计算焦点距离
        const focalDistance = semiMajorAxis * eccentricity;
        
        // 计算椭圆上的坐标（以中心为原点）
        const x = semiMajorAxis * Math.cos(trueAnomaly) - focalDistance;
        const y = semiMinorAxis * Math.sin(trueAnomaly);
        
        // 计算距离（用于开普勒第二定律）
        const distance = semiMajorAxis * (1 - eccentricity * eccentricity) / 
                        (1 + eccentricity * Math.cos(trueAnomaly));
        
        return { x, y, distance };
    }

    // 新增方法：绘制椭圆轨道
    drawEllipticalOrbit(centerX, centerY, semiMajorAxis, eccentricity) {
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        const focalDistance = semiMajorAxis * eccentricity;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.ellipse(
            centerX + focalDistance, // 椭圆中心偏移
            centerY,
            semiMajorAxis,
            semiMinorAxis,
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();
    }

    init3DScene() {
        // 使用第三方库Three.js创建场景
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.width / this.canvas.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.domElement.style.display = 'none'; // Ĭ������
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
        // ̫太阳
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
        // 地球轨道（椭圆）
        const earthOrbitGeometry = new THREE.BufferGeometry();
        const earthOrbitPoints = [];
        const earthSemiMinor = this.earth.semiMajorAxis * 
                              Math.sqrt(1 - this.earth.eccentricity * this.earth.eccentricity);
        const earthFocalDistance = this.earth.semiMajorAxis * this.earth.eccentricity;
        
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            const pos = this.getEllipticalPosition(
                this.earth.semiMajorAxis,
                this.earth.eccentricity,
                angle
            );
            earthOrbitPoints.push(new THREE.Vector3(pos.x, 0, pos.y));
        }
        
        earthOrbitGeometry.setFromPoints(earthOrbitPoints);
        const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        this.earth.orbitLine = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
        this.scene.add(this.earth.orbitLine);

        // 月球轨道（椭圆）
        this.moonOrbitContainer = new THREE.Object3D();
        this.earth.mesh.add(this.moonOrbitContainer); // 将轨道容器添加到地球
        
        const moonOrbitGeometry = new THREE.BufferGeometry();
        const moonOrbitPoints = [];
        
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const pos = this.getEllipticalPosition(
                this.moon.semiMajorAxis,
                this.moon.eccentricity,
                angle
            );
            moonOrbitPoints.push(new THREE.Vector3(pos.x, 0, pos.y));
        }
        
        moonOrbitGeometry.setFromPoints(moonOrbitPoints);
        const moonOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        this.moon.orbitLine = new THREE.Line(moonOrbitGeometry, moonOrbitMaterial);
        this.moonOrbitContainer.add(this.moon.orbitLine); // 将轨道线添加到容器
        
    }

    initEvents() {
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            // 切换视图时显示/隐藏3D渲染器
            if (this.viewMode === '3d') {
                this.renderer.domElement.style.display = 'block';
                this.canvas.style.display = 'none';
            } else {
                this.renderer.domElement.style.display = 'none';
                this.canvas.style.display = 'block';
            }
        });
        // 速度
        document.getElementById('timeSpeed').addEventListener('input', (e) => {
            this.timeScale = parseInt(e.target.value);
        });
        // 皮肤
        document.getElementById('earthTexture').addEventListener('change', (e) => {
            this.earthTexture = e.target.value;
        });
        // 画中画
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
        this.earth.orbitAngle = (this.earth.orbitAngle || 0) + this.earth.orbitSpeed * timeFactor;

        this.moon.angle += this.moon.rotationSpeed * timeFactor;
        this.moon.orbitAngle = (this.moon.orbitAngle || 0) + this.moon.orbitSpeed * timeFactor;
    }

    update3DScene() {
        // 更新太阳自转
        this.sun.mesh.rotation.y = this.sun.angle;

        // 更新地球位置和自转
        const earthPos = this.getEllipticalPosition(
            this.earth.semiMajorAxis, 
            this.earth.eccentricity, 
            this.earth.orbitAngle
        );
        this.earth.mesh.position.set(earthPos.x, 0, earthPos.y);
        this.earth.mesh.rotation.y = this.earth.angle;
        
        // 根据开普勒第二定律调整地球速度
        const earthSpeedFactor = 1 / (earthPos.distance * earthPos.distance);

        // 更新月球位置和自转
        const moonRelativePos = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        this.moon.mesh.position.set(
            earthPos.x + moonRelativePos.x,
            0,
            earthPos.y + moonRelativePos.y
        );
        this.moon.mesh.rotation.y = this.moon.angle;

        // 根据开普勒第二定律调整月球速度
        const moonSpeedFactor = 1 / (moonRelativePos.distance * moonRelativePos.distance);

        // 更新轨道角度，考虑开普勒第二定律
        this.earth.orbitAngle += this.earth.orbitSpeed * earthSpeedFactor;
        this.moon.orbitAngle += this.moon.orbitSpeed * moonSpeedFactor;
    }

    drawTopView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 绘制太阳
        this.drawSun(centerX, centerY);
        
        // 绘制地球轨道（椭圆）
        this.drawEllipticalOrbit(
            centerX, 
            centerY, 
            this.earth.semiMajorAxis, 
            this.earth.eccentricity
        );
        
        // 计算地球位置
        const earthPos = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        const earthX = centerX + earthPos.x;
        const earthY = centerY + earthPos.y;
        
        // 绘制地球
        this.drawEarth(earthX, earthY);
        
        // 绘制月球轨道（椭圆）
        this.drawEllipticalOrbit(
            earthX, 
            earthY, 
            this.moon.semiMajorAxis, 
            this.moon.eccentricity
        );
        
        // 计算月球位置
        const moonPos = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        const moonX = earthX + moonPos.x;
        const moonY = earthY + moonPos.y;
        
        // 绘制月球
        this.drawMoon(moonX, moonY);
    }

    drawSideView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 绘制太阳（固定在中心）
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
            this.moon.distance, this.moon.distance * 0.3, // ��Բ�����Y��ѹ��
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();

        // 计算月球位置
        const moonX = earthX + Math.cos(this.moon.orbitAngle) * this.moon.distance;
        const moonY = earthY + Math.sin(this.moon.orbitAngle) * this.moon.distance * 0.3; // Y��ѹ��

        // 绘制月球
        this.drawMoon(moonX, moonY);
    }

    drawEclipseView() {
        // 清除画布
        this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // 设置黑色背景
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.fillRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);
    
        // 检查是否发生日/月食
        const isSolarEclipse = this.checkSolarEclipse();
        const isLunarEclipse = this.checkLunarEclipse();

        if (isSolarEclipse) {
            this.drawSolarEclipse();
        } else if (isLunarEclipse) {
            this.drawLunarEclipse();
        } else {
             // 没有日/月食时显示提示信息
            this.pipCtx.fillStyle = '#ffffff';
            this.pipCtx.font = '16px Arial';
            this.pipCtx.fillText('当前无日/月食现象', 50, 150);
        }
    }
    // 简单绘制，暂时就用不同大小和颜色的球代替，后续可以把我写的删了扩展
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
    // 下面四个函数是暂定写日食和月食的，这里还没写
    checkSolarEclipse() {
        // 计算地球到太阳的距离
        const earthPos = this.earth.mesh.position.clone();
        const sunPos = this.sun.mesh.position.clone();
        const distance = earthPos.distanceTo(sunPos);
        
        // 计算月球到地球的距离
        const moonPos = this.moon.mesh.position.clone();
        const moonEarthDistance = moonPos.distanceTo(earthPos);
        
        // 计算三个天体的对齐程度
        const alignment = moonPos.clone().sub(earthPos).normalize()
            .dot(sunPos.clone().sub(earthPos).normalize());
        
        // 当日月地近似在一条直线上(alignment接近1)且月球距离合适时发生日食
        return alignment > 0.995 && moonEarthDistance < 60;
    }

    checkLunarEclipse() {
        // 计算地球到太阳的距离
        const earthPos = this.earth.mesh.position.clone();
        const sunPos = this.sun.mesh.position.clone();
        
        // 计算月球到地球的距离
        const moonPos = this.moon.mesh.position.clone();
        const moonEarthDistance = moonPos.distanceTo(earthPos);
        
        // 计算三个天体的对齐程度
        const alignment = moonPos.clone().sub(earthPos).normalize()
            .dot(sunPos.clone().sub(earthPos).normalize());
        
        // 当日月地近似在一条直线上(alignment接近-1)时发生月食
        return alignment < -0.995;
    }

    drawSolarEclipse() {
        const centerX = this.pipCanvas.width / 2;
        const centerY = this.pipCanvas.height / 2;
        
        // 计算月球的视直径和太阳的视直径比例
        const moonDistance = this.moon.mesh.position.distanceTo(this.earth.mesh.position);
        const sunDistance = this.sun.mesh.position.distanceTo(this.earth.mesh.position);
        const moonApparentSize = (this.moon.radius / moonDistance) * 500;
        const sunApparentSize = (this.sun.radius / sunDistance) * 500;
        
        // 绘制太阳
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#ffff00';
        this.pipCtx.arc(centerX, centerY, sunApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();
        
        // 绘制月球阴影
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();
        
        // 根据视直径比例判断日食类型
        const sizeRatio = moonApparentSize / sunApparentSize;
        
        // 添加日食类型文字说明
        this.pipCtx.fillStyle = '#ffffff';
        this.pipCtx.font = '16px Arial';

        if (sizeRatio > 1.05) {
            // 全食
            this.pipCtx.fillText('日全食', 10, 30);
        } else if (sizeRatio > 0.95) {
            // 环食
            this.pipCtx.fillText('日环食', 10, 30);
            // 绘制环食效果
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = '#ffff00';
            this.pipCtx.arc(centerX, centerY, sunApparentSize * 0.9, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else {
            // 偏食
            this.pipCtx.fillText('日偏食', 10, 30);
            // 绘制偏食效果
            this.pipCtx.globalCompositeOperation = 'destination-out';
            this.pipCtx.beginPath();
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
            this.pipCtx.globalCompositeOperation = 'source-over';
        }
    }

    drawLunarEclipse() {
        const centerX = this.pipCanvas.width / 2;
        const centerY = this.pipCanvas.height / 2;
        
        // 计算月球视大小
        const moonDistance = this.moon.mesh.position.distanceTo(this.earth.mesh.position);
        const moonApparentSize = (this.moon.radius / moonDistance) * 500;
        
        // 绘制月球
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#cccccc';
        this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();
        
        // 计算地球阴影大小
        const earthShadowSize = moonApparentSize * 2.5; // 地球阴影大约是月球的2.5倍
        
        // 绘制地球阴影
        this.pipCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, earthShadowSize, 0, Math.PI * 2);
        this.pipCtx.fill();
        
        // 计算阴影覆盖程度
        const alignment = this.moon.mesh.position.clone().sub(this.earth.mesh.position).normalize()
            .dot(this.sun.mesh.position.clone().sub(this.earth.mesh.position).normalize());
        const coverage = Math.abs(alignment + 1) / 0.01; // 0-1表示覆盖程度
        
        // 添加月食类型文字说明
        this.pipCtx.fillStyle = '#ffffff';
        this.pipCtx.font = '16px Arial';
        
        if (coverage > 0.95) {
            // 全食
            this.pipCtx.fillText('月全食', 10, 30);
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = 'rgba(100, 0, 0, 0.8)'; // 月全食时的红色
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else if (coverage > 0.3) {
            // 偏食
            this.pipCtx.fillText('月偏食', 10, 30);
            // 绘制偏食效果
            const shadowAngle = Math.atan2(
                this.moon.mesh.position.z - this.earth.mesh.position.z,
                this.moon.mesh.position.x - this.earth.mesh.position.x
            );
            
            this.pipCtx.save();
            this.pipCtx.beginPath();
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.clip();

            this.pipCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.pipCtx.beginPath();
            this.pipCtx.arc(
                centerX + Math.cos(shadowAngle) * moonApparentSize * 0.7,
                centerY + Math.sin(shadowAngle) * moonApparentSize * 0.7,
                earthShadowSize * 0.8,
                0, Math.PI * 2
            );
            this.pipCtx.fill();
            this.pipCtx.restore();
        } else {
            // 半影月食
            this.pipCtx.fillText('半影月食', 10, 30);
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
        }
    }
}

// 页面加载完成后初始化模拟器
window.onload = function () {
    new CelestialSimulator();
};
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
        this.isPaused = false;

        // 天体参数
        this.sun = {
            radius: 75,
            angle: 0,
            rotationSpeed: 0.01,
            spots: [
                { size: 3, x: 0.3, y: 0.2, angle: 0 },
                { size: 5, x: -0.4, y: -0.1, angle: 0 },
                { size: 4, x: 0.1, y: -0.3, angle: 0 },
            ]
        };
        this.earth = {
            radius: 20,
            angle: 0,
            distance: 300,
            semiMajorAxis: 300,
            eccentricity: 0.0167,
            rotationSpeed: 0.02,
            orbitSpeed: 0.005,
            orbitAngle: 0,
        };
        this.moon = {
            radius: 12,
            angle: 0,
            distance: 75,
            semiMajorAxis: 75,
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

        // 计算焦距
        const focalDistance = semiMajorAxis * eccentricity;

        // 计算焦准距
        const focalParameter = semiMajorAxis - focalDistance * focalDistance / semiMajorAxis;

        // 计算距离
        const distance = focalParameter / (1 - eccentricity * Math.cos(trueAnomaly));

        // 计算椭圆上的坐标（以中心为原点）
        const x = distance * Math.cos(trueAnomaly) - focalDistance;
        const y = -distance * Math.sin(trueAnomaly);//真实y坐标与计算机的y坐标相反

        return [{ x, y }, distance];
    }

    // 绘制椭圆轨道
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

    createOrbitLines() {
        // 地球轨道（椭圆）
        const earthOrbitGeometry = new THREE.BufferGeometry();
        const earthOrbitPoints = [];
        const earthSemiMinor = this.earth.semiMajorAxis *
            Math.sqrt(1 - this.earth.eccentricity * this.earth.eccentricity);
        const earthFocalDistance = this.earth.semiMajorAxis * this.earth.eccentricity;

        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            const [pos, dis] = this.getEllipticalPosition(
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
            const [pos, dis] = this.getEllipticalPosition(
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
        //暂停按钮
        document.getElementById('togglePause').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('togglePause').textContent =
                this.isPaused ? 'continue' : 'pause';
            if (!this.isPaused) {
                this.lastTime = performance.now();
                this.animate(performance.now());
            }
        });
    }

    animate(timestamp) {

        if (this.isPaused) {
            return; // 暂停
        }

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

        // 根据Kepler定律调节地、月公转速度
        const earthOrbitSpeedFactor = Math.pow((1 - this.earth.eccentricity * Math.cos(this.earth.orbitAngle)) / (1 - this.earth.eccentricity), 2);
        const moonOrbitSpeedFactor = Math.pow((1 - this.moon.eccentricity * Math.cos(this.moon.orbitAngle)) / (1 - this.moon.eccentricity), 2);

        this.sun.angle += this.sun.rotationSpeed * timeFactor;
        this.earth.angle += this.earth.rotationSpeed * timeFactor;
        this.earth.orbitAngle = (this.earth.orbitAngle || 0) + this.earth.orbitSpeed * timeFactor * earthOrbitSpeedFactor;
        this.earth.orbitAngle = this.earth.orbitAngle % (Math.PI * 2);
        this.moon.angle += this.moon.rotationSpeed * timeFactor;
        this.moon.orbitAngle = (this.moon.orbitAngle || 0) + this.moon.orbitSpeed * timeFactor * moonOrbitSpeedFactor;
        this.moon.orbitAngle = this.moon.orbitAngle % (Math.PI * 2);
    }

    update3DScene() {
        if (this.corona) {
            this.corona.lookAt(this.camera.position);
        }
        // 更新太阳自转
        this.sun.mesh.rotation.y = this.sun.angle;

        // 更新地球位置和自转
        const [earthPos, earthDis] = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        this.earth.distance = earthDis;
        this.earth.mesh.position.set(earthPos.x, 0, earthPos.y);
        this.earth.mesh.rotation.y = this.earth.angle;

        // 更新月球位置和自转
        const [moonRelativePos, moonRelativeDis] = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        this.moon.distance = moonRelativeDis;
        this.moon.mesh.position.set(
            earthPos.x + moonRelativePos.x,
            0,
            earthPos.y + moonRelativePos.y
        );
        this.moon.mesh.rotation.y = this.moon.angle;
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
        const [earthPos, earthDis] = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        const earthX = centerX + earthPos.x;
        const earthY = centerY + earthPos.y;
        this.earth.distance = earthDis;

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
        const [moonPos, moonDis] = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        const moonX = earthX + moonPos.x;
        const moonY = earthY + moonPos.y;
        this.moon.distance = moonDis;

        // 绘制月球
        this.drawMoon(moonX, moonY);
    }

    drawSideView() {
        // 太阳位置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 绘制太阳（固定在中心）
        this.drawSun(centerX, centerY);
        // 计算地球位置
        const [earthPos, earthDis] = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        const earthX = centerX + earthPos.x;
        const earthY = centerY;
        this.earth.distance = earthDis;

        // 计算月球位置
        const [moonPos, moonDis] = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        const moonX = earthX + moonPos.x;
        const moonY = earthY;
        this.moon.distance = moonDis;

        // 绘制地球轨道
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.moveTo(centerX - this.earth.distance, centerY);
        this.ctx.lineTo(centerX + this.earth.distance, centerY);
        this.ctx.stroke();

        //遮挡判断，当地球在太阳后面,相对角(0,pi)；月球在地球后面
        if (this.earth.orbitAngle >= 0 && this.earth.orbitAngle <= Math.PI) {
            if (this.moon.orbitAngle >= 0 && this.moon.orbitAngle <= Math.PI) {
                //绘制月球
                this.drawMoon(moonX, moonY);
                //绘制地球
                this.drawEarth(earthX, earthY);
            }
            else {
                this.drawEarth(earthX, earthY);
                this.drawMoon(moonX, moonY);
            }

            this.drawSun(centerX, centerY);
        }
        else {
            this.drawSun(centerX, centerY);
            if (this.moon.orbitAngle >= 0 && this.moon.orbitAngle <= Math.PI) {
                this.drawMoon(moonX, moonY);
                this.drawEarth(earthX, earthY);
            }
            else {
                this.drawEarth(earthX, earthY);
                this.drawMoon(moonX, moonY);
            }
        }

        // 绘制月球轨道
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.ellipse(
            earthX,
            earthY,
            this.moon.semiMajorAxis,
            0, // ????????Y?????
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();
    }

    drawEclipseView() {
        // 清除画布
        this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // 设置黑色背景
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.fillRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // 检查是否发生日/月食
        const [isSolarEclipse, SolarEclipseType] = this.checkSolarEclipse();
        const [isLunarEclipse, LunarEclipseType] = this.checkLunarEclipse();

        if (isSolarEclipse) {
            this.drawSolarEclipse(SolarEclipseType);
        } else if (isLunarEclipse) {
            this.drawLunarEclipse(LunarEclipseType);
        } else {
            // 没有日月食时显示提示信息
            this.pipCtx.fillStyle = '#ffffff';
            this.pipCtx.font = '16px Arial';
            this.pipCtx.fillText('no eclipse phenominon', 80, 150);
        }
    }
    // 简单绘制，暂时就用不同大小和颜色的球代替，后续可以把我写的删了扩展
    drawSun(x, y) {
        this.ctx.save();

        // 设置阴影模拟光晕
        this.ctx.shadowColor = '#ffffaa';
        this.ctx.shadowBlur = 20;

        // 创建径向渐变
        const gradient = this.ctx.createRadialGradient(
            x, y, 0,
            x, y, this.sun.radius
        );
        gradient.addColorStop(0, '#ffffaa');
        gradient.addColorStop(0.8, '#ffff00');
        gradient.addColorStop(1, '#ffdd00');

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(x, y, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.sun.spots.forEach(spot => {
            const spotAngle = this.sun.angle + spot.angle;
            const spotX = x + Math.cos(spotAngle) * spot.x * this.sun.radius;
            const spotY = y + Math.sin(spotAngle) * spot.y * this.sun.radius;
            this.ctx.beginPath();
            this.ctx.fillStyle = '#ffdd00'; // 稍暗的黄色斑点
            this.ctx.arc(spotX, spotY, spot.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    drawEarth(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#3498db';  // 蓝色地球
        this.ctx.arc(x, y, this.earth.radius, 0, Math.PI * 2);
        this.ctx.fill();

        //添加简单的地球表面特征（大陆）
        this.ctx.beginPath();
        this.ctx.fillStyle = '#2ecc71';  // 绿色大陆
        this.ctx.arc(x - 5, y - 3, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.arc(x + 8, y + 2, 6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMoon(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#cccccc';  // 灰色月球
        this.ctx.arc(x, y, this.moon.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 可选：添加简单的月球陨石坑
        this.ctx.beginPath();
        this.ctx.fillStyle = '#aaaaaa';  // 更深的灰色
        this.ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.arc(x + 4, y + 1, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    init3DScene() {
        // 使用第三方库Three.js创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.width / this.canvas.height,
            0.1,
            1000);
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.domElement.style.display = 'none'; //默认不显示
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

        const sunTexture = this.createSunTexture();
        const sunMaterial = new THREE.MeshStandardMaterial({
            map: sunTexture,
            emissiveMap: sunTexture, // 用纹理控制自发光强度（黑子区域发光弱）
            emissive: 0xffffdd,     // 自发光颜色（暖黄）
            emissiveIntensity: 1.5, // 增强发光强度
            roughness: 0.8,         // 太阳表面并非完全光滑，提高粗糙度
            metalness: 0.0,
            side: THREE.FrontSide
        });

        this.sun.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun.mesh);

        // 添加点光源（保持不变）
        const sunLight = new THREE.PointLight(0xffffee, 2, 1000, 0.5);

        this.sun.mesh.add(sunLight);

        // 日冕（光晕）
        const coronaGeometry = new THREE.RingGeometry(
            this.sun.radius * 1.0,
            this.sun.radius * 1.5,
            64
        );

        const coronaMaterial = new THREE.ShaderMaterial({});

        // 将日冕赋值给实例变量，确保update3DScene能访问
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.corona.rotation.x = Math.PI / 2;
        this.scene.add(this.corona);
        // 为地球创建自定义纹理
        const earthTexture = this.createEarthTexture();

        // 地球几何体和材质
        const earthGeometry = new THREE.SphereGeometry(this.earth.radius, 32, 32);
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthTexture,
            roughness: 0.8,
            metalness: 0.0
        });
        this.earth.mesh = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth.mesh);
        // 为月球创建自定义纹理
        const moonTexture = this.createMoonTexture();

        // 月球几何体和材质
        const moonGeometry = new THREE.SphereGeometry(this.moon.radius, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({
            map: moonTexture,
            roughness: 1.0,  // 月球表面较粗糙
            metalness: 0.0
        });
        this.moon.mesh = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon.mesh);

        // 创建轨道线
        this.createOrbitLines();
    }

    // 自定义绘制太阳纹理
    createSunTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;  // 提高分辨率，增加细节
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 绘制基础径向渐变（核心到表面的温度变化）
        const baseGradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        // 颜色调整：从核心亮白→金黄→橙红（更贴近真实太阳）
        baseGradient.addColorStop(0, '#ffffff');    // 核心（超高温）
        baseGradient.addColorStop(0.3, '#ffff99');  // 中层（亮黄）
        baseGradient.addColorStop(0.7, '#ffaa33');  // 外层（橙黄）
        baseGradient.addColorStop(1, '#cc5500');    // 边缘（橙红）
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        //绘制太阳黑子（更真实的形状和分布）
        for (let i = 0; i < 10; i++) {
            const spotX = canvas.width * (0.2 + Math.random() * 0.6); // 避免边缘集中
            const spotY = canvas.height * (0.2 + Math.random() * 0.6);
            const spotSize = 8 + Math.random() * 20;  // 更大的尺寸差异

            // 黑子渐变（中心暗褐，边缘过渡到周围颜色）
            const spotGradient = ctx.createRadialGradient(
                spotX, spotY, 0,
                spotX, spotY, spotSize
            );
            spotGradient.addColorStop(0, '#221a00');   // 中心（深褐）
            spotGradient.addColorStop(0.4, '#553300'); // 中间（深橙褐）
            spotGradient.addColorStop(0.8, '#884400'); // 边缘（深橙）
            spotGradient.addColorStop(1, 'transparent');

            // 绘制不规则黑子形状（椭圆+变形）
            ctx.fillStyle = spotGradient;
            ctx.beginPath();
            const rotation = Math.random() * Math.PI; // 随机旋转
            ctx.save();
            ctx.translate(spotX, spotY);
            ctx.rotate(rotation);
            // 绘制椭圆黑子（更真实，太阳黑子很少是正圆）
            ctx.scale(1 + Math.random() * 0.5, 1); // X方向稍扁
            ctx.arc(0, 0, spotSize, 0, Math.PI * 2);
            ctx.restore();
            ctx.fill();
        }

        //绘制耀斑（更动态的火焰效果）
        for (let i = 0; i < 8; i++) {
            const flareX = canvas.width * (0.3 + Math.random() * 0.4); // 集中在中间区域
            const flareY = canvas.height * (0.3 + Math.random() * 0.4);
            const flareSize = 15 + Math.random() * 30;

            // 耀斑颜色（从亮白到橙红的渐变）
            const gradient = ctx.createLinearGradient(
                flareX, flareY,
                flareX + Math.cos(i) * flareSize,
                flareY + Math.sin(i) * flareSize
            );
            gradient.addColorStop(0, 'rgba(255, 255, 220, 0.8)'); // 亮白核心
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0.5)');   // 橙红边缘

            ctx.fillStyle = gradient;
            ctx.beginPath();

            // 绘制不规则火焰形状（多段贝塞尔曲线模拟气体喷射）
            ctx.moveTo(flareX, flareY);
            // 随机方向的火焰分支
            const branchCount = 3 + Math.floor(Math.random() * 2); // 3-4个分支
            for (let b = 0; b < branchCount; b++) {
                const angle = (b / branchCount) * Math.PI * 2;
                const controlX1 = flareX + Math.cos(angle) * flareSize * 0.6;
                const controlY1 = flareY + Math.sin(angle) * flareSize * 0.3;
                const controlX2 = flareX + Math.cos(angle) * flareSize * 1.2;
                const controlY2 = flareY + Math.sin(angle) * flareSize * 0.8;
                const endX = flareX + Math.cos(angle) * flareSize * 1.5;
                const endY = flareY + Math.sin(angle) * flareSize * 1.2;
                ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
            }
            ctx.closePath();
            ctx.fill();
        }

        //绘制表面气体流动纹理（增加层次感）
        ctx.fillStyle = 'rgba(255, 200, 0, 0.1)'; // 淡金色
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 5 + Math.random() * 15;
            const angle = Math.random() * Math.PI * 2;
            // 绘制流线型条纹（模拟太阳表面的气体流动）
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * size,
                y + Math.sin(angle) * size
            );
            ctx.lineWidth = 2 + Math.random() * 3;
            ctx.strokeStyle = `rgba(255, ${180 + Math.random() * 75}, ${Math.random() * 50}, 0.3)`;
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 地球颜色定义
        const oceanColor = '#5ab5f1ff';
        const landColor = '#080808ff';
        const cloudColor = 'rgba(255, 255, 255, 0.7)';

        // 生成随机大陆分布
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                // 计算经纬度（球面映射）
                const lon = (x / canvas.width) * Math.PI * 2 - Math.PI;
                const lat = (y / canvas.height) * Math.PI - Math.PI / 2;

                // 改进的噪声函数（多层叠加，更自然）
                let noise = 0;
                noise += 0.5 * this.fbmNoise(lon * 1, lat * 1);
                noise += 0.25 * this.fbmNoise(lon * 2, lat * 2);
                noise += 0.125 * this.fbmNoise(lon * 4, lat * 4);
                noise += 0.0625 * this.fbmNoise(lon * 8, lat * 8);
                noise /= (0.5 + 0.25 + 0.125 + 0.0625); // 归一化.simpleNoise(lon * 4, lat * 4) * 0.5 + 0.5;

                // 基于噪声值确定是海洋还是陆地
                let color;
                if (noise > 0.4) {
                    color = landColor;
                } else {
                    color = oceanColor;
                }

                // 绘制像素
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        // 添加云层
        for (let i = 0; i < 20; i++) {
            const cloudX = Math.random() * canvas.width;
            const cloudY = Math.random() * canvas.height;
            const cloudSize = 5 + Math.random() * 10;

            ctx.fillStyle = cloudColor;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // 将Canvas转换为纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return texture;
    }
    // 改进的噪声函数（使用FBM - 分形布朗运动）
    fbmNoise(x, y) {
        // 基础噪声函数
        const baseNoise = Math.sin(x * 10) * Math.cos(y * 10) * 0.5 + 0.5;

        // 添加随机性和频率变化
        const noise1 = Math.sin(x * 15 + 123.45) * Math.cos(y * 15 + 678.9) * 0.5 + 0.5;
        const noise2 = Math.sin(x * 20 + 987.65) * Math.cos(y * 20 + 432.1) * 0.5 + 0.5;

        // 组合多层噪声
        return (baseNoise + noise1 * 0.5 + noise2 * 0.25) / (1 + 0.5 + 0.25);
    }
    // 自定义绘制月球纹理
    createMoonTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;  // 纹理分辨率
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 1. 绘制月球表面底色（灰色渐变）
        const baseGradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        baseGradient.addColorStop(0, '#dddddd');  // 中心稍亮
        baseGradient.addColorStop(1, '#999999');  // 边缘稍暗
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. 绘制大型陨石坑（随机分布）
        for (let i = 0; i < 15; i++) {
            const craterX = Math.random() * canvas.width;
            const craterY = Math.random() * canvas.height;
            const craterSize = 5 + Math.random() * 15;  // 大小随机

            // 陨石坑主体（稍暗）
            const craterGradient = ctx.createRadialGradient(
                craterX, craterY, 0,
                craterX, craterY, craterSize
            );
            craterGradient.addColorStop(0, '#888888');
            craterGradient.addColorStop(0.8, '#777777');
            craterGradient.addColorStop(1, '#999999');  // 边缘过渡

            ctx.fillStyle = craterGradient;
            ctx.beginPath();
            ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            ctx.fill();

            // 陨石坑边缘（亮边，模拟环形山）
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(craterX, craterY, craterSize * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. 绘制小型陨石坑（增加细节）
        for (let i = 0; i < 50; i++) {
            const smallCraterX = Math.random() * canvas.width;
            const smallCraterY = Math.random() * canvas.height;
            const smallSize = 1 + Math.random() * 3;

            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.arc(smallCraterX, smallCraterY, smallSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. 转换为Three.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return texture;
    }
    checkSolarEclipse() {
        const angleDifference = Math.abs(this.earth.orbitAngle - this.moon.orbitAngle) % (Math.PI * 2);
        const differenceIndex = Math.abs(angleDifference - Math.PI);
        let SolarEclipseType = -1;
        if (differenceIndex < 0.1) {    // 发生日食
            if (differenceIndex > 0.05) {   // 日偏食
                SolarEclipseType = 2;
            } else {
                const criticalEarthOrbitAngle = Math.acos(this.earth.eccentricity);
                if ((this.earth.orbitAngle > criticalEarthOrbitAngle)
                    && (this.earth.orbitAngle < 2 * Math.PI - criticalEarthOrbitAngle)) {   // 日环食
                    SolarEclipseType = 1;
                } else {    // 日全食
                    SolarEclipseType = 0;
                }
            }
            return [true, SolarEclipseType];
        } else {
            return [false, 3];
        }
    }

    checkLunarEclipse() {
        const angleDifference = Math.abs(this.earth.orbitAngle - this.moon.orbitAngle) % (Math.PI * 2);
        const differenceIndex = (Math.PI - Math.abs(angleDifference - Math.PI));
        let LunarEclipseType = -1;
        if (differenceIndex < 0.1) {    // 发生月食
            if (differenceIndex > 0.05) {   // 半影月食
                LunarEclipseType = 2;
            } else if (differenceIndex > 0.02) {    // 月偏食
                LunarEclipseType = 1;
            } else {    // 月全食
                LunarEclipseType = 0;
            }
            return [true, LunarEclipseType];
        } else {
            return [false, 3];
        }
    }

    drawSolarEclipse(SolarEclipseType) {

        /*
        * 这是对日食类型的判定
        * 等待完善绘画
        */
        switch (SolarEclipseType) {
            case 0:     // 日全食
                // To do
                break;
            case 1:     // 日环食
                // To do
                break;
            case 2:     // 日偏食
                // To do
                break;
            default:
                break;
        }




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
            this.pipCtx.fillText('total solar eclipse.', 10, 30);
        } else if (sizeRatio > 0.95) {
            // 环食
            this.pipCtx.fillText('annular solar eclipse', 10, 30);
            // 绘制环食效果
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = '#ffff00';
            this.pipCtx.arc(centerX, centerY, sunApparentSize * 0.9, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else {
            // 偏食
            this.pipCtx.fillText('partial solar eclipse', 10, 30);
            // 绘制偏食效果
            this.pipCtx.globalCompositeOperation = 'destination-out';
            this.pipCtx.beginPath();
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
            this.pipCtx.globalCompositeOperation = 'source-over';
        }
    }

    drawLunarEclipse(LunarEclipseType) {


        /*
        * 这是对日食类型的判定
        * 等待完善绘画
        */
        switch (LunarEclipseType) {
            case 0:     // 月全食
                // To do
                break;
            case 1:     // 月偏食
                // To do
                break;
            case 2:     // 半影月食
                // To do
                break;
            default:
                break;
        }





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
            this.pipCtx.fillText('total lunar eclipse', 10, 30);
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = 'rgba(100, 0, 0, 0.8)'; // 月全食时的红色
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else if (coverage > 0.3) {
            // 偏食
            this.pipCtx.fillText('partial lunar eclipse', 10, 30);
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
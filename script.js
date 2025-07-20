class CelestialSimulator {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pipCanvas = document.getElementById('pipCanvas');
        this.pipCtx = this.pipCanvas.getContext('2d');


        // ģ�����
        this.timeScale = 1;
        this.viewMode = 'top';
        this.earthTexture = 'satellite';
        this.showEclipse = false;
        this.isPaused = false;
        // �������
        this.sun = {
            radius: 50,
            angle: 0,
            rotationSpeed: 0.01
        };
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

        // 3D������ʼ��
        this.init3DScene();

        // ��ʼ��UI�¼�
        this.initEvents();

        // ��ʼ����ѭ��
        this.lastTime = 0;
        this.animate(0);
    }

    // ������Բ����ϵ�λ��
    getEllipticalPosition(semiMajorAxis, eccentricity, angle) {
        // ���������ǣ��ӽ��ص㿪ʼ�ĽǶȣ�
        const trueAnomaly = angle % (Math.PI * 2);

        // ��������
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

        // ���㽹�����
        const focalDistance = semiMajorAxis * eccentricity;

        // ������Բ�ϵ����꣨������Ϊԭ�㣩
        const x = semiMajorAxis * Math.cos(trueAnomaly) - focalDistance;
        const y = -semiMinorAxis * Math.sin(trueAnomaly);

        // ������루���ڿ����յڶ����ɣ�
        const distance = semiMajorAxis * (1 - eccentricity * eccentricity) /
            (1 + eccentricity * Math.cos(trueAnomaly));

        return { x, y, distance };
    }

    // ����������������Բ���
    drawEllipticalOrbit(centerX, centerY, semiMajorAxis, eccentricity) {
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        const focalDistance = semiMajorAxis * eccentricity;

        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.ellipse(
            centerX + focalDistance, // ��Բ����ƫ��
            centerY,
            semiMajorAxis,
            semiMinorAxis,
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();
    }

    init3DScene() {
        // ʹ�õ�������Three.js��������
        this.scene = new THREE.Scene();
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
        this.renderer.domElement.style.display = 'none'; //Ĭ�ϲ���ʾ
        this.canvas.parentNode.insertBefore(this.renderer.domElement, this.canvas.nextSibling);

        // �������������
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        // ����3D����
        this.create3DCelestialBodies();

        // �������λ��
        this.camera.position.set(0, 300, 400);
        this.camera.lookAt(0, 0, 0);
    }

    create3DCelestialBodies() {
        // ̫��
        const sunGeometry = new THREE.SphereGeometry(this.sun.radius, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: false
        });
        this.sun.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun.mesh);

        // ����
        const earthGeometry = new THREE.SphereGeometry(this.earth.radius, 32, 32);
        const earthMaterial = new THREE.MeshBasicMaterial({
            color: 0x3498db,
            wireframe: false
        });
        this.earth.mesh = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth.mesh);

        // ����
        const moonGeometry = new THREE.SphereGeometry(this.moon.radius, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            wireframe: false
        });
        this.moon.mesh = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon.mesh);

        // ���������
        this.createOrbitLines();
    }

    createOrbitLines() {
        // ����������Բ��
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

        // ����������Բ��
        this.moonOrbitContainer = new THREE.Object3D();
        this.earth.mesh.add(this.moonOrbitContainer); // �����������ӵ�����

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
        this.moonOrbitContainer.add(this.moon.orbitLine); // ���������ӵ�����

    }

    initEvents() {
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            // �л���ͼʱ��ʾ/����3D��Ⱦ��
            if (this.viewMode === '3d') {
                this.renderer.domElement.style.display = 'block';
                this.canvas.style.display = 'none';
            } else {
                this.renderer.domElement.style.display = 'none';
                this.canvas.style.display = 'block';
            }
        });
        // �ٶ�
        document.getElementById('timeSpeed').addEventListener('input', (e) => {
            this.timeScale = parseInt(e.target.value);
        });
        // Ƥ��
        document.getElementById('earthTexture').addEventListener('change', (e) => {
            this.earthTexture = e.target.value;
        });
        // ���л�
        document.getElementById('toggleEclipse').addEventListener('click', () => {
            this.showEclipse = !this.showEclipse;
            document.getElementById('pipContainer').style.display =
                this.showEclipse ? 'block' : 'none';
        });
        //��ͣ��ť
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
            return; // ��ͣ
        }

        // ����ʱ������
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // ��������λ�ú���ת�Ƕ�
        this.updateCelestialBodies(deltaTime);

        // ������ͼģʽ��Ⱦ
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

        // ��ʾ��/��ʳ
        if (this.showEclipse) {
            this.drawEclipseView();
        }

        // ��������ѭ��
        requestAnimationFrame((t) => this.animate(t));
    }

    updateCelestialBodies(deltaTime) {
        // ������ת�Ƕ�
        const timeFactor = deltaTime * this.timeScale * 0.01;

        this.sun.angle += this.sun.rotationSpeed * timeFactor;
        this.earth.angle += this.earth.rotationSpeed * timeFactor;
        this.earth.orbitAngle = (this.earth.orbitAngle || 0) + this.earth.orbitSpeed * timeFactor;
        this.earth.orbitAngle = this.earth.orbitAngle % (Math.PI * 2);
        this.moon.angle += this.moon.rotationSpeed * timeFactor;
        this.moon.orbitAngle = (this.moon.orbitAngle || 0) + this.moon.orbitSpeed * timeFactor;
        this.moon.orbitAngle = this.moon.orbitAngle % (Math.PI * 2);
    }

    update3DScene() {
        // ����̫����ת
        this.sun.mesh.rotation.y = this.sun.angle;

        // ���µ���λ�ú���ת
        const earthPos = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        this.earth.mesh.position.set(earthPos.x, 0, earthPos.y);
        this.earth.mesh.rotation.y = this.earth.angle;

        // ���ݿ����յڶ����ɵ��������ٶ�
        const earthSpeedFactor = 1 / (earthPos.distance * earthPos.distance);

        // ��������λ�ú���ת
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

        // ���ݿ����յڶ����ɵ��������ٶ�
        const moonSpeedFactor = 1 / (moonRelativePos.distance * moonRelativePos.distance);

        // ���¹���Ƕȣ����ǿ����յڶ�����
        this.earth.orbitAngle += this.earth.orbitSpeed * earthSpeedFactor;

        this.moon.orbitAngle += this.moon.orbitSpeed * moonSpeedFactor;

    }

    drawTopView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // ����̫��
        this.drawSun(centerX, centerY);

        // ���Ƶ���������Բ��
        this.drawEllipticalOrbit(
            centerX,
            centerY,
            this.earth.semiMajorAxis,
            this.earth.eccentricity
        );

        // �������λ��
        const earthPos = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        const earthX = centerX + earthPos.x;
        const earthY = centerY + earthPos.y;

        // ���Ƶ���
        this.drawEarth(earthX, earthY);

        // ��������������Բ��
        this.drawEllipticalOrbit(
            earthX,
            earthY,
            this.moon.semiMajorAxis,
            this.moon.eccentricity
        );

        // ��������λ��
        const moonPos = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        const moonX = earthX + moonPos.x;
        const moonY = earthY + moonPos.y;

        // ��������
        this.drawMoon(moonX, moonY);
    }

    drawSideView() {
        // ̫��λ��
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // ����̫�����̶������ģ�
        this.drawSun(centerX, centerY);
        // �������λ��
        const earthPos = this.getEllipticalPosition(
            this.earth.semiMajorAxis,
            this.earth.eccentricity,
            this.earth.orbitAngle
        );
        const earthX = centerX + earthPos.x;
        const earthY = centerY;

        // ��������λ��
        const moonPos = this.getEllipticalPosition(
            this.moon.semiMajorAxis,
            this.moon.eccentricity,
            this.moon.orbitAngle
        );
        const moonX = earthX + moonPos.x;
        const moonY = earthY;

        // ���Ƶ�����
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.moveTo(centerX - this.earth.distance, centerY);
        this.ctx.lineTo(centerX + this.earth.distance, centerY);
        this.ctx.stroke();

        //�ڵ��жϣ���������̫������,��Խ�(0,pi)�������ڵ������
        if (this.earth.orbitAngle >= 0 && this.earth.orbitAngle <= Math.PI) {
            if (this.moon.orbitAngle >= 0 && this.moon.orbitAngle <= Math.PI) {
                //��������
                this.drawMoon(moonX, moonY);
                //���Ƶ���
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

        // ����������
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
        // �������
        this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // ���ú�ɫ����
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.fillRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // ����Ƿ�����/��ʳ
        const isSolarEclipse = this.checkSolarEclipse();
        const isLunarEclipse = this.checkLunarEclipse();

        if (isSolarEclipse) {
            this.drawSolarEclipse();
        } else if (isLunarEclipse) {
            this.drawLunarEclipse();
        } else {
            // û������ʳʱ��ʾ��ʾ��Ϣ
            this.pipCtx.fillStyle = '#ffffff';
            this.pipCtx.font = '16px Arial';
            this.pipCtx.fillText('no eclipse phenominon', 80, 150);
        }
    }
    // �򵥻��ƣ���ʱ���ò�ͬ��С����ɫ������棬�������԰���д��ɾ����չ
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

    checkSolarEclipse() {
        // �������̫���ľ���
        const earthPos = this.earth.mesh.position.clone();
        const sunPos = this.sun.mesh.position.clone();
        const distance = earthPos.distanceTo(sunPos);

        // �������򵽵���ľ���
        const moonPos = this.moon.mesh.position.clone();
        const moonEarthDistance = moonPos.distanceTo(earthPos);

        // ������������Ķ���̶�
        const alignment = moonPos.clone().sub(earthPos).normalize()
            .dot(sunPos.clone().sub(earthPos).normalize());

        // �����µؽ�����һ��ֱ����(alignment�ӽ�1)������������ʱ������ʳ
        return alignment > 0.995 && moonEarthDistance < 60;
    }

    checkLunarEclipse() {
        // �������̫���ľ���
        const earthPos = this.earth.mesh.position.clone();
        const sunPos = this.sun.mesh.position.clone();

        // �������򵽵���ľ���
        const moonPos = this.moon.mesh.position.clone();
        const moonEarthDistance = moonPos.distanceTo(earthPos);

        // ������������Ķ���̶�
        const alignment = moonPos.clone().sub(earthPos).normalize()
            .dot(sunPos.clone().sub(earthPos).normalize());

        // �����µؽ�����һ��ֱ����(alignment�ӽ�-1)ʱ������ʳ
        return alignment < -0.995;
    }

    drawSolarEclipse() {
        const centerX = this.pipCanvas.width / 2;
        const centerY = this.pipCanvas.height / 2;

        // �����������ֱ����̫������ֱ������
        const moonDistance = this.moon.mesh.position.distanceTo(this.earth.mesh.position);
        const sunDistance = this.sun.mesh.position.distanceTo(this.earth.mesh.position);
        const moonApparentSize = (this.moon.radius / moonDistance) * 500;
        const sunApparentSize = (this.sun.radius / sunDistance) * 500;

        // ����̫��
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#ffff00';
        this.pipCtx.arc(centerX, centerY, sunApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();

        // ����������Ӱ
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#000000';
        this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();

        // ������ֱ�������ж���ʳ����
        const sizeRatio = moonApparentSize / sunApparentSize;

        // �����ʳ��������˵��
        this.pipCtx.fillStyle = '#ffffff';
        this.pipCtx.font = '16px Arial';

        if (sizeRatio > 1.05) {
            // ȫʳ
            this.pipCtx.fillText('��ȫʳ', 10, 30);
        } else if (sizeRatio > 0.95) {
            // ��ʳ
            this.pipCtx.fillText('�ջ�ʳ', 10, 30);
            // ���ƻ�ʳЧ��
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = '#ffff00';
            this.pipCtx.arc(centerX, centerY, sunApparentSize * 0.9, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else {
            // ƫʳ
            this.pipCtx.fillText('��ƫʳ', 10, 30);
            // ����ƫʳЧ��
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

        // ���������Ӵ�С
        const moonDistance = this.moon.mesh.position.distanceTo(this.earth.mesh.position);
        const moonApparentSize = (this.moon.radius / moonDistance) * 500;

        // ��������
        this.pipCtx.beginPath();
        this.pipCtx.fillStyle = '#cccccc';
        this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
        this.pipCtx.fill();

        // ���������Ӱ��С
        const earthShadowSize = moonApparentSize * 2.5; // ������Ӱ��Լ�������2.5��

        // ���Ƶ�����Ӱ
        this.pipCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, earthShadowSize, 0, Math.PI * 2);
        this.pipCtx.fill();

        // ������Ӱ���ǳ̶�
        const alignment = this.moon.mesh.position.clone().sub(this.earth.mesh.position).normalize()
            .dot(this.sun.mesh.position.clone().sub(this.earth.mesh.position).normalize());
        const coverage = Math.abs(alignment + 1) / 0.01; // 0-1��ʾ���ǳ̶�

        // �����ʳ��������˵��
        this.pipCtx.fillStyle = '#ffffff';
        this.pipCtx.font = '16px Arial';

        if (coverage > 0.95) {
            // ȫʳ
            this.pipCtx.fillText('��ȫʳ', 10, 30);
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = 'rgba(100, 0, 0, 0.8)'; // ��ȫʳʱ�ĺ�ɫ
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
        } else if (coverage > 0.3) {
            // ƫʳ
            this.pipCtx.fillText('��ƫʳ', 10, 30);
            // ����ƫʳЧ��
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
            // ��Ӱ��ʳ
            this.pipCtx.fillText('��Ӱ��ʳ', 10, 30);
            this.pipCtx.beginPath();
            this.pipCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.pipCtx.arc(centerX, centerY, moonApparentSize, 0, Math.PI * 2);
            this.pipCtx.fill();
        }
    }
}

// ҳ�������ɺ��ʼ��ģ����
window.onload = function () {
    new CelestialSimulator();
};
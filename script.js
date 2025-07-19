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

        // �������
        this.sun = { radius: 50, angle: 0, rotationSpeed: 0.01 };
        this.earth = {
            radius: 20,
            angle: 0,
            distance: 200,
            rotationSpeed: 0.02,
            orbitSpeed: 0.005
        };
        this.moon = {
            radius: 8,
            angle: 0,
            distance: 50,
            rotationSpeed: 0.03,
            orbitSpeed: 0.03
        };

        // 3D������ʼ��
        this.init3DScene();

        // ��ʼ��UI�¼�
        this.initEvents();

        // ��ʼ����ѭ��
        this.lastTime = 0;
        this.animate(0);
    }

    init3DScene() {
        //ʹ�õ�������Three.js��������
        this.scene = new THREE.Scene();//ȷ�������߱���canvasһ��
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.width / this.canvas.height,
            0.1,
            1000);
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true//����ݣ�3D��Ⱦ��ƽ��
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);

        this.renderer.domElement.style.display = 'none'; // Ĭ������
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

    //��ά��ͼ��������
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
        // ������
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

        // ������
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
            // �л���ͼʱ��ʾ
            if (this.viewMode === '3d') {
                this.renderer.domElement.style.display = 'block';
                this.canvas.style.display = 'none';
            } else {
                this.renderer.domElement.style.display = 'none';
                this.canvas.style.display = 'block';
            }
        });
        //�ٶ�
        document.getElementById('timeSpeed').addEventListener('input', (e) => {
            this.timeScale = parseInt(e.target.value);
        });
        //Ƥ��
        document.getElementById('earthTexture').addEventListener('change', (e) => {
            this.earthTexture = e.target.value;
        });
        //���л�
        document.getElementById('toggleEclipse').addEventListener('click', () => {
            this.showEclipse = !this.showEclipse;
            document.getElementById('pipContainer').style.display =
                this.showEclipse ? 'block' : 'none';
        });
    }

    animate(timestamp) {
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

        // ���µ���λ��(x,y,z)����ת
        this.earth.mesh.position.set(
            Math.cos(this.earth.orbitAngle) * this.earth.distance,
            0,
            -Math.sin(this.earth.orbitAngle) * this.earth.distance
        );
        this.earth.mesh.rotation.y = this.earth.angle;

        // ��������λ��(x,y,z)����ת 
        this.moon.mesh.position.set(
            this.earth.mesh.position.x + Math.cos(this.moon.orbitAngle) * this.moon.distance,
            0,
            this.earth.mesh.position.z - Math.sin(this.moon.orbitAngle) * this.moon.distance
        );
        this.moon.mesh.rotation.y = this.moon.angle;
    }

    drawTopView() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // ����̫��
        this.drawSun(centerX, centerY);

        // ���Ƶ�����
        this.drawOrbit(centerX, centerY, this.earth.distance);

        // �������λ��
        const earthX = centerX + Math.cos(this.earth.orbitAngle) * this.earth.distance;
        const earthY = centerY - Math.sin(this.earth.orbitAngle) * this.earth.distance;

        // ���Ƶ���
        this.drawEarth(earthX, earthY);

        // ����������
        this.drawOrbit(earthX, earthY, this.moon.distance);

        // ��������λ��
        const moonX = earthX + Math.cos(this.moon.orbitAngle) * this.moon.distance;
        const moonY = earthY - Math.sin(this.moon.orbitAngle) * this.moon.distance;

        // ��������
        this.drawMoon(moonX, moonY);
    }

    drawSideView() {
        //̫��λ��
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // �������λ�� 
        const earthX = centerX + Math.cos(this.earth.orbitAngle) * this.earth.distance;
        const earthY = centerY;

        // ��������λ�� 
        const moonX = earthX + Math.cos(this.moon.orbitAngle) * this.moon.distance;
        const moonY = earthY - Math.sin(this.moon.orbitAngle) * this.moon.distance * 0.3; // Y��ѹ��

        // ���Ƶ����� 
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.moveTo(centerX - this.earth.distance, centerY);
        this.ctx.lineTo(centerX + this.earth.distance, centerY);
        this.ctx.stroke();


        //�ڵ��жϣ����Ʋ��
        if (this.earth.orbitAngle >= 0 && this.earth.orbitAngle <= Math.PI) {
            if (this.moon.orbitAngle >= 0 && this.moon.orbitAngle <= Math.PI) {
                // ��������
                this.drawMoon(moonX, moonY);
                // ���Ƶ���
                this.drawEarth(earthX, earthY);
            }
            else {
                this.drawEarth(earthX, earthY);
                this.drawMoon(moonX, moonY);
            }
            // ����̫��
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
            earthX, earthY,
            this.moon.distance, this.moon.distance * 0.3, // ��Բ�����Y��ѹ��
            0, 0, Math.PI * 2
        );
        this.ctx.stroke();




    }

    drawEclipseView() {
        // �������
        this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // ����Ƿ�����/��ʳ
        const isSolarEclipse = this.checkSolarEclipse();
        const isLunarEclipse = this.checkLunarEclipse();

        if (isSolarEclipse) {
            this.drawSolarEclipse();
        } else if (isLunarEclipse) {
            this.drawLunarEclipse();
        }
    }
    //�򵥻��ƣ���ʱ���ò�ͬ��С����ɫ������棬�������԰���д��ɾ����չ
    drawSun(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#ff0000ff';
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
        this.ctx.fillStyle = '#ffffffff';
        this.ctx.arc(x, y, this.moon.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawOrbit(centerX, centerY, radius) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    checkSolarEclipse() {
        // ̫����ԭ�㣨�Ƕ�0�����ж������Ƿ��ڵ����̫��֮�䣨���߽��ƹ��ߣ�
        const angleDiff = Math.abs(this.moon.orbitAngle - this.earth.orbitAngle - Math.PI);
        // ��ֵ��Ϊ0.1���ȣ�Լ5.7�ȣ����ɸ�����Ҫ����
        return angleDiff < 0.5;
    }

    checkLunarEclipse() {
        // ��ʳʱ��������̫��������֮�䣨������̫�������෴���ǶȲ�У�
        const angleDiff = Math.abs(this.moon.orbitAngle - this.earth.orbitAngle);
        return angleDiff < 0.5;
    }

    drawSolarEclipse() {
        // �ڻ��л�����������ȫʳЧ��
        const centerX = this.pipCanvas.width / 2;
        const centerY = this.pipCanvas.height / 2;
        // ̫������
        this.pipCtx.fillStyle = '#ffff00';
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        this.pipCtx.fill();
        // �����ڵ�
        this.pipCtx.fillStyle = '#000';
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.pipCtx.fill();
    }

    drawLunarEclipse() {
        // �ڻ��л�����������ȫʳЧ��
        const centerX = this.pipCanvas.width / 2;
        const centerY = this.pipCanvas.height / 2;
        // ���򣨱�������Ӱ�ڵ���
        this.pipCtx.fillStyle = '#333';
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.pipCtx.fill();
        // ��Ե��⣨��ʳ������
        this.pipCtx.strokeStyle = '#210202ff';
        this.pipCtx.lineWidth = 3;
        this.pipCtx.beginPath();
        this.pipCtx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.pipCtx.stroke();
    }
}

// ҳ�������ɺ��ʼ��ģ����
window.onload = function () {
    new CelestialSimulator();
};
/**
 * AI 性别检测
 * 引擎: face-api.js (SSD MobileNet v1 + 68点Landmark + AgeGenderNet)
 */

const FACE_API_CDN = [
    "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js",
    "https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js",
];
const WEIGHTS_CDN = [
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights",
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/0.22.2/weights",
];

class GenderDetector {
    constructor() {
        this.originalImage = null;
        this.maxCanvasSize = 640;
        this.modelsReady = false;

        this.els = {};
        const ids = [
            'statusBar','statusDot','statusText','uploadCard','uploadArea','fileInput',
            'previewCard','previewCanvas','resultsArea','resultCanvas','detectionInfo',
            'faceCards','summaryCard','statsGrid','overlay','overlayText','progressFill',
            'btnAlbum','btnCamera','btnReselect','btnDetect',
        ];
        for (const id of ids) this.els[id] = document.getElementById(id);

        this.bindEvents();
        this.loadModels();
    }

    bindEvents() {
        this.els.uploadArea.addEventListener('click', () => this.openAlbum());
        this.els.btnAlbum.addEventListener('click', () => this.openAlbum());
        this.els.btnCamera.addEventListener('click', () => this.openCamera());
        this.els.btnReselect.addEventListener('click', () => this.reset());
        this.els.btnDetect.addEventListener('click', () => this.runDetection());
        this.els.fileInput.addEventListener('change', (e) => this.onFileSelected(e));
    }

    openAlbum() { this.els.fileInput.removeAttribute('capture'); this.els.fileInput.click(); }
    openCamera() { this.els.fileInput.setAttribute('capture', 'environment'); this.els.fileInput.click(); }

    setStatus(type, text) {
        this.els.statusDot.className = 'status-dot' + (type !== 'loading' ? ` ${type}` : '');
        this.els.statusText.textContent = text;
    }

    showOverlay(text, progress) {
        this.els.overlay.style.display = 'flex';
        this.els.overlayText.textContent = text;
        this.els.progressFill.style.width = (progress || 0) + '%';
    }
    hideOverlay() { this.els.overlay.style.display = 'none'; }

    /* ===================== Model Loading ===================== */

    async loadModels() {
        this.setStatus('loading', '正在加载 face-api.js ...');
        let loaded = false;
        for (const url of FACE_API_CDN) {
            try { await this.loadScript(url); loaded = true; break; }
            catch (_) { console.warn('CDN failed:', url); }
        }
        if (!loaded) { this.setStatus('error', 'face-api.js 加载失败'); this.enableRetry(); return; }

        for (const url of WEIGHTS_CDN) {
            try {
                this.setStatus('loading', '正在加载人脸检测模型(SSD)...');
                await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
                this.setStatus('loading', '正在加载特征点模型...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(url);
                this.setStatus('loading', '正在加载性别年龄模型...');
                await faceapi.nets.ageGenderNet.loadFromUri(url);
                this.modelsReady = true;
                this.setStatus('ready', '模型就绪，请上传人脸照片');
                this.syncDetectButton();
                return;
            } catch (err) { console.warn('Weights failed:', url, err.message); }
        }
        this.setStatus('error', '模型加载失败，请检查网络');
        this.enableRetry();
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (window.faceapi) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src; s.onload = resolve;
            s.onerror = () => reject(new Error('Failed: ' + src));
            document.head.appendChild(s);
        });
    }

    enableRetry() {
        this.els.statusBar.style.cursor = 'pointer';
        this.els.statusText.textContent += '（点击重试）';
        const retry = () => {
            this.els.statusBar.style.cursor = '';
            this.els.statusBar.removeEventListener('click', retry);
            this.loadModels();
        };
        this.els.statusBar.addEventListener('click', retry);
    }

    syncDetectButton() {
        if (this.originalImage && this.els.previewCard.style.display !== 'none')
            this.els.btnDetect.disabled = false;
    }

    /* ===================== File Handling ===================== */

    onFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => { this.originalImage = img; this.showPreview(img); };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        this.els.fileInput.value = '';
    }

    showPreview(img) {
        const { w, h } = this.fitSize(img.width, img.height);
        const c = this.els.previewCanvas;
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        this.els.uploadCard.style.display = 'none';
        this.els.previewCard.style.display = '';
        this.els.resultsArea.style.display = 'none';
        if (this.modelsReady) this.els.btnDetect.disabled = false;
        else { this.els.btnDetect.disabled = true; this.waitForModels(); }
    }

    async waitForModels() {
        const btn = this.els.btnDetect;
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 模型加载中...';
        while (!this.modelsReady) {
            await this.sleep(400);
            if (this.els.previewCard.style.display === 'none') return;
        }
        btn.innerHTML = orig;
        btn.disabled = false;
    }

    reset() {
        this.originalImage = null;
        this.els.uploadCard.style.display = '';
        this.els.previewCard.style.display = 'none';
        this.els.resultsArea.style.display = 'none';
        this.els.faceCards.innerHTML = '';
    }

    fitSize(origW, origH) {
        const max = this.maxCanvasSize;
        let w = origW, h = origH;
        if (w > max) { h = h * max / w; w = max; }
        if (h > max) { w = w * max / h; h = max; }
        return { w: Math.round(w), h: Math.round(h) };
    }

    /* ===================== Classification ===================== */

    classify(det) {
        const age = Math.round(det.age);
        const isMale = det.gender === 'male';
        if (age < 12) return { cat: 'child', label: '儿童', color: '#10b981', css: 'child', icon: 'child', age };
        if (isMale) return { cat: 'male', label: '男性', color: '#3b82f6', css: 'male', icon: 'male', age };
        return { cat: 'female', label: '女性', color: '#ec4899', css: 'female', icon: 'female', age };
    }

    /* ===================== Detection ===================== */

    async runDetection() {
        if (!this.modelsReady || !this.originalImage) return;
        const t0 = performance.now();
        this.showOverlay('人脸检测中...', 15);

        try {
            const img = this.originalImage;
            const { w, h } = this.fitSize(img.width, img.height);

            const srcCanvas = document.createElement('canvas');
            srcCanvas.width = w; srcCanvas.height = h;
            srcCanvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h);

            this.showOverlay('性别年龄预测中...', 40);

            const detections = await faceapi
                .detectAllFaces(srcCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
                .withFaceLandmarks()
                .withAgeAndGender();

            const inferenceMs = Math.round(performance.now() - t0);

            this.showOverlay('绘制结果...', 80);
            await this.sleep(10);

            this.drawResults(srcCanvas, detections, w, h, inferenceMs);
            this.buildFaceCards(srcCanvas, detections, w, h);
            this.buildSummary(detections, inferenceMs);

            this.els.resultsArea.style.display = '';
            this.hideOverlay();
            this.els.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error('Detection error:', err);
            this.hideOverlay();
            alert('检测失败: ' + err.message);
        }
    }

    /* ===================== Draw ===================== */

    drawResults(srcCanvas, detections, w, h, inferenceMs) {
        const canvas = this.els.resultCanvas;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(srcCanvas, 0, 0);

        if (detections.length === 0) {
            this.els.detectionInfo.innerHTML =
                '<span class="tag tag-warning">提示</span> 未检测到人脸，请尝试更清晰的正面人像';
            this.els.faceCards.innerHTML = '';
            this.els.summaryCard.style.display = 'none';
            return;
        }

        for (let i = 0; i < detections.length; i++) {
            const det = detections[i];
            const box = det.detection.box;
            const cl = this.classify(det);
            const color = cl.color;
            const conf = (det.genderProbability * 100).toFixed(1);

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.setLineDash([]);
            this.drawCorners(ctx, box.x, box.y, box.width, box.height,
                Math.min(18, box.width * 0.12, box.height * 0.12), color);

            if (det.landmarks) {
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.6;
                const pts = det.landmarks.positions;
                for (let j = 0; j < pts.length; j++) {
                    ctx.fillRect(pts[j].x - 1, pts[j].y - 1, 2.5, 2.5);
                }
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                const regions = [
                    det.landmarks.getJawOutline(), det.landmarks.getLeftEyeBrow(),
                    det.landmarks.getRightEyeBrow(), det.landmarks.getNose(),
                    det.landmarks.getLeftEye(), det.landmarks.getRightEye(),
                    det.landmarks.getMouth(),
                ];
                for (const rg of regions) {
                    ctx.beginPath();
                    for (let k = 0; k < rg.length; k++)
                        k === 0 ? ctx.moveTo(rg[k].x, rg[k].y) : ctx.lineTo(rg[k].x, rg[k].y);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            const shortLabel = cl.cat === 'child' ? '童' : (cl.cat === 'male' ? '男' : '女');
            const label = `#${i + 1} ${shortLabel} ${conf}%  ~${cl.age}岁`;
            ctx.font = 'bold 13px -apple-system, sans-serif';
            const tw = ctx.measureText(label).width + 14;
            const lh = 24;
            const ly = box.y > lh + 6 ? box.y - lh - 3 : box.y + box.height + 3;
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(box.x, ly, tw, lh, 5);
            else ctx.rect(box.x, ly, tw, lh);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(label, box.x + 7, ly + 17);
        }

        let info = `<span class="tag tag-info">SSD MobileNet</span> <b>${detections.length}</b> 张人脸 · <b>${inferenceMs}ms</b><br>`;
        for (let i = 0; i < detections.length; i++) {
            const d = detections[i];
            const cl = this.classify(d);
            const tagClass = cl.cat === 'child' ? 'tag-success' : (cl.cat === 'male' ? 'tag-male' : 'tag-female');
            info += `<span class="tag ${tagClass}">#${i + 1} ${cl.label}</span> ` +
                `${(d.genderProbability * 100).toFixed(1)}% · ~${cl.age}岁 · ` +
                `${Math.round(d.detection.box.width)}×${Math.round(d.detection.box.height)}px<br>`;
        }
        info += `<span class="tag tag-info">引擎</span> SSD MobileNet → 68点Landmark → AgeGenderNet · &lt;12岁归为儿童`;
        this.els.detectionInfo.innerHTML = info;
    }

    drawCorners(ctx, x, y, w, h, len, color) {
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
        ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
        ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
        ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
        ctx.stroke();
    }

    /* ===================== Face Cards ===================== */

    buildFaceCards(srcCanvas, detections, w, h) {
        const container = this.els.faceCards;
        container.innerHTML = '';
        if (detections.length === 0) return;

        const frag = document.createDocumentFragment();

        const ICONS = {
            male: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="10" cy="14" r="7"/><path d="M17 7l4-4M21 3h-5M21 3v5"/></svg>',
            female: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="10" r="7"/><line x1="12" y1="17" x2="12" y2="23"/><line x1="9" y1="20" x2="15" y2="20"/></svg>',
            child: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="5"/><path d="M5 21c0-3.87 3.13-7 7-7s7 3.13 7 7"/><path d="M9 5.5c-.5-1.5.5-3 2-3M15 5.5c.5-1.5-.5-3-2-3"/></svg>',
        };

        for (let i = 0; i < detections.length; i++) {
            const det = detections[i];
            const box = det.detection.box;
            const cl = this.classify(det);
            const isMale = det.gender === 'male';
            const conf = (det.genderProbability * 100).toFixed(1);
            const oConf = ((1 - det.genderProbability) * 100).toFixed(1);
            const rawGender = isMale ? '男性' : '女性';
            const rawOther = isMale ? '女性' : '男性';

            const pad = Math.max(box.width, box.height) * 0.25;
            const cx = Math.max(0, Math.round(box.x - pad));
            const cy = Math.max(0, Math.round(box.y - pad));
            const cw = Math.min(w - cx, Math.round(box.width + pad * 2));
            const ch = Math.min(h - cy, Math.round(box.height + pad * 2));
            const side = Math.max(cw, ch);
            const ox = cx - (side - cw) / 2, oy = cy - (side - ch) / 2;

            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 80; thumbCanvas.height = 80;
            thumbCanvas.getContext('2d').drawImage(srcCanvas, ox, oy, side, side, 0, 0, 80, 80);

            const card = document.createElement('div');
            card.className = `face-card ${cl.css}`;
            card.innerHTML =
                `<div class="face-card-header">` +
                    `<div class="face-avatar"><canvas></canvas></div>` +
                    `<div class="face-meta"><h4>人脸 #${i + 1}</h4>` +
                    `<p>68点 · ${Math.round(box.width)}×${Math.round(box.height)}px · ${(det.detection.score * 100).toFixed(0)}%</p></div>` +
                    `<span class="gender-badge ${cl.css}">${ICONS[cl.icon]}${cl.label}</span>` +
                `</div>` +
                `<div class="detail-grid">` +
                    `<div class="detail-item"><div class="detail-label">分类</div><div class="detail-value ${cl.css}">${cl.label}</div></div>` +
                    `<div class="detail-item"><div class="detail-label">年龄</div><div class="detail-value age">~${cl.age}岁</div></div>` +
                    `<div class="detail-item"><div class="detail-label">${rawGender}概率</div><div class="detail-value ${isMale ? 'male' : 'female'}">${conf}%</div></div>` +
                    `<div class="detail-item"><div class="detail-label">${rawOther}概率</div><div class="detail-value" style="color:var(--text-3)">${oConf}%</div></div>` +
                `</div>` +
                `<div class="confidence-bar">` +
                    `<div class="confidence-bar-label"><span>${cl.label}置信度</span><span>${conf}%</span></div>` +
                    `<div class="confidence-track"><div class="confidence-fill ${cl.css}" style="width:${conf}%"></div></div>` +
                `</div>`;

            frag.appendChild(card);

            const avatar = card.querySelector('.face-avatar canvas');
            avatar.width = 80; avatar.height = 80;
            avatar.getContext('2d').drawImage(thumbCanvas, 0, 0);
        }

        container.appendChild(frag);
    }

    /* ===================== Summary ===================== */

    buildSummary(detections, inferenceMs) {
        if (detections.length === 0) { this.els.summaryCard.style.display = 'none'; return; }
        const total = detections.length;
        const classified = detections.map(d => this.classify(d));
        const children = classified.filter(c => c.cat === 'child').length;
        const males = classified.filter(c => c.cat === 'male').length;
        const females = classified.filter(c => c.cat === 'female').length;
        this.els.summaryCard.style.display = '';
        this.els.statsGrid.innerHTML =
            `<div class="stat-item purple"><div class="stat-value">${total}</div><div class="stat-label">人脸数</div></div>` +
            `<div class="stat-item blue"><div class="stat-value">${males}</div><div class="stat-label">男性</div></div>` +
            `<div class="stat-item pink"><div class="stat-value">${females}</div><div class="stat-label">女性</div></div>` +
            `<div class="stat-item green"><div class="stat-value">${children}</div><div class="stat-label">儿童(&lt;12)</div></div>`;
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
        this.closePath();
        return this;
    };
}

document.addEventListener('DOMContentLoaded', () => { new GenderDetector(); });

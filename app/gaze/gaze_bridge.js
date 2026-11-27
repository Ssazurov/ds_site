// Мост MediaPipe Face Landmarker (WASM, CPU) -> признаки взгляда для Flutter.
// Камера запрашивается ТОЛЬКО в start(); stop() останавливает треки и закрывает модель.
// Всё лежит локально в web/gaze (офлайн). Признаки: [uR,vR,uL,vL,hx,hy,s,yaw,pitch].
(function () {
  const BASE = new URL('gaze/', document.baseURI).href;
  let gen = 0, lm = null, stream = null, video = null, cb = null, lastT = 0;

  function cleanup() {
    try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    stream = null;
    if (video) {
      try { video.pause(); video.srcObject = null; video.remove(); } catch (e) {}
      video = null;
    }
    try { if (lm) lm.close(); } catch (e) {}
    lm = null;
    cb = null;
  }

  // Положение радужки относительно уголков и век глаза (в долях длины глаза).
  function eye(P, iris, outer, inner, up, lo) {
    const A = P[outer], B = P[inner], I = P[iris];
    const ex = B.x - A.x, ey = B.y - A.y;
    const L = Math.hypot(ex, ey) || 1;
    const nx = -ey / L, ny = ex / L;
    const u = ((I.x - A.x) * ex + (I.y - A.y) * ey) / (L * L);
    const mx = (P[up].x + P[lo].x) / 2, my = (P[up].y + P[lo].y) / 2;
    const v = ((I.x - mx) * nx + (I.y - my) * ny) / L;
    const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
    const vc = ((I.x - cx) * nx + (I.y - cy) * ny) / L; // относительно уголков, не век
    const open = Math.hypot(P[up].x - P[lo].x, P[up].y - P[lo].y) / L;
    return { u, v, vc, open };
  }

  function features(res) {
    const f = res && res.faceLandmarks && res.faceLandmarks[0];
    if (!f || f.length < 478) return null;
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    const P = f.map((p) => ({ x: p.x * vw, y: p.y * vh }));
    const r = eye(P, 468, 33, 133, 159, 145);
    const l = eye(P, 473, 362, 263, 386, 374); // оси обоих глаз слева→направо в кадре (иначе u,v левого глаза зеркальны и гасят правый)
    if ((r.open + l.open) / 2 < 0.12) return null; // моргание
    const faceW = Math.hypot(P[454].x - P[234].x, P[454].y - P[234].y) || 1;
    const faceH = Math.hypot(P[152].x - P[10].x, P[152].y - P[10].y) || 1;
    const nose = P[1];
    const yaw = (nose.x - (P[234].x + P[454].x) / 2) / faceW;
    const pitch = (nose.y - (P[10].y + P[152].y) / 2) / faceH;
    return new Float64Array([r.u, r.vc, l.u, l.vc, nose.x / vw - 0.5, nose.y / vh - 0.5, faceW / vw, yaw, pitch, r.open, l.open, r.v, l.v]);
  }

  function loop(my) {
    const step = (now) => {
      if (my !== gen || !video) return;
      if (video.readyState >= 2 && now - lastT >= 33) {
        lastT = now;
        let out = null;
        try { out = features(lm.detectForVideo(video, performance.now())); } catch (e) {}
        try { cb && cb(out); } catch (e) {}
      }
      schedule();
    };
    const schedule = () => (video && video.requestVideoFrameCallback
      ? video.requestVideoFrameCallback(step)
      : requestAnimationFrame(step));
    schedule();
  }

  // Возвращает '' при успехе, иначе 'вид:сообщение' (denied|noCamera|unsupported|load|cancel).
  async function start(onFrame) {
    const my = ++gen;
    cleanup();
    cb = onFrame;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'unsupported:getUserMedia недоступен (нужен https или localhost)';
      }
      const m = await import(BASE + 'vision_bundle.mjs'); // модель — до запроса камеры
      const fs = await m.FilesetResolver.forVisionTasks(BASE + 'wasm');
      const mk = (delegate) => m.FaceLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      let landmarker;
      try { landmarker = await mk('GPU'); } catch (e) { landmarker = await mk('CPU'); } // GPU быстрее, иначе CPU
      if (my !== gen) { landmarker.close(); return 'cancel:'; }
      lm = landmarker;
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
      if (my !== gen) { s.getTracks().forEach((t) => t.stop()); return 'cancel:'; }
      stream = s;
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none';
      video.srcObject = s;
      document.body.appendChild(video);
      await video.play();
      if (my !== gen) return 'cancel:';
      loop(my);
      return '';
    } catch (e) {
      if (my === gen) cleanup();
      const n = e && e.name;
      const kind = n === 'NotAllowedError' || n === 'SecurityError' ? 'denied'
        : n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'NotReadableError' ? 'noCamera'
        : 'load';
      return kind + ':' + ((e && e.message) || String(e));
    }
  }

  async function stop() {
    gen++;
    cleanup();
    return '';
  }

  window.dsGaze = { start, stop };
})();

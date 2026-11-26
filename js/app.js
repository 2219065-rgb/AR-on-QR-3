(function () {
  "use strict";

  const CASES_DATA_URL = "./data/cases.json";
  const DEFAULT_CASE_ID = "demo-01";

  const els = {
    landingScreen: document.getElementById("landing-screen"),
    caseBadge: document.getElementById("case-badge"),
    caseTitle: document.getElementById("case-title"),
    caseSubtitle: document.getElementById("case-subtitle"),
    statusBox: document.getElementById("status-box"),
    btnStartAr: document.getElementById("btn-start-ar"),
    btnPreviewMode: document.getElementById("btn-preview-mode"),
    arContainer: document.getElementById("ar-container"),
    scanningOverlay: document.getElementById("scanning-overlay"),
    hudTitle: document.getElementById("hud-title"),
    scanInstruction: document.getElementById("scan-instruction"),
    btnExitAr: document.getElementById("btn-exit-ar"),
    arControls: document.getElementById("ar-controls"),
    btnToggleMute: document.getElementById("btn-toggle-mute"),
    btnReplay: document.getElementById("btn-replay"),
    ctaContainer: document.getElementById("cta-container"),
    previewModal: document.getElementById("preview-modal"),
    previewTitle: document.getElementById("preview-title"),
    previewVideo: document.getElementById("preview-video"),
    previewCtaContainer: document.getElementById("preview-cta-container"),
    btnClosePreview: document.getElementById("btn-close-preview"),
  };

  let activeCase = null;
  let arVideoEl = null;

  function showStatus(message, isInfo = false) {
    els.statusBox.textContent = message;
    els.statusBox.classList.toggle("info", isInfo);
    els.statusBox.classList.remove("hidden");
  }

  function hideStatus() {
    els.statusBox.classList.add("hidden");
  }

  function applyTheme(color) {
    if (!color || typeof color !== "string") return;
    document.documentElement.style.setProperty("--accent", color);
  }

  function renderCtaButtons(container, buttons) {
    container.innerHTML = "";
    if (!Array.isArray(buttons) || buttons.length === 0) return;
    buttons.forEach((btn) => {
      if (!btn || !btn.label || !btn.url) return;
      const a = document.createElement("a");
      a.className = "cta-link";
      a.href = btn.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = btn.icon ? `${btn.icon} ${btn.label}` : btn.label;
      container.appendChild(a);
    });
  }

  function getRequestedCaseId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id ? id.trim() : DEFAULT_CASE_ID;
  }

  async function loadCaseConfig() {
    const requestedId = getRequestedCaseId();
    try {
      const response = await fetch(CASES_DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const casesMap = data && data.cases ? data.cases : {};

      if (!casesMap[requestedId]) {
        els.caseTitle.textContent = "لم يتم العثور على هذا الرمز";
        els.caseSubtitle.textContent = `الرمز (${requestedId}) غير مسجّل في ملف cases.json حالياً.`;
        showStatus("تأكد من صحة رابط الـ QR أو جرّب الرابط التجريبي الافتراضي (demo-01).");
        els.btnStartAr.disabled = true;
        els.btnPreviewMode.disabled = true;
        return;
      }

      activeCase = casesMap[requestedId];
      applyTheme(activeCase.themeColor);

      els.caseBadge.textContent = activeCase.badge || `طلب #${requestedId}`;
      els.caseTitle.textContent = activeCase.title || "تجربة الواقع المعزز";
      els.caseSubtitle.textContent =
        activeCase.subtitle || "وجّه الكاميرا نحو تصميم الكفر لمشاهدة الفيديو التفاعلي";
      els.hudTitle.textContent = activeCase.title || "AR Case";

      renderCtaButtons(els.ctaContainer, activeCase.ctaButtons);
      renderCtaButtons(els.previewCtaContainer, activeCase.ctaButtons);

      els.btnStartAr.disabled = false;
      els.btnPreviewMode.disabled = false;

      if (!activeCase.targetMindUrl) {
        showStatus(
          "ملاحظة: لم يتم ربط ملف تتبع (.mind) لهذا الطلب بعد. يمكنك استخدام وضع المعاينة الآن أو توليد ملف .mind من أداة MindAR.",
          true
        );
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("preview") === "1") {
        openPreviewMode();
      }
    } catch (err) {
      els.caseTitle.textContent = "تعذّر تحميل بيانات المنصة";
      els.caseSubtitle.textContent = "تأكد من تشغيل المشروع عبر سيرفر محلي أو GitHub Pages وليس بفتح الملف مباشرة.";
      showStatus(`تفاصيل الخطأ: ${err.message}`);
    }
  }

  async function verifyAssetExists(url) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async function startArExperience() {
    if (!activeCase) return;
    hideStatus();

    if (!window.isSecureContext) {
      showStatus(
        "تشغيل كاميرا الواقع المعزز يتطلب اتصالاً آمناً (HTTPS). ارفع المشروع على GitHub Pages أو افتحه عبر localhost، أو استخدم زر المعاينة بالأسفل."
      );
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showStatus("متصفحك الحالي لا يدعم الوصول للكاميرا. يرجى فتح الرابط عبر Safari (آيفون) أو Chrome (أندرويد).");
      return;
    }

    if (!activeCase.targetMindUrl) {
      showStatus("لا يوجد ملف تتبع (.mind) مرفق لهذا الطلب بعد. راجع دليل README لتوليد targets.mind خلال 10 ثوانٍ.");
      return;
    }

    const targetExists = await verifyAssetExists(activeCase.targetMindUrl);
    if (!targetExists) {
      showStatus(
        `ملف التتبع (${activeCase.targetMindUrl}) غير موجود بعد في المجلد. قم بتحويل صورة الكفر عبر محول MindAR وضعه في المسار نفسه، أو جرّب وضع المعاينة الآن.`
      );
      return;
    }

    els.landingScreen.classList.add("hidden");
    els.arContainer.classList.remove("hidden");
    els.arContainer.setAttribute("aria-hidden", "false");
    els.scanningOverlay.classList.remove("hidden");
    els.scanInstruction.textContent = "جاري تشغيل الكاميرا ومحرك الواقع المعزز...";

    const videoWidth = Number(activeCase.videoWidth) || 1;
    const videoHeight = Number(activeCase.videoHeight) || 1.35;

    els.arContainer.innerHTML = `
      <a-scene
        id="mindar-scene"
        mindar-image="imageTargetSrc: ${activeCase.targetMindUrl}; autoStart: true; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.0001; filterBeta: 0.001;"
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        <a-assets>
          <video
            id="ar-video"
            src="${activeCase.videoUrl}"
            preload="auto"
            loop
            muted
            playsinline
            webkit-playsinline
            crossorigin="anonymous"
          ></video>
        </a-assets>

        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

        <a-entity id="case-target" mindar-image-target="targetIndex: 0">
          <a-video
            src="#ar-video"
            position="0 0 0"
            width="${videoWidth}"
            height="${videoHeight}"
            rotation="0 0 0"
          ></a-video>
        </a-entity>
      </a-scene>
    `;

    const sceneEl = document.getElementById("mindar-scene");
    const targetEl = document.getElementById("case-target");
    arVideoEl = document.getElementById("ar-video");

    // تهيئة الفيديو داخل تفاعل المستخدم لتوافق iOS Safari
    if (arVideoEl) {
      arVideoEl.play().then(() => {
        arVideoEl.pause();
        arVideoEl.currentTime = 0;
      }).catch(() => {});
    }

    sceneEl.addEventListener("arReady", () => {
      els.scanInstruction.textContent = "وجّه الكاميرا نحو تصميم الكفر المطبوع";
    });

    sceneEl.addEventListener("arError", () => {
      stopArExperience();
      showStatus("تعذّر تشغيل الكاميرا. تأكد من منح المتصفح إذن الكاميرا ثم أعد المحاولة.");
    });

    targetEl.addEventListener("targetFound", () => {
      els.scanningOverlay.querySelector(".scan-frame-wrap").classList.add("hidden");
      els.arControls.classList.remove("hidden");
      if (arVideoEl) {
        arVideoEl.play().catch(() => {});
      }
    });

    targetEl.addEventListener("targetLost", () => {
      els.scanningOverlay.querySelector(".scan-frame-wrap").classList.remove("hidden");
      els.scanInstruction.textContent = "أعد توجيه الكاميرا نحو الكفر لاستكمال العرض";
      if (arVideoEl) {
        arVideoEl.pause();
      }
    });
  }

  function stopArExperience() {
    if (arVideoEl) {
      arVideoEl.pause();
      arVideoEl = null;
    }
    const sceneEl = document.getElementById("mindar-scene");
    if (sceneEl && sceneEl.systems && sceneEl.systems["mindar-image-system"]) {
      try {
        sceneEl.systems["mindar-image-system"].stop();
      } catch (_) {}
    }
    els.arContainer.innerHTML = "";
    els.arContainer.classList.add("hidden");
    els.arContainer.setAttribute("aria-hidden", "true");
    els.scanningOverlay.classList.add("hidden");
    els.arControls.classList.add("hidden");
    els.landingScreen.classList.remove("hidden");
    const frameWrap = els.scanningOverlay.querySelector(".scan-frame-wrap");
    if (frameWrap) frameWrap.classList.remove("hidden");
  }

  function openPreviewMode() {
    if (!activeCase) return;
    els.previewTitle.textContent = activeCase.title || "معاينة الكفر";
    els.previewVideo.src = activeCase.videoUrl || "";
    els.previewModal.classList.remove("hidden");
    els.previewVideo.play().catch(() => {});
  }

  function closePreviewMode() {
    els.previewVideo.pause();
    els.previewModal.classList.add("hidden");
  }

  els.btnStartAr.addEventListener("click", startArExperience);
  els.btnExitAr.addEventListener("click", stopArExperience);
  els.btnPreviewMode.addEventListener("click", openPreviewMode);
  els.btnClosePreview.addEventListener("click", closePreviewMode);

  els.btnToggleMute.addEventListener("click", () => {
    if (!arVideoEl) return;
    arVideoEl.muted = !arVideoEl.muted;
    els.btnToggleMute.textContent = arVideoEl.muted ? "🔇 تشغيل الصوت" : "🔊 كتم الصوت";
  });

  els.btnReplay.addEventListener("click", () => {
    if (!arVideoEl) return;
    arVideoEl.currentTime = 0;
    arVideoEl.play().catch(() => {});
  });

  loadCaseConfig();
})();

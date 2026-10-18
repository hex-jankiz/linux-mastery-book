/* =====================================================================
   Linux & Unix Mastery — 3D E-Book Core Application
   تأليف وإعداد وترتيب وشرح: جنكيز
   ===================================================================== */

(function () {
  'use strict';

  // State Management
  const STORAGE_KEY = 'jankiz_linux_mastery_ebook_v2';
  let state = {
    theme: 'sepia',
    fontSize: 14.5, // px
    soundEnabled: false,
    flipDirection: 'rtl', // 'rtl' (right-to-left) or 'ltr'
    currentPage: 0,
    isFullscreen: false
  };

  // Load persisted state
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = Object.assign(state, JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Storage load error:', e);
  }

  // DOM Elements
  const containerEl = document.getElementById('flipbook-container');
  const bookStageEl = document.getElementById('book-stage');
  const progressFillEl = document.getElementById('book-progress-fill');
  const pageIndicatorEl = document.getElementById('page-indicator');
  const jumpInputEl = document.getElementById('jump-page-input');
  const prevBtnEl = document.getElementById('prev-page-btn');
  const nextBtnEl = document.getElementById('next-page-btn');
  const tocDrawerEl = document.getElementById('toc-drawer');
  const tocBackdropEl = document.getElementById('toc-backdrop');
  const tocListEl = document.getElementById('toc-list');
  const tocSearchInputEl = document.getElementById('toc-search-input');
  const settingsModalEl = document.getElementById('settings-modal');
  const loadingOverlayEl = document.getElementById('loading-overlay');
  const soundToggleBtnEl = document.getElementById('sound-toggle-btn');
  const fullscreenBtnEl = document.getElementById('fullscreen-btn');

  let pageFlipInstance = null;
  let paginator = null;
  let currentPages = [];
  let totalBookPages = 0;
  let isPaginating = false;
  let resizeDebounceTimer = null;

  /* ---------------- Web Audio API Page-Turn Sound ---------------- */
  let audioContext = null;

  function initAudioContext() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playPageFlipSound() {
    if (!state.soundEnabled) return;
    try {
      initAudioContext();
      if (!audioContext) return;

      const duration = 0.17; // 170ms
      const bufferSize = Math.floor(audioContext.sampleRate * duration);
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      // Synthesize realistic paper friction (soft noise burst with decay)
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (bufferSize * 0.35));
        data[i] = (Math.random() * 2 - 1) * decay;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for paper swoosh
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, audioContext.currentTime + duration);
      filter.Q.value = 1.4;

      // Gain envelope
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, audioContext.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);

      noise.start();
      noise.stop(audioContext.currentTime + duration + 0.01);
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  /* ---------------- Theme & Font Scale ---------------- */
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    // Update settings modal active states
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    saveState();
  }

  function applyFontSize(size) {
    state.fontSize = parseFloat(size);
    document.documentElement.style.setProperty('--book-font-size', `${state.fontSize}px`);

    document.querySelectorAll('.font-opt-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.size) === state.fontSize);
    });

    saveState();
    rePaginate();
  }

  function setSoundEnabled(enabled) {
    state.soundEnabled = !!enabled;
    if (soundToggleBtnEl) {
      soundToggleBtnEl.classList.toggle('active', state.soundEnabled);
      soundToggleBtnEl.innerHTML = state.soundEnabled ? '🔊 <span>صوت الورق</span>' : '🔇 <span>صوت الورق</span>';
    }
    const soundOptBtn = document.getElementById('sound-modal-toggle');
    if (soundOptBtn) {
      soundOptBtn.classList.toggle('active', state.soundEnabled);
      soundOptBtn.textContent = state.soundEnabled ? 'مفعّل ✓' : 'مكتوم';
    }
    if (state.soundEnabled) initAudioContext();
    saveState();
  }

  function setFlipDirection(direction) {
    const oldDir = state.flipDirection;
    state.flipDirection = direction;
    document.querySelectorAll('.flip-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dir === direction);
    });
    saveState();
    if (oldDir !== direction && pageFlipInstance) {
      rePaginate(state.currentPage);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  /* ---------------- Page Dimensions Calculation ---------------- */
  function computeBookDimensions() {
    const stageWidth = bookStageEl.clientWidth - 40;
    const stageHeight = bookStageEl.clientHeight - 30;
    const isPortrait = stageWidth < 768 || (stageWidth / stageHeight) < 1.15;

    let targetWidth, targetHeight, pageWidth;

    if (isPortrait) {
      // Single Page Mode
      pageWidth = Math.min(520, stageWidth);
      targetHeight = Math.min(stageHeight, Math.round(pageWidth * 1.42));
      pageWidth = Math.round(targetHeight / 1.42);
      targetWidth = pageWidth;
    } else {
      // Two-Page Spread Mode
      const maxSpreadWidth = Math.min(1150, stageWidth);
      const maxHeight = Math.min(800, stageHeight);

      // Book aspect ratio ~ 1.42 per single page, so spread aspect ratio is 2 / 1.42 = ~1.41
      let testHeight = maxHeight;
      let testSpreadWidth = Math.round(testHeight * 1.41);

      if (testSpreadWidth > maxSpreadWidth) {
        testSpreadWidth = maxSpreadWidth;
        testHeight = Math.round(testSpreadWidth / 1.41);
      }

      targetWidth = testSpreadWidth;
      targetHeight = testHeight;
      pageWidth = Math.round(targetWidth / 2);
    }

    return {
      isPortrait,
      bookWidth: targetWidth,
      bookHeight: targetHeight,
      pageWidth: pageWidth,
      pageHeight: targetHeight
    };
  }

  /* ---------------- RTL / LTR Conversion Helpers ---------------- */
  function isRTL() {
    return state.flipDirection === 'rtl';
  }

  function logicalToPhysical(logicalIndex) {
    if (!isRTL()) return logicalIndex;
    return (totalBookPages - 1) - logicalIndex;
  }

  function physicalToLogical(physicalIndex) {
    if (!isRTL()) return physicalIndex;
    return (totalBookPages - 1) - physicalIndex;
  }

  /* ---------------- Auto-Pagination & StPageFlip Initialization ---------------- */
  function rePaginate(targetPage = null) {
    if (isPaginating) return;
    isPaginating = true;

    // Show loading indicator
    if (loadingOverlayEl) loadingOverlayEl.classList.remove('hidden');

    // Remember reading position (logical page index)
    const previousLogical = targetPage !== null ? targetPage : state.currentPage;

    setTimeout(() => {
      try {
        const dims = computeBookDimensions();

        // 1. Destroy existing flip instance
        if (pageFlipInstance) {
          try {
            pageFlipInstance.destroy();
          } catch (e) {
            console.warn('Destroy error:', e);
          }
          pageFlipInstance = null;
        }

        containerEl.innerHTML = '';

        // 2. Paginate book content
        paginator = new BookPaginator(BOOK_METADATA, CHAPTERS);
        const result = paginator.paginate({
          pageWidth: dims.pageWidth,
          pageHeight: dims.pageHeight,
          fontSize: state.fontSize,
          isPortrait: dims.isPortrait
        });

        currentPages = result.pages;
        totalBookPages = result.totalPages;

        // In RTL mode, reverse pages so Front Cover is placed on the left,
        // and opening the cover / turning pages goes from Left to Right like real Arabic books.
        const pagesToLoad = isRTL() ? [...currentPages].reverse() : currentPages;

        // Append page elements into container
        pagesToLoad.forEach(p => containerEl.appendChild(p));

        // 3. Initialize StPageFlip
        const clampedLogical = Math.min(Math.max(0, previousLogical), totalBookPages - 1);
        const startPhysical = logicalToPhysical(clampedLogical);

        pageFlipInstance = new St.PageFlip(containerEl, {
          width: dims.pageWidth,
          height: dims.pageHeight,
          size: 'fixed',
          minWidth: 280,
          maxWidth: 900,
          minHeight: 380,
          maxHeight: 1200,
          drawShadow: true,
          flippingTime: 700,
          usePortrait: dims.isPortrait,
          startZIndex: 1,
          autoSize: false,
          maxShadowOpacity: 0.65,
          showCover: true,
          mobileScrollSupport: false,
          swipeDistance: 25,
          clickEventForward: true,
          useMouseEvents: true,
          showPageCorners: true,
          disableFlipByClick: false,
          startPage: startPhysical
        });

        pageFlipInstance.loadFromHTML(pagesToLoad);

        // Bind Flip Events
        pageFlipInstance.on('flip', (e) => {
          const physicalIdx = e.data;
          let logicalIdx;
          if (isRTL()) {
            const isPortrait = pageFlipInstance.getOrientation() === 'portrait';
            if (isPortrait || physicalIdx === 0 || physicalIdx === totalBookPages - 1) {
              logicalIdx = (totalBookPages - 1) - physicalIdx;
            } else {
              // In two-page spread: physicalIdx is left page, physicalIdx + 1 is right page.
              // Right page is read first in Arabic: logical index = (totalBookPages - 1) - (physicalIdx + 1)
              logicalIdx = (totalBookPages - 1) - (physicalIdx + 1);
            }
          } else {
            logicalIdx = physicalIdx;
          }

          state.currentPage = logicalIdx;
          saveState();
          updateHUD();
          playPageFlipSound();
        });

        pageFlipInstance.on('changeState', (e) => {
          if (e.data === 'flipping') {
            playPageFlipSound();
          }
        });

        // 4. Update UI & TOC
        buildDrawerTOC(result.chapterMap);
        updateHUD();

      } catch (err) {
        console.error('Pagination error:', err);
      } finally {
        isPaginating = false;
        if (loadingOverlayEl) loadingOverlayEl.classList.add('hidden');
      }
    }, 40);
  }

  /* ---------------- HUD & Progress Synchronization ---------------- */
  function updateHUD() {
    if (!pageFlipInstance) return;

    const physicalCur = pageFlipInstance.getCurrentPageIndex();
    const total = totalBookPages || currentPages.length;
    const isPortrait = pageFlipInstance.getOrientation() === 'portrait';

    let logicalCur, displayStr, jumpVal;

    if (isRTL()) {
      if (isPortrait || physicalCur === total - 1 || physicalCur === 0) {
        logicalCur = (total - 1) - physicalCur;
        displayStr = `صفحة ${logicalCur + 1} من ${total}`;
        jumpVal = logicalCur + 1;
      } else {
        // Two-page spread in RTL:
        // Physical physicalCur + 1 is on RIGHT -> page: total - (physicalCur + 1)
        // Physical physicalCur is on LEFT -> page: total - physicalCur
        const rightPageNum = total - (physicalCur + 1);
        const leftPageNum = total - physicalCur;
        displayStr = `صفحة ${rightPageNum}-${leftPageNum} من ${total}`;
        logicalCur = rightPageNum - 1; // 0-based
        jumpVal = rightPageNum;
      }
    } else {
      logicalCur = physicalCur;
      if (isPortrait || physicalCur === 0 || physicalCur === total - 1) {
        displayStr = `صفحة ${physicalCur + 1} من ${total}`;
        jumpVal = physicalCur + 1;
      } else {
        const leftPage = physicalCur + 1;
        const rightPage = Math.min(physicalCur + 2, total);
        displayStr = `صفحة ${leftPage}-${rightPage} من ${total}`;
        jumpVal = leftPage;
      }
    }

    // Page text display
    if (pageIndicatorEl) {
      pageIndicatorEl.textContent = displayStr;
    }

    if (jumpInputEl) {
      jumpInputEl.value = jumpVal;
      jumpInputEl.max = total;
    }

    // Top progress bar fill
    if (progressFillEl) {
      const pct = Math.round(((logicalCur + 1) / total) * 100);
      progressFillEl.style.width = `${pct}%`;
    }

    // Prev / Next button states
    if (prevBtnEl) prevBtnEl.disabled = logicalCur <= 0;
    if (nextBtnEl) nextBtnEl.disabled = logicalCur >= total - 1;

    // Highlight active chapter in TOC
    highlightActiveChapter(logicalCur);
  }

  function highlightActiveChapter(pageIdx) {
    if (!paginator || !paginator.chapterPageMap) return;

    let activeCh = 0;
    const map = paginator.chapterPageMap;
    for (let ch = 0; ch < CHAPTERS.length; ch++) {
      if (pageIdx >= (map[ch] || 0)) {
        activeCh = ch;
      } else {
        break;
      }
    }

    document.querySelectorAll('.drawer-item').forEach(el => {
      const chId = parseInt(el.dataset.chIdx, 10);
      el.classList.toggle('active', chId === activeCh);
    });
  }

  /* ---------------- Navigation Actions ---------------- */
  function goToNext() {
    if (!pageFlipInstance) return;
    if (isRTL()) {
      // In RTL, flipping from Left to Right advances forward into the book
      pageFlipInstance.flipPrev('top');
    } else {
      pageFlipInstance.flipNext('top');
    }
  }

  function goToPrev() {
    if (!pageFlipInstance) return;
    if (isRTL()) {
      // In RTL, flipping from Right to Left moves backward toward the cover
      pageFlipInstance.flipNext('top');
    } else {
      pageFlipInstance.flipPrev('top');
    }
  }

  function goToPage(pageNum) {
    if (!pageFlipInstance) return;
    const clamped = Math.max(1, Math.min(pageNum, totalBookPages));
    const targetPhysical = isRTL() ? (totalBookPages - clamped) : (clamped - 1);
    pageFlipInstance.flip(targetPhysical);
  }

  /* ---------------- Table of Contents Drawer ---------------- */
  function buildDrawerTOC(chapterMap) {
    if (!tocListEl) return;
    tocListEl.innerHTML = '';

    const parts = [];
    CHAPTERS.forEach(c => {
      if (!parts.includes(c.part)) parts.push(c.part);
    });

    parts.forEach(part => {
      const partTitle = document.createElement('div');
      partTitle.className = 'drawer-section-title';
      partTitle.textContent = part;
      tocListEl.appendChild(partTitle);

      CHAPTERS.forEach((ch, chIdx) => {
        if (ch.part !== part) return;
        const pageTarget = (chapterMap[chIdx] || 0) + 1;

        const item = document.createElement('div');
        item.className = 'drawer-item';
        item.dataset.chIdx = chIdx;
        item.dataset.page = pageTarget;
        item.innerHTML = `
          <div class="drawer-item-title">
            <span class="drawer-item-num">${String(chIdx + 1).padStart(2, '0')}</span>
            <span>${ch.title}</span>
          </div>
          <span class="drawer-item-page">ص ${pageTarget}</span>
        `;

        item.addEventListener('click', () => {
          goToPage(pageTarget);
          closeTOCDrawer();
        });

        tocListEl.appendChild(item);
      });
    });
  }

  function openTOCDrawer() {
    if (tocDrawerEl) tocDrawerEl.classList.add('open');
    if (tocBackdropEl) tocBackdropEl.classList.add('show');
  }

  function closeTOCDrawer() {
    if (tocDrawerEl) tocDrawerEl.classList.remove('open');
    if (tocBackdropEl) tocBackdropEl.classList.remove('show');
  }

  /* ---------------- Search in Drawer ---------------- */
  if (tocSearchInputEl) {
    tocSearchInputEl.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.drawer-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = (!query || text.includes(query)) ? 'flex' : 'none';
      });
      document.querySelectorAll('.drawer-section-title').forEach(title => {
        let sibling = title.nextElementSibling;
        let hasVisible = false;
        while (sibling && !sibling.classList.contains('drawer-section-title')) {
          if (sibling.style.display !== 'none') hasVisible = true;
          sibling = sibling.nextElementSibling;
        }
        title.style.display = hasVisible ? 'block' : 'none';
      });
    });
  }

  /* ---------------- Interactive Quiz Answers ---------------- */
  document.addEventListener('click', (e) => {
    // 1. Quiz Option Selection
    const optBtn = e.target.closest('.page-quiz-opt');
    if (optBtn) {
      const parent = optBtn.parentElement;
      const correctAns = parseInt(optBtn.dataset.ans, 10);
      const chosen = parseInt(optBtn.dataset.oi, 10);

      // Disable other buttons in question
      parent.querySelectorAll('.page-quiz-opt').forEach(b => b.style.pointerEvents = 'none');

      if (chosen === correctAns) {
        optBtn.classList.add('correct');
      } else {
        optBtn.classList.add('wrong');
        const correctBtn = parent.querySelector(`[data-oi="${correctAns}"]`);
        if (correctBtn) correctBtn.classList.add('correct');
      }
      return;
    }

    // 2. Copy Code Block
    const copyBtn = e.target.closest('.page-copy-btn');
    if (copyBtn) {
      const targetId = copyBtn.dataset.target;
      const codeEl = document.getElementById(targetId);
      if (codeEl) {
        const text = codeEl.innerText;
        navigator.clipboard && navigator.clipboard.writeText(text).then(() => {
          const old = copyBtn.textContent;
          copyBtn.textContent = 'تم النسخ ✓';
          setTimeout(() => { copyBtn.textContent = old; }, 1500);
        });
      }
      return;
    }

    // 3. Printed Table of Contents links inside pages
    const printedTocItem = e.target.closest('.toc-line-item');
    if (printedTocItem) {
      const targetP = parseInt(printedTocItem.dataset.page, 10);
      if (!isNaN(targetP)) {
        goToPage(targetP + 1);
      }
      return;
    }
  });

  /* ---------------- Fullscreen Mode ---------------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      state.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      state.isFullscreen = false;
    }
  }

  document.addEventListener('fullscreenchange', () => {
    state.isFullscreen = !!document.fullscreenElement;
    if (fullscreenBtnEl) {
      fullscreenBtnEl.classList.toggle('active', state.isFullscreen);
    }
  });

  /* ---------------- Keyboard Shortcuts ---------------- */
  window.addEventListener('keydown', (e) => {
    // Ignore when typing inside inputs
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.key === 'ArrowLeft' || e.key === 'PageDown') {
      e.preventDefault();
      goToNext();
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToPage(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToPage(totalBookPages);
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'm' || e.key === 'M') {
      setSoundEnabled(!state.soundEnabled);
    } else if (e.key === 'Escape') {
      closeTOCDrawer();
      if (settingsModalEl) settingsModalEl.classList.remove('show');
    }
  });

  /* ---------------- Window Resize Handling ---------------- */
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      rePaginate();
    }, 250);
  });

  /* ---------------- UI Event Listeners ---------------- */
  if (prevBtnEl) prevBtnEl.addEventListener('click', goToPrev);
  if (nextBtnEl) nextBtnEl.addEventListener('click', goToNext);

  if (containerEl) {
    containerEl.addEventListener('click', (e) => {
      const item = e.target.closest('.toc-line-item');
      if (item && item.dataset.page !== undefined) {
        const pageNum = parseInt(item.dataset.page, 10) + 1;
        goToPage(pageNum);
      }
    });
  }

  if (jumpInputEl) {
    jumpInputEl.addEventListener('change', () => {
      const val = parseInt(jumpInputEl.value, 10);
      if (!isNaN(val)) goToPage(val);
    });
    jumpInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseInt(jumpInputEl.value, 10);
        if (!isNaN(val)) goToPage(val);
      }
    });
  }

  // TOC drawer toggles
  const tocBtn = document.getElementById('toc-btn');
  if (tocBtn) tocBtn.addEventListener('click', openTOCDrawer);
  const closeTocBtn = document.getElementById('close-toc-btn');
  if (closeTocBtn) closeTocBtn.addEventListener('click', closeTOCDrawer);
  if (tocBackdropEl) tocBackdropEl.addEventListener('click', closeTOCDrawer);

  // Settings modal toggles
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsModalEl) settingsModalEl.classList.add('show');
    });
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModalEl) settingsModalEl.classList.remove('show');
    });
  }
  if (settingsModalEl) {
    settingsModalEl.addEventListener('click', (e) => {
      if (e.target === settingsModalEl) settingsModalEl.classList.remove('show');
    });
  }

  // Theme option clicks
  document.querySelectorAll('.theme-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // Font size option clicks
  document.querySelectorAll('.font-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyFontSize(btn.dataset.size);
    });
  });

  // Flip direction option clicks
  document.querySelectorAll('.flip-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFlipDirection(btn.dataset.dir);
    });
  });

  // Sound toggle button in HUD
  if (soundToggleBtnEl) {
    soundToggleBtnEl.addEventListener('click', () => {
      setSoundEnabled(!state.soundEnabled);
    });
  }

  // Sound toggle button in settings modal
  const soundModalBtn = document.getElementById('sound-modal-toggle');
  if (soundModalBtn) {
    soundModalBtn.addEventListener('click', () => {
      setSoundEnabled(!state.soundEnabled);
    });
  }

  // Fullscreen button
  if (fullscreenBtnEl) {
    fullscreenBtnEl.addEventListener('click', toggleFullscreen);
  }

  // Reset Progress button
  const resetProgressBtn = document.getElementById('reset-progress-btn');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', () => {
      state.currentPage = 0;
      saveState();
      goToPage(1);
      if (settingsModalEl) settingsModalEl.classList.remove('show');
    });
  }

  /* ---------------- Initialization ---------------- */
  applyTheme(state.theme);
  setSoundEnabled(state.soundEnabled);
  setFlipDirection(state.flipDirection);
  document.documentElement.style.setProperty('--book-font-size', `${state.fontSize}px`);

  // Initial pagination and render
  rePaginate(state.currentPage);

})();

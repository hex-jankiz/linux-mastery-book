/* =====================================================================
   Linux & Unix Mastery — High-Precision Auto-Paginator
   تأليف وإعداد وترتيب وشرح: جنكيز
   ===================================================================== */

class BookPaginator {
  constructor(metadata, chapters) {
    this.metadata = metadata;
    this.chapters = chapters;
    this.chapterPageMap = {}; // chapter index -> starting page number
    this.pageList = [];
  }

  /**
   * Paginates the entire book into an array of DOM .page elements
   * based on the given dimensions and font scale.
   */
  paginate(options) {
    const {
      pageWidth = 460,
      pageHeight = 650,
      fontSize = 14,
      isPortrait = false
    } = options;

    this.chapterPageMap = {};
    this.pageList = [];

    // Create invisible measurement sandbox
    const sandbox = document.createElement('div');
    sandbox.id = 'paginator-sandbox';
    sandbox.style.cssText = `
      position: absolute !important;
      visibility: hidden !important;
      pointer-events: none !important;
      top: -9999px !important;
      left: -9999px !important;
      width: ${pageWidth}px !important;
      height: ${pageHeight}px !important;
      font-size: ${fontSize}px !important;
      direction: rtl !important;
    `;
    document.body.appendChild(sandbox);

    const testPage = document.createElement('div');
    testPage.className = 'page';
    testPage.innerHTML = `
      <div class="page-inner">
        <div class="page-header"><span></span><span></span></div>
        <div class="page-body" style="font-size: ${fontSize}px;"></div>
        <div class="page-footer"><span></span><span class="page-num"></span></div>
      </div>
    `;
    sandbox.appendChild(testPage);

    const testBody = testPage.querySelector('.page-body');
    const availableHeight = testBody.clientHeight || (pageHeight - 96);
    const availableWidth = testBody.clientWidth || (pageWidth - 64);

    let currentPageIndex = 0;

    // Helper: create empty page wrapper
    const createPageElement = (density = 'soft', headerLeft = '', headerRight = '') => {
      const pageEl = document.createElement('div');
      pageEl.className = `page --soft`;
      pageEl.dataset.density = density;
      if (density === 'hard') pageEl.dataset.density = 'hard';

      const inner = document.createElement('div');
      inner.className = 'page-inner';

      const header = document.createElement('div');
      header.className = 'page-header';
      header.innerHTML = `<span>${headerRight}</span><span>${headerLeft}</span>`;

      const body = document.createElement('div');
      body.className = 'page-body';
      body.style.fontSize = `${fontSize}px`;

      const footer = document.createElement('div');
      footer.className = 'page-footer';
      footer.innerHTML = `<span>Linux &amp; Unix Mastery</span><span class="page-num">${currentPageIndex + 1}</span>`;

      inner.appendChild(header);
      inner.appendChild(body);
      inner.appendChild(footer);
      pageEl.appendChild(inner);

      return { pageEl, inner, header, body, footer };
    };

    // 1. PAGE 0: Front Cover (Hard)
    const coverPage = document.createElement('div');
    coverPage.className = 'page page-cover-front';
    coverPage.dataset.density = 'hard';
    coverPage.innerHTML = `
      <img src="${this.metadata.coverImage}" alt="غلاف كتاب: Linux &amp; Unix Mastery" class="cover-full-img">
    `;
    this.pageList.push(coverPage);
    currentPageIndex++;

    // 2. PAGE 1: Inside Front Cover / Endpaper (Hard)
    const endpaper1 = document.createElement('div');
    endpaper1.className = 'page page-endpaper';
    endpaper1.dataset.density = 'hard';
    endpaper1.innerHTML = `
      <div class="bookplate">
        <div class="bookplate-title">Linux &amp; Unix Mastery</div>
        <div class="bookplate-author">من مكتبة: جنكيز</div>
        <p style="margin: 12px 0 0; font-size: 11.5px; color: #7a634a;">نسخة رقمية تفاعلية خاصة</p>
      </div>
    `;
    this.pageList.push(endpaper1);
    currentPageIndex++;

    // 3. PAGE 2: Half-Title & Mission Statement
    const pageHalfTitle = createPageElement('soft', 'البداية', 'Linux & Unix Mastery');
    pageHalfTitle.body.innerHTML = `
      <div style="text-align: center; padding-top: 35px;">
        <div class="page-eyebrow">إصدار تقني معتمد</div>
        <h1 style="border:none; margin-bottom: 8px;">Linux &amp; Unix Mastery</h1>
        <p style="font-size: 1.1em; color: var(--amber); font-weight: 600;">الدليل العملي الشامل من الصفر إلى الاحتراف</p>
        <div style="width: 50px; height: 2px; background: var(--amber); margin: 25px auto;"></div>
        <p style="margin-bottom: 24px;">تأليف وإعداد وترتيب وشرح:<br><strong style="font-size: 1.15em; color: var(--ink-main);">${this.metadata.author}</strong></p>
        <div class="page-card note" style="text-align: right; margin-top: 30px;">
          <div class="page-card-title">✦ رسالة الكتاب</div>
          <p>${this.metadata.terminalMission}</p>
        </div>
      </div>
    `;
    this.pageList.push(pageHalfTitle.pageEl);
    currentPageIndex++;

    // 4. PAGE 3: Copyright & Notice
    const pageCopyright = createPageElement('soft', 'حقوق النشر', 'Linux & Unix Mastery');
    pageCopyright.body.innerHTML = `
      <div class="page-eyebrow">معلومات النشر</div>
      <h2>حقوق النشر والتوزيع</h2>
      <div style="font-size: 0.94em; line-height: 1.85;">
        ${this.metadata.copyright.map(c => `<p style="margin-bottom: 12px;">${c}</p>`).join('')}
      </div>
    `;
    this.pageList.push(pageCopyright.pageEl);
    currentPageIndex++;

    // 5. PAGE 4: Author Introduction & Portrait
    const pageAuthor = createPageElement('soft', 'مقدمة المؤلف', 'جنكيز');
    pageAuthor.body.innerHTML = `
      <div style="text-align: center; margin-bottom: 14px;">
        <img src="author-photo.png" alt="${this.metadata.author}" class="author-avatar">
        <h2 style="text-align: center; margin: 4px 0;">مقدمة المؤلف: ${this.metadata.author}</h2>
        <div class="page-eyebrow" style="text-align: center;">رحلة من الصفر إلى الاحتراف</div>
      </div>
      <div style="font-size: 0.93em; line-height: 1.85;">
        ${this.metadata.introduction.map(p => `<p>${p}</p>`).join('')}
      </div>
    `;
    this.pageList.push(pageAuthor.pageEl);
    currentPageIndex++;

    // 6. Printed Table of Contents Pages Placeholder
    // We will allocate pages for TOC, and render their items after chapter pagination
    const tocPagesCount = isPortrait ? 3 : 2;
    const tocPages = [];
    for (let t = 0; t < tocPagesCount; t++) {
      const p = createPageElement('soft', 'الفهرس العام', `محتويات الكتاب (${t+1})`);
      tocPages.push(p);
      this.pageList.push(p.pageEl);
      currentPageIndex++;
    }

    // -------------------------------------------------------------
    // 7. Paginate the 37 Chapters
    // -------------------------------------------------------------
    let curPage = createPageElement('soft', '', '');
    this.pageList.push(curPage.pageEl);
    currentPageIndex++;

    const startNewPage = (chapterTitle = '', partName = '') => {
      curPage = createPageElement('soft', chapterTitle, partName);
      this.pageList.push(curPage.pageEl);
      currentPageIndex++;
      testBody.innerHTML = '';
    };

    this.chapters.forEach((chapter, chIdx) => {
      // Each chapter starts fresh on a new page or continues neatly
      if (testBody.children.length > 0) {
        startNewPage(chapter.title, chapter.part);
      }
      this.chapterPageMap[chIdx] = currentPageIndex - 1; // 0-based page index
      curPage.header.innerHTML = `<span>${chapter.part}</span><span>${chapter.title}</span>`;

      // Build content units for this chapter
      const units = [];

      // 1) Title Banner
      const titleDiv = document.createElement('div');
      titleDiv.className = 'chapter-header-unit';
      titleDiv.innerHTML = `
        <div class="page-eyebrow">${chapter.part} — الفصل ${String(chIdx + 1).padStart(2, '0')}</div>
        <h1>${chapter.title}</h1>
      `;
      units.push({ el: titleDiv, isHeading: true, keepTogether: true });

      // 2) Objectives Box
      if (chapter.objectives && chapter.objectives.length) {
        const objDiv = document.createElement('div');
        objDiv.className = 'page-objectives';
        objDiv.innerHTML = `
          <h4>أهداف الفصل</h4>
          <ul>${chapter.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
        `;
        units.push({ el: objDiv, keepTogether: true });
      }

      // 3) Sections
      (chapter.sections || []).forEach(sec => {
        if (sec.h) {
          const h2 = document.createElement('h2');
          h2.textContent = sec.h;
          units.push({ el: h2, isHeading: true, keepTogether: true });
        }
        if (sec.p) {
          // Paragraph: break into sentences if long
          const sentences = sec.p.split(/(?<=[.،؛؟])\s+/);
          if (sentences.length > 3 && sec.p.length > 250) {
            // Split into 2 chunks
            const mid = Math.ceil(sentences.length / 2);
            const p1 = document.createElement('p');
            p1.textContent = sentences.slice(0, mid).join(' ');
            const p2 = document.createElement('p');
            p2.textContent = sentences.slice(mid).join(' ');
            units.push({ el: p1 });
            units.push({ el: p2 });
          } else {
            const p = document.createElement('p');
            p.textContent = sec.p;
            units.push({ el: p });
          }
        }
        if (sec.table && chapter.compareTable) {
          const tbl = document.createElement('table');
          tbl.className = 'page-table';
          tbl.innerHTML = `
            <thead><tr>${chapter.compareTable.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${chapter.compareTable.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          `;
          units.push({ el: tbl, keepTogether: true });
        }
      });

      // Quick Table (if any)
      if (chapter.quickTable) {
        const qtbl = document.createElement('table');
        qtbl.className = 'page-table';
        qtbl.innerHTML = `
          <thead><tr>${chapter.quickTable.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${chapter.quickTable.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        `;
        units.push({ el: qtbl, keepTogether: true });
      }

      // 4) Code Examples
      (chapter.examples || []).forEach(ex => {
        if (ex.title) {
          const h3 = document.createElement('h3');
          h3.textContent = ex.title;
          units.push({ el: h3, isHeading: true, keepTogether: true });
        }
        if (ex.code && ex.code.lines) {
          const cbDiv = document.createElement('div');
          cbDiv.className = 'page-code-block';
          const codeText = ex.code.lines.map(l => l.c).join('\n');
          const uid = 'code_' + Math.random().toString(36).substr(2, 9);
          cbDiv.innerHTML = `
            <div class="page-code-header">
              <span>${ex.code.lang || 'BASH'}</span>
              <button class="page-copy-btn" data-target="${uid}">نسخ</button>
            </div>
            <pre><code id="${uid}">${this.escapeHtml(codeText)}</code></pre>
          `;
          units.push({ el: cbDiv, keepTogether: true });
        }
        if (ex.explain && ex.explain.length) {
          const expDiv = document.createElement('div');
          expDiv.className = 'page-cmd-explain';
          expDiv.innerHTML = ex.explain.map(p => `
            <code>${this.escapeHtml(p[0])}</code>
            <span>${this.escapeHtml(p[1])}</span>
          `).join('');
          units.push({ el: expDiv, keepTogether: true });
        }
      });

      // 5) Mistakes & Tips Cards
      if (chapter.mistakes && chapter.mistakes.length) {
        const warnCard = document.createElement('div');
        warnCard.className = 'page-card warn';
        warnCard.innerHTML = `
          <div class="page-card-title">⚠ أخطاء شائعة تجنبها</div>
          <ul>${chapter.mistakes.map(m => `<li>${m}</li>`).join('')}</ul>
        `;
        units.push({ el: warnCard, keepTogether: true });
      }
      if (chapter.tips && chapter.tips.length) {
        const tipCard = document.createElement('div');
        tipCard.className = 'page-card tip';
        tipCard.innerHTML = `
          <div class="page-card-title">✦ نصيحة احترافية</div>
          <ul>${chapter.tips.map(t => `<li>${t}</li>`).join('')}</ul>
        `;
        units.push({ el: tipCard, keepTogether: true });
      }

      // 6) Quizzes / Exercises / Exam
      const quizItems = (chapter.quiz && chapter.quiz.length) ? chapter.quiz : (chapter.exam || []);
      if (quizItems.length) {
        const quizBox = document.createElement('div');
        quizBox.className = 'page-summary-box';
        quizBox.style.marginTop = '10px';
        quizBox.innerHTML = `<h4>${chapter.exam ? 'اختبار المراجعة الختامي' : 'اختبر نفسك وتمرن'}</h4>`;
        units.push({ el: quizBox, keepTogether: true });

        quizItems.forEach((q, qi) => {
          const qItem = document.createElement('div');
          qItem.className = 'page-quiz-item';
          qItem.innerHTML = `
            <div class="page-quiz-q">${qi + 1}. ${this.escapeHtml(q.q)}</div>
            <div class="page-quiz-opts">
              ${q.opts.map((opt, oi) => `
                <button class="page-quiz-opt" data-qi="${qi}" data-oi="${oi}" data-ans="${q.a}">
                  ${this.escapeHtml(opt)}
                </button>
              `).join('')}
            </div>
          `;
          units.push({ el: qItem, keepTogether: true });
        });
      }

      // 7) Summary Box
      if (chapter.sections && chapter.sections[0]) {
        const sumBox = document.createElement('div');
        sumBox.className = 'page-summary-box';
        const lead = chapter.sections[0].p.split('.')[0] + '.';
        sumBox.innerHTML = `
          <h4>خلاصة الفصل</h4>
          <p style="margin:0; font-size: 0.9em; color: var(--ink-dim);">${lead} تأكد من إتقان أهداف الفصل والأوامر الواردة فيه قبل المتابعة.</p>
        `;
        units.push({ el: sumBox, keepTogether: true });
      }

      // Flow units into pages using sandbox test
      units.forEach((unit, uIdx) => {
        const clone = unit.el.cloneNode(true);
        testBody.appendChild(clone);

        // Check overflow
        const isOverflow = testBody.scrollHeight > (availableHeight + 4);

        if (isOverflow && testBody.children.length > 1) {
          // If this is a heading or keepTogether block, or overflowed, move to next page
          testBody.removeChild(clone);

          // Check if previous element in testBody was an orphaned heading
          const lastEl = testBody.lastElementChild;
          if (lastEl && (lastEl.tagName === 'H1' || lastEl.tagName === 'H2' || lastEl.tagName === 'H3' || lastEl.classList.contains('chapter-header-unit'))) {
            // Move heading to next page too to avoid orphan!
            testBody.removeChild(lastEl);
            curPage.body.removeChild(curPage.body.lastElementChild);
            startNewPage(chapter.title, chapter.part);
            testBody.appendChild(lastEl.cloneNode(true));
            curPage.body.appendChild(lastEl);
          } else {
            startNewPage(chapter.title, chapter.part);
          }

          testBody.appendChild(clone);
          curPage.body.appendChild(unit.el);
        } else {
          // Fits on current page
          curPage.body.appendChild(unit.el);
        }
      });
    });

    // Clean up measurement sandbox
    sandbox.remove();

    // -------------------------------------------------------------
    // Populate the printed Table of Contents pages
    // -------------------------------------------------------------
    this.renderPrintedTOC(tocPages);

    // -------------------------------------------------------------
    // Ensure even page count before back cover for 2-page spread
    // -------------------------------------------------------------
    if (this.pageList.length % 2 !== 0) {
      const blankPage = createPageElement('soft', '', '');
      blankPage.body.innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; text-align:center; color: var(--ink-faint); font-family: var(--font-serif); font-size: 1.1em;">
          <div>
            <div style="font-size: 24px; margin-bottom: 8px; color: var(--amber);">✦</div>
            <p>انتهى الكتاب بحمد الله وتوفيقه</p>
            <p style="font-size: 0.85em; color: var(--ink-faint);">Linux &amp; Unix Mastery — جنكيز</p>
          </div>
        </div>
      `;
      this.pageList.push(blankPage.pageEl);
      currentPageIndex++;
    }

    // Inside Back Cover (Hard)
    const endpaper2 = document.createElement('div');
    endpaper2.className = 'page page-endpaper';
    endpaper2.dataset.density = 'hard';
    endpaper2.innerHTML = `
      <div class="bookplate">
        <div class="bookplate-title">ختام الرحلة</div>
        <div class="bookplate-author">تأليف: جنكيز</div>
        <p style="margin: 12px 0 0; font-size: 12px; color: #7a634a;">«العلم صيدٌ والكتابة قيده.. قيّد صيودك بالحبال الواثقة»</p>
      </div>
    `;
    this.pageList.push(endpaper2);
    currentPageIndex++;

    // Back Cover (Hard)
    const backCover = document.createElement('div');
    backCover.className = 'page page-cover-back';
    backCover.dataset.density = 'hard';
    backCover.innerHTML = `
      <div class="cover-gold-border"></div>
      <div>
        <div class="cover-kicker">دليل المهندس والمحترف</div>
        <h2 style="color: #fff; margin: 0 0 12px; font-size: 20px;">Linux &amp; Unix Mastery</h2>
        <div class="back-blurb">
          دليل عملي شامل أعدّه وجمعه ورتبه وشرحه <strong>جنكيز</strong> ليجمع بين فلسفة يونكس الخالدة والتقنيات السحابية الحديثة. 
          من بناء أول أمر إلى إدارة عناقيد Kubernetes وحاويات Docker وتحصين الخوادم باحترافية تامة.
        </div>
        <ul class="back-features">
          <li>✓ 37 فصلًا تقنيًا تطبيقيًا بأمثلة حقيقية</li>
          <li>✓ أوامر مفسّرة وسلاسل أنابيب من بيئات إنتاجية</li>
          <li>✓ تمارين تفاعلية واختبارات لترسيخ المفاهيم</li>
          <li>✓ صُمم وطُوّر ليكون مرجعك الدائم على الخوادم</li>
        </ul>
      </div>
      <div>
        <div class="back-barcode">
          <span>GENGHIS-LINUX-2026-EDITION</span>
          <span style="font-size: 16px; letter-spacing: 2px;">||| | ||||| || |||</span>
        </div>
      </div>
    `;
    this.pageList.push(backCover);

    return {
      pages: this.pageList,
      chapterMap: this.chapterPageMap,
      totalPages: this.pageList.length
    };
  }

  /**
   * Fills the allocated Table of Contents pages with clickable chapter links
   */
  renderPrintedTOC(tocPages) {
    const chaptersPerTOCPage = Math.ceil(this.chapters.length / tocPages.length);

    tocPages.forEach((tocPage, pIdx) => {
      const slice = this.chapters.slice(pIdx * chaptersPerTOCPage, (pIdx + 1) * chaptersPerTOCPage);
      let html = `<div class="page-eyebrow">فهرس المحتويات</div><h2>الفهرس العام</h2><div style="font-size: 0.9em;">`;

      slice.forEach((ch, idxInSlice) => {
        const globalIdx = pIdx * chaptersPerTOCPage + idxInSlice;
        const pageNum = (this.chapterPageMap[globalIdx] || 0) + 1;
        html += `
          <div class="toc-line-item" data-page="${pageNum - 1}" style="display:flex; justify-content:space-between; align-items:baseline; padding: 4px 2px; border-bottom: 1px dotted var(--ink-border); cursor:pointer;">
            <span style="display:flex; align-items:baseline; gap:6px;">
              <span style="font-family:var(--font-mono); font-size:0.85em; color:var(--amber); min-width:20px;">${String(globalIdx + 1).padStart(2, '0')}.</span>
              <strong style="font-weight:600; color:var(--ink-main);">${ch.title}</strong>
            </span>
            <span style="font-family:var(--font-mono); font-size:0.85em; color:var(--amber); font-weight:600;">${pageNum}</span>
          </div>
        `;
      });

      html += `</div>`;
      tocPage.body.innerHTML = html;
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// Export for app use
window.BookPaginator = BookPaginator;

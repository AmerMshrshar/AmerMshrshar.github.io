(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const AR = root.lang === 'ar';
  const T = AR ? {
    openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة', copied: 'تم نسخ البريد الإلكتروني',
  } : {
    openMenu: 'Open menu', closeMenu: 'Close menu', copied: 'Email copied to clipboard',
  };

  /* ---------- Theme ---------- */
  const isDark = () => {
    const t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  $('#themeToggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menuBtn');
  const links = $('#navLinks');
  const setMenu = (open) => {
    links.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? T.closeMenu : T.openMenu);
  };
  menuBtn.addEventListener('click', () => setMenu(!links.classList.contains('is-open')));
  $$('a', links).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Nav state + progress bar ---------- */
  const nav = $('.nav');
  const bar = $('.progress span');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 12);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active section in nav ---------- */
  const navMap = new Map($$('a', links).map((a) => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navMap.forEach((a) => a.classList.remove('is-active'));
        const a = navMap.get(en.target.id);
        if (a) a.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        revObs.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => {
    if (el.closest('.hero')) el.style.transitionDelay = `${i * 80}ms`;
    revObs.observe(el);
  });

  /* ---------- Count-up stats ---------- */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const target = +el.dataset.count;
      countObs.unobserve(el);
      if (reduceMotion) { el.textContent = target; return; }
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countObs.observe(el));

  /* ---------- Role rotator ---------- */
  const roles = $$('.rotator__item');
  if (roles.length > 1 && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      const cur = roles[i];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      setTimeout(() => cur.classList.remove('is-leaving'), 500);
      i = (i + 1) % roles.length;
      roles[i].classList.add('is-active');
    }, 2600);
  }


  /* ---------- Copy email ---------- */
  const toast = $('#toast');
  let toastT;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-on'), 2000);
  };
  $('#copyMail').addEventListener('click', async (e) => {
    const text = e.currentTarget.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      showToast(T.copied);
    } catch {
      showToast(text);
    }
  });

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Back to top ---------- */
  $$('[data-to-top]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
    $('.brand').focus({ preventScroll: true });
  }));

  const BACK = AR ? 'ArrowRight' : 'ArrowLeft';
  const FWD = AR ? 'ArrowLeft' : 'ArrowRight';
  const lb = $('#lightbox');
  let showcaseGo = null;
  let syncPlay = () => {};

  /* ---------- Product showcase (3D carousel) ---------- */
  const sc = $('[data-showcase]');
  if (sc) {
    const slides = $$('.ps-slide', sc);
    const tabs = $$('.ps-tab', sc);
    const track = $('.ps-track', sc);
    const rise = $('.ps-rise', sc);
    const count = $('.ps-count b', sc);
    const n = slides.length;
    let cur = 0;

    const resetTilt = () => slides.forEach((s) => {
      const t = $('.ps-tilt', s);
      ['--rx', '--ry'].forEach((v) => t.style.removeProperty(v));
    });
    const render = (focusTab) => {
      slides.forEach((s, i) => {
        const d = (i - cur + n) % n;
        const state = d === 0 ? 'is-front' : d === 1 ? 'is-next' : d === n - 1 ? 'is-prev' : 'is-back';
        s.classList.remove('is-front', 'is-next', 'is-prev', 'is-back');
        s.classList.add(state);
        s.setAttribute('aria-hidden', String(d !== 0));
        $('.ps-shot', s).tabIndex = d === 0 ? 0 : -1;
      });
      tabs.forEach((t, i) => {
        t.setAttribute('aria-selected', String(i === cur));
        t.tabIndex = i === cur ? 0 : -1;
      });
      if (focusTab) tabs[cur].focus();
      count.textContent = String(cur + 1).padStart(2, '0');
      resetTilt();
    };
    const go = (i, focusTab) => { cur = (i + n) % n; render(focusTab); };
    showcaseGo = go;

    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    $$('[data-ps]', sc).forEach((b) => b.addEventListener('click', () => go(cur + (b.dataset.ps === 'next' ? 1 : -1))));
    $('.ps-tabs', sc).addEventListener('keydown', (e) => {
      const map = { [FWD]: cur + 1, [BACK]: cur - 1, Home: 0, End: n - 1 };
      if (e.key in map) { e.preventDefault(); go(map[e.key], true); }
    });
    // Side slides bring themselves to the front (the front one opens the lightbox)
    slides.forEach((s, i) => s.addEventListener('click', () => { if (!s.classList.contains('is-front')) go(i); }));

    // Swipe
    let x0 = null, swiped = false;
    track.addEventListener('pointerdown', (e) => { x0 = e.clientX; swiped = false; });
    track.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 45) { swiped = true; go(cur + ((dx < 0) !== AR ? 1 : -1)); }
    });
    track.addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);

    // Autoplay: the active tab's progress bar drives the timing
    let hover = false, focused = false, onScreen = false;
    syncPlay = () => {
      const paused = hover || focused || !onScreen || document.hidden || (lb && lb.open);
      sc.classList.toggle('is-paused', paused);
    };
    if (!reduceMotion) {
      sc.classList.add('is-playing');
      sc.addEventListener('animationend', (e) => { if (e.animationName === 'psFill') go(cur + 1); });
      track.addEventListener('mouseenter', () => { hover = true; syncPlay(); });
      track.addEventListener('mouseleave', () => { hover = false; syncPlay(); });
      sc.addEventListener('focusin', (e) => { focused = e.target.matches(':focus-visible'); syncPlay(); });
      sc.addEventListener('focusout', () => { focused = sc.contains(document.activeElement); syncPlay(); });
      document.addEventListener('visibilitychange', syncPlay);
      new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; syncPlay(); }, { threshold: 0.35 }).observe(track);
      syncPlay();

      // Pointer tilt + glare on the front screen
      track.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const front = $('.is-front .ps-tilt', sc);
        const r = front.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        if (px < 0 || px > 1 || py < 0 || py > 1) { resetTilt(); return; }
        front.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
        front.style.setProperty('--rx', `${((0.5 - py) * 5).toFixed(2)}deg`);
        front.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        front.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      });
      track.addEventListener('pointerleave', resetTilt);

      // The stage rises into place as it scrolls into view
      let ticking = false;
      const onRise = () => {
        ticking = false;
        const r = rise.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(Math.max((vh - r.top) / (vh * 0.6), 0), 1);
        rise.style.setProperty('--rise', (1 - p).toFixed(3));
      };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onRise); } }, { passive: true });
      onRise();
    }
  }

  /* ---------- AI agent chat demo ---------- */
  const agent = $('[data-agent]');
  if (agent) {
    const body = $('.agent__body', agent);
    const script = JSON.parse($('.agent__data', agent).textContent);
    const el = (cls, text) => {
      const d = document.createElement('div');
      d.className = cls;
      if (text) d.textContent = text;
      return d;
    };
    const src = (text) => { const s = document.createElement('span'); s.className = 'agent__src'; s.textContent = text; return s; };
    if (reduceMotion) {
      const ex = script[0];
      body.append(el('agent__msg agent__msg--user', ex.q));
      const bot = el('agent__msg agent__msg--bot', ex.a);
      bot.append(src(ex.s));
      body.append(bot);
    } else {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let visible = false, wake = null;
      const ready = () => (visible && !document.hidden ? Promise.resolve() : new Promise((r) => { wake = r; }));
      const kick = () => { if (visible && !document.hidden && wake) { wake(); wake = null; } };
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: 0.4 }).observe(agent);
      document.addEventListener('visibilitychange', kick);

      (async () => {
        for (let k = 0; ; k++) {
          const ex = script[k % script.length];
          await ready();
          agent.classList.remove('is-clearing');
          body.replaceChildren(el('agent__msg agent__msg--user', ex.q));
          await sleep(650);
          const typing = el('agent__msg agent__msg--bot agent__typing');
          typing.innerHTML = '<span></span><span></span><span></span>';
          body.append(typing);
          await sleep(1150);
          const bot = el('agent__msg agent__msg--bot');
          const txt = document.createElement('span');
          const caret = el('agent__caret');
          bot.append(txt, caret);
          typing.replaceWith(bot);
          for (let c = 0; c < ex.a.length; c += 2) {
            txt.textContent = ex.a.slice(0, c + 2);
            await sleep(24);
          }
          caret.remove();
          bot.append(src(ex.s));
          await sleep(3800);
          await ready();
          agent.classList.add('is-clearing');
          await sleep(420);
        }
      })();
    }
  }

  /* ---------- Screenshot lightbox ---------- */
  if (lb && typeof lb.showModal === 'function') {
    const shots = $$('[data-full]');
    const img = $('#lightboxImg');
    const cap = $('#lightboxCap');
    let idx = 0;
    const show = (i) => {
      idx = (i + shots.length) % shots.length;
      const s = shots[idx];
      img.src = s.dataset.full;
      img.alt = s.querySelector('img').alt;
      cap.textContent = s.dataset.caption;
    };
    shots.forEach((s, i) => s.addEventListener('click', () => {
      const slide = s.closest('.ps-slide');
      if (slide && !slide.classList.contains('is-front')) return; // carousel handles side slides
      show(i);
      lb.showModal();
      syncPlay();
    }));
    lb.addEventListener('click', (e) => {
      const act = e.target.closest('[data-lb]')?.dataset.lb;
      if (act === 'close' || e.target === lb) lb.close();
      else if (act === 'prev') show(idx - 1);
      else if (act === 'next') show(idx + 1);
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === BACK) show(idx - 1);
      if (e.key === FWD) show(idx + 1);
    });
    // Closing the lightbox leaves the carousel on the screen you were viewing
    lb.addEventListener('close', () => { if (showcaseGo) showcaseGo(idx); syncPlay(); });
  }
})();

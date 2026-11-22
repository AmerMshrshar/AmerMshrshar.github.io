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

})();

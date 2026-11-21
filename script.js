(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const AR = root.lang === 'ar';
  const T = AR ? {
    openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة', local: 'بالتوقيت المحلي', copied: 'تم نسخ البريد الإلكتروني',
    left: (n) => `متبقٍّ ${n}`, invalid: '✕ أدخل مبلغاً صحيحاً',
    exceeds: (a, t) => `✕ المبلغ ${a} يتجاوز النقد المتوفر (${t})`,
    amount: (a) => `› المبلغ: ${a}`, greedyOk: '✓ وجدت الخوارزمية الجشعة تركيبة صالحة',
    greedyFail: '! الخوارزمية الجشعة وصلت إلى طريق مسدود — الانتقال إلى التراجع (Backtracking)',
    btOk: (s) => `✓ وجد التراجع الحل (فُحصت ${s} حالة)`,
    dispense: (mix, n) => `← الصرف: ${mix} <span class="muted">(${n} أوراق)</span>`,
    none: '✕ لا توجد تركيبة صالحة بالأوراق المتوفرة',
  } : {
    openMenu: 'Open menu', closeMenu: 'Close menu', local: 'local', copied: 'Email copied to clipboard',
    left: (n) => `× ${n} left`, invalid: '✕ enter a positive amount',
    exceeds: (a, t) => `✕ ${a} exceeds cash available (${t})`,
    amount: (a) => `› amount: ${a}`, greedyOk: '✓ greedy found a mix',
    greedyFail: '! greedy dead-ends — switching to backtracking',
    btOk: (s) => `✓ backtracking solved it (${s} states explored)`,
    dispense: (mix, n) => `→ dispense: ${mix}  <span class="muted">(${n} notes)</span>`,
    none: '✕ no valid combination with the notes loaded',
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

  /* ---------- Local clock (Damascus) ---------- */
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Damascus' });
  const updateClock = () => { clock.textContent = `${fmt.format(new Date())} ${T.local}`; };
  updateClock();
  setInterval(updateClock, 20000);

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

  /* ---------- ATM simulator: greedy first, backtracking fallback ---------- */
  const cassettes = [
    { note: 5000, count: 2 },
    { note: 2000, count: 5 },
    { note: 500, count: 3 },
    { note: 200, count: 10 },
  ];
  const cassEl = $('#cassettes');
  const maxCount = Math.max(...cassettes.map((c) => c.count));
  const nf = (n) => n.toLocaleString('en-US');

  const renderCassettes = (take = []) => {
    cassEl.innerHTML = cassettes.map((c, i) => {
      const t = take[i] || 0;
      const left = c.count - t;
      return `<div class="cass${t ? ' is-used' : ''}">
        <b>${nf(c.note)}</b><small>${T.left(left)}</small>
        <div class="bar"><i style="width:${(left / maxCount) * 100}%"></i></div>
        <span class="take">${t ? '−' + t : ''}</span>
      </div>`;
    }).join('');
  };

  const greedy = (amount) => {
    let rem = amount;
    const take = cassettes.map((c) => {
      const n = Math.min(c.count, Math.floor(rem / c.note));
      rem -= n * c.note;
      return n;
    });
    return rem === 0 ? take : null;
  };

  // Depth-first search, trying the largest feasible count first (greedy order)
  // and pruning any branch that can't beat the best mix found so far.
  const backtrack = (amount) => {
    let best = null, bestNotes = Infinity, steps = 0;
    const cur = new Array(cassettes.length).fill(0);
    const dfs = (i, rem, notes) => {
      steps++;
      if (rem === 0) { if (notes < bestNotes) { bestNotes = notes; best = cur.slice(); } return; }
      if (i === cassettes.length || notes >= bestNotes) return;
      const { note, count } = cassettes[i];
      for (let n = Math.min(count, Math.floor(rem / note)); n >= 0; n--) {
        if (notes + n >= bestNotes) continue;
        cur[i] = n;
        dfs(i + 1, rem - n * note, notes + n);
      }
      cur[i] = 0;
    };
    dfs(0, amount, 0);
    return { best, steps };
  };

  const describe = (take) => '<bdi dir="ltr">' + take
    .map((n, i) => (n ? `${n} × ${nf(cassettes[i].note)}` : null))
    .filter(Boolean).join(' + ') + '</bdi>';

  const out = $('#atmOut');
  const dispense = (raw) => {
    const amount = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
    const total = cassettes.reduce((s, c) => s + c.note * c.count, 0);
    if (!amount || amount <= 0) {
      renderCassettes();
      out.innerHTML = `<span class="err">${T.invalid}</span>`;
      return;
    }
    if (amount > total) {
      renderCassettes();
      out.innerHTML = `<span class="err">${T.exceeds(nf(amount), nf(total))}</span>`;
      return;
    }
    const g = greedy(amount);
    const lines = [T.amount(nf(amount))];
    let result;
    if (g) {
      lines.push(`<span class="ok">${T.greedyOk}</span>`);
      result = backtrack(amount).best || g;
    } else {
      lines.push(`<span class="warn">${T.greedyFail}</span>`);
      const b = backtrack(amount);
      result = b.best;
      if (result) lines.push(`<span class="ok">${T.btOk(b.steps)}</span>`);
    }
    if (result) {
      const notes = result.reduce((a, b) => a + b, 0);
      lines.push(T.dispense(describe(result), notes));
      renderCassettes(result);
    } else {
      lines.push(`<span class="err">${T.none}</span>`);
      renderCassettes();
    }
    out.innerHTML = lines.join('<br/>');
  };

  const input = $('#amount');
  $('#atmForm').addEventListener('submit', (e) => { e.preventDefault(); dispense(input.value); });
  $$('.atm__quick button').forEach((b) => b.addEventListener('click', () => {
    input.value = b.dataset.amt;
    dispense(b.dataset.amt);
  }));
  renderCassettes();
  dispense(input.value);
})();

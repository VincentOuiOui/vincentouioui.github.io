/* Deux actes — un rideau, deux univers. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═════════════ LE RIDEAU ═════════════ */
  const curtain = $('#curtain');
  const panels = [$('#panelL'), $('#panelR')];
  const valance = $('#valance');
  const scenes = $('#curtainScenes');

  panels.forEach((p, k) => {
    const folds = $('.curtain__folds', p);
    for (let i = 0; i < 13; i++) {
      const f = document.createElement('i');
      f.style.flex = (0.75 + Math.random() * 0.6).toFixed(2);
      f.style.animationDelay = (-Math.random() * 7).toFixed(2) + 's';
      f.style.animationDuration = (5 + Math.random() * 4).toFixed(2) + 's';
      folds.appendChild(f);
    }
    $('.curtain__text', p).appendChild(scenes.content.cloneNode(true));
  });

  const intro = $('#intro'), entr = $('#entracte'), fin = $('#finale');
  const leader = $('#leader'), leaderNum = $('#leaderNum');
  const finaleUI = $('#finaleUI');
  const top = el => el.getBoundingClientRect().top + scrollY;

  let shown = 0, skew = 0, lastShown = 0, finaleBurst = false;

  function curtainTarget() {
    const y = scrollY, vh = innerHeight;
    const iT = top(intro), eT = top(entr), fT = top(fin);
    const openIntro = clamp((y - iT - vh * .05) / (vh * 1.3));
    const close1 = clamp((y - (eT - vh * .9)) / (vh * .9));
    const reopen = clamp((y - (eT + vh * 1.0)) / (vh * .9));
    const close2 = clamp((y - (fT - vh * .55)) / (vh * .55));
    const open = Math.min(openIntro, clamp(1 - close1 + reopen), 1 - close2);

    // compte à rebours de l'amorce de film
    const cd = clamp((y - (eT + vh * 1.45)) / (vh * .9));
    leader.style.opacity = reopen > 0 ? clamp(reopen * 1.6) * (cd >= 1 ? .35 : 1) : 0;
    const n = cd < 1 / 3 ? 3 : cd < 2 / 3 ? 2 : 1;
    if (leaderNum.textContent !== String(n)) leaderNum.textContent = n;
    leader.style.setProperty('--sweep', ((cd * 3) % 1) * 360 + 'deg');

    let scene = 'intro';
    if (y > (iT + eT) / 2) scene = 'entracte';
    if (y > fT - vh * 1.1) scene = 'fin';
    return { open, scene };
  }

  function renderCurtain() {
    const { open, scene } = curtainTarget();
    shown = reduce ? open : lerp(shown, open, .14);
    if (Math.abs(shown - open) < .0005) shown = open;
    const vel = shown - lastShown; lastShown = shown;
    skew = lerp(skew, clamp(vel * 260, -7, 7), .2);

    const vw = document.documentElement.clientWidth; // largeur visible, barre de défilement exclue
    const wClosed = Math.ceil(vw / 2) + 2;
    const gather = Math.max(54, vw * .085);
    const g = easeInOut(clamp(shown / .78));        // phase 1 : on rassemble le tissu
    const s = easeInOut(clamp((shown - .78) / .22)); // phase 2 : il s'envole hors champ
    const w = lerp(wClosed, gather, g);
    panels.forEach((p, k) => {
      p.style.width = w + "px";
      // le texte reste centré sur l'écran, puis suit le bord du tissu
      const txt = p.children[2];
      txt.style.width = vw + "px";
      txt.style.transform = `translateX(${k === 0 ? w - wClosed : wClosed - vw}px)`;
      const dir = k === 0 ? -1 : 1;
      p.style.transform = `translateX(${dir * s * (gather + 60)}px) skewX(${(k === 0 ? 1 : -1) * -skew}deg)`;
      const tie = $('.curtain__tie', p);
      tie.style.opacity = clamp(g * 1.4 - .3);
      tie.style.transform = `scaleX(${lerp(.6, 1, g)})`;
    });
    valance.style.transform = `translateY(${-s * 115}%)`;
    curtain.style.visibility = shown >= .999 ? 'hidden' : 'visible';
    if (curtain.dataset.scene !== scene) curtain.dataset.scene = scene;

    const finOn = scene === 'fin' && shown < .06;
    finaleUI.classList.toggle('is-on', finOn);
    if (finOn && !finaleBurst) { finaleBurst = true; burst(160); }
    if (scene !== 'fin') finaleBurst = false;
  }

  /* ═════════════ BOUCLE ═════════════ */
  const ticks = [];
  function loop() { renderCurtain(); ticks.forEach(f => f()); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  /* ═════════════ OUVERTURE : projecteur qui suit la souris ═════════════ */
  const spot = $('#spot');
  $('.intro').addEventListener('pointermove', e => {
    spot.style.setProperty('--sx', (e.clientX / innerWidth * 100) + '%');
    spot.style.setProperty('--sy', (e.clientY / innerHeight * 100) + '%');
  });

  /* ═════════════ Reveals + compteurs ═════════════ */
  const countUp = el => {
    const to = +el.dataset.count, t0 = performance.now(), d = 1400;
    const step = t => { const p = clamp((t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: .18 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ═════════════ Monde courant + programme ═════════════ */
  const worlds = $$('main > section');
  const navLinks = $$('.programme a');
  ticks.push(() => {
    const mid = innerHeight * .5;
    let cur = worlds[0];
    for (const s of worlds) if (s.getBoundingClientRect().top <= mid) cur = s;
    const w = cur.dataset.world;
    if (document.body.dataset.world !== w) {
      document.body.dataset.world = w;
      navLinks.forEach(a => a.classList.toggle('is-active', a.dataset.k === w));
    }
  });

  /* ═════════════ ACTE I — tableau d'affichage lié au scroll ═════════════ */
  const stadium = $('#acte1'), clock = $('#clock'), sH = $('#scoreH'), sA = $('#scoreA');
  const goalsH = [12, 47, 78], goalsA = [33, 64];
  ticks.push(() => {
    const r = stadium.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    const m = p * 90;
    const mm = Math.floor(m), ss = Math.floor((m - mm) * 60);
    const txt = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    if (clock.textContent !== txt) clock.textContent = txt;
    const h = goalsH.filter(g => m >= g).length, a = goalsA.filter(g => m >= g).length;
    if (sH.textContent != h) sH.textContent = h;
    if (sA.textContent != a) sA.textContent = a;
  });

  /* ═════════════ Classement live ═════════════ */
  const players = [
    { n: 'Vincent', c: '#3b82f6' }, { n: 'Pierrot', c: '#ef4444' }, { n: 'Saoud', c: '#10b981' },
    { n: 'Franck', c: '#f59e0b' }, { n: 'Alice', c: '#a855f7' }, { n: 'Carl', c: '#ec4899' },
  ].map(p => ({ ...p, j: 0, pts: 0, gf: 0, ga: 0 }));
  const body = $('#standingsBody');
  players.forEach(p => {
    p.el = document.createElement('li');
    p.el.innerHTML = `<span class="pos"></span><span class="name"><span class="av" style="background:${p.c}">${p.n[0]}</span>${p.n}</span><span class="j"></span><span class="diff"></span><span class="pts"></span>`;
    body.appendChild(p.el);
  });
  const sortP = () => players.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.n.localeCompare(b.n));
  function paint() {
    players.forEach((p, i) => {
      p.el.querySelector('.pos').textContent = i + 1;
      p.el.querySelector('.j').textContent = p.j;
      const d = p.gf - p.ga;
      p.el.querySelector('.diff').textContent = (d > 0 ? '+' : '') + d;
      p.el.querySelector('.pts').textContent = p.pts;
    });
  }
  sortP(); paint();
  const tick = $('#ticker'), tickT = $('#tickerText');
  function playMatch() {
    const [a, b] = [...players].sort(() => Math.random() - .5);
    const ga = Math.floor(Math.random() * 5), gb = Math.floor(Math.random() * 4);
    a.j++; b.j++; a.gf += ga; a.ga += gb; b.gf += gb; b.ga += ga;
    if (ga > gb) a.pts += 3; else if (gb > ga) b.pts += 3; else { a.pts++; b.pts++; }
    // FLIP
    const before = new Map(players.map(p => [p, p.el.getBoundingClientRect().top]));
    sortP(); players.forEach(p => body.appendChild(p.el)); paint();
    players.forEach(p => {
      const dy = before.get(p) - p.el.getBoundingClientRect().top;
      if (dy) p.el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
    [a, b].forEach(p => { p.el.classList.remove('bump'); void p.el.offsetWidth; p.el.classList.add('bump'); });
    tickT.textContent = `${a.n} ${ga} – ${gb} ${b.n}`;
    tick.classList.remove('flash'); void tick.offsetWidth; tick.classList.add('flash');
  }
  let stTimer = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !stTimer) { playMatch(); stTimer = setInterval(playMatch, 2300); }
    else if (!e.isIntersecting && stTimer) { clearInterval(stTimer); stTimer = null; }
  }, { threshold: .4 }).observe($('#standings'));

  /* ═════════════ La roue ═════════════ */
  const cv = $('#wheel'), cx = cv.getContext('2d');
  const teams = ['Pays-Bas', 'France', 'Allemagne', 'Portugal', 'Espagne', 'Italie', 'Angleterre', 'Brésil'];
  const cols = ['#9a91c4', '#82598a', '#7189d0', '#8ab06c', '#cfa577', '#7f9d96', '#ae7b78', '#c9b458'];
  const seg = Math.PI * 2 / teams.length;
  let rot = 0, spinning = false;
  function drawWheel() {
    const W = cv.width, R = W / 2;
    cx.clearRect(0, 0, W, W);
    teams.forEach((t, i) => {
      const a0 = rot + i * seg;
      cx.beginPath(); cx.moveTo(R, R); cx.arc(R, R, R - 2, a0, a0 + seg); cx.closePath();
      cx.fillStyle = cols[i]; cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 2; cx.stroke();
      cx.save(); cx.translate(R, R); cx.rotate(a0 + seg / 2);
      cx.fillStyle = '#fff'; cx.font = '700 24px Inter, sans-serif'; cx.textAlign = 'right'; cx.textBaseline = 'middle';
      cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 4;
      cx.fillText(t, R - 26, 0); cx.restore();
    });
    const g = cx.createRadialGradient(R, R, R * .2, R, R, R);
    g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(.35, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(R, R, R, 0, Math.PI * 2); cx.fill();
  }
  drawWheel();
  const spinBtn = $('#spin'), drawVal = $('#drawResult .draw__val');
  spinBtn.addEventListener('click', () => {
    if (spinning) return;
    spinning = true; spinBtn.disabled = true;
    const from = rot, to = rot + Math.PI * 2 * (5 + Math.random() * 3) + Math.random() * Math.PI * 2;
    const t0 = performance.now(), d = reduce ? 10 : 4600;
    drawVal.textContent = '…';
    const step = t => {
      const p = clamp((t - t0) / d);
      rot = from + (to - from) * (1 - Math.pow(1 - p, 4));
      drawWheel();
      if (p < 1) return requestAnimationFrame(step);
      const a = ((-Math.PI / 2 - rot) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
      const team = teams[Math.floor(a / seg)];
      const stars = [3, 3.5, 4, 4.5, 5][Math.floor(Math.random() * 5)];
      const s = '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '');
      drawVal.innerHTML = `<span class="stars">${s}</span>${team}`;
      spinning = false; spinBtn.disabled = false;
    };
    requestAnimationFrame(step);
  });

  /* ═════════════ Bracket ═════════════ */
  const svg = $('#bracket'), NS = 'http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox', '0 0 1000 440');
  const mk = (tag, attrs, parent = svg) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };
  const box = (x, y, w, a, sa, b, sb, cls) => {
    const g = mk('g', { class: 'box ' + cls, transform: `translate(${x} ${y})` });
    mk('rect', { width: w, height: 64, rx: 10 }, g);
    const aw = sa > sb;
    mk('text', { x: 14, y: 26, class: aw ? 'win' : '' }, g).textContent = a;
    mk('text', { x: w - 14, y: 26, 'text-anchor': 'end', class: 'sc' + (aw ? ' win' : '') }, g).textContent = sa;
    mk('text', { x: 14, y: 51, class: aw ? '' : 'win' }, g).textContent = b;
    mk('text', { x: w - 14, y: 51, 'text-anchor': 'end', class: 'sc' + (aw ? '' : ' win') }, g).textContent = sb;
    return g;
  };
  const wire = (d, cls) => mk('path', { d, class: 'wire ' + cls, pathLength: 1 });
  [[10, 'Vincent', 3, 'Saoud', 1], [120, 'Franck', 1, 'Pierrot', 2], [256, 'Alice', 4, 'Dana', 0], [366, 'Bob', 1, 'Carl', 3]]
    .forEach(([y, a, sa, b, sb]) => box(0, y, 230, a, sa, b, sb, 'qf'));
  wire('M230 42 H280 V97 H330', 'w1'); wire('M230 152 H280 V97 H330', 'w1');
  wire('M230 288 H280 V343 H330', 'w1'); wire('M230 398 H280 V343 H330', 'w1');
  box(330, 65, 230, 'Vincent', 2, 'Pierrot', 1, 'sf'); box(330, 311, 230, 'Alice', 1, 'Carl', 2, 'sf');
  wire('M560 97 H610 V220 H660', 'w2'); wire('M560 343 H610 V220 H660', 'w2');
  box(660, 188, 210, 'Vincent', 3, 'Carl', 2, 'fi');
  wire('M870 220 H900', 'w3');
  const cup = mk('text', { x: 945, y: 238, 'text-anchor': 'middle', class: 'cup' }); cup.textContent = '🏆';
  const champ = mk('text', { x: 945, y: 290, 'text-anchor': 'middle', class: 'champ' }); champ.textContent = 'Vincent';

  /* ═════════════ GSAP : tout ce qui se scrube ═════════════ */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to('.chalk *', { strokeDashoffset: 0, ease: 'none', stagger: .08,
      scrollTrigger: { trigger: '#acte1', start: 'top 80%', end: 'top -60%', scrub: 1 } });

    const ball = $('#ball');
    ScrollTrigger.create({ trigger: '#timeline', start: 'top 75%', end: 'bottom 45%', scrub: true,
      onUpdate: s => { ball.style.left = s.progress * 100 + '%'; ball.style.setProperty('--rot', s.progress * 1080 + 'deg'); } });

    const btl = gsap.timeline({ scrollTrigger: { trigger: '#bracketWrap', start: 'top 70%', end: 'bottom 70%', scrub: 1 } });
    btl.add(() => {}, 0)
      .to('.bracket .qf', { opacity: 1, stagger: .1, duration: .4 }, 0)
      .to('.bracket .w1', { strokeDashoffset: 0, duration: .6, stagger: .05 }, .4)
      .to('.bracket .sf', { opacity: 1, duration: .3, stagger: .1 }, 1)
      .to('.bracket .w2', { strokeDashoffset: 0, duration: .6 }, 1.3)
      .to('.bracket .fi', { opacity: 1, duration: .3 }, 1.9)
      .to('.bracket .w3', { strokeDashoffset: 0, duration: .3 }, 2.2)
      .fromTo('.bracket .cup', { opacity: 0, scale: .2, rotate: -30 }, { opacity: 1, scale: 1, rotate: 0, duration: .5, ease: 'back.out(2)' }, 2.4)
      .to('.bracket .champ', { opacity: 1, duration: .3 }, 2.7);

    // galerie en parallaxe
    if (innerWidth > 900) {
      [['.shot--a', -60], ['.shot--b', 90], ['.shot--c', 40], ['.shot--d', -90]].forEach(([s, y]) =>
        gsap.fromTo(s, { y: -y / 2 }, { y, ease: 'none', scrollTrigger: { trigger: '#tGallery', start: 'top bottom', end: 'bottom top', scrub: true } }));
    }

    gsap.to('.reel__beam', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#reel', start: 'top 80%', end: 'top 35%', scrub: true } });

    // pellicule horizontale
    const track = $('#filmTrack');
    const dist = () => Math.max(0, track.scrollWidth + track.getBoundingClientRect().left - scrollX - innerWidth + 40);
    gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#filmstrip', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });

    addEventListener('load', () => ScrollTrigger.refresh());
  }

  // la frame la plus centrée de la pellicule fait le point
  const frames = $$('.frame');
  ticks.push(() => {
    let best = null, bd = Infinity;
    frames.forEach(f => { const r = f.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const d = Math.abs(r.left + r.width / 2 - innerWidth / 2); if (d < bd) { bd = d; best = f; } });
    frames.forEach(f => f.classList.toggle('focus', f === best && bd < innerWidth * .2));
  });

  /* ═════════════ ACTE II — enseigne lumineuse ═════════════ */
  const marquee = $('#marquee');
  function bulbs() {
    $$('.bulb', marquee).forEach(b => b.remove());
    const r = marquee.getBoundingClientRect(), gap = 22;
    const pts = [];
    const nx = Math.round(r.width / gap), ny = Math.round(r.height / gap);
    for (let i = 0; i < nx; i++) pts.push([i / nx * 100, 0]);
    for (let i = 0; i < ny; i++) pts.push([100, i / ny * 100]);
    for (let i = nx; i > 0; i--) pts.push([i / nx * 100, 100]);
    for (let i = ny; i > 0; i--) pts.push([0, i / ny * 100]);
    pts.forEach(([x, y], i) => {
      const b = document.createElement('span'); b.className = 'bulb';
      b.style.left = `calc(${x}% )`; b.style.top = `calc(${y}% )`;
      b.style.animationDelay = (-(i % 3) * .4) + 's';
      marquee.appendChild(b);
    });
  }
  bulbs(); addEventListener('resize', () => { clearTimeout(bulbs.t); bulbs.t = setTimeout(bulbs, 200); });

  /* ═════════════ L'écran : lampe torche ═════════════ */
  const screen = $('#screen');
  let rTarget = 0, rNow = 0;
  screen.addEventListener('pointermove', e => {
    const r = screen.getBoundingClientRect();
    screen.style.setProperty('--x', e.clientX - r.left + 'px');
    screen.style.setProperty('--y', e.clientY - r.top + 'px');
    rTarget = Math.max(110, r.width * .17);
  });
  screen.addEventListener('pointerleave', () => rTarget = 0);
  screen.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') rTarget = Math.max(110, screen.offsetWidth * .2); });
  screen.addEventListener('click', () => screen.classList.toggle('is-lit'));
  ticks.push(() => { rNow = lerp(rNow, rTarget, .15); screen.style.setProperty('--r', rNow.toFixed(1) + 'px'); });

  const guess = $('#guess'), msg = $('#guessMsg');
  guess.addEventListener('submit', e => {
    e.preventDefault();
    const [a, b] = $$('input', guess).map(i => i.value.trim());
    if (!a || !b) { msg.textContent = 'Deux titres, pas un de moins. C’est tout le principe.'; return; }
    guess.classList.remove('wizz'); void guess.offsetWidth; guess.classList.add('wizz');
    msg.textContent = 'Wizz ! Ici ce n’est qu’une bande-annonce : la vraie séance (et la réponse) se joue sur 2things1pic.com.';
  });

  /* ═════════════ Final : confettis & rappel ═════════════ */
  const cf = $('#confetti'), cc = cf.getContext('2d');
  let parts = [], running = false;
  const size = () => { cf.width = innerWidth * devicePixelRatio; cf.height = innerHeight * devicePixelRatio; };
  size(); addEventListener('resize', size);
  function burst(n = 120) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const rose = Math.random() < .3;
      parts.push({
        x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .6, y: innerHeight + 20,
        vx: (Math.random() - .5) * 9, vy: -(10 + Math.random() * 12),
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
        w: rose ? 12 : 6 + Math.random() * 6, h: rose ? 9 : 10 + Math.random() * 8,
        c: rose ? ['#b3142b', '#d81e3c', '#8a0a1c'][i % 3] : ['#f7c948', '#ffe08a', '#e6b62b', '#fff3c4'][i % 4], rose, life: 0,
      });
    }
    if (!running) { running = true; requestAnimationFrame(drawParts); }
  }
  function drawParts() {
    const d = devicePixelRatio;
    cc.setTransform(d, 0, 0, d, 0, 0); cc.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => {
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cc.save(); cc.translate(p.x, p.y); cc.rotate(p.r); cc.scale(1, Math.cos(p.life * .15));
      cc.fillStyle = p.c;
      if (p.rose) { cc.beginPath(); cc.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); cc.fill(); }
      else cc.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cc.restore();
    });
    parts = parts.filter(p => p.y < innerHeight + 60 || p.vy < 0);
    if (parts.length) requestAnimationFrame(drawParts); else { running = false; cc.clearRect(0, 0, innerWidth, innerHeight); }
  }
  $('#applause').addEventListener('click', () => burst(140));
  $('#encore').addEventListener('click', () => { shown = 0; scrollTo({ top: 0, behavior: 'instant' }); });
})();

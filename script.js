document.addEventListener('DOMContentLoaded', () => {

    // ── LENIS SMOOTH SCROLL ──────────────────────────────────
    const lenis = new Lenis({
        duration: 1.4,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true, smoothTouch: false, touchMultiplier: 2,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // ── PRELOADER ────────────────────────────────────────────
    const preloader = document.getElementById('preloader');
    const preName = document.getElementById('pre-name');
    const preBar = document.getElementById('pre-bar');
    const preSub = document.getElementById('pre-sub');

    if (preloader && preName) {
        const preTl = gsap.timeline({
            onComplete: () => {
                // Wipe preloader out with clip-path
                gsap.to(preloader, {
                    clipPath: 'inset(0 0 100% 0)',
                    duration: 0.9,
                    ease: 'power4.inOut',
                    onComplete: () => { preloader.style.display = 'none'; }
                });
                // Simultaneously kick off hero entrance
                heroEntrance();
            }
        });

        preTl
            .to(preName, { y: '0%', duration: 0.9, ease: 'power4.out', delay: 0.2 })
            .to(preBar, { width: '180px', duration: 0.7, ease: 'power3.inOut' }, '-=0.3')
            .to(preSub, { color: 'rgba(56,189,248,0.8)', duration: 0.5, ease: 'power2.out' }, '-=0.1')
            .to(preName, { letterSpacing: '0.1em', opacity: 0.3, duration: 0.4, ease: 'power2.in' }, '+=0.4')
            .to([preBar, preSub], { opacity: 0, duration: 0.3 }, '-=0.2');
    } else {
        heroEntrance();
    }

    // ── HERO ENTRANCE ────────────────────────────────────────
    function heroEntrance() {
        const tl = gsap.timeline();

        tl.from('.nav-item', {
            y: -30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power4.out'
        });

        if (document.querySelector('.hero-title')) {
            tl.from('.hero-pill', { y: 40, opacity: 0, duration: 0.8, ease: 'power4.out' }, '-=0.4')
                .from('.title-word', { y: 120, rotation: 4, stagger: 0.12, duration: 1.1, ease: 'power4.out' }, '-=0.5')
                .from('.desc-line', { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' }, '-=0.7')
                .from('.hero-tags span', { y: 25, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' }, '-=0.5')
                .from('.hero-btns a, .hero-btns button', { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power4.out' }, '-=0.5');

            // Floating code decorations in hero
            injectCodeDecorations();
        } else if (document.querySelector('.page-title')) {
            tl.from('.page-element', { y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out' }, '-=0.4')
                .from('.title-span', { y: 120, rotation: 4, stagger: 0.12, duration: 1.1, ease: 'power4.out' }, '-=0.5')
                .from('.page-desc, .desc-line', { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' }, '-=0.7');
        }

        if (document.querySelector('.scroll-indicator')) {
            tl.from('.scroll-indicator', { opacity: 0, y: -20, duration: 1, ease: 'power2.out' }, '-=0.3');
            gsap.to('.scroll-indicator .w-\\[1px\\]', {
                scaleY: 0.3, transformOrigin: 'top center',
                repeat: -1, yoyo: true, duration: 1.5, ease: 'sine.inOut'
            });
        }
    }

    // ── FLOATING CODE DECORATIONS (hero bg) ──────────────────
    function injectCodeDecorations() {
        const hero = document.querySelector('section') || document.body;
        const snippets = [
            'const het = new Founder()',
            '() => ship(faster)',
            'git commit -m "🚀"',
            'build({ iot: true })',
            'async function dream()',
            '// TODO: change world',
            'npm run deploy',
            'if (vision) execute()',
        ];
        const positions = [
            { top: '15%', left: '5%', delay: 0 },
            { top: '25%', right: '4%', delay: 2 },
            { top: '60%', left: '3%', delay: 4 },
            { top: '70%', right: '6%', delay: 6 },
            { top: '40%', left: '8%', delay: 1.5 },
        ];
        positions.forEach((pos, i) => {
            const el = document.createElement('div');
            el.className = 'code-float hidden md:block';
            el.textContent = snippets[i % snippets.length];
            if (pos.delay) el.style.animationDelay = pos.delay + 's';
            Object.assign(el.style, pos);
            hero.style.position = 'relative';
            hero.appendChild(el);
        });
    }

    // ── MOUSE PARALLAX (hero layers) ─────────────────────────
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isTouchDevice) {
        document.addEventListener('mousemove', e => {
            const cx = (e.clientX / window.innerWidth - 0.5);
            const cy = (e.clientY / window.innerHeight - 0.5);

            // Orbs
            const orbs = document.querySelectorAll('.orb');
            if (orbs[0]) gsap.to(orbs[0], { x: cx * 160, y: cy * 160, duration: 3, ease: 'sine.out' });
            if (orbs[1]) gsap.to(orbs[1], { x: cx * -130, y: cy * -130, duration: 4, ease: 'sine.out' });
            if (orbs[2]) gsap.to(orbs[2], { x: cx * 90, y: cy * -90, duration: 2.5, ease: 'sine.out' });

            // Hero text layers at different speeds
            gsap.to('.hero-title', { x: cx * 12, y: cy * 8, duration: 1.2, ease: 'power1.out' });
            gsap.to('.hero-pill', { x: cx * 20, y: cy * 14, duration: 1.4, ease: 'power1.out' });
            gsap.to('.code-float', { x: cx * 28, y: cy * 20, duration: 1.8, ease: 'power1.out' });
        });
    }

    // ── CUSTOM CURSOR ────────────────────────────────────────
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;

    if (!isTouchDevice && cursor && cursorDot) {
        document.addEventListener('mousemove', e => {
            mouseX = e.clientX; mouseY = e.clientY;
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });
        (function moveCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            requestAnimationFrame(moveCursor);
        })();

        document.addEventListener('mousedown', () => { cursor.style.width = '1.5rem'; cursor.style.height = '1.5rem'; cursor.style.backgroundColor = 'rgba(56,189,248,0.2)'; });
        document.addEventListener('mouseup', () => { cursor.style.width = '1.25rem'; cursor.style.height = '1.25rem'; cursor.style.backgroundColor = 'transparent'; });

        document.querySelectorAll('a, button, .bento-card, .magnetic').forEach(el => {
            el.addEventListener('mouseenter', () => { cursor.style.width = '3rem'; cursor.style.height = '3rem'; cursor.style.borderColor = 'rgba(124,58,237,1)'; cursor.style.backgroundColor = 'rgba(124,58,237,0.05)'; });
            el.addEventListener('mouseleave', () => { cursor.style.width = '1.25rem'; cursor.style.height = '1.25rem'; cursor.style.borderColor = 'rgba(56,189,248,1)'; cursor.style.backgroundColor = 'transparent'; });
        });
    }

    // ── MAGNETIC BUTTONS ─────────────────────────────────────
    document.querySelectorAll('.magnetic').forEach(el => {
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top - r.height / 2;
            gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.6, ease: 'power3.out' });
        });
        el.addEventListener('mouseleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.3)' });
        });
    });

    // ── SCROLL-TRIGGERED SECTION REVEALS ─────────────────────

    // Section titles
    if (document.querySelector('.section-title')) {
        gsap.from('.section-title .title-span', {
            scrollTrigger: { trigger: document.querySelector('.section-title').parentElement, start: 'top 80%', toggleActions: 'play none none reverse' },
            y: 100, rotation: 3, stagger: 0.1, duration: 1, ease: 'power4.out'
        });
    }

    // Generic scroll-reveal elements
    gsap.utils.toArray('.scroll-reveal').forEach(el => {
        gsap.from(el, {
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
            y: 50, opacity: 0, duration: 1, ease: 'power3.out'
        });
    });

    // Bento / startup cards with stagger
    gsap.utils.toArray('.bento-card, .startup-card').forEach((card, i) => {
        const icon = card.querySelector('.card-icon') || card.querySelector('svg');
        const content = card.querySelector('.card-content') || card.querySelector('h2')?.parentElement;

        const tl = gsap.timeline({
            scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none reverse' }
        });
        tl.from(card, { y: 70, opacity: 0, scale: 0.96, duration: 0.9, ease: 'circ.out', delay: i * 0.08 });
        if (icon) tl.from(icon, { scale: 0, rotation: -45, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.6');
        if (content) tl.from(content, { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');
    });

    // Contact section
    if (document.querySelector('#contact')) {
        const tl = gsap.timeline({
            scrollTrigger: { trigger: '#contact', start: 'top 70%', toggleActions: 'play none none reverse' }
        });
        tl.from('#contact .title-span', { y: 100, rotation: 5, stagger: 0.15, duration: 1.2, ease: 'power4.out' })
            .from('.contact-desc', { y: 50, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.8')
            .from('.contact-btn', { scale: 0.8, opacity: 0, y: 40, duration: 1, ease: 'elastic.out(1,0.5)' }, '-=0.6');
    }

    // ── 3D CARD TILT ─────────────────────────────────────────
    if (!isTouchDevice) {
        document.querySelectorAll('.bento-card, .magnetic-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                card.style.transition = 'none';
                const r = card.getBoundingClientRect();
                const rX = ((e.clientY - r.top - r.height / 2) / r.height) * -4;
                const rY = ((e.clientX - r.left - r.width / 2) / r.width) * 4;
                card.style.transform = `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.02,1.02,1.02)`;
            });
            card.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.1s cubic-bezier(0.23,1,0.32,1)'; });
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1)';
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
            });
        });
    }

    // ── SCROLL PROGRESS BAR ──────────────────────────────────
    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,#7c3aed,#38bdf8);z-index:9998;width:0%;transition:width 0.1s linear;';
    document.body.appendChild(progressBar);
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        progressBar.style.width = (scrolled * 100) + '%';
    }, { passive: true });

    // ── TEXT SCRAMBLE on section headers ─────────────────────
    function scrambleText(el, finalText) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
        let frame = 0, iterations = 0;
        const interval = setInterval(() => {
            el.textContent = finalText.split('').map((char, i) => {
                if (i < iterations) return finalText[i];
                return char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            if (iterations >= finalText.length) clearInterval(interval);
            if (frame++ % 3 === 0) iterations++;
        }, 30);
    }

    document.querySelectorAll('[data-scramble]').forEach(el => {
        const text = el.textContent.trim();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) { scrambleText(el, text); observer.disconnect(); }
            });
        }, { threshold: 0.5 });
        observer.observe(el);
    });

    // ── LIVE EXPERIENCE COUNTER ──────────────────────────────
    function updateExpCounter() {
        const start = new Date('2020-11-15T00:00:00');
        const now = new Date();
        let diff = now - start;

        const S = 1000, M = S * 60, H = M * 60, D = H * 24;
        const MON = D * 30.4375;
        const YEAR = D * 365.25;

        const years = Math.floor(diff / YEAR); diff -= years * YEAR;
        const months = Math.floor(diff / MON); diff -= months * MON;
        const days = Math.floor(diff / D); diff -= days * D;
        const hours = Math.floor(diff / H); diff -= hours * H;
        const mins = Math.floor(diff / M); diff -= mins * M;
        const secs = Math.floor(diff / S);

        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('exp-years', years); s('exp-months', months); s('exp-days', days);
        s('exp-hours', hours); s('exp-mins', mins); s('exp-secs', secs);
    }
    if (document.getElementById('exp-secs')) {
        updateExpCounter();
        setInterval(updateExpCounter, 1000);
    }

});

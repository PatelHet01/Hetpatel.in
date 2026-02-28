document.addEventListener('DOMContentLoaded', () => {

    // --- Lenis Smooth Scroll ---
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- GSAP Setup ---
    gsap.registerPlugin(ScrollTrigger);

    // Connect Lenis with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // --- Custom Cursor ---
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    if (!isTouchDevice && cursor && cursorDot) {
        // Smooth cursor follow using lerp
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Instant dot update
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });

        // Loop for outer ring interpolation
        function moveCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            requestAnimationFrame(moveCursor);
        }
        moveCursor();

        document.addEventListener('mousedown', () => {
            cursor.style.width = '1.5rem';
            cursor.style.height = '1.5rem';
            cursor.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
        });

        document.addEventListener('mouseup', () => {
            cursor.style.width = '1.25rem';
            cursor.style.height = '1.25rem';
            cursor.style.backgroundColor = 'transparent';
        });

        // Hover effect for interactive elements
        const interactiveElements = document.querySelectorAll('a, button, .bento-card, .magnetic');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.width = '3rem';
                cursor.style.height = '3rem';
                cursor.style.borderColor = 'rgba(124, 58, 237, 1)'; // Brand purple
                cursor.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
            });
            el.addEventListener('mouseleave', () => {
                cursor.style.width = '1.25rem';
                cursor.style.height = '1.25rem';
                cursor.style.borderColor = 'rgba(56, 189, 248, 1)'; // Brand accent
                cursor.style.backgroundColor = 'transparent';
            });
        });
    }

    // --- Magnetic Buttons Effect ---
    const magneticEls = document.querySelectorAll('.magnetic');
    magneticEls.forEach((el) => {
        el.addEventListener('mousemove', function (e) {
            const position = el.getBoundingClientRect();
            const x = e.clientX - position.left - position.width / 2;
            const y = e.clientY - position.top - position.height / 2;

            gsap.to(el, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.6,
                ease: "power3.out"
            });
        });

        el.addEventListener('mouseleave', function () {
            gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });

    // --- Interactive Background Orbs ---
    const orbs = document.querySelectorAll('.orb');
    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth - 0.5;
            const y = e.clientY / window.innerHeight - 0.5;

            gsap.to(orbs[0], { x: x * 150, y: y * 150, duration: 3, ease: "sine.out" });
            gsap.to(orbs[1], { x: x * -120, y: y * -120, duration: 4, ease: "sine.out" });
            gsap.to(orbs[2], { x: x * 80, y: y * -80, duration: 2.5, ease: "sine.out" });
        });
    }

    // --- Initial Entrance Sequence ---
    const masterTl = gsap.timeline();

    // Nav Items
    masterTl.from(".nav-item", {
        y: -30,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: "power4.out",
        delay: 0.2
    })

    // Abstracted page specific reveals
    if (document.querySelector('.hero-title')) {
        // Index Page Specifics
        masterTl.from(".hero-pill", {
            y: 40, opacity: 0, duration: 1, ease: "power4.out"
        }, "-=0.6")
            .from(".title-word", {
                y: 150, rotation: 5, stagger: 0.15, duration: 1.2, ease: "power4.out"
            }, "-=0.6")
            .from(".desc-line", {
                y: 50, opacity: 0, stagger: 0.15, duration: 1, ease: "power3.out"
            }, "-=0.8")
            .from(".hero-tags span", {
                y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out"
            }, "-=0.6")
            .from(".hero-btns a", {
                y: 50, opacity: 0, stagger: 0.15, duration: 1, ease: "power4.out"
            }, "-=0.6");
    } else if (document.querySelector('.page-title')) {
        // Sub-pages Specifics (Startups / Details)
        masterTl.from(".page-element", {
            y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: "power3.out"
        }, "-=0.6")
            .from(".title-span", {
                y: 150, rotation: 5, stagger: 0.15, duration: 1.2, ease: "power4.out"
            }, "-=0.6")
            .from(".page-desc, .desc-line", {
                y: 50, opacity: 0, stagger: 0.15, duration: 1, ease: "power3.out"
            }, "-=0.8");
    }

    // Scroll Indicator
    if (document.querySelector(".scroll-indicator")) {
        masterTl.from(".scroll-indicator", {
            opacity: 0, y: -20, duration: 1, ease: "power2.out"
        }, "-=0.4");

        gsap.to(".scroll-indicator .w-\\[1px\\]", {
            scaleY: 0.3, transformOrigin: "top center", repeat: -1, yoyo: true, duration: 1.5, ease: "sine.inOut"
        });
    }

    // --- Bento Grid / Startup Cards Scroll Animations ---
    const bentoCards = gsap.utils.toArray('.bento-card, .startup-card');

    // Animate Section Title First
    if (document.querySelector(".section-title")) {
        gsap.from(".section-title .title-span", {
            scrollTrigger: {
                trigger: document.querySelector(".section-title").parentElement,
                start: "top 80%",
                toggleActions: "play none none reverse"
            },
            y: 100, rotation: 3, stagger: 0.1, duration: 1, ease: "power4.out"
        });
    }

    // Animate Generic Reveal Elements
    const revealElements = gsap.utils.toArray('.scroll-reveal');
    revealElements.forEach((el) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            y: 50, opacity: 0, duration: 1, ease: "power3.out"
        });
    });

    // Animate Cards with stagger
    bentoCards.forEach((card, i) => {
        const icon = card.querySelector('.card-icon') || card.querySelector('svg');
        const content = card.querySelector('.card-content') || card.querySelector('h2').parentElement;

        const cardTl = gsap.timeline({
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
                toggleActions: "play none none reverse"
            }
        });

        cardTl.from(card, {
            y: 80, opacity: 0, scale: 0.95, duration: 1, ease: "circ.out", delay: i * 0.1
        });

        if (icon) {
            cardTl.from(icon, {
                scale: 0, rotation: -45, opacity: 0, duration: 0.6, ease: "back.out(1.7)"
            }, "-=0.6");
        }

        if (content) {
            cardTl.from(content, {
                y: 20, opacity: 0, duration: 0.6, ease: "power2.out"
            }, "-=0.4");
        }
    });

    // --- Footer/Contact Section Animation ---
    if (document.querySelector("#contact")) {
        const contactTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#contact",
                start: "top 70%",
                toggleActions: "play none none reverse"
            }
        });

        contactTl.from("#contact .title-span", {
            y: 100, rotation: 5, stagger: 0.15, duration: 1.2, ease: "power4.out"
        })
            .from(".contact-desc", {
                y: 50, opacity: 0, duration: 1, ease: "power3.out"
            }, "-=0.8")
            .from(".contact-btn", {
                scale: 0.8, opacity: 0, y: 40, duration: 1, ease: "elastic.out(1, 0.5)"
            }, "-=0.6");
    }

    // --- 3D Tilt Effect ---
    const tiltCards = document.querySelectorAll('.bento-card, .magnetic-card');
    if (!isTouchDevice && tiltCards.length > 0) {
        tiltCards.forEach(card => {
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });

            card.addEventListener('mousemove', e => {
                card.style.transition = 'none';
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -3;
                const rotateY = ((x - centerX) / centerX) * 3;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseenter', () => {
                card.style.transition = 'transform 0.1s cubic-bezier(0.23, 1, 0.32, 1)';
            });
        });
    }
});

import { prefersReducedMotion, smoothScrollToElement } from './environment.js';

const starsCard = document.getElementById('tale-stars');
const modeToggle = document.getElementById('tale-mode-toggle');
const guideCursor = document.getElementById('guide-cursor');

let guideTimeouts = [];
let guideRunning = false;
let guidePlayed = false;
let guideViewTimer = null;
let cursorX = 0;
let cursorY = 0;
let scrollingClassTimer = null;

function updateAmbient() {
    const gold = starsCard &&
        starsCard.classList.contains('visible') &&
        starsCard.classList.contains('plus-mode');
    document.body.classList.toggle('gold-ambient', gold);
}

function flyIconToHeader(sourceImage) {
    const headerLogo = document.querySelector('.tale-logo img');
    if (!sourceImage || !headerLogo || !sourceImage.animate) return;
    const startBounds = sourceImage.getBoundingClientRect();
    const targetBounds = headerLogo.getBoundingClientRect();
    if (!startBounds.width || !targetBounds.width) return;

    const clone = sourceImage.cloneNode(false);
    clone.removeAttribute('class');
    clone.style.cssText =
        'position:fixed;left:' + startBounds.left + 'px;top:' + startBounds.top + 'px;' +
        'width:' + startBounds.width + 'px;height:' + startBounds.height + 'px;' +
        'border-radius:10px;z-index:2000;pointer-events:none;display:block;will-change:transform;';
    document.body.appendChild(clone);

    const deltaX = (targetBounds.left + targetBounds.width / 2) - (startBounds.left + startBounds.width / 2);
    const deltaY = (targetBounds.top + targetBounds.height / 2) - (startBounds.top + startBounds.height / 2);
    const scale = targetBounds.width / startBounds.width;

    const flightAnimation = clone.animate([
        { transform: 'perspective(600px) translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg) scale(1)',
          opacity: 1 },
        { transform: 'perspective(600px) translate3d(' + deltaX * 0.35 + 'px, ' + (deltaY * 0.45 - 26) + 'px, 200px) rotateY(180deg) rotateX(25deg) scale(1.4)',
          opacity: 1, offset: 0.5 },
        { transform: 'perspective(600px) translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0) rotateY(360deg) rotateX(0deg) scale(' + scale + ')',
          opacity: 0.7 }
    ], { duration: 540, easing: 'cubic-bezier(0.4, 0.05, 0.45, 0.95)' });

    flightAnimation.onfinish = () => {
        clone.remove();
        if (headerLogo.animate) {
            headerLogo.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.3)' },
                { transform: 'scale(1)' }
            ], { duration: 320, easing: 'ease-out' });
        }
    };
}

function setStarsMode(enablePlusMode) {
    if (starsCard.classList.contains('plus-mode') === enablePlusMode) return;

    const reduceMotion = prefersReducedMotion();

    if (!reduceMotion && enablePlusMode) {
        flyIconToHeader(starsCard.querySelector('.mode-icon-free'));
    }

    const actionButtons = starsCard.querySelectorAll('.product-actions > *');
    const firstBounds = [];
    actionButtons.forEach((button) => { firstBounds.push(button.getBoundingClientRect()); });

    starsCard.classList.toggle('plus-mode', enablePlusMode);
    updateAmbient();

    if (enablePlusMode) {
        const features = starsCard.querySelectorAll('.product-desc-plus .desc-feat');
        features.forEach((feature) => { feature.style.animation = 'none'; });
        void starsCard.offsetWidth;
        features.forEach((feature) => { feature.style.animation = ''; });
    }

    if (reduceMotion) return;

    let stagger = 0;
    actionButtons.forEach((button, index) => {
        if (!button.animate) return;
        const lastBounds = button.getBoundingClientRect();
        if (!firstBounds[index].width || !lastBounds.width) return;
        const deltaX = firstBounds[index].left - lastBounds.left;
        const deltaY = firstBounds[index].top - lastBounds.top;
        if (!deltaX && !deltaY) return;
        const direction = deltaX >= 0 ? -1 : 1;
        button.animate([
            { transform: 'translate(' + deltaX + 'px, ' + deltaY + 'px) rotate(0deg) skewX(0deg)',
              filter: 'blur(0px)', opacity: 1 },
            { transform: 'translate(' + deltaX * 0.6 + 'px, ' + (deltaY * 0.6 - 9) + 'px) rotate(' + direction * 4 + 'deg) skewX(' + direction * 9 + 'deg)',
              filter: 'blur(3px)', opacity: 0.55, offset: 0.35 },
            { transform: 'translate(' + deltaX * 0.18 + 'px, ' + (deltaY * 0.18 - 3) + 'px) rotate(' + direction * -1.5 + 'deg) skewX(' + direction * -3 + 'deg)',
              filter: 'blur(1px)', opacity: 0.9, offset: 0.7 },
            { transform: 'translate(0, 0) rotate(0deg) skewX(0deg)', filter: 'blur(0px)', opacity: 1 }
        ], {
            duration: 750,
            delay: stagger,
            easing: 'cubic-bezier(0.3, 0.75, 0.25, 1)',
            fill: 'backwards'
        });
        stagger += 70;
    });
}

function guideSchedule(delay, callback) {
    guideTimeouts.push(setTimeout(callback, delay));
}

function cancelStarsGuide() {
    if (!guideRunning) return;
    guideRunning = false;
    guideTimeouts.forEach(clearTimeout);
    guideTimeouts = [];
    if (guideCursor) {
        guideCursor.classList.remove('visible', 'clicking');
        if (guideCursor.getAnimations) {
            guideCursor.getAnimations().forEach((animation) => { animation.cancel(); });
        }
    }
}

function placeCursor(x, y) {
    cursorX = x;
    cursorY = y;
    guideCursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}

function toggleTarget() {
    const cardBounds = starsCard.getBoundingClientRect();
    const iconBounds = modeToggle.getBoundingClientRect();
    return {
        x: iconBounds.left - cardBounds.left + iconBounds.width * 0.55,
        y: iconBounds.top - cardBounds.top + iconBounds.height * 0.6
    };
}

function cursorMoveTo(x, y, duration, startScale) {
    const fromX = cursorX;
    const fromY = cursorY;
    const initialScale = startScale || 1;
    placeCursor(x, y);
    if (!guideCursor.animate) return;
    const distance = Math.sqrt((x - fromX) * (x - fromX) + (y - fromY) * (y - fromY));
    const bend = (Math.random() < 0.5 ? -1 : 1) * Math.min(38, distance * 0.22);
    const midX = (fromX + x) / 2 + bend * 0.5;
    const midY = (fromY + y) / 2 + bend;
    const overshootX = x + (x - fromX) * 0.05;
    const overshootY = y + (y - fromY) * 0.05;
    const midScale = 1 + (initialScale - 1) * 0.45;
    guideCursor.animate([
        { transform: 'translate(' + fromX + 'px, ' + fromY + 'px) scale(' + initialScale + ')', easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
        { transform: 'translate(' + midX + 'px, ' + midY + 'px) scale(' + midScale + ')', offset: 0.5, easing: 'cubic-bezier(0.25, 0, 0.3, 1)' },
        { transform: 'translate(' + overshootX + 'px, ' + overshootY + 'px) scale(1)', offset: 0.88, easing: 'ease-out' },
        { transform: 'translate(' + x + 'px, ' + y + 'px) scale(1)' }
    ], { duration: duration });
}

function cursorDismiss() {
    if (guideCursor.animate) {
        guideCursor.animate([
            { transform: 'translate(' + cursorX + 'px, ' + cursorY + 'px) scale(1)',
              easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)' },
            { transform: 'translate(' + (cursorX + 36) + 'px, ' + (cursorY + 16) + 'px) scale(0.96)',
              offset: 0.35, easing: 'cubic-bezier(0.3, 0, 0.8, 0.6)' },
            { transform: 'translate(' + (cursorX + 150) + 'px, ' + (cursorY + 130) + 'px) scale(0.8)' }
        ], { duration: 800 });
    }
    guideCursor.classList.remove('visible');
}

function guideClick() {
    guideCursor.classList.add('clicking');
    guideSchedule(450, () => {
        guideCursor.classList.remove('clicking');
    });
}

function startStarsGuide() {
    if (!starsCard || !modeToggle || !guideCursor || guideRunning || guidePlayed) return;
    guidePlayed = true;
    if (prefersReducedMotion()) {
        setStarsMode(true);
        return;
    }

    guideRunning = true;

    const cardBounds = starsCard.getBoundingClientRect();
    const start = toggleTarget();
    placeCursor(start.x + Math.min(170, cardBounds.width * 0.4), start.y + 130);
    guideCursor.style.transform += ' scale(1.6)';
    guideCursor.classList.add('visible');

    guideSchedule(250, () => {
        const target = toggleTarget();
        cursorMoveTo(target.x, target.y, 750, 1.6);
    });
    guideSchedule(1150, guideClick);
    guideSchedule(1280, () => { setStarsMode(true); });
    guideSchedule(2150, () => {
        const target = toggleTarget();
        cursorMoveTo(target.x + 2, target.y - 2, 140);
    });
    guideSchedule(2350, guideClick);
    guideSchedule(2480, () => { setStarsMode(false); });
    guideSchedule(3350, () => {
        const target = toggleTarget();
        cursorMoveTo(target.x - 1, target.y + 2, 140);
    });
    guideSchedule(3550, guideClick);
    guideSchedule(3680, () => { setStarsMode(true); });
    guideSchedule(4250, cursorDismiss);
    guideSchedule(5050, () => {
        guideRunning = false;
        guideTimeouts = [];
    });
}

function initParticles(container) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);
    const context = canvas.getContext('2d');
    const particles = [];
    const particleCount = 50;

    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    for (let index = 0; index < particleCount; index++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.1
        });
    }

    let particlesVisible = true;
    let particlesRunning = false;

    function drawParticles() {
        if (!particlesVisible) {
            particlesRunning = false;
            return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);

        for (let index = 0; index < particles.length; index++) {
            const particle = particles[index];
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;

            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(83, 196, 255, ' + particle.opacity + ')';
            context.fill();
        }

        const linkDistance = 120;
        for (let firstIndex = 0; firstIndex < particles.length; firstIndex++) {
            for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex++) {
                const deltaX = particles[firstIndex].x - particles[secondIndex].x;
                const deltaY = particles[firstIndex].y - particles[secondIndex].y;
                const distanceSquared = deltaX * deltaX + deltaY * deltaY;
                if (distanceSquared < linkDistance * linkDistance) {
                    const distance = Math.sqrt(distanceSquared);
                    context.beginPath();
                    context.moveTo(particles[firstIndex].x, particles[firstIndex].y);
                    context.lineTo(particles[secondIndex].x, particles[secondIndex].y);
                    context.strokeStyle = 'rgba(83, 196, 255, ' + (0.06 * (1 - distance / linkDistance)) + ')';
                    context.lineWidth = 0.5;
                    context.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    function startParticles() {
        if (particlesRunning || !particlesVisible) return;
        particlesRunning = true;
        requestAnimationFrame(drawParticles);
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            particlesVisible = entries[0].isIntersecting;
            if (particlesVisible) startParticles();
        }).observe(container);
    }

    setTimeout(startParticles, 500);
}

export function initHome() {
    document.body.classList.add('page-entering');

    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('scrolling')) {
            document.body.classList.add('scrolling');
        }
        clearTimeout(scrollingClassTimer);
        scrollingClassTimer = setTimeout(() => {
            document.body.classList.remove('scrolling');
        }, 160);
    }, { passive: true });

    document.querySelectorAll('.faq-item').forEach((item) => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                item.classList.toggle('open');
            });
        }
    });

    document.querySelectorAll('.hero-social-btn--telegram, .hero-social-btn--discord').forEach((button) => {
        button.addEventListener('mousemove', (event) => {
            const bounds = button.getBoundingClientRect();
            const rotationX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -18;
            const rotationY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
            button.style.transform = 'perspective(450px) rotateX(' + rotationX.toFixed(1) + 'deg) rotateY(' + rotationY.toFixed(1) + 'deg) scale(1.06)';
        });
        button.addEventListener('mousedown', () => {
            button.style.transform = 'perspective(450px) scale(0.96)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    });

    const heroCallToActionButton = document.getElementById('hero-cta-btn');
    if (heroCallToActionButton) {
        heroCallToActionButton.addEventListener('click', () => {
            smoothScrollToElement(document.getElementById('products'));
        });
    }

    if (modeToggle && starsCard) {
        modeToggle.addEventListener('click', () => {
            cancelStarsGuide();
            guidePlayed = true;
            setStarsMode(!starsCard.classList.contains('plus-mode'));
        });
    }

    if (starsCard && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry.intersectionRatio >= 0.6) {
                clearTimeout(guideViewTimer);
                guideViewTimer = setTimeout(startStarsGuide, 700);
            } else {
                clearTimeout(guideViewTimer);
                if (guideRunning) {
                    cancelStarsGuide();
                    setStarsMode(false);
                    guidePlayed = false;
                }
            }
        }, { threshold: [0.6] }).observe(starsCard);
    }

    const productBlocks = document.querySelectorAll('.product-block');
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                    if (entry.target.id === 'tale-stars') {
                        updateAmbient();
                    }
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        productBlocks.forEach((block) => {
            revealObserver.observe(block);
        });
    } else {
        productBlocks.forEach((block) => {
            block.classList.add('visible');
        });
        updateAmbient();
        setTimeout(startStarsGuide, 1200);
    }

    const particlesContainer = document.getElementById('hero-particles');
    if (particlesContainer) {
        initParticles(particlesContainer);
    }
}

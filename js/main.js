// Navbar scroll shadow
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// Mobile hamburger menu
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    navbar.classList.toggle('menu-open');
  });
}

// Mark active nav link
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
  const linkFile = link.getAttribute('href').split('/').pop();
  if (linkFile === currentPath || (currentPath === '' && linkFile === 'index.html')) {
    link.classList.add('active');
  }
});

// Contact form (Formspree)
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
const formError = document.getElementById('form-error');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    const data = new FormData(contactForm);

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        contactForm.style.display = 'none';
        formSuccess.classList.add('show');
      } else {
        throw new Error('Server error');
      }
    } catch {
      formError.classList.add('show');
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
    }
  });
}

// ─── Motion layer (marketing pages only) ─────────────────────────
(function () {
  // App pages share this file. Only run on pages with a marketing hero or header.
  if (!document.querySelector('.h-hero, section.page-header')) return;
  if (!('IntersectionObserver' in window)) return;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');

  // Navbar state on load, plus scroll progress line
  const nav = document.querySelector('.navbar');
  let progress = null;
  if (nav) {
    progress = document.createElement('div');
    progress.className = 'scroll-progress';
    nav.appendChild(progress);
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1).toFixed(4) : 0);
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  // Wrap trailing arrows in buttons so they can nudge on hover
  document.querySelectorAll('a.btn, button.btn').forEach((btn) => {
    const last = btn.lastChild;
    if (!last || last.nodeType !== 3) return;
    const match = last.textContent.match(/^([\s\S]*?)\s*→\s*$/);
    if (!match) return;
    last.textContent = match[1] + ' ';
    const arrow = document.createElement('span');
    arrow.className = 'btn-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    btn.appendChild(arrow);
  });

  // Scroll reveal. Elements are tagged here so the HTML stays clean
  // and everything remains visible if this script never runs.
  const revealSelectors = [
    '.facts',
    '.block > .container > .head',
    '.report',
    '.h-steps',
    '.sec-wrap',
    '.offer',
    '.pilot-cta',
    '.h-founder',
    '.final-grid > *',
    '.section-header',
    '.cta-banner',
    '.value-card',
    '.about-grid > *',
    '.mission-text',
    '.contact-grid > *',
    '.roi-inputs',
    '.roi-result-card',
    '.book-feature',
    '#cal-inline',
    '.expect-card',
    '.video-frame',
    'section:not(.block):not(.page-header) > .container > .eyebrow',
    'section:not(.block):not(.page-header) > .container > h2',
  ];
  const STAGGER = 90;
  const targets = [];
  revealSelectors.forEach((selector) => {
    const counts = new Map();
    document.querySelectorAll(selector).forEach((el) => {
      if (el.classList.contains('reveal')) return;
      const index = counts.get(el.parentNode) || 0;
      counts.set(el.parentNode, index + 1);
      el.classList.add('reveal');
      el.dataset.delay = Math.min(index, 6) * STAGGER;
      el.style.setProperty('--d', el.dataset.delay + 'ms');
      targets.push(el);
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      revealObserver.unobserve(el);
      el.classList.add('is-visible');
      el.querySelectorAll('[data-count]').forEach(countUp);
      // Drop the reveal transition afterwards so hover effects are not delayed by the stagger
      setTimeout(() => {
        el.classList.remove('reveal');
        el.style.removeProperty('--d');
      }, Number(el.dataset.delay) + 1700);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => revealObserver.observe(el));

  // Count-up numbers: <div data-count="2.5" data-decimals="1" data-prefix="" data-suffix="h">
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (reduceMotion || isNaN(end)) return;
    const duration = 1400;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + (end * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    el.textContent = prefix + (0).toFixed(decimals) + suffix;
    requestAnimationFrame(frame);
  }

  // Pointer effects: desktop only
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.expect-card, .roi-result-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }
})();

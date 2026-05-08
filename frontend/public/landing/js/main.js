(function () {
  'use strict';

  const LANG_KEY = 'nadil-lang';

  /* ── Language Detection ── */
  function detectLang() {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
    const browser = navigator.language || '';
    return browser.startsWith('ar') ? 'ar' : 'en';
  }

  function getLang() {
    return document.documentElement.lang === 'ar' ? 'ar' : 'en';
  }

  function setLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, lang);
    updateUI(lang);
  }

  function toggleLang() {
    setLang(getLang() === 'ar' ? 'en' : 'ar');
  }

  /* ── UI Update ── */
  function updateUI(lang) {
    const t = translations[lang];

    /* Update all data-i18n elements */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.innerHTML = t[key];
      }
    });

    /* Update lang toggle label */
    const label = document.getElementById('lang-label');
    if (label) {
      label.textContent = lang === 'ar' ? 'English' : 'عربي';
    }

    /* Update document title */
    document.title =
      lang === 'ar'
        ? 'نادل AI — مساعدك الذكي، في الخدمة دائمًا'
        : 'Nadil AI — Your AI Waiter, Always On Duty';

    /* Flip directional SVG icons inside RTL */
    document.querySelectorAll('.rtl-flip').forEach(function (el) {
      el.style.transform = lang === 'ar' ? 'scaleX(-1)' : '';
    });
  }

  /* ── Mobile Menu ── */
  function setupMobileMenu() {
    var btn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function () {
      menu.classList.toggle('hidden');
    });

    /* Close menu when clicking a link */
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.add('hidden');
      });
    });

    /* Close menu on outside click */
    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });
  }

  /* ── Navbar Scroll Effect ── */
  function setupNavbarScroll() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', function () {
      var currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        navbar.classList.add('shadow-md');
      } else {
        navbar.classList.remove('shadow-md');
      }
    });
  }

  /* ── Scroll Reveal Animations ── */
  function setupScrollReveal() {
    /* Respect prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-up');
            /* set opacity to 1 since the animation starts from 0 */
            entry.target.style.opacity = '1';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    /* Observe sections and feature cards */
    document
      .querySelectorAll(
        'section > div > .grid > div, ' +
          '.grid > .group, ' +
          '[data-reveal]'
      )
      .forEach(function (el) {
        el.style.opacity = '0';
        observer.observe(el);
      });

    /* Observe section headings */
    document.querySelectorAll('section h2').forEach(function (el) {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  /* ── FAQ Accordion (close others on open) ── */
  function setupFAQ() {
    document.querySelectorAll('#faq details').forEach(function (detail) {
      detail.addEventListener('toggle', function () {
        if (!this.open) return;
        document.querySelectorAll('#faq details').forEach(function (other) {
          if (other !== detail) other.open = false;
        });
      });
    });
  }

  /* ── Smooth Scroll for Hash Links ── */
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ── Init ── */
  function init() {
    var lang = detectLang();
    setLang(lang);

    document
      .getElementById('lang-toggle')
      .addEventListener('click', toggleLang);

    setupMobileMenu();
    setupNavbarScroll();
    setupScrollReveal();
    setupFAQ();
    setupSmoothScroll();
  }

  /* Kick off when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

let heroMinimizeTimeout = null;

// Smooth scrolling for nav links and buttons
function setupSmoothScroll() {
  const triggers = document.querySelectorAll(
    '.site-nav__link, [data-scroll-target]'
  );

  triggers.forEach((el) => {
    el.addEventListener('click', (event) => {
      const targetSelector =
        el.getAttribute('href') || el.getAttribute('data-scroll-target');
      if (!targetSelector || !targetSelector.startsWith('#')) return;

      const target = document.querySelector(targetSelector);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const nav = document.querySelector('.site-nav');
      const toggle = document.querySelector('.nav-toggle');
      if (nav && toggle && nav.classList.contains('site-nav--open')) {
        nav.classList.remove('site-nav--open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

// Hover-play videos in gallery
function setupGalleryHoverVideos() {
  const videoItems = document.querySelectorAll(
    '.gallery-item--video video'
  );

  videoItems.forEach((video) => {
    const item = video.closest('.gallery-item');
    if (!item) return;

    item.addEventListener('mouseenter', () => {
      video.play().catch(() => {});
    });

    item.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
}

// Lightbox for gallery items (click to enlarge with close button)
// Keeps video playback position when opening the lightbox and avoids first-frame flash.
function setupGalleryLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const mediaContainer = lightbox.querySelector('.lightbox__media');
  const captionEl = lightbox.querySelector('.lightbox__caption');
  const closeBtn = lightbox.querySelector('[data-lightbox-close]');

  function openLightbox(mediaEl, captionText, videoState) {
    // Clear previous content
    mediaContainer.innerHTML = '';

    // Clone media (img or video)
    const clone = mediaEl.cloneNode(true);
    const isVideo = clone.tagName.toLowerCase() === 'video';

    if (isVideo) {
      const state = videoState || {};
      const targetTime = state.currentTime || 0;
      const wasPaused = state.wasPaused !== false ? true : false;

      // In the lightbox, show controls and allow sound
      clone.removeAttribute('muted');
      clone.setAttribute('controls', '');
      clone.setAttribute('playsinline', '');
      clone.setAttribute('preload', 'auto');

      // Hide until we've seeked to the correct frame
      clone.style.visibility = 'hidden';

      const finishSetup = () => {
        try {
          clone.currentTime = targetTime;
        } catch (e) {
          // Ignore if we can't set yet; seeked will still fire after a bit
        }

        const onSeeked = () => {
          // Now show the frame at the correct time
          clone.style.visibility = '';

          if (!wasPaused) {
            const playPromise = clone.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          }
        };

        // Wait for seek to finish so we don't flash frame 0
        clone.addEventListener('seeked', onSeeked, { once: true });
      };

      if (clone.readyState >= 2) {
        // Metadata already loaded, we can set currentTime now
        finishSetup();
      } else {
        // Wait until metadata is ready, then set currentTime
        clone.addEventListener('loadedmetadata', finishSetup, { once: true });
      }
    }

    mediaContainer.appendChild(clone);
    captionEl.textContent = captionText || '';

    lightbox.classList.add('lightbox--open');
    document.body.classList.add('body--lightbox-open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    const video = mediaContainer.querySelector('video');
    if (video) {
      video.pause();
    }
    mediaContainer.innerHTML = '';
    lightbox.classList.remove('lightbox--open');
    document.body.classList.remove('body--lightbox-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  // Close when clicking backdrop
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.classList.contains('lightbox--open')) {
      closeLightbox();
    }
  });

  // Attach click handlers to each gallery item
  const items = document.querySelectorAll('.gallery-item');
  items.forEach((item) => {
    const media = item.querySelector('img, video');
    const titleEl = item.querySelector('h3');
    if (!media) return;

    // Prefer data-caption, then alt (for images), then grid title
    const caption =
      item.getAttribute('data-caption') ||
      (media.tagName.toLowerCase() === 'img' ? media.alt : '') ||
      (titleEl ? titleEl.textContent.trim() : '');

    item.addEventListener('click', (event) => {
      event.preventDefault();

      const isVideo = media.tagName.toLowerCase() === 'video';
      let videoState = null;

      if (isVideo) {
        // Capture current time & play/pause state BEFORE pausing
        videoState = {
          currentTime: media.currentTime || 0,
          wasPaused: media.paused,
        };

        // Pause inline video so only the lightbox version plays
        media.pause();
      }

      openLightbox(media, caption, videoState);
    });
  });
}

function setupHeroLoading() {
  const video = document.getElementById('hero-video');
  const loader = document.getElementById('hero-loader');
  if (!video || !loader) return;

  // Start in "loading" mode: lock scroll + show loader
  document.body.classList.add('body--hero-loading');

  function showSite() {
    // Guard against multiple calls
    if (!loader || loader.classList.contains('hero-loader--hidden')) return;

    // Mark video as visually ready
    video.classList.add('hero__video--ready');

    // Fade out loader
    loader.classList.add('hero-loader--hidden');

    // Re-enable scrolling
    document.body.classList.remove('body--hero-loading');

    // Clean up listeners
    video.removeEventListener('canplay', showSite);
    video.removeEventListener('error', showSite);
  }

  // As soon as the browser can start playing (faster than canplaythrough)
  video.addEventListener('canplay', showSite, { once: true });

  // Fallback if something goes wrong with the video
  video.addEventListener('error', showSite, { once: true });

  // Extra safety timeout: don't keep people on black forever
  setTimeout(showSite, 8000);
}


// Mobile nav toggle
function setupMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('site-nav--open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

// Simple contact form validation + send via Formspree
function setupContactForm() {
  const form = document.getElementById('contact-form');
  const messageEl = document.getElementById('form-message');
  if (!form || !messageEl) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageEl.textContent = '';
    messageEl.classList.remove('form-message--error', 'form-message--success');

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    if (!name || !email || !message) {
      messageEl.textContent = 'Please fill in all fields.';
      messageEl.classList.add('form-message--error');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      messageEl.textContent = 'Please enter a valid email address.';
      messageEl.classList.add('form-message--error');
      return;
    }

    try {
      const response = await fetch(form.action, {
        method: form.method || 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (response.ok) {
        messageEl.textContent = 'Thanks! Your message has been sent.';
        messageEl.classList.add('form-message--success');
        form.reset();
      } else {
        messageEl.textContent = 'Something went wrong. Please try again later.';
        messageEl.classList.add('form-message--error');
      }
    } catch (error) {
      console.error(error);
      messageEl.textContent = 'Network error. Please try again.';
      messageEl.classList.add('form-message--error');
    }
  });
}


// Highlight active nav link based on scroll position
function setupActiveNavOnScroll() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.site-nav__link');
  if (!sections.length || !navLinks.length) return;

  const linkMap = {};
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      linkMap[href.slice(1)] = link;
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (!id || !linkMap[id]) return;

        navLinks.forEach((link) =>
          link.classList.remove('site-nav__link--active')
        );
        linkMap[id].classList.add('site-nav__link--active');
      });
    },
    {
      threshold: 0.4,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

// Footer year
function setupYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
}

// Schedule hiding the UI (making hero feel fullscreen)
function scheduleHeroMinimize(delay = 5000) {
  if (heroMinimizeTimeout) {
    clearTimeout(heroMinimizeTimeout);
  }

  heroMinimizeTimeout = window.setTimeout(() => {
    document.body.classList.add('ui-minimal');
  }, delay);
}

// Restore UI on scroll
function setupScrollRestore() {
  let scrollStopTimeout = null;

  function onScrollStop() {
    scrollStopTimeout = null;

    const hero = document.querySelector('.hero');
    if (!hero) return;

    const heroRect = hero.getBoundingClientRect();
    const heroInView =
      heroRect.top >= -50 && heroRect.bottom > 0; // hero mostly at/near top

    if (heroInView) {
      // User is at the top, not scrolling – start 5s timer to re-minimize UI
      scheduleHeroMinimize(5000);
    }
  }

  window.addEventListener('scroll', () => {
    // Any scroll: show UI and cancel existing minimize timers
    if (document.body.classList.contains('ui-minimal')) {
      document.body.classList.remove('ui-minimal');
    }

    if (heroMinimizeTimeout) {
      clearTimeout(heroMinimizeTimeout);
      heroMinimizeTimeout = null;
    }

    // Debounce to detect "scroll has stopped"
    if (scrollStopTimeout) {
      clearTimeout(scrollStopTimeout);
    }
    scrollStopTimeout = window.setTimeout(onScrollStop, 150);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  setupSmoothScroll();
  setupGalleryHoverVideos();
  setupGalleryLightbox();
  setupMobileNav();
  setupContactForm();
  setupActiveNavOnScroll();
  setupYear();
  scheduleHeroMinimize();
  setupScrollRestore();
  setupHeroLoading();
});


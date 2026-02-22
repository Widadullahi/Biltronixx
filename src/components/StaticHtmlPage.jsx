import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCarTips, fetchStoreHighlights } from '../lib/sanityClient.js';

const FALLBACK_CAR_TIPS = [
  {
    title: 'Check Tire Pressure Weekly',
    body: 'Keep your tires at the recommended PSI to improve fuel economy and reduce uneven wear.',
    category: 'Maintenance',
  },
  {
    title: 'Listen For Early Brake Noise',
    body: 'If you hear squealing when braking, inspect pads early to avoid damaging rotors and spending more.',
    category: 'Safety',
  },
  {
    title: 'Use OEM-Grade Oil Filters',
    body: 'A quality filter protects your engine better during long drives and stop-and-go traffic.',
    category: 'Engine Care',
  },
];

const FALLBACK_STORE_HIGHLIGHTS = [
  {
    title: 'Vehicles',
    summary: 'Inspected sedans, SUVs, and premium options ready for immediate delivery.',
    category: 'Vehicles',
    ctaLabel: 'Browse Vehicles',
    ctaHref: '/sales#products',
  },
  {
    title: 'Car Parts',
    summary: 'OEM-grade parts including brake kits, filters, batteries, and service components.',
    category: 'Car Parts',
    ctaLabel: 'Browse Parts',
    ctaHref: '/sales#products',
  },
  {
    title: 'Accessories',
    summary: 'Dash cams, seat covers, phone mounts, and practical interior upgrades.',
    category: 'Accessories',
    ctaLabel: 'Browse Accessories',
    ctaHref: '/sales#products',
  },
];

const WHATSAPP_NUMBER = '2347060882711';

function extractPageParts(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('title')?.textContent?.trim() || 'Biltronix';
  const styleText = Array.from(doc.querySelectorAll('style'))
    .map((styleNode) => styleNode.textContent || '')
    .join('\n');

  doc.querySelectorAll('script').forEach((scriptNode) => scriptNode.remove());
  const bodyHtml = doc.body ? doc.body.innerHTML : html;

  return { bodyHtml, styleText, title };
}

export default function StaticHtmlPage({ htmlPath, pageType }) {
  const containerRef = useRef(null);
  const [parts, setParts] = useState({ bodyHtml: '', styleText: '', title: 'Biltronix' });
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });

  const styleTagId = useMemo(() => `page-style-${pageType}`, [pageType]);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const response = await fetch(htmlPath);
      const html = await response.text();
      const extracted = extractPageParts(html);
      if (!cancelled) {
        setParts(extracted);
      }
    }

    loadPage().catch((error) => {
      console.error(`Failed to load ${htmlPath}`, error);
    });

    return () => {
      cancelled = true;
    };
  }, [htmlPath]);

  useEffect(() => {
    if (!parts.styleText) return undefined;

    let styleTag = document.getElementById(styleTagId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleTagId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = parts.styleText;

    return () => {
      const existing = document.getElementById(styleTagId);
      if (existing) existing.remove();
    };
  }, [parts.styleText, styleTagId]);

  useEffect(() => {
    if (parts.title) document.title = parts.title;
  }, [parts.title]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const section = root.querySelector(hash);
    if (!(section instanceof HTMLElement)) return;

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: section.offsetTop - 100,
        behavior: 'smooth',
      });
    });
  }, [parts.bodyHtml]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const cleanupTasks = [];
    const toSlug = (value) =>
      String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const applyStoreFilters = () => {
      const activeFilter = root.dataset.activeFilter || 'all';
      const searchInput = root.querySelector('[data-store-search]');
      const query =
        searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : '';
      const cards = root.querySelectorAll('[data-product-card]');

      cards.forEach((card) => {
        const category = (card.getAttribute('data-category') || '').toLowerCase();
        const text = (card.textContent || '').toLowerCase();
        const matchesCategory = activeFilter === 'all' || category === activeFilter;
        const matchesSearch = !query || text.includes(query);
        card.style.display = matchesCategory && matchesSearch ? '' : 'none';
      });
    };

    const setActiveFilter = (filterValue) => {
      root.dataset.activeFilter = filterValue;
      root.querySelectorAll('[data-filter]').forEach((btn) => {
        if (!(btn instanceof HTMLElement)) return;
        const isActive = btn.getAttribute('data-filter') === filterValue;
        btn.classList.toggle('active', isActive);
      });
      applyStoreFilters();
    };

    const onSubmit = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.id === 'bookingForm') {
        event.preventDefault();
        const formData = new FormData(form);
        const fullName = String(formData.get('fullName') || '').trim();
        const whatsappNumber = String(formData.get('whatsappNumber') || '').trim();
        const vehicle = String(formData.get('vehicle') || '').trim();
        const service = String(formData.get('service') || '').trim();
        const appointmentDate = String(formData.get('appointmentDate') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const note = String(formData.get('note') || '').trim();

        const message = [
          'Hello Biltronix, I want to book an appointment.',
          `Name: ${fullName || '-'}`,
          `My WhatsApp: ${whatsappNumber || '-'}`,
          `Vehicle: ${vehicle || '-'}`,
          `Service: ${service || '-'}`,
          `Preferred Date: ${appointmentDate || '-'}`,
          `Email: ${email || '-'}`,
          `Note: ${note || '-'}`,
        ].join('\n');

        const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setPopup({
          open: true,
          title: 'Opening WhatsApp',
          message: 'Your booking details are ready. Please send the message in WhatsApp to complete your request.',
        });
        form.reset();
      }
      if (form.id === 'contactForm') {
        event.preventDefault();
        alert('Thank you for your inquiry! Our team will contact you shortly.');
        form.reset();
      }
    };

    const onClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#') {
          const section = root.querySelector(href);
          if (section instanceof HTMLElement) {
            event.preventDefault();
            window.scrollTo({
              top: section.offsetTop - 100,
              behavior: 'smooth',
            });
          }
        }
      }

      const platformTab = target.closest('.platform-tab');
      if (platformTab) {
        root.querySelectorAll('.platform-tab').forEach((node) => node.classList.remove('active'));
        platformTab.classList.add('active');

        root.querySelectorAll('.social-videos-container').forEach((node) => node.classList.remove('active'));
        const platform = platformTab.getAttribute('data-platform');
        if (platform) {
          const selected = root.querySelector(`#${platform}-videos`);
          if (selected) selected.classList.add('active');
        }
      }

      const categoryTab = target.closest('.category-tab');
      if (categoryTab) {
        root.querySelectorAll('.category-tab').forEach((node) => node.classList.remove('active'));
        categoryTab.classList.add('active');

        root.querySelectorAll('.products-container').forEach((node) => node.classList.remove('active'));
        const category = categoryTab.getAttribute('data-category');
        if (category) {
          const selected = root.querySelector(`#${category}-container`);
          if (selected) selected.classList.add('active');
        }
      }

      const wishlistBtn = target.closest('.wishlist-btn');
      if (wishlistBtn) {
        event.preventDefault();
        event.stopPropagation();
        const icon = wishlistBtn.querySelector('i');
        if (!icon) return;

        if (icon.classList.contains('far')) {
          icon.classList.remove('far');
          icon.classList.add('fas');
          wishlistBtn.style.background = 'var(--secondary)';
          wishlistBtn.style.color = 'white';
          alert('Added to wishlist!');
        } else {
          icon.classList.remove('fas');
          icon.classList.add('far');
          wishlistBtn.style.background = 'rgba(255,255,255,0.9)';
          wishlistBtn.style.color = 'inherit';
          alert('Removed from wishlist!');
        }
      }

      const detailsBtn = target.closest('.view-details');
      if (detailsBtn) {
        event.preventDefault();
        event.stopPropagation();
        const product = detailsBtn.getAttribute('data-product') || 'Selected product';
        alert(`Product Details: ${product}\n\nIn a full implementation, this would open a detailed product page with specifications, photos, and more information.`);
      }

      const filterBtn = target.closest('[data-filter]');
      if (filterBtn instanceof HTMLElement) {
        const filterValue = filterBtn.getAttribute('data-filter');
        if (filterValue) setActiveFilter(filterValue);
      }

      const inquireBtn = target.closest('.btn.whatsapp');
      if (inquireBtn instanceof HTMLAnchorElement) {
        const card = inquireBtn.closest('[data-product-card]');
        if (card instanceof HTMLElement) {
          event.preventDefault();
          const productName = card.querySelector('h3')?.textContent?.trim() || 'this item';
          const slug = toSlug(productName);
          const itemId = `item-${slug || 'product'}`;
          if (!card.id) card.id = itemId;
          const itemUrl = `${window.location.origin}/sales#${card.id}`;
          const msg = `Hello Biltronix, I want to inquire about ${productName}.\nItem Link: ${itemUrl}`;
          const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
      }
    };

    const onInput = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches('[data-store-search]')) {
        applyStoreFilters();
      }
    };

    root.addEventListener('submit', onSubmit);
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);

    const escapeHtml = (value) =>
      String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const storeHighlightsList = root.querySelector('[data-store-highlights-list]');
    if (storeHighlightsList instanceof HTMLElement) {
      const renderStoreHighlights = (items) => {
        const safeItems = Array.isArray(items) && items.length > 0 ? items : FALLBACK_STORE_HIGHLIGHTS;
        const markup = safeItems
          .map(
            (item) => `
              <article class="store-highlight-card">
                <span class="store-highlight-tag">${escapeHtml(item.category || 'General')}</span>
                <h3>${escapeHtml(item.title || 'Untitled')}</h3>
                <p>${escapeHtml(item.summary || '')}</p>
                <a class="btn secondary" href="${escapeHtml(item.ctaHref || '/sales')}">${escapeHtml(item.ctaLabel || 'Browse Store')}</a>
              </article>
            `
          )
          .join('');
        storeHighlightsList.innerHTML = markup;
      };

      fetchStoreHighlights(6)
        .then((items) => renderStoreHighlights(items))
        .catch(() => renderStoreHighlights(FALLBACK_STORE_HIGHLIGHTS));
    }

    const tipsList = root.querySelector('[data-car-tips-list]');
    if (tipsList instanceof HTMLElement) {
      const renderTips = (tips) => {
        const safeTips = Array.isArray(tips) && tips.length > 0 ? tips : FALLBACK_CAR_TIPS;
        const tipMarkup = safeTips
          .map(
            (tip) => `
              <article class="tip-card">
                <span class="tip-tag">${escapeHtml(tip.category || 'General')}</span>
                <h3>${escapeHtml(tip.title || 'Untitled Tip')}</h3>
                <p>${escapeHtml(tip.body || '')}</p>
              </article>
            `
          )
          .join('');
        tipsList.innerHTML = tipMarkup;
      };

      fetchCarTips(6)
        .then((tips) => renderTips(tips))
        .catch(() => renderTips(FALLBACK_CAR_TIPS));
    }

    root.querySelectorAll('[data-auto-carousel]').forEach((carouselNode) => {
      if (!(carouselNode instanceof HTMLElement)) return;

      const items = Array.from(carouselNode.querySelectorAll('.carousel-item'));
      if (items.length <= 1) return;

      const indicators = Array.from(carouselNode.querySelectorAll('.carousel-indicators button'));
      const intervalMs = Number.parseInt(carouselNode.getAttribute('data-interval') || '3000', 10);
      let activeIndex = Math.max(0, items.findIndex((item) => item.classList.contains('active')));

      const activateIndex = (nextIndex) => {
        items.forEach((item, index) => {
          item.classList.toggle('active', index === nextIndex);
        });

        indicators.forEach((button, index) => {
          const isActive = index === nextIndex;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
      };

      activateIndex(activeIndex);

      const onIndicatorClick = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest('.carousel-indicators button');
        if (!(button instanceof HTMLButtonElement)) return;
        const slideTo = Number.parseInt(button.getAttribute('data-bs-slide-to') || '', 10);
        if (!Number.isInteger(slideTo) || slideTo < 0 || slideTo >= items.length) return;
        activeIndex = slideTo;
        activateIndex(activeIndex);
      };
      carouselNode.addEventListener('click', onIndicatorClick);

      const timerId = window.setInterval(() => {
        activeIndex = (activeIndex + 1) % items.length;
        activateIndex(activeIndex);
      }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000);

      cleanupTasks.push(() => carouselNode.removeEventListener('click', onIndicatorClick));
      cleanupTasks.push(() => window.clearInterval(timerId));
    });

    if (root.querySelector('[data-product-card]')) {
      setActiveFilter('all');
    }

    return () => {
      root.removeEventListener('submit', onSubmit);
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      cleanupTasks.forEach((fn) => fn());
    };
  }, [parts.bodyHtml]);

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: parts.bodyHtml }} />
      {popup.open && (
        <div className='site-popup-overlay' role='dialog' aria-modal='true' aria-labelledby='site-popup-title'>
          <div className='site-popup-card'>
            <h3 id='site-popup-title'>{popup.title}</h3>
            <p>{popup.message}</p>
            <button type='button' onClick={() => setPopup({ open: false, title: '', message: '' })}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

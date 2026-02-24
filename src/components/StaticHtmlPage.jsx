import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCarTips, fetchStockItems, fetchStoreHighlights } from '../lib/sanityClient.js';

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
const INSTALL_BANNER_SESSION_KEY = 'biltronix_install_banner_dismissed';

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
  const installPromptRef = useRef(null);
  const [parts, setParts] = useState({ bodyHtml: '', styleText: '', title: 'Biltronix' });
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });
  const [installModal, setInstallModal] = useState({
    open: false,
    title: '',
    message: '',
    canInstall: false,
  });
  const [showInstallSidePrompt, setShowInstallSidePrompt] = useState(false);
  const [productModal, setProductModal] = useState({
    open: false,
    title: '',
    category: '',
    description: '',
    price: '',
    images: [],
    index: 0,
  });
  const [tipModal, setTipModal] = useState({
    open: false,
    title: '',
    category: '',
    body: '',
    imageUrl: '',
  });

  const styleTagId = useMemo(() => `page-style-${pageType}`, [pageType]);

  const openInstallDialog = () => {
    const deferredPrompt = installPromptRef.current;
    const ua = navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isStandalone) {
      setInstallModal({
        open: true,
        title: 'Already Installed',
        message: 'This app is already installed on your device.',
        canInstall: false,
      });
      return;
    }

    if (deferredPrompt) {
      setInstallModal({
        open: true,
        title: 'Install Biltronix App',
        message: 'Tap Install Now to add Biltronix to your device.',
        canInstall: true,
      });
      return;
    }

    if (isIos) {
      setInstallModal({
        open: true,
        title: 'Install on iPhone/iPad',
        message: 'Tap Share in Safari, then choose Add to Home Screen.',
        canInstall: false,
      });
      return;
    }

    if (isAndroid) {
      setInstallModal({
        open: true,
        title: 'Install on Android',
        message: 'Open browser menu and tap Install app or Add to Home screen.',
        canInstall: false,
      });
      return;
    }

    setInstallModal({
      open: true,
      title: 'Install App',
      message: 'In your browser menu, choose Install App or Create Shortcut to install Biltronix.',
      canInstall: false,
    });
  };

  const triggerInstallPrompt = async () => {
    const deferredPrompt = installPromptRef.current;
    if (!deferredPrompt) {
      setInstallModal({ open: false, title: '', message: '', canInstall: false });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setPopup({
          open: true,
          title: 'Install Requested',
          message: 'Installation has started. Follow any browser prompts to finish.',
        });
      } else {
        setPopup({
          open: true,
          title: 'Install Cancelled',
          message: 'You can install later from the side install prompt.',
        });
      }
    } finally {
      installPromptRef.current = null;
      setInstallModal({ open: false, title: '', message: '', canInstall: false });
    }
  };

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
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      installPromptRef.current = event;
    };

    const onAppInstalled = () => {
      installPromptRef.current = null;
      setShowInstallSidePrompt(false);
      setPopup({
        open: true,
        title: 'App Installed',
        message: 'Biltronix has been installed successfully on this device.',
      });
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!parts.bodyHtml) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    let dismissedForVisit = false;
    try {
      dismissedForVisit = window.sessionStorage.getItem(INSTALL_BANNER_SESSION_KEY) === '1';
    } catch {
      dismissedForVisit = false;
    }
    setShowInstallSidePrompt(!isStandalone && !dismissedForVisit);
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
        const formData = new FormData(form);
        const fullName = String(formData.get('fullName') || '').trim();
        const whatsappNumber = String(formData.get('whatsappNumber') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const messageText = String(formData.get('message') || '').trim();

        const message = [
          'Hello Biltronix, I have a general inquiry.',
          `Name: ${fullName || '-'}`,
          `My WhatsApp: ${whatsappNumber || '-'}`,
          `Email: ${email || '-'}`,
          `Message: ${messageText || '-'}`,
        ].join('\n');

        const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setPopup({
          open: true,
          title: 'Opening WhatsApp',
          message: 'Your message is ready. Please send it in WhatsApp to complete your inquiry.',
        });
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
        const card = detailsBtn.closest('[data-product-card]');
        if (!(card instanceof HTMLElement)) return;
        const category = card.querySelector('.badge')?.textContent?.trim() || '';
        const title = card.querySelector('h3')?.textContent?.trim() || 'Product';
        const description = card.querySelector('p')?.textContent?.trim() || '';
        const price = card.querySelector('.price')?.textContent?.trim() || '';
        const primaryImage = card.querySelector('img')?.getAttribute('src') || '';
        const extraImages = String(card.getAttribute('data-images') || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const images = Array.from(new Set([primaryImage, ...extraImages].filter(Boolean)));
        setProductModal({
          open: true,
          title,
          category,
          description,
          price,
          images,
          index: 0,
        });
      }

      const tipSeeMoreBtn = target.closest('.tip-see-more');
      if (tipSeeMoreBtn) {
        event.preventDefault();
        const tipCard = tipSeeMoreBtn.closest('.tip-card');
        if (!(tipCard instanceof HTMLElement)) return;
        const title = tipCard.querySelector('h3')?.textContent?.trim() || 'Car Tip';
        const category = tipCard.querySelector('.tip-tag')?.textContent?.trim() || 'General';
        const body = tipCard.querySelector('.tip-full')?.textContent?.trim() || tipCard.querySelector('p')?.textContent?.trim() || '';
        const imageUrl = tipCard.querySelector('img')?.getAttribute('src') || '';
        setTipModal({
          open: true,
          title,
          category,
          body,
          imageUrl,
        });
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

      const installBtn = target.closest('[data-install-app]');
      if (installBtn) {
        event.preventDefault();
        openInstallDialog();
      }
    };

    const onInput = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches('[data-store-search]')) {
        applyStoreFilters();
      }
      if (target.matches('[data-tip-search]') || target.matches('[data-tip-category-filter]')) {
        const query =
          root.querySelector('[data-tip-search]') instanceof HTMLInputElement
            ? root.querySelector('[data-tip-search]').value.trim().toLowerCase()
            : '';
        const category =
          root.querySelector('[data-tip-category-filter]') instanceof HTMLSelectElement
            ? root.querySelector('[data-tip-category-filter]').value
            : 'all';
        root.querySelectorAll('[data-tip-card]').forEach((cardNode) => {
          if (!(cardNode instanceof HTMLElement)) return;
          const tipCategory = (cardNode.getAttribute('data-tip-category') || '').toLowerCase();
          const text = (cardNode.textContent || '').toLowerCase();
          const categoryMatch = category === 'all' || tipCategory === category;
          const queryMatch = !query || text.includes(query);
          cardNode.style.display = categoryMatch && queryMatch ? '' : 'none';
        });
      }
    };

    root.addEventListener('submit', onSubmit);
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);

    root.querySelectorAll('[data-install-app]').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.display = 'none';
      }
    });

    const escapeHtml = (value) =>
      String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const shuffle = (list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const heroCarousel = root.querySelector('#heroCarsCarousel');
    if (heroCarousel instanceof HTMLElement) {
      const slideImages = Array.from(heroCarousel.querySelectorAll('.carousel-item img'));
      const clearHeroImages = () => {
        slideImages.forEach((imgNode, index) => {
          if (imgNode instanceof HTMLImageElement) {
            imgNode.removeAttribute('src');
            imgNode.alt = `Store preview ${index + 1}`;
          }
        });
      };

      fetchStockItems(300)
        .then((items) => {
          if (!Array.isArray(items) || items.length === 0) {
            clearHeroImages();
            return;
          }
          const imagePool = items
            .flatMap((item) => [item.primaryImageUrl, item.featureImageUrl, ...(item.otherImageUrls || [])])
            .filter(Boolean);
          const uniqueImages = Array.from(new Set(imagePool));
          if (uniqueImages.length === 0) {
            clearHeroImages();
            return;
          }

          const randomImages = shuffle(uniqueImages);
          slideImages.forEach((imgNode, index) => {
            const nextImage = randomImages[index % randomImages.length];
            if (imgNode instanceof HTMLImageElement && nextImage) {
              imgNode.src = nextImage;
              imgNode.alt = `Store preview ${index + 1}`;
              imgNode.loading = 'lazy';
            }
          });
        })
        .catch(() => {
          clearHeroImages();
        });
    }

    const storeHighlightsList = root.querySelector('[data-store-highlights-list]');
    if (storeHighlightsList instanceof HTMLElement) {
      const toCategoryClass = (category) => {
        const value = String(category || '').toLowerCase();
        if (value.includes('vehicle')) return 'cat-vehicle';
        if (value.includes('part')) return 'cat-parts';
        if (value.includes('accessor')) return 'cat-accessories';
        return 'cat-generic';
      };

      const getHighlightIcon = (category) => {
        const value = String(category || '').toLowerCase();
        if (value.includes('vehicle')) return 'fa-car-side';
        if (value.includes('part')) return 'fa-cogs';
        if (value.includes('accessor')) return 'fa-toolbox';
        return 'fa-store';
      };

      const renderStoreHighlights = (items) => {
        const safeItems = Array.isArray(items) && items.length > 0 ? items : FALLBACK_STORE_HIGHLIGHTS;
        const markup = safeItems
          .map(
            (item) => `
              <article class="store-highlight-card ${toCategoryClass(item.category || item.title)}">
                <div class="store-highlight-top">
                  <div class="store-highlight-icon"><i class="fas ${getHighlightIcon(item.category || item.title)}"></i></div>
                  <span class="store-highlight-ad"><i class="fas fa-bullhorn"></i> Featured</span>
                </div>
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
      const tipCategoryFilter = root.querySelector('[data-tip-category-filter]');
      const applyTipFilters = () => {
        const query =
          root.querySelector('[data-tip-search]') instanceof HTMLInputElement
            ? root.querySelector('[data-tip-search]').value.trim().toLowerCase()
            : '';
        const category =
          root.querySelector('[data-tip-category-filter]') instanceof HTMLSelectElement
            ? root.querySelector('[data-tip-category-filter]').value
            : 'all';
        root.querySelectorAll('[data-tip-card]').forEach((cardNode) => {
          if (!(cardNode instanceof HTMLElement)) return;
          const tipCategory = (cardNode.getAttribute('data-tip-category') || '').toLowerCase();
          const text = (cardNode.textContent || '').toLowerCase();
          const categoryMatch = category === 'all' || tipCategory === category;
          const queryMatch = !query || text.includes(query);
          cardNode.style.display = categoryMatch && queryMatch ? '' : 'none';
        });
      };

      const trimWords = (input, limit = 24) => {
        const words = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (words.length <= limit) return String(input || '').trim();
        return `${words.slice(0, limit).join(' ')}...`;
      };

      const renderTips = (tips) => {
        const safeTips = Array.isArray(tips) && tips.length > 0 ? tips : FALLBACK_CAR_TIPS;
        const tipMarkup = safeTips
          .map(
            (tip) => `
              <article class="tip-card" data-tip-card data-tip-category="${escapeHtml(String(tip.category || 'General').toLowerCase())}">
                ${tip.imageUrl ? `<img src="${escapeHtml(tip.imageUrl)}" alt="${escapeHtml(tip.title || 'Car tip image')}" />` : ''}
                <span class="tip-tag">${escapeHtml(tip.category || 'General')}</span>
                <h3>${escapeHtml(tip.title || 'Untitled Tip')}</h3>
                <p>${escapeHtml(trimWords(tip.body || '', 24))}</p>
                <p class="tip-full" style="display:none;">${escapeHtml(tip.body || '')}</p>
                <button type="button" class="tip-see-more">See More</button>
              </article>
            `
          )
          .join('');
        tipsList.innerHTML = tipMarkup;
        if (tipCategoryFilter instanceof HTMLSelectElement) {
          const categories = Array.from(
            new Set(safeTips.map((tip) => String(tip.category || 'General').trim()).filter(Boolean))
          );
          const optionsMarkup = ['<option value="all">All Categories</option>']
            .concat(
              categories.map((item) => `<option value="${escapeHtml(item.toLowerCase())}">${escapeHtml(item)}</option>`)
            )
            .join('');
          tipCategoryFilter.innerHTML = optionsMarkup;
          tipCategoryFilter.value = 'all';
        }
        applyTipFilters();
      };

      fetchCarTips(6)
        .then((tips) => renderTips(tips))
        .catch(() => renderTips(FALLBACK_CAR_TIPS));
    }

    const productsGrid = root.querySelector('.products-grid');
    if (productsGrid instanceof HTMLElement) {
      const categoryMap = {
        vehicle: 'vehicle',
        'car-parts': 'part',
        accessories: 'accessory',
      };

      const toCurrency = (value) =>
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0,
        }).format(Number(value) || 0);

      const toSafeCategoryLabel = (rawCategory) => {
        if (rawCategory === 'vehicle') return 'Vehicle';
        if (rawCategory === 'car-parts') return 'Car Part';
        if (rawCategory === 'accessories') return 'Accessory';
        return 'Item';
      };

      const renderStockItems = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
          productsGrid.innerHTML = `
            <article class="product-card">
              <div class="product-body">
                <h3>No Products Yet</h3>
                <p>Products you add from the admin dashboard will appear here.</p>
              </div>
            </article>
          `;
          return;
        }
        const cardMarkup = items
          .map((item) => {
            const normalizedCategory = categoryMap[item.category] || 'part';
            const allImages = [item.primaryImageUrl, item.featureImageUrl, ...(item.otherImageUrls || [])].filter(Boolean);
            const imageSrc = allImages[0] || '';
            const imageMarkup = imageSrc
              ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.name || 'Product image')}" />`
              : `<div style="height:230px;display:grid;place-items:center;background:#f7f9ff;border-bottom:1px solid #e3ebf8;color:#61779a;font-weight:600;">No image uploaded</div>`;
            const extraImages = allImages.slice(1).join(',');
            const detailsLabel = item.category === 'car-parts' ? 'Details' : 'Details';
            const soldBadge = item.soldOut ? '<span class="badge" style="margin-left:6px;background:#fde2e2;color:#8e1f1f;border-color:#f4c2ca;">Sold</span>' : '';
            const detailsButton = `<a class="btn details view-details" href="#">${detailsLabel}</a>`;
            const inquireButton = item.soldOut
              ? '<span class="btn" style="background:#f3f6fb;color:#6b7f9f;border:1px solid #d9e3f2;cursor:not-allowed;">Sold Out</span>'
              : `<a class="btn whatsapp" target="_blank" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`I want to inquire about ${item.name}`)}">Inquire</a>`;
            return `
              <article class="product-card" data-product-card data-category="${normalizedCategory}" data-images="${escapeHtml(extraImages)}">
                ${imageMarkup}
                <div class="product-body">
                  <span class="badge">${escapeHtml(toSafeCategoryLabel(item.category))}</span>
                  ${soldBadge}
                  <h3>${escapeHtml(item.name || 'Untitled Item')}</h3>
                  <p>${escapeHtml(item.description || 'No description available yet.')}</p>
                  <div class="price">${escapeHtml(toCurrency(item.unitPrice))}</div>
                  <div class="actions">${detailsButton}${inquireButton}</div>
                </div>
              </article>
            `;
          })
          .join('');

        productsGrid.innerHTML = cardMarkup;
        applyStoreFilters();
      };

      fetchStockItems(300)
        .then((items) => renderStockItems(items))
        .catch(() => {
          // keep existing static products when dynamic fetch fails
        });
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
      root.removeEventListener('change', onInput);
      cleanupTasks.forEach((fn) => fn());
    };
  }, [parts.bodyHtml]);

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: parts.bodyHtml }} />
      {showInstallSidePrompt && (
        <aside className='install-side-prompt' aria-label='Install app prompt'>
          <button
            type='button'
            className='install-side-close'
            onClick={() => {
              setShowInstallSidePrompt(false);
              try {
                window.sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, '1');
              } catch {
                // ignore session storage failures
              }
            }}
            aria-label='Close install prompt'
          >
            <i className='fas fa-times' />
          </button>
          <div className='install-side-icon'>
            <i className='fas fa-mobile-screen-button' />
          </div>
          <h3>Install Biltronix App</h3>
          <p>Add this site to your phone or desktop for faster access.</p>
          <button
            type='button'
            className='install-side-btn'
            onClick={() => {
              setShowInstallSidePrompt(false);
              try {
                window.sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, '1');
              } catch {
                // ignore session storage failures
              }
              openInstallDialog();
            }}
          >
            Install Now
          </button>
        </aside>
      )}
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
      {installModal.open && (
        <div className='site-popup-overlay' role='dialog' aria-modal='true' aria-labelledby='install-popup-title'>
          <div className='site-popup-card'>
            <h3 id='install-popup-title'>{installModal.title}</h3>
            <p>{installModal.message}</p>
            <div className='admin-row-actions'>
              {installModal.canInstall && (
                <button type='button' onClick={triggerInstallPrompt}>
                  Install Now
                </button>
              )}
              <button type='button' onClick={() => setInstallModal({ open: false, title: '', message: '', canInstall: false })}>
                {installModal.canInstall ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
      {productModal.open && (
        <div
          className='store-detail-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='store-detail-title'
          onClick={() =>
            setProductModal((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          <div className='store-detail-card' onClick={(event) => event.stopPropagation()}>
            <button
              type='button'
              className='store-detail-close'
              onClick={() =>
                setProductModal((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
              aria-label='Close product details'
            >
              ×
            </button>
            <div className='store-detail-media'>
              {productModal.images.length > 0 ? (
                <>
                  <img src={productModal.images[productModal.index] || ''} alt={productModal.title} />
                  {productModal.images.length > 1 && (
                    <div className='store-detail-controls'>
                      <button
                        type='button'
                        onClick={() =>
                          setProductModal((prev) => ({
                            ...prev,
                            index: prev.index === 0 ? prev.images.length - 1 : prev.index - 1,
                          }))
                        }
                      >
                        Prev
                      </button>
                      <span>
                        {productModal.index + 1} / {productModal.images.length}
                      </span>
                      <button
                        type='button'
                        onClick={() =>
                          setProductModal((prev) => ({
                            ...prev,
                            index: (prev.index + 1) % prev.images.length,
                          }))
                        }
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className='store-detail-noimage'>No image available</div>
              )}
            </div>
            <div className='store-detail-content'>
              <span className='store-detail-badge'>{productModal.category || 'Item'}</span>
              <h3 id='store-detail-title'>{productModal.title}</h3>
              <p>{productModal.description}</p>
              <p className='store-detail-price'>{productModal.price}</p>
              <ul className='store-detail-list'>
                <li>Quality checked by Biltronix team</li>
                <li>WhatsApp inquiry available for fast response</li>
                <li>Support available for fitment guidance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {tipModal.open && (
        <div
          className='tip-detail-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='tip-detail-title'
          onClick={() =>
            setTipModal((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          <div className='tip-detail-card' onClick={(event) => event.stopPropagation()}>
            <button
              type='button'
              className='tip-detail-close'
              onClick={() =>
                setTipModal((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
              aria-label='Close tip details'
            >
              x
            </button>
            {tipModal.imageUrl ? (
              <img src={tipModal.imageUrl} alt={tipModal.title || 'Car tip'} />
            ) : (
              <div className='tip-detail-noimage'>No image available</div>
            )}
            <span className='tip-detail-badge'>{tipModal.category || 'General'}</span>
            <h3 id='tip-detail-title'>{tipModal.title}</h3>
            <p>{tipModal.body}</p>
          </div>
        </div>
      )}
    </>
  );
}

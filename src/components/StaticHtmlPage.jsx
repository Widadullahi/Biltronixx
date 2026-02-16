import React, { useEffect, useMemo, useRef, useState } from 'react';

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
    if (!root) return undefined;

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
        alert('Thank you for your booking request! We will contact you shortly to confirm your appointment.');
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

    if (root.querySelector('[data-product-card]')) {
      setActiveFilter('all');
    }

    return () => {
      root.removeEventListener('submit', onSubmit);
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
    };
  }, [parts.bodyHtml]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: parts.bodyHtml }} />;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCarTips } from '../lib/sanityClient.js';
import './CarTipsPage.css';

const TIP_PREVIEW_WORD_LIMIT = 24;

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
  {
    title: 'Warm Up Gently, Not For Too Long',
    body: 'Start and drive softly for the first few minutes. Long idling wastes fuel and can increase engine deposits.',
    category: 'Engine Care',
  },
  {
    title: 'Rotate Tires at Service Intervals',
    body: 'Tire rotation improves wear balance and extends tire lifespan, especially on uneven roads.',
    category: 'Maintenance',
  },
  {
    title: 'Use Quality Fuel Consistently',
    body: 'Consistent, clean fuel quality helps maintain injector performance and smoother engine response.',
    category: 'Performance',
  },
];

function trimWords(input, limit = TIP_PREVIEW_WORD_LIMIT) {
  const words = String(input || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= limit) return String(input || '').trim();
  return `${words.slice(0, limit).join(' ')}...`;
}

export default function CarTipsPage() {
  const [tips, setTips] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [tipModal, setTipModal] = useState({
    open: false,
    title: '',
    category: '',
    body: '',
    imageUrl: '',
  });

  useEffect(() => {
    let active = true;

    const loadTips = async () => {
      setIsLoading(true);
      try {
        const remoteTips = await fetchCarTips(120);
        if (!active) return;
        setTips(Array.isArray(remoteTips) && remoteTips.length > 0 ? remoteTips : FALLBACK_CAR_TIPS);
      } catch {
        if (!active) return;
        setTips(FALLBACK_CAR_TIPS);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadTips();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const allCategories = Array.from(new Set(tips.map((tip) => String(tip.category || 'General').trim()).filter(Boolean)));
    return ['All', ...allCategories];
  }, [tips]);

  const filteredTips = useMemo(() => {
    const text = query.trim().toLowerCase();
    return tips.filter((tip) => {
      const categoryMatch = category === 'All' || (tip.category || 'General') === category;
      const searchMatch =
        !text ||
        String(tip.title || '').toLowerCase().includes(text) ||
        String(tip.body || '').toLowerCase().includes(text) ||
        String(tip.category || '').toLowerCase().includes(text);
      return categoryMatch && searchMatch;
    });
  }, [tips, query, category]);

  return (
    <div className='tips-page'>
      <header className='tips-topbar'>
        <div className='tips-container tips-topbar-inner'>
          <Link className='tips-brand' to='/'>
            <img src='/logo.jpg' alt='Biltronix logo' />
            <span>Biltronix Automotive</span>
          </Link>
          <nav className='tips-nav'>
            <Link to='/'>Home</Link>
            <Link to='/sales'>Store</Link>
            <Link to='/inspection-app'>Inspection App</Link>
            <Link className='active' to='/car-tips'>
              Car Tips
            </Link>
          </nav>
        </div>
      </header>

      <section className='tips-hero'>
        <div className='tips-container'>
          <h1>Car Tips & Care Library</h1>
          <p>
            Practical, admin-managed automotive advice pulled from your dashboard content source. Updated tips appear
            here automatically.
          </p>
          <div className='tips-controls'>
            <input
              type='search'
              placeholder='Search tips by title, category, or keyword...'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className='tips-category-row'>
              {categories.map((item) => (
                <button
                  key={item}
                  type='button'
                  className={category === item ? 'active' : ''}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className='tips-container tips-main'>
        {isLoading ? (
          <div className='tips-loading'>Loading tips...</div>
        ) : filteredTips.length === 0 ? (
          <div className='tips-empty'>No tips found for this filter. Try a different keyword or category.</div>
        ) : (
          <div className='tips-grid'>
            {filteredTips.map((tip, index) => (
              <article key={`${tip.title}-${index}`} className='tips-card'>
                {tip.imageUrl ? <img src={tip.imageUrl} alt={tip.title || 'Car tip'} /> : null}
                <span className='tips-chip'>{tip.category || 'General'}</span>
                <h2>{tip.title || 'Untitled Tip'}</h2>
                <p>{trimWords(tip.body || '', TIP_PREVIEW_WORD_LIMIT)}</p>
                <button
                  type='button'
                  className='tip-see-more'
                  onClick={() =>
                    setTipModal({
                      open: true,
                      title: tip.title || 'Untitled Tip',
                      category: tip.category || 'General',
                      body: tip.body || '',
                      imageUrl: tip.imageUrl || '',
                    })
                  }
                >
                  View More
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {tipModal.open && (
        <div
          className='tip-detail-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='car-tip-detail-title'
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
            <h3 id='car-tip-detail-title'>{tipModal.title}</h3>
            <p>{tipModal.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

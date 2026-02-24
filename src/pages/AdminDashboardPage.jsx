import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createCarTip,
  createStockItem,
  deleteCarTip,
  deleteStockItem,
  fetchAdminDashboardData,
  fetchCarTips,
  fetchStockItems,
  setStockItemSoldStatus,
  updateCarTip,
} from '../lib/sanityClient.js';
import { OTHER_OPTION, VEHICLE_MAKES, VEHICLE_MODELS_BY_MAKE } from '../lib/vehicleOptions.js';
import './AdminDashboardPage.css';

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const STOCK_CATEGORIES = [
  { panel: 'vehicle', value: 'vehicle', label: 'Vehicle', addLabel: 'Add Vehicle' },
  { panel: 'car-parts', value: 'car-parts', label: 'Car Parts', addLabel: 'Add Car Part' },
  { panel: 'accessories', value: 'accessories', label: 'Accessories', addLabel: 'Add Accessories' },
];

const VEHICLE_CONDITIONS = ['New', 'Foreign Used', 'Nigerian Used'];
const VEHICLE_TRANSMISSIONS = ['Automatic', 'Manual'];
const VEHICLE_FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TIP_CATEGORIES = ['General', 'Maintenance', 'Safety', 'Engine Care', 'Performance', 'Buying Guide'];

const ADMIN_LOGIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_LOGIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || '');
const ADMIN_SESSION_KEY = 'biltronix_admin_authenticated';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function AdminDashboardPage() {
  const [activePanel, setActivePanel] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('all');
  const [bookingQuery, setBookingQuery] = useState('');
  const [orderChannel, setOrderChannel] = useState('all');
  const [orderQuery, setOrderQuery] = useState('');
  const [dashboardData, setDashboardData] = useState({ bookings: [], orders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [stockMessage, setStockMessage] = useState('');
  const [savingItemId, setSavingItemId] = useState('');
  const [carTips, setCarTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(true);
  const [tipsError, setTipsError] = useState('');
  const [tipsMessage, setTipsMessage] = useState('');
  const [savingTipId, setSavingTipId] = useState('');
  const [newTipTitle, setNewTipTitle] = useState('');
  const [newTipBody, setNewTipBody] = useState('');
  const [newTipCategory, setNewTipCategory] = useState('General');
  const [newTipImageFile, setNewTipImageFile] = useState(null);
  const [editingTipId, setEditingTipId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('');
  const [newPrimaryImageFile, setNewPrimaryImageFile] = useState(null);
  const [newOtherImageFiles, setNewOtherImageFiles] = useState([]);
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [customNewVehicleMake, setCustomNewVehicleMake] = useState('');
  const [customNewVehicleModel, setCustomNewVehicleModel] = useState('');
  const [newVehicleDescription, setNewVehicleDescription] = useState('');
  const [newVehicleYear, setNewVehicleYear] = useState(String(new Date().getFullYear()));
  const [newVehicleCondition, setNewVehicleCondition] = useState(VEHICLE_CONDITIONS[0]);
  const [newVehicleTransmission, setNewVehicleTransmission] = useState(VEHICLE_TRANSMISSIONS[0]);
  const [newVehicleFuelType, setNewVehicleFuelType] = useState(VEHICLE_FUEL_TYPES[0]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showCarPartForm, setShowCarPartForm] = useState(false);
  const [showAccessoriesForm, setShowAccessoriesForm] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: '',
    id: '',
    label: '',
    processing: false,
  });

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAdminDashboardData();
      setDashboardData(data);
    } catch (loadError) {
      setDashboardData({ bookings: [], orders: [] });
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data from Sanity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadDashboardData();
  }, [isAuthenticated]);

  const loadStockItems = async () => {
    setStockLoading(true);
    setStockError('');

    try {
      const items = await fetchStockItems();
      setStockItems(items);
    } catch (loadError) {
      setStockItems([]);
      setStockError(loadError instanceof Error ? loadError.message : 'Failed to load items.');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStockItems();
  }, [isAuthenticated]);

  const loadCarTips = async () => {
    setTipsLoading(true);
    setTipsError('');
    try {
      const tips = await fetchCarTips(200);
      setCarTips(tips);
    } catch (loadError) {
      setCarTips([]);
      setTipsError(loadError instanceof Error ? loadError.message : 'Failed to load car tips.');
    } finally {
      setTipsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadCarTips();
  }, [isAuthenticated]);

  const bookings = dashboardData.bookings;
  const orders = dashboardData.orders;

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusMatch = bookingStatus === 'all' || toSlug(booking.status) === bookingStatus;
      const query = bookingQuery.trim().toLowerCase();
      const queryMatch =
        !query ||
        booking.id.toLowerCase().includes(query) ||
        booking.customer.toLowerCase().includes(query) ||
        booking.service.toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });
  }, [bookings, bookingStatus, bookingQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const channelMatch = orderChannel === 'all' || order.channel.toLowerCase() === orderChannel;
      const query = orderQuery.trim().toLowerCase();
      const queryMatch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.item.toLowerCase().includes(query);
      return channelMatch && queryMatch;
    });
  }, [orders, orderChannel, orderQuery]);

  const metrics = useMemo(() => {
    const vehicleCount = stockItems.filter((item) => item.category === 'vehicle').length;
    const carPartCount = stockItems.filter((item) => item.category === 'car-parts').length;
    const accessoriesCount = stockItems.filter((item) => item.category === 'accessories').length;

    return [
      { label: 'Total Vehicles', value: String(vehicleCount), icon: 'fa-car-side' },
      { label: 'Total Car Parts', value: String(carPartCount), icon: 'fa-cogs' },
      { label: 'Total Accessories', value: String(accessoriesCount), icon: 'fa-toolbox' },
    ];
  }, [stockItems]);

  const revenueByChannel = useMemo(() => {
    const totals = orders.reduce((acc, order) => {
      const key = order.channel;
      const next = (acc[key] || 0) + order.amountValue;
      return { ...acc, [key]: next };
    }, {});

    const overall = Object.values(totals).reduce((sum, value) => sum + value, 0);
    return Object.entries(totals)
      .map(([channel, value]) => ({
        channel,
        value,
        percentage: overall ? Math.round((value / overall) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const bookingStatuses = useMemo(() => {
    const unique = Array.from(new Set(bookings.map((booking) => booking.status))).filter(Boolean);
    return unique;
  }, [bookings]);

  const orderChannels = useMemo(() => {
    const unique = Array.from(new Set(orders.map((order) => order.channel))).filter(Boolean);
    return unique;
  }, [orders]);

  const activeStockCategory = useMemo(() => {
    const found = STOCK_CATEGORIES.find((category) => category.panel === activePanel);
    return found ? found.value : '';
  }, [activePanel]);

  const stockItemsByCategory = useMemo(() => {
    return stockItems.filter((item) => item.category === activeStockCategory);
  }, [activeStockCategory, stockItems]);

  const activeStockMeta = useMemo(() => {
    return STOCK_CATEGORIES.find((item) => item.panel === activePanel) || null;
  }, [activePanel]);
  const isTipSaving = savingTipId === 'new' || (Boolean(editingTipId) && savingTipId === editingTipId);

  const vehicleStats = useMemo(() => {
    const vehicles = stockItems.filter((item) => item.category === 'vehicle');
    const newCount = vehicles.filter((item) => item.condition === 'New').length;
    const foreignUsedCount = vehicles.filter((item) => item.condition === 'Foreign Used').length;
    const nigerianUsedCount = vehicles.filter((item) => item.condition === 'Nigerian Used').length;
    return { totalVehicles: vehicles.length, newCount, foreignUsedCount, nigerianUsedCount };
  }, [stockItems]);
  const adminVehicleModelOptions = useMemo(() => {
    if (!newVehicleMake || newVehicleMake === OTHER_OPTION) return [];
    return VEHICLE_MODELS_BY_MAKE[newVehicleMake] || [];
  }, [newVehicleMake]);

  const addStockItem = async () => {
    if (!activeStockCategory) return;

    setStockError('');
    setStockMessage('');
    setSavingItemId('new');
    try {
      const hasAnyImage = Boolean(newPrimaryImageFile || (Array.isArray(newOtherImageFiles) && newOtherImageFiles.length > 0));
      if (!hasAnyImage) {
        throw new Error('Please upload at least one image (Primary or Other Images).');
      }

      let payload;
      if (activeStockCategory === 'vehicle') {
        const resolvedVehicleMake = newVehicleMake === OTHER_OPTION ? customNewVehicleMake.trim() : newVehicleMake.trim();
        const resolvedVehicleModel = newVehicleModel === OTHER_OPTION ? customNewVehicleModel.trim() : newVehicleModel.trim();

        if (!resolvedVehicleMake || !resolvedVehicleModel) {
          throw new Error('Vehicle make and model are required.');
        }
        const vehicleName = `${newVehicleYear} ${resolvedVehicleMake} ${resolvedVehicleModel}`.trim();
        payload = {
          name: vehicleName,
          description: newVehicleDescription.trim(),
          primaryImageFile: newPrimaryImageFile,
          otherImageFiles: newOtherImageFiles,
          soldOut: false,
          category: activeStockCategory,
          unitPrice: newItemUnitPrice,
          make: resolvedVehicleMake,
          model: resolvedVehicleModel,
          year: newVehicleYear,
          condition: newVehicleCondition,
          transmission: newVehicleTransmission,
          fuelType: newVehicleFuelType,
        };
      } else {
        if (!newItemName.trim()) {
          throw new Error('Item name is required.');
        }
        payload = {
          name: newItemName.trim(),
          description: newItemDescription.trim(),
          primaryImageFile: newPrimaryImageFile,
          otherImageFiles: newOtherImageFiles,
          soldOut: false,
          category: activeStockCategory,
          unitPrice: newItemUnitPrice,
        };
      }

      const created = await createStockItem({
        ...payload,
      });
      setStockItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      setNewItemDescription('');
      setNewItemUnitPrice('');
      setNewPrimaryImageFile(null);
      setNewOtherImageFiles([]);
      setNewVehicleMake('');
      setNewVehicleModel('');
      setCustomNewVehicleMake('');
      setCustomNewVehicleModel('');
      setNewVehicleDescription('');
      setNewVehicleYear(String(new Date().getFullYear()));
      setNewVehicleCondition(VEHICLE_CONDITIONS[0]);
      setNewVehicleTransmission(VEHICLE_TRANSMISSIONS[0]);
      setNewVehicleFuelType(VEHICLE_FUEL_TYPES[0]);
      setShowVehicleForm(false);
      setShowCarPartForm(false);
      setShowAccessoriesForm(false);
      setStockMessage(`${created.name} added.`);
    } catch (createError) {
      const fallbackMessage = 'Could not add item.';
      const rawMessage = createError instanceof Error ? createError.message : fallbackMessage;
      if (rawMessage.includes('Missing write token')) {
        setStockError('Write access is not configured. Add VITE_SANITY_API_WRITE_TOKEN in .env and restart the app.');
      } else {
        setStockError(rawMessage || fallbackMessage);
      }
    } finally {
      setSavingItemId('');
    }
  };

  const toggleSoldStatus = async (item) => {
    setStockError('');
    setStockMessage('');
    setSavingItemId(item._id);
    try {
      const updated = await setStockItemSoldStatus(item._id, !item.soldOut);
      setStockItems((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
      setStockMessage(`${updated.name} marked as ${updated.soldOut ? 'Sold' : 'Available'}.`);
    } catch (toggleError) {
      setStockError(toggleError instanceof Error ? toggleError.message : 'Could not update sold status.');
    } finally {
      setSavingItemId('');
    }
  };

  const removeItem = async (itemId, itemName) => {
    setStockError('');
    setStockMessage('');
    setSavingItemId(itemId);
    try {
      await deleteStockItem(itemId);
      setStockItems((prev) => prev.filter((entry) => entry._id !== itemId));
      setStockMessage(`${itemName} deleted.`);
    } catch (deleteError) {
      setStockError(deleteError instanceof Error ? deleteError.message : 'Could not delete item.');
    } finally {
      setSavingItemId('');
    }
  };

  const addCarTip = async () => {
    if (!newTipTitle.trim() || !newTipBody.trim()) {
      setTipsError('Tip title and content are required.');
      return;
    }

    setTipsError('');
    setTipsMessage('');
    setSavingTipId('new');
    try {
      const created = await createCarTip({
        title: newTipTitle.trim(),
        body: newTipBody.trim(),
        category: newTipCategory.trim() || 'General',
        imageFile: newTipImageFile,
      });
      setCarTips((prev) => [...prev, created].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))));
      setNewTipTitle('');
      setNewTipBody('');
      setNewTipCategory('General');
      setNewTipImageFile(null);
      setShowTipForm(false);
      setTipsMessage('Car tip added.');
    } catch (saveError) {
      setTipsError(saveError instanceof Error ? saveError.message : 'Could not add car tip.');
    } finally {
      setSavingTipId('');
    }
  };

  const saveEditingTip = async () => {
    if (!editingTipId) return;
    if (!newTipTitle.trim() || !newTipBody.trim()) {
      setTipsError('Tip title and content are required.');
      return;
    }
    const existingTip = carTips.find((tip) => tip._id === editingTipId);
    if (!existingTip) return;
    setTipsError('');
    setTipsMessage('');
    setSavingTipId(editingTipId);
    try {
      const updated = await updateCarTip(editingTipId, {
        ...existingTip,
        title: newTipTitle.trim(),
        body: newTipBody.trim(),
        category: newTipCategory.trim() || 'General',
        imageFile: newTipImageFile,
      });
      setCarTips((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
      setTipsMessage('Car tip updated.');
      setEditingTipId('');
      setNewTipTitle('');
      setNewTipBody('');
      setNewTipCategory('General');
      setNewTipImageFile(null);
      setShowTipForm(false);
    } catch (saveError) {
      setTipsError(saveError instanceof Error ? saveError.message : 'Could not update car tip.');
    } finally {
      setSavingTipId('');
    }
  };

  const removeCarTip = async (tipId) => {
    setTipsError('');
    setTipsMessage('');
    setSavingTipId(tipId);
    try {
      await deleteCarTip(tipId);
      setCarTips((prev) => prev.filter((entry) => entry._id !== tipId));
      setTipsMessage('Car tip deleted.');
    } catch (deleteError) {
      setTipsError(deleteError instanceof Error ? deleteError.message : 'Could not delete car tip.');
    } finally {
      setSavingTipId('');
    }
  };

  const openDeleteModal = (type, id, label) => {
    setDeleteModal({
      open: true,
      type,
      id,
      label,
      processing: false,
    });
  };

  const closeDeleteModal = () => {
    if (deleteModal.processing) return;
    setDeleteModal({
      open: false,
      type: '',
      id: '',
      label: '',
      processing: false,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type || deleteModal.processing) return;

    setDeleteModal((prev) => ({ ...prev, processing: true }));
    try {
      if (deleteModal.type === 'stock') {
        await removeItem(deleteModal.id, deleteModal.label);
      } else if (deleteModal.type === 'tip') {
        await removeCarTip(deleteModal.id);
      }
      setDeleteModal({
        open: false,
        type: '',
        id: '',
        label: '',
        processing: false,
      });
    } catch {
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const handleAdminLogin = (event) => {
    event.preventDefault();
    const normalizedEmail = loginEmail.trim().toLowerCase();

    if (!ADMIN_LOGIN_EMAIL || !ADMIN_LOGIN_PASSWORD) {
      setLoginError('Admin credentials are not configured. Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD.');
      return;
    }

    if (normalizedEmail === ADMIN_LOGIN_EMAIL && loginPassword === ADMIN_LOGIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setLoginError('');
      setLoginPassword('');
      return;
    }

    setLoginError('Invalid admin email or password.');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  };

  const handlePanelChange = (panel) => {
    setActivePanel(panel);
    if (panel !== 'vehicle') setShowVehicleForm(false);
    if (panel !== 'car-parts') setShowCarPartForm(false);
    if (panel !== 'accessories') setShowAccessoriesForm(false);
    if (panel !== 'car-tips') setShowTipForm(false);
    if (window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className='admin-main' style={{ maxWidth: 420, margin: '8vh auto', padding: '0 16px' }}>
        <section className='admin-card'>
          <h2>Admin Login</h2>
          <p>Use your admin email and password to access the dashboard.</p>
          <form className='admin-basic-modal-form' onSubmit={handleAdminLogin}>
            <div className='admin-modal-field'>
              <label htmlFor='admin-email'>Email</label>
              <input
                id='admin-email'
                type='email'
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder='Enter admin email'
                required
              />
            </div>
            <div className='admin-modal-field'>
              <label htmlFor='admin-password'>Password</label>
              <input
                id='admin-password'
                type='password'
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder='Enter admin password'
                required
              />
            </div>
            {loginError && <p className='admin-error-text'>{loginError}</p>}
            <button className='admin-refresh-btn' type='submit'>Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className='admin-shell'>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className='admin-brand'>Biltronix Admin</div>
        <button
          className={`admin-nav-btn ${activePanel === 'overview' ? 'active' : ''}`}
          onClick={() => handlePanelChange('overview')}
        >
          <i className='fas fa-gauge-high' /> Overview
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'vehicle' ? 'active' : ''}`}
          onClick={() => handlePanelChange('vehicle')}
        >
          <i className='fas fa-car-side' /> Vehicle
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'car-parts' ? 'active' : ''}`}
          onClick={() => handlePanelChange('car-parts')}
        >
          <i className='fas fa-cogs' /> Car Parts
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'accessories' ? 'active' : ''}`}
          onClick={() => handlePanelChange('accessories')}
        >
          <i className='fas fa-toolbox' /> Accessories
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'car-tips' ? 'active' : ''}`}
          onClick={() => handlePanelChange('car-tips')}
        >
          <i className='fas fa-lightbulb' /> Car Tips
        </button>
        <div className='admin-sidebar-links'>
          <Link className='admin-link-btn home' to='/' onClick={() => setSidebarOpen(false)}>
            View Home
          </Link>
          <Link className='admin-link-btn store' to='/sales' onClick={() => setSidebarOpen(false)}>
            View Store
          </Link>
        </div>
      </aside>
      {sidebarOpen && <button className='admin-sidebar-backdrop' onClick={() => setSidebarOpen(false)} aria-label='Close navigation' />}

      <main className='admin-main'>
        <header className='admin-header'>
          <div className='admin-header-top'>
            <button
              className='admin-menu-toggle'
              type='button'
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              <i className='fas fa-bars' />
            </button>
            <h1>Operations Dashboard</h1>
            <button className='admin-refresh-btn' type='button' onClick={handleAdminLogout}>
              Logout
            </button>
          </div>
          <p>Track bookings, orders, and item listings from one place.</p>
          {error && <p className='admin-error-text'>{error}</p>}
        </header>

        {activePanel === 'overview' && (
          <>
            <section className='admin-grid'>
              {metrics.map((metric) => (
                <article key={metric.label} className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className={`fas ${metric.icon}`} />
                  </div>
                  <div>
                    <div className='metric-value'>{metric.value}</div>
                    <div className='metric-label'>{metric.label}</div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {activePanel === 'bookings' && (
          <section className='admin-card'>
            <h2>Recent Bookings</h2>
            <div className='admin-controls'>
              <input
                type='search'
                value={bookingQuery}
                onChange={(event) => setBookingQuery(event.target.value)}
                placeholder='Search by ID, customer, or service'
              />
              <select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}>
                <option value='all'>All Statuses</option>
                {bookingStatuses.map((status) => (
                  <option key={status} value={toSlug(status)}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <table className='admin-table'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.customer}</td>
                    <td>{booking.service}</td>
                    <td>{formatDate(booking.date)}</td>
                    <td>
                      <span className={`pill ${toSlug(booking.status)}`}>{booking.status}</span>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className='empty-row'>
                      No bookings found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {activePanel === 'orders' && (
          <section className='admin-card'>
            <h2>Latest Orders</h2>
            <div className='admin-controls'>
              <input
                type='search'
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder='Search by order, customer, or item'
              />
              <select value={orderChannel} onChange={(event) => setOrderChannel(event.target.value)}>
                <option value='all'>All Channels</option>
                {orderChannels.map((channel) => (
                  <option key={channel} value={channel.toLowerCase()}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
            <table className='admin-table'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.item}</td>
                    <td>{order.customer}</td>
                    <td>{order.amountLabel}</td>
                    <td>{order.channel}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className='empty-row'>
                      No orders found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {(activePanel === 'vehicle' || activePanel === 'car-parts' || activePanel === 'accessories') && (
          <section className='admin-card'>
            <h2>{activeStockMeta?.label} Manager</h2>
            <p className='inv-threshold'>
              {activePanel === 'vehicle'
                ? 'Add vehicles.'
                : activePanel === 'car-parts'
                ? 'Add car parts.'
                : 'Add accessories.'}
            </p>

            {activePanel === 'vehicle' && (
              <section className='admin-grid'>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-car-side' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.totalVehicles}</div>
                    <div className='metric-label'>Number of Vehicles</div>
                  </div>
                </article>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-certificate' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.newCount}</div>
                    <div className='metric-label'>New</div>
                  </div>
                </article>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-globe-africa' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.foreignUsedCount}</div>
                    <div className='metric-label'>Foreign Used</div>
                  </div>
                </article>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-flag' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.nigerianUsedCount}</div>
                    <div className='metric-label'>Nigerian Used</div>
                  </div>
                </article>
              </section>
            )}

            {activePanel === 'vehicle' ? (
              <>
                <div className='admin-stock-actions'>
                  <button
                    className='admin-refresh-btn'
                    type='button'
                    onClick={() => {
                      setNewPrimaryImageFile(null);
                      setNewOtherImageFiles([]);
                      setShowVehicleForm(true);
                      setShowCarPartForm(false);
                      setShowAccessoriesForm(false);
                    }}
                    disabled={savingItemId === 'new'}
                  >
                    Add Vehicle
                  </button>
                  <button className='admin-refresh-btn' type='button' onClick={loadStockItems} disabled={stockLoading}>
                    {stockLoading ? 'Refreshing...' : 'Refresh List'}
                  </button>
                </div>
              </>
            ) : (
              <div className='admin-stock-actions'>
                <button
                  className='admin-refresh-btn'
                  type='button'
                  onClick={() => {
                    setNewPrimaryImageFile(null);
                    setNewOtherImageFiles([]);
                    if (activePanel === 'car-parts') {
                      setShowCarPartForm(true);
                      setShowAccessoriesForm(false);
                    } else {
                      setShowAccessoriesForm(true);
                      setShowCarPartForm(false);
                    }
                    setShowVehicleForm(false);
                  }}
                  disabled={savingItemId === 'new'}
                >
                  {activeStockMeta?.addLabel || 'Add Item'}
                </button>
                <button className='admin-refresh-btn' type='button' onClick={loadStockItems} disabled={stockLoading}>
                  {stockLoading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            )}

            {stockMessage && <p className='admin-success-text'>{stockMessage}</p>}
            {stockError && <p className='admin-error-text'>{stockError}</p>}

            <table className='admin-table'>
              <thead>
                {activePanel === 'vehicle' ? (
                  <tr>
                    <th>Vehicle</th>
                    <th>Description</th>
                    <th>Condition</th>
                    <th>Transmission</th>
                    <th>Fuel</th>
                    <th>Status</th>
                    <th>Unit Price</th>
                    <th>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Unit Price</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {stockItemsByCategory.map((item) => (
                  activePanel === 'vehicle' ? (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.description || '-'}</td>
                      <td>{item.condition || '-'}</td>
                      <td>{item.transmission || '-'}</td>
                      <td>{item.fuelType || '-'}</td>
                      <td>
                        <span className={`pill ${item.soldOut ? 'critical' : 'healthy'}`}>{item.soldOut ? 'Sold' : 'Available'}</span>
                      </td>
                      <td>{naira.format(item.unitPrice || 0)}</td>
                      <td>
                        <div className='admin-row-actions'>
                          <button className='admin-refresh-btn' type='button' onClick={() => toggleSoldStatus(item)} disabled={savingItemId === item._id}>
                            {savingItemId === item._id ? 'Saving...' : item.soldOut ? 'Mark Available' : 'Mark Sold'}
                          </button>
                          <button
                            className='admin-refresh-btn danger'
                            type='button'
                            onClick={() => openDeleteModal('stock', item._id, item.name || 'this item')}
                            disabled={savingItemId === item._id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.description || '-'}</td>
                      <td>
                        <span className={`pill ${item.soldOut ? 'critical' : 'healthy'}`}>{item.soldOut ? 'Sold' : 'Available'}</span>
                      </td>
                      <td>{naira.format(item.unitPrice || 0)}</td>
                      <td>
                        <div className='admin-row-actions'>
                          <button className='admin-refresh-btn' type='button' onClick={() => toggleSoldStatus(item)} disabled={savingItemId === item._id}>
                            {savingItemId === item._id ? 'Saving...' : item.soldOut ? 'Mark Available' : 'Mark Sold'}
                          </button>
                          <button
                            className='admin-refresh-btn danger'
                            type='button'
                            onClick={() => openDeleteModal('stock', item._id, item.name || 'this item')}
                            disabled={savingItemId === item._id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {stockItemsByCategory.length === 0 && !stockLoading && (
                  <tr>
                    <td colSpan={activePanel === 'vehicle' ? 8 : 5} className='empty-row'>
                      No items yet for this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {activePanel === 'car-tips' && (
          <section className='admin-card'>
            <h2>Car Tips Manager</h2>
            <p className='inv-threshold'>Add and update tips shown on the landing page. One image per tip.</p>

            <div className='admin-stock-actions'>
              <button
                className='admin-refresh-btn'
                type='button'
                onClick={() => {
                  setEditingTipId('');
                  setNewTipTitle('');
                  setNewTipBody('');
                  setNewTipCategory('General');
                  setNewTipImageFile(null);
                  setShowTipForm(true);
                }}
                disabled={savingTipId === 'new'}
              >
                Add Tip
              </button>
              <button className='admin-refresh-btn' type='button' onClick={loadCarTips} disabled={tipsLoading}>
                {tipsLoading ? 'Refreshing...' : 'Refresh Tips'}
              </button>
            </div>

            {tipsMessage && <p className='admin-success-text'>{tipsMessage}</p>}
            {tipsError && <p className='admin-error-text'>{tipsError}</p>}

            <table className='admin-table'>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Image</th>
                  <th>Content</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {carTips.map((tip) => (
                  <tr key={tip._id}>
                    <td>{tip.title}</td>
                    <td>{tip.category || 'General'}</td>
                    <td>
                      <div className='admin-tip-image-cell'>
                        {tip.imageUrl ? <img src={tip.imageUrl} alt={tip.title || 'Tip image'} /> : <span>No image</span>}
                      </div>
                    </td>
                    <td>{tip.body ? `${tip.body.slice(0, 90)}${tip.body.length > 90 ? '...' : ''}` : '-'}</td>
                    <td>
                      <div className='admin-row-actions'>
                        <button
                          className='admin-refresh-btn'
                          type='button'
                          onClick={() => {
                            setEditingTipId(tip._id);
                            setNewTipTitle(tip.title || '');
                            setNewTipBody(tip.body || '');
                            setNewTipCategory(tip.category || 'General');
                            setNewTipImageFile(null);
                            setShowTipForm(true);
                          }}
                          disabled={savingTipId === tip._id}
                        >
                          Edit
                        </button>
                        <button
                          className='admin-refresh-btn danger'
                          type='button'
                          onClick={() => openDeleteModal('tip', tip._id, tip.title || 'this tip')}
                          disabled={savingTipId === tip._id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!tipsLoading && carTips.length === 0 && (
                  <tr>
                    <td colSpan={5} className='empty-row'>
                      No car tips yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </main>
      {showTipForm && activePanel === 'car-tips' && (
        <div className='admin-modal-overlay' onClick={() => (isTipSaving ? null : setShowTipForm(false))}>
          <div className='admin-modal-card' onClick={(event) => event.stopPropagation()}>
            <div className='admin-modal-head'>
              <h3>{editingTipId ? 'Edit Car Tip' : 'Add Car Tip'}</h3>
              <button
                type='button'
                className='admin-modal-close'
                onClick={() => setShowTipForm(false)}
                disabled={isTipSaving}
                aria-label='Close tip form'
              >
                <i className='fas fa-times' />
              </button>
            </div>
            <p>Enter tip details and optional image.</p>
            <div className='admin-basic-modal-form'>
              <div className='admin-modal-field'>
                <label>Title</label>
                <input
                  type='text'
                  placeholder='Tip title'
                  value={newTipTitle}
                  onChange={(event) => setNewTipTitle(event.target.value)}
                  disabled={isTipSaving}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Category</label>
                <select
                  value={newTipCategory}
                  onChange={(event) => setNewTipCategory(event.target.value)}
                  disabled={isTipSaving}
                >
                  {TIP_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className='admin-modal-field'>
                <label>Image</label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(event) => setNewTipImageFile(event.target.files?.[0] || null)}
                  disabled={isTipSaving}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Content</label>
                <textarea
                  placeholder='Tip content'
                  value={newTipBody}
                  onChange={(event) => setNewTipBody(event.target.value)}
                  disabled={isTipSaving}
                />
              </div>
            </div>
            <div className='admin-modal-actions'>
              <button
                className='admin-refresh-btn'
                type='button'
                onClick={editingTipId ? saveEditingTip : addCarTip}
                disabled={isTipSaving}
              >
                {isTipSaving
                  ? editingTipId
                    ? 'Saving...'
                    : 'Adding...'
                  : editingTipId
                  ? 'Save Changes'
                  : 'Add Tip'}
              </button>
              <button className='admin-refresh-btn' type='button' onClick={() => setShowTipForm(false)} disabled={isTipSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showVehicleForm && activePanel === 'vehicle' && (
        <div className='admin-modal-overlay' onClick={() => (savingItemId === 'new' ? null : setShowVehicleForm(false))}>
          <div className='admin-modal-card' onClick={(event) => event.stopPropagation()}>
            <div className='admin-modal-head'>
              <h3>Add New Vehicle</h3>
              <button
                type='button'
                className='admin-modal-close'
                onClick={() => setShowVehicleForm(false)}
                disabled={savingItemId === 'new'}
                aria-label='Close vehicle form'
              >
                <i className='fas fa-times' />
              </button>
            </div>
            <p>Enter vehicle details and unit price.</p>
            <div className='admin-vehicle-modal-form'>
              <select
                value={newVehicleMake}
                onChange={(event) => {
                  setNewVehicleMake(event.target.value);
                  setNewVehicleModel('');
                  setCustomNewVehicleMake('');
                  setCustomNewVehicleModel('');
                }}
                disabled={savingItemId === 'new'}
              >
                <option value=''>Select Make</option>
                {VEHICLE_MAKES.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
                <option value={OTHER_OPTION}>Other</option>
              </select>
              {newVehicleMake === OTHER_OPTION && (
                <input
                  type='text'
                  placeholder='Enter Vehicle Make'
                  value={customNewVehicleMake}
                  onChange={(event) => setCustomNewVehicleMake(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              )}
              <select
                value={newVehicleModel}
                onChange={(event) => {
                  setNewVehicleModel(event.target.value);
                  setCustomNewVehicleModel('');
                }}
                disabled={savingItemId === 'new' || !newVehicleMake || newVehicleMake === OTHER_OPTION}
              >
                <option value=''>{newVehicleMake ? 'Select Model' : 'Select Make First'}</option>
                {adminVehicleModelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                {newVehicleMake && newVehicleMake !== OTHER_OPTION && <option value={OTHER_OPTION}>Other</option>}
              </select>
              {(newVehicleMake === OTHER_OPTION || newVehicleModel === OTHER_OPTION) && (
                <input
                  type='text'
                  placeholder='Enter Vehicle Model'
                  value={customNewVehicleModel}
                  onChange={(event) => setCustomNewVehicleModel(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              )}
              <input
                type='number'
                min='1990'
                max='2100'
                placeholder='Year'
                value={newVehicleYear}
                onChange={(event) => setNewVehicleYear(event.target.value)}
                disabled={savingItemId === 'new'}
              />
              <div className='admin-modal-field'>
                <label>Description</label>
                <textarea
                  placeholder='Short vehicle description'
                  value={newVehicleDescription}
                  onChange={(event) => setNewVehicleDescription(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <select value={newVehicleCondition} onChange={(event) => setNewVehicleCondition(event.target.value)} disabled={savingItemId === 'new'}>
                {VEHICLE_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
              <select value={newVehicleTransmission} onChange={(event) => setNewVehicleTransmission(event.target.value)} disabled={savingItemId === 'new'}>
                {VEHICLE_TRANSMISSIONS.map((transmission) => (
                  <option key={transmission} value={transmission}>
                    {transmission}
                  </option>
                ))}
              </select>
              <select value={newVehicleFuelType} onChange={(event) => setNewVehicleFuelType(event.target.value)} disabled={savingItemId === 'new'}>
                {VEHICLE_FUEL_TYPES.map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {fuel}
                  </option>
                ))}
              </select>
              <div className='admin-modal-field'>
                <label>Unit Price (NGN)</label>
                <input
                  type='number'
                  min='0'
                  placeholder='Unit Price (NGN)'
                  value={newItemUnitPrice}
                  onChange={(event) => setNewItemUnitPrice(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Primary Image</label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(event) => setNewPrimaryImageFile(event.target.files?.[0] || null)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Other Images</label>
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={(event) => setNewOtherImageFiles(Array.from(event.target.files || []))}
                  disabled={savingItemId === 'new'}
                />
              </div>
            </div>
            <div className='admin-modal-actions'>
              <button
                className='admin-refresh-btn'
                type='button'
                onClick={addStockItem}
                disabled={savingItemId === 'new'}
              >
                {savingItemId === 'new' ? 'Adding...' : activeStockMeta?.addLabel || 'Add Item'}
              </button>
              <button
                className='admin-refresh-btn'
                type='button'
                onClick={() => setShowVehicleForm(false)}
                disabled={savingItemId === 'new'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showCarPartForm && activePanel === 'car-parts' && (
        <div className='admin-modal-overlay' onClick={() => (savingItemId === 'new' ? null : setShowCarPartForm(false))}>
          <div className='admin-modal-card' onClick={(event) => event.stopPropagation()}>
            <div className='admin-modal-head'>
              <h3>Add Car Part</h3>
              <button
                type='button'
                className='admin-modal-close'
                onClick={() => setShowCarPartForm(false)}
                disabled={savingItemId === 'new'}
                aria-label='Close car part form'
              >
                <i className='fas fa-times' />
              </button>
            </div>
            <p>Enter car part details and unit price.</p>
            <div className='admin-basic-modal-form'>
              <div className='admin-modal-field'>
                <label>Part Name</label>
                <input
                  type='text'
                  placeholder='Car part name'
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Description</label>
                <textarea
                  placeholder='Part description'
                  value={newItemDescription}
                  onChange={(event) => setNewItemDescription(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Unit Price (NGN)</label>
                <input
                  type='number'
                  min='0'
                  placeholder='Unit Price (NGN)'
                  value={newItemUnitPrice}
                  onChange={(event) => setNewItemUnitPrice(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Primary Image</label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(event) => setNewPrimaryImageFile(event.target.files?.[0] || null)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Other Images</label>
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={(event) => setNewOtherImageFiles(Array.from(event.target.files || []))}
                  disabled={savingItemId === 'new'}
                />
              </div>
            </div>
            <div className='admin-modal-actions'>
              <button className='admin-refresh-btn' type='button' onClick={addStockItem} disabled={savingItemId === 'new'}>
                {savingItemId === 'new' ? 'Adding...' : 'Add Car Part'}
              </button>
              <button className='admin-refresh-btn' type='button' onClick={() => setShowCarPartForm(false)} disabled={savingItemId === 'new'}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showAccessoriesForm && activePanel === 'accessories' && (
        <div className='admin-modal-overlay' onClick={() => (savingItemId === 'new' ? null : setShowAccessoriesForm(false))}>
          <div className='admin-modal-card' onClick={(event) => event.stopPropagation()}>
            <div className='admin-modal-head'>
              <h3>Add Accessories</h3>
              <button
                type='button'
                className='admin-modal-close'
                onClick={() => setShowAccessoriesForm(false)}
                disabled={savingItemId === 'new'}
                aria-label='Close accessories form'
              >
                <i className='fas fa-times' />
              </button>
            </div>
            <p>Enter accessories details and unit price.</p>
            <div className='admin-basic-modal-form'>
              <div className='admin-modal-field'>
                <label>Accessory Name</label>
                <input
                  type='text'
                  placeholder='Accessory name'
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Description</label>
                <textarea
                  placeholder='Accessory description'
                  value={newItemDescription}
                  onChange={(event) => setNewItemDescription(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Unit Price (NGN)</label>
                <input
                  type='number'
                  min='0'
                  placeholder='Unit Price (NGN)'
                  value={newItemUnitPrice}
                  onChange={(event) => setNewItemUnitPrice(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Primary Image</label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(event) => setNewPrimaryImageFile(event.target.files?.[0] || null)}
                  disabled={savingItemId === 'new'}
                />
              </div>
              <div className='admin-modal-field'>
                <label>Other Images</label>
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={(event) => setNewOtherImageFiles(Array.from(event.target.files || []))}
                  disabled={savingItemId === 'new'}
                />
              </div>
            </div>
            <div className='admin-modal-actions'>
              <button className='admin-refresh-btn' type='button' onClick={addStockItem} disabled={savingItemId === 'new'}>
                {savingItemId === 'new' ? 'Adding...' : 'Add Accessories'}
              </button>
              <button className='admin-refresh-btn' type='button' onClick={() => setShowAccessoriesForm(false)} disabled={savingItemId === 'new'}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteModal.open && (
        <div className='admin-modal-overlay' onClick={closeDeleteModal}>
          <div className='admin-modal-card' onClick={(event) => event.stopPropagation()}>
            <div className='admin-modal-head'>
              <h3>Confirm Delete</h3>
              <button
                type='button'
                className='admin-modal-close'
                onClick={closeDeleteModal}
                disabled={deleteModal.processing}
                aria-label='Close delete confirmation'
              >
                <i className='fas fa-times' />
              </button>
            </div>
            <p>
              Delete "{deleteModal.label}"? This action cannot be undone.
            </p>
            <div className='admin-modal-actions'>
              <button className='admin-refresh-btn danger' type='button' onClick={confirmDelete} disabled={deleteModal.processing}>
                {deleteModal.processing ? 'Deleting...' : 'Delete'}
              </button>
              <button className='admin-refresh-btn' type='button' onClick={closeDeleteModal} disabled={deleteModal.processing}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createStockItem,
  fetchAdminDashboardData,
  fetchStockItems,
  hasSanityConfig,
  updateStockItem,
} from '../lib/sanityClient.js';
import './AdminDashboardPage.css';

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

function getInventoryState(item) {
  if (item.stock <= item.threshold / 2) return 'critical';
  if (item.stock <= item.threshold) return 'low';
  return 'healthy';
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

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function AdminDashboardPage() {
  const [activePanel, setActivePanel] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('all');
  const [bookingQuery, setBookingQuery] = useState('');
  const [orderChannel, setOrderChannel] = useState('all');
  const [orderQuery, setOrderQuery] = useState('');
  const [dashboardData, setDashboardData] = useState({ bookings: [], orders: [], inventory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [stockMessage, setStockMessage] = useState('');
  const [savingItemId, setSavingItemId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemSold, setNewItemSold] = useState('0');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('0');
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleYear, setNewVehicleYear] = useState(String(new Date().getFullYear()));
  const [newVehicleCondition, setNewVehicleCondition] = useState(VEHICLE_CONDITIONS[0]);
  const [newVehicleTransmission, setNewVehicleTransmission] = useState(VEHICLE_TRANSMISSIONS[0]);
  const [newVehicleFuelType, setNewVehicleFuelType] = useState(VEHICLE_FUEL_TYPES[0]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAdminDashboardData();
      setDashboardData(data);
    } catch (loadError) {
      setDashboardData({ bookings: [], orders: [], inventory: [] });
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data from Sanity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadStockItems = async () => {
    setStockLoading(true);
    setStockError('');

    try {
      const items = await fetchStockItems();
      setStockItems(items);
    } catch (loadError) {
      setStockItems([]);
      setStockError(loadError instanceof Error ? loadError.message : 'Failed to load stock items.');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadStockItems();
  }, []);

  const bookings = dashboardData.bookings;
  const orders = dashboardData.orders;
  const inventory = dashboardData.inventory;

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

  const inventorySummary = useMemo(() => {
    const lowStockItems = inventory.filter((item) => getInventoryState(item) !== 'healthy');
    const criticalStockItems = inventory.filter((item) => getInventoryState(item) === 'critical');
    const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
    return { criticalStockItems, lowStockItems, totalUnits };
  }, [inventory]);

  const metrics = useMemo(() => {
    const todayBookings = bookings.filter((booking) => booking.date === todayIso).length;
    const openOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amountValue, 0);

    return [
      { label: 'Today Bookings', value: String(todayBookings), icon: 'fa-calendar-check' },
      { label: 'Open Orders', value: String(openOrders), icon: 'fa-cart-shopping' },
      { label: 'Revenue (MTD)', value: naira.format(totalRevenue), icon: 'fa-chart-line' },
      { label: 'Low Stock Items', value: String(inventorySummary.lowStockItems.length), icon: 'fa-triangle-exclamation' },
    ];
  }, [bookings, orders, inventorySummary.lowStockItems.length, todayIso]);

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

  const vehicleStats = useMemo(() => {
    const vehicles = stockItems.filter((item) => item.category === 'vehicle');
    const totalStock = vehicles.reduce((sum, item) => sum + item.stock, 0);
    const totalSold = vehicles.reduce((sum, item) => sum + item.sold, 0);
    const newCount = vehicles.filter((item) => item.condition === 'New').length;
    const foreignUsedCount = vehicles.filter((item) => item.condition === 'Foreign Used').length;
    const nigerianUsedCount = vehicles.filter((item) => item.condition === 'Nigerian Used').length;
    return { totalVehicles: vehicles.length, totalStock, totalSold, newCount, foreignUsedCount, nigerianUsedCount };
  }, [stockItems]);

  const saveStockRow = async (item) => {
    setStockMessage('');
    setStockError('');
    setSavingItemId(item._id);
    try {
      const updated = await updateStockItem(item._id, item);
      setStockItems((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
      setStockMessage(`${updated.name} updated.`);
    } catch (saveError) {
      setStockError(saveError instanceof Error ? saveError.message : 'Could not update stock item.');
    } finally {
      setSavingItemId('');
    }
  };

  const addStockItem = async () => {
    if (!activeStockCategory) return;

    setStockError('');
    setStockMessage('');
    setSavingItemId('new');
    try {
      let payload;
      if (activeStockCategory === 'vehicle') {
        if (!newVehicleMake.trim() || !newVehicleModel.trim()) {
          throw new Error('Vehicle make and model are required.');
        }
        const vehicleName = `${newVehicleYear} ${newVehicleMake.trim()} ${newVehicleModel.trim()}`.trim();
        payload = {
          name: vehicleName,
          category: activeStockCategory,
          stock: newItemStock,
          sold: newItemSold,
          unitPrice: newItemUnitPrice,
          make: newVehicleMake.trim(),
          model: newVehicleModel.trim(),
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
          category: activeStockCategory,
          stock: newItemStock,
          sold: newItemSold,
          unitPrice: newItemUnitPrice,
        };
      }

      const created = await createStockItem({
        ...payload,
      });
      setStockItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      setNewItemStock('0');
      setNewItemSold('0');
      setNewItemUnitPrice('0');
      setNewVehicleMake('');
      setNewVehicleModel('');
      setNewVehicleYear(String(new Date().getFullYear()));
      setNewVehicleCondition(VEHICLE_CONDITIONS[0]);
      setNewVehicleTransmission(VEHICLE_TRANSMISSIONS[0]);
      setNewVehicleFuelType(VEHICLE_FUEL_TYPES[0]);
      setShowVehicleForm(false);
      setStockMessage(`${created.name} added.`);
    } catch (createError) {
      setStockError(createError instanceof Error ? createError.message : 'Could not add stock item.');
    } finally {
      setSavingItemId('');
    }
  };

  const handlePanelChange = (panel) => {
    setActivePanel(panel);
    if (panel !== 'vehicle') {
      setShowVehicleForm(false);
    }
    if (window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false);
    }
  };

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
          className={`admin-nav-btn ${activePanel === 'bookings' ? 'active' : ''}`}
          onClick={() => handlePanelChange('bookings')}
        >
          <i className='fas fa-calendar-days' /> Bookings
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'orders' ? 'active' : ''}`}
          onClick={() => handlePanelChange('orders')}
        >
          <i className='fas fa-box-open' /> Orders
        </button>
        {/*
        <button
          className={`admin-nav-btn ${activePanel === 'inventory' ? 'active' : ''}`}
          onClick={() => handlePanelChange('inventory')}
        >
          <i className='fas fa-warehouse' /> Inventory
        </button>
        */}
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
          </div>
          <p>Track bookings, orders, and inventory from one place.</p>
          <div className='admin-data-state'>
            <span className={`status-pill ${error ? 'error' : hasSanityConfig ? 'ok' : 'warn'}`}>
              {error ? 'Sanity Error' : hasSanityConfig ? 'Sanity Connected' : 'Sanity Not Configured'}
            </span>
            <button className='admin-refresh-btn' type='button' onClick={loadDashboardData} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
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
            <section className='admin-grid overview-grid'>
              <article className='admin-card'>
                <h2>Today&apos;s Booking Queue</h2>
                <ul className='admin-list'>
                  {bookings.filter((booking) => booking.date === todayIso).map((booking) => (
                    <li key={booking.id}>
                      <span>{booking.customer}</span>
                      <span className={`pill ${toSlug(booking.status)}`}>{booking.status}</span>
                    </li>
                  ))}
                  {bookings.filter((booking) => booking.date === todayIso).length === 0 && (
                    <li className='empty-row'>No bookings scheduled for today.</li>
                  )}
                </ul>
              </article>
              <article className='admin-card'>
                <h2>Revenue by Channel</h2>
                <ul className='admin-list'>
                  {revenueByChannel.map((entry) => (
                    <li key={entry.channel} className='channel-row'>
                      <div className='channel-meta'>
                        <span>{entry.channel}</span>
                        <strong>{naira.format(entry.value)}</strong>
                      </div>
                      <div className='channel-track'>
                        <span className='channel-fill' style={{ width: `${entry.percentage}%` }} />
                      </div>
                    </li>
                  ))}
                  {revenueByChannel.length === 0 && <li className='empty-row'>No order revenue data yet.</li>}
                </ul>
              </article>
              <article className='admin-card'>
                <h2>Inventory Snapshot</h2>
                <p className='inv-number'>{inventorySummary.totalUnits} total units</p>
                <p className='inv-threshold'>Critical Items: {inventorySummary.criticalStockItems.length}</p>
                <p className='inv-threshold'>Low Stock Alerts: {inventorySummary.lowStockItems.length}</p>
                {inventorySummary.lowStockItems.length > 0 && (
                  <ul className='admin-list compact'>
                    {inventorySummary.lowStockItems.map((item) => (
                      <li key={item.name}>
                        <span>{item.name}</span>
                        <span className={`pill ${getInventoryState(item)}`}>{item.stock} units</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
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

        {/*
        {activePanel === 'inventory' && (
          <section className='admin-card'>
            <h2>Inventory Health</h2>
            <table className='admin-table'>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Coverage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const state = getInventoryState(item);
                  const percentage = Math.max(10, Math.min(100, Math.round((item.stock / item.threshold) * 100)));
                  return (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>{item.threshold}</td>
                      <td>
                        <div className='channel-track'>
                          <span className='channel-fill' style={{ width: `${percentage}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${state}`}>
                          {state === 'healthy' ? 'Healthy' : state === 'low' ? 'Low' : 'Critical'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className='empty-row'>
                      No inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
        */}

        {(activePanel === 'vehicle' || activePanel === 'car-parts' || activePanel === 'accessories') && (
          <section className='admin-card'>
            <h2>{activeStockMeta?.label} Stock Manager</h2>
            <p className='inv-threshold'>Add items, update stock, and mark units sold.</p>

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
                    <i className='fas fa-layer-group' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.totalStock}</div>
                    <div className='metric-label'>Units in Stock</div>
                  </div>
                </article>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-check-circle' />
                  </div>
                  <div>
                    <div className='metric-value'>{vehicleStats.totalSold}</div>
                    <div className='metric-label'>Total Sold</div>
                  </div>
                </article>
                <article className='admin-card metric'>
                  <div className='metric-icon'>
                    <i className='fas fa-tags' />
                  </div>
                  <div>
                    <div className='metric-value'>
                      {vehicleStats.newCount}/{vehicleStats.foreignUsedCount}/{vehicleStats.nigerianUsedCount}
                    </div>
                    <div className='metric-label'>New / Foreign Used / Nigerian Used</div>
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
                    onClick={() => setShowVehicleForm((prev) => !prev)}
                    disabled={savingItemId === 'new'}
                  >
                    {showVehicleForm ? 'Close Vehicle Form' : 'Add Vehicle'}
                  </button>
                  <button className='admin-refresh-btn' type='button' onClick={loadStockItems} disabled={stockLoading}>
                    {stockLoading ? 'Refreshing...' : 'Refresh List'}
                  </button>
                </div>
                {showVehicleForm && (
                  <div className='admin-stock-form vehicle'>
                    <input
                      type='text'
                      placeholder='Make (e.g. Toyota)'
                      value={newVehicleMake}
                      onChange={(event) => setNewVehicleMake(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
                    <input
                      type='text'
                      placeholder='Model (e.g. Camry)'
                      value={newVehicleModel}
                      onChange={(event) => setNewVehicleModel(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
                    <input
                      type='number'
                      min='1990'
                      max='2100'
                      placeholder='Year'
                      value={newVehicleYear}
                      onChange={(event) => setNewVehicleYear(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
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
                    <input
                      type='number'
                      min='0'
                      placeholder='Stock'
                      value={newItemStock}
                      onChange={(event) => setNewItemStock(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
                    <input
                      type='number'
                      min='0'
                      placeholder='Sold'
                      value={newItemSold}
                      onChange={(event) => setNewItemSold(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
                    <input
                      type='number'
                      min='0'
                      placeholder='Unit Price (NGN)'
                      value={newItemUnitPrice}
                      onChange={(event) => setNewItemUnitPrice(event.target.value)}
                      disabled={savingItemId === 'new'}
                    />
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
                )}
              </>
            ) : (
              <div className='admin-stock-form'>
                <input
                  type='text'
                  placeholder={`${activeStockMeta?.label || 'Item'} name`}
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
                <input
                  type='number'
                  min='0'
                  placeholder='Stock'
                  value={newItemStock}
                  onChange={(event) => setNewItemStock(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
                <input
                  type='number'
                  min='0'
                  placeholder='Sold'
                  value={newItemSold}
                  onChange={(event) => setNewItemSold(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
                <input
                  type='number'
                  min='0'
                  placeholder='Unit Price'
                  value={newItemUnitPrice}
                  onChange={(event) => setNewItemUnitPrice(event.target.value)}
                  disabled={savingItemId === 'new'}
                />
                <button
                  className='admin-refresh-btn'
                  type='button'
                  onClick={addStockItem}
                  disabled={savingItemId === 'new'}
                >
                  {savingItemId === 'new' ? 'Adding...' : activeStockMeta?.addLabel || 'Add Item'}
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
                    <th>Condition</th>
                    <th>Transmission</th>
                    <th>Fuel</th>
                    <th>Stock</th>
                    <th>Sold</th>
                    <th>Unit Price</th>
                    <th>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Item</th>
                    <th>Stock</th>
                    <th>Sold</th>
                    <th>Unit Price</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {stockItemsByCategory.map((item) => (
                  activePanel === 'vehicle' ? (
                    <tr key={item._id}>
                      <td>
                        <input
                          type='text'
                          value={item.name}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, name: event.target.value } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <select
                          value={item.condition || VEHICLE_CONDITIONS[0]}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, condition: event.target.value } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        >
                          {VEHICLE_CONDITIONS.map((condition) => (
                            <option key={condition} value={condition}>
                              {condition}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={item.transmission || VEHICLE_TRANSMISSIONS[0]}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, transmission: event.target.value } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        >
                          {VEHICLE_TRANSMISSIONS.map((transmission) => (
                            <option key={transmission} value={transmission}>
                              {transmission}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={item.fuelType || VEHICLE_FUEL_TYPES[0]}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, fuelType: event.target.value } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        >
                          {VEHICLE_FUEL_TYPES.map((fuel) => (
                            <option key={fuel} value={fuel}>
                              {fuel}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.stock}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id
                                  ? { ...entry, stock: Number.parseInt(event.target.value, 10) || 0 }
                                  : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.sold}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, sold: Number.parseInt(event.target.value, 10) || 0 } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.unitPrice}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id
                                  ? { ...entry, unitPrice: Number.parseInt(event.target.value, 10) || 0 }
                                  : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <button
                          className='admin-refresh-btn'
                          type='button'
                          onClick={() => saveStockRow(item)}
                          disabled={savingItemId === item._id}
                        >
                          {savingItemId === item._id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item._id}>
                      <td>
                        <input
                          type='text'
                          value={item.name}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, name: event.target.value } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.stock}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id
                                  ? { ...entry, stock: Number.parseInt(event.target.value, 10) || 0 }
                                  : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.sold}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id ? { ...entry, sold: Number.parseInt(event.target.value, 10) || 0 } : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          min='0'
                          value={item.unitPrice}
                          onChange={(event) =>
                            setStockItems((prev) =>
                              prev.map((entry) =>
                                entry._id === item._id
                                  ? { ...entry, unitPrice: Number.parseInt(event.target.value, 10) || 0 }
                                  : entry
                              )
                            )
                          }
                          disabled={savingItemId === item._id}
                        />
                      </td>
                      <td>
                        <button
                          className='admin-refresh-btn'
                          type='button'
                          onClick={() => saveStockRow(item)}
                          disabled={savingItemId === item._id}
                        >
                          {savingItemId === item._id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                ))}
                {stockItemsByCategory.length === 0 && !stockLoading && (
                  <tr>
                    <td colSpan={activePanel === 'vehicle' ? 8 : 5} className='empty-row'>
                      No stock items yet for this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboardPage.css';

const BOOKINGS = [
  { id: 'BK-2101', customer: 'James O.', service: 'Diagnostics', date: '2026-02-18', status: 'Pending' },
  { id: 'BK-2102', customer: 'Sarah T.', service: 'Engine Repair', date: '2026-02-19', status: 'In Progress' },
  { id: 'BK-2103', customer: 'Michael B.', service: 'Pre-Purchase Check', date: '2026-02-20', status: 'Confirmed' },
  { id: 'BK-2104', customer: 'Rita A.', service: 'EV Battery Service', date: '2026-02-22', status: 'Pending' },
];

const ORDERS = [
  { id: 'ORD-9012', item: 'Brake Pad Set', customer: 'Abiola K.', amount: '$149.99', channel: 'WhatsApp' },
  { id: 'ORD-9013', item: 'Toyota Corolla 2020', customer: 'Kelvin N.', amount: '$18,900', channel: 'Showroom' },
  { id: 'ORD-9014', item: 'Magnetic Phone Holder', customer: 'Lara O.', amount: '$29.99', channel: 'WhatsApp' },
  { id: 'ORD-9015', item: 'Engine Oil 5W-30', customer: 'David E.', amount: '$39.50', channel: 'Website' },
];

const INVENTORY = [
  { name: 'Brake Pads', stock: 54, threshold: 20 },
  { name: 'Engine Oil 5W-30', stock: 18, threshold: 25 },
  { name: 'Air Filters', stock: 36, threshold: 15 },
  { name: 'Battery Packs', stock: 8, threshold: 10 },
];

function getInventoryState(item) {
  if (item.stock <= item.threshold / 2) return 'critical';
  if (item.stock <= item.threshold) return 'low';
  return 'healthy';
}

export default function AdminDashboardPage() {
  const [activePanel, setActivePanel] = useState('overview');

  const metrics = useMemo(
    () => [
      { label: 'Today Bookings', value: '18', icon: 'fa-calendar-check' },
      { label: 'Open Orders', value: '34', icon: 'fa-cart-shopping' },
      { label: 'Revenue (MTD)', value: '$42.8K', icon: 'fa-chart-line' },
      { label: 'Low Stock Items', value: '2', icon: 'fa-triangle-exclamation' },
    ],
    []
  );

  return (
    <div className='admin-shell'>
      <aside className='admin-sidebar'>
        <div className='admin-brand'>Biltronix Admin</div>
        <button
          className={`admin-nav-btn ${activePanel === 'overview' ? 'active' : ''}`}
          onClick={() => setActivePanel('overview')}
        >
          <i className='fas fa-gauge-high' /> Overview
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'bookings' ? 'active' : ''}`}
          onClick={() => setActivePanel('bookings')}
        >
          <i className='fas fa-calendar-days' /> Bookings
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'orders' ? 'active' : ''}`}
          onClick={() => setActivePanel('orders')}
        >
          <i className='fas fa-box-open' /> Orders
        </button>
        <button
          className={`admin-nav-btn ${activePanel === 'inventory' ? 'active' : ''}`}
          onClick={() => setActivePanel('inventory')}
        >
          <i className='fas fa-warehouse' /> Inventory
        </button>
        <div className='admin-sidebar-links'>
          <Link to='/'>View Home</Link>
          <Link to='/sales'>View Store</Link>
        </div>
      </aside>

      <main className='admin-main'>
        <header className='admin-header'>
          <h1>Operations Dashboard</h1>
          <p>Track bookings, orders, and inventory from one place.</p>
        </header>

        {activePanel === 'overview' && (
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
        )}

        {activePanel === 'bookings' && (
          <section className='admin-card'>
            <h2>Recent Bookings</h2>
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
                {BOOKINGS.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.customer}</td>
                    <td>{booking.service}</td>
                    <td>{booking.date}</td>
                    <td>
                      <span className={`pill ${booking.status.toLowerCase().replace(' ', '-')}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activePanel === 'orders' && (
          <section className='admin-card'>
            <h2>Latest Orders</h2>
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
                {ORDERS.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.item}</td>
                    <td>{order.customer}</td>
                    <td>{order.amount}</td>
                    <td>{order.channel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activePanel === 'inventory' && (
          <section className='admin-grid'>
            {INVENTORY.map((item) => {
              const state = getInventoryState(item);
              return (
                <article key={item.name} className='admin-card'>
                  <h3>{item.name}</h3>
                  <p className='inv-number'>{item.stock} units</p>
                  <p className='inv-threshold'>Threshold: {item.threshold}</p>
                  <span className={`pill ${state}`}>
                    {state === 'healthy' ? 'Healthy' : state === 'low' ? 'Low' : 'Critical'}
                  </span>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

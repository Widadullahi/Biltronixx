import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />
      <Route path='/sales' element={<SalesPage />} />
      <Route path='/admin' element={<AdminDashboardPage />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

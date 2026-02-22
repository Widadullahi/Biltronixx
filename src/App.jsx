import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import InspectionPortalPage from './pages/InspectionPortalPage.jsx';
import CarTipsPage from './pages/CarTipsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />
      <Route path='/sales' element={<SalesPage />} />
      <Route path='/car-tips' element={<CarTipsPage />} />
      <Route path='/admin' element={<AdminDashboardPage />} />
      <Route path='/inspection-app' element={<InspectionPortalPage />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

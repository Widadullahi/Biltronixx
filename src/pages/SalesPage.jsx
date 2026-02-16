import React from 'react';
import { Link } from 'react-router-dom';
import StaticHtmlPage from '../components/StaticHtmlPage.jsx';

export default function SalesPage() {
  return (
    <>
      <StaticHtmlPage htmlPath='/pages/sales.html' pageType='sales' />
      <Link className='admin-shortcut' to='/admin'>
        <i className='fas fa-shield-halved' /> Admin
      </Link>
    </>
  );
}

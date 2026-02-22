import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createInspectionReport,
  createInspectorAccount,
  fetchInspectionReportsByAccount,
  loginInspectorAccount,
  updateInspectorAccount,
} from '../lib/sanityClient.js';
import './InspectionPortalPage.css';

const ACCOUNT_KEY = 'biltronix_inspection_account';
const ACCOUNTS_KEY = 'biltronix_inspection_accounts';
const REPORTS_KEY = 'biltronix_inspection_reports';

const CHECK_SECTIONS = [
  { title: 'Exterior Inspection', items: ['Body Condition', 'Headlights', 'Glass & Mirrors', 'Tires', 'License Plates'] },
  { title: 'Interior Inspection', items: ['Seatbelts', 'Dashboard', 'Controls', 'Seats & Upholstery', 'Floor Mats'] },
  { title: 'Engine Compartment', items: ['Fluid Levels', 'Belts & Hoses', 'Battery', 'Engine Condition'] },
  { title: 'Undercarriage Inspection', items: ['Exhaust System', 'Suspension', 'Brakes', 'Steering'] },
  { title: 'Safety Equipment', items: ['Spare Tire & Tools', 'Jack', 'Warning Triangles', 'First Aid Kit'] },
  { title: 'Vehicle Documentation', items: ['Registration', 'Insurance', 'Service Records', 'Owner Manual'] },
  { title: 'Compliance & Emissions', items: ['Emission Control', 'Inspection Sticker', 'Local Compliance'] },
];

const VERDICT_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const REG_NUMBER_REGEX = /^[A-Z]{3}-?\d{3}-?[A-Z]{2}$/;

function normalizeRegNumber(input) {
  return String(input || '')
    .toUpperCase()
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '');
}

function defaultChecklist() {
  return CHECK_SECTIONS.flatMap((section) =>
    section.items.map((label) => ({ section: section.title, label, status: 'Good', note: '' }))
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function saveAccountLocal(account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

function getAccountLocal() {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAccountLocal() {
  localStorage.removeItem(ACCOUNT_KEY);
}

function getAccountsLocal() {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function upsertAccountLocal(accountWithPassword) {
  const accounts = getAccountsLocal();
  const next = [accountWithPassword, ...accounts.filter((item) => item.email !== accountWithPassword.email)];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

function updateAccountProfileLocal(oldEmail, nextAccount) {
  const accounts = getAccountsLocal();
  const oldEmailLower = String(oldEmail || '').toLowerCase();
  let matched = false;

  const updated = accounts.map((item) => {
    if (String(item.email || '').toLowerCase() !== oldEmailLower) return item;
    matched = true;
    return {
      ...item,
      fullName: nextAccount.fullName,
      email: nextAccount.email,
      phone: nextAccount.phone,
      companyName: nextAccount.companyName,
      companyAddress: nextAccount.companyAddress,
      signatureDataUrl: nextAccount.signatureDataUrl,
      companyLogoDataUrl: nextAccount.companyLogoDataUrl,
    };
  });

  if (!matched) {
    updated.unshift(nextAccount);
  }

  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
}

function getReportsLocal() {
  const raw = localStorage.getItem(REPORTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveReportLocal(report) {
  const current = getReportsLocal();
  current.unshift(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(current));
}

function imageFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function createReportPdf(report, account) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const watermarkLabel = String(account.companyName || 'Inspection').trim() || 'Inspection';

  const drawDiagonalWatermark = () => {
    doc.setTextColor(221, 230, 244);
    doc.setFontSize(52);
    doc.text(watermarkLabel, pageWidth / 2, pageHeight / 2, { align: 'center', angle: -30 });
  };

  const drawFrame = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setDrawColor(20, 48, 95);
    doc.setLineWidth(1.2);
    doc.roundedRect(20, 20, pageWidth - 40, pageHeight - 40, 10, 10);
    doc.setFillColor(20, 48, 95);
    doc.rect(28, 28, pageWidth - 56, 82, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(account.companyName || 'Company Name', 40, 60);
    if (account.companyLogoDataUrl) {
      try {
        doc.setDrawColor(255, 255, 255);
        doc.roundedRect(pageWidth - 112, 38, 68, 52, 8, 8);
        doc.addImage(account.companyLogoDataUrl, imageFormat(account.companyLogoDataUrl), pageWidth - 108, 42, 60, 44);
      } catch {
        // ignore
      }
    }
    doc.setFontSize(10);
    doc.text(account.companyAddress || '', 40, 78, { maxWidth: pageWidth - 180 });
    doc.text(`Inspector: ${account.fullName || ''} | WhatsApp: ${account.phone || ''}`, 40, 98);
  };

  drawFrame();

  doc.setTextColor(20, 48, 95);
  doc.setFontSize(16);
  doc.text('Pre-Purchase Vehicle Inspection Report', 30, 134);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date(report.inspectedAt).toLocaleString()}`, 30, 150);
  doc.text(`Vehicle: ${report.vehicleLabel || '-'}`, 30, 164);
  doc.text(`Registration: ${report.vehicleRegNo || '-'}`, 30, 178);
  doc.text(`VIN: ${report.vin || '-'}`, 30, 192);
  doc.text(`Mileage: ${report.mileage || '-'} km`, 250, 192);
  doc.text(`Transmission: ${report.transmission || '-'}`, 30, 206);
  doc.text(`Fuel Type: ${report.fuelType || '-'}`, 250, 206);
  doc.text(`Overall Verdict: ${report.overallVerdict || '-'}`, 30, 220);

  autoTable(doc, {
    startY: 236,
    head: [['Section', 'Inspection Item', 'Status', 'Comments']],
    body: (report.checklist || []).map((item) => [item.section || '', item.label || '', item.status || '', item.note || '-']),
    styles: { fontSize: 8.5, cellPadding: 5.5 },
    headStyles: { fillColor: [20, 48, 95] },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    margin: { left: 30, right: 30 },
  });

  let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 470) + 16;
  doc.setFontSize(11);
  doc.setTextColor(20, 48, 95);
  doc.text('Recommendation', 30, y);
  doc.setFontSize(10);
  doc.setTextColor(60, 72, 94);
  const recommendationLines = doc.splitTextToSize(report.recommendation || 'No recommendation provided.', pageWidth - 70);
  doc.text(recommendationLines, 30, y + 15);
  y += recommendationLines.length * 12 + 26;

  const images = Array.isArray(report.images) ? report.images : [];
  if (images.length > 0) {
    const cardW = 250;
    const cardH = 150;
    const gapX = 18;
    const gapY = 22;
    const startX = 30;

    doc.setFontSize(11);
    doc.setTextColor(20, 48, 95);

    images.forEach((img, index) => {
      const col = index % 2;
      const isNewRow = col === 0;
      if (isNewRow && index > 0) y += cardH + gapY;
      if (y + cardH + 40 > pageHeight - 40) {
        doc.addPage();
        drawFrame();
        y = 130;
      }
      if (col === 0) doc.text('Inspection Image Attachments', 30, y - 10);
      const x = startX + col * (cardW + gapX);
      doc.setDrawColor(216, 224, 240);
      doc.roundedRect(x, y, cardW, cardH, 8, 8);
      try {
        doc.addImage(img, imageFormat(img), x + 6, y + 6, cardW - 12, cardH - 12);
      } catch {
        doc.setTextColor(180, 0, 0);
        doc.text('Image preview unavailable', x + 10, y + 20);
      }
    });

    y += cardH + 24;
  }

  if (y + 70 > pageHeight - 30) {
    doc.addPage();
    drawFrame();
    y = 130;
  }

  doc.setDrawColor(130, 140, 168);
  doc.line(30, y, 230, y);
  if (account.signatureDataUrl) {
    try {
      doc.addImage(account.signatureDataUrl, imageFormat(account.signatureDataUrl), 34, y - 45, 120, 36);
    } catch {
      // ignore
    }
  }

  doc.setTextColor(20, 48, 95);
  doc.setFontSize(10);
  doc.text(account.fullName || 'Inspector', 30, y + 14);
  doc.text(account.companyName || '', 30, y + 28);

  const totalPages = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
    doc.setPage(pageIndex);
    drawDiagonalWatermark();
  }

  const fileId = (report.vehicleRegNo || report.vehicleLabel || 'vehicle').replace(/\s+/g, '-').toLowerCase();
  doc.save(`prepurchase-inspection-${fileId}.pdf`);
}

export default function InspectionPortalPage() {
  const [account, setAccount] = useState(() => getAccountLocal());
  const [authMode, setAuthMode] = useState('register');
  const [activeTab, setActiveTab] = useState('new');
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [registration, setRegistration] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    signatureDataUrl: '',
    companyLogoDataUrl: '',
  });

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    signatureDataUrl: '',
    companyLogoDataUrl: '',
  });

  const [inspection, setInspection] = useState({
    vehicleMake: '',
    vehicleModel: '',
    year: '',
    color: '',
    vin: '',
    regNo: '',
    mileage: '',
    transmission: '',
    fuelType: '',
    overallVerdict: 'Good',
    recommendation: '',
    checklist: defaultChecklist(),
    images: [],
  });

  const groupedChecklist = useMemo(
    () =>
      CHECK_SECTIONS.map((section) => ({
        title: section.title,
        rows: inspection.checklist.filter((item) => item.section === section.title),
      })),
    [inspection.checklist]
  );

  const inspectionCount = reports.length;

  const loadReports = async (accountId) => {
    if (!accountId) return;
    setLoadingReports(true);
    try {
      const remote = await fetchInspectionReportsByAccount(accountId);
      setReports(remote);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(remote));
    } catch {
      const local = getReportsLocal().filter((report) => report.accountId === accountId);
      setReports(local);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (account?._id) {
      loadReports(account._id);
    }
  }, [account?._id]);

  useEffect(() => {
    if (!account) return;
    setSettings({
      fullName: account.fullName || '',
      email: account.email || '',
      phone: account.phone || '',
      companyName: account.companyName || '',
      companyAddress: account.companyAddress || '',
      signatureDataUrl: account.signatureDataUrl || '',
      companyLogoDataUrl: account.companyLogoDataUrl || '',
    });
  }, [account]);

  const registerAccount = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (registration.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (registration.password !== registration.confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    const payload = {
      ...registration,
      _id: generateId('acct'),
    };

    try {
      const created = await createInspectorAccount(payload);
      setAccount(created);
      saveAccountLocal(created);
      upsertAccountLocal({ ...created, password: registration.password });
      setMessage('Account created. You can now create inspections.');
    } catch {
      const localAccount = {
        _id: payload._id,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        companyAddress: payload.companyAddress,
        signatureDataUrl: payload.signatureDataUrl,
        companyLogoDataUrl: payload.companyLogoDataUrl,
      };
      setAccount(localAccount);
      saveAccountLocal(localAccount);
      upsertAccountLocal({ ...localAccount, password: registration.password });
      setMessage('Account created locally. Add write token later to sync to Sanity.');
    }
  };

  const loginAccount = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const loggedIn = await loginInspectorAccount(loginData.email.trim(), loginData.password);
      setAccount(loggedIn);
      saveAccountLocal(loggedIn);
      setMessage('Logged in successfully.');
      return;
    } catch {
      const accounts = getAccountsLocal();
      const local = accounts.find(
        (item) =>
          String(item.email || '').toLowerCase() === loginData.email.trim().toLowerCase() &&
          item.password === loginData.password
      );

      if (local) {
        const localAccount = {
          _id: local._id,
          fullName: local.fullName,
          email: local.email,
          phone: local.phone,
          companyName: local.companyName,
          companyAddress: local.companyAddress,
          signatureDataUrl: local.signatureDataUrl,
          companyLogoDataUrl: local.companyLogoDataUrl,
        };
        setAccount(localAccount);
        saveAccountLocal(localAccount);
        setMessage('Logged in from local account data.');
        return;
      }

      setError('Invalid email or password.');
    }
  };

  const uploadSignature = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setRegistration((prev) => ({ ...prev, signatureDataUrl: dataUrl }));
  };

  const uploadCompanyLogo = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setRegistration((prev) => ({ ...prev, companyLogoDataUrl: dataUrl }));
  };

  const uploadSettingsSignature = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setSettings((prev) => ({ ...prev, signatureDataUrl: dataUrl }));
  };

  const uploadSettingsCompanyLogo = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setSettings((prev) => ({ ...prev, companyLogoDataUrl: dataUrl }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!account?._id) return;
    setSavingSettings(true);
    setMessage('');
    setError('');
    const oldEmail = account.email;

    try {
      const updated = await updateInspectorAccount(account._id, settings);
      setAccount(updated);
      saveAccountLocal(updated);
      updateAccountProfileLocal(oldEmail, updated);
      setMessage('Settings updated successfully.');
    } catch {
      const localUpdated = { ...account, ...settings };
      setAccount(localUpdated);
      saveAccountLocal(localUpdated);
      updateAccountProfileLocal(oldEmail, localUpdated);
      setMessage('Settings updated locally.');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateChecklist = (sectionTitle, indexInSection, field, value) => {
    setInspection((prev) => {
      let seen = -1;
      const next = prev.checklist.map((item) => {
        if (item.section !== sectionTitle) return item;
        seen += 1;
        if (seen !== indexInSection) return item;
        return { ...item, [field]: value };
      });
      return { ...prev, checklist: next };
    });
  };

  const uploadInspectionImages = async (files) => {
    const list = Array.from(files || []).slice(0, 10);
    const dataUrls = await Promise.all(list.map((file) => readFileAsDataUrl(file)));
    setInspection((prev) => ({ ...prev, images: dataUrls }));
  };

  const submitInspection = async (event) => {
    event.preventDefault();
    if (!account) return;
    setMessage('');
    setError('');

    const vinValue = String(inspection.vin || '').trim().toUpperCase();
    const regValue = normalizeRegNumber(inspection.regNo);

    if (vinValue && !VIN_REGEX.test(vinValue)) {
      setError('VIN must be exactly 17 characters and should not contain I, O, or Q.');
      return;
    }

    if (regValue && !REG_NUMBER_REGEX.test(regValue)) {
      setError('Registration number must follow format: ABC-123-DE (letters and numbers only).');
      return;
    }

    const report = {
      _id: generateId('report'),
      accountId: account._id,
      companyName: account.companyName,
      inspectorName: account.fullName,
      vehicleLabel: `${inspection.year} ${inspection.vehicleMake} ${inspection.vehicleModel}`.trim(),
      vehicleRegNo: regValue,
      vin: vinValue,
      mileage: inspection.mileage,
      transmission: inspection.transmission,
      fuelType: inspection.fuelType,
      inspectedAt: new Date().toISOString(),
      checklist: inspection.checklist,
      images: inspection.images,
      overallVerdict: inspection.overallVerdict,
      recommendation: inspection.recommendation,
    };

    try {
      const saved = await createInspectionReport(report);
      setReports((prev) => [saved, ...prev]);
      saveReportLocal(saved);
      createReportPdf(saved, account);
      setMessage('Inspection saved and PDF downloaded.');
      setError('');
    } catch {
      setReports((prev) => [report, ...prev]);
      saveReportLocal(report);
      createReportPdf(report, account);
      setMessage('Inspection saved locally and PDF downloaded.');
      setError('');
    }

    setInspection({
      vehicleMake: '',
      vehicleModel: '',
      year: '',
      color: '',
      vin: '',
      regNo: '',
      mileage: '',
      transmission: '',
      fuelType: '',
      overallVerdict: 'Good',
      recommendation: '',
      checklist: defaultChecklist(),
      images: [],
    });
    setActiveTab('records');
  };

  const logout = () => {
    setAccount(null);
    setReports([]);
    clearAccountLocal();
    setMessage('');
    setError('');
  };

  if (!account) {
    return (
      <div className='inspection-page'>
        <header className='inspection-topbar'>
          <div className='topbar-main'>
            <Link to='/'>Back to Home</Link>
            <div>
              <h1>Pre-Purchase Inspection App</h1>
              <p>Generate branded, professional reports your clients can trust.</p>
            </div>
          </div>
          <span className='topbar-pill'>Inspector Workspace</span>
        </header>

        <main className='inspection-container auth-layout'>
          <section className='inspection-card auth-copy'>
            <h2>Professional Pre-Purchase Inspection Reports</h2>
            <p>
              Generate clean, branded, client-ready vehicle inspection reports in minutes. Your company details,
              watermark, and optional signature are included automatically.
            </p>
            <p className='lead-note'>
              Create a secure account once, then log in any time with your email and password to continue from your
              dashboard.
            </p>
            <ul>
              <li>Structured checklist inspired by professional inspection workflow</li>
              <li>Upload up to 10 evidence images and include all in PDF</li>
              <li>Inspector dashboard with completed records and instant downloads</li>
              <li>Company letterhead and signature area on every report</li>
            </ul>
          </section>

          <section className='inspection-card auth-panel'>
            <h3>Access Inspection Workspace</h3>
            <p className='auth-subtext'>
              New users can create an account. Returning users should log in with their existing email and password.
            </p>
            <div className='auth-toggle'>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')} type='button'>Create Account</button>
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type='button'>Login</button>
            </div>

            {authMode === 'register' ? (
              <form className='inspection-form' onSubmit={registerAccount}>
                <input required placeholder='Full Name' value={registration.fullName} onChange={(e) => setRegistration((p) => ({ ...p, fullName: e.target.value }))} />
                <input required type='email' placeholder='Email' value={registration.email} onChange={(e) => setRegistration((p) => ({ ...p, email: e.target.value }))} />
                <input required type='password' placeholder='Password' value={registration.password} onChange={(e) => setRegistration((p) => ({ ...p, password: e.target.value }))} />
                <input required type='password' placeholder='Confirm Password' value={registration.confirmPassword} onChange={(e) => setRegistration((p) => ({ ...p, confirmPassword: e.target.value }))} />
                <input required placeholder='WhatsApp Number' value={registration.phone} onChange={(e) => setRegistration((p) => ({ ...p, phone: e.target.value }))} />
                <input required placeholder='Company Name' value={registration.companyName} onChange={(e) => setRegistration((p) => ({ ...p, companyName: e.target.value }))} />
                <textarea required placeholder='Company Address' value={registration.companyAddress} onChange={(e) => setRegistration((p) => ({ ...p, companyAddress: e.target.value }))} />
                <label className='file-label'>
                  Company Logo Upload
                  <input type='file' accept='image/*' onChange={(e) => uploadCompanyLogo(e.target.files?.[0])} />
                </label>
                {registration.companyLogoDataUrl && <img className='logo-preview' src={registration.companyLogoDataUrl} alt='Company logo preview' />}
                <label className='file-label'>
                  Optional Signature Upload
                  <input type='file' accept='image/*' onChange={(e) => uploadSignature(e.target.files?.[0])} />
                </label>
                {registration.signatureDataUrl && <img className='signature-preview' src={registration.signatureDataUrl} alt='Signature preview' />}
                <button type='submit'>Create Account</button>
              </form>
            ) : (
              <form className='inspection-form' onSubmit={loginAccount}>
                <input required type='email' placeholder='Email' value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} />
                <input required type='password' placeholder='Password' value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} />
                <button type='submit'>Login to Dashboard</button>
              </form>
            )}

            {message && <p className='msg'>{message}</p>}
            {error && <p className='err'>{error}</p>}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className='inspection-page'>
      <header className='inspection-topbar'>
        <div className='topbar-main'>
          <Link to='/'>Back to Home</Link>
          <div>
            <h1>Inspection Dashboard</h1>
            <p>Manage reports, review records, and export polished PDFs.</p>
          </div>
        </div>
        <span className='topbar-pill'>{account.companyName || 'Inspection Team'}</span>
      </header>
      <div className='inspection-layout'>
        <aside className='inspection-sidebar'>
          <h3>{account.companyName}</h3>
          <p>{account.fullName}</p>
          <div className='stat-box'>
            <strong>{inspectionCount}</strong>
            <span>Inspections Completed</span>
          </div>
          <button className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>New Pre-Purchase Inspection</button>
          <button className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>Records</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
          <button onClick={logout}>Logout</button>
        </aside>

        <main className='inspection-content'>
          {message && <p className='msg'>{message}</p>}
          {error && <p className='err'>{error}</p>}

          {activeTab === 'new' && (
            <section className='inspection-card'>
              <h2>New Pre-Purchase Inspection</h2>
              <p className='section-note'>
                Complete the vehicle details, run the full checklist, attach clear photos, and generate a polished PDF
                report for your client.
              </p>
              <div className='quick-stats'>
                <article>
                  <span>Checklist Items</span>
                  <strong>{inspection.checklist.length}</strong>
                </article>
                <article>
                  <span>Image Slots</span>
                  <strong>10 Max</strong>
                </article>
                <article>
                  <span>Report Style</span>
                  <strong>Letterhead PDF</strong>
                </article>
              </div>
              <form className='inspection-form' onSubmit={submitInspection}>
                <h3>Vehicle Information</h3>
                <div className='grid-2'>
                  <input required placeholder='Vehicle Make' value={inspection.vehicleMake} onChange={(e) => setInspection((p) => ({ ...p, vehicleMake: e.target.value }))} />
                  <input required placeholder='Vehicle Model' value={inspection.vehicleModel} onChange={(e) => setInspection((p) => ({ ...p, vehicleModel: e.target.value }))} />
                  <input required type='number' placeholder='Year' value={inspection.year} onChange={(e) => setInspection((p) => ({ ...p, year: e.target.value }))} />
                  <input placeholder='Color' value={inspection.color} onChange={(e) => setInspection((p) => ({ ...p, color: e.target.value }))} />
                  <input
                    placeholder='VIN (17 characters)'
                    value={inspection.vin}
                    maxLength={17}
                    pattern='[A-HJ-NPR-Z0-9]{17}'
                    title='VIN must be 17 characters. Letters I, O, and Q are not allowed.'
                    onChange={(e) => setInspection((p) => ({ ...p, vin: e.target.value.toUpperCase() }))}
                  />
                  <input
                    placeholder='Registration Number (ABC-123-DE)'
                    value={inspection.regNo}
                    maxLength={12}
                    pattern='[A-Za-z]{3}-?[0-9]{3}-?[A-Za-z]{2}'
                    title='Use format like ABC-123-DE.'
                    onChange={(e) => setInspection((p) => ({ ...p, regNo: e.target.value.toUpperCase() }))}
                  />
                  <input placeholder='Mileage (km)' value={inspection.mileage} onChange={(e) => setInspection((p) => ({ ...p, mileage: e.target.value }))} />
                  <select required value={inspection.transmission} onChange={(e) => setInspection((p) => ({ ...p, transmission: e.target.value }))}>
                    <option value='' disabled>Transmission</option>
                    <option value='Automatic'>Automatic</option>
                    <option value='Manual'>Manual</option>
                  </select>
                  <select required value={inspection.fuelType} onChange={(e) => setInspection((p) => ({ ...p, fuelType: e.target.value }))}>
                    <option value='' disabled>Fuel Type</option>
                    <option value='Petrol'>Petrol</option>
                    <option value='Diesel'>Diesel</option>
                    <option value='Hybrid'>Hybrid</option>
                    <option value='Electric'>Electric</option>
                  </select>
                  <select value={inspection.overallVerdict} onChange={(e) => setInspection((p) => ({ ...p, overallVerdict: e.target.value }))}>
                    {VERDICT_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <h3>Inspection Checklist</h3>
                <p className='section-note'>Rate each item and add comments where faults or concerns are observed.</p>
                {groupedChecklist.map((group) => (
                  <section key={group.title} className='check-section'>
                    <h4>{group.title}</h4>
                    <div className='checklist'>
                      {group.rows.map((item, idx) => (
                        <article key={`${group.title}-${item.label}`} className='check-row'>
                          <strong>{item.label}</strong>
                          <select value={item.status} onChange={(e) => updateChecklist(group.title, idx, 'status', e.target.value)}>
                            <option>Good</option>
                            <option>Needs Attention</option>
                            <option>Poor</option>
                          </select>
                          <input placeholder='Comments' value={item.note} onChange={(e) => updateChecklist(group.title, idx, 'note', e.target.value)} />
                        </article>
                      ))}
                    </div>
                  </section>
                ))}

                <textarea placeholder='Final Recommendation' value={inspection.recommendation} onChange={(e) => setInspection((p) => ({ ...p, recommendation: e.target.value }))} />

                <label className='file-label'>
                  Upload Inspection Images (max 10)
                  <input type='file' accept='image/*' multiple onChange={(e) => uploadInspectionImages(e.target.files)} />
                </label>
                <p className='section-note'>Tip: Use bright, sharp images of defects, VIN plate, engine bay, and tires.</p>
                {inspection.images.length > 0 && (
                  <div className='image-preview-grid'>
                    {inspection.images.map((img, idx) => (
                      <img key={`preview-${idx}`} src={img} alt={`Inspection preview ${idx + 1}`} />
                    ))}
                  </div>
                )}

                <button className='primary-btn' type='submit'>Save Inspection & Download PDF</button>
              </form>
            </section>
          )}

          {activeTab === 'records' && (
            <section className='inspection-card'>
              <h2>Inspection Records</h2>
              {loadingReports ? (
                <p>Loading records...</p>
              ) : reports.length === 0 ? (
                <p>No inspections yet.</p>
              ) : (
                <div className='records'>
                  {reports.map((report) => (
                    <article key={report._id} className='record-card'>
                      <div className='record-head'>
                        <h4>{report.vehicleLabel}</h4>
                        <span className='record-tag'>{report.overallVerdict}</span>
                      </div>
                      <p>{new Date(report.inspectedAt).toLocaleString()}</p>
                      <button className='primary-btn' type='button' onClick={() => createReportPdf(report, account)}>Download PDF</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'settings' && (
            <section className='inspection-card'>
              <h2>Account Settings</h2>
              <p className='section-note'>
                Update your company details and signature. These details appear on your generated PDF reports.
              </p>
              <form className='inspection-form settings-grid' onSubmit={saveSettings}>
                <input required placeholder='Full Name' value={settings.fullName} onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))} />
                <input required type='email' placeholder='Email' value={settings.email} onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))} />
                <input required placeholder='WhatsApp Number' value={settings.phone} onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))} />
                <input required placeholder='Company Name' value={settings.companyName} onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))} />
                <textarea required placeholder='Company Address' value={settings.companyAddress} onChange={(e) => setSettings((prev) => ({ ...prev, companyAddress: e.target.value }))} />
                <label className='file-label'>
                  Update Company Logo
                  <input type='file' accept='image/*' onChange={(e) => uploadSettingsCompanyLogo(e.target.files?.[0])} />
                </label>
                {settings.companyLogoDataUrl && <img className='logo-preview' src={settings.companyLogoDataUrl} alt='Updated company logo preview' />}
                <label className='file-label'>
                  Update Signature
                  <input type='file' accept='image/*' onChange={(e) => uploadSettingsSignature(e.target.files?.[0])} />
                </label>
                {settings.signatureDataUrl && <img className='signature-preview' src={settings.signatureDataUrl} alt='Updated signature preview' />}
                <button className='primary-btn' type='submit' disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

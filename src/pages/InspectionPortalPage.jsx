import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createInspectionReport,
  createInspectorAccount,
  fetchInspectionReportsByAccount,
} from '../lib/sanityClient.js';
import './InspectionPortalPage.css';

const ACCOUNT_KEY = 'biltronix_inspection_account';
const REPORTS_KEY = 'biltronix_inspection_reports';

const CHECK_ITEMS = [
  'Engine condition',
  'Transmission and clutch',
  'Suspension and steering',
  'Brake system',
  'Electrical components',
  'Interior condition',
  'Exterior and body',
  'Tyres and wheel alignment',
  'Documents verification',
  'Road test performance',
];

function defaultChecklist() {
  return CHECK_ITEMS.map((label) => ({ label, status: 'OK', note: '' }));
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

function createReportPdf(report, account) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(245, 249, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(220, 228, 244);
  doc.setFontSize(58);
  doc.text(account.companyName || 'Inspection', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 35 });

  doc.setDrawColor(20, 48, 95);
  doc.setLineWidth(1.2);
  doc.roundedRect(22, 22, pageWidth - 44, pageHeight - 44, 10, 10);

  doc.setFillColor(20, 48, 95);
  doc.rect(32, 32, pageWidth - 64, 78, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(account.companyName || 'Company', 44, 66);
  doc.setFontSize(10);
  doc.text(account.companyAddress || '', 44, 84);
  doc.text(`Inspector: ${account.fullName || ''} | Phone: ${account.phone || ''}`, 44, 100);

  doc.setTextColor(20, 48, 95);
  doc.setFontSize(16);
  doc.text('Pre-Purchase Inspection Report', 34, 138);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date(report.inspectedAt).toLocaleDateString()}`, 34, 154);
  doc.text(`Vehicle: ${report.vehicleLabel}`, 34, 168);
  doc.text(`Reg No: ${report.vehicleRegNo || 'N/A'}`, 34, 182);
  doc.text(`Verdict: ${report.overallVerdict}`, 34, 196);

  const rows = report.checklist.map((item) => [item.label, item.status, item.note || '-']);
  autoTable(doc, {
    startY: 212,
    head: [['Inspection Item', 'Status', 'Notes']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [20, 48, 95] },
    alternateRowStyles: { fillColor: [249, 251, 255] },
  });

  let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 470;
  doc.setFontSize(11);
  doc.setTextColor(20, 48, 95);
  doc.text('Recommendation', 34, y);
  doc.setFontSize(10);
  doc.setTextColor(60, 72, 94);
  const recLines = doc.splitTextToSize(report.recommendation || 'No recommendation provided.', pageWidth - 84);
  doc.text(recLines, 34, y + 16);

  y += recLines.length * 12 + 30;
  if (report.images && report.images.length > 0) {
    doc.setTextColor(20, 48, 95);
    doc.setFontSize(11);
    doc.text('Attached Inspection Images', 34, y);
    y += 12;
    const preview = report.images.slice(0, 2);
    preview.forEach((img, index) => {
      try {
        doc.addImage(img, 'JPEG', 34 + index * 260, y + 10, 240, 130);
      } catch {
        // Ignore unreadable image data
      }
    });
    y += 150;
  }

  y = Math.min(y + 16, pageHeight - 130);
  doc.setDrawColor(120, 132, 160);
  doc.line(34, y, 230, y);
  if (account.signatureDataUrl) {
    try {
      doc.addImage(account.signatureDataUrl, 'PNG', 34, y - 45, 120, 36);
    } catch {
      // ignore signature render errors
    }
  }
  doc.setTextColor(20, 48, 95);
  doc.setFontSize(10);
  doc.text(account.fullName || 'Inspector', 34, y + 14);
  doc.text(account.companyName || '', 34, y + 28);

  doc.save(`inspection-${(report.vehicleRegNo || report.vehicleLabel || 'vehicle').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export default function InspectionPortalPage() {
  const [account, setAccount] = useState(() => getAccountLocal());
  const [activeTab, setActiveTab] = useState('new');
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [message, setMessage] = useState('');

  const [registration, setRegistration] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    signatureDataUrl: '',
  });

  const [inspection, setInspection] = useState({
    vehicleMake: '',
    vehicleModel: '',
    year: '',
    regNo: '',
    mileage: '',
    overallVerdict: 'Good to Buy',
    recommendation: '',
    checklist: defaultChecklist(),
    images: [],
  });

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

  const registerAccount = async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = {
      ...registration,
      _id: generateId('acct'),
    };

    try {
      const created = await createInspectorAccount(payload);
      setAccount(created);
      saveAccountLocal(created);
      setMessage('Account created. You can now create inspections.');
    } catch {
      setAccount(payload);
      saveAccountLocal(payload);
      setMessage('Account created locally. Add write token later to sync to Sanity.');
    }
  };

  const uploadSignature = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setRegistration((prev) => ({ ...prev, signatureDataUrl: dataUrl }));
  };

  const updateChecklist = (index, field, value) => {
    setInspection((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const uploadInspectionImages = async (files) => {
    const list = Array.from(files || []).slice(0, 5);
    const dataUrls = await Promise.all(list.map((file) => readFileAsDataUrl(file)));
    setInspection((prev) => ({ ...prev, images: dataUrls }));
  };

  const submitInspection = async (event) => {
    event.preventDefault();
    if (!account) return;

    const report = {
      _id: generateId('report'),
      accountId: account._id,
      companyName: account.companyName,
      inspectorName: account.fullName,
      vehicleLabel: `${inspection.year} ${inspection.vehicleMake} ${inspection.vehicleModel}`.trim(),
      vehicleRegNo: inspection.regNo,
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
      generateReportPdf(saved);
      setMessage('Inspection saved and PDF downloaded.');
    } catch {
      setReports((prev) => [report, ...prev]);
      saveReportLocal(report);
      generateReportPdf(report);
      setMessage('Inspection saved locally and PDF downloaded.');
    }

    setInspection({
      vehicleMake: '',
      vehicleModel: '',
      year: '',
      regNo: '',
      mileage: '',
      overallVerdict: 'Good to Buy',
      recommendation: '',
      checklist: defaultChecklist(),
      images: [],
    });
    setActiveTab('records');
  };

  const generateReportPdf = (report) => {
    if (!account) return;
    createReportPdf(report, account);
  };

  if (!account) {
    return (
      <div className='inspection-page'>
        <header className='inspection-topbar'>
          <Link to='/'>Back to Home</Link>
          <h1>Pre-Purchase Inspection App</h1>
        </header>
        <main className='inspection-container'>
          <section className='inspection-card'>
            <h2>Create Inspector Account</h2>
            <p>Set up your company details. These details appear as letterhead/watermark in generated PDF reports.</p>
            <form className='inspection-form' onSubmit={registerAccount}>
              <input required placeholder='Full Name' value={registration.fullName} onChange={(e) => setRegistration((p) => ({ ...p, fullName: e.target.value }))} />
              <input required type='email' placeholder='Email' value={registration.email} onChange={(e) => setRegistration((p) => ({ ...p, email: e.target.value }))} />
              <input required placeholder='WhatsApp Number' value={registration.phone} onChange={(e) => setRegistration((p) => ({ ...p, phone: e.target.value }))} />
              <input required placeholder='Company Name' value={registration.companyName} onChange={(e) => setRegistration((p) => ({ ...p, companyName: e.target.value }))} />
              <textarea required placeholder='Company Address' value={registration.companyAddress} onChange={(e) => setRegistration((p) => ({ ...p, companyAddress: e.target.value }))} />
              <label className='file-label'>
                Optional Signature Upload
                <input type='file' accept='image/*' onChange={(e) => uploadSignature(e.target.files?.[0])} />
              </label>
              <button type='submit'>Create Account</button>
            </form>
            {message && <p className='msg'>{message}</p>}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className='inspection-page'>
      <header className='inspection-topbar'>
        <Link to='/'>Back to Home</Link>
        <h1>Inspection Dashboard</h1>
      </header>
      <div className='inspection-layout'>
        <aside className='inspection-sidebar'>
          <h3>{account.companyName}</h3>
          <p>{account.fullName}</p>
          <div className='stat-box'>
            <strong>{inspectionCount}</strong>
            <span>Inspections Done</span>
          </div>
          <button className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>New Pre-Purchase Inspection</button>
          <button className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>Records</button>
        </aside>

        <main className='inspection-content'>
          {message && <p className='msg'>{message}</p>}

          {activeTab === 'new' && (
            <section className='inspection-card'>
              <h2>New Pre-Purchase Inspection</h2>
              <form className='inspection-form' onSubmit={submitInspection}>
                <div className='grid-2'>
                  <input required placeholder='Vehicle Make' value={inspection.vehicleMake} onChange={(e) => setInspection((p) => ({ ...p, vehicleMake: e.target.value }))} />
                  <input required placeholder='Vehicle Model' value={inspection.vehicleModel} onChange={(e) => setInspection((p) => ({ ...p, vehicleModel: e.target.value }))} />
                  <input required type='number' placeholder='Year' value={inspection.year} onChange={(e) => setInspection((p) => ({ ...p, year: e.target.value }))} />
                  <input placeholder='Registration Number' value={inspection.regNo} onChange={(e) => setInspection((p) => ({ ...p, regNo: e.target.value }))} />
                  <input placeholder='Mileage (km)' value={inspection.mileage} onChange={(e) => setInspection((p) => ({ ...p, mileage: e.target.value }))} />
                  <select value={inspection.overallVerdict} onChange={(e) => setInspection((p) => ({ ...p, overallVerdict: e.target.value }))}>
                    <option>Good to Buy</option>
                    <option>Buy with Repairs</option>
                    <option>Not Recommended</option>
                  </select>
                </div>

                <h3>Inspection Checklist</h3>
                <div className='checklist'>
                  {inspection.checklist.map((item, idx) => (
                    <article key={item.label} className='check-row'>
                      <strong>{item.label}</strong>
                      <select value={item.status} onChange={(e) => updateChecklist(idx, 'status', e.target.value)}>
                        <option>OK</option>
                        <option>Needs Attention</option>
                        <option>N/A</option>
                      </select>
                      <input placeholder='Notes' value={item.note} onChange={(e) => updateChecklist(idx, 'note', e.target.value)} />
                    </article>
                  ))}
                </div>

                <label className='file-label'>
                  Upload Inspection Images (max 5)
                  <input type='file' accept='image/*' multiple onChange={(e) => uploadInspectionImages(e.target.files)} />
                </label>

                <textarea placeholder='Final Recommendation' value={inspection.recommendation} onChange={(e) => setInspection((p) => ({ ...p, recommendation: e.target.value }))} />

                <button type='submit'>Save Inspection & Download PDF</button>
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
                      <h4>{report.vehicleLabel}</h4>
                      <p>{new Date(report.inspectedAt).toLocaleString()}</p>
                      <p>Verdict: {report.overallVerdict}</p>
                      <button type='button' onClick={() => generateReportPdf(report)}>Download PDF</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

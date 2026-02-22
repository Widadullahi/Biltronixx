import { createClient } from '@sanity/client';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || '2025-01-01';
const writeToken = import.meta.env.VITE_SANITY_API_WRITE_TOKEN;

export const hasSanityConfig = Boolean(projectId && dataset);
export const canWriteSanity = Boolean(hasSanityConfig && writeToken);

export const sanityClient = hasSanityConfig
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      perspective: 'published',
    })
  : null;

const sanityWriteClient = canWriteSanity
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token: writeToken,
      useCdn: false,
      perspective: 'published',
    })
  : null;

function parseMoney(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  return Number.parseFloat(value.replace(/[$,]/g, '')) || 0;
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function normalizeBooking(item) {
  return {
    id: item.id || item._id || 'N/A',
    customer: item.customer || 'Unknown Customer',
    service: item.service || 'General Service',
    date: item.date || '',
    status: item.status || 'Pending',
  };
}

function normalizeOrder(item) {
  const amountValue = parseMoney(item.amount);
  return {
    id: item.id || item._id || 'N/A',
    item: item.item || 'Unknown Item',
    customer: item.customer || 'Unknown Customer',
    channel: item.channel || 'Website',
    amountValue,
    amountLabel: currency.format(amountValue),
  };
}

function normalizeInventory(item) {
  return {
    name: item.name || 'Unnamed Item',
    stock: toNumber(item.stock),
    threshold: toNumber(item.threshold, 1),
  };
}

function normalizeCarTip(item) {
  return {
    title: item.title || 'Untitled Tip',
    body: item.body || '',
    category: item.category || 'General',
    order: toNumber(item.order, 999),
  };
}

function normalizeStoreHighlight(item) {
  return {
    title: item.title || 'Untitled Category',
    summary: item.summary || '',
    category: item.category || 'General',
    ctaLabel: item.ctaLabel || 'Browse Store',
    ctaHref: item.ctaHref || '/sales',
    order: toNumber(item.order, 999),
  };
}

function normalizeStockItem(item) {
  return {
    _id: item._id,
    name: item.name || 'Untitled Item',
    category: item.category || 'car-parts',
    stock: toNumber(item.stock),
    sold: toNumber(item.sold),
    unitPrice: toNumber(item.unitPrice),
    make: item.make || '',
    model: item.model || '',
    year: toNumber(item.year),
    condition: item.condition || '',
    transmission: item.transmission || '',
    fuelType: item.fuelType || '',
  };
}

export async function fetchAdminDashboardData() {
  if (!sanityClient) {
    throw new Error(
      'Missing Sanity configuration. Set VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET in your .env file.'
    );
  }

  const [bookings, orders, inventory] = await Promise.all([
    sanityClient.fetch(`*[_type == "booking"] | order(date desc)[0...150]{_id, id, customer, service, date, status}`),
    sanityClient.fetch(
      `*[_type == "order"] | order(_createdAt desc)[0...150]{_id, id, item, customer, amount, amountLabel, channel}`
    ),
    sanityClient.fetch(`*[_type == "inventoryItem"] | order(name asc)[0...150]{_id, name, stock, threshold}`),
  ]);

  return {
    bookings: bookings.map(normalizeBooking),
    orders: orders.map(normalizeOrder),
    inventory: inventory.map(normalizeInventory),
  };
}

export async function fetchCarTips(limit = 6) {
  if (!sanityClient) {
    throw new Error(
      'Missing Sanity configuration. Set VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET in your .env file.'
    );
  }

  const tipDocs = await sanityClient.fetch(
    `*[_type == "carTip"] | order(order asc, _createdAt desc)[0...${limit}]{
      _id,
      title,
      body,
      category,
      order
    }`
  );

  return tipDocs.map(normalizeCarTip);
}

export async function fetchStoreHighlights(limit = 6) {
  if (!sanityClient) {
    throw new Error(
      'Missing Sanity configuration. Set VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET in your .env file.'
    );
  }

  const docs = await sanityClient.fetch(
    `*[_type == "storeHighlight"] | order(order asc, _createdAt desc)[0...${limit}]{
      _id,
      title,
      summary,
      category,
      ctaLabel,
      ctaHref,
      order
    }`
  );

  return docs.map(normalizeStoreHighlight);
}

export async function fetchStockItems(limit = 300) {
  if (!sanityClient) {
    throw new Error(
      'Missing Sanity configuration. Set VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET in your .env file.'
    );
  }

  const docs = await sanityClient.fetch(
    `*[_type == "stockItem"] | order(category asc, name asc)[0...${limit}]{
      _id,
      name,
      category,
      stock,
      sold,
      unitPrice,
      make,
      model,
      year,
      condition,
      transmission,
      fuelType
    }`
  );

  return docs.map(normalizeStockItem);
}

export async function createStockItem(payload) {
  if (!sanityWriteClient) {
    throw new Error(
      'Missing write token. Set VITE_SANITY_API_WRITE_TOKEN to enable create/update for stock items.'
    );
  }

  const created = await sanityWriteClient.create({
    _type: 'stockItem',
    name: payload.name,
    category: payload.category,
    stock: toNumber(payload.stock),
    sold: toNumber(payload.sold),
    unitPrice: toNumber(payload.unitPrice),
    make: payload.make || '',
    model: payload.model || '',
    year: toNumber(payload.year),
    condition: payload.condition || '',
    transmission: payload.transmission || '',
    fuelType: payload.fuelType || '',
  });

  return normalizeStockItem(created);
}

export async function updateStockItem(itemId, updates) {
  if (!sanityWriteClient) {
    throw new Error(
      'Missing write token. Set VITE_SANITY_API_WRITE_TOKEN to enable create/update for stock items.'
    );
  }

  const patched = await sanityWriteClient
    .patch(itemId)
    .set({
      name: updates.name,
      stock: toNumber(updates.stock),
      sold: toNumber(updates.sold),
      unitPrice: toNumber(updates.unitPrice),
      make: updates.make || '',
      model: updates.model || '',
      year: toNumber(updates.year),
      condition: updates.condition || '',
      transmission: updates.transmission || '',
      fuelType: updates.fuelType || '',
    })
    .commit();

  return normalizeStockItem(patched);
}

function generateBookingId() {
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `BK-${suffix}`;
}

export async function createBookingRequest(payload) {
  if (!sanityWriteClient) {
    throw new Error(
      'Missing write token. Set VITE_SANITY_API_WRITE_TOKEN in .env to save booking requests from the website.'
    );
  }

  const created = await sanityWriteClient.create({
    _type: 'booking',
    id: generateBookingId(),
    customer: payload.customer,
    service: payload.service,
    date: payload.date,
    status: 'Pending',
    whatsappNumber: payload.whatsappNumber || '',
    vehicle: payload.vehicle || '',
    email: payload.email || '',
    note: payload.note || '',
  });

  return normalizeBooking(created);
}

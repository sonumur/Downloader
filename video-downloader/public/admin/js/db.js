/**
 * Shared Firestore CRUD service for the admin panel.
 * All pages include this file to get real read/write functions.
 *
 * Collections used:
 *   - blogs
 *   - enquiries
 *   - faqs
 *   - pages
 *   - users
 *   - settings  (single document: "site")
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isFirestoreReady() {
  return window.db !== null && window.db !== undefined;
}

// ── Generic CRUD ──────────────────────────────────────────────────────────────

async function dbGetAll(collection) {
  if (!isFirestoreReady()) return [];
  const snap = await db.collection(collection).orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function dbAdd(collection, data) {
  if (!isFirestoreReady()) throw new Error('Firestore not ready');
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection(collection).add(data);
  return ref.id;
}

async function dbUpdate(collection, id, data) {
  if (!isFirestoreReady()) throw new Error('Firestore not ready');
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection(collection).doc(id).update(data);
}

async function dbDelete(collection, id) {
  if (!isFirestoreReady()) throw new Error('Firestore not ready');
  await db.collection(collection).doc(id).delete();
}

async function dbGetOne(collection, id) {
  if (!isFirestoreReady()) return null;
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// ── Settings (single doc) ─────────────────────────────────────────────────────

async function loadSettings() {
  if (!isFirestoreReady()) return null;
  const doc = await db.collection('settings').doc('site').get();
  return doc.exists ? doc.data() : {};
}

async function saveSettings(data) {
  if (!isFirestoreReady()) throw new Error('Firestore not ready');
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection('settings').doc('site').set(data, { merge: true });
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

async function loadDashboardStats() {
  if (!isFirestoreReady()) return null;
  const [blogs, enquiries, faqs, users] = await Promise.all([
    db.collection('blogs').get(),
    db.collection('enquiries').get(),
    db.collection('faqs').get(),
    db.collection('users').get(),
  ]);
  return {
    blogs: blogs.size,
    enquiries: enquiries.size,
    newEnquiries: enquiries.docs.filter(d => d.data().status === 'New').length,
    faqs: faqs.size,
    users: users.size,
  };
}

// ── Toast Notification ────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.cssText = `
      position:fixed; bottom:2rem; right:2rem; padding:0.75rem 1.25rem;
      border-radius:0.5rem; color:white; font-weight:500; font-size:0.9rem;
      z-index:9999; opacity:0; transition:opacity 0.3s; pointer-events:none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'success' ? '#16a34a' : '#dc2626';
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── Loading state ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showTableLoading(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = `<tr><td colspan="100" style="text-align:center;padding:3rem;color:#9ca3af;">Loading...</td></tr>`;
}

function showTableEmpty(tbodyId, msg = 'No records found') {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = `<tr><td colspan="100" style="text-align:center;padding:3rem;color:#9ca3af;">${escapeHtml(msg)}</td></tr>`;
}

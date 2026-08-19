/**
 * BorrowBox — shared front-end utilities.
 * Loaded on every page. Provides API access, auth-state helpers,
 * toast notifications, a confirm dialog, and small UI helpers
 * (navbar wiring, book card rendering) reused across pages.
 */

// ---------------------------------------------------------------------------
// API configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Wrapper around fetch() that talks to the BorrowBox API.
 * Automatically attaches the JWT (if present) and parses JSON.
 * Throws an Error with a `.message` taken from the API's error body,
 * or a generic network-error message if the server can't be reached.
 */
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new Error(
      'Could not reach the BorrowBox server. Make sure the backend is running on http://localhost:5000.'
    );
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (parseError) {
    // Non-JSON response body; fall through with an empty payload.
  }

  if (!response.ok || payload.success === false) {
    const message = payload && payload.message ? payload.message : `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return payload;
}

const api = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  del: (path) => apiRequest(path, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Auth state (stored in localStorage for this simple SPA-style setup)
// ---------------------------------------------------------------------------

const AUTH_TOKEN_KEY = 'borrowbox_token';
const AUTH_USER_KEY = 'borrowbox_user';

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function isLoggedIn() {
  return Boolean(getToken() && getCurrentUser());
}

/** Redirects to login.html if not authenticated. Call at the top of protected pages. */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

/** Redirects to dashboard.html if not an admin. Call at the top of admin.html. */
function requireAdmin() {
  requireAuth();
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'dashboard.html';
  }
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ---------------------------------------------------------------------------
// Toast notifications (replaces browser alert())
// ---------------------------------------------------------------------------

function ensureToastStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

const TOAST_ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/></svg>',
};

function showToast(message, type = 'info', duration = 4200) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

// ---------------------------------------------------------------------------
// Confirm dialog (replaces browser confirm())
// ---------------------------------------------------------------------------

function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="confirm-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
        </div>
        <h3 id="confirm-title">${escapeHtml(title)}</h3>
        <p style="margin-top:8px; color:var(--ink-soft); font-size:14.5px;">${escapeHtml(message)}</p>
        <div style="display:flex; gap:10px; margin-top:24px;">
          <button class="btn btn-ghost btn-block" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-block" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = (result) => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
  });
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function initials(title) {
  return String(title)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysBetween(a, b) {
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

/** Toggles disabled state + swaps label with a spinner for async button actions. */
function setButtonLoading(btn, isLoading, loadingLabel = 'Please wait') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${escapeHtml(loadingLabel)}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalLabel) btn.innerHTML = btn.dataset.originalLabel;
  }
}

// ---------------------------------------------------------------------------
// Navbar wiring (shared across all pages)
// ---------------------------------------------------------------------------

function initNavbar() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
  }

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = getCurrentUser();

  if (user) {
    const adminLink = user.role === 'admin'
      ? `<a href="admin.html" class="btn btn-ghost btn-sm">Admin</a>`
      : '';
    navActions.innerHTML = `
      ${adminLink}
      <a href="dashboard.html" class="nav-user">
        <span class="avatar">${escapeHtml(initials(user.name))}</span>
        <span>${escapeHtml(user.name.split(' ')[0])}</span>
      </a>
      <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  } else {
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-ghost">Login</a>
      <a href="register.html" class="btn btn-primary">Get Started</a>
    `;
  }
}

// ---------------------------------------------------------------------------
// Book card rendering (shared by index.html and books.html)
// ---------------------------------------------------------------------------

function bookCoverMarkup(book) {
  if (book.coverImage) {
    return `<img src="${escapeHtml(book.coverImage)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy" onerror="this.closest('.book-cover').classList.add('cover-error'); this.remove();">
      <div class="cover-fallback" style="display:none;"><span class="initials">${escapeHtml(initials(book.title))}</span></div>`;
  }
  return `<div class="cover-fallback"><span class="initials">${escapeHtml(initials(book.title))}</span></div>`;
}

function bookCardHtml(book) {
  const available = book.availableCopies > 0;
  return `
    <article class="book-card" data-book-id="${book._id}">
      <div class="book-cover">
        <span class="category-chip">${escapeHtml(book.category)}</span>
        ${bookCoverMarkup(book)}
      </div>
      <div class="book-info">
        <h3>${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <div class="book-availability ${available ? '' : 'unavailable'}">
          <span class="dot"></span>
          ${available ? `Available: ${book.availableCopies}` : 'Currently unavailable'}
        </div>
      </div>
      <button class="btn ${available ? 'btn-primary' : 'btn-ghost'} btn-block borrow-trigger" data-book-id="${book._id}" ${available ? '' : 'disabled'}>
        ${available ? 'Borrow' : 'Unavailable'}
      </button>
    </article>
  `;
}

/** CSS is injected once so cover-error state hides the broken <img> reliably. */
(function injectCoverErrorStyle() {
  const style = document.createElement('style');
  style.textContent = `.book-cover.cover-error .cover-fallback { display: flex !important; }`;
  document.head.appendChild(style);
})();

// ---------------------------------------------------------------------------
// Global click handler: borrow buttons rendered by bookCardHtml()
// ---------------------------------------------------------------------------

document.addEventListener('click', async (e) => {
  const trigger = e.target.closest('.borrow-trigger');
  if (!trigger || trigger.disabled) return;

  if (!isLoggedIn()) {
    showToast('Please log in to borrow a book.', 'info');
    setTimeout(() => (window.location.href = 'login.html'), 900);
    return;
  }

  const bookId = trigger.dataset.bookId;
  setButtonLoading(trigger, true, 'Borrowing');

  try {
    const res = await api.post('/borrow', { bookId });
    showToast(res.message || 'Book borrowed successfully.', 'success');
    trigger.textContent = 'Borrowed ✓';
    document.dispatchEvent(new CustomEvent('borrowbox:borrowed', { detail: res.data.borrow }));
  } catch (err) {
    showToast(err.message, 'error');
    setButtonLoading(trigger, false);
  }
});

// Run navbar wiring on every page once the DOM is ready.
document.addEventListener('DOMContentLoaded', initNavbar);

/**
 * BorrowBox — login & register page logic.
 * Assumes app.js has already loaded (api, showToast, setSession, etc.)
 */

function clearFieldErrors(form) {
  form.querySelectorAll('.error-msg').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('input.invalid').forEach((el) => el.classList.remove('invalid'));
}

function setFieldError(form, fieldName, message) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  input.classList.add('invalid');
  const field = input.closest('.field');
  const errorEl = field ? field.querySelector('.error-msg') : null;
  if (errorEl) errorEl.textContent = message;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const email = form.email.value.trim();
    const password = form.password.value;

    let hasError = false;
    if (!email || !isValidEmail(email)) {
      setFieldError(form, 'email', 'Enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setFieldError(form, 'password', 'Password is required.');
      hasError = true;
    }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Logging in');

    try {
      const res = await api.post('/auth/login', { email, password });
      setSession(res.data.token, res.data.user);
      showToast(`Welcome back, ${res.data.user.name.split(' ')[0]}.`, 'success');
      setTimeout(() => (window.location.href = 'dashboard.html'), 500);
    } catch (err) {
      showToast(err.message, 'error');
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    let hasError = false;
    if (!name) {
      setFieldError(form, 'name', 'Name is required.');
      hasError = true;
    }
    if (!email || !isValidEmail(email)) {
      setFieldError(form, 'email', 'Enter a valid email address.');
      hasError = true;
    }
    if (!password || password.length < 6) {
      setFieldError(form, 'password', 'Password must be at least 6 characters.');
      hasError = true;
    }
    if (confirmPassword !== password) {
      setFieldError(form, 'confirmPassword', 'Passwords do not match.');
      hasError = true;
    }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Creating account');

    try {
      const res = await api.post('/auth/register', { name, email, password, confirmPassword });
      setSession(res.data.token, res.data.user);
      showToast('Account created. Welcome to BorrowBox.', 'success');
      setTimeout(() => (window.location.href = 'dashboard.html'), 500);
    } catch (err) {
      showToast(err.message, 'error');
      setButtonLoading(submitBtn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
});

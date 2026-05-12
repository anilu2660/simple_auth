// ============================================================
// AuthVault — main.js
// Frontend logic: canvas bg, tab switching, form validation,
// API calls, toast notifications, animations
// ============================================================

const API_BASE = 'http://localhost:3000/api';

// ─── Canvas Particle Background ───────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x     = Math.random() * W;
      this.y     = Math.random() * H;
      this.r     = Math.random() * 1.5 + 0.4;
      this.vx    = (Math.random() - 0.5) * 0.3;
      this.vy    = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '124,92,255' : '56,189,248';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.fill();
    }
  }

  function initParticles() {
    const count = Math.floor((W * H) / 12000);
    particles = Array.from({ length: count }, () => new Particle());
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,92,255,${0.06 * (1 - dist / 110)})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(loop);
  }

  resize();
  initParticles();
  loop();
  window.addEventListener('resize', () => { resize(); initParticles(); });
})();

// ─── Tab Switching ─────────────────────────────────────────
let currentTab = 'login';

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;

  const slider    = document.getElementById('formsSlider');
  const indicator = document.getElementById('tabIndicator');
  const loginTab  = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');

  if (tab === 'signup') {
    slider.classList.add('show-signup');
    indicator.classList.add('right');
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  } else {
    slider.classList.remove('show-signup');
    indicator.classList.remove('right');
    signupTab.classList.remove('active');
    loginTab.classList.add('active');
  }

  clearAllErrors();
  updateSliderHeight();
}

// ─── Dynamic Height for Slider ─────────────────────────────
function updateSliderHeight() {
  const viewport = document.querySelector('.slider-viewport');
  if (!viewport) return;
  
  const activePanel = currentTab === 'login' 
    ? document.getElementById('loginPanel') 
    : document.getElementById('signupPanel');
    
  if (activePanel) {
    viewport.style.height = activePanel.offsetHeight + 'px';
  }
}

// Observe height changes (e.g., error messages showing/hiding)
const resizeObserver = new ResizeObserver(() => updateSliderHeight());
window.addEventListener('DOMContentLoaded', () => {
  const loginPanel = document.getElementById('loginPanel');
  const signupPanel = document.getElementById('signupPanel');
  if (loginPanel) resizeObserver.observe(loginPanel);
  if (signupPanel) resizeObserver.observe(signupPanel);
  
  // Initial calculation (slight delay to ensure CSS has loaded)
  setTimeout(updateSliderHeight, 50);
});

// ─── Toast Notifications ───────────────────────────────────
function showToast(message, type = 'info', duration = 3800) {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ─── Input Validation Helpers ──────────────────────────────
function showError(fieldId, errId, message) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (field) { field.classList.add('invalid'); field.classList.remove('valid'); }
  if (err)   { err.textContent = message; err.classList.add('visible'); }
}

function clearError(fieldId, errId) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (field) field.classList.remove('invalid');
  if (err)   err.classList.remove('visible');
}

function markValid(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) { field.classList.remove('invalid'); field.classList.add('valid'); }
}

function clearAllErrors() {
  ['loginEmail','loginPassword',
   'signupName','signupEmail','signupPassword','signupConfirm',
   'signupAge','signupMobile','signupCity','signupGender'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('invalid', 'valid');
  });
  ['loginEmailErr','loginPassErr',
   'signupNameErr','signupEmailErr','signupPassErr','signupConfirmErr',
   'signupAgeErr','signupMobileErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
}

// ─── Password Strength ─────────────────────────────────────
document.getElementById('signupPassword').addEventListener('input', function () {
  const val   = this.value;
  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  let   score = 0;

  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  if (val.length >= 12)         score++;

  const levels = [
    { pct: 0,   color: 'transparent',     text: '' },
    { pct: 20,  color: '#ff5f6d',         text: '🔴 Very weak' },
    { pct: 40,  color: '#fbbf24',         text: '🟠 Weak' },
    { pct: 60,  color: '#facc15',         text: '🟡 Fair' },
    { pct: 80,  color: '#22d3a0',         text: '🟢 Strong' },
    { pct: 100, color: 'var(--accent-3)', text: '✅ Very strong' },
  ];

  const level = val.length === 0 ? levels[0] : levels[Math.min(score, 5)];
  bar.style.width      = level.pct + '%';
  bar.style.background = level.color;
  label.textContent    = level.text;
  label.style.color    = level.color;
});

// ─── Password Toggle ───────────────────────────────────────
function togglePassword(inputId, btn) {
  const input    = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
    : `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
}

// ─── Gender Select: float label when value chosen ──────────
const genderSelect = document.getElementById('signupGender');
if (genderSelect) {
  genderSelect.addEventListener('change', function () {
    const lbl = this.closest('.input-group').querySelector('.floating-label');
    if (lbl) lbl.classList.toggle('floated', this.value !== '');
    this.classList.add('has-value');
  });
}

// ─── Button Loading State ──────────────────────────────────
function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) { btn.classList.add('loading'); btn.disabled = true; }
  else           { btn.classList.remove('loading'); btn.disabled = false; }
}

// ─── Ripple Effect on Buttons ──────────────────────────────
document.querySelectorAll('.submit-btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;`;
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

// ─── Card Success Flash ────────────────────────────────────
function flashSuccess() {
  const card = document.getElementById('authCard');
  card.classList.add('success-flash');
  card.addEventListener('animationend', () => card.classList.remove('success-flash'), { once: true });
}

// ─── LOGIN Form Submission ─────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let   valid    = true;

  if (!email) {
    showError('loginEmail', 'loginEmailErr', 'Email is required.');
    valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    showError('loginEmail', 'loginEmailErr', 'Enter a valid email address.');
    valid = false;
  } else {
    clearError('loginEmail', 'loginEmailErr');
    markValid('loginEmail');
  }

  if (!password) {
    showError('loginPassword', 'loginPassErr', 'Password is required.');
    valid = false;
  } else {
    clearError('loginPassword', 'loginPassErr');
    markValid('loginPassword');
  }

  if (!valid) return;

  setLoading('loginBtn', true);

  try {
    const res  = await fetch(`${API_BASE}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser',  JSON.stringify(data.user));

      flashSuccess();
      showToast(`${data.message}`, 'success');

      this.reset();
      clearAllErrors();

      // ✅ Redirect to profile dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);

    } else {
      showToast(data.message || 'Login failed. Please try again.', 'error');
      if (data.message && data.message.toLowerCase().includes('email')) {
        showError('loginEmail', 'loginEmailErr', data.message);
      } else if (data.message && data.message.toLowerCase().includes('password')) {
        showError('loginPassword', 'loginPassErr', data.message);
      }
    }
  } catch (err) {
    console.error('Login fetch error:', err);
    showToast('Cannot reach server. Is it running on port 3000?', 'error', 5000);
  } finally {
    setLoading('loginBtn', false);
  }
});

// ─── SIGNUP Form Submission ────────────────────────────────
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;
  const gender   = document.getElementById('signupGender').value;
  const age      = document.getElementById('signupAge').value;
  const city     = document.getElementById('signupCity').value.trim();
  const mobile   = document.getElementById('signupMobile').value.trim();
  const terms    = document.getElementById('termsCheck').checked;
  let   valid    = true;

  // Name
  if (!name || name.length < 2) {
    showError('signupName', 'signupNameErr', 'Name must be at least 2 characters.');
    valid = false;
  } else { clearError('signupName', 'signupNameErr'); markValid('signupName'); }

  // Email
  if (!email) {
    showError('signupEmail', 'signupEmailErr', 'Email is required.');
    valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    showError('signupEmail', 'signupEmailErr', 'Enter a valid email address.');
    valid = false;
  } else { clearError('signupEmail', 'signupEmailErr'); markValid('signupEmail'); }

  // Password
  if (!password || password.length < 6) {
    showError('signupPassword', 'signupPassErr', 'Password must be at least 6 characters.');
    valid = false;
  } else { clearError('signupPassword', 'signupPassErr'); markValid('signupPassword'); }

  // Confirm password
  if (!confirm) {
    showError('signupConfirm', 'signupConfirmErr', 'Please confirm your password.');
    valid = false;
  } else if (password !== confirm) {
    showError('signupConfirm', 'signupConfirmErr', 'Passwords do not match.');
    valid = false;
  } else { clearError('signupConfirm', 'signupConfirmErr'); markValid('signupConfirm'); }

  // Age (optional, but validate if filled)
  if (age && (isNaN(age) || Number(age) < 1 || Number(age) > 120)) {
    showError('signupAge', 'signupAgeErr', 'Enter a valid age (1–120).');
    valid = false;
  } else { clearError('signupAge', 'signupAgeErr'); }

  // Mobile (optional, but validate if filled)
  if (mobile && !/^[0-9]{10}$/.test(mobile)) {
    showError('signupMobile', 'signupMobileErr', 'Enter a valid 10-digit mobile number.');
    valid = false;
  } else { clearError('signupMobile', 'signupMobileErr'); }

  // Terms
  if (!terms) {
    showToast('Please accept the Terms & Privacy to continue.', 'warning');
    valid = false;
  }

  if (!valid) return;

  setLoading('signupBtn', true);

  try {
    const res  = await fetch(`${API_BASE}/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, gender, age, city, mobile }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser',  JSON.stringify(data.user));

      flashSuccess();
      showToast(data.message, 'success', 5000);

      this.reset();
      clearAllErrors();
      document.getElementById('strengthBar').style.width   = '0%';
      document.getElementById('strengthLabel').textContent = '';

      // Switch to login after short delay
      setTimeout(() => switchTab('login'), 1600);
    } else {
      showToast(data.message || 'Signup failed. Please try again.', 'error');
      if (data.message && data.message.toLowerCase().includes('email')) {
        showError('signupEmail', 'signupEmailErr', data.message);
      }
    }
  } catch (err) {
    console.error('Signup fetch error:', err);
    showToast('Cannot reach server. Is it running on port 3000?', 'error', 5000);
  } finally {
    setLoading('signupBtn', false);
  }
});

// ─── Real-time inline validation ──────────────────────────
document.getElementById('loginEmail').addEventListener('blur', function () {
  if (this.value && !/^\S+@\S+\.\S+$/.test(this.value.trim())) {
    showError('loginEmail', 'loginEmailErr', 'Enter a valid email address.');
  } else if (this.value) {
    clearError('loginEmail', 'loginEmailErr');
    markValid('loginEmail');
  }
});

document.getElementById('signupEmail').addEventListener('blur', function () {
  if (this.value && !/^\S+@\S+\.\S+$/.test(this.value.trim())) {
    showError('signupEmail', 'signupEmailErr', 'Enter a valid email address.');
  } else if (this.value) {
    clearError('signupEmail', 'signupEmailErr');
    markValid('signupEmail');
  }
});

document.getElementById('signupConfirm').addEventListener('input', function () {
  const pass = document.getElementById('signupPassword').value;
  if (this.value && this.value !== pass) {
    showError('signupConfirm', 'signupConfirmErr', 'Passwords do not match.');
  } else if (this.value) {
    clearError('signupConfirm', 'signupConfirmErr');
    markValid('signupConfirm');
  }
});

// Only allow digits in mobile field
document.getElementById('signupMobile').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

// ─── On Load: redirect to dashboard if already logged in ──
(function checkExistingAuth() {
  const token = localStorage.getItem('authToken');
  const user  = localStorage.getItem('authUser');
  if (token && user) {
    try {
      const u = JSON.parse(user);
      showToast(`Already signed in as ${u.name}. Redirecting… ✓`, 'info', 2500);
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
    } catch (_) {}
  }
})();

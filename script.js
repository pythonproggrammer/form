/* ================================================================
   Thread&Co. Order Form — JS
   Includes: persistent order #, auto-save draft, order storage,
             status structure, submit flow, post-submit reset,
             beforeunload guard, strict validation, inline errors,
             double-submit prevention, success banner, auto-focus,
             input trimming, print method, color + size selection
================================================================ */

const YOUR_EMAIL = 'riteshbhakta56@gmail.com';

const FIELDS   = ['clientName','orgName','phone','email','address',
                  'eventName','shirtCount','deadline','productType','fabric',
                  'brief','logoStatus'];
const REQUIRED = ['clientName','phone','email','address',
                  'eventName','shirtCount','deadline','brief','productType'];

const KEY_ORDER_NUM = 'tc_orderNum';
const KEY_DRAFT     = 'tc_draft';
const KEY_ORDERS    = 'tc_orders';

// Statuses: "Pending" -> "Designing" -> "Approved" -> "Paid" -> "Completed"


/* ================================================================
   PRINT METHOD / COLOR / SIZE DATA
================================================================ */
const COLORS = [
  // Row 1
  { name: 'White',         hex: '#f5f5f5' },
  { name: 'Orange',        hex: '#f26522' },
  { name: 'Amber',         hex: '#f7941d' },
  { name: 'Mauve',         hex: '#a0566b' },
  { name: 'Brown',         hex: '#7b4f2e' },
  { name: 'Black',         hex: '#1a1a1a' },
  { name: 'Charcoal',      hex: '#2d2d2d' },
  { name: 'Light Pink',    hex: '#f4b8c1' },
  { name: 'Dark Navy',     hex: '#1c2b3a' },
  { name: 'Yellow',        hex: '#f5e642' },
  { name: 'Cream',         hex: '#f5f0d0' },
  { name: 'Bright White',  hex: '#ffffff' },
  { name: 'Dark Maroon',   hex: '#5c1a1a' },
  { name: 'Mint',          hex: '#b2e0d8' },
  // Row 2
  { name: 'Gray',          hex: '#9e9e9e' },
  { name: 'Dark Gray',     hex: '#3d3d3d' },
  { name: 'Peach',         hex: '#f5c9a0' },
  { name: 'Light Blue',    hex: '#b8e0f7' },
  { name: 'Dark Green',    hex: '#1a3d1a' },
  { name: 'Rust Brown',    hex: '#7b3f1a' },
  { name: 'Forest Green',  hex: '#1a3d2b' },
  { name: 'Cyan',          hex: '#00bcd4' },
  { name: 'Navy',          hex: '#1a2b5c' },
  { name: 'Jet Black',     hex: '#111111' },
  { name: 'Crimson',       hex: '#c41e3a' },
  { name: 'Lavender',      hex: '#e8d5f5' },
  { name: 'Taupe',         hex: '#c4a882' },
  // Row 3
  { name: 'Burgundy',      hex: '#4a1020' },
  { name: 'Baby Pink',     hex: '#f9c0cb' },
  { name: 'Plum',          hex: '#5c1a5c' },
  { name: 'Green',         hex: '#2d7a2d' },
  { name: 'Khaki',         hex: '#c8a96e' },
  { name: 'Bright Yellow', hex: '#ffe600' },
  { name: 'Sage',          hex: '#b8e8c0' },
  { name: 'Pure White',    hex: '#fefefe' },
];

const SIZES = ['XS','S','M','L','XL','XXL','3XL','4XL','5XL','6XL','7XL'];

const PRINT_METHODS = [
  {
    id:    'dtg',
    label: 'DTG',
    desc:  'Direct to Garment - best for full-colour photographic prints on cotton'
  },
  {
    id:    'dtf',
    label: 'DTF',
    desc:  'Direct to Film - vibrant on any fabric including dark colours'
  },
  {
    id:    'embroidery',
    label: 'Embroidery',
    desc:  'Stitched design - premium textured finish ideal for logos and text'
  },
];

// Current selections (managed by JS, not standard inputs)
let selectedPrintMethod = '';
let selectedColors      = [];
let selectedSizes       = [];


/* ================================================================
   BUILD PRINTING UI
   Inserts print method, colour swatches, and size pills into
   #printingSection in the HTML. Call once on load.
================================================================ */
function buildPrintingUI() {
  const container = document.getElementById('printingSection');
  if (!container) return;

  // Is the swatch light enough to need a visible border?
  function needsBorder(hex) {
    const light = ['#f5f5f5','#ffffff','#fefefe','#f5f0d0','#f4b8c1',
                   '#f5c9a0','#b8e0f7','#e8d5f5','#f9c0cb','#b8e8c0',
                   '#b2e0d8','#f5e642','#ffe600'];
    return light.includes(hex.toLowerCase());
  }

  const methodHTML = `
    <div class="field span-3" id="fieldPrintMethod">
      <label>Print Method *</label>
      <div class="print-method-group" id="printMethodGroup">
        ${PRINT_METHODS.map(m => `
          <button type="button" class="print-method-btn" data-method="${m.id}" onclick="selectPrintMethod('${m.id}')">
            <span class="pm-label">${m.label}</span>
            <span class="pm-desc">${m.desc}</span>
          </button>`).join('')}
      </div>
      <div class="field-error" id="err-printMethod"></div>
      <div class="static-val" id="sv-printMethod"></div>
    </div>`;

  const colorHTML = `
    <div class="field span-3" id="fieldShirtColor">
      <label>Shirt Colour(s) * <span class="label-sub">(select all that apply)</span></label>
      <div class="color-swatch-grid" id="colorSwatchGrid">
        ${COLORS.map(c => `
          <button type="button"
                  class="color-swatch"
                  data-color="${c.name}"
                  title="${c.name}"
                  style="background:${c.hex};${needsBorder(c.hex) ? 'border:1.5px solid #c8c0b4;' : ''}"
                  onclick="toggleColor('${c.name}')">
          </button>`).join('')}
      </div>
      <div class="selected-colors-label" id="selectedColorsLabel"></div>
      <div class="field-error" id="err-shirtColor"></div>
      <div class="static-val" id="sv-shirtColor"></div>
    </div>`;

  const sizeHTML = `
    <div class="field span-3" id="fieldShirtSize">
      <label>Size(s) Required * <span class="label-sub">(select all that apply)</span></label>
      <div class="size-pill-group" id="sizePillGroup">
        ${SIZES.map(s => `
          <button type="button" class="size-pill" data-size="${s}" onclick="toggleSize('${s}')">${s}</button>`).join('')}
      </div>
      <div class="field-error" id="err-shirtSize"></div>
      <div class="static-val" id="sv-shirtSize"></div>
    </div>`;

  container.innerHTML = methodHTML + colorHTML + sizeHTML;
}


/* ================================================================
   SELECTION HANDLERS
================================================================ */
function selectPrintMethod(id) {
  selectedPrintMethod = id;
  document.querySelectorAll('.print-method-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.method === id);
  });
  clearFieldError('printMethod');
  saveDraft();
}

function toggleColor(name) {
  const idx = selectedColors.indexOf(name);
  if (idx === -1) selectedColors.push(name);
  else selectedColors.splice(idx, 1);

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', selectedColors.includes(sw.dataset.color));
  });

  const lbl = document.getElementById('selectedColorsLabel');
  if (lbl) lbl.textContent = selectedColors.length > 0
    ? 'Selected: ' + selectedColors.join(', ')
    : '';

  clearFieldError('shirtColor');
  saveDraft();
}

function toggleSize(size) {
  const idx = selectedSizes.indexOf(size);
  if (idx === -1) selectedSizes.push(size);
  else selectedSizes.splice(idx, 1);

  document.querySelectorAll('.size-pill').forEach(pill => {
    pill.classList.toggle('active', selectedSizes.includes(pill.dataset.size));
  });
  clearFieldError('shirtSize');
  saveDraft();
}


/* ================================================================
   PERSISTENT ORDER NUMBER
================================================================ */
function generateOrderNum() {
  const d = new Date();
  return 'ORD-' +
    d.getFullYear().toString().slice(2) +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    Math.floor(Math.random()*900+100) + '-' +
    String(d.getSeconds()).padStart(2,'0');
}

function getOrCreateOrderNum() {
  let n = localStorage.getItem(KEY_ORDER_NUM);
  if (!n) { n = generateOrderNum(); localStorage.setItem(KEY_ORDER_NUM, n); }
  return n;
}

const now = new Date();
document.getElementById('dateDisplay').textContent =
  now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

const orderNum = getOrCreateOrderNum();
document.getElementById('orderNum').textContent = orderNum;

// Minimum deadline = today + 7 days
const minDate = new Date();
minDate.setDate(minDate.getDate() + 7);
minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
document.getElementById('deadline').setAttribute('min', minDate.toISOString().split('T')[0]);


/* ================================================================
   AUTO-SAVE DRAFT
================================================================ */
function saveDraft() {
  const draft = {};
  FIELDS.forEach(id => { const el = document.getElementById(id); if (el) draft[id] = el.value; });
  draft._printMethod = selectedPrintMethod;
  draft._colors      = selectedColors;
  draft._sizes       = selectedSizes;
  localStorage.setItem(KEY_DRAFT, JSON.stringify(draft));
}

function restoreDraft() {
  const raw = localStorage.getItem(KEY_DRAFT);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && draft[id] !== undefined) el.value = draft[id];
    });
    if (draft._printMethod) selectPrintMethod(draft._printMethod);
    if (Array.isArray(draft._colors)) draft._colors.forEach(c => toggleColor(c));
    if (Array.isArray(draft._sizes))  draft._sizes.forEach(s => toggleSize(s));
  } catch(e) { localStorage.removeItem(KEY_DRAFT); }
}

function clearDraft() { localStorage.removeItem(KEY_DRAFT); }

FIELDS.forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', saveDraft);
  if (el.tagName === 'SELECT') el.addEventListener('change', saveDraft);
});


/* ================================================================
   ORDER STORAGE
================================================================ */
function getOrders() {
  try { return JSON.parse(localStorage.getItem(KEY_ORDERS)) || []; }
  catch(e) { return []; }
}

function saveOrder(data) {
  const orders = getOrders();
  orders.push(data);
  localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
}

function buildOrderRecord() {
  return {
    orderId:      orderNum,
    date:         document.getElementById('dateDisplay').textContent,
    clientName:   v('clientName'),
    phone:        v('phone'),
    email:        v('email'),
    eventName:    v('eventName'),
    shirtCount:   v('shirtCount'),
    productType:  v('productType'),
    printMethod:  selectedPrintMethod     || 'Not specified',
    shirtColors:  selectedColors.join(', ') || 'Not specified',
    shirtSizes:   selectedSizes.join(', ')  || 'Not specified',
    fabric:       v('fabric')             || 'No preference',
    deadline:     v('deadline'),
    logo:         v('logoStatus')         || 'Not specified',
    brief:        v('brief'),
    status:       'Pending'
  };
}


/* ================================================================
   HELPERS
================================================================ */
function v(id) {
  const e = document.getElementById(id);
  return e ? e.value.trim() : '';
}

function trimAllFields() {
  FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName !== 'SELECT') el.value = el.value.trim();
  });
  const ph = document.getElementById('phone');
  if (ph) ph.value = ph.value.replace(/\s+/g, '');
}

function showBanner(id, ms=5000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', ms);
}

function hideAllBanners() {
  ['errorBanner','successBanner','fallbackBanner'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function setFieldError(id, msg) {
  const input = document.getElementById(id);
  const errEl = document.getElementById('err-' + id);
  if (input) input.classList.add('invalid');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
}

function clearFieldError(id) {
  const input = document.getElementById(id);
  const errEl = document.getElementById('err-' + id);
  if (input) input.classList.remove('invalid');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
}

function clearAllErrors() {
  [...REQUIRED, 'printMethod', 'shirtColor', 'shirtSize'].forEach(id => clearFieldError(id));
}

REQUIRED.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => clearFieldError(id));
});


/* ================================================================
   STRICT VALIDATION
================================================================ */
function validateFields() {
  clearAllErrors();
  let valid = true;
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);

  if (!v('clientName')) {
    setFieldError('clientName', 'Name is required.'); valid = false;
  }

  const rawPhone    = v('phone').replace(/[\s\-\+]/g, '');
  const phoneDigits = rawPhone.replace(/\D/g, '');
  if (!v('phone')) {
    setFieldError('phone', 'Phone number is required.'); valid = false;
  } else if (phoneDigits.length !== 10 || /[a-zA-Z]/.test(v('phone'))) {
    setFieldError('phone', 'Enter a valid 10-digit Indian phone number.'); valid = false;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!v('email')) {
    setFieldError('email', 'Email is required.'); valid = false;
  } else if (!emailRe.test(v('email'))) {
    setFieldError('email', 'Enter a valid email address.'); valid = false;
  }

  if (!v('address')) {
    setFieldError('address', 'Delivery address is required.'); valid = false;
  }

  if (!v('eventName')) {
    setFieldError('eventName', 'Event/order name is required.'); valid = false;
  }

  const count = parseInt(v('shirtCount'), 10);
  if (!v('shirtCount')) {
    setFieldError('shirtCount', 'Shirt count is required.'); valid = false;
  } else if (isNaN(count) || count < 15) {
    setFieldError('shirtCount', 'Minimum order is 15 shirts.'); valid = false;
  }

  const dl = v('deadline');
  if (!dl) {
    setFieldError('deadline', 'Deadline is required.'); valid = false;
  } else {
    const picked = new Date(dl); picked.setHours(0,0,0,0);
    if (picked < todayDate) {
      setFieldError('deadline', 'Deadline cannot be a past date.'); valid = false;
    }
  }

  if (!v('brief')) {
    setFieldError('brief', 'Design brief is required.'); valid = false;
  }

  if (!v('productType')) {
    setFieldError('productType', 'Please select a product type.'); valid = false;
  }

  if (!selectedPrintMethod) {
    setFieldError('printMethod', 'Please select a print method.'); valid = false;
  }

  if (selectedColors.length === 0) {
    setFieldError('shirtColor', 'Please select at least one shirt colour.'); valid = false;
  }

  if (selectedSizes.length === 0) {
    setFieldError('shirtSize', 'Please select at least one size.'); valid = false;
  }

  return valid;
}


/* ================================================================
   BUTTON STATE
================================================================ */
const checkbox  = document.getElementById('agreeCheck');
const submitBtn = document.getElementById('submitBtn');

function syncButton() {
  const checked = checkbox.checked;
  submitBtn.disabled = !checked;
  submitBtn.classList.toggle('ready', checked);
}

checkbox.addEventListener('change', syncButton);
syncButton();


/* ================================================================
   BEFORE UNLOAD
================================================================ */
function hasUnsavedData() {
  return REQUIRED.some(id => v(id).length > 0) ||
         selectedPrintMethod !== '' ||
         selectedColors.length > 0 ||
         selectedSizes.length > 0;
}

let suppressLeaveWarning = false;
window.addEventListener('beforeunload', function(e) {
  if (suppressLeaveWarning) return;
  if (hasUnsavedData()) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});


/* ================================================================
   PDF STATIC VALUES
================================================================ */
function populateStaticVals() {
  FIELDS.forEach(id => {
    const inp = document.getElementById(id);
    const out = document.getElementById('sv-' + id);
    if (inp && out) out.textContent = inp.value || '-';
  });
  const svPrint = document.getElementById('sv-printMethod');
  const svColor = document.getElementById('sv-shirtColor');
  const svSize  = document.getElementById('sv-shirtSize');
  if (svPrint) svPrint.textContent = selectedPrintMethod          || '-';
  if (svColor) svColor.textContent = selectedColors.join(', ')   || '-';
  if (svSize)  svSize.textContent  = selectedSizes.join(', ')    || '-';
}


/* ================================================================
   EMAIL BODY
================================================================ */
function buildEmailBody() {
  return encodeURIComponent(
    'NEW ORDER - Thread&Co.\n' +
    'Order #: ' + orderNum + '\nDate: ' + document.getElementById('dateDisplay').textContent + '\n\n' +
    'CLIENT DETAILS\n' +
    'Name: '    + v('clientName') + '\nOrg: ' + (v('orgName')||'N/A') + '\nPhone: ' + v('phone') + '\n' +
    'Email: '   + v('email') + '\nAddress: ' + v('address') + '\n\n' +
    'ORDER DETAILS\n' +
    'Event: '        + v('eventName')                               + '\n' +
    'Product: '      + v('productType')                             + '\n' +
    'Print Method: ' + (selectedPrintMethod || 'Not specified')     + '\n' +
    'Colour(s): '    + (selectedColors.join(', ') || 'Not specified') + '\n' +
    'Size(s): '      + (selectedSizes.join(', ')  || 'Not specified') + '\n' +
    'Fabric: '       + (v('fabric') || 'No preference')             + '\n' +
    'Shirts: '       + v('shirtCount')                              + '\n' +
    'Needed By: '    + v('deadline')                                + '\n' +
    'Logo: '         + (v('logoStatus') || 'Not specified')         + '\n' +
    'Brief: '        + v('brief')                                   + '\n\n' +
    'Terms & Conditions: Agreed\n(PDF attached)'
  );
}


/* ================================================================
   RESET FORM
================================================================ */
function resetForm() {
  FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });

  selectedPrintMethod = '';
  selectedColors      = [];
  selectedSizes       = [];

  document.querySelectorAll('.print-method-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));

  const lbl = document.getElementById('selectedColorsLabel');
  if (lbl) lbl.textContent = '';

  clearAllErrors();
  checkbox.checked = false;
  syncButton();
  clearDraft();
  localStorage.removeItem(KEY_ORDER_NUM);
  const newNum = generateOrderNum();
  localStorage.setItem(KEY_ORDER_NUM, newNum);
  document.getElementById('orderNum').textContent = newNum;
}


/* ================================================================
   SUBMIT FLOW
================================================================ */
function handleSubmit() {
  if (!checkbox.checked) return;

  trimAllFields();

  if (!validateFields()) {
    submitBtn.disabled = false;
    submitBtn.classList.add('ready');
    const firstErr = document.querySelector(
      '.field input.invalid, .field textarea.invalid, .field select.invalid, .field-error.visible'
    );
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  hideAllBanners();

  submitBtn.disabled = true;
  submitBtn.classList.remove('ready');
  submitBtn.innerHTML = '<span class="btn-icon">&#8987;</span> Processing...';

  saveOrder(buildOrderRecord());
  populateStaticVals();

  setTimeout(() => { window.print(); }, 200);
  setTimeout(() => { showBanner('successBanner', 6000); }, 1000);
  setTimeout(() => {
    suppressLeaveWarning = true;
    resetForm();
    submitBtn.innerHTML = '<span class="btn-icon">&#8595;</span> Download PDF';
  }, 2200);
}


/* ================================================================
   INIT
================================================================ */
window.addEventListener('load', () => {
  buildPrintingUI();  // build custom UI first
  restoreDraft();     // then restore any saved data into it
  const first = document.getElementById('clientName');
  if (first) first.focus();
});
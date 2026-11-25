(() => {
  'use strict';

  const navButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (navButton && nav) {
    navButton.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      navButton.setAttribute('aria-expanded', String(open));
      navButton.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      navButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const serviceSelect = document.querySelector('#service');
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      if (serviceSelect) serviceSelect.value = link.dataset.service;
    });
  });
  try {
    const fromUrl = new URLSearchParams(location.search).get('service');
    if (fromUrl && serviceSelect && [...serviceSelect.options].some(item => item.value === fromUrl)) {
      serviceSelect.value = fromUrl;
    }
  } catch (_) { /* Invalid query values are ignored. */ }

  const year = document.querySelector('#current-year');
  if (year) year.textContent = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date());

  const form = document.querySelector('#lead-form');
  if (!form) return;
  const result = document.querySelector('#form-message');
  const submit = document.querySelector('#submit-button');
  const originalButtonLabel = submit.innerHTML;
  const normalizeDigits = value => String(value).replace(/[\u06f0-\u06f9\u0660-\u0669]/g, ch => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(ch) % 10));
  const normalizeMobile = mobile => {
    let v = normalizeDigits(mobile).replace(/[\s\-()]/g, '');
    if (v.startsWith('+98')) v = '0' + v.slice(3);
    if (v.startsWith('0098')) v = '0' + v.slice(4);
    if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
    return v;
  };
  const showMessage = (message, kind) => {
    result.textContent = message;
    result.dataset.kind = kind;
    result.hidden = false;
    result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const submissionTime = () => new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date());
  const urlInput = document.querySelector('#submission_url');
  const timeInput = document.querySelector('#submission_time');
  if (urlInput) urlInput.value = location.href;
  if (timeInput) timeInput.value = submissionTime();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    result.hidden = true;
    if (location.protocol === 'file:') {
      showMessage('این فایل فقط پیش‌نمایش است. برای ارسال درخواست، سایت را روی GitHub Pages باز کنید.', 'error');
      return;
    }
    const fullnameInput = document.querySelector('#fullname');
    const mobileInput = document.querySelector('#mobile');
    const consentInput = document.querySelector('#consent');
    const fullname = fullnameInput.value.trim();
    const mobile = normalizeMobile(mobileInput.value);
    const service = serviceSelect.value;
    if (fullname.length < 2 || fullname.length > 100) {
      showMessage('لطفاً نام و نام خانوادگی را به‌درستی وارد کنید.', 'error'); fullnameInput.focus(); return;
    }
    if (!/^09\d{9}$/.test(mobile)) {
      showMessage('لطفاً یک شماره موبایل معتبر ایرانی وارد کنید؛ مانند ۰۹۱۲۱۲۳۴۵۶۷.', 'error'); mobileInput.focus(); return;
    }
    if (!service) { showMessage('نوع خدمت را انتخاب کنید.', 'error'); serviceSelect.focus(); return; }
    if (!consentInput.checked) { showMessage('پذیرش توضیحات حریم خصوصی برای ارسال فرم ضروری است.', 'error'); consentInput.focus(); return; }
    if (document.querySelector('#company_website').value.trim()) return;

    // The visitor's information is sent only to the configured external form processor.
    // No fake local database /admin or SMTP password is used in GitHub Pages.
    const payload = {
      'نام و نام خانوادگی': fullname,
      'شماره موبایل': mobile,
      'خدمت موردنظر': service,
      'شهر': document.querySelector('#city').value.trim() || 'ثبت نشده',
      'زمان مناسب تماس': document.querySelector('#preferred_time').value || 'بدون ترجیح',
      'توضیحات بیشتر': document.querySelector('#message').value.trim() || 'ثبت نشده',
      'رضایت استفاده از اطلاعات': 'بله',
      'زمان ثبت درخواست': submissionTime(),
      '_url': location.href,
      '_subject': 'درخواست مشاوره جدید | مؤسسه ثبتی اطلس',
      '_template': 'table',
      '_honey': ''
    };
    submit.disabled = true;
    submit.textContent = 'در حال ارسال درخواست…';
    try {
      const response = await fetch('https://formsubmit.co/ajax/info@atlassabt.com', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      const accepted = body && (body.success === true || body.success === 'true');
      if (!response.ok || !accepted) throw new Error('ارسال درخواست ناموفق بود. لطفاً دوباره تلاش کنید یا با اطلس تماس بگیرید.');
      showMessage('درخواست شما به سامانه دریافت فرم ارسال شد. کارشناسان اطلس پس از بررسی با شما تماس می‌گیرند.', 'success');
      form.reset();
      if (urlInput) urlInput.value = location.href;
      if (timeInput) timeInput.value = submissionTime();
    } catch (error) {
      showMessage(error.message || 'ارتباط با سامانه دریافت فرم برقرار نشد. لطفاً از طریق تلفن با اطلس تماس بگیرید.', 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalButtonLabel;
    }
  });
})();

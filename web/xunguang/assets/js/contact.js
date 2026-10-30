(function () {
  'use strict';

  const form = document.getElementById('xg-booking-form');
  if (!form) return;

  const status = document.getElementById('xg-booking-status');
  const done = document.getElementById('xg-booking-done');
  const again = document.getElementById('xg-booking-again');
  const submit = form.querySelector('button[type="submit"]');
  const endpoint = form.dataset.endpoint || '/api/reservation';

  function setStatus(message, type) {
    status.textContent = message;
    status.dataset.type = type || '';
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    if (String(data.get('website') || '').trim()) return;

    const payload = {
      name: String(data.get('name') || '').trim(),
      city: String(data.get('city') || '').trim(),
      contact: String(data.get('contact') || '').trim(),
      question: String(data.get('question') || '').trim(),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') || '').trim(),
    };

    submit.disabled = true;
    submit.textContent = '正在提交…';
    setStatus('', '');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(result.error || '提交没有成功，请稍后再试。');
      }

      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch (error) {
      setStatus(
        error.message + ' 也可以直接在公众号「龙哥强势文化圈」留言「循光」+ 城市。',
        'error'
      );
    } finally {
      submit.disabled = false;
      submit.textContent = '提交预约';
    }
  });

  if (again) {
    again.addEventListener('click', function () {
      form.reset();
      form.hidden = false;
      done.hidden = true;
      setStatus('', '');
      const first = form.querySelector('input[name="name"]');
      if (first) first.focus();
    });
  }
})();

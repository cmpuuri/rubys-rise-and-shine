/* Ruby's Rise & Shine. Reads /site.config.json and builds the menu, pills, and order form.
   Change prices, flavors, bake days, and the Venmo handle in site.config.json, not here. */
(function(){
  'use strict';

  var TZ = 'America/Los_Angeles';
  var MIN_SECONDS_ON_PAGE = 3;
  var DAY_LONG = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  var DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // Short line under each flavor in the order form. Not in the config shape, so kept from the prototype.
  // A new flavor with no line here shows the pan size instead.
  var FLAVOR_HINTS = { plain: 'Olive oil and flaky salt', garlic: 'Roasted garlic and rosemary' };

  var cfg, qty = 1, loadedAt = Date.now(), sending = false;
  var $ = function(id){ return document.getElementById(id); };

  // Google Fonts start as media="print" so they never block the first paint. Switch them on here.
  var fonts = $('fonts');
  if (fonts) { if (fonts.sheet) fonts.media = 'all'; else fonts.addEventListener('load', function(){ fonts.media = 'all'; }); }

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function joinList(items, last){
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + (items.length > 2 ? ',' : '') + ' ' + last + ' ' + items[items.length - 1];
  }
  function money(n){ return '$' + n; }

  /* ---------- bake days, computed in Pacific time ---------- */

  // Today's calendar date in Pacific time, as a UTC-midnight Date so day math ignores the visitor's own time zone.
  function pacificToday(){
    var parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date()).forEach(function(p){ parts[p.type] = p.value; });
    return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  }
  var fmtLong = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
  var fmtShort = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });

  function nextBakeDays(){
    var out = [], d = pacificToday(), guard = 0;
    if (!cfg.bakeDays.length) return out;
    while (out.length < cfg.bakeDaysToShow && guard++ < 366) {
      d = new Date(d.getTime() + 864e5); // starts tomorrow
      if (cfg.bakeDays.indexOf(d.getUTCDay()) > -1) {
        out.push({ iso: d.toISOString().slice(0, 10), long: fmtLong.format(d), short: fmtShort.format(d).replace(',', '') });
      }
    }
    return out;
  }

  /* ---------- page content from config ---------- */

  function fillText(){
    var days = cfg.bakeDays.slice().sort(function(a, b){ return a - b; });
    var values = {
      businessName: cfg.businessName, tagline: cfg.tagline, city: cfg.city, domain: cfg.domain,
      town: cfg.city.split(',')[0], panSize: cfg.panSize, ingredientsNote: cfg.ingredientsNote,
      venmoHandle: cfg.venmoHandle, maxPansPerOrder: cfg.maxPansPerOrder, pansPerBake: cfg.pansPerBake,
      bakeDaysLong: joinList(days.map(function(n){ return DAY_LONG[n]; }), 'and')
    };
    document.querySelectorAll('[data-cfg]').forEach(function(n){
      var v = values[n.getAttribute('data-cfg')];
      if (v != null) n.textContent = v;
    });

    var pills = $('pills');
    [
      'Bakes ' + days.map(function(n){ return DAY_SHORT[n]; }).join(' & '),
      cfg.dropoffOptions.length ? 'Pickup or dropoff' : 'Pickup',
      money(cfg.price) + ' a pan'
    ].forEach(function(t){ pills.appendChild(el('span', 'pill', t)); });
  }

  // Decorative pan drawing from the prototype: dimples (i), rosemary (b), salt flakes (s).
  var PAN_ART = {
    plain: { i: [[18,22],[46,18],[70,30],[28,52],[58,50],[40,76],[72,72]], b: [], s: [[35,38],[62,64],[22,70],[80,52],[52,30]] },
    garlic: { i: [[20,24],[50,16],[74,34],[30,56],[60,52],[42,78],[76,74]], b: [[36,40],[64,66],[18,74],[78,18]], s: [[30,36],[56,68],[84,54]] }
  };
  function panArt(id){
    var art = PAN_ART[id] || PAN_ART.plain, box = el('div', 'focaccia');
    box.setAttribute('aria-hidden', 'true');
    ['i','b','s'].forEach(function(tag){
      art[tag].forEach(function(xy){ var dot = el(tag); dot.style.left = xy[0] + '%'; dot.style.top = xy[1] + '%'; box.appendChild(dot); });
    });
    return box;
  }

  function buildMenu(){
    var pans = $('pans');
    cfg.flavors.forEach(function(f){
      var card = el('article', 'pan'), top = el('div', 'top'), meta = el('div', 'meta');
      card.appendChild(panArt(f.id));
      top.appendChild(el('h3', null, f.name));
      top.appendChild(el('div', 'price', money(cfg.price)));
      card.appendChild(top);
      card.appendChild(el('p', null, f.desc));
      meta.appendChild(el('span', null, cfg.panSize + ' pan'));
      meta.appendChild(el('span', null, 'Serves ' + cfg.serves));
      card.appendChild(meta);
      pans.appendChild(card);
    });
    (cfg.comingSoon || []).forEach(function(c){
      var card = el('article', 'pan soon'), top = el('div', 'top');
      top.appendChild(el('h3', null, c.name));
      top.appendChild(el('div', 'price soon-label', 'Coming soon'));
      card.appendChild(top);
      card.appendChild(el('p', null, c.note));
      pans.appendChild(card);
    });
    var ul = $('ingredients');
    cfg.ingredients.forEach(function(g){
      var li = el('li');
      li.appendChild(el('b', null, g.name));
      li.appendChild(el('span', null, g.note));
      ul.appendChild(li);
    });
  }

  /* ---------- order form ---------- */

  function buildForm(){
    var box = $('flavorChoices');
    cfg.flavors.forEach(function(f, i){
      var input = el('input'), label = el('label');
      input.type = 'radio'; input.name = 'flavor'; input.id = 'fl-' + f.id; input.value = f.name; input.checked = i === 0;
      label.htmlFor = input.id;
      label.appendChild(document.createTextNode(f.name + ' '));
      label.appendChild(el('small', null, FLAVOR_HINTS[f.id] || (cfg.panSize + ' pan')));
      box.appendChild(input); box.appendChild(label);
    });

    var bake = $('bakeDay');
    nextBakeDays().forEach(function(d, i){
      var o = el('option', null, d.long + (i === 0 ? ' (next bake)' : ''));
      o.value = d.iso; o.setAttribute('data-short', d.short); o.setAttribute('data-long', d.long);
      bake.appendChild(o);
    });

    var drop = $('dropLoc');
    cfg.dropoffOptions.forEach(function(t){ drop.appendChild(el('option', null, t)); });
    if (!cfg.dropoffOptions.length) { $('m-drop').nextElementSibling.remove(); $('m-drop').remove(); }

    var form = $('orderForm');
    $('qtyMinus').addEventListener('click', function(){ if (qty > 1) { qty--; renderQty(); } });
    $('qtyPlus').addEventListener('click', function(){
      if (qty < cfg.maxPansPerOrder) { qty++; renderQty(); }
      else showErr('Max ' + cfg.maxPansPerOrder + ' pans per order for now. Want more? Add a note and Ruby will see what she can do.');
    });
    form.querySelectorAll('input[name=method]').forEach(function(r){
      r.addEventListener('change', function(){ $('dropWhere').hidden = form.method.value !== 'Dropoff'; });
    });
    ['name','phone'].forEach(function(id){ $(id).addEventListener('input', function(){ fieldErr(id, ''); }); });
    form.addEventListener('submit', onSubmit);
    $('copyBtn').addEventListener('click', function(){ copyTicket(this, $('ticket')); });
    $('fallbackCopy').addEventListener('click', function(){ copyTicket(this, $('fallbackTicket')); });
    $('againBtn').addEventListener('click', resetForm);
    renderQty();
    $('submitBtn').disabled = false; // stays disabled in the HTML until the form is ready
  }

  function renderQty(){
    $('qtyOut').value = qty;
    $('total').textContent = money(qty * cfg.price);
    $('qtyMinus').disabled = qty <= 1;
    if (qty < cfg.maxPansPerOrder) clearErr();
  }
  function showErr(m){ $('formErr').textContent = m; $('formErr').hidden = false; }
  function clearErr(){ $('formErr').hidden = true; }
  function fieldErr(id, m){
    var p = $(id + 'Err');
    p.textContent = m; p.hidden = !m;
    if (m) $(id).setAttribute('aria-invalid', 'true'); else $(id).removeAttribute('aria-invalid');
  }

  function validPhone(v){
    var digits = v.replace(/\D/g, '');
    return /^[\d\s().+-]+$/.test(v) && (digits.length === 10 || (digits.length === 11 && digits[0] === '1'));
  }

  function readOrder(){
    var form = $('orderForm'), opt = $('bakeDay').options[$('bakeDay').selectedIndex];
    var method = form.method.value;
    var rand = new Uint32Array(1); crypto.getRandomValues(rand);
    return {
      id: 'RRS-' + String(rand[0] % 100000).padStart(5, '0'),
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      flavor: form.flavor.value,
      qty: qty,
      bakeDate: opt.value,
      bakeDayLong: opt.getAttribute('data-long'),
      bakeDayShort: opt.getAttribute('data-short'),
      method: method,
      where: method === 'Dropoff' ? $('dropLoc').value : 'Pickup at our house',
      notes: form.notes.value.trim(),
      total: qty * cfg.price
    };
  }

  // Same ticket format as the prototype.
  function ticketText(o){
    return [
      cfg.businessName + '  ' + o.id,
      'Venmo: ' + cfg.venmoHandle,
      'Name: ' + o.name,
      'Phone: ' + o.phone,
      'Order: ' + o.qty + ' x ' + o.flavor + ' focaccia (' + cfg.panSize + ')',
      'Bake day: ' + o.bakeDayLong,
      'Get it by: ' + o.method + ' - ' + o.where,
      o.notes ? 'Notes: ' + o.notes : null,
      'Total: ' + money(o.total) + ' via Venmo at handoff'
    ].filter(Boolean).join('\n');
  }

  // No phone number appears in the page unless orderPhone is set in site.config.json.
  function smsHref(text){
    return 'sms:' + (cfg.orderPhone || '').replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(text);
  }

  function onSubmit(e){
    e.preventDefault();
    if (sending) return;
    clearErr(); $('fallback').hidden = true;
    var form = $('orderForm'), o = readOrder(), bad = null;
    fieldErr('name', ''); fieldErr('phone', '');
    if (!o.phone) { fieldErr('phone', 'Add a phone number so Ruby can text you when it is ready.'); bad = 'phone'; }
    else if (!validPhone(o.phone)) { fieldErr('phone', 'That phone number looks short. Use 10 digits, like 858 555 0100.'); bad = 'phone'; }
    if (!o.name) { fieldErr('name', 'Add your name so Ruby knows who the pan is for.'); bad = 'name'; }
    if (!o.bakeDate) { showErr('No bake days are open right now. Check back soon.'); return; }
    if (bad) { $(bad).focus(); return; }
    if (form.botcheck.checked) { showErr('Something went wrong. Please try again.'); return; }
    if ((Date.now() - loadedAt) / 1000 < MIN_SECONDS_ON_PAGE) { showErr('That was fast! Wait a moment and press the button again.'); return; }

    var text = ticketText(o);
    setSending(true);
    sendOrder(o, text).then(function(){
      setSending(false);
      showConfirm(text);
      onOrderSubmitted(o);
    }, function(err){
      setSending(false);
      showErr((err && err.message ? err.message + ' ' : '') + 'Your order did not go through online.');
      $('fallbackTicket').textContent = text;
      $('fallbackSms').href = smsHref(text);
      $('fallback').hidden = false;
    });
  }

  function sendOrder(o, text){
    if (!cfg.orderAccessKey || cfg.orderAccessKey === 'PLACEHOLDER') {
      return Promise.reject(new Error('Online ordering is not switched on yet.'));
    }
    var payload = {
      access_key: cfg.orderAccessKey,
      subject: "Ruby's order " + o.id + ': ' + o.qty + ' x ' + o.flavor + ' for ' + o.bakeDayShort,
      from_name: cfg.businessName + ' website',
      message: text,
      order_id: o.id,
      name: o.name,
      phone: o.phone,
      flavor: o.flavor,
      quantity: o.qty,
      bake_day: o.bakeDayLong,
      bake_date: o.bakeDate,
      get_it_by: o.method,
      where: o.where,
      notes: o.notes || '(none)',
      total: money(o.total)
    };
    return fetch(cfg.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(j){
        if (!r.ok || j.success === false) throw new Error('The order service said no.');
        return j;
      });
    }, function(){ throw new Error('No connection.'); });
  }

  function setSending(on){
    sending = on;
    var b = $('submitBtn');
    b.disabled = on;
    b.setAttribute('aria-busy', on ? 'true' : 'false');
    b.textContent = '';
    if (on) b.appendChild(el('span', 'spin'));
    b.appendChild(document.createTextNode(on ? 'Sending your order...' : 'Place my order'));
  }

  function showConfirm(text){
    $('ticket').textContent = text;
    $('smsBtn').href = smsHref(text);
    $('orderForm').hidden = true; $('sideInfo').hidden = true;
    var c = $('confirm'); c.hidden = false;
    c.scrollIntoView({ block: 'start' }); c.focus({ preventScroll: true });
  }

  function copyTicket(btn, ticket){
    var t = ticket.textContent, label = btn.textContent;
    function done(){ btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = label; }, 1600); }
    function fallback(){
      var r = document.createRange(); r.selectNodeContents(ticket);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) done(); else btn.textContent = 'Selected, press copy';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback);
    else fallback();
  }

  function resetForm(){
    var form = $('orderForm');
    form.reset(); qty = 1; renderQty();
    $('dropWhere').hidden = true; $('fallback').hidden = true; clearErr();
    fieldErr('name', ''); fieldErr('phone', '');
    form.hidden = false; $('sideInfo').hidden = false; $('confirm').hidden = true;
    loadedAt = Date.now();
    form.scrollIntoView({ block: 'start' });
  }

  /* ---------- PHASE 2 EXTENSION POINT ----------
     Runs after an order is delivered. Add later: count pans per bake day,
     text Ruby (for example Twilio, through a small serverless function), or log to a Google Sheet.
     Do not put private keys in this file: everything here is public. */
  function onOrderSubmitted(order){ /* eslint-disable-line no-unused-vars */ }

  /* ---------- start ---------- */

  fetch('/site.config.json')
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(json){
      cfg = json; fillText(); buildMenu(); buildForm();
      // The menu is built after the page opens, so a link like /#order needs a second jump.
      var target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    })
    .catch(function(){
      showErr('The order form could not load. Refresh the page, or text Ruby your order.');
      $('submitBtn').disabled = true;
    });
})();

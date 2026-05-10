(function(){

  // ===== Schedule config (change these to update all dates) =====
  var SCHEDULE_DATE = 'April 7–22';
  var SCHEDULE_YEAR = '2026';
  var SCHEDULE_CITY = 'Osaka';

  // ===== UTM PARAMS =====
  // Fix: Meta ads sometimes double-encode '?' as '%3F' in URL params
  var rawSearch = window.location.search;
  if(rawSearch.indexOf('%3F') !== -1 || rawSearch.indexOf('%3f') !== -1){
    rawSearch = rawSearch.replace(/%3F/gi, '&');
  }
  var urlParams = new URLSearchParams(rawSearch);
  var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var utmData = {};
  utmKeys.forEach(function(k){ var v = urlParams.get(k); if(v) utmData[k] = v; });

  var fbclid = urlParams.get('fbclid');

  // Auto-detect Meta ad traffic when UTM params are missing
  if(!utmData.utm_source){
    var ref = document.referrer.toLowerCase();
    var isMeta = fbclid || ref.indexOf('facebook.com') !== -1 || ref.indexOf('instagram.com') !== -1 || ref.indexOf('fb.com') !== -1 || ref.indexOf('lm.facebook.com') !== -1;
    if(isMeta){
      utmData.utm_source = 'meta';
      utmData.utm_medium = 'paid';
      utmData.utm_campaign = utmData.utm_campaign || 'auto_detected';
    }
  }

  // GA4 source normalization — prevent referrer fragmentation (pageview fires here)
  if(typeof gtag === 'function'){
    var ga4Config = {};
    if(utmData.utm_source){
      ga4Config.campaign = {
        source: utmData.utm_source,
        medium: utmData.utm_medium || '(none)',
        name: utmData.utm_campaign || '(not set)'
      };
      if(utmData.utm_content) ga4Config.campaign.content = utmData.utm_content;
    }
    gtag('config', 'G-QZSP3DHNW6', ga4Config);
  }

  // ===== Store ad visit info (for IG profile conversion tracking) =====
  if (utmData.utm_source) {
    try {
      localStorage.setItem('lea_ad_visit', JSON.stringify({
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_content: utmData.utm_content || null,
        fbclid: fbclid || null,
        ts: Date.now()
      }));
    } catch(e){}
  }

  // ===== LINE URL =====
  var msg = 'I\'d like to consult about a floral tattoo.\nPlease let me know your availability for ' + SCHEDULE_DATE + '.';
  var baseLineUrl = 'https://lealinebot-production.up.railway.app/r';
  var directLineUrl = 'https://line.me/R/ti/p/@722xsnht';

  function buildLineUrl(source, size){
    var params = [];
    params.push('source=' + encodeURIComponent('en_' + source));
    if(size) params.push('size=' + encodeURIComponent(size));
    utmKeys.forEach(function(k){ if(utmData[k]) params.push(k + '=' + encodeURIComponent(utmData[k])); });
    if(fbclid) params.push('fbclid=' + encodeURIComponent(fbclid));
    params.push('conversion_path=en_lp');
    return baseLineUrl + '?' + params.join('&');
  }

  // Size card CTA links
  var smallCta = document.getElementById('smallCta');
  if(smallCta) smallCta.href = buildLineUrl('smallCta', 'small');
  var mediumCta = document.getElementById('mediumCta');
  if(mediumCta) mediumCta.href = buildLineUrl('mediumCta', 'medium');
  var largeCta = document.getElementById('largeCta');
  if(largeCta) largeCta.href = buildLineUrl('largeCta', 'large');

  // General CTAs (no size param)
  var generalLinks = ['lineBtn','stickyBtn','heroLineCta'];
  generalLinks.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.href = buildLineUrl(id);
  });

  // Hero CTA scrolls to size cards
  var heroCta = document.getElementById('heroCta');
  if(heroCta){
    heroCta.href = '#';
    heroCta.addEventListener('click', function(e){
      e.preventDefault();
      document.querySelector('.size-cards').scrollIntoView({behavior:'smooth'});
    });
  }

  // Dynamic date injection
  var priceDate = document.querySelector('.price-date');
  if(priceDate) priceDate.textContent = SCHEDULE_DATE + ' \u00B7 ' + SCHEDULE_CITY;
  var lineDateMain = document.querySelector('.line-date-main');
  if(lineDateMain) lineDateMain.textContent = 'Available: ' + SCHEDULE_DATE + ', ' + SCHEDULE_YEAR;

  // Email
  var emailSubject = encodeURIComponent('Floral Tattoo Inquiry - leakim.art');
  var emailBody = encodeURIComponent(msg);
  var emailBtn = document.getElementById('emailBtn');
  if(emailBtn) emailBtn.href = 'mailto:kimlea0328@gmail.com?subject=' + emailSubject + '&body=' + emailBody;

  // Copy
  var copyBtn = document.getElementById('copyBtn');
  if(copyBtn) copyBtn.addEventListener('click', function(){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(msg).catch(function(){});
    } else {
      var ta = document.createElement('textarea');
      ta.value = msg;ta.style.cssText='position:fixed;opacity:0';
      document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy')}catch(e){}
      document.body.removeChild(ta);
    }
    var toast = document.getElementById('copyToast');
    if(toast){
      toast.classList.add('show');
      setTimeout(function(){ toast.classList.remove('show'); }, 3000);
    }
    if(typeof fbq === 'function') fbq('trackCustom','CopyClickEN');
    if(typeof gtag === 'function') gtag('event', 'copy_click_en', {send_to: 'G-QZSP3DHNW6'});
  });

  // ===== TEST MODE =====
  var isTest = urlParams.get('test') === '1';

  // ===== PIXEL EVENTS =====
  var viewContentFired = false;
  var leadFired = false;

  // Landing size detection
  var landingSize = location.hash === '#medium' ? 'medium' : location.hash === '#large' ? 'large' : 'small';
  var landingValue = landingSize === 'large' ? 120000 : landingSize === 'medium' ? 90000 : 60000;

  // ViewContent: scroll 15% + 2s dwell
  var scrollReached = false;
  var dwellReached = false;

  function checkViewContent(){
    if(viewContentFired || isTest) return;
    if(scrollReached && dwellReached){
      viewContentFired = true;
      if(typeof fbq === 'function'){
        fbq('track', 'ViewContent', {
          content_name: 'en_lp',
          content_category: 'tattoo',
          value: landingValue,
          currency: 'JPY'
        });
        fbq('trackCustom', 'ViewContentEN', {
          content_name: 'en_lp',
          value: landingValue,
          currency: 'JPY'
        });
      }
      if(typeof gtag === 'function') gtag('event', 'view_content_en', {content_name: 'en_lp', value: landingValue, currency: 'JPY', send_to: 'G-QZSP3DHNW6', transport_type: 'beacon'});
    }
  }

  window.addEventListener('scroll', function(){
    if(scrollReached) return;
    var pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    if(pct >= 0.15){ scrollReached = true; checkViewContent(); }
  }, {passive:true});

  setTimeout(function(){ dwellReached = true; checkViewContent(); }, 2000);

  // Lead: LINE click
  function handleLineClick(source, size){
    var value = size === 'large' ? 120000 : size === 'medium' ? 90000 : size === 'small' ? 60000 : 60000;

    if(!leadFired && !isTest && typeof fbq === 'function'){
      leadFired = true;
      var leadData = {
        content_name: 'en_line_send_' + (size || 'general'),
        content_category: 'tattoo',
        value: value,
        currency: 'JPY'
      };
      if(utmData.utm_campaign) leadData.utm_campaign = utmData.utm_campaign;
      if(utmData.utm_source) leadData.utm_source = utmData.utm_source;
      fbq('track', 'Lead', leadData);
      fbq('trackCustom', 'LeadEN', leadData);
      fbq('trackCustom', 'LineOpenAttemptEN', {source: source, utm_campaign: utmData.utm_campaign || ''});
      if(typeof gtag === 'function') gtag('event', 'generate_lead_en', {content_name: 'en_line_send_' + (size || 'general'), value: value, currency: 'JPY', event_source: source, send_to: 'G-QZSP3DHNW6', transport_type: 'beacon'});
      try { sessionStorage.setItem('lea_lead_fired', '1'); sessionStorage.setItem('lea_lead_fired_ga', '1'); } catch(e){}
    }
    // Detect LINE open failure (3s for friend-add URL)
    var lineOpened = false;
    function onHidden(){ if(document.hidden) lineOpened = true; }
    document.addEventListener('visibilitychange', onHidden);
    setTimeout(function(){
      document.removeEventListener('visibilitychange', onHidden);
      if(!lineOpened){
        var fb = document.getElementById('lineFallback');
        if(fb) fb.classList.add('show');
        if(!isTest && typeof fbq === 'function') fbq('trackCustom','LineFallbackShownEN');
        if(!isTest && typeof gtag === 'function') gtag('event', 'line_fallback_shown_en', {send_to: 'G-QZSP3DHNW6'});
      }
    }, 3000);
  }

  var lineBtn = document.getElementById('lineBtn');
  if(lineBtn) lineBtn.addEventListener('click', function(){ handleLineClick('mainCTA'); });
  var stickyBtn = document.getElementById('stickyBtn');
  if(stickyBtn) stickyBtn.addEventListener('click', function(){ handleLineClick('stickyCTA'); });
  var heroLineEl = document.getElementById('heroLineCta');
  if(heroLineEl) heroLineEl.addEventListener('click', function(){ handleLineClick('heroLineCTA'); });
  if(smallCta) smallCta.addEventListener('click', function(){ handleLineClick('smallCta', 'small'); });
  if(mediumCta) mediumCta.addEventListener('click', function(){ handleLineClick('mediumCta', 'medium'); });
  if(largeCta) largeCta.addEventListener('click', function(){ handleLineClick('largeCta', 'large'); });

  if(emailBtn) emailBtn.addEventListener('click', function(){
    if(!isTest && typeof fbq === 'function') fbq('trackCustom','EmailClickEN');
    if(!isTest && typeof gtag === 'function') gtag('event', 'email_click_en', {send_to: 'G-QZSP3DHNW6'});
  });

  // ===== ARTIST MODAL =====
  var am = document.getElementById('am');
  if(am){
    function openAm(){
      am.classList.add('open');
      document.body.style.overflow = 'hidden';
      if(!isTest && typeof fbq === 'function') fbq('trackCustom','ArtistViewEN');
      if(!isTest && typeof gtag === 'function') gtag('event', 'artist_view_en', {send_to: 'G-QZSP3DHNW6'});
    }
    function closeAm(){
      am.classList.remove('open');
      document.body.style.overflow = '';
    }
    var brandArea = document.getElementById('brandArea');
    if(brandArea) brandArea.addEventListener('click', openAm);
    var artistPhoto = document.getElementById('artistPhoto');
    if(artistPhoto) artistPhoto.addEventListener('click', openAm);
    var amClose = document.getElementById('amClose');
    if(amClose) amClose.addEventListener('click', closeAm);
    am.addEventListener('click', function(e){ if(e.target === am) closeAm(); });
  }

  // Hero CTA tracking
  if(heroCta) heroCta.addEventListener('click', function(e){
    if(!isTest && typeof fbq === 'function') fbq('trackCustom','HeroCTAClickEN');
    if(!isTest && typeof gtag === 'function') gtag('event', 'hero_cta_click_en', {send_to: 'G-QZSP3DHNW6'});
  });

  // ===== STICKY CTA =====
  var sticky = document.getElementById('sticky');
  if(sticky && heroCta){
    var stickyObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) sticky.classList.add('show');
        else sticky.classList.remove('show');
      });
    }, {threshold:0});
    stickyObserver.observe(heroCta);
  }

  // ===== LIGHTBOX =====
  var galleries = {
    '1': ['../small-1.jpg'],
    '2': ['../small-2.jpg'],
    '3': ['../small-3.jpg'],
    '4': ['../medium-1.jpg'],
    '5': ['../medium-2.jpg'],
    '6': ['../medium-3.jpg'],
    '7': ['../tier3-1.jpg'],
    '8': ['../tier3-2.jpg'],
    '9': ['../tier3-3.jpg'],
    'hero': ['../small-1.jpg','../medium-1.jpg','../tier3-1.jpg']
  };

  var lb = document.getElementById('lb');
  var lbMain = document.getElementById('lbMain');
  var lbThumbs = document.getElementById('lbThumbs');
  var lbCounter = document.getElementById('lbCounter');
  var currentGallery = [];
  var currentIdx = 0;

  function openLb(imgs, startIdx){
    currentGallery = imgs;
    currentIdx = startIdx || 0;
    renderLb();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    history.pushState({lb:'gallery'}, '');
  }

  function renderLb(){
    var img = document.createElement('img');
    img.src = currentGallery[currentIdx];
    img.alt = 'Portfolio';
    lbMain.innerHTML = '';
    lbMain.appendChild(img);
    lbCounter.textContent = (currentIdx + 1) + ' / ' + currentGallery.length;
    lbThumbs.innerHTML = '';
    currentGallery.forEach(function(src, i){
      var t = document.createElement('img');
      t.src = src; t.className = 'lb-thumb';
      if(i === currentIdx) t.classList.add('active');
      t.addEventListener('click', function(){ currentIdx = i; renderLb(); });
      lbThumbs.appendChild(t);
    });
  }

  function closeLb(skipHistory){
    if(!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if(!skipHistory && history.state && history.state.lb === 'gallery') history.back();
  }

  // Swipe
  if(lbMain){
    var touchStartX = 0;
    lbMain.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, {passive:true});
    lbMain.addEventListener('touchend', function(e){
      var diff = touchStartX - e.changedTouches[0].clientX;
      if(Math.abs(diff) > 50){
        if(diff > 0 && currentIdx < currentGallery.length - 1){ currentIdx++; renderLb(); }
        else if(diff < 0 && currentIdx > 0){ currentIdx--; renderLb(); }
      }
    });
  }

  var lbClose = document.getElementById('lbClose');
  if(lbClose) lbClose.addEventListener('click', function(){ closeLb(); });
  var lbBottomClose = document.getElementById('lbBottomClose');
  if(lbBottomClose) lbBottomClose.addEventListener('click', function(){ closeLb(); });
  if(lb) lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });

  // Lightbox LINE CTA
  var lbLineCta = document.getElementById('lbLineCta');
  if(lbLineCta) lbLineCta.href = buildLineUrl('lbLineCta');

  // Gallery items (size cards)
  document.querySelectorAll('.size-card-img').forEach(function(item){
    item.addEventListener('click', function(){
      var id = item.getAttribute('data-gallery');
      if(galleries[id]){
        openLb(galleries[id], 0);
        if(!isTest && typeof fbq === 'function') fbq('trackCustom','GalleryOpenEN',{gallery:id});
        if(!isTest && typeof gtag === 'function') gtag('event', 'gallery_open_en', {gallery_id: id, send_to: 'G-QZSP3DHNW6'});
      }
    });
  });

  // Hero image → gallery
  var heroImg = document.getElementById('heroImg');
  if(heroImg) heroImg.addEventListener('click', function(){
    openLb(galleries['hero'], 0);
    if(!isTest && typeof fbq === 'function') fbq('trackCustom','HeroImageOpenGalleryEN');
    if(!isTest && typeof gtag === 'function') gtag('event', 'hero_image_gallery_en', {send_to: 'G-QZSP3DHNW6'});
  });

  // ===== REVIEW LIGHTBOX =====
  var reviews = [
    {
      text: 'She drew the design right there on my skin and kept adjusting until it flowed perfectly with my arm. I\'ve never had a tattoo experience like this.',
      sub: '',
      author: 'J.M., visiting from Los Angeles',
      via: 'via Instagram',
      initial: 'J'
    },
    {
      text: 'I was nervous about getting tattooed in a country where I don\'t speak the language, but Lea made the whole process effortless. The result is more beautiful than anything I imagined.',
      sub: '',
      author: 'S.K., based in Osaka',
      via: 'via Instagram',
      initial: 'S'
    },
    {
      text: 'I showed her one reference photo and she turned it into something completely original. Every petal follows the curve of my shoulder. It\'s like it was always there.',
      sub: '',
      author: 'R.T., visiting from London',
      via: 'via Instagram',
      initial: 'R'
    }
  ];

  var rlOverlay = document.getElementById('rlOverlay');
  var rlIdx = 0;

  function rlShow(i){
    rlIdx = i;
    var r = reviews[rlIdx];
    document.getElementById('rlText').innerHTML = r.text;
    var subEl = document.getElementById('rlSub');
    if(r.sub){ subEl.innerHTML = r.sub; subEl.style.display = ''; }
    else { subEl.style.display = 'none'; }
    document.getElementById('rlAuthor').textContent = r.author;
    document.getElementById('rlVia').textContent = r.via;
    var initialEl = document.getElementById('rlInitial');
    if(initialEl) initialEl.textContent = r.initial;
    document.getElementById('rlCounter').textContent = (rlIdx + 1) + ' / ' + reviews.length;
    var dots = document.querySelectorAll('.rl-dot');
    dots.forEach(function(d, di){ d.classList.toggle('active', di === rlIdx); });
  }

  function rlOpen(startIdx){
    var prog = document.getElementById('rlProgress');
    if(prog){
      prog.innerHTML = '';
      for(var p = 0; p < reviews.length; p++){
        var dot = document.createElement('div');
        dot.className = 'rl-dot';
        prog.appendChild(dot);
      }
    }
    rlShow(startIdx || 0);
    rlOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    history.pushState({lb:'review'}, '');
  }

  function rlClose(skipHistory){
    if(!rlOverlay || !rlOverlay.classList.contains('open')) return;
    rlOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if(!skipHistory && history.state && history.state.lb === 'review') history.back();
  }

  var reviewOpen = document.getElementById('reviewOpen');
  if(reviewOpen) reviewOpen.addEventListener('click', function(){
    rlOpen(0);
    if(!isTest && typeof fbq === 'function') fbq('trackCustom','ReviewOpenEN');
    if(!isTest && typeof gtag === 'function') gtag('event', 'review_open_en', {send_to: 'G-QZSP3DHNW6'});
  });
  var rlCloseBtn = document.getElementById('rlClose');
  if(rlCloseBtn) rlCloseBtn.addEventListener('click', function(){ rlClose(); });
  var rlBottomClose = document.getElementById('rlBottomClose');
  if(rlBottomClose) rlBottomClose.addEventListener('click', function(){ rlClose(); });
  if(rlOverlay) rlOverlay.addEventListener('click', function(e){ if(e.target === rlOverlay) rlClose(); });

  var rlPrev = document.getElementById('rlPrev');
  if(rlPrev) rlPrev.addEventListener('click', function(){
    if(rlIdx > 0) rlShow(rlIdx - 1);
  });
  var rlNext = document.getElementById('rlNext');
  if(rlNext) rlNext.addEventListener('click', function(){
    if(rlIdx < reviews.length - 1) rlShow(rlIdx + 1);
  });

  // popstate
  window.addEventListener('popstate', function(){
    if(lb && lb.classList.contains('open')) closeLb(true);
    if(rlOverlay && rlOverlay.classList.contains('open')) rlClose(true);
  });

  // ===== SCROLL REVEAL =====
  var revealObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold: 0.15});
  document.querySelectorAll('.reveal').forEach(function(el){
    revealObserver.observe(el);
  });

  // ===== ANCHOR HIGHLIGHT =====
  function highlightCard(){
    var h = location.hash;
    if(!h) return;
    var el = document.querySelector(h);
    if(el && el.classList.contains('size-card')){
      el.classList.add('is-active');
      setTimeout(function(){ el.classList.remove('is-active'); }, 2000);
    }
  }
  window.addEventListener('hashchange', highlightCard);
  window.addEventListener('load', highlightCard);

  // ===== ANCHOR LANDING TRACKING =====
  if(location.hash === '#small' || location.hash === '#medium' || location.hash === '#large'){
    var anchorSize = location.hash.replace('#','');
    if(!isTest && typeof gtag === 'function') gtag('event', 'anchor_landing_en', {size: anchorSize, send_to: 'G-QZSP3DHNW6'});
    if(!isTest && typeof fbq === 'function') fbq('trackCustom', 'AnchorLandingEN', {size: anchorSize});
  }

  // ===== SCROLL DEPTH =====
  var depthsFired = {};
  window.addEventListener('scroll', function(){
    var pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
    [25,50,75,100].forEach(function(t){
      if(pct >= t && !depthsFired[t]){
        depthsFired[t] = true;
        if(!isTest && typeof fbq === 'function') fbq('trackCustom','ScrollDepthEN',{depth:t});
        if(!isTest && typeof gtag === 'function') gtag('event', 'scroll_depth_en', {depth: t, send_to: 'G-QZSP3DHNW6'});
      }
    });
  }, {passive:true});

  // ===== UTM TRACKER =====
  (function() {
    try {
      var u = window.location.href;
      var s = new URLSearchParams(window.location.search);
      var raw = u.indexOf('%3F') !== -1 || u.indexOf('%3f') !== -1;
      if (raw && !s.get('utm_source')) {
        var m = u.match(/[%3F?&]utm_source=([^&]*)/i);
        if (m) s = new URLSearchParams(u.split(/[%3F?]/i).pop());
      }
      if (s.get('utm_source') || s.get('utm_campaign') || raw) {
        fetch('https://lealinebot-production.up.railway.app/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: u, path: window.location.pathname,
            utm_source: s.get('utm_source'), utm_medium: s.get('utm_medium'),
            utm_campaign: s.get('utm_campaign'), utm_content: s.get('utm_content'),
            utm_term: s.get('utm_term'), referrer: document.referrer
          })
        }).catch(function(){});
      }
    } catch(e) {}
  })();

})();

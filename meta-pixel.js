// Meta Pixel is loaded only after an explicit marketing-cookie choice.
(() => {
  'use strict';
  const PIXEL_ID = '1385772229937734';
  const PURCHASE_KEY = 'khadidja-meta-purchase-v1';
  let initialized = false;
  let pageViewSent = false;
  const stageEvents = new Set();
  const sentPurchases = new Set();

  function allowed() {
    return window.KBCookies?.hasConsent('marketing') === true;
  }

  function start() {
    if (!allowed() || initialized) return;
    // Meta's official browser snippet, without its noscript image: that image
    // would send a request before the visitor could give consent.
    !function(f,b,e,v,n,t,s) {
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    initialized = true;
  }

  function track(name, data, options) {
    if (!allowed()) return false;
    start();
    if (typeof window.fbq !== 'function') return false;
    if (data === undefined) window.fbq('track', name);
    else if (options === undefined) window.fbq('track', name, data);
    else window.fbq('track', name, data, options);
    return true;
  }

  function pageView() {
    if (!pageViewSent && track('PageView')) pageViewSent = true;
  }

  function basketData() {
    if (typeof cartItems !== 'function' || typeof byId !== 'function') return null;
    const items = cartItems().map(item => ({item, product:byId(item.id)})).filter(x => x.product);
    if (!items.length) return null;
    return {
      content_ids:items.map(x => x.product.id),
      content_type:'product',
      contents:items.map(x => ({id:x.product.id,quantity:x.item.quantity,item_price:x.product.price})),
      value:items.reduce((sum,x) => sum + x.product.price*x.item.quantity, 0),
      currency:'DZD',
      num_items:items.reduce((sum,x) => sum + x.item.quantity, 0)
    };
  }

  function purchaseFromConfirmation() {
    const ref = new URLSearchParams(location.search).get('ref');
    if (!ref || sentPurchases.has(ref)) return;
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(PURCHASE_KEY) || 'null'); } catch { return; }
    if (!pending || pending.ref !== ref || !Array.isArray(pending.items) || !pending.items.length ||
        !Number.isFinite(pending.total) || pending.total <= 0 || pending.currency !== 'DZD') return;
    const dedupKey = `khadidja-meta-purchase-sent:${ref}`;
    try { if (localStorage.getItem(dedupKey) === '1') return; } catch { /* In-memory guard still applies. */ }
    const data = {
      content_ids:pending.items.map(item => item.productId),
      content_type:'product',
      contents:pending.items.map(item => ({id:item.productId,quantity:item.quantity,item_price:item.unitPrice})),
      value:pending.total,
      currency:pending.currency,
      num_items:pending.items.reduce((sum,item) => sum + item.quantity, 0)
    };
    if (track('Purchase', data, {eventID:`khadidja-${ref}`})) {
      sentPurchases.add(ref);
      try { localStorage.setItem(dedupKey, '1'); sessionStorage.removeItem(PURCHASE_KEY); } catch { /* Storage may be blocked. */ }
    }
  }

  function stage() {
    if (!allowed()) return;
    pageView();
    const page = document.body.dataset.page;
    if (page === 'product') {
      const id = document.body.dataset.productId || new URLSearchParams(location.search).get('id');
      const product = typeof byId === 'function' ? byId(id) : null;
      if (product && product.active !== false && !stageEvents.has(`ViewContent:${id}`)) {
        if (track('ViewContent', {content_ids:[id],content_type:'product',contents:[{id,quantity:1,item_price:product.price}],value:product.price,currency:'DZD'})) stageEvents.add(`ViewContent:${id}`);
      }
    } else if (page === 'checkout' && !stageEvents.has('InitiateCheckout')) {
      const data = basketData();
      if (data && track('InitiateCheckout', data)) stageEvents.add('InitiateCheckout');
    } else if (page === 'thanks') purchaseFromConfirmation();
  }

  window.addEventListener('kb:consentchange', event => {
    if (event.detail?.marketing) {
      if (initialized && typeof window.fbq === 'function') window.fbq('consent', 'grant');
      stage();
    }
    else {
      if (initialized && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
      try { sessionStorage.removeItem(PURCHASE_KEY); } catch { /* No optional data to clear. */ }
    }
  });
  window.addEventListener('kb:render', stage);
  window.addEventListener('kb:added-to-cart', event => {
    const item = event.detail;
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1) return;
    track('AddToCart', {
      content_ids:[item.productId],content_type:'product',
      contents:[{id:item.productId,quantity:item.quantity,item_price:item.unitPrice}],
      value:item.quantity*item.unitPrice,currency:'DZD'
    });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stage, {once:true});
  else stage();
})();

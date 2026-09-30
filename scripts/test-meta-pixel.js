const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('meta-pixel.js', 'utf8');
const product = {id:'robe-test',price:23900,active:true};

function scenario(page, {consent=false,search='',items=[]} = {}) {
  const handlers = new Map(), inserted = [], storage = new Map(), session = new Map();
  const window = {
    KBCookies:{hasConsent:category => category === 'marketing' && consent},
    addEventListener(name, listener) { (handlers.get(name) || handlers.set(name, []).get(name)).push(listener); },
    dispatchEvent(event) { for (const listener of handlers.get(event.type) || []) listener(event); }
  };
  const document = {
    readyState:'complete',body:{dataset:{page}},
    createElement:() => ({}),
    getElementsByTagName:() => [{parentNode:{insertBefore:node => inserted.push(node)}}]
  };
  const localStorage = {getItem:key => storage.get(key) ?? null,setItem:(key,value) => storage.set(key,value)};
  const sessionStorage = {getItem:key => session.get(key) ?? null,setItem:(key,value) => session.set(key,value),removeItem:key => session.delete(key)};
  const context = vm.createContext({window,document,location:{search},URLSearchParams,localStorage,sessionStorage,
    cartItems:() => items,byId:id => id === product.id ? product : null,console});
  vm.runInContext(source, context);
  return {
    window,inserted,storage,session,
    setConsent(value) { consent=value; window.dispatchEvent({type:'kb:consentchange',detail:{marketing:value}}); },
    render() { window.dispatchEvent({type:'kb:render'}); },
    calls:() => window.fbq?.queue || []
  };
}

const declined = scenario('home');
declined.render();
assert.equal(declined.inserted.length, 0, 'No request to Meta before consent');
declined.setConsent(true);
assert.equal(declined.inserted[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
assert.equal(declined.calls().filter(x => x[1] === 'PageView').length, 1);
declined.render();
assert.equal(declined.calls().filter(x => x[1] === 'PageView').length, 1, 'PageView is not repeated after rerender');
declined.setConsent(false);
assert.equal(declined.calls().at(-1)[0], 'consent');
assert.equal(declined.calls().at(-1)[1], 'revoke');

const detail = scenario('product', {search:'?id=robe-test',consent:true});
detail.render();
assert.equal(detail.calls().filter(x => x[1] === 'ViewContent').length, 1);
assert.equal(detail.calls().find(x => x[1] === 'ViewContent')[2].value, 23900);
detail.window.dispatchEvent({type:'kb:added-to-cart',detail:{productId:'robe-test',quantity:2,unitPrice:23900}});
assert.equal(detail.calls().find(x => x[1] === 'AddToCart')[2].value, 47800);

const checkout = scenario('checkout', {consent:true,items:[{id:'robe-test',quantity:2,size:'46'}]});
checkout.render();
assert.equal(checkout.calls().filter(x => x[1] === 'InitiateCheckout').length, 1);
assert.equal(checkout.calls().find(x => x[1] === 'InitiateCheckout')[2].value, 47800);

const thanks = scenario('thanks', {consent:true,search:'?ref=order-123'});
thanks.session.set('khadidja-meta-purchase-v1', JSON.stringify({ref:'order-123',items:[{productId:'robe-test',quantity:2,unitPrice:23900}],total:48450,currency:'DZD'}));
thanks.render();
const purchases = thanks.calls().filter(x => x[1] === 'Purchase');
assert.equal(purchases.length, 1);
assert.equal(purchases[0][2].value, 48450, 'Purchase includes delivery in saved order total');
assert.equal(purchases[0][2].currency, 'DZD');
assert.equal(purchases[0][3].eventID, 'khadidja-order-123');
thanks.render();
assert.equal(thanks.calls().filter(x => x[1] === 'Purchase').length, 1, 'No duplicate Purchase');

const forged = scenario('thanks', {consent:true,search:'?ref=made-up'});
forged.render();
assert.equal(forged.calls().filter(x => x[1] === 'Purchase').length, 0, 'A direct thank-you URL is not a purchase');

console.log('Meta Pixel event and consent tests passed');

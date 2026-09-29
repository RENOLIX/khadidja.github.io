// Firebase's web configuration is public. Access is controlled by Firestore rules.
window.KB_CATALOG_READY = false;
const KB_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDyyCv7wtrUxEH5W-DIUI4Hf_xdKPkIzoU',
  authDomain: 'khadidja-boutique.firebaseapp.com',
  projectId: 'khadidja-boutique',
  storageBucket: 'khadidja-boutique.firebasestorage.app',
  messagingSenderId: '511031347289',
  appId: '1:511031347289:web:2e75539ad2671259ccc948'
};
firebase.initializeApp(KB_FIREBASE_CONFIG);
const KB_DB = firebase.firestore();
const KB_AUTH = firebase.auth();
window.KB_FIREBASE_CONFIG = KB_FIREBASE_CONFIG;
window.KB = {db: KB_DB, auth: KB_AUTH, serverTime: () => firebase.firestore.FieldValue.serverTimestamp()};

// Public geography only; shipment requests still require Firebase admin authentication.
KB.yalidine = (() => {
  const url = 'https://script.google.com/macros/s/AKfycbyRVMZuK2GzQjsklwFXGYJnMfuU-GfqTrg3VBY98T-yhUbkUfyDw9MYT83b4WO46tSU/exec';
  const reads = new Map();
  function request(mode, values = {}, post = false) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const frame = document.createElement('iframe');
      frame.hidden = true; frame.name = 'yalidine-' + requestId;
      let form, done = false;
      const finish = (error, result) => {
        if (done) return; done = true;
        clearTimeout(timer); window.removeEventListener('message', receive);
        frame.remove(); form?.remove();
        error ? reject(error) : resolve(result);
      };
      function receive(event) {
        const trusted = event.origin === 'https://script.google.com' || /^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(event.origin);
        if (!trusted || event.data?.requestId !== requestId || event.data?.type !== 'yalidine-' + mode) return;
        finish(event.data.ok ? null : new Error(event.data.error || 'Réponse Yalidine invalide.'), event.data);
      }
      const timer = setTimeout(() => finish(new Error(post ? 'La confirmation tarde à arriver. Consultez cette commande avant de relancer un envoi.' : 'Chargement Yalidine indisponible. Réessayez.')), 25000);
      window.addEventListener('message', receive);
      const fields = {...values, mode, origin: location.origin, requestId};
      document.body.append(frame);
      if (post) {
        form = document.createElement('form'); form.method = 'POST'; form.action = url; form.target = frame.name; form.hidden = true;
        for (const [name, value] of Object.entries(fields)) { const input = document.createElement('input'); input.name = name; input.value = value; form.append(input); }
        document.body.append(form); form.submit();
      } else frame.src = url + '?' + new URLSearchParams(fields);
    });
  }
  function read(mode, values = {}) {
    const key = mode + JSON.stringify(values);
    if (!reads.has(key)) reads.set(key, request(mode, values).catch(error => { reads.delete(key); throw error; }));
    return reads.get(key);
  }
  function localCommunes(wilaya) {
    const id = Number(wilaya);
    const list = window.KB_COMMUNES?.[id];
    if (!Number.isInteger(id) || id < 1 || id > 58 || !Array.isArray(list)) throw new Error('Liste des communes indisponible. Actualisez la page.');
    return list;
  }
  return {request, localCommunes, communes: async wilaya => localCommunes(wilaya), fees: wilaya => request('fees', {wilaya}).then(r => r.fees), centers: () => read('centers').then(r => r.centers)};
})();

async function loadKhadidjaCatalog() {
  try {
    const state = await KB_DB.collection('settings').doc('catalog').get();
    if (!state.exists || !state.data().ready) {
      PRODUCTS.splice(0, PRODUCTS.length);
      return;
    }
    const docs = await KB_DB.collection('products').get();
    const list = docs.docs.map(doc => {
      const data = doc.data();
      const product = {
        id: doc.id,
        name: String(data.name || ''),
        short: String(data.short || data.name || ''),
        description: String(data.description || ''),
        details: String(data.details || ''),
        color: String(data.color || ''),
        swatch: /^#[0-9a-f]{6}$/i.test(data.swatch || '') ? data.swatch : '#d8d8d8',
        sizes: Array.isArray(data.sizes) ? data.sizes.map(String) : [],
        price: Number(data.price || 0),
        category: window.KB_CATEGORY(data.category).id,
        stock: window.KB_STOCK(data),
        images: [String(data.cover || '/assets/robe-nude-face.jpg')],
        url: data.url && data.url.startsWith('/produit/') ? data.url : `/produit/?id=${encodeURIComponent(doc.id)}`,
        active: data.active !== false,
        _source: null
      };
      product._source = {name:product.name,short:product.short,description:product.description,details:product.details,color:product.color};
      return product;
    });
    PRODUCTS.splice(0, PRODUCTS.length, ...list);
    window.KB_CATALOG_READY = true;
    render();
    const productId = document.body.dataset.productId || new URLSearchParams(location.search).get('id');
    if (document.body.dataset.page === 'product' && productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product) {
        const images = await KB_DB.collection('productImages').where('productId','==',productId).get();
        const gallery = images.docs.map(doc => doc.data()).sort((a,b) => a.position - b.position).map(x => x.data);
        if (gallery.length) { product.images = gallery; render(); }
      }
    }
  } catch (error) {
    console.error('Catalogue Firebase indisponible', error);
    if (typeof PRODUCTS !== 'undefined') PRODUCTS.splice(0, PRODUCTS.length);
    window.KB_CATALOG_ERROR = true;
  } finally {
    window.KB_CATALOG_READY = true;
    if (typeof render === 'function') render();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PRODUCTS !== 'undefined') loadKhadidjaCatalog();
});

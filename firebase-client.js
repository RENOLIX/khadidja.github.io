// Firebase's web configuration is public. Access is controlled by Firestore rules.
const KB_CATALOG_CACHE_KEY = 'khadidja-catalog-cache-v1';
window.KB_CATALOG_READY = true;
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

try {
  const cached = JSON.parse(localStorage.getItem(KB_CATALOG_CACHE_KEY) || 'null');
  if (Array.isArray(cached) && cached.length && typeof PRODUCTS !== 'undefined') {
    PRODUCTS.splice(0, PRODUCTS.length, ...cached);
  }
} catch (_) {}

async function loadKhadidjaCatalog() {
  try {
    const state = await KB_DB.collection('settings').doc('catalog').get();
    if (!state.exists || !state.data().ready) return;
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
        images: [String(data.cover || '/assets/robe-nude-face.jpg')],
        url: data.url && data.url.startsWith('/produit/') ? data.url : `/produit/?id=${encodeURIComponent(doc.id)}`,
        active: data.active !== false,
        _source: null
      };
      product._source = {name:product.name,short:product.short,description:product.description,details:product.details,color:product.color};
      return product;
    });
    PRODUCTS.splice(0, PRODUCTS.length, ...list);
    localStorage.setItem(KB_CATALOG_CACHE_KEY, JSON.stringify(list));
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
    window.KB_CATALOG_ERROR = true;
  } finally {
    window.KB_CATALOG_READY = true;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PRODUCTS !== 'undefined') loadKhadidjaCatalog();
});

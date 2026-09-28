// Khadidja Boutique — Yalidine relay for Firebase Spark (no Cloud Functions).
// Set YALIDINE_API_ID and YALIDINE_API_TOKEN in Script Properties before deployment.
const PROJECT_ID = 'khadidja-boutique';
const FIREBASE_API_KEY = 'AIzaSyDyyCv7wtrUxEH5W-DIUI4Hf_xdKPkIzoU';
const ALLOWED_ORIGINS = ['https://khadidja.shop', 'https://www.khadidja.shop', 'https://renolix.github.io'];

function doPost(e) {
  const origin = String(e.parameter.origin || '');
  const targetOrigin = ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0];
  let result;
  try {
    if (ALLOWED_ORIGINS.indexOf(origin) < 0) throw new Error('Origine non autorisée.');
    result = createShipment_(e.parameter);
  } catch (error) {
    result = {ok: false, error: String(error.message || error)};
  }
  const payload = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = '<!doctype html><meta charset="utf-8"><script>parent.postMessage(' + payload + ',' + JSON.stringify(targetOrigin) + ');</script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createShipment_(input) {
  const token = String(input.idToken || '');
  const orderId = String(input.orderId || '');
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(orderId)) throw new Error('Référence de commande invalide.');
  if (!token || token.length > 5000) throw new Error('Session administrateur manquante.');
  const user = fetchJson_('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({idToken: token})
  });
  const uid = user.users && user.users[0] && user.users[0].localId;
  if (!uid) throw new Error('Session Firebase invalide.');
  const staff = firestoreDoc_('staff/' + encodeURIComponent(uid), token);
  if (!staff || staff.role !== 'admin') throw new Error('Accès administrateur requis.');
  const order = firestoreDoc_('orders/' + encodeURIComponent(orderId), token);
  if (!order) throw new Error('Commande introuvable.');
  if (order.currency !== 'DZD' || order.payment !== 'livraison') throw new Error('Cette commande ne peut pas être expédiée en paiement à la livraison.');
  if (!['nouvelle', 'injoignable'].includes(order.status)) throw new Error('Statut incompatible avec un nouvel envoi.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'yalidine_order_' + orderId;
    const previous = props.getProperty(key);
    if (previous) {
      const saved = JSON.parse(previous);
      if (saved.tracking) return {ok: true, alreadySent: true, tracking: saved.tracking, orderId: orderId};
      throw new Error('Envoi en attente de vérification. Contrôlez la commande dans Yalidine avant de réessayer.');
    }
    const apiId = props.getProperty('YALIDINE_API_ID');
    const apiToken = props.getProperty('YALIDINE_API_TOKEN');
    if (!apiId || !apiToken) throw new Error('Identifiants Yalidine non configurés dans Apps Script.');
    const customer = order.customer || {}, delivery = order.delivery || {};
    const names = String(customer.name || '').trim().split(/\s+/);
    const weight = Number(input.weight), height = Number(input.height), width = Number(input.width), length = Number(input.length);
    if (![weight, height, width, length].every(n => Number.isFinite(n) && n > 0)) throw new Error('Poids et dimensions du colis requis.');
    const isStopdesk = delivery.method === 'bureau';
    const stopdeskId = Number(input.stopdeskId);
    if (isStopdesk && (!Number.isInteger(stopdeskId) || stopdeskId <= 0)) throw new Error('Identifiant Yalidine du bureau requis.');
    if (!customer.phone || !delivery.wilaya || !delivery.commune || (!isStopdesk && !delivery.address)) throw new Error('Coordonnées de livraison incomplètes.');
    const parcel = {
      order_id: orderId,
      from_wilaya_name: 'Alger',
      firstname: names.shift() || 'Client',
      familyname: names.join(' ') || 'Khadidja',
      contact_phone: String(customer.phone),
      address: String(delivery.address || delivery.office || ''),
      to_commune_name: String(delivery.commune),
      to_wilaya_name: String(delivery.wilaya),
      product_list: (order.items || []).map(item => String(item.quantity || 1) + '× ' + String(item.name || 'Robe')).join(', '),
      price: Number(order.total),
      height: height, width: width, length: length, weight: weight,
      // Checkout already includes the delivery charge in order.total.
      freeshipping: true, is_stopdesk: isStopdesk, has_exchange: false,
      product_to_collect: null
    };
    if (isStopdesk) parcel.stopdesk_id = stopdeskId;
    props.setProperty(key, JSON.stringify({pending: true, createdAt: new Date().toISOString()}));
    const response = UrlFetchApp.fetch('https://api.yalidine.app/v1/parcels/', {
      method: 'post', contentType: 'application/json',
      headers: {'X-API-ID': apiId, 'X-API-TOKEN': apiToken},
      payload: JSON.stringify([parcel]), muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    const body = JSON.parse(response.getContentText() || '{}');
    if (status < 200 || status >= 300) {
      props.deleteProperty(key);
      throw new Error('Yalidine a refusé le colis (HTTP ' + status + ') : ' + JSON.stringify(body).slice(0, 350));
    }
    const item = Array.isArray(body) ? body[0] : (body[orderId] || body);
    const tracking = item && (item.tracking || item.tracking_number || item.parcel_id);
    if (!tracking || item.success === false) throw new Error('Réponse Yalidine incertaine. Contrôlez le tableau de bord Yalidine avant tout nouvel essai.');
    props.setProperty(key, JSON.stringify({tracking: String(tracking), sentAt: new Date().toISOString()}));
    return {ok: true, tracking: String(tracking), orderId: orderId};
  } finally {
    lock.releaseLock();
  }
}

function firestoreDoc_(path, token) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + path;
  const raw = fetchJson_(url, {headers: {Authorization: 'Bearer ' + token}});
  const fields = raw.fields || {};
  const result = {};
  Object.keys(fields).forEach(key => result[key] = decode_(fields[key]));
  return result;
}

function decode_(field) {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(decode_);
  if ('mapValue' in field) {
    const output = {}, fields = field.mapValue.fields || {};
    Object.keys(fields).forEach(key => output[key] = decode_(fields[key]));
    return output;
  }
  return null;
}

function fetchJson_(url, options) {
  const response = UrlFetchApp.fetch(url, Object.assign({muteHttpExceptions: true}, options || {}));
  const text = response.getContentText();
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('Vérification Firebase impossible (HTTP ' + response.getResponseCode() + ').');
  return JSON.parse(text);
}

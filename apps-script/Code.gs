// Khadidja Boutique — Yalidine relay for Firebase Spark (no Cloud Functions).
// Set YALIDINE_API_ID and YALIDINE_API_TOKEN in Script Properties before deployment.
const PROJECT_ID = 'khadidja-boutique';
const FIREBASE_API_KEY = 'AIzaSyDyyCv7wtrUxEH5W-DIUI4Hf_xdKPkIzoU';
const ALLOWED_ORIGINS = ['https://khadidja.shop', 'https://www.khadidja.shop', 'https://renolix.github.io'];

function doGet(e) {
  const origin = String(e.parameter.origin || '');
  let result;
  try {
    if (ALLOWED_ORIGINS.indexOf(origin) < 0) throw new Error('Demande non autorisée.');
    if (e.parameter.mode === 'centers') result = {type: 'yalidine-centers', ok: true, centers: listCenters_()};
    else if (e.parameter.mode === 'communes') result = {type: 'yalidine-communes', ok: true, communes: listCommunes_(e.parameter.wilaya)};
    else throw new Error('Mode inconnu.');
  } catch (error) {
    result = {type: 'yalidine-' + e.parameter.mode, ok: false, error: String(error.message || error)};
  }
  result.requestId = e.parameter.requestId || '';
  return messagePage_(result, origin);
}

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
  result.type = 'yalidine-shipment';
  result.requestId = e.parameter.requestId || '';
  return messagePage_(result, targetOrigin);
}

function messagePage_(result, origin) {
  const payload = JSON.stringify(result).replace(/</g, '\\u003c');
  const target = ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0];
  const html = '<!doctype html><meta charset="utf-8"><script>var p=' + payload + ';var t=' + JSON.stringify(target) + ';try{window.top.postMessage(p,t)}catch(e){}try{parent.postMessage(p,t)}catch(e){}</script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function listCenters_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('yalidine_centers_v1');
  if (cached) return JSON.parse(cached);
  const props = PropertiesService.getScriptProperties();
  const headers = {'X-API-ID': props.getProperty('YALIDINE_API_ID'), 'X-API-TOKEN': props.getProperty('YALIDINE_API_TOKEN')};
  if (!headers['X-API-ID'] || !headers['X-API-TOKEN']) throw new Error('Accès Yalidine non configuré.');
  const centers = [];
  for (let page = 1; page <= 10; page++) {
    const response = UrlFetchApp.fetch('https://api.yalidine.app/v1/centers?page=' + page, {headers: headers, muteHttpExceptions: true});
    if (response.getResponseCode() !== 200) throw new Error('Liste des bureaux Yalidine indisponible.');
    const body = JSON.parse(response.getContentText());
    if (!Array.isArray(body.data)) throw new Error('Liste des bureaux Yalidine invalide.');
    body.data.forEach(center => centers.push({id: Number(center.center_id), name: String(center.name || ''), communeId: Number(center.commune_id), commune: String(center.commune_name || ''), wilayaId: Number(center.wilaya_id), address: String(center.address || '')}));
    if (!body.has_more) break;
  }
  if (!centers.length) throw new Error('Aucun bureau Yalidine disponible.');
  cache.put('yalidine_centers_v1', JSON.stringify(centers), 21600);
  return centers;
}

function resolveCenter_(delivery) {
  const saved = Number(delivery.stopdeskId);
  const centers = listCenters_().filter(center => center.wilayaId === Number(delivery.wilayaCode));
  const center = centers.find(item => item.id === saved);
  if (Number.isInteger(saved) && center) return center;
  throw new Error('Choisissez une ville et un bureau Yalidine pour cette commande.');
}

function listCommunes_(wilaya) {
  const id = Number(wilaya);
  if (!Number.isInteger(id) || id < 1 || id > 58) throw new Error('Wilaya invalide.');
  const cache = CacheService.getScriptCache(), key = 'communes_v2_' + id;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const props = PropertiesService.getScriptProperties();
  const headers = {'X-API-ID': props.getProperty('YALIDINE_API_ID'), 'X-API-TOKEN': props.getProperty('YALIDINE_API_TOKEN')};
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const response = UrlFetchApp.fetch('https://api.yalidine.app/v1/communes/?wilaya_id=' + id + '&page=' + page, {headers: headers, muteHttpExceptions: true});
    if (response.getResponseCode() !== 200) throw new Error('Liste des communes Yalidine indisponible.');
    const body = JSON.parse(response.getContentText());
    if (!Array.isArray(body.data)) throw new Error('Liste des communes invalide.');
    body.data.forEach(c => { if (Number(c.wilaya_id) === id && Number(c.is_deliverable) === 1) all.push({id:Number(c.id), name:String(c.name), wilaya:String(c.wilaya_name), wilayaId:id}); });
    if (!body.has_more) break;
  }
  if (!all.length) throw new Error('Aucune commune livrable pour cette wilaya.');
  cache.put(key, JSON.stringify(all), 21600);
  return all;
}

function normalizeName_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
}

function resolveCommune_(delivery, stopdesk) {
  const all = listCommunes_(delivery.wilayaCode);
  const id = Number(stopdesk ? stopdesk.communeId : delivery.communeId);
  const name = normalizeName_(stopdesk ? stopdesk.commune : delivery.commune);
  const match = all.find(c => id ? c.id === id : normalizeName_(c.name) === name);
  if (!match) throw new Error('Choisissez la commune exacte dans la liste Yalidine avant l’envoi.');
  return match;
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
  if (!lock.tryLock(1000)) throw new Error('Un envoi est déjà en cours. Patientez quelques secondes.');
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'yalidine_order_' + orderId;
    const previous = props.getProperty(key);
    if (previous && input.action !== 'validate') {
      const saved = JSON.parse(previous);
      if (saved.tracking) return {ok: true, alreadySent: true, tracking: saved.tracking, orderId: orderId};
      throw new Error('Envoi en attente de vérification. Contrôlez la commande dans Yalidine avant de réessayer.');
    }
    const apiId = props.getProperty('YALIDINE_API_ID');
    const apiToken = props.getProperty('YALIDINE_API_TOKEN');
    if (!apiId || !apiToken) throw new Error('Identifiants Yalidine non configurés dans Apps Script.');
    const customer = order.customer || {}, delivery = order.delivery || {};
    const names = String(customer.name || '').trim().split(/\s+/);
    const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    if (!itemCount) throw new Error('La commande ne contient aucun produit.');
    const isStopdesk = delivery.method === 'bureau';
    const stopdesk = isStopdesk ? resolveCenter_(delivery) : null;
    if (!customer.phone || !delivery.wilaya || !delivery.commune || (!isStopdesk && !delivery.address)) throw new Error('Coordonnées de livraison incomplètes.');
    const destination = resolveCommune_(delivery, stopdesk);
    const parcel = {
      order_id: orderId,
      from_wilaya_name: 'Alger',
      firstname: names.shift() || 'Client',
      familyname: names.join(' ') || 'Khadidja',
      contact_phone: String(customer.phone),
      address: String(isStopdesk ? stopdesk.address : delivery.address),
      to_commune_name: destination.name,
      to_wilaya_name: destination.wilaya,
      product_list: (order.items || []).map(item => String(item.quantity || 1) + '× ' + String(item.name || 'Robe')).join(', '),
      price: Number(order.total),
      height: Math.max(10, itemCount * 6), width: 30, length: 40, weight: Math.max(1, Math.ceil(itemCount * 0.8)),
      // Checkout already includes the delivery charge in order.total.
      freeshipping: true, is_stopdesk: isStopdesk, has_exchange: false,
      product_to_collect: null
    };
    if (isStopdesk) parcel.stopdesk_id = stopdesk.id;
    if (input.action === 'validate') return {ok: true, validated: true, commune: destination.name, wilaya: destination.wilaya, orderId: orderId};
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
    // Yalidine returns either an array, a keyed object, or {data:[...]}. Normalize all forms.
    const item = Array.isArray(body) ? body[0] : (Array.isArray(body.data) ? body.data[0] : (body[orderId] || body));
    const labelTracking = item && item.label && String(item.label).match(/[?&]tracking=([^&]+)/);
    const tracking = item && (item.tracking || item.tracking_number || item.parcel_id || item.data?.tracking || (labelTracking && labelTracking[1]));
    if (item && item.success === false) {
      props.deleteProperty(key);
      const detail = item && (item.message || item.error) ? String(item.message || item.error) : 'Yalidine n’a pas fourni de numéro de suivi.';
      throw new Error(detail);
    }
    if (!tracking) throw new Error('Résultat non confirmé par Yalidine. Vérifiez cette expédition avant un nouvel envoi.');
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

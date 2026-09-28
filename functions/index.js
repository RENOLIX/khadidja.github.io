const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret, defineString} = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const YALIDINE_API_ID = defineSecret('YALIDINE_API_ID');
const YALIDINE_API_TOKEN = defineSecret('YALIDINE_API_TOKEN');
const YALIDINE_FROM_WILAYA = defineString('YALIDINE_FROM_WILAYA', {default: 'Alger'});

exports.createYalidineShipment = onRequest({region: 'europe-west1', cors: true, secrets: [YALIDINE_API_ID, YALIDINE_API_TOKEN]}, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Méthode non autorisée.'});
  try {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({error: 'Connexion administrateur requise.'});
    const decoded = await admin.auth().verifyIdToken(auth.slice(7));
    const staff = await db.doc(`staff/${decoded.uid}`).get();
    if (!staff.exists || staff.data().role !== 'admin') return res.status(403).json({error: 'Droits administrateur requis.'});
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) return res.status(400).json({error: 'Commande manquante.'});
    const ref = db.doc(`orders/${orderId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({error: 'Commande introuvable.'});
    const order = snap.data();
    if (order.yalidine?.tracking) return res.status(409).json({error: 'Cette commande possède déjà un numéro Yalidine.', tracking: order.yalidine.tracking});
    const customer = order.customer || {}, delivery = order.delivery || {};
    const names = String(customer.name || 'Client').trim().split(/\s+/);
    const payload = {
      order_id: orderId,
      from_wilaya_name: YALIDINE_FROM_WILAYA.value(),
      firstname: names.shift() || 'Client',
      familyname: names.join(' ') || 'Khadidja',
      contact_phone: customer.phone || '',
      address: delivery.address || delivery.office || '',
      to_commune_name: delivery.commune || '',
      to_wilaya_name: delivery.wilaya || '',
      product_list: (order.items || []).map(item => `${item.quantity}x ${item.name}`).join(', '),
      price: Number(order.total || 0),
      freeshipping: false,
      is_stopdesk: delivery.method === 'bureau',
      has_exchange: false,
      product_to_collect: ''
    };
    const response = await fetch('https://api.yalidine.app/v1/parcels/', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-API-ID': YALIDINE_API_ID.value(), 'X-API-TOKEN': YALIDINE_API_TOKEN.value()}, body: JSON.stringify(payload)});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({error: result.message || 'Yalidine a refusé la commande.', details: result});
    const tracking = result.tracking || result.tracking_number || result.parcel_id || result.id || '';
    await ref.update({status: 'expediee', yalidine: {tracking: String(tracking), response: result, sentAt: admin.firestore.FieldValue.serverTimestamp()}, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    return res.json({ok: true, tracking: String(tracking), result});
  } catch (error) {
    console.error('Yalidine shipment error', error);
    return res.status(500).json({error: 'Impossible de créer l’envoi Yalidine.'});
  }
});

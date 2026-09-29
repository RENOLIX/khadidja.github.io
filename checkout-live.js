// The DZD checkout stores orders directly in Firestore.
const checkoutBeforeFirebase = checkoutPage;
checkoutPage = function () {
  let html = checkoutBeforeFirebase();
  if (currentCurrency() !== 'DZD') return html;
  html = html.replace('<label>E-mail <input name="email" type="email" autocomplete="email" maxlength="120" dir="ltr"></label>', '');
  html = html.replace('Votre demande s’ouvrira dans votre messagerie pour être envoyée à la boutique.', 'Votre commande sera enregistrée et visible par notre équipe.');
  html = html.replace('PRÉPARER LA COMMANDE', 'CONFIRMER LA COMMANDE');
  if (typeof legalCheckoutNotice === 'function') html = html.replace('<button class="button button-dark checkout-submit"', legalCheckoutNotice() + '<button class="button button-dark checkout-submit"');
  html = html.replace('<input name="commune" autocomplete="address-level2" required maxlength="80">', '<select name="commune" id="checkout-commune" required disabled><option value="">Choisir une wilaya d’abord</option></select><small id="commune-feedback" aria-live="polite"></small><button type="button" id="retry-communes" hidden>Réessayer</button>');
  return html;
};

setupCheckout = function () {
  const form = document.querySelector('#checkout-form');
  if (!form || currentCurrency() !== 'DZD') return;
  const wilaya = form.querySelector('#wilaya');
  const home = form.querySelector('[value="home"]');
  const desk = form.querySelector('[value="desk"]');
  const result = document.querySelector('#checkout-result');
  const commune = form.elements.commune;
  const communeFeedback = form.querySelector('#commune-feedback');
  const retryCommunes = form.querySelector('#retry-communes');
  const submitButton = form.querySelector('.checkout-submit');
  let communeList = [], communeGeneration = 0, deliveryFees = null, loadingDelivery = false, submitting = false;
  function selectedFee() {
    return deliveryFees?.communes.find(c => c.id === Number(commune.value));
  }
  async function updateCommunes() {
    const generation = ++communeGeneration;
    const previousCommune = commune.value;
    communeList = []; deliveryFees = null; commune.disabled = true; retryCommunes.hidden = true;
    loadingDelivery = false;
    commune.replaceChildren(new Option(tr('Choisir une wilaya d’abord'), ''));
    communeFeedback.textContent = '';
    update();
    if (wilaya.value === '') return;
    try {
      const wilayaId = Number(wilaya.value) + 1;
      const list = KB.yalidine.localCommunes(wilayaId);
      communeList = list;
      commune.replaceChildren(new Option(tr(list.length ? 'Choisir une commune' : 'Aucune commune livrable dans cette wilaya.'), ''));
      list.forEach(c => commune.add(new Option(c.name, String(c.id))));
      if (!list.length) { update(); return; }
      commune.disabled = false;
      if (list.some(c => String(c.id) === previousCommune)) commune.value = previousCommune;
      loadingDelivery = true;
      update();
      const fees = await KB.yalidine.fees(wilayaId);
      if (generation !== communeGeneration || !form.isConnected) return;
      if (fees?.wilaya !== wilayaId || fees?.source !== 'yalidine' || !Array.isArray(fees.communes)) throw new Error('Tarifs invalides.');
      deliveryFees = fees;
    } catch (error) {
      if (generation !== communeGeneration || !form.isConnected) return;
      communeFeedback.textContent = tr('Tarifs indisponibles. Réessayez.'); retryCommunes.hidden = false;
    } finally {
      if (generation === communeGeneration && form.isConnected) { loadingDelivery = false; update(); }
    }
  }
  wilaya.addEventListener('change', updateCommunes);
  retryCommunes.addEventListener('click', updateCommunes);
  updateCommunes();
  function update() {
    const selected = selectedFee();
    const available = fee => Number.isInteger(fee) && fee >= 0;
    home.disabled = !available(selected?.home);
    desk.disabled = !available(selected?.desk);
    if (desk.disabled && !home.disabled) home.checked = true;
    if (home.disabled && !desk.disabled) desk.checked = true;
    document.querySelector('#home-price').textContent = selected ? (available(selected.home) ? money(selected.home) : tr('Indisponible')) : '—';
    document.querySelector('#desk-price').textContent = selected ? (available(selected.desk) ? money(selected.desk) : tr('Indisponible')) : '—';
    document.querySelector('#home-price').dir = document.querySelector('#desk-price').dir = 'ltr';
    const isDesk = desk.checked;
    form.querySelector('#address-field').hidden = isDesk;
    form.elements.address.required = !isDesk;
    form.querySelector('#office-field').hidden = !isDesk;
    const fee = isDesk ? selected?.desk : selected?.home;
    const pending = loadingDelivery ? tr('Chargement des tarifs…') : tr(wilaya.value === '' ? 'Choisir une wilaya' : 'Choisir une commune');
    document.querySelector('#shipping-total').textContent = available(fee) ? money(fee) : (selected ? tr('Indisponible') : pending);
    document.querySelector('#shipping-total').dir = 'ltr';
    document.querySelector('#grand-total').textContent = available(fee) ? money(cartTotal() + fee) : '—';
    submitButton.disabled = submitting || loadingDelivery || !available(fee);
    if (selected && !available(selected.home) && !available(selected.desk)) communeFeedback.textContent = tr('Livraison indisponible pour cette commune.');
    else if (deliveryFees) communeFeedback.textContent = '';
  }
  [wilaya, commune, home, desk].forEach(element => element.addEventListener('change', update));
  update();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const phone = form.elements.phone.value.trim();
    if (!/^(?:0[567]\d{8}|\+213[567]\d{8})$/.test(phone)) {
      form.elements.phone.setCustomValidity('Numéro algérien invalide.');
      form.elements.phone.reportValidity();
      form.elements.phone.addEventListener('input', () => form.elements.phone.setCustomValidity(''), {once:true});
      return;
    }
    if (!form.reportValidity()) return;
    const selectedCommune = communeList.find(c => c.id === Number(commune.value) && c.wilayaId === Number(wilaya.value) + 1);
    if (!selectedCommune) { result.hidden = false; result.textContent = 'Choisissez votre commune dans la liste avant de confirmer.'; return; }
    const shippingFee = desk.checked ? selectedFee()?.desk : selectedFee()?.home;
    if (loadingDelivery || !Number.isInteger(shippingFee) || shippingFee < 0) { result.hidden = false; result.textContent = tr('Communes et tarifs indisponibles. Réessayez.'); return; }
    const button = form.querySelector('.checkout-submit');
    submitting = true;
    const fields = [...form.querySelectorAll('input,select,textarea')];
    const disabledBefore = fields.map(field => field.disabled);
    fields.forEach(field => field.disabled = true);
    button.disabled = true;
    button.textContent = 'ENREGISTREMENT…';
    result.hidden = false;
    result.textContent = '';
    try {
      if (!window.KB) throw new Error('La connexion aux commandes est indisponible. Réessayez dans un instant.');
      const credential = KB.auth.currentUser || (await KB.auth.signInAnonymously()).user;
      const isDesk = desk.checked;
      const items = cartItems().map(item => {
        const product = byId(item.id);
        if (!product) throw new Error('Un article du panier n’est plus disponible. Actualisez la page.');
        return {productId:product.id, name:product._source?.name || product.name, color:product._source?.color || product.color, size:item.size, quantity:item.quantity, unitPrice:product.price};
      });
      if (!items.length) throw new Error('Votre panier est vide.');
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const order = {
        customerUid: credential.uid,
        customer: {name:form.elements.name.value.trim(), phone},
        delivery: {wilayaCode:String(Number(wilaya.value)+1).padStart(2,'0'), wilaya:selectedCommune.wilaya, commune:selectedCommune.name, communeId:selectedCommune.id, method:isDesk?'bureau':'domicile', address:isDesk?'':form.elements.address.value.trim(), office:isDesk?form.elements.office.value.trim():''},
        notes: form.elements.notes.value.trim(),
        items, subtotal, shippingFee, total:subtotal+shippingFee,
        shippingRate: {source:'yalidine', service:'express', fromWilaya:16, toWilaya:deliveryFees.wilaya, communeId:selectedCommune.id, fetchedAt:deliveryFees.fetchedAt},
        currency:'DZD', payment:'livraison', status:'nouvelle',
        terms: {version:'2026-09-29', acceptedAt:KB.serverTime()},
        createdAt:KB.serverTime(), updatedAt:KB.serverTime()
      };
      const saved = await KB.db.collection('orders').add(order);
      saveCart([]);
      updateCount();
      location.href = link(`/merci/?ref=${encodeURIComponent(saved.id)}`);
    } catch (error) {
      console.error('Commande Firebase', error);
      submitting = false;
      fields.forEach((field, index) => field.disabled = disabledBefore[index]);
      result.innerHTML = `<strong>La commande n’a pas été enregistrée.</strong><p>${escapeHtml(error.message || 'Veuillez réessayer.')}</p>`;
      button.disabled = false;
      button.innerHTML = `CONFIRMER LA COMMANDE ${svg('arrow')}`;
      update();
    }
  });
};

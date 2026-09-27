// The DZD checkout stores orders directly in Firestore.
const checkoutBeforeFirebase = checkoutPage;
checkoutPage = function () {
  let html = checkoutBeforeFirebase();
  if (currentCurrency() !== 'DZD') return html;
  html = html.replace('<label>E-mail <input name="email" type="email" autocomplete="email" maxlength="120" dir="ltr"></label>', '');
  html = html.replace('Votre demande s’ouvrira dans votre messagerie pour être envoyée à la boutique.', 'Votre commande sera enregistrée et visible par notre équipe.');
  html = html.replace('PRÉPARER LA COMMANDE', 'CONFIRMER LA COMMANDE');
  return html;
};

setupCheckout = function () {
  const form = document.querySelector('#checkout-form');
  if (!form || currentCurrency() !== 'DZD') return;
  const wilaya = form.querySelector('#wilaya');
  const home = form.querySelector('[value="home"]');
  const desk = form.querySelector('[value="desk"]');
  const result = document.querySelector('#checkout-result');
  function update() {
    const selected = wilaya.value === '' ? null : SHIPPING_WILAYAS[Number(wilaya.value)];
    desk.disabled = !!selected && selected.desk === 0;
    if (desk.disabled && desk.checked) home.checked = true;
    document.querySelector('#home-price').textContent = selected ? `${selected.home} DA` : '—';
    document.querySelector('#desk-price').textContent = selected ? (selected.desk ? `${selected.desk} DA` : 'Indisponible') : '—';
    const isDesk = desk.checked;
    form.querySelector('#address-field').hidden = isDesk;
    form.elements.address.required = !isDesk;
    form.querySelector('#office-field').hidden = !isDesk;
    document.querySelector('#shipping-total').textContent = selected ? `${isDesk ? selected.desk : selected.home} DA` : 'Choisir une wilaya';
    document.querySelector('#grand-total').textContent = selected ? money(cartTotal() + (isDesk ? selected.desk : selected.home)) : '—';
  }
  [wilaya, home, desk].forEach(element => element.addEventListener('change', update));
  update();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const phone = form.elements.phone.value.trim();
    if (!/^(?:0[567]\d{8}|\+213[567]\d{8})$/.test(phone)) {
      form.elements.phone.setCustomValidity('Numéro algérien invalide.');
      form.elements.phone.reportValidity();
      form.elements.phone.addEventListener('input', () => form.elements.phone.setCustomValidity(''), {once:true});
      return;
    }
    if (!form.reportValidity()) return;
    const button = form.querySelector('.checkout-submit');
    button.disabled = true;
    button.textContent = 'ENREGISTREMENT…';
    result.hidden = false;
    result.textContent = '';
    try {
      if (!window.KB) throw new Error('La connexion aux commandes est indisponible. Réessayez dans un instant.');
      const credential = KB.auth.currentUser || (await KB.auth.signInAnonymously()).user;
      const selected = SHIPPING_WILAYAS[Number(wilaya.value)];
      const isDesk = desk.checked;
      const shippingFee = isDesk ? selected.desk : selected.home;
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
        delivery: {wilayaCode:String(Number(wilaya.value)+1).padStart(2,'0'), wilaya:selected.name, commune:form.elements.commune.value.trim(), method:isDesk?'bureau':'domicile', address:isDesk?'':form.elements.address.value.trim(), office:isDesk?form.elements.office.value.trim():''},
        notes: form.elements.notes.value.trim(),
        items, subtotal, shippingFee, total:subtotal+shippingFee,
        currency:'DZD', payment:'livraison', status:'nouvelle',
        createdAt:KB.serverTime(), updatedAt:KB.serverTime()
      };
      const saved = await KB.db.collection('orders').add(order);
      saveCart([]);
      updateCount();
      form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = true);
      result.innerHTML = `<strong>Commande enregistrée</strong><p>Référence : ${escapeHtml(saved.id)}. Notre équipe vous contactera au numéro indiqué.</p><a class="button button-outline" href="${link('/robes-de-soiree/')}">CONTINUER MES ACHATS</a>`;
      result.scrollIntoView({behavior:'smooth',block:'center'});
    } catch (error) {
      console.error('Commande Firebase', error);
      result.innerHTML = `<strong>La commande n’a pas été enregistrée.</strong><p>${escapeHtml(error.message || 'Veuillez réessayer.')}</p>`;
      button.disabled = false;
      button.innerHTML = `CONFIRMER LA COMMANDE ${svg('arrow')}`;
    }
  });
};

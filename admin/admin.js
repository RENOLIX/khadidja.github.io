const root = document.querySelector('#admin-root');
const SITE_BASE = location.hostname.endsWith('github.io') ? '/khadidja.github.io' : '';
const sizesAvailable = Array.from({length:13}, (_,i) => String(34+i*2));
const statuses = {nouvelle:'Nouvelle', expediee:'Expédiée', livree:'Livrée', annulee:'Annulée', injoignable:'Injoignable'};
const state = {user:null, role:null, tab:'dashboard', products:[], orders:[], staff:[], editor:null, editorImages:[], stopOrders:null, busy:false};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const image = value => /^(data:image\/(webp|png|jpeg);base64,|\/assets\/)/.test(value || '') ? (value.startsWith('/') ? SITE_BASE+value : value) : '';
const money = value => new Intl.NumberFormat('fr-DZ').format(Number(value || 0))+' DA';
const when = value => value?.toDate ? value.toDate().toLocaleString('fr-DZ') : '—';
const icon = (name) => ({arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',bag:'<path d="M4 8h16l-1 13H5L4 8Z"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',plus:'<path d="M12 5v14M5 12h14"/>'}[name] || '');
function mark(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:17px;height:17px">${icon(name)}</svg>`}
function brand(){return `<a class="admin-brand" href="${SITE_BASE}/"><img src="${SITE_BASE}/assets/logo-black.png" alt=""><span><strong>KHADIDJA</strong><em>BOUTIQUE</em></span></a>`}
function notice(message, error=false){const el=document.querySelector('#admin-feedback');if(!el)return;el.textContent=message;el.className='feedback'+(error?' error':'');el.hidden=false}

function renderLogin(message='') {
  root.innerHTML=`<div class="login-wrap"><div class="login-card">${brand()}<span class="eyebrow">ESPACE PRIVÉ</span><h1>Administration</h1><p>Connectez-vous avec le compte administrateur ou employé de la boutique.</p><form id="login-form"><label class="field">E-mail<input type="email" name="email" autocomplete="username" required></label><label class="field">Mot de passe<input type="password" name="password" autocomplete="current-password" required></label><button class="primary" type="submit">SE CONNECTER</button></form><div id="login-feedback" class="feedback error" ${message?'':'hidden'}>${esc(message)}</div><p><a href="${SITE_BASE}/profil/">← Retour à la boutique</a></p></div></div>`;
  root.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button=event.currentTarget.querySelector('button');button.disabled=true;button.textContent='CONNEXION…';
    try { await KB.auth.signInWithEmailAndPassword(event.currentTarget.elements.email.value.trim(), event.currentTarget.elements.password.value); }
    catch(error){const el=root.querySelector('#login-feedback');el.hidden=false;el.textContent='Connexion impossible. Vérifiez l’e-mail et le mot de passe.';button.disabled=false;button.textContent='SE CONNECTER';console.error(error)}
  });
}

function shell() {
  const tabs=[['dashboard','Vue d’ensemble'],['orders','Commandes'],['products','Produits'],['profile','Profil & équipe']];
  root.innerHTML=`<header class="admin-header"><div class="admin-top">${brand()}<div class="admin-account"><span>${esc(state.user.email)} · ${state.role==='admin'?'Administrateur':'Employé'}</span><button id="logout">Déconnexion</button></div></div><nav class="admin-nav" aria-label="Administration">${tabs.map(([id,label])=>`<button type="button" data-tab="${id}" class="${state.tab===id?'active':''}">${label}</button>`).join('')}</nav></header><main class="admin-main" id="admin-main"></main>`;
  root.querySelector('#logout').addEventListener('click',()=>KB.auth.signOut());
  root.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{state.tab=button.dataset.tab;state.editor=null;renderTab()}));
  renderTab();
}
function renderTab() {
  root.querySelectorAll('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===state.tab));
  const main=root.querySelector('#admin-main');
  if(state.tab==='dashboard') main.innerHTML=dashboardView();
  if(state.tab==='orders') main.innerHTML=ordersView();
  if(state.tab==='products') main.innerHTML=productsView();
  if(state.tab==='profile') main.innerHTML=profileView();
  bindTab();
}
function title(kicker, heading, side='') {return `<div class="admin-title"><div><small>${kicker}</small><h1>${heading}</h1></div>${side}</div><div id="admin-feedback" class="feedback" hidden></div>`}
function dashboardView(){
  const count=status=>state.orders.filter(order=>order.status===status).length;
  return `${title('KHADIDJA BOUTIQUE','Vue d’ensemble')}<div class="panel-grid"><div class="metric"><span>Nouvelles commandes</span><strong>${count('nouvelle')}</strong></div><div class="metric"><span>À expédier</span><strong>${count('nouvelle')+count('injoignable')}</strong></div><div class="metric"><span>Expédiées</span><strong>${count('expediee')}</strong></div><div class="metric"><span>Produits en ligne</span><strong>${state.products.filter(p=>p.active!==false).length}</strong></div></div><div class="card" style="margin-top:20px"><h2>Dernières commandes</h2>${state.orders.slice(0,5).map(order=>`<p><a href="#" data-order-open="${esc(order.id)}">${esc(order.customer?.name)} · ${money(order.total)}</a> <span class="status ${order.status}">${statuses[order.status]||order.status}</span></p>`).join('')||'<p>Aucune commande pour le moment.</p>'}</div>`;
}
function ordersView(){
  return `${title('SUIVI DES ACHATS','Commandes',`<button class="ghost" id="refresh-orders">Actualiser</button>`)}<div class="toolbar" style="margin-bottom:20px"><select id="order-filter" aria-label="Filtrer par statut"><option value="all">Tous les statuts</option>${Object.entries(statuses).map(([key,value])=>`<option value="${key}">${value}</option>`).join('')}</select><input id="order-search" type="search" placeholder="Nom, téléphone, wilaya…" aria-label="Rechercher une commande"></div><div id="orders-list">${orderCards(state.orders)}</div>`;
}
function orderCards(orders){return orders.length?orders.map(order=>{
  const delivery=order.delivery||{},customer=order.customer||{};
  return `<article class="order-card" data-status="${esc(order.status)}" data-search="${esc(`${customer.name} ${customer.phone} ${delivery.wilaya}`.toLowerCase())}"><div class="order-head"><div><span class="order-meta">${esc(when(order.createdAt))} · #${esc(order.id.slice(0,8))}</span><h3>${esc(customer.name)}</h3><a href="tel:${esc(customer.phone)}">${esc(customer.phone)}</a></div><span class="status ${esc(order.status)}">${statuses[order.status]||esc(order.status)}</span></div><div class="order-columns"><div><strong>Articles</strong><div class="order-lines">${(order.items||[]).map(item=>`<div>${esc(item.quantity)} × ${esc(item.name)} · ${esc(item.color)} · Taille ${esc(item.size)} — ${money(item.unitPrice*item.quantity)}</div>`).join('')}</div><p>Sous-total : ${money(order.subtotal)}<br>Livraison : ${money(order.shippingFee)}</p></div><div><strong>Livraison ${delivery.method==='bureau'?'en bureau':'à domicile'}</strong><p>${esc(delivery.wilayaCode)} ${esc(delivery.wilaya)} · ${esc(delivery.commune)}<br>${esc(delivery.method==='bureau'?delivery.office:delivery.address)}</p>${order.notes?`<p>Note : ${esc(order.notes)}</p>`:''}</div></div><div class="order-foot"><strong>Total : ${money(order.total)}</strong><label class="field">Statut <select data-order-status="${esc(order.id)}">${Object.entries(statuses).map(([key,value])=>`<option value="${key}" ${order.status===key?'selected':''}>${value}</option>`).join('')}</select></label></div></article>`;
}).join(''):'<div class="empty">Aucune commande.</div>'}
function productsView(){
  if(state.editor)return productEditorView();
  return `${title('CATALOGUE','Produits',state.role==='admin'?'<button class="primary" id="new-product">+ AJOUTER UN PRODUIT</button>':'')}<div class="data-list">${state.products.map(p=>`<article class="data-row"><img src="${image(p.cover)}" alt=""><div class="grow"><h3>${esc(p.name)}</h3><p>${esc(p.color)} · ${money(p.price)} · Tailles ${esc((p.sizes||[]).join(', '))}</p><span class="status ${p.active===false?'annulee':'livree'}">${p.active===false?'Masqué':'En ligne'}</span></div>${state.role==='admin'?`<div class="actions"><button class="ghost" data-edit="${esc(p.id)}">Modifier</button><button class="danger" data-delete="${esc(p.id)}">Supprimer</button></div>`:''}</article>`).join('')||'<div class="empty">Aucun produit. Ajoutez votre première robe.</div>'}</div>`;
}
function productEditorView(){
  const p=state.editor==='new'?{}:state.products.find(item=>item.id===state.editor)||{};
  return `${title('CATALOGUE',state.editor==='new'?'Ajouter une robe':'Modifier la robe')}<form id="product-form" class="card"><div class="form-grid"><label class="field">Nom du produit *<input name="name" required maxlength="120" value="${esc(p.name)}"></label><label class="field">Nom court<input name="short" maxlength="80" value="${esc(p.short)}"></label><label class="field full">Description *<textarea name="description" required maxlength="2000">${esc(p.description)}</textarea></label><label class="field full">Détails du tissu et de la coupe<textarea name="details" maxlength="1000">${esc(p.details)}</textarea></label><label class="field">Couleur *<input name="color" required maxlength="60" value="${esc(p.color)}"></label><label class="field">Pastille de couleur<input type="color" name="swatch" value="${esc(p.swatch||'#d6c2bd')}"></label><label class="field">Prix en DA *<input type="number" name="price" required min="0" step="1" value="${esc(p.price??'')}"></label><label class="field">Visibilité<select name="active"><option value="true" ${p.active!==false?'selected':''}>En ligne</option><option value="false" ${p.active===false?'selected':''}>Masqué</option></select></label><div class="field full">Tailles disponibles *<div class="sizes">${sizesAvailable.map(size=>`<label><input type="checkbox" name="sizes" value="${size}" ${(p.sizes||[]).includes(size)?'checked':''}>${size}</label>`).join('')}</div></div><div class="field full">Photos du produit<p class="note">Choisissez plusieurs photos sur téléphone ou ordinateur. Elles sont optimisées puis envoyées directement dans la base Firebase.</p><input type="file" id="product-files" name="photos" accept="image/*" multiple><div id="selected-files" class="photo-list"></div><div id="existing-photos" class="photo-list">${state.editorImages.map(photo=>`<div class="photo" data-photo="${esc(photo.id)}"><img src="${image(photo.data)}" alt="Photo produit"><button type="button" data-remove-photo="${esc(photo.id)}" aria-label="Retirer cette photo">×</button></div>`).join('')}</div></div></div><div class="form-actions"><button class="primary" type="submit">ENREGISTRER LE PRODUIT</button><button class="ghost" type="button" id="cancel-product">Annuler</button></div></form>`;
}
function profileView(){
  return `${title('MON ESPACE','Profil & équipe')}<div class="profile-layout"><section class="card"><h2>Mon compte</h2><p><strong>${esc(state.user.email)}</strong></p><p>Rôle : ${state.role==='admin'?'Administrateur':'Employé'}</p><p class="note">La connexion utilise Firebase Authentication. Aucune validation par e-mail n’est nécessaire pour les comptes créés ici.</p></section>${state.role==='admin'?`<section class="card"><h2>Créer un accès</h2><form id="staff-form" class="form-grid"><label class="field full">E-mail *<input type="email" name="email" required autocomplete="off"></label><label class="field full">Mot de passe initial *<input type="text" name="password" minlength="12" required autocomplete="off" placeholder="12 caractères minimum"></label><label class="field full">Rôle<select name="role"><option value="employee">Employé</option><option value="admin">Administrateur</option></select></label><button class="primary" type="submit">CRÉER LE COMPTE</button></form><p class="note">Transmettez le mot de passe initial à la personne concernée par un canal privé.</p></section>`:''}</div>${state.role==='admin'?`<section class="card" style="margin-top:18px"><h2>Accès de l’équipe</h2><div class="data-list">${state.staff.map(member=>`<div class="data-row"><div class="grow"><h3>${esc(member.email)}</h3><span class="staff-tag">${member.role==='admin'?'Administrateur':'Employé'}</span></div>${member.id!==state.user.uid?`<button class="danger" data-revoke="${esc(member.id)}">Retirer l’accès</button>`:''}</div>`).join('')}</div></section>`:''}`;
}

function bindTab(){
  root.querySelectorAll('[data-order-open]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();state.tab='orders';renderTab();document.querySelector(`[data-order-status="${link.dataset.orderOpen}"]`)?.scrollIntoView({block:'center'})}));
  root.querySelector('#refresh-orders')?.addEventListener('click',()=>loadOrders());
  const filter=root.querySelector('#order-filter'),search=root.querySelector('#order-search');
  [filter,search].filter(Boolean).forEach(el=>el.addEventListener('input',()=>{root.querySelectorAll('.order-card').forEach(card=>{card.hidden=(filter.value!=='all'&&card.dataset.status!==filter.value)||(search.value&& !card.dataset.search.includes(search.value.toLowerCase()))})}));
  root.querySelectorAll('[data-order-status]').forEach(select=>select.addEventListener('change',async()=>{const old=state.orders.find(o=>o.id===select.dataset.orderStatus)?.status;select.disabled=true;try{await KB.db.collection('orders').doc(select.dataset.orderStatus).update({status:select.value,updatedAt:KB.serverTime()})}catch(error){select.value=old;notice(`Statut non enregistré : ${error.message}`,true)}finally{select.disabled=false}}));
  root.querySelector('#new-product')?.addEventListener('click',()=>{state.editor='new';state.editorImages=[];renderTab()});
  root.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',async()=>{state.editor=button.dataset.edit;const docs=await KB.db.collection('productImages').where('productId','==',state.editor).get();state.editorImages=docs.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>a.position-b.position);renderTab()}));
  root.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>deleteProduct(button.dataset.delete)));
  root.querySelector('#cancel-product')?.addEventListener('click',()=>{state.editor=null;state.editorImages=[];renderTab()});
  root.querySelectorAll('[data-remove-photo]').forEach(button=>button.addEventListener('click',()=>{button.closest('.photo').remove();state.editorImages=state.editorImages.filter(photo=>photo.id!==button.dataset.removePhoto)}));
  root.querySelector('#product-files')?.addEventListener('change',event=>{const list=root.querySelector('#selected-files');list.innerHTML=[...event.target.files].map(file=>`<span class="staff-tag">${esc(file.name)}</span>`).join('')});
  root.querySelector('#product-form')?.addEventListener('submit',saveProduct);
  root.querySelector('#staff-form')?.addEventListener('submit',createStaff);
  root.querySelectorAll('[data-revoke]').forEach(button=>button.addEventListener('click',()=>revokeStaff(button.dataset.revoke)));
}

async function loadProducts(){const docs=await KB.db.collection('products').get();state.products=docs.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'','fr'));if(state.tab==='products'||state.tab==='dashboard')renderTab()}
async function loadStaff(){if(state.role!=='admin')return;const docs=await KB.db.collection('staff').get();state.staff=docs.docs.map(doc=>({id:doc.id,...doc.data()}));if(state.tab==='profile')renderTab()}
function loadOrders(){if(state.stopOrders)state.stopOrders();state.stopOrders=KB.db.collection('orders').orderBy('createdAt','desc').limit(200).onSnapshot(snapshot=>{state.orders=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));if(state.tab==='orders'||state.tab==='dashboard')renderTab()},error=>{console.error(error);notice('Les commandes ne peuvent pas être chargées. Vérifiez les règles Firebase.',true)})}

async function readPhoto(file){
  if(!file.type.startsWith('image/'))throw new Error(`${file.name} n’est pas une image.`);
  const url=URL.createObjectURL(file);
  try{
    const photo=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Image illisible : ${file.name}`));img.src=url});
    let width=Math.min(1400,photo.naturalWidth),quality=.82;
    for(let attempt=0;attempt<6;attempt++){
      const height=Math.round(photo.naturalHeight*width/photo.naturalWidth);
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d').drawImage(photo,0,0,width,height);
      const data=canvas.toDataURL('image/webp',quality);
      if(data.length<430000)return data;
      width=Math.round(width*.78);quality=Math.max(.52,quality-.08);
    }
    throw new Error(`La photo ${file.name} reste trop volumineuse. Essayez une autre image.`);
  }finally{URL.revokeObjectURL(url)}
}

async function saveProduct(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('[type="submit"]');
  const selected=[...form.querySelectorAll('[name="sizes"]:checked')].map(input=>input.value);
  if(!selected.length){notice('Sélectionnez au moins une taille.',true);return}
  button.disabled=true;button.textContent='ENREGISTREMENT…';
  try{
    const files=[...form.querySelector('#product-files').files];
    if(!state.editorImages.length&&!files.length)throw new Error('Ajoutez au moins une photo.');
    const newPhotos=await Promise.all(files.map(readPhoto));
    const id=state.editor==='new'?KB.db.collection('products').doc().id:state.editor;
    const existing=state.products.find(p=>p.id===id);
    const allPhotos=[...state.editorImages.map(p=>p.data),...newPhotos];
    const data={
      name:form.elements.name.value.trim(),short:form.elements.short.value.trim()||form.elements.name.value.trim(),
      description:form.elements.description.value.trim(),details:form.elements.details.value.trim(),color:form.elements.color.value.trim(),
      swatch:form.elements.swatch.value,sizes:selected,price:Number(form.elements.price.value),cover:allPhotos[0],
      url:existing?.url||`/produit/?id=${encodeURIComponent(id)}`,active:form.elements.active.value==='true',
      createdAt:existing?.createdAt||KB.serverTime(),updatedAt:KB.serverTime()
    };
    await KB.db.collection('products').doc(id).set(data);
    const original=state.editor==='new'?[]:(await KB.db.collection('productImages').where('productId','==',id).get()).docs;
    const keptIds=new Set(state.editorImages.map(p=>p.id));
    for(const doc of original)if(!keptIds.has(doc.id))await doc.ref.delete();
    for(let i=0;i<state.editorImages.length;i++)await KB.db.collection('productImages').doc(state.editorImages[i].id).update({position:i});
    for(let i=0;i<newPhotos.length;i++)await KB.db.collection('productImages').add({productId:id,data:newPhotos[i],position:state.editorImages.length+i,createdAt:KB.serverTime()});
    state.editor=null;state.editorImages=[];
    await loadProducts();
    notice('Produit enregistré et visible dans la boutique.');
  }catch(error){console.error(error);notice(error.message||'Enregistrement impossible.',true);button.disabled=false;button.textContent='ENREGISTRER LE PRODUIT'}
}
async function deleteProduct(id){
  const product=state.products.find(p=>p.id===id);if(!product||!confirm(`Supprimer « ${product.name} » et ses photos ?`))return;
  try{const docs=await KB.db.collection('productImages').where('productId','==',id).get();for(const doc of docs.docs)await doc.ref.delete();await KB.db.collection('products').doc(id).delete();await loadProducts();notice('Produit supprimé. Les commandes existantes conservent leurs détails.')}catch(error){notice(error.message,true)}
}
async function createStaff(event){
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;button.textContent='CRÉATION…';
  const email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value,role=form.elements.role.value;
  let secondary=null,created=null;
  try{
    secondary=firebase.initializeApp(KB_FIREBASE_CONFIG,`staff-${Date.now()}`);
    const auth=firebase.auth(secondary);
    created=(await auth.createUserWithEmailAndPassword(email,password)).user;
    await KB.db.collection('staff').doc(created.uid).set({email,role,createdAt:KB.serverTime()});
    await auth.signOut();await secondary.delete();secondary=null;
    form.reset();await loadStaff();notice(`Compte ${role==='admin'?'administrateur':'employé'} créé pour ${email}. Aucun e-mail de validation n’est demandé.`);
  }catch(error){console.error(error);if(created)try{await created.delete()}catch{};if(secondary)try{await secondary.delete()}catch{};notice(`Compte non créé : ${error.message}`,true)}finally{button.disabled=false;button.textContent='CRÉER LE COMPTE'}
}
async function revokeStaff(uid){if(!confirm('Retirer l’accès de ce compte à l’administration ?'))return;try{await KB.db.collection('staff').doc(uid).delete();await loadStaff();notice('Accès retiré.')}catch(error){notice(error.message,true)}}

async function seedCatalog(){
  const settings=KB.db.collection('settings').doc('catalog');
  if((await settings.get()).data()?.ready)return;
  const initial=[
    {id:'robe-de-soiree-nude-strass',name:'Robe de soirée nude en mousseline à strass',short:'Robe nude à strass',description:'Robe de soirée élégante en mousseline de soie rose nude, ornée de strass. Sa coupe ajustée à la taille s’évase avec grâce sur la longueur. Une étole légère complète la silhouette.',details:'Mousseline de soie, strass, coupe ajustée et évasée.',color:'Nude',swatch:'#eadbd7',sizes:['46','48','50'],price:23900,url:'/produit/robe-de-soiree-nude-strass/',files:['robe-nude-face.jpg','robe-nude-detail.jpg','robe-nude-dos.jpg']},
    {id:'robe-longue-plissee-bleu-gris-perles',name:'Robe longue plissée bleu gris à perles',short:'Robe plissée bleu gris',description:'Robe longue chic grande taille en tissu maille élastique bleu gris. Son drapé plissé dessine une silhouette fluide et ses perles soulignent le haut de la robe.',details:'Tissu maille élastique, plis et perles décoratives.',color:'Bleu gris',swatch:'#7289a1',sizes:['46','48','50'],price:23900,url:'/produit/robe-longue-plissee-bleu-gris-perles/',files:['robe-bleu-face.jpg','robe-bleu-pose.jpg']}
  ];
  for(const product of initial){
    const photos=[];
    for(const filename of product.files){const response=await fetch(`${SITE_BASE}/assets/${filename}`);if(!response.ok)throw new Error(`Photo initiale introuvable : ${filename}`);photos.push(await readPhoto(new File([await response.blob()],filename,{type:'image/jpeg'})))}
    const {id,files,...data}=product;
    await KB.db.collection('products').doc(id).set({...data,cover:photos[0],active:true,createdAt:KB.serverTime(),updatedAt:KB.serverTime()});
    for(let i=0;i<photos.length;i++)await KB.db.collection('productImages').doc(`${id}-${i}`).set({productId:id,data:photos[i],position:i,createdAt:KB.serverTime()});
  }
  await settings.set({ready:true,updatedAt:KB.serverTime()});
}

KB.auth.onAuthStateChanged(async user=>{
  if(state.stopOrders){state.stopOrders();state.stopOrders=null}
  if(!user||user.isAnonymous){state.user=null;state.role=null;renderLogin();return}
  root.innerHTML='<div class="boot">Vérification de votre accès…</div>';
  try{
    const doc=await KB.db.collection('staff').doc(user.uid).get();
    if(!doc.exists||!['admin','employee'].includes(doc.data().role)){await KB.auth.signOut();renderLogin('Ce compte ne possède pas d’accès à l’administration.');return}
    state.user=user;state.role=doc.data().role;
    if(state.role==='admin')await seedCatalog();
    const products=await KB.db.collection('products').get();state.products=products.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'','fr'));
    if(state.role==='admin'){const staff=await KB.db.collection('staff').get();state.staff=staff.docs.map(doc=>({id:doc.id,...doc.data()}))}
    shell();loadOrders();
  }catch(error){console.error(error);root.innerHTML=`<div class="login-wrap"><div class="login-card">${brand()}<h1>Accès indisponible</h1><p>${esc(error.message)}</p><button class="ghost" id="retry-admin">Réessayer</button></div></div>`;root.querySelector('#retry-admin').addEventListener('click',()=>location.reload())}
});

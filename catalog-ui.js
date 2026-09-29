// Category pages and inventory cues layered over the existing storefront.
const previousHeader = shellHeader;
shellHeader = function () {
  const links = KB_CATEGORIES.map(category => `<a href="${category.path}">${tr(category.label)}</a>`).join('');
  return previousHeader().replace(
    '<a href="/robes-de-soiree/">ROBES DE SOIRÉE</a>',
    '<a href="/robes-de-soiree/">ROBES DE SOIRÉE</a><details class="nav-categories"><summary>'+tr('CATÉGORIES')+'</summary><div>'+links+'</div></details>'
  );
};

const previousFooter = shellFooter;
shellFooter = function () {
  return previousFooter().replace('<a href="/nouveautes/">Nouveautés</a>',
    '<a href="/nouveautes/">Nouveautés</a>' + KB_CATEGORIES.slice(1).map(category => `<a href="${category.path}">${tr(category.label)}</a>`).join(''));
};

function categoryLinks() {
  return `<nav class="category-links" aria-label="${tr('CATÉGORIES')}">${KB_CATEGORIES.map(category => `<a href="${category.path}" ${document.body.dataset.category===category.id?'aria-current="page"':''}><span class="category-photo"><img src="${category.image}" alt="" loading="lazy" decoding="async"></span><span class="category-name">${tr(category.label)}</span></a>`).join('')}</nav>`;
}

const previousHome = homePage;
homePage = function () {
  return previousHome().replace('<section class="section-wrap home-products">',
    `<section class="home-categories"><div class="section-wrap"><h2 class="sr-only">${tr('CATÉGORIES')}</h2>${categoryLinks()}</div></section><section class="section-wrap home-products">`);
};

collectionPage = function () {
  const q = new URLSearchParams(location.search).get('q')?.trim().toLocaleLowerCase('fr') || '';
  const list = PRODUCTS.filter(p => p.active !== false && (q || KB_CATEGORY(p.category).id === 'robes-de-soiree'))
    .filter(p => !q || `${p.name} ${p.description} ${p.color}`.toLocaleLowerCase('fr').includes(q));
  return `<main class="section-wrap extra-page">${pageIntro('KHADIDJA BOUTIQUE','ROBES DE SOIRÉE',q?`Résultats pour « ${escapeHtml(q)} »`:'Découvrez les robes actuellement disponibles dans la collection.')}${categoryLinks()}<div class="listing-toolbar"><span>${list.length} ARTICLE${list.length>1?'S':''}</span><span>TRIER : NOUVEAUTÉS</span></div>${list.length?`<div class="listing-grid">${list.map(productCard).join('')}</div>`:`<div class="empty-state"><h2>${tr('Aucun produit pour le moment')}</h2><a class="button button-dark" href="/">${tr('RETOUR À L’ACCUEIL')}</a></div>`}</main>`;
};

function categoryPage() {
  const category = KB_CATEGORY(document.body.dataset.category);
  const list = PRODUCTS.filter(product => product.active !== false && KB_CATEGORY(product.category).id === category.id);
  return `<main class="section-wrap extra-page">${pageIntro('KHADIDJA BOUTIQUE',tr(category.label).toLocaleUpperCase(),tr('Découvrez notre sélection.'))}${categoryLinks()}<div class="listing-toolbar"><span>${list.length} ARTICLE${list.length>1?'S':''}</span><span>KHADIDJA BOUTIQUE</span></div>${list.length?`<div class="listing-grid">${list.map(productCard).join('')}</div>`:`<div class="empty-state"><h2>${tr('Aucun produit pour le moment')}</h2><p>${tr('Cette catégorie sera bientôt disponible.')}</p><a class="button button-dark" href="/robes-de-soiree/">${tr('VOIR LES ROBES')}</a></div>`}</main>`;
}

const previousProductCard = productCard;
productCard = function (product) {
  const card = previousProductCard(product);
  return KB_STOCK(product) === 0 ? card.replace('<div class="card-price">', `<span class="stock-label stock-out">${tr('Rupture de stock')}</span><div class="card-price">`) : card;
};

const previousProductPage = productPage;
productPage = function (product) {
  const category = KB_CATEGORY(product.category), stock = KB_STOCK(product);
  let html = previousProductPage(product);
  html = html.replace('<a href="/robes-de-soiree/">Robes de soirée</a>', `<a href="${category.path}">${tr(category.label)}</a>`);
  html = html.replace('KHADIDJA BOUTIQUE · ROBES DE SOIRÉE', `KHADIDJA BOUTIQUE · ${tr(category.label).toLocaleUpperCase()}`);
  if (stock !== null) {
    const status = stock === 0 ? tr('Rupture de stock') : stock <= 5 ? `${tr('Plus que')} ${stock} ${tr('en stock')}` : `${stock} ${tr('en stock')}`;
    html = html.replace('<p class="product-note">', `<p class="product-stock ${stock===0?'stock-out':stock<=5?'stock-low':''}">${status}</p><p class="product-note">`);
    if (stock === 0) html = html.replace('<button class="button button-dark add-cart" id="add-cart">', '<button class="button button-dark add-cart" id="add-cart" disabled>').replace('AJOUTER AU PANIER '+svg('bag'), tr('Rupture de stock'));
  }
  return html;
};

const previousSetupProduct = setupProduct;
setupProduct = function (product) {
  previousSetupProduct(product);
  const stock = KB_STOCK(product);
  if (stock !== null) document.querySelector('[data-qty="plus"]')?.addEventListener('click', event => {
    if (Number(document.querySelector('#product-qty')?.textContent) >= stock) event.stopImmediatePropagation();
  }, true);
};

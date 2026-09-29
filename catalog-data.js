// Shared category and inventory definitions for the shop and its admin.
window.KB_CATEGORIES = Object.freeze([
  {id:'robes-de-soiree', label:'Robes de soirée', path:'/robes-de-soiree/', image:'/assets/category-robes-de-soiree.jpg'},
  {id:'bijoux-accessoires', label:'Bijoux et accessoires', path:'/bijoux-accessoires/', image:'/assets/category-bijoux-accessoires.jpg'},
  {id:'chaussures-sacs', label:'Chaussures et sacs', path:'/chaussures-sacs/', image:'/assets/category-chaussures-sacs.jpg'},
  {id:'robes-grande-taille', label:'Robes grande taille', path:'/robes-grande-taille/', image:'/assets/category-robes-grande-taille.jpg'},
  {id:'sous-vetements', label:'Sous-vêtements', path:'/sous-vetements/', image:'/assets/category-sous-vetements.jpg'}
]);
window.KB_CATEGORY = id => window.KB_CATEGORIES.find(category => category.id === id) || window.KB_CATEGORIES[0];
window.KB_STOCK = product => Number.isInteger(product?.stock) && product.stock >= 0 ? product.stock : null;
window.KB_STOCK_ALERT = product => {
  const quantity = window.KB_STOCK(product);
  return quantity === null ? 'unknown' : quantity === 0 ? 'out' : quantity <= 5 ? 'low' : 'ok';
};

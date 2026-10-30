// ============================================================================
// CAPA DE DOMINIO: Motor de Costeo de Recetas y Márgenes
// Responsabilidad única: Calcular costos unitarios y márgenes sin acoplamiento al DOM.
// ============================================================================

export function findIngredientById(ingredients, ingId) {
  if (!Array.isArray(ingredients)) return undefined;
  return ingredients.find(i => i.id === ingId);
}

export function calculateProductCost(product, ingredients) {
  if (!product || !Array.isArray(product.recipe) || !product.recipe.length) return 0;
  return Math.round(
    product.recipe.reduce((acc, line) => {
      const ing = findIngredientById(ingredients, line.ingId);
      const unitPrice = ing ? Number(ing.price) || 0 : 0;
      return acc + unitPrice * (Number(line.qty) || 0);
    }, 0)
  );
}

export function getProductMarginPercent(product, ingredients) {
  const cost = calculateProductCost(product, ingredients);
  const price = Number(product?.price) || 0;
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

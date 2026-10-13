/** Agrégats renvoyés par GET /api/products/meta. */
export interface CategoryCount {
  name: string;
  count: number;
  /** Image d'un produit de la catégorie, utilisée comme vignette. */
  image: string | null;
  children?: CategoryCount[];
}

export interface CatalogMeta {
  count: number;
  minPrice: number;
  maxPrice: number;
  categories: CategoryCount[];
}

export function isRootCategory(category: { parent_id?: string | null }): boolean {
  return !category.parent_id;
}

export function childrenOf<T extends { parent_id?: string | null }>(list: T[], parentId: string): T[] {
  return list.filter((item) => item.parent_id === parentId);
}

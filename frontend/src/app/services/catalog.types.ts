/** Agrégats renvoyés par GET /api/products/meta. */
export interface CategoryCount {
  name: string;
  count: number;
  /** Image d'un produit de la catégorie, utilisée comme vignette. */
  image: string | null;
}

export interface CatalogMeta {
  count: number;
  minPrice: number;
  maxPrice: number;
  categories: CategoryCount[];
}

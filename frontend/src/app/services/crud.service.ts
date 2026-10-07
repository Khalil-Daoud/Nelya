import { Injectable } from '@angular/core';
import { ApiService, QueryParams } from './api.service';
import { Observable } from 'rxjs';

/** Réponse paginée de l'API : renvoyée dès que page ou limit est fourni. */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PageQuery extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Nom public du tri, par exemple 'price:asc' ou 'newest:desc'. */
  sort?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CrudService {
  constructor(private api: ApiService) {}

  /**
   * Charge une collection entière. À réserver aux collections courtes et bornées
   * (catégories, paramètres) : sur les produits ou les commandes, utiliser getPage.
   */
  getAll<T>(entity: string, params?: QueryParams): Observable<T[]> {
    return this.api.get<T[]>(entity, params);
  }

  /** Charge une page. Le serveur plafonne limit à 100 quoi qu'on demande. */
  getPage<T>(entity: string, query: PageQuery = {}): Observable<Page<T>> {
    return this.api.get<Page<T>>(entity, { page: 1, limit: 24, ...query });
  }

  getById<T>(entity: string, id: string): Observable<T> {
    return this.api.getById<T>(entity, id);
  }

  create<T>(entity: string, data: any): Observable<T> {
    return this.api.post<T>(entity, data);
  }

  update<T>(entity: string, id: string, data: any): Observable<T> {
    return this.api.put<T>(entity, id, data);
  }

  delete(entity: string, id: string): Observable<any> {
    return this.api.delete(entity, id);
  }
}

import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CrudService {
  constructor(private api: ApiService) {}

  getAll<T>(entity: string): Observable<T[]> {
    return this.api.get<T[]>(entity);
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

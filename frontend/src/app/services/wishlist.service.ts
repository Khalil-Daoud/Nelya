import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const WISHLIST_KEY = 'nelya_wishlist';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private ids = new BehaviorSubject<string[]>(this.load());
  ids$ = this.ids.asObservable();

  private load(): string[] {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(ids: string[]): void {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  }

  toggle(id: string): boolean {
    const current = this.ids.value;
    const has = current.includes(id);
    const next = has ? current.filter(i => i !== id) : [...current, id];
    this.ids.next(next);
    this.save(next);
    return !has;
  }

  isWishlisted(id: string): boolean {
    return this.ids.value.includes(id);
  }

  remove(id: string): void {
    this.ids.next(this.ids.value.filter(i => i !== id));
    this.save(this.ids.value);
  }

  get count(): number {
    return this.ids.value.length;
  }

  get idsList(): string[] {
    return this.ids.value;
  }
}

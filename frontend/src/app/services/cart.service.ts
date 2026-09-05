import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  category?: string;
}

const CART_STORAGE_KEY = 'nelya_cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // [BUG-012 FIX] Charger le panier depuis localStorage au démarrage
  private cartItems = new BehaviorSubject<CartItem[]>(this.loadFromStorage());
  cartItems$ = this.cartItems.asObservable();

  private loadFromStorage(): CartItem[] {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(items: CartItem[]): void {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  addToCart(product: any) {
    const currentItems = this.cartItems.value;
    const existingItem = currentItems.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      this.cartItems.next([...currentItems]);
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: 1,
        category: product.category
      };
      this.cartItems.next([...currentItems, newItem]);
    }
    // [BUG-012 FIX] Persister après chaque modification
    this.saveToStorage(this.cartItems.value);
  }

  removeFromCart(id: string) {
    const currentItems = this.cartItems.value.filter(item => item.id !== id);
    this.cartItems.next(currentItems);
    this.saveToStorage(currentItems);
  }

  // [BUG-011 FIX] Méthode dédiée qui notifie correctement le BehaviorSubject
  decreaseQuantity(id: string) {
    const currentItems = this.cartItems.value;
    const item = currentItems.find(i => i.id === id);
    if (!item) return;

    if (item.quantity > 1) {
      item.quantity -= 1;
      this.cartItems.next([...currentItems]);
    } else {
      this.removeFromCart(id);
      return;
    }
    this.saveToStorage(this.cartItems.value);
  }

  get totalAmount() {
    return this.cartItems.value.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  get itemsCount() {
    return this.cartItems.value.reduce((acc, item) => acc + item.quantity, 0);
  }

  clearCart() {
    this.cartItems.next([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}


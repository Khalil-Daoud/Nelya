import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'seller' | 'client';
  permission_group_id?: string | null;
  permissions?: string[];
  loyalty_points?: number;
  created_at?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = (() => {
    const origin = API_BASE_URL.replace(/\/$/, '');
    return origin ? `${origin}/api/auth` : '/api/auth';
  })();
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((res: any) => this.setSession(res))
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => this.setSession(res))
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  refreshMe(): Promise<User | null> {
    if (!this.isLoggedIn) return Promise.resolve(null);
    return new Promise(resolve => {
      this.http.get<User>(`${this.apiUrl}/me`).subscribe({
        next: user => {
          this.patchCurrentUser(user);
          resolve(user);
        },
        error: () => resolve(this.currentUserSubject.value)
      });
    });
  }

  patchCurrentUser(partial: Partial<User> | User) {
    const current = this.currentUserSubject.value;
    if (!current && !(partial as User)?.id) return;
    const next = { ...(current || {}), ...partial } as User;
    localStorage.setItem('user', JSON.stringify(next));
    this.currentUserSubject.next(next);
  }

  private setSession(authResult: any) {
    localStorage.setItem('token', authResult.token);
    localStorage.setItem('user', JSON.stringify(authResult.user));
    this.currentUserSubject.next(authResult.user);
  }

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  get isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  hasPermission(key: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (user.role === 'admin') return true;
    const permissions = user.permissions || [];
    return permissions.includes('*') || permissions.includes(key);
  }
}

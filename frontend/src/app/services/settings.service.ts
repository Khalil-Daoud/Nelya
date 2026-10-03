import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface Currency {
  code: string;
  symbol: string;
  label?: string;
}

export interface StoreSettings {
  currency: Currency;
  guestCheckout: boolean;
}

const DEFAULT_CURRENCY: Currency = { code: 'EUR', symbol: '€', label: 'Euro' };

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private currencySubject = new BehaviorSubject<Currency>(DEFAULT_CURRENCY);
  public currency$ = this.currencySubject.asObservable();

  private guestCheckoutSubject = new BehaviorSubject<boolean>(false);
  public guestCheckout$ = this.guestCheckoutSubject.asObservable();

  constructor(private api: ApiService) {}

  load(): Promise<void> {
    return firstValueFrom(this.api.get<StoreSettings>('settings'))
      .then(s => this.apply(s))
      .catch(() => {});
  }

  get currency(): Currency {
    return this.currencySubject.value;
  }

  get guestCheckout(): boolean {
    return this.guestCheckoutSubject.value;
  }

  setCurrency(code: string): Promise<Currency> {
    return this.save({ currency: code }).then(() => this.currency);
  }

  setGuestCheckout(enabled: boolean): Promise<boolean> {
    return this.save({ guestCheckout: enabled }).then(() => this.guestCheckout);
  }

  private save(payload: { currency?: string; guestCheckout?: boolean }): Promise<void> {
    return firstValueFrom(this.api.putTo<StoreSettings>('settings', payload)).then(s => this.apply(s));
  }

  private apply(settings: StoreSettings): void {
    if (settings?.currency) {
      this.currencySubject.next(settings.currency);
    }
    this.guestCheckoutSubject.next(Boolean(settings?.guestCheckout));
  }
}

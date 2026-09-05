import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface Currency {
  code: string;
  symbol: string;
  label?: string;
}

const DEFAULT_CURRENCY: Currency = { code: 'EUR', symbol: '€', label: 'Euro' };

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private currencySubject = new BehaviorSubject<Currency>(DEFAULT_CURRENCY);
  public currency$ = this.currencySubject.asObservable();

  constructor(private api: ApiService) {}

  load(): Promise<void> {
    return firstValueFrom(this.api.get<Currency>('settings'))
      .then(c => this.currencySubject.next(c))
      .catch(() => {});
  }

  get currency(): Currency {
    return this.currencySubject.value;
  }

  setCurrency(code: string): Promise<Currency> {
    return firstValueFrom(this.api.putTo<Currency>('settings', { currency: code })).then(c => {
      this.currencySubject.next(c);
      return c;
    });
  }
}

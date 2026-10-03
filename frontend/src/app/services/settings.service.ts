import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface Currency {
  code: string;
  symbol: string;
  label?: string;
}

export interface WhatsAppSettings {
  /** Numéro de la boutique au format international sans "+", ex : 21622580632 */
  number: string;
  notifyCustomer: boolean;
  /** Un fournisseur officiel (Meta ou Twilio) est configuré côté serveur */
  providerReady: boolean;
  /** Le serveur confirme lui-même au client : le site n'a pas à le rediriger */
  autoSend: boolean;
}

export interface StoreSettings {
  currency: Currency;
  guestCheckout: boolean;
  whatsapp: WhatsAppSettings;
}

const DEFAULT_CURRENCY: Currency = { code: 'EUR', symbol: '€', label: 'Euro' };
const DEFAULT_WHATSAPP: WhatsAppSettings = {
  number: '',
  notifyCustomer: false,
  providerReady: false,
  autoSend: false
};

export interface SettingsPayload {
  currency?: string;
  guestCheckout?: boolean;
  whatsappNumber?: string;
  notifyCustomer?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private currencySubject = new BehaviorSubject<Currency>(DEFAULT_CURRENCY);
  public currency$ = this.currencySubject.asObservable();

  private guestCheckoutSubject = new BehaviorSubject<boolean>(false);
  public guestCheckout$ = this.guestCheckoutSubject.asObservable();

  private whatsappSubject = new BehaviorSubject<WhatsAppSettings>(DEFAULT_WHATSAPP);
  public whatsapp$ = this.whatsappSubject.asObservable();

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

  get whatsapp(): WhatsAppSettings {
    return this.whatsappSubject.value;
  }

  setCurrency(code: string): Promise<Currency> {
    return this.save({ currency: code }).then(() => this.currency);
  }

  setGuestCheckout(enabled: boolean): Promise<boolean> {
    return this.save({ guestCheckout: enabled }).then(() => this.guestCheckout);
  }

  save(payload: SettingsPayload): Promise<void> {
    return firstValueFrom(this.api.putTo<StoreSettings>('settings', payload)).then(s => this.apply(s));
  }

  private apply(settings: StoreSettings): void {
    if (settings?.currency) {
      this.currencySubject.next(settings.currency);
    }
    this.guestCheckoutSubject.next(Boolean(settings?.guestCheckout));
    this.whatsappSubject.next({ ...DEFAULT_WHATSAPP, ...(settings?.whatsapp || {}) });
  }
}

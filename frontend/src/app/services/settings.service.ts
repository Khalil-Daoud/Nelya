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

export interface LoyaltyTier {
  min: number;
  max: number;
  points: number;
}

export interface StoreSettings {
  currency: Currency;
  guestCheckout: boolean;
  loyalty?: { tiers: LoyaltyTier[] };
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
  loyaltyTiers?: LoyaltyTier[];
}

export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  { min: 0, max: 20, points: 10 },
  { min: 20, max: 50, points: 20 },
  { min: 50, max: 1000, points: 50 }
];

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

  private loyaltyTiersSubject = new BehaviorSubject<LoyaltyTier[]>(DEFAULT_LOYALTY_TIERS);
  public loyaltyTiers$ = this.loyaltyTiersSubject.asObservable();

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

  get loyaltyTiers(): LoyaltyTier[] {
    return this.loyaltyTiersSubject.value;
  }

  pointsForPrice(price: number): number {
    const value = Number(price);
    if (!Number.isFinite(value) || value < 0) return 0;
    const match = this.loyaltyTiers.find(tier => value >= tier.min && value <= tier.max);
    return match ? match.points : 0;
  }

  pointsForItems(items: Array<{ price?: number; unit_price?: number; quantity?: number }>): number {
    return (items || []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = item.unit_price ?? item.price ?? 0;
      return sum + this.pointsForPrice(price) * qty;
    }, 0);
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
    const tiers = settings?.loyalty?.tiers;
    this.loyaltyTiersSubject.next(Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_LOYALTY_TIERS);
  }
}

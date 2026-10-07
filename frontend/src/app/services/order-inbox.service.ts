import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval, startWith, switchMap } from 'rxjs';
import { ApiService } from './api.service';

export interface OrderInbox {
  latestId: string | null;
  createdAt: string | null;
  totalAmount: string | number | null;
  customer: string | null;
  pending: number;
}

export interface OrderAlert {
  customer: string;
  totalAmount: string | number | null;
  at: number;
}

const LAST_ID_KEY = 'nelya_admin_last_order_id';
const SOUND_KEY = 'nelya_admin_order_sound';

@Injectable({ providedIn: 'root' })
export class OrderInboxService implements OnDestroy {
  private pendingSubject = new BehaviorSubject<number>(0);
  readonly pending$ = this.pendingSubject.asObservable();

  private alertSubject = new BehaviorSubject<OrderAlert | null>(null);
  readonly alert$ = this.alertSubject.asObservable();

  private soundSubject = new BehaviorSubject<boolean>(localStorage.getItem(SOUND_KEY) !== '0');
  readonly soundEnabled$ = this.soundSubject.asObservable();

  private sub: Subscription | null = null;
  private audio: AudioContext | null = null;
  private primed = false;

  constructor(private api: ApiService) {}

  get soundEnabled(): boolean {
    return this.soundSubject.value;
  }

  start() {
    if (this.sub) return;
    this.sub = interval(12000).pipe(
      startWith(0),
      switchMap(() => this.api.get<OrderInbox>('orders/inbox'))
    ).subscribe({
      next: inbox => this.handle(inbox),
      error: () => {}
    });
  }

  stop() {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  ngOnDestroy() {
    this.stop();
  }

  dismissAlert() {
    this.alertSubject.next(null);
  }

  setSoundEnabled(enabled: boolean) {
    this.soundSubject.next(enabled);
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
    if (enabled) this.primeAudio();
  }

  /** Le navigateur n'autorise le son qu'après un clic. */
  primeAudio() {
    if (this.primed) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.audio = this.audio || new Ctx();
      this.audio.resume();
      this.primed = true;
    } catch {
      /* ignore */
    }
  }

  requestBrowserPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private handle(inbox: OrderInbox) {
    this.pendingSubject.next(Number(inbox.pending) || 0);
    const latestId = inbox.latestId;
    if (!latestId) return;

    const seen = localStorage.getItem(LAST_ID_KEY);
    if (!seen) {
      localStorage.setItem(LAST_ID_KEY, latestId);
      return;
    }
    if (seen === latestId) return;

    localStorage.setItem(LAST_ID_KEY, latestId);
    const alert: OrderAlert = {
      customer: inbox.customer || 'Client',
      totalAmount: inbox.totalAmount,
      at: Date.now()
    };
    this.alertSubject.next(alert);
    if (this.soundEnabled) this.playChime();
    this.notifyBrowser(alert);
  }

  private playChime() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.audio = this.audio || new Ctx();
      const ctx = this.audio;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      this.tone(ctx, 880, now, 0.22);
      this.tone(ctx, 1175, now + 0.12, 0.32);
    } catch {
      /* ignore */
    }
  }

  private tone(ctx: AudioContext, freq: number, start: number, duration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private notifyBrowser(alert: OrderAlert) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification('Nelya — nouvelle commande', {
        body: `${alert.customer}${alert.totalAmount != null ? ' · ' + alert.totalAmount : ''}`,
        tag: 'nelya-order'
      });
    } catch {
      /* ignore */
    }
  }
}

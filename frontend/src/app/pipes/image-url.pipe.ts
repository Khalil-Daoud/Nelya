import { Pipe, PipeTransform } from '@angular/core';
import { API_BASE_URL } from '../config';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3000${value}`;
    }
    // Même origine derrière nginx, ou hôte API explicite.
    const origin = (API_BASE_URL || '').replace(/\/$/, '');
    return `${origin}${value}`;
  }
}

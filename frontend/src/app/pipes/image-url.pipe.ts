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
    
    // Si on est en développement sur localhost:4200, on préfixe avec le serveur backend local
    // En production, on préfixe avec l'URL publique du backend (Railway)
    const base = window.location.hostname === 'localhost' ? 'http://localhost:3000' : API_BASE_URL;
    return `${base}${value}`;
  }
}

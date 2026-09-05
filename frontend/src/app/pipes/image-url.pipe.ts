import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    
    // Si on est en développement sur localhost:4200, on préfixe avec le serveur backend local
    const base = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    return `${base}${value}`;
  }
}

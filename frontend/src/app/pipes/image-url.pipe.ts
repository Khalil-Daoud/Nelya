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

    const origin = (API_BASE_URL || '').replace(/\/$/, '');
    return `${origin}${value}`;
  }
}

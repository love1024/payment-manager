import { Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

@Pipe({
  name: 'firstKey',
})
export class FirstKeyPipe implements PipeTransform {
  transform(errors: ValidationErrors | null): string {
    if (!errors) return '';
    return Object.keys(errors)?.[0] || '';
  }
}

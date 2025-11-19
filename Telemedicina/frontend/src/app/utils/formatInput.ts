import { AbstractControl } from '@angular/forms';

export function formatTajInput(event: any, control: AbstractControl | null) {
  if (!control) return;

  let value = (event.target.value || '') as string;

  value = value.replace(/\D/g, '');

  if (value.length > 9) {
    value = value.substring(0, 9);
  }

  if (value.length > 6) {
    value = `${value.substring(0, 3)} ${value.substring(3, 6)} ${value.substring(6)}`;
  } else if (value.length > 3) {
    value = `${value.substring(0, 3)} ${value.substring(3)}`;
  }

  control.setValue(value, { emitEvent: false });
  event.target.value = value;
}

export function formatPhoneNumberInput(event: any, control: AbstractControl | null) {
  if (!control) return;

  let value = (event.target.value || '') as string;

  value = value.replace(/\D/g, '');

  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  let formatted = '';

  if (value.length > 0) {
    formatted = value.substring(0, 2);
  }
  if (value.length > 2) {
    formatted += ' ' + value.substring(2, 4);
  }
  if (value.length > 4) {
    formatted += ' ' + value.substring(4, 7);
  }
  if (value.length > 7) {
    formatted += ' ' + value.substring(7);
  }

  control.setValue(formatted, { emitEvent: false });
  event.target.value = formatted;
}

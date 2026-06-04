import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  forwardRef,
  input,
  signal
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import {
  formatDateDisplayTyping,
  formatDateToDisplay,
  mergeDatetimeLocal,
  normalizeTimeHHmm,
  parseDisplayDateToIso,
  splitDatetimeLocalValue
} from './time-slot.util';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { TimeInputComponent } from './time-input.component';

@Component({
  selector: 'app-datetime-input',
  standalone: true,
  imports: [CommonModule, TimeInputComponent, AppIconComponent],
  templateUrl: './datetime-input.component.html',
  styleUrl: './datetime-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatetimeInputComponent),
      multi: true
    }
  ]
})
export class DatetimeInputComponent implements ControlValueAccessor {
  readonly inputId = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly invalid = input(false);

  readonly value = signal('');
  /** Texto visible en formato DD/MM/YYYY. */
  readonly dateInput = signal('');

  readonly datePart = computed(() => splitDatetimeLocalValue(this.value()).date);
  readonly timePart = computed(() => {
    const { time } = splitDatetimeLocalValue(this.value());
    return time ? normalizeTimeHHmm(time) : '';
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private formDisabled = signal(false);

  writeValue(value: string | null): void {
    const next = value ?? '';
    this.value.set(next);
    this.syncDateInputFromValue(next);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  isDisabled(): boolean {
    return this.disabled() || this.formDisabled();
  }

  onDateInput(raw: string): void {
    this.dateInput.set(formatDateDisplayTyping(raw));
  }

  onDateBlur(): void {
    const iso = parseDisplayDateToIso(this.dateInput());
    if (!iso) {
      this.syncDateInputFromValue(this.value());
      this.onTouched();
      return;
    }
    const merged = mergeDatetimeLocal(iso, this.timePart() || '08:00');
    this.emit(merged);
  }

  onDateChange(isoDate: string): void {
    const merged = mergeDatetimeLocal(isoDate, this.timePart() || '08:00');
    this.emit(merged);
  }

  openNativeDatePicker(input: HTMLInputElement): void {
    if (this.isDisabled()) return;
    input.showPicker?.();
  }

  onNativeDatePicked(raw: string): void {
    if (!raw) return;
    this.dateInput.set(formatDateToDisplay(raw));
    this.onDateChange(raw);
  }

  onTimeChange(time: string): void {
    const date = this.datePart();
    if (!date) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      this.emit(mergeDatetimeLocal(`${y}-${m}-${d}`, time));
      return;
    }
    this.emit(mergeDatetimeLocal(date, time));
  }

  onBlur(): void {
    this.onTouched();
  }

  private emit(next: string): void {
    this.value.set(next);
    this.syncDateInputFromValue(next);
    this.onChange(next);
    this.onTouched();
  }

  private syncDateInputFromValue(datetimeLocal: string): void {
    const { date } = splitDatetimeLocalValue(datetimeLocal);
    this.dateInput.set(formatDateToDisplay(date));
  }
}

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
  mergeDatetimeLocal,
  normalizeTimeHHmm,
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

  readonly datePart = computed(() => splitDatetimeLocalValue(this.value()).date);
  readonly timePart = computed(() => {
    const { time } = splitDatetimeLocalValue(this.value());
    return time ? normalizeTimeHHmm(time) : '';
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private formDisabled = signal(false);

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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

  onDateChange(raw: string): void {
    const merged = mergeDatetimeLocal(raw, this.timePart() || '08:00');
    this.emit(merged);
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
    this.onChange(next);
    this.onTouched();
  }
}

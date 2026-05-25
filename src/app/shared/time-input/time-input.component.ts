import {
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { AppIconComponent } from '../app-icon/app-icon.component';
import {
  clampHourPart,
  clampMinutePart,
  firstInputDigits,
  formatTimePartTyping,
  mergeTimeParts,
  normalizeTimeHHmm,
  splitTimeHHmm
} from './time-slot.util';

@Component({
  selector: 'app-time-input',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './time-input.component.html',
  styleUrl: './time-input.component.scss'
})
export class TimeInputComponent {
  readonly value = input.required<string>();
  readonly inputId = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Icono Material Symbols a la izquierda del campo. */
  readonly leadingIcon = input<string | undefined>(undefined);

  readonly valueChange = output<string>();

  readonly hourDraft = signal('');
  readonly minuteDraft = signal('');

  private readonly hourReplacePending = signal(false);
  private readonly minuteReplacePending = signal(false);

  private readonly minuteInputRef = viewChild<ElementRef<HTMLInputElement>>('minuteInput');

  readonly hourDisplay = computed(() => {
    const draft = this.hourDraft();
    if (draft) return draft;
    return splitTimeHHmm(this.value()).hours;
  });

  readonly minuteDisplay = computed(() => {
    const draft = this.minuteDraft();
    if (draft) return draft;
    return splitTimeHHmm(this.value()).minutes;
  });

  readonly hourInputId = computed(() => {
    const id = this.inputId();
    return id ? id : undefined;
  });

  readonly minuteInputId = computed(() => {
    const id = this.inputId();
    return id ? `${id}-min` : undefined;
  });

  onHourFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    const { hours } = splitTimeHHmm(this.value());
    this.hourDraft.set(hours);
    this.minuteDraft.set('');
    this.hourReplacePending.set(true);
    this.selectAll(el);
  }

  onMinuteFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    const { minutes } = splitTimeHHmm(this.value());
    this.minuteDraft.set(minutes);
    this.hourDraft.set('');
    this.minuteReplacePending.set(true);
    this.selectAll(el);
  }

  onHourKeydown(event: KeyboardEvent): void {
    if (!this.hourReplacePending()) return;
    const key = event.key;
    if (/^\d$/.test(key)) {
      event.preventDefault();
      this.hourReplacePending.set(false);
      this.hourDraft.set(key);
      this.emitIfComplete();
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.hourReplacePending.set(false);
      this.hourDraft.set('');
    }
  }

  onMinuteKeydown(event: KeyboardEvent): void {
    if (!this.minuteReplacePending()) return;
    const key = event.key;
    if (/^\d$/.test(key)) {
      event.preventDefault();
      this.minuteReplacePending.set(false);
      this.minuteDraft.set(key);
      this.emitIfComplete();
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.minuteReplacePending.set(false);
      this.minuteDraft.set('');
    }
  }

  onHourInput(raw: string): void {
    const digits = this.hourReplacePending()
      ? (this.hourReplacePending.set(false), firstInputDigits(this.hourDisplay(), raw))
      : formatTimePartTyping(raw);
    this.hourDraft.set(digits);
    this.emitIfComplete();
    if (digits.length === 2) {
      this.minuteInputRef()?.nativeElement.focus();
    }
  }

  onMinuteInput(raw: string): void {
    const digits = this.minuteReplacePending()
      ? (this.minuteReplacePending.set(false), firstInputDigits(this.minuteDisplay(), raw))
      : formatTimePartTyping(raw);
    this.minuteDraft.set(digits);
    this.emitIfComplete();
  }

  onHourBlur(): void {
    this.hourReplacePending.set(false);
    const hour = clampHourPart(this.hourDraft() || splitTimeHHmm(this.value()).hours);
    const minute = clampMinutePart(this.minuteDraft() || splitTimeHHmm(this.value()).minutes);
    this.commitParts(hour, minute);
  }

  onMinuteBlur(): void {
    this.minuteReplacePending.set(false);
    const hour = clampHourPart(this.hourDraft() || splitTimeHHmm(this.value()).hours);
    const minute = clampMinutePart(this.minuteDraft() || splitTimeHHmm(this.value()).minutes);
    this.commitParts(hour, minute);
  }

  private emitIfComplete(): void {
    const merged = mergeTimeParts(this.hourDisplay(), this.minuteDisplay());
    if (merged) {
      this.valueChange.emit(merged);
    }
  }

  private commitParts(hour: string, minute: string): void {
    const merged = normalizeTimeHHmm(`${hour}:${minute}`) || '08:00';
    this.hourDraft.set(hour);
    this.minuteDraft.set(minute);
    this.valueChange.emit(merged);
  }

  private selectAll(el: HTMLInputElement): void {
    queueMicrotask(() => {
      try {
        el.select();
      } catch {
        /* noop */
      }
    });
  }
}

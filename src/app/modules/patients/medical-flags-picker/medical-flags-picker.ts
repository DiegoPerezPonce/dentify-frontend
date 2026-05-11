import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  HostListener,
  computed,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  MEDICAL_FLAG_OPTIONS,
  MEDICAL_FLAG_CATEGORY_META,
  encodeCustomMedicalFlag,
  getMedicalFlagDisplayLabel,
  getMedicalFlagRiskLevel,
  CUSTOM_MEDICAL_LABEL_MAX,
  type MedicalFlagId,
  type MedicalFlagLevel,
  type MedicalFlagOption
} from '../medical-flags.constants';

const ADD_OTHER_LABEL: Record<MedicalFlagLevel, string> = {
  1: '+ Añadir otra enfermedad infecciosa…',
  2: '+ Añadir otra alergia…',
  3: '+ Añadir otra condición sistémica…'
};

@Component({
  selector: 'app-medical-flags-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-flags-picker.html',
  styleUrl: './medical-flags-picker.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MedicalFlagsPickerComponent),
      multi: true
    }
  ]
})
export class MedicalFlagsPickerComponent implements ControlValueAccessor {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly levels: MedicalFlagLevel[] = [1, 2, 3];
  readonly addOtherLabel = ADD_OTHER_LABEL;
  readonly customLabelMax = CUSTOM_MEDICAL_LABEL_MAX;

  readonly value = signal<string[]>([]);
  readonly disabled = signal(false);
  readonly panelOpen = signal(false);
  readonly filterText = signal('');
  readonly addingLevel = signal<MedicalFlagLevel | null>(null);
  readonly customDraft = signal('');
  readonly customAddError = signal<string | null>(null);

  private onChange: (v: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedSorted = computed(() => {
    const order = new Map<string, number>(MEDICAL_FLAG_OPTIONS.map((o, i) => [o.id, i]));
    const v = this.value();
    return [...v].sort((a, b) => {
      const la = getMedicalFlagRiskLevel(a);
      const lb = getMedicalFlagRiskLevel(b);
      if (la !== lb) {
        return (la ?? 9) - (lb ?? 9);
      }
      const pa = order.has(a) ? 0 : 1;
      const pb = order.has(b) ? 0 : 1;
      if (pa !== pb) {
        return pa - pb;
      }
      if (pa === 0) {
        return (order.get(a) ?? 0) - (order.get(b) ?? 0);
      }
      return getMedicalFlagDisplayLabel(a).localeCompare(getMedicalFlagDisplayLabel(b), 'es');
    });
  });

  readonly filteredByLevel = computed(() => {
    const q = normalizeSearch(this.filterText());
    const byLevel = (lvl: MedicalFlagLevel): MedicalFlagOption[] =>
      MEDICAL_FLAG_OPTIONS.filter((o) => {
        if (o.level !== lvl) return false;
        if (!q) return true;
        return (
          normalizeSearch(o.label).includes(q) || normalizeSearch(o.id).includes(q)
        );
      });
    return {
      1: byLevel(1),
      2: byLevel(2),
      3: byLevel(3)
    };
  });

  categoryMeta(lvl: MedicalFlagLevel) {
    return MEDICAL_FLAG_CATEGORY_META[lvl];
  }

  labelFor(id: string): string {
    return getMedicalFlagDisplayLabel(id);
  }

  chipLevel(id: string): MedicalFlagLevel | null {
    return getMedicalFlagRiskLevel(id);
  }

  isSelected(id: string): boolean {
    return this.value().includes(id);
  }

  writeValue(obj: string[] | null): void {
    const next = Array.isArray(obj) ? obj.filter((x): x is string => typeof x === 'string') : [];
    this.value.set(next);
  }

  registerOnChange(fn: (v: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  togglePanel(): void {
    if (this.disabled()) return;
    this.panelOpen.update((o) => !o);
    if (this.panelOpen()) {
      this.filterText.set('');
    } else {
      this.resetCustomAdd();
    }
  }

  openPanel(): void {
    if (this.disabled()) return;
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.filterText.set('');
    this.resetCustomAdd();
  }

  private resetCustomAdd(): void {
    this.addingLevel.set(null);
    this.customDraft.set('');
    this.customAddError.set(null);
  }

  onFilterInput(raw: string): void {
    this.filterText.set(raw);
    this.openPanel();
  }

  onCustomDraftInput(raw: string): void {
    this.customDraft.set(raw);
    this.customAddError.set(null);
  }

  startAddCustom(lvl: MedicalFlagLevel, ev: Event): void {
    ev.stopPropagation();
    if (this.disabled()) return;
    this.addingLevel.set(lvl);
    this.customDraft.set('');
    this.customAddError.set(null);
    this.openPanel();
  }

  cancelCustomAdd(ev: Event): void {
    ev.stopPropagation();
    this.resetCustomAdd();
  }

  confirmCustomAdd(ev: Event): void {
    ev.stopPropagation();
    if (ev instanceof KeyboardEvent) {
      ev.preventDefault();
    }
    if (this.disabled()) return;
    const lvl = this.addingLevel();
    if (!lvl) return;
    const code = encodeCustomMedicalFlag(lvl, this.customDraft());
    if (!code) {
      this.customAddError.set(
        `Escribe un nombre (1–${CUSTOM_MEDICAL_LABEL_MAX} caracteres) sin caracteres no válidos.`
      );
      return;
    }
    const cur = [...this.value()];
    if (cur.includes(code)) {
      this.customAddError.set('Esa condición ya está añadida.');
      return;
    }
    cur.push(code);
    this.value.set(cur);
    this.onChange(cur);
    this.onTouched();
    this.resetCustomAdd();
  }

  toggleFlag(id: MedicalFlagId): void {
    if (this.disabled()) return;
    const cur = [...this.value()];
    const i = cur.indexOf(id);
    if (i >= 0) {
      cur.splice(i, 1);
    } else {
      cur.push(id);
    }
    this.value.set(cur);
    this.onChange(cur);
    this.onTouched();
  }

  removeFlag(id: string, ev: Event): void {
    ev.stopPropagation();
    if (this.disabled()) return;
    const cur = this.value().filter((x) => x !== id);
    this.value.set(cur);
    this.onChange(cur);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.panelOpen()) return;
    const t = ev.target as Node | null;
    if (t && this.host.nativeElement.contains(t)) return;
    this.closePanel();
  }
}

function normalizeSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

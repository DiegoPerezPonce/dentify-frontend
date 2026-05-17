import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  ElementRef,
  forwardRef,
  inject,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  CatalogTreatment,
  findCatalogTreatmentInGroups,
  TreatmentCategoryGroup
} from '../models/clinical-catalog.models';

@Component({
  selector: 'app-treatment-catalog-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './treatment-catalog-picker.html',
  styleUrl: './treatment-catalog-picker.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TreatmentCatalogPickerComponent),
      multi: true
    }
  ]
})
export class TreatmentCatalogPickerComponent implements ControlValueAccessor, OnChanges {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() groups: TreatmentCategoryGroup[] = [];
  @Input() loading = false;
  @Input() placeholder = 'Buscar o elegir tratamiento…';

  /** Los @Input no disparan `computed`; usamos señal interna sincronizada en ngOnChanges. */
  private readonly groupsSignal = signal<TreatmentCategoryGroup[]>([]);

  readonly value = signal<number | null>(null);
  readonly disabled = signal(false);
  readonly panelOpen = signal(false);
  readonly filterText = signal('');

  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedTreatment = computed(() =>
    findCatalogTreatmentInGroups(this.groupsSignal(), this.value())
  );

  readonly displayLabel = computed(() => {
    const t = this.selectedTreatment();
    if (!t) return '';
    return `${t.categoryName}: ${t.name}`;
  });

  readonly filteredGroups = computed(() => {
    const groups = this.groupsSignal();
    const q = normalizeSearch(this.filterText());
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        treatments: g.treatments.filter(
          (t) =>
            normalizeSearch(t.name).includes(q) ||
            normalizeSearch(g.name).includes(q) ||
            normalizeSearch(t.dentistSpecialtyName).includes(q)
        )
      }))
      .filter((g) => g.treatments.length > 0);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['groups']) {
      this.groupsSignal.set(this.groups ?? []);
      this.syncValueWithGroups();
    }
  }

  writeValue(obj: number | null): void {
    const n = obj != null && !Number.isNaN(Number(obj)) ? Number(obj) : null;
    this.value.set(n);
    this.syncValueWithGroups();
  }

  private syncValueWithGroups(): void {
    const id = this.value();
    if (id == null) return;
    const found = findCatalogTreatmentInGroups(this.groupsSignal(), id);
    if (!found) {
      this.value.set(null);
      this.onChange(null);
    }
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  togglePanel(): void {
    if (this.disabled() || this.loading) return;
    this.panelOpen.update((o) => !o);
    if (this.panelOpen()) this.filterText.set('');
  }

  openPanel(): void {
    if (this.disabled() || this.loading) return;
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.filterText.set('');
  }

  onFilterInput(raw: string): void {
    this.filterText.set(raw);
    this.openPanel();
  }

  selectTreatment(t: CatalogTreatment): void {
    if (this.disabled()) return;
    this.value.set(t.id);
    this.onChange(t.id);
    this.onTouched();
    this.closePanel();
  }

  clearSelection(ev: Event): void {
    ev.stopPropagation();
    if (this.disabled()) return;
    this.value.set(null);
    this.onChange(null);
    this.onTouched();
  }

  isSelected(t: CatalogTreatment): boolean {
    return this.value() === t.id;
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

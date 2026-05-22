import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Icono Material Symbols (redondeado) alineado con la marca Dentify. */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [MatIconModule],
  template: `<mat-icon [fontSet]="fontSet()" [class]="iconClasses()">{{ name() }}</mat-icon>`,
  host: {
    class: 'app-icon',
    '[class]': 'hostSizeClass()'
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      vertical-align: middle;
      flex-shrink: 0;
    }
    mat-icon {
      overflow: visible;
    }
  `
})
export class AppIconComponent {
  /** Nombre del ligature Material Symbols (p. ej. dentistry, warning). */
  readonly name = input.required<string>();
  readonly size = input<AppIconSize>('md');
  readonly fontSet = input('material-symbols-rounded');
  /** Clases extra en el mat-icon (color, etc.). */
  readonly iconClass = input('');

  readonly hostSizeClass = computed(() => `app-icon--${this.size()}`);

  readonly iconClasses = computed(() => {
    const extra = this.iconClass().trim();
    return extra ? `app-icon__glyph ${extra}` : 'app-icon__glyph';
  });
}

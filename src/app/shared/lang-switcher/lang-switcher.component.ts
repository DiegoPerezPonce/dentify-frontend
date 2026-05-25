import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppLang, applyAppLang, isAppLang } from '../../core/i18n/translate-app.initializer';
import { AppIconComponent } from '../app-icon/app-icon.component';

const LANG_OPTIONS: ReadonlyArray<{ code: AppLang; labelKey: string }> = [
  { code: 'es', labelKey: 'LANG.ES' },
  { code: 'ca', labelKey: 'LANG.CA' },
  { code: 'en', labelKey: 'LANG.EN' }
];

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [TranslateModule, AppIconComponent],
  templateUrl: './lang-switcher.component.html',
  styleUrl: './lang-switcher.component.scss'
})
export class LangSwitcherComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);
  readonly currentLang = signal<AppLang>('es');
  readonly options = LANG_OPTIONS;

  readonly currentLabelKey = signal('LANG.ES');

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((ev) => {
      if (isAppLang(ev.lang)) {
        this.syncLang(ev.lang);
      }
    });
  }

  ngOnInit(): void {
    const initial = this.translate.currentLang;
    this.syncLang(isAppLang(initial) ? initial : 'es');
  }

  toggle(ev: MouseEvent): void {
    ev.stopPropagation();
    this.open.update((v) => !v);
  }

  select(code: AppLang): void {
    if (code === this.currentLang()) {
      this.open.set(false);
      return;
    }
    applyAppLang(this.translate, code);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  private syncLang(code: AppLang): void {
    this.currentLang.set(code);
    const opt = LANG_OPTIONS.find((o) => o.code === code);
    this.currentLabelKey.set(opt?.labelKey ?? 'LANG.ES');
  }
}

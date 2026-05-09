import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import {
  documentLangHtml,
  isAppLang,
  LANG_STORAGE_KEY
} from '../../../core/i18n/translate-app.initializer';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showPassword = false;
  isLoading = false;
  serverError = '';
  readonly sessionExpiredNotice = signal<string | null>(null);
  readonly currentLang = signal(this.translate.currentLang || 'es');

  loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((e) => this.currentLang.set(e.lang));
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  setLang(code: string): void {
    if (!isAppLang(code)) return;
    localStorage.setItem(LANG_STORAGE_KEY, code);
    document.documentElement.lang = documentLangHtml(code);
    void this.translate.use(code);
  }

  showError(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  isValid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.valid && control.touched);
  }

  ngOnInit(): void {
    this.currentLang.set(this.translate.currentLang || 'es');
    const motivo = this.route.snapshot.queryParamMap.get('motivo');
    if (motivo === 'sesion-expirada') {
      this.sessionExpiredNotice.set(this.translate.instant('AUTH.SESSION_EXPIRED'));
    }
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.serverError = '';

    const { identifier, password } = this.loginForm.getRawValue();

    const credentials = { login: identifier!, password: password! };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.serverError = this.translate.instant('AUTH.ERR_BAD_CREDENTIALS');
      }
    });
  }
}

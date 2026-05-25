import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../shared/app-icon/app-icon.component';
import { LangSwitcherComponent } from '../../../shared/lang-switcher/lang-switcher.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { getJwtThemeUserKey } from '../../../core/utils/jwt-roles';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    TranslateModule,
    AppIconComponent,
    LangSwitcherComponent
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private theme = inject(ThemeService);

  showPassword = false;
  isLoading = false;
  serverError = '';
  readonly sessionExpiredNotice = signal<string | null>(null);

  loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
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
    this.theme.applyLoginAppearance();
    document.documentElement.classList.add('login-no-scroll');
    document.body.classList.add('login-no-scroll');

    const motivo = this.route.snapshot.queryParamMap.get('motivo');
    if (motivo === 'sesion-expirada') {
      this.sessionExpiredNotice.set(this.translate.instant('AUTH.SESSION_EXPIRED'));
    }
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('login-no-scroll');
    document.body.classList.remove('login-no-scroll');
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
        const userKey = getJwtThemeUserKey(this.authService.getToken());
        if (userKey) {
          this.theme.restoreUserSession(userKey);
        }
        void this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.serverError = this.translate.instant('AUTH.ERR_BAD_CREDENTIALS');
      }
    });
  }
}

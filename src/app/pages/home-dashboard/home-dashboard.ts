import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { ROLE_ADMIN } from '../../core/utils/jwt-roles';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="page">
      <header class="head">
        <h1>{{ isAdmin() ? ('HOME.TITLE_ADMIN' | translate) : ('HOME.TITLE_USER' | translate) }}</h1>
        <p class="sub">
          {{ isAdmin() ? ('HOME.SUB_ADMIN' | translate) : ('HOME.SUB_USER' | translate) }}
        </p>
      </header>

      <div class="grid">
        <a class="card primary" routerLink="/app/pacientes">
          <span class="card-title">{{ 'HOME.CARD_PATIENTS' | translate }}</span>
          <span class="card-desc">{{ 'HOME.CARD_PATIENTS_DESC' | translate }}</span>
        </a>
        <a class="card" routerLink="/app/agenda">
          <span class="card-title">{{ 'HOME.CARD_SCHEDULE' | translate }}</span>
          <span class="card-desc">{{ 'HOME.CARD_SCHEDULE_DESC' | translate }}</span>
        </a>
        @if (isAdmin()) {
          <a class="card admin" routerLink="/app/admin/stock">
            <span class="card-title">{{ 'HOME.CARD_STOCK' | translate }}</span>
            <span class="card-desc">{{ 'HOME.CARD_STOCK_DESC' | translate }}</span>
          </a>
          <a class="card admin" routerLink="/app/admin/boxes">
            <span class="card-title">{{ 'HOME.CARD_BOXES' | translate }}</span>
            <span class="card-desc">{{ 'HOME.CARD_BOXES_DESC' | translate }}</span>
          </a>
        }
      </div>
    </div>
  `,
  styles: `
    .page {
      padding: 0.5rem 0 2rem;
    }
    .head h1 {
      font-family: Exo, system-ui, sans-serif;
      font-size: 1.5rem;
      color: #2c3e50;
      margin: 0 0 0.35rem;
    }
    .sub {
      font-family: 'Noto Sans', system-ui, sans-serif;
      color: #7f8c8d;
      margin: 0 0 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.25rem;
      border-radius: 14px;
      background: #fff;
      border: 1px solid #e1e8ed;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .card:hover {
      border-color: #00c6d7;
      box-shadow: 0 6px 20px rgba(0, 198, 215, 0.12);
    }
    .card.primary {
      background: linear-gradient(135deg, #e8f9fb 0%, #fff 100%);
      border-color: #b8ecf0;
    }
    .card.admin {
      border-left: 4px solid #00a8b8;
    }
    .card-title {
      font-family: Exo, system-ui, sans-serif;
      font-weight: 700;
      font-size: 1.05rem;
      color: #2c3e50;
    }
    .card-desc {
      font-family: 'Noto Sans', system-ui, sans-serif;
      font-size: 0.875rem;
      color: #7f8c8d;
    }
  `
})
export class HomeDashboardComponent {
  private auth = inject(AuthService);
  readonly isAdmin = () => this.auth.hasRole(ROLE_ADMIN);
}

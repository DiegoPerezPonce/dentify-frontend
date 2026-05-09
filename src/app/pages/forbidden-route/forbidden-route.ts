import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forbidden-route',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="wrap">
      <h1>{{ 'FORBIDDEN.TITLE' | translate }}</h1>
      <p>{{ 'FORBIDDEN.BODY' | translate }}</p>
      <a routerLink="/app/dashboard">{{ 'FORBIDDEN.BACK' | translate }}</a>
    </div>
  `,
  styles: `
    .wrap {
      padding: 2rem;
      font-family: 'Noto Sans', system-ui, sans-serif;
    }
    h1 {
      font-family: Exo, system-ui, sans-serif;
      color: #c0392b;
    }
    a {
      color: #00a8b8;
      font-weight: 600;
    }
  `
})
export class ForbiddenRouteComponent {}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-route',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Acceso no permitido</h1>
      <p>No tienes permisos para ver esta sección.</p>
      <a routerLink="/app/dashboard">Volver al inicio</a>
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

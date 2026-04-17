import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

/** Pantalla mínima hasta implementar cada módulo (issues #5–#26). */
@Component({
  selector: 'app-placeholder-route',
  standalone: true,
  template: `
    <div class="wrap">
      <h1>{{ pageTitle() }}</h1>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .wrap {
      padding: 1.5rem 2rem;
      max-width: 48rem;
    }
    h1 {
      font-family: Exo, system-ui, sans-serif;
      font-size: 1.35rem;
      color: #2c3e50;
      margin: 0 0 0.75rem;
    }
    .hint {
      font-family: 'Noto Sans', system-ui, sans-serif;
      color: #7f8c8d;
      margin: 0;
      line-height: 1.5;
    }
  `
})
export class PlaceholderRouteComponent {
  private route = inject(ActivatedRoute);

  readonly pageTitle = toSignal(
    this.route.data.pipe(map((d) => (d['pageTitle'] as string) ?? 'Dentify')),
    { initialValue: (this.route.snapshot.data['pageTitle'] as string) ?? 'Dentify' }
  );

  readonly hint = toSignal(
    this.route.data.pipe(map((d) => (d['hint'] as string) ?? '')),
    { initialValue: (this.route.snapshot.data['hint'] as string) ?? '' }
  );
}

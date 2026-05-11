import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { PatientAlertBannerComponent } from '../patient-alert-banner/patient-alert-banner';

@Component({
  selector: 'app-patient-clinical-shell',
  standalone: true,
  imports: [RouterOutlet, PatientAlertBannerComponent],
  templateUrl: './patient-clinical-shell.html',
  styleUrl: './patient-clinical-shell.scss'
})
export class PatientClinicalShellComponent {
  private route = inject(ActivatedRoute);

  /** Id de ruta (string): numérico o ausente en hijos. */
  readonly patientIdParam = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') }
  );

  readonly showAlertBanner = computed(() => {
    const id = this.patientIdParam();
    return id != null && id !== '' && id !== 'nuevo' && /^\d+$/.test(id);
  });

  readonly patientNumericId = computed(() => {
    const id = this.patientIdParam();
    if (!id || !/^\d+$/.test(id)) return null;
    return Number(id);
  });
}

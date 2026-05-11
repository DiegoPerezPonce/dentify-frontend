import { ActivatedRoute } from '@angular/router';

/**
 * Obtiene el parámetro `id` del paciente desde la ruta hija o padre
 * (rutas anidadas bajo `pacientes/:id`).
 */
export function getPacienteIdFromRoute(route: ActivatedRoute): string | null {
  const direct = route.snapshot.paramMap.get('id');
  if (direct) {
    return direct;
  }
  let parent: ActivatedRoute | null = route.parent;
  while (parent) {
    const id = parent.snapshot.paramMap.get('id');
    if (id) {
      return id;
    }
    parent = parent.parent;
  }
  return null;
}

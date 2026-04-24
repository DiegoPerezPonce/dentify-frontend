# Appointment Calendar Module (Issue #11)

## Descripción

Módulo de calendario de citas implementado con FullCalendar para visualizar y gestionar las citas de los pacientes.

## Características implementadas

- ✅ Integración de FullCalendar para Angular
- ✅ Vistas múltiples: Mes, Semana, Día y Lista
- ✅ Visualización de citas con colores según estado
- ✅ Arrastrar y soltar para reprogramar citas (drag & drop)
- ✅ Selección de fechas para crear nuevas citas
- ✅ Click en eventos para ver detalles
- ✅ Localización en español
- ✅ Horario laboral configurado (8:00 - 20:00)
- ✅ Servicio HTTP para comunicación con el backend
- ✅ Modelos TypeScript para Appointments

## Archivos creados

```
src/app/modules/appointments/
├── models/
│   └── appointment.models.ts          # DTOs y tipos
├── appointment-calendar/
│   ├── appointment-calendar.ts        # Componente principal
│   ├── appointment-calendar.html      # Template
│   └── appointment-calendar.scss      # Estilos
└── appointment.service.ts             # Servicio HTTP
```

## Endpoints del backend esperados

El servicio espera los siguientes endpoints en el backend:

- `GET /api/appointments` - Listar citas con filtros
- `GET /api/appointments/{id}` - Obtener cita por ID
- `POST /api/appointments` - Crear nueva cita
- `PUT /api/appointments/{id}` - Actualizar cita
- `DELETE /api/appointments/{id}` - Eliminar cita
- `POST /api/appointments/{id}/cancel` - Cancelar cita
- `POST /api/appointments/{id}/reschedule` - Reprogramar cita

## Estados de citas

- **SCHEDULED** (Programada): Azul (#3788d8)
- **CONFIRMED** (Confirmada): Verde (#28a745)
- **COMPLETED** (Completada): Gris (#6c757d)
- **CANCELLED** (Cancelada): Rojo (#dc3545)
- **NO_SHOW** (No asistió): Amarillo (#ffc107)

## Issues relacionados

- **Issue #11**: ✅ Calendario FullCalendar (COMPLETADO)
- **Issue #12**: ⏳ Gestión completa de citas (pendiente)
- **Issue #13**: ⏳ Filtros por Box y Dentista (pendiente)

## Funcionalidad pendiente (Issues #12 y #13)

Los siguientes issues añadirán:

1. **Issue #12 - Appointment Management**:
   - Formulario modal para crear/editar citas
   - Validación de disponibilidad
   - Respeto de gaps de 5 minutos
   - Manejo de pacientes infecciosos

2. **Issue #13 - Availability Selector**:
   - Filtros por Box
   - Filtros por Dentista
   - Vista de disponibilidad por recurso

## Uso del componente

El calendario está accesible en la ruta `/app/agenda` para usuarios con roles ROLE_USER o ROLE_ADMIN.

## Notas técnicas

- FullCalendar versión compatible con Angular 20
- Uso de signals de Angular para estado reactivo
- Standalone component (no requiere módulo)
- Lazy loading de la ruta
- Responsive design

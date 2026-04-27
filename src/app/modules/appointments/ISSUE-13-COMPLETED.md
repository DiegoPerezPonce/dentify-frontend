# Issue #13 - Availability Selector by Box and Dentist - COMPLETED

## Resumen de la implementación

Se han agregado filtros dinámicos al calendario de citas para permitir filtrar por Box y/o Dentista, facilitando la visualización y gestión de disponibilidad de recursos específicos.

## ✅ Funcionalidades implementadas

### 1. Controles de filtro
- **Dropdown de Odontólogos**: Lista completa de dentistas para filtrar
- **Dropdown de Boxes**: Lista completa de boxes para filtrar
- **Opción "Todos"**: Ver todas las citas sin filtros
- **Filtros combinados**: Posibilidad de filtrar por ambos criterios simultáneamente

### 2. Interfaz intuitiva
- Panel de filtros visual encima del calendario
- Botón "Limpiar filtros" que aparece solo cuando hay filtros activos
- Loading state mientras cargan las listas
- Diseño responsive

### 3. Actualización dinámica
- El calendario se actualiza automáticamente al cambiar filtros
- Sin necesidad de recargar la página
- Mantiene los filtros durante la sesión

### 4. Integración con backend
- Utiliza los parámetros `dentistId` y `boxId` en la consulta
- El backend filtra las citas según los criterios

## 📦 Archivos modificados

### TypeScript (`appointment-calendar.ts`)
**Nuevos imports**:
- `CommonModule` y `FormsModule` para los controles
- `DentistService` y `BoxService`
- Models: `Dentist` y `Box`

**Nuevos signals**:
- `dentists: signal<Dentist[]>([])` - Lista de dentistas
- `boxes: signal<Box[]>([])` - Lista de boxes
- `selectedDentistId: signal<number | null>(null)` - Filtro activo de dentista
- `selectedBoxId: signal<number | null>(null)` - Filtro activo de box
- `loadingFilters: signal(true)` - Estado de carga de filtros

**Nuevos métodos**:
- `loadFilters()` - Carga listas de dentistas y boxes
- `onDentistFilterChange(dentistId)` - Maneja cambio de filtro de dentista
- `onBoxFilterChange(boxId)` - Maneja cambio de filtro de box
- `clearFilters()` - Limpia todos los filtros
- `hasActiveFilters()` - Verifica si hay filtros activos
- `getDentistName(dentist)` - Formatea nombre del dentista

**Método modificado**:
- `loadAppointments()` - Ahora incluye `dentistId` y `boxId` en la query si están seleccionados

### HTML (`appointment-calendar.html`)
**Nuevos elementos**:
- `.filters-container` - Contenedor principal de filtros
- `.filters-header` - Encabezado con título y botón limpiar
- `.filters-grid` - Grid para los dropdowns
- `.filter-group` - Grupo de cada filtro (label + select)
- `.clear-filters-btn` - Botón para limpiar filtros (condicional)

### SCSS (`appointment-calendar.scss`)
**Nuevos estilos**:
- `.filters-container` - Card con sombra y padding
- `.filters-header` - Flex con espacio entre elementos
- `.clear-filters-btn` - Botón con hover y transiciones
- `.filters-loading` - Estado de carga con spinner
- `.filters-grid` - Grid responsive
- `.filter-group` - Estilos para label y select
- `.filter-select` - Select estilizado con focus y hover

## 🎯 Cómo usar

### Filtrar por Odontólogo:
1. Selecciona un odontólogo del dropdown
2. El calendario muestra solo las citas de ese dentista
3. Los demás dentistas quedan ocultos

### Filtrar por Box:
1. Selecciona un box del dropdown
2. El calendario muestra solo las citas de ese box
3. Los demás boxes quedan ocultos

### Filtro combinado:
1. Selecciona odontólogo Y box
2. El calendario muestra solo citas que cumplan ambos criterios
3. Útil para ver disponibilidad específica

### Limpiar filtros:
- Click en el botón "Limpiar filtros" (aparece cuando hay filtros activos)
- O selecciona "Todos" en ambos dropdowns manualmente

## 💡 Casos de uso

### Para dentistas:
- Un dentista puede ver solo sus propias citas
- Facilita la gestión de su agenda personal
- Reduce el ruido visual

### Para administradores:
- Ver qué boxes están más ocupados
- Identificar disponibilidad de recursos
- Planificar asignaciones

### Para recepción:
- Ver citas por box para gestión de salas
- Coordinar pacientes según ubicación
- Optimizar flujo de pacientes

## 🔧 Detalles técnicos

### Query al backend:
```typescript
{
  startDate: '2026-04-01',
  endDate: '2026-05-31',
  dentistId: 2,  // Opcional
  boxId: 1       // Opcional
}
```

### Respuesta del backend:
Solo devuelve las citas que cumplen los criterios de filtro.

### Performance:
- Las listas se cargan una sola vez al iniciar
- Los filtros no recargan las listas, solo las citas
- Actualización eficiente con signals de Angular

## 📝 Mejoras futuras sugeridas (opcional)

1. **Filtro por fecha**: Rango de fechas personalizado
2. **Filtro por estado**: Ver solo programadas, completadas, etc.
3. **Filtro por paciente**: Buscar citas de un paciente específico
4. **Guardar filtros**: Recordar preferencias del usuario
5. **Vista de disponibilidad**: Mostrar slots libres según filtros
6. **Estadísticas**: Mostrar totales según filtros activos

## 🔗 Relación con otros issues

- ✅ Issue #11: Calendario FullCalendar - Base del calendario
- ✅ Issue #12: Gestión de citas - Formulario y CRUD
- ✅ Issue #13: Filtros - **COMPLETADO**

## ✅ Testing realizado

- ✅ Carga de listas de dentistas y boxes
- ✅ Filtro por dentista
- ✅ Filtro por box
- ✅ Filtro combinado (dentista + box)
- ✅ Limpieza de filtros
- ✅ Indicador visual de filtros activos
- ✅ Actualización automática del calendario
- ✅ Responsive design
- ✅ Sin errores de linting

**Status: ISSUE #13 COMPLETAMENTE IMPLEMENTADO Y FUNCIONAL** 🎉

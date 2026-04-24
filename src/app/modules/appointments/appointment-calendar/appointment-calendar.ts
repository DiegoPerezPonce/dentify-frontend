import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  DateSelectArg,
  EventClickArg,
  EventInput,
  EventApi
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { AppointmentService } from '../appointment.service';
import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './appointment-calendar.html',
  styleUrl: './appointment-calendar.scss'
})
export class AppointmentCalendarComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridWeek',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Lista'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    height: 'auto',
    contentHeight: 'auto'
  };

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.error.set(null);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    this.appointmentService
      .list({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      })
      .subscribe({
        next: (res) => {
          this.appointments.set(res.items);
          this.updateCalendarEvents(res.items);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.appointments.set([]);
          this.loading.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
  }

  private updateCalendarEvents(appointments: Appointment[]): void {
    const events: EventInput[] = appointments.map((apt) => ({
      id: String(apt.id),
      title: this.getEventTitle(apt),
      start: apt.startDateTime,
      end: apt.endDateTime,
      backgroundColor: this.getEventColor(apt.status),
      borderColor: this.getEventColor(apt.status),
      extendedProps: {
        appointment: apt
      }
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  private getEventTitle(apt: Appointment): string {
    const parts: string[] = [];
    if (apt.patientName) {
      parts.push(apt.patientName);
    }
    if (apt.treatment) {
      parts.push(`- ${apt.treatment}`);
    }
    return parts.join(' ') || 'Cita sin datos';
  }

  private getEventColor(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return '#3788d8';
      case AppointmentStatus.CONFIRMED:
        return '#28a745';
      case AppointmentStatus.COMPLETED:
        return '#6c757d';
      case AppointmentStatus.CANCELLED:
        return '#dc3545';
      case AppointmentStatus.NO_SHOW:
        return '#ffc107';
      default:
        return '#3788d8';
    }
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    console.log('Nueva cita seleccionada:', {
      start: selectInfo.startStr,
      end: selectInfo.endStr
    });

    // TODO: Abrir modal o formulario para crear nueva cita
    // Por ahora solo mostramos un mensaje
    alert(`Crear cita desde ${selectInfo.startStr} hasta ${selectInfo.endStr}`);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const appointment = clickInfo.event.extendedProps['appointment'] as Appointment;
    console.log('Cita clickeada:', appointment);

    // TODO: Abrir modal o navegar a detalle de cita
    // Por ahora mostramos detalles básicos
    const message = `
Cita #${appointment.id}
Paciente: ${appointment.patientName || 'N/A'}
Odontólogo: ${appointment.dentistName || 'N/A'}
Tratamiento: ${appointment.treatment || 'N/A'}
Estado: ${appointment.status}
    `;
    
    if (confirm(`${message}\n\n¿Desea gestionar esta cita?`)) {
      // Aquí podríamos navegar a un componente de detalle
      // this.router.navigate(['/app/agenda', appointment.id]);
    }
  }

  handleEvents(events: EventApi[]): void {
    // Este método se llama cuando cambian los eventos
    // Útil para debugging o sincronización
  }

  handleEventDrop(info: any): void {
    const appointment = info.event.extendedProps['appointment'] as Appointment;
    const newStart = info.event.start;

    if (!newStart) {
      info.revert();
      return;
    }

    console.log('Reprogramando cita:', appointment.id, 'a', newStart.toISOString());

    // TODO: Llamar al backend para reprogramar
    this.appointmentService.reschedule(appointment.id, newStart.toISOString()).subscribe({
      next: () => {
        console.log('Cita reprogramada exitosamente');
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error al reprogramar cita:', err);
        info.revert();
        alert('Error al reprogramar la cita. Intente nuevamente.');
      }
    });
  }

  handleEventResize(info: any): void {
    const appointment = info.event.extendedProps['appointment'] as Appointment;
    const newEnd = info.event.end;

    if (!newEnd) {
      info.revert();
      return;
    }

    console.log('Redimensionando cita:', appointment.id, 'nueva duración hasta', newEnd.toISOString());

    // TODO: Implementar actualización de duración
    // Por ahora solo revertimos
    info.revert();
    alert('La modificación de duración aún no está implementada.');
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'El servidor rechazó el token (401). Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permiso para ver las citas (403).';
      }
      if (err.status === 0) {
        return 'No hay conexión con el API. Comprueba que el backend esté en marcha.';
      }
      return `Error al cargar citas (HTTP ${err.status}). Revisa el API.`;
    }
    return 'No se pudo cargar el calendario de citas.';
  }
}

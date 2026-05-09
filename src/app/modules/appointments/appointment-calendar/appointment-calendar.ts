import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../appointment.service';
import { DentistService } from '../dentist.service';
import { BoxService } from '../../boxes/box.service';
import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { Dentist } from '../models/dentist.models';
import { Box } from '../../boxes/models/box.models';
import { HttpErrorResponse } from '@angular/common/http';
import { AppointmentFormModalComponent } from '../appointment-form-modal/appointment-form-modal';

export type AgendaLayoutView = 'day' | 'week';

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, AppointmentFormModalComponent],
  templateUrl: './appointment-calendar.html',
  styleUrl: './appointment-calendar.scss'
})
export class AppointmentCalendarComponent implements OnInit {
  readonly AppointmentStatus = AppointmentStatus;

  private appointmentService = inject(AppointmentService);
  private dentistService = inject(DentistService);
  private boxService = inject(BoxService);

  @ViewChild('fullCalendar') fullCalendar?: FullCalendarComponent;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);

  readonly dentists = signal<Dentist[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly selectedDentistId = signal<number | null>(null);
  readonly selectedBoxId = signal<number | null>(null);
  readonly loadingFilters = signal(true);

  readonly showModal = signal(false);
  readonly selectedAppointment = signal<Appointment | null>(null);
  readonly preselectedStart = signal<string | null>(null);
  readonly preselectedEnd = signal<string | null>(null);

  /** Mes mostrado en el mini calendario (siempre día 1, hora local). */
  readonly displayMonthStart = signal(this.startOfMonth(new Date()));
  /** Día seleccionado para la lista (YYYY-MM-DD local). */
  readonly selectedDate = signal(this.toYmd(new Date()));
  /** Vista día (mini + lista) o semana (FullCalendar). */
  readonly agendaView = signal<AgendaLayoutView>('day');

  readonly weekdayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'] as const;

  readonly monthTitle = computed(() => {
    const d = this.displayMonthStart();
    const raw = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  readonly miniCalendarCells = computed(() => {
    const ref = this.displayMonthStart();
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const selected = this.selectedDate();
    const first = new Date(y, m, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(y, m, 1 - mondayOffset);
    const todayYmd = this.toYmd(new Date());
    const cells: {
      ymd: string;
      dayLabel: number;
      inMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const ymd = this.toYmd(d);
      cells.push({
        ymd,
        dayLabel: d.getDate(),
        inMonth: d.getMonth() === m,
        isToday: ymd === todayYmd,
        isSelected: ymd === selected
      });
    }
    return cells;
  });

  readonly appointmentsForSelectedDay = computed(() => {
    const ymd = this.selectedDate();
    return this.appointments()
      .filter((a) => this.appointmentLocalYmd(a) === ymd)
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      );
  });

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
    this.loadFilters();
    this.loadAppointments();
  }

  setAgendaView(view: AgendaLayoutView): void {
    this.agendaView.set(view);
    if (view === 'week') {
      queueMicrotask(() => {
        const api = this.fullCalendar?.getApi();
        if (api) {
          api.gotoDate(this.parseLocalYmd(this.selectedDate()));
        }
      });
    }
  }

  prevMiniMonth(): void {
    const d = this.displayMonthStart();
    const next = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    this.displayMonthStart.set(next);
    if (!this.ymdFallsInMonth(this.selectedDate(), next)) {
      this.selectedDate.set(this.toYmd(next));
    }
    this.loadAppointments();
  }

  nextMiniMonth(): void {
    const d = this.displayMonthStart();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    this.displayMonthStart.set(next);
    if (!this.ymdFallsInMonth(this.selectedDate(), next)) {
      this.selectedDate.set(this.toYmd(next));
    }
    this.loadAppointments();
  }

  selectMiniDay(ymd: string, inMonth: boolean): void {
    if (!inMonth) {
      const parsed = this.parseLocalYmd(ymd);
      this.displayMonthStart.set(this.startOfMonth(parsed));
      this.loadAppointments();
    }
    this.selectedDate.set(ymd);
  }

  goToToday(): void {
    const t = new Date();
    this.displayMonthStart.set(this.startOfMonth(t));
    this.selectedDate.set(this.toYmd(t));
    this.loadAppointments();
  }

  formatSelectedDayHeading(): string {
    const d = this.parseLocalYmd(this.selectedDate());
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  statusLabel(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'Programada';
      case AppointmentStatus.CONFIRMED:
        return 'Confirmada';
      case AppointmentStatus.COMPLETED:
        return 'Completada';
      case AppointmentStatus.CANCELLED:
        return 'Cancelada';
      case AppointmentStatus.NO_SHOW:
        return 'No asistió';
      default:
        return status;
    }
  }

  statusPillClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'day-row__pill day-row__pill--confirmed';
      case AppointmentStatus.COMPLETED:
        return 'day-row__pill day-row__pill--completed';
      case AppointmentStatus.CANCELLED:
        return 'day-row__pill day-row__pill--cancelled';
      case AppointmentStatus.NO_SHOW:
        return 'day-row__pill day-row__pill--noshow';
      case AppointmentStatus.SCHEDULED:
      default:
        return 'day-row__pill day-row__pill--scheduled';
    }
  }

  openInsertAppointment(): void {
    const ymd = this.selectedDate();
    this.preselectedStart.set(`${ymd}T09:00`);
    this.preselectedEnd.set(`${ymd}T09:30`);
    this.selectedAppointment.set(null);
    this.showModal.set(true);
  }

  openAppointmentDetail(apt: Appointment): void {
    this.selectedAppointment.set(apt);
    this.preselectedStart.set(null);
    this.preselectedEnd.set(null);
    this.showModal.set(true);
  }

  loadFilters(): void {
    this.loadingFilters.set(true);

    Promise.all([
      this.dentistService.list().toPromise(),
      this.boxService.list().toPromise()
    ])
      .then(([dentists, boxes]) => {
        this.dentists.set(dentists?.items || []);
        this.boxes.set(boxes?.items || []);
        this.loadingFilters.set(false);
      })
      .catch((err) => {
        console.error('Error loading filters:', err);
        this.loadingFilters.set(false);
      });
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.error.set(null);

    const ref = this.displayMonthStart();
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const query: Record<string, string | number> = {
      startDate: this.toYmd(start),
      endDate: this.toYmd(end)
    };

    const dentistId = this.selectedDentistId();
    const boxId = this.selectedBoxId();

    if (dentistId) {
      query['dentistId'] = dentistId;
    }
    if (boxId) {
      query['boxId'] = boxId;
    }

    this.appointmentService.list(query).subscribe({
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

    this.preselectedStart.set(selectInfo.startStr);
    this.preselectedEnd.set(selectInfo.endStr);
    this.selectedAppointment.set(null);
    this.showModal.set(true);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const appointment = clickInfo.event.extendedProps['appointment'] as Appointment;
    this.openAppointmentDetail(appointment);
  }

  handleEvents(_events: EventApi[]): void {}

  handleEventDrop(info: { revert: () => void; event: { extendedProps: Record<string, unknown> } }): void {
    info.revert();
    const appointment = info.event.extendedProps['appointment'] as Appointment;
    this.openAppointmentDetail(appointment);
  }

  handleEventResize(info: { revert: () => void; event: { extendedProps: Record<string, unknown> } }): void {
    info.revert();
    const appointment = info.event.extendedProps['appointment'] as Appointment;
    this.openAppointmentDetail(appointment);
  }

  onModalClose(): void {
    this.showModal.set(false);
    this.selectedAppointment.set(null);
    this.preselectedStart.set(null);
    this.preselectedEnd.set(null);
  }

  onAppointmentSaved(_appointment: Appointment): void {
    this.loadAppointments();
  }

  onDeleteAppointment(appointment: Appointment): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      return;
    }

    this.appointmentService.delete(appointment.id).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error al eliminar cita:', err);
        alert('Error al eliminar la cita. Intenta nuevamente.');
      }
    });
  }

  onCancelAppointment(appointment: Appointment): void {
    if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      return;
    }

    this.appointmentService.cancel(appointment.id).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error al cancelar cita:', err);
        alert('Error al cancelar la cita. Intenta nuevamente.');
      }
    });
  }

  onDentistFilterChange(dentistId: string): void {
    this.selectedDentistId.set(dentistId ? Number(dentistId) : null);
    this.loadAppointments();
  }

  onBoxFilterChange(boxId: string): void {
    this.selectedBoxId.set(boxId ? Number(boxId) : null);
    this.loadAppointments();
  }

  clearFilters(): void {
    this.selectedDentistId.set(null);
    this.selectedBoxId.set(null);
    this.loadAppointments();
  }

  hasActiveFilters(): boolean {
    return this.selectedDentistId() !== null || this.selectedBoxId() !== null;
  }

  getDentistName(dentist: Dentist): string {
    return `${dentist.nombre} ${dentist.apellidos}`.trim();
  }

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseLocalYmd(ymd: string): Date {
    const [y, mo, da] = ymd.split('-').map((x) => Number(x));
    return new Date(y, mo - 1, da);
  }

  /** Comprueba si `ymd` pertenece al mismo año/mes que `monthStart` (día 1). */
  private ymdFallsInMonth(ymd: string, monthStart: Date): boolean {
    const d = this.parseLocalYmd(ymd);
    return d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthStart.getMonth();
  }

  /** Fecha local (YYYY-MM-DD) del inicio de la cita. */
  private appointmentLocalYmd(apt: Appointment): string {
    return this.toYmd(new Date(apt.startDateTime));
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

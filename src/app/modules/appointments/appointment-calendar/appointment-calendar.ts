import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  templateUrl: './appointment-calendar.html',
  styleUrl: './appointment-calendar.scss'
})
export class AppointmentCalendarComponent {
  calendarVisible = signal(true);
  
  // Modal state
  isModalOpen = signal(false);
  appointmentForm = {
    title: '',
    date: '',
    time: '10:00',
    allDay: false,
    selectInfo: null as DateSelectArg | null
  };

  calendarOptions = signal<CalendarOptions>({
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin,
    ],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    initialView: 'dayGridMonth',
    weekends: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    defaultTimedEventDuration: '00:35:00',
    slotDuration: '00:05:00',
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    /* you can update a remote database when these fire:
    eventAdd:
    eventChange:
    eventRemove:
    */
    events: [
      { title: 'Cita: Juan Pérez', start: new Date().toISOString().replace(/T.*$/, '') + 'T10:00:00', end: new Date().toISOString().replace(/T.*$/, '') + 'T11:00:00' },
      { title: 'Cita: Maria Garcia', start: new Date().toISOString().replace(/T.*$/, '') + 'T12:00:00' }
    ]
  });

  currentEvents = signal<EventApi[]>([]);

  handleDateSelect(selectInfo: DateSelectArg) {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection

    const startDate = new Date(selectInfo.start);
    const dateStr = selectInfo.startStr.split('T')[0];
    const timeStr = selectInfo.startStr.includes('T') 
      ? selectInfo.startStr.split('T')[1].substring(0, 5) 
      : '10:00';

    this.appointmentForm = {
      title: '',
      date: dateStr,
      time: timeStr,
      allDay: selectInfo.allDay,
      selectInfo: selectInfo
    };
    
    this.isModalOpen.set(true);
  }

  saveAppointment() {
    const data = this.appointmentForm;
    if (!data.title) return;

    const calendarApi = data.selectInfo?.view.calendar;
    if (calendarApi) {
      const start = new Date(`${data.date}T${data.time}:00`);
      
      if (this.hasConflict(start)) {
        alert('Conflicto de horario: Ya existe una cita en un intervalo menor a 35 minutos.');
        return;
      }

      calendarApi.addEvent({
        id: createEventId(),
        title: data.title,
        start: start.toISOString(),
        allDay: false 
      });
    }
    
    this.closeModal();
  }

  private hasConflict(newStart: Date, excludeEventId?: string): boolean {
    const calendarApi = this.appointmentForm.selectInfo?.view.calendar;
    if (!calendarApi) return false;

    const events = calendarApi.getEvents();
    const minIntervalMs = 35 * 60 * 1000;

    for (const event of events) {
      if (event.id === excludeEventId || !event.start) continue;

      const diff = Math.abs(newStart.getTime() - event.start.getTime());
      if (diff < minIntervalMs) {
        return true;
      }
    }

    return false;
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  handleEventClick(clickInfo: EventClickArg) {
    if (confirm(`¿Estás seguro de que quieres eliminar la cita '${clickInfo.event.title}'?`)) {
      clickInfo.event.remove();
    }
  }

  handleEventDrop(dropInfo: any) {
    if (this.hasConflict(dropInfo.event.start, dropInfo.event.id)) {
      alert('Conflicto de horario: Las citas deben tener al menos 35 minutos de diferencia.');
      dropInfo.revert();
    } else {
      console.log('Evento movido:', dropInfo.event.title, 'a', dropInfo.event.start);
    }
  }

  handleEventResize(resizeInfo: any) {
    // Note: resizing usually affects end time, but if the constraint is 35m interval between starts,
    // resizing the start would trigger this too if FullCalendar supports start-resize.
    if (resizeInfo.event.start && this.hasConflict(resizeInfo.event.start, resizeInfo.event.id)) {
      alert('Conflicto de horario: Las citas deben tener al menos 35 minutos de diferencia.');
      resizeInfo.revert();
    }
  }

  handleEvents(events: EventApi[]) {
    this.currentEvents.set(events);
  }
}

let eventGuid = 0;
function createEventId() {
  return String(eventGuid++);
}

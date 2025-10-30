import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de'; // Deutsche Lokalisierung für Moment.js
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './SharedCalendar.css'; // Hier kommt unser benutzerdefiniertes CSS rein

// Deutsche Lokalisierung für den Kalender selbst
moment.locale('de');
const localizer = momentLocalizer(moment);

const messages = {
  allDay: 'Ganztägig',
  previous: 'Zurück',
  next: 'Weiter',
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Liste',
  date: 'Datum',
  time: 'Zeit',
  event: 'Termin',
  noEventsInRange: 'Keine Termine in diesem Zeitraum.',
  showMore: (total: number) => `+ ${total} weitere`,
};

interface SharedCalendarProps {
  events: any[];
  defaultView?: View;
  onSelectEvent?: (event: any) => void;
  // Weitere Props nach Bedarf, z.B. für Drag-and-Drop
}

const SharedCalendar: React.FC<SharedCalendarProps> = ({ events, defaultView = Views.WEEK, onSelectEvent }) => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(defaultView);

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const handleView = useCallback((newView: View) => setView(newView), [setView]);

  // Hier können wir die verfügbaren Ansichten steuern, z.B. basierend auf der User-Rolle
  const availableViews = useMemo(() => ({
      month: true,
      week: true,
      day: true,
      agenda: true,
  }), []);

  return (
    <div style={{ height: 'calc(100vh - 200px)' /* Höhe anpassen */ }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ flex: 1 }}
        messages={messages}
        date={date}
        view={view}
        onNavigate={handleNavigate}
        onView={handleView}
        onSelectEvent={onSelectEvent}
        views={availableViews}
        // Weitere Props für Styling und Funktionalität
        dayLayoutAlgorithm="no-overlap"
      />
    </div>
  );
};

export default SharedCalendar;
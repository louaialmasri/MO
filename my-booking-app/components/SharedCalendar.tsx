'use client'

import React from 'react'
import {
  Calendar as RBCalendar,
  Views,
  DateLocalizer,
  View,
  Components,
  EventProps,
  momentLocalizer,
} from 'react-big-calendar'
import moment from 'moment'
import withDragAndDrop, {
  withDragAndDropProps,
} from 'react-big-calendar/lib/addons/dragAndDrop'
import 'moment/locale/de'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
// Wir importieren das globale Styling direkt hier
import '../app/admin/calendar-custom.css'

import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Avatar,
  Paper,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import EventNoteIcon from '@mui/icons-material/EventNote' // Icon für Termine

// --- LOKALISIERUNG ---
moment.locale('de')
export const localizer = momentLocalizer(moment)

export const messages = {
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
}

// --- KALENDER-KOMPONENTEN (INTERN) ---

// Eigene Toolbar-Komponente (Das UX-Upgrade)
const CustomToolbar: React.FC<any> = ({
  label,
  view,
  views,
  onNavigate,
  onView,
  date,
}) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}
    >
      {/* Linke Seite: Navigation */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title="Zurück">
          <IconButton
            size="small"
            onClick={() => onNavigate('PREV')}
            aria-label="Zurück"
          >
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          size="small"
          startIcon={<TodayIcon />}
          onClick={() => onNavigate('TODAY')}
          sx={{
            bgcolor: 'primary.main', // Deine Akzentfarbe
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Heute
        </Button>
        <Tooltip title="Weiter">
          <IconButton
            size="small"
            onClick={() => onNavigate('NEXT')}
            aria-label="Weiter"
          >
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Mitte: Aktuelles Datum/Zeitraum */}
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ textAlign: 'center', flexGrow: 1 }}
      >
        {label}
      </Typography>

      {/* Rechts: Ansicht-Umschalter */}
      <ButtonGroup
        variant="outlined"
        size="small"
        aria-label="Ansicht auswählen"
      >
        {views.includes(Views.MONTH) && (
          <Button
            onClick={() => onView(Views.MONTH)}
            variant={view === Views.MONTH ? 'contained' : 'outlined'}
          >
            Monat
          </Button>
        )}
        {views.includes(Views.WEEK) && (
          <Button
            onClick={() => onView(Views.WEEK)}
            variant={view === Views.WEEK ? 'contained' : 'outlined'}
          >
            Woche
          </Button>
        )}
        {views.includes(Views.DAY) && (
          <Button
            onClick={() => onView(Views.DAY)}
            variant={view === Views.DAY ? 'contained' : 'outlined'}
          >
            Tag
          </Button>
        )}
        {views.includes(Views.AGENDA) && (
          <Button
            onClick={() => onView(Views.AGENDA)}
            variant={view === Views.AGENDA ? 'contained' : 'outlined'}
          >
            Liste
          </Button>
        )}
      </ButtonGroup>
    </Stack>
  )
}

// Eigener Event-Stil (Dein Code aus Staff-Dashboard, jetzt zentral)
const EventContent: React.FC<EventProps<any>> = ({ event }) => {
  const serviceName = event.booking?.service?.title || event.title || 'Termin'
  const clientName =
    `${event.booking?.user?.firstName || ''} ${
      event.booking?.user?.lastName || ''
    }`.trim() ||
    event.booking?.user?.email ||
    'Kunde'

  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', gap: 1 }}>
      <EventNoteIcon sx={{ fontSize: '1rem', opacity: 0.8, mt: '2px' }} />
      <Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {clientName}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          {serviceName}
        </Typography>
      </Box>
    </Box>
  )
}

// Eigener Header für Ressourcen (Dein Code aus Admin-Seite, jetzt zentral)
const ResourceHeader: React.FC<{ resource: any; staffColors: Map<string, string> }> = ({ resource, staffColors }) => {
  const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
  
  return (
     <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.5, px: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Avatar sx={{ bgcolor: staffColors.get(resource.id), width: 40, height: 40, fontSize: '1rem' }}>
        {getInitials(resource.title)}
      </Avatar>
      <Typography variant="body1" fontWeight={600} noWrap>{resource.title}</Typography>
    </Stack>
  )
};

// --- DIE HAUPTKOMPONENTE ---

// Erstellen des Drag-and-Drop-fähigen Kalenders
const DnDCalendar = withDragAndDrop(RBCalendar as any)

interface BookingCalendarProps {
  events: any[]
  resources: any[]
  view: View
  date: Date
  onNavigate: (newDate: Date) => void
  onView: (newView: View) => void
  onSelectEvent: (event: any) => void
  onEventDrop: withDragAndDropProps['onEventDrop']
  onSelectSlot?: (slotInfo: any) => void
  min: Date
  max: Date
  staffColors: Map<string, string>
}

export default function BookingCalendar({
  events,
  resources,
  view,
  date,
  onNavigate,
  onView,
  onSelectEvent,
  onEventDrop,
  onSelectSlot,
  min,
  max,
  staffColors,
}: BookingCalendarProps) {

  // Definiere die Komponenten, die wir überschreiben wollen
  const components: Components = {
    toolbar: CustomToolbar, // Unsere neue MUI-Toolbar
    event: EventContent, // Unser Event-Design
    // Wir rendern den Ressourcen-Header nur, wenn Ressourcen vorhanden sind
    resourceHeader: resources.length > 0
      ? (props) => <ResourceHeader {...props} staffColors={staffColors} />
      : undefined,
  }

  // Event-Styling-Funktion
  const eventStyleGetter = (event: any) => {
    const color = staffColors.get(event.resourceId) || '#8D6E63' // Fallback-Farbe
    const style: React.CSSProperties = {
      backgroundColor: color,
      borderColor: color,
      color: 'white',
      borderRadius: 6,
      paddingLeft: 6,
      opacity: event.booking?.status === 'paid' ? 0.6 : 1, // Bezahlte Termine ausgrauen
      border: event.booking?.status === 'paid' ? '1px dashed #fff' : 'none',
    }
    return { style }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 0.5, sm: 1, md: 2 }, // Weniger Padding auf Mobilgeräten
        borderRadius: 2,
        // Responsive Höhe: 
        // 110px Navbar + 64px Breadcrumbs/Titel + 48px Padding = ~222px
        height: 'calc(100vh - 225px)', 
        minHeight: 600,
        backgroundColor: 'background.paper',
      }}
    >
      <DnDCalendar
        localizer={localizer}
        messages={messages}
        components={components}
        events={events}
        resources={resources}
        resourceIdAccessor="id"
        resourceTitleAccessor="title"
        step={15} // 15-Minuten-Raster
        timeslots={4} // 4 Slots pro Stunde
        selectable
        // === ZUSTANDSSTEUERUNG (jetzt funktional) ===
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={onView}
        // === ENDE ZUSTANDSSTEUERUNG ===
        onSelectEvent={onSelectEvent}
        onEventDrop={onEventDrop}
        onSelectSlot={onSelectSlot}
        resizable
        min={min}
        max={max}
        eventPropGetter={eventStyleGetter}
        dayLayoutAlgorithm="no-overlap" // Verhindert überlappende Events
      />
    </Paper>
  )
}

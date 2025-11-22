'use client'

import React from 'react'
import {
  Calendar as RBCalendar,
  Views,
  DateLocalizer, // Beibehalten für Prop-Typ
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
import EventNoteIcon from '@mui/icons-material/EventNote'

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

const CustomToolbar: React.FC<any> = ({
  label,
  view,
  views,
  onNavigate,
  onView,
}) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}
    >
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
            bgcolor: 'primary.main',
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
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ textAlign: 'center', flexGrow: 1 }}
      >
        {label}
      </Typography>
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

const EventContent: React.FC<EventProps<any>> = ({ event }) => {
  const serviceName = event.booking?.service?.title || event.title || 'Termin'
  const clientName =
    `${event.booking?.user?.firstName || ''} ${
      event.booking?.user?.lastName || ''
    }`.trim() ||
    event.booking?.user?.email ||
    'Kunde'
  
  // Zeit formatieren
  const timeRange = `${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}`;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'flex-start', // Startet oben
      height: '100%',
      overflow: 'hidden',
      pt: 0.5 // Kleines Padding oben
    }}>
      {/* 1. ZEILE: Name des Kunden (Extra Fett) */}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700, // 700 = Bold
          lineHeight: 1.2,
          mb: 0.5, // Kleiner Abstand nach unten
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {clientName}
      </Typography>
      
      {/* 2. ZEILE: Dienstleistung und Uhrzeit (Nebeneinander) */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ width: '100%' }}
      >
        {/* Dienstleistung (links) */}
        <Typography
          variant="caption"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            mr: 1, // Abstand zur Uhrzeit
            opacity: 0.9
          }}
        >
          <EventNoteIcon sx={{ fontSize: '0.7rem', mr: 0.3, verticalAlign: 'text-bottom' }} />
          {serviceName}
        </Typography>

        {/* Uhrzeit (rechts) */}
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 'bold', 
            whiteSpace: 'nowrap',
            fontSize: '0.75rem' // Etwas kleiner, damit es gut passt
          }}
        >
          {timeRange}
        </Typography>
      </Stack>
    </Box>
  )
}

const ResourceHeader: React.FC<{ resource: any; staffColors: Map<string, string> }> = ({ resource, staffColors }) => {
  const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
  
  return (
     <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, px: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Avatar sx={{ bgcolor: staffColors.get(resource.id), width: 40, height: 40, fontSize: '1rem' }}>
        {getInitials(resource.title)}
      </Avatar>
      <Typography variant="body1" fontWeight={600} noWrap>{resource.title}</Typography>
    </Stack>
  )
};

const DnDCalendar = withDragAndDrop(RBCalendar as any)

// FIX 1: TypeScript-Fehler beheben
// Die Props `localizer` und `messages` wurden der Komponente übergeben,
// waren aber hier nicht im Interface deklariert. Das ist jetzt korrigiert.
export interface BookingCalendarProps {
  localizer: DateLocalizer; // HINZUGEFÜGT
  messages: any; // HINZUGEFÜGT
  events: any[]
  resources: any[]
  view: View
  date: Date
  onNavigate: (newDate: Date | 'TODAY' | 'PREV' | 'NEXT') => void // Typ angepasst
  onView: (newView: View) => void
  onDoubleClickEvent?: (event: any) => void // NEU: Prop für Doppelklick
  onEventDrop: withDragAndDropProps['onEventDrop']
  onSelectSlot?: (slotInfo: any) => void
  min: Date
  max: Date
  staffColors: Map<string, string>
}

export default function BookingCalendar({
  // Props werden jetzt korrekt übergeben
  localizer,
  messages,
  events,
  resources,
  view,
  date,
  onNavigate,
  onView,
  onDoubleClickEvent,
  onEventDrop,
  onSelectSlot,
  min,
  max,
  staffColors,
}: BookingCalendarProps) {

  const components: Components = {
    toolbar: CustomToolbar,
    event: EventContent,
    resourceHeader: resources.length > 0
      ? (props) => <ResourceHeader {...props} staffColors={staffColors} />
      : undefined,
  }

  const eventStyleGetter = (event: any) => {
    const color = staffColors.get(event.resourceId) || '#8D6E63'
    const style: React.CSSProperties = {
      backgroundColor: color,
      borderColor: color,
      color: 'white',
      borderRadius: 6,
      opacity: event.booking?.status === 'paid' ? 0.6 : 1,
      border: event.booking?.status === 'paid' ? '1px dashed #fff' : 'none',
    }
    return { style }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 0.5, sm: 1, md: 2 },
        borderRadius: 2,
        // FIX 2: Höhe des Kalenders deutlich vergrößern
        // Die Höhe ist nun nicht mehr an den Viewport gekoppelt,
        // sondern hat eine feste, große Mindesthöhe, die das Scrollen ermöglicht.
        height: 'auto', // Entfernt die feste Kopplung an die Bildschirmhöhe
        minHeight: '1200px', // Deutlich vergrößerte Mindesthöhe
        backgroundColor: 'background.paper',
      }}
    >
      <DnDCalendar
        localizer={localizer}
        messages={messages}
        components={components}
        events={events}
        resources={resources}
        resourceIdAccessor={(resource: any) => resource.id}
        resourceTitleAccessor={(resource: any) => resource.title}
        // FIX 3: Kleinere Zeitschritte für größere Slots
        // Ein 15-Minuten-Raster sorgt für mehr Platz und eine detailliertere Ansicht.
        step={15}
        timeslots={4} // 4 Slots pro Stunde = 15-Minuten-Blöcke
        selectable
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={onView}
        // WICHTIG: onDoubleClickEvent wird an den Kalender gegeben
        onDoubleClickEvent={onDoubleClickEvent}
        onEventDrop={onEventDrop}
        onSelectSlot={onSelectSlot}
        resizable
        min={min}
        max={max}
        eventPropGetter={eventStyleGetter}
        dayLayoutAlgorithm="no-overlap"
      />
    </Paper>
  )
}
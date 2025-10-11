'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, verifyDashboardPin } from '@/services/api';
import {
  Container, Typography, Box, CircularProgress, Paper, Grid, Stack,
  Button, ButtonGroup, TextField, Collapse, List, ListItem, ListItemText
} from '@mui/material';
import PinLock from './PinLock';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import KpiCard from './KpiCard';
import dayjs from 'dayjs';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// --- Typen ---
type TopService = {
  name: string;
  totalRevenue: number;
  count: number;
};

type RevenueByStaff = {
  staffName: string;
  totalRevenue: number;
};

type DashboardStats = {
  totalRevenue: number;
  totalBookings: number;
  previousPeriodRevenue: number;
  previousPeriodBookings: number;
  revenueByStaff: RevenueByStaff[];
  revenueBySource: { source: string; totalRevenue: number; }[];
  dailyRevenue: { date: string; totalRevenue: number; }[];
  topServices: TopService[];
};

// --- Styling / Farben ---
const PRIMARY = '#E2673A';
const CARD_SHADOW = '0 8px 20px rgba(15, 15, 15, 0.06)';

// --- Dashboard-Komponente ---
const DashboardContent = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      setLoading(true);
      let from, to;

      if (timeFilter === 'custom') {
        from = dayjs(customDateRange.from);
        to = dayjs(customDateRange.to);
      } else {
        const unit = timeFilter as dayjs.OpUnitType;
        from = dayjs().startOf(unit);
        to = dayjs().endOf(unit);
      }

      try {
        const data = await getDashboardStats(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'), token);
        // KORREKTUR: Sortierlogik hier wieder hinzugefügt
        setStats({
          ...data.stats,
          revenueByStaff: data.stats.revenueByStaff.sort((a: RevenueByStaff, b: RevenueByStaff) => b.totalRevenue - a.totalRevenue)
        });
      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Statistiken:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, timeFilter, customDateRange]);

  // --- Diagrammdaten ---

  // Liniendiagramm: Täglicher Umsatz
  const lineChartData = {
    labels: stats?.dailyRevenue.map(d => dayjs(d.date).format('DD.MM')) || [],
    datasets: [{
      label: 'Täglicher Umsatz',
      data: stats?.dailyRevenue.map(d => d.totalRevenue) || [],
      borderColor: PRIMARY,
      backgroundColor: 'rgba(226,103,58,0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: PRIMARY,
      pointBorderColor: '#fff',
      pointHoverRadius: 6,
    }],
  };
  
  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `€ ${Number(ctx.parsed.y).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (val) => `€ ${Number(val).toLocaleString('de-DE')}` } },
      x: { grid: { display: false } },
    }
  };

  // Balkendiagramm: Umsatz pro Mitarbeiter
  const barChartData = {
    labels: stats?.revenueByStaff.map(s => s.staffName) || [],
    datasets: [{
      label: 'Umsatz in €',
      data: stats?.revenueByStaff.map(s => s.totalRevenue) || [],
      backgroundColor: PRIMARY,
      borderRadius: 8,
      barPercentage: 0.6,
    }],
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `€ ${Number(ctx.parsed.y).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (val) => `€ ${Number(val).toLocaleString('de-DE')}` } },
      x: { grid: { display: false } },
    },
  };

  const renderDateTitle = () => {
    if (timeFilter === 'today') return dayjs().format('DD. MMMM YYYY');
    if (timeFilter === 'week') return `Woche: ${dayjs().startOf('week').format('DD.MM')} - ${dayjs().endOf('week').format('DD.MM.YYYY')}`;
    if (timeFilter === 'month') return dayjs().format('MMMM YYYY');
    if (timeFilter === 'custom') return `${dayjs(customDateRange.from).format('DD.MM.YYYY')} - ${dayjs(customDateRange.to).format('DD.MM.YYYY')}`;
    return '';
  };

  return (
    <>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Dashboard' }]} />

      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Umsatz-Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">{renderDateTitle()}</Typography>
        </Box>

        <ButtonGroup variant="outlined" aria-label="zeitraum buttons">
          <Button onClick={() => setTimeFilter('today')} variant={timeFilter === 'today' ? 'contained' : 'outlined'}>Heute</Button>
          <Button onClick={() => setTimeFilter('week')} variant={timeFilter === 'week' ? 'contained' : 'outlined'}>Woche</Button>
          <Button onClick={() => setTimeFilter('month')} variant={timeFilter === 'month' ? 'contained' : 'outlined'}>Monat</Button>
          <Button onClick={() => setTimeFilter('custom')} variant={timeFilter === 'custom' ? 'contained' : 'outlined'}>Eigen</Button>
        </ButtonGroup>
      </Stack>

      {/* Datumsbereich bei "Eigen" */}
      <Collapse in={timeFilter === 'custom'}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, boxShadow: CARD_SHADOW }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="Von"
              type="date"
              value={customDateRange.from}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Bis"
              type="date"
              value={customDateRange.to}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Paper>
      </Collapse>

      {loading || !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI-Karten mit Vergleich */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <KpiCard title="Gesamtumsatz" currentValue={stats.totalRevenue} previousValue={stats.previousPeriodRevenue} formatAsCurrency />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <KpiCard title="Anzahl Rechnungen" currentValue={stats.totalBookings} previousValue={stats.previousPeriodBookings} />
            </Grid>
          </Grid>
          
          {/* Liniendiagramm */}
          <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2, mb: 4 }}>
            <Typography variant="h6" fontWeight={700}>Umsatzverlauf</Typography>
             <Box sx={{ height: 300, mt: 2 }}>
                <Line data={lineChartData} options={lineChartOptions} />
            </Box>
          </Paper>

          {/* Hauptdiagramme */}
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700}>Umsatz pro Mitarbeiter</Typography>
                <Box sx={{ height: 340, mt: 2 }}>
                  <Bar data={barChartData} options={barChartOptions} />
                </Box>
              </Paper>
            </Grid>

            {/* Top 5 Dienstleistungen */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Paper sx={{ p: 2.5, boxShadow: CARD_SHADOW, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Top 5 Dienstleistungen</Typography>
                <List dense>
                  {stats.topServices.map((service, index) => (
                    <ListItem key={index} disableGutters secondaryAction={
                      <Typography variant="body2" fontWeight="bold">
                        €{service.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                      </Typography>
                    }>
                      <ListItemText 
                        primaryTypographyProps={{ fontWeight: 500, noWrap: true }}
                        primary={service.name} 
                        secondary={`${service.count} Mal gebucht`} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </>
  );
};

// --- Hauptseite mit PIN-Sperre (unverändert) ---
export default function AdminDashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('dashboard-unlocked');
    if (sessionToken === 'true') setIsUnlocked(true);
    setIsLoading(false);
  }, []);

  const handlePinVerified = () => {
    sessionStorage.setItem('dashboard-unlocked', 'true');
    setIsUnlocked(true);
  };

  const handleVerifyPin = async (pin: string) => {
    if (!token) throw new Error('Nicht authentifiziert');
    return await verifyDashboardPin(pin, token);
  };

  if (isLoading || authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {isUnlocked ? <DashboardContent /> : <PinLock onPinVerified={handlePinVerified} verifyPin={handleVerifyPin} />}
    </Container>
  );
}
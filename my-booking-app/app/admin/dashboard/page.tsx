'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, verifyDashboardPin, downloadDatevExport } from '@/services/api';
import {
  Container, Typography, Box, CircularProgress, Paper, Grid, Stack,
  Button, ButtonGroup, TextField, Collapse, List, ListItem, ListItemText, Tooltip
} from '@mui/material';
import PinLock from './PinLock';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
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
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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

// --- Styling & Hilfsfunktionen ---
const PRIMARY = '#E2673A';
const PRIMARY_LIGHT = 'rgba(226,103,58,0.12)';
const CARD_SHADOW = '0 8px 20px rgba(15, 15, 15, 0.06)';
const CARD_SHADOW_HOVER = '0 12px 28px rgba(30, 30, 30, 0.1)';

const cardHoverEffect = {
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: CARD_SHADOW_HOVER,
  },
};

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return { value: Math.round(change), isPositive: change >= 0 };
};


// --- Dashboard-Komponente (unverändert) ---
const DashboardContent = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const [exportRange, setExportRange] = useState({
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

  const handleExport = async () => {
    if (token) {
      await downloadDatevExport(exportRange.from, exportRange.to, token);
    }
  };

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
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `€ ${Number(ctx.parsed.y).toLocaleString('de-DE', { minimumFractionDigits: 2 })}` } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (val) => `€ ${Number(val).toLocaleString('de-DE')}` } }, x: { grid: { display: false } } }
  };

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
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `€ ${Number(ctx.parsed.y).toLocaleString('de-DE', { minimumFractionDigits: 2 })}` } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (val) => `€ ${Number(val).toLocaleString('de-DE')}` } }, x: { grid: { display: false } } },
  };

  const renderDateTitle = () => {
    if (timeFilter === 'today') return dayjs().format('DD. MMMM YYYY');
    if (timeFilter === 'week') return `Woche: ${dayjs().startOf('week').format('DD.MM')} - ${dayjs().endOf('week').format('DD.MM.YYYY')}`;
    if (timeFilter === 'month') return dayjs().format('MMMM YYYY');
    if (timeFilter === 'custom') return `${dayjs(customDateRange.from).format('DD.MM.YYYY')} - ${dayjs(customDateRange.to).format('DD.MM.YYYY')}`;
    return '';
  };

  const revenueChange = stats ? calculatePercentageChange(stats.totalRevenue, stats.previousPeriodRevenue) : { value: 0, isPositive: true };
  const bookingsChange = stats ? calculatePercentageChange(stats.totalBookings, stats.previousPeriodBookings) : { value: 0, isPositive: true };

  return (
    <>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Dashboard' }]} />
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

      <Collapse in={timeFilter === 'custom'}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, boxShadow: CARD_SHADOW }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField label="Von" type="date" value={customDateRange.from} onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Bis" type="date" value={customDateRange.to} onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Stack>
        </Paper>
      </Collapse>

      {loading || !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper sx={{ p: 2.5, boxShadow: CARD_SHADOW, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...cardHoverEffect }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MonetizationOnIcon sx={{ color: PRIMARY }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Gesamtumsatz</Typography>
                    <Typography variant="h6" fontWeight={800}>€{(stats.totalRevenue).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </Box>
                <Tooltip title="Veränderung im Vergleich zur vorherigen Periode">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: revenueChange.isPositive ? 'success.light' : 'error.light', color: revenueChange.isPositive ? 'success.main' : 'error.main', px: 1.2, py: 0.4, borderRadius: 1, fontWeight: 700, fontSize: 12 }}>
                      {revenueChange.isPositive ? '+' : ''}{revenueChange.value}%
                    </Box>
                    <InfoOutlinedIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                </Tooltip>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper sx={{ p: 2.5, boxShadow: CARD_SHADOW, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...cardHoverEffect }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(66,153,225,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptLongIcon sx={{ color: '#6196D6' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Anzahl Rechnungen</Typography>
                    <Typography variant="h6" fontWeight={800}>{stats.totalBookings}</Typography>
                  </Box>
                </Box>
                <Tooltip title="Veränderung im Vergleich zur vorherigen Periode">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: bookingsChange.isPositive ? 'success.light' : 'error.light', color: bookingsChange.isPositive ? 'success.main' : 'error.main', px: 1.2, py: 0.4, borderRadius: 1, fontWeight: 700, fontSize: 12 }}>
                      {bookingsChange.isPositive ? '+' : ''}{bookingsChange.value}%
                    </Box>
                    <InfoOutlinedIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                </Tooltip>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2, mb: 4, ...cardHoverEffect }}>
            <Typography variant="h6" fontWeight={700}>Umsatzverlauf</Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Line data={lineChartData} options={lineChartOptions} />
            </Box>
          </Paper>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2, height: '100%', ...cardHoverEffect }}>
                <Typography variant="h6" fontWeight={700}>Umsatz pro Mitarbeiter</Typography>
                <Box sx={{ height: 340, mt: 2 }}>
                  <Bar data={barChartData} options={barChartOptions} />
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2.5, boxShadow: CARD_SHADOW, borderRadius: 2, height: '100%', ...cardHoverEffect }}>
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
          
          <Paper sx={{ p: 3, mt: 4, borderRadius: 2, boxShadow: CARD_SHADOW, ...cardHoverEffect }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>DATEV-Export</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Wähle einen Zeitraum, um die Rechnungsdaten als CSV-Datei für deinen Steuerberater zu exportieren.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Von"
                type="date"
                value={exportRange.from}
                onChange={(e) => setExportRange(prev => ({ ...prev, from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              />
              <TextField
                label="Bis"
                type="date"
                value={exportRange.to}
                onChange={(e) => setExportRange(prev => ({ ...prev, to: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              />
              <Button
                variant="contained"
                onClick={handleExport}
                size="large"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Herunterladen
              </Button>
            </Stack>
          </Paper>
        </>
      )}
    </>
  );
};


// --- Haupt-Seitenkomponente mit PIN-Sperre (ANGEPASST) ---
export default function AdminDashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handlePinVerified = () => {
    setIsUnlocked(true);
  };

  const handleVerifyPin = async (pin: string) => {
    if (!token) throw new Error("Nicht authentifiziert");
    return await verifyDashboardPin(pin, token);
  };

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {isUnlocked ? (
        <DashboardContent />
      ) : (
        <PinLock onPinVerified={handlePinVerified} verifyPin={handleVerifyPin} />
      )}
    </Container>
  );
}
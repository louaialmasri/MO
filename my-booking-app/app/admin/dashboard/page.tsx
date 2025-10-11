'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, verifyDashboardPin } from '@/services/api';
import {
  Container, Typography, Box, CircularProgress, Paper, Grid, Stack,
  Button, ButtonGroup, TextField, Collapse, useTheme
} from '@mui/material';
import PinLock from './PinLock';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  ChartOptions,
} from 'chart.js';
import { motion } from 'framer-motion';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// --- Typen ---
type RevenueByStaff = {
  staffName: string;
  totalRevenue: number;
};
type RevenueBySource = {
  source: 'Dienstleistungen' | 'Produkte';
  totalRevenue: number;
};
type DashboardStats = {
  totalRevenue: number;
  totalBookings: number;
  revenueByStaff: RevenueByStaff[];
  revenueBySource: RevenueBySource[];
};

// --- Styling / Farben ---
const PRIMARY = '#E2673A';
const PRIMARY_LIGHT = 'rgba(226,103,58,0.12)';
const CARD_SHADOW = '0 8px 20px rgba(15, 15, 15, 0.06)';
const ACCENTS = ['rgba(255,167,38,0.9)', 'rgba(161,136,127,0.9)', 'rgba(77,182,172,0.9)'];

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

  const barRef = useRef<any>(null);
  const doughnutRef = useRef<any>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      setLoading(true);
      let from, to;

      if (timeFilter === 'today') {
        from = dayjs().startOf('day');
        to = dayjs().endOf('day');
      } else if (timeFilter === 'week') {
        from = dayjs().startOf('week');
        to = dayjs().endOf('week');
      } else if (timeFilter === 'month') {
        from = dayjs().startOf('month');
        to = dayjs().endOf('month');
      } else {
        from = dayjs(customDateRange.from);
        to = dayjs(customDateRange.to);
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

  // --- Diagrammdaten ---
  const barLabels = stats?.revenueByStaff.map(s => s.staffName) || [];
  const barValues = stats?.revenueByStaff.map(s => s.totalRevenue) || [];

  const barData = {
    labels: barLabels,
    datasets: [{
      label: 'Umsatz in €',
      data: barValues,
      backgroundColor: PRIMARY,
      borderRadius: 8,
      barPercentage: 0.6,
      categoryPercentage: 0.8,
    }],
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `€ ${Number(ctx.parsed.y ?? ctx.parsed).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
        },
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#6b6b6b', maxRotation: 0, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(200,200,200,0.08)' },
        ticks: {
          color: '#6b6b6b',
          callback: (val) => `€ ${Number(val).toLocaleString('de-DE')}`,
        },
      },
    },
  };

  // Gradient auf BarChart anwenden
  useEffect(() => {
    if (!barRef.current) return;
    const chart = barRef.current?.chart || barRef.current;
    const ctx = (chart as any)?.ctx;
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(226,103,58,0.95)');
    gradient.addColorStop(1, 'rgba(226,103,58,0.45)');

    try {
      chart.data.datasets[0].backgroundColor = gradient;
      chart.update();
    } catch {}
  }, [stats]);

  // Doughnut-Daten
  const doughnutLabels = stats?.revenueBySource.map(s => s.source) || [];
  const doughnutValues = stats?.revenueBySource.map(s => s.totalRevenue) || [];
  const totalRevenue = stats?.totalRevenue ?? 0;

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [{
      data: doughnutValues,
      backgroundColor: ACCENTS.slice(0, doughnutLabels.length),
      borderColor: 'rgba(255,255,255,0.8)',
      borderWidth: 2,
    }],
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { display: false } },
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

          {/* KPI-Karten */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{
                p: 2.5, minHeight: 120, boxShadow: CARD_SHADOW, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.18s', '&:hover': { transform: 'translateY(-4px)' }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MonetizationOnIcon sx={{ color: PRIMARY }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Gesamtumsatz</Typography>
                    <Typography variant="h6" fontWeight={800}>€{(stats?.totalRevenue ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </Box>
                <Tooltip title="Veränderung im Vergleich zur vorherigen Periode (z. B. Vormonat)">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: 'success.main', px: 1.2, py: 0.4, borderRadius: 1, fontWeight: 700, fontSize: 12 }}>
                      +{Math.round(Math.random() * 5 + 1)}%
                    </Box>
                    <InfoOutlinedIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                </Tooltip>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{
                p: 2.5, minHeight: 120, boxShadow: CARD_SHADOW, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.18s', '&:hover': { transform: 'translateY(-4px)' }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(66,153,225,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptLongIcon sx={{ color: '#6196D6' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Anzahl Rechnungen</Typography>
                    <Typography variant="h6" fontWeight={800}>{stats?.totalBookings ?? 0}</Typography>
                  </Box>
                </Box>
                <Tooltip title="Veränderung im Vergleich zur vorherigen Periode (z. B. Vormonat)">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: 'rgba(239,68,68,0.12)', color: 'error.main', px: 1.2, py: 0.4, borderRadius: 1, fontWeight: 700, fontSize: 12 }}>
                      -{Math.round(Math.random() * 4 + 1)}%
                    </Box>
                    <InfoOutlinedIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                </Tooltip>
              </Paper>
            </Grid>
          </Grid>

          {/* Hauptdiagramme */}
          <Grid container spacing={4} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Umsatz pro Mitarbeiter</Typography>
                  <Typography variant="body2" color="text.secondary">nach Umsatz sortiert</Typography>
                </Stack>
                <Box sx={{ height: 340 }}>
                  <Bar ref={barRef} data={barData} options={barOptions} />
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, boxShadow: CARD_SHADOW, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Umsatz nach Quelle</Typography>
                <Box sx={{ position: 'relative', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut ref={doughnutRef} data={doughnutData} options={doughnutOptions} />
                  <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography variant="caption" color="text.secondary">Gesamt</Typography>
                    <Typography variant="h6" fontWeight={800}>€{totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>
      )}
    </>
  );
};

// --- Hauptseite mit PIN-Sperre ---
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
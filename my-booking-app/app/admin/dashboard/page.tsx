'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, verifyDashboardPin } from '@/services/api';
import { Container, Typography, Box, CircularProgress, Paper, Grid, Stack } from '@mui/material';
import PinLock from './PinLock';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- Typen für die Daten ---
type RevenueByStaff = {
  staffName: string;
  totalRevenue: number;
  totalBookings: number;
};

type DashboardStats = {
  totalRevenue: number;
  totalBookings: number;
  revenueByStaff: RevenueByStaff[];
};

// --- Dashboard-Komponente ---
const DashboardContent = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (token) {
        setLoading(true);
        try {
          const data = await getDashboardStats(dateRange.from, dateRange.to, token);
          setStats(data.stats);
        } catch (error) {
          console.error("Fehler beim Laden der Dashboard-Statistiken:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [token, dateRange]);

  const chartData = {
    labels: stats?.revenueByStaff.map(s => s.staffName) || [],
    datasets: [
      {
        label: 'Umsatz in €',
        data: stats?.revenueByStaff.map(s => s.totalRevenue) || [],
        backgroundColor: 'rgba(226, 103, 58, 0.6)',
        borderColor: 'rgba(226, 103, 58, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading || !stats) {
    return <CircularProgress />;
  }

  return (
    <>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Dashboard' }]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Umsatz-Dashboard ({dayjs(dateRange.from).format('DD.MM')} - {dayjs(dateRange.to).format('DD.MM.YYYY')})
      </Typography>

      {/* KPI Karten */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Gesamtumsatz</Typography>
            <Typography variant="h4" fontWeight="bold">€{stats.totalRevenue.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid  size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Anzahl Termine</Typography>
            <Typography variant="h4" fontWeight="bold">{stats.totalBookings}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Umsatz pro Mitarbeiter */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Umsatz pro Mitarbeiter</Typography>
        <Box sx={{ height: 300 }}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            }}
          />
        </Box>
      </Paper>
    </>
  );
};


// --- Haupt-Seitenkomponente mit PIN-Sperre ---
export default function AdminDashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('dashboard-unlocked');
    if (sessionToken === 'true') {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handlePinVerified = () => {
    sessionStorage.setItem('dashboard-unlocked', 'true');
    setIsUnlocked(true);
  };

  const handleVerifyPin = async (pin: string) => {
    if (!token) throw new Error("Nicht authentifiziert");
    return await verifyDashboardPin(pin, token);
  };

  if (isLoading || authLoading) {
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
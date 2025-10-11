import { Paper, Typography, Box, Stack } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

type KpiCardProps = {
  title: string;
  currentValue: number;
  previousValue: number;
  formatAsCurrency?: boolean;
};

export default function KpiCard({ title, currentValue, previousValue, formatAsCurrency = false }: KpiCardProps) {
  const difference = currentValue - previousValue;
  const percentageChange = previousValue !== 0 ? (difference / previousValue) * 100 : 0;
  const isPositive = difference >= 0;
  const showPercentage = isFinite(percentageChange) && previousValue !== 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      <Typography variant="h4" fontWeight="bold">
        {formatAsCurrency ? `€${currentValue.toFixed(2)}` : currentValue}
      </Typography>
      {showPercentage && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: isPositive ? 'success.main' : 'error.main' }}>
          {isPositive ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
          <Typography variant="body2" fontWeight="bold">
            {`${percentageChange.toFixed(1)}%`}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
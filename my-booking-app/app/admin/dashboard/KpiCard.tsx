'use client'

import { Card, CardContent, Typography, Avatar, Stack } from '@mui/material';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactElement;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

// VIEL SCHLANKERER CODE - Die Komponente erbt Stil vom Theme
export default function KpiCard({ title, value, icon, color = 'primary' }: KpiCardProps) {
  return (
    <Card 
        variant="outlined" 
        sx={{ 
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => theme.shadows[2], // Nutzt den neuen, weichen Schatten
            }
        }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Stack>
            <Typography variant="h5">{value}</Typography>
            <Typography variant="subtitle1">{title}</Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
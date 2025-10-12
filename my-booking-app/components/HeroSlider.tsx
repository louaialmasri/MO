// my-booking-app/components/HeroSlider.tsx

'use client'

import Slider from 'react-slick'
import { Box, Typography, Button, Container } from '@mui/material'
import { useRouter } from 'next/navigation';

const sliderImages = [
  '/image1.jpg',
  '/image2.jpg',
  '/image3.jpg',
  '/image4.jpg'
];

export default function HeroSlider() {
  const router = useRouter();
  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 1500, // Langsamerer, sanfterer Übergang
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    fade: true,
    pauseOnHover: false,
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <Box key={index}>
            <Box sx={{
              height: '100vh',
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}/>
          </Box>
        ))}
      </Slider>

      {/* Verdunkelungs-Overlay */}
      <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Text-Inhalt */}
      <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
        }}>
         <Container maxWidth="md">
            <Typography variant="h1" component="h1" gutterBottom>
              Präzision in jedem Schnitt
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, maxWidth: '700px', margin: '0 auto 32px' }}>
              Buchen Sie Ihren nächsten Termin einfach online.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => router.push('/booking')}
            >
              Jetzt Termin buchen
            </Button>
          </Container>
      </Box>
    </Box>
  );
}
'use client'

import Slider from 'react-slick'
import { Box, Typography, Button, Container } from '@mui/material'

const sliderImages = [
  '/image1.jpg', // Passe die Dateinamen an deine Bilder an
  '/image2.jpg',
  '/image3.jpg',
  '/image4.jpg'
];

export default function HeroSlider() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    fade: true,
  };

  return (
    <Box className="hero-slider" sx={{ position: 'relative', height: { xs: '60vh', md: '80vh' } }}>
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <Box key={index}>
            <Box sx={{
              height: { xs: '60vh', md: '80vh' },
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}/>
          </Box>
        ))}
      </Slider>

      <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}>
         <Container maxWidth="md">
            <Typography variant="h2" component="h1" fontWeight={800} gutterBottom>
              Präzision in jedem Schnitt
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
              Buchen Sie Ihren nächsten Termin einfach online.
            </Typography>
            <Button variant="contained" color="secondary" size="large" onClick={() => (window.location.href = '/booking')}>
              Jetzt Termin buchen
            </Button>
          </Container>
      </Box>
    </Box>
  );
}
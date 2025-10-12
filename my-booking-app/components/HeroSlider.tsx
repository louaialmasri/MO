'use client'

import Slider from 'react-slick'
import { Box, Typography, Button, Container, keyframes } from '@mui/material' // keyframes importiert
import { useRouter } from 'next/navigation';

const sliderImages = [
  '/image1.jpg',
  '/image2.jpg',
  '/image3.jpg',
  '/image4.jpg'
];

// NEU: Keyframes für die Ken Burns Animation
const kenburns = keyframes`
  0% {
    transform: scale(1.0) translate(0, 0);
  }
  50% {
    transform: scale(1.1) translate(-2%, 2%);
  }
  100% {
    transform: scale(1.0) translate(0, 0);
  }
`;

export default function HeroSlider() {
  const router = useRouter();
  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 1500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000, // Etwas längere Anzeigedauer für den Effekt
    fade: true,
    pauseOnHover: false,
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#1c1c1c' }}>
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <Box key={index}>
            <Box sx={{
              height: '100vh',
              backgroundImage: `url(${img})`,
              // HIER DIE ÄNDERUNG: Wieder auf 'cover' und mit Animation
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: `${kenburns} 20s ease-in-out infinite`, // Animation anwenden
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Etwas weniger stark abgedunkelt
        }}
      />

      <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
         <Container maxWidth="md">
            <Typography variant="h1" component="h1" gutterBottom sx={{ color: 'white' }}>
              Präzision in jedem Schnitt
            </Typography>
            <Typography variant="h5" sx={{ color: 'white', mb: 4, opacity: 0.9, maxWidth: '700px', margin: '0 auto 32px' }}>
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
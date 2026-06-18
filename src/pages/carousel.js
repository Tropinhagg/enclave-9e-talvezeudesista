const CAROUSEL_MEDIA = [
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1776900361/michael-afonso-rR95ZJbFE14-unsplash_cxilmw.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1776899666/kay-mayer-RfGk36Fsd8g-unsplash_cpamq6.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/mcgg1iny9guuqu81ywne.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/bx92hw1pgjukoiykxlbg.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/n1hfsv3tmritveqpuoan.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/jmjonrqrhzl3bctae0o6.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/enyykeckivbxvy0kgbkb.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040198/ezt4aigsahmnwnfzc4w3.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040200/dx2ikagrvdln7ncmmqvd.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040200/hkkhpf4erhhhvnsag3a8.jpg' },
  { type: 'image', url: 'https://res.cloudinary.com/dnq9s0g7v/image/upload/v1777040200/nhhyotextb3ir8jshh8e.jpg' },
];

const SLIDE_DURATION_MS = 7000;
const SHOW_DOTS = true;

export function buildBackgroundCarousel() {
  const telaLogin = document.getElementById('tela-login');
  if (!telaLogin) return;
  if (document.getElementById('bg-carousel')) return;
  if (!CAROUSEL_MEDIA || CAROUSEL_MEDIA.length === 0) return;

  const carousel = document.createElement('div');
  carousel.id = 'bg-carousel';

  const slides = CAROUSEL_MEDIA.map((item, index) => {
    const slide = document.createElement('div');
    slide.className = 'bgc-slide';
    if (index === 0) slide.classList.add('active');

    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.url;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
      slide.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      if (index > 0) img.loading = 'lazy';
      img.onerror = () => { img.style.display = 'none'; };
      slide.appendChild(img);
    }
    carousel.appendChild(slide);
    return slide;
  });

  const overlay = document.createElement('div');
  overlay.id = 'bg-carousel-overlay';

  let dotsContainer = null;
  let dotEls = [];

  if (SHOW_DOTS && CAROUSEL_MEDIA.length > 1) {
    dotsContainer = document.createElement('div');
    dotsContainer.id = 'bg-carousel-dots';
    dotEls = CAROUSEL_MEDIA.map((_, index) => {
      const dot = document.createElement('div');
      dot.className = 'bgc-dot';
      if (index === 0) dot.classList.add('active');
      dotsContainer.appendChild(dot);
      return dot;
    });
  }

  telaLogin.insertBefore(overlay, telaLogin.firstChild);
  telaLogin.insertBefore(carousel, telaLogin.firstChild);
  if (dotsContainer) telaLogin.appendChild(dotsContainer);

  if (CAROUSEL_MEDIA.length <= 1) return;

  let currentIndex = 0;

  function goToSlide(nextIndex) {
    slides[currentIndex].classList.remove('active');
    if (dotEls.length) dotEls[currentIndex].classList.remove('active');
    currentIndex = nextIndex;
    slides[currentIndex].classList.add('active');
    if (dotEls.length) dotEls[currentIndex].classList.add('active');
    const videoEl = slides[currentIndex].querySelector('video');
    if (videoEl) videoEl.play().catch(() => {});
  }

  setInterval(() => {
    goToSlide((currentIndex + 1) % CAROUSEL_MEDIA.length);
  }, SLIDE_DURATION_MS);
}

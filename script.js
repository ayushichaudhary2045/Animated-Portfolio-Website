const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");

const frameCount = 240;
const currentFrame = index => (
  `frames/frame_${index.toString().padStart(6, '0')}.png`
);

const images = [];

// Preload all images to ensure smooth playback without network stuttering
const preloadImages = () => {
  for (let i = 0; i < frameCount; i++) {
    images[i] = new Image();
    images[i].src = currentFrame(i);
  }
};

preloadImages();

// Draw the first frame once it's loaded and set canvas size
images[0].onload = () => {
  canvas.width = images[0].naturalWidth || images[0].width;
  canvas.height = images[0].naturalHeight || images[0].height;
  context.drawImage(images[0], 0, 0);
};

// Update the canvas based on scroll position
window.addEventListener('scroll', () => {
  const scrollTop = document.documentElement.scrollTop;
  const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;

  // Avoid division by zero if there's no scrolling space
  if (maxScrollTop <= 0) return;

  const scrollFraction = scrollTop / maxScrollTop;

  // Calculate which frame we should be on
  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * frameCount)
  );

  // Use requestAnimationFrame for optimal rendering performance
  requestAnimationFrame(() => {
    // Check if the image has finished loading before drawing
    if (images[frameIndex] && images[frameIndex].complete) {
      context.drawImage(images[frameIndex], 0, 0);
    }
  });
});

// Project card accordion — expands details under the clicked card,
// collapses if the same card is clicked again, and only allows one
// card open at a time.
function toggleAccordion(id) {
  const clicked = document.getElementById(id);
  const allPanels = document.querySelectorAll('.accordion-content');

  allPanels.forEach(panel => {
    if (panel.id === id) {
      panel.classList.toggle('open');
    } else {
      panel.classList.remove('open');
    }
  });
}
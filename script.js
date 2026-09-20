const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");


// ============================================================
// SCROLL SPRITE-SHEET ANIMATION (HD, split across 4 sheets)
// ============================================================
// A single sprite sheet at full native resolution hits WebP's
// internal encoder limit, so the 240 frames are split across 4
// sheets (60 frames each). All 4 load in parallel — still just
// 4 requests total, at native 1280x720 so there's no upscale blur.

const SPRITE_SHEET_SRCS = [
  "images/hero-sprite-hd-0.webp",
  "images/hero-sprite-hd-1.webp",
  "images/hero-sprite-hd-2.webp",
  "images/hero-sprite-hd-3.webp",
];
const FRAMES_PER_SHEET = 60;   // frames baked into each sheet
const FRAME_COUNT = 240;  // total frames across all sheets
const SHEET_COLS = 8;    // columns in each sheet's grid
const SHEET_ROWS = 8;    // rows in each sheet's grid
const FRAME_WIDTH = 1280; // px, native frame width (no blur)
const FRAME_HEIGHT = 720;  // px, native frame height


let sheetImages = new Array(SPRITE_SHEET_SRCS.length).fill(null);
let currentFrame = -1;
let pendingTargetFrame = 0;
let renderScheduled = false;


// ------------------------------------------------------------
// Draw one frame (by index), pulling from whichever sheet it's on
// ------------------------------------------------------------

function drawFrame(frameIndex) {
  frameIndex = Math.max(0, Math.min(FRAME_COUNT - 1, frameIndex));

  const sheetIndex = Math.floor(frameIndex / FRAMES_PER_SHEET);
  const img = sheetImages[sheetIndex];

  // That particular sheet hasn't finished loading yet — keep
  // showing whatever's currently on screen rather than erroring.
  if (!img) {
    pendingTargetFrame = frameIndex;
    return;
  }

  if (frameIndex === currentFrame) return;

  const localIndex = frameIndex % FRAMES_PER_SHEET;
  const col = localIndex % SHEET_COLS;
  const row = Math.floor(localIndex / SHEET_COLS);

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.drawImage(
    img,
    col * FRAME_WIDTH,
    row * FRAME_HEIGHT,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    0,
    0,
    canvas.width,
    canvas.height
  );

  currentFrame = frameIndex;
}


// ------------------------------------------------------------
// Scroll → frame index
// ------------------------------------------------------------

function updateAnimationFromScroll() {
  const scrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    0;

  const maxScrollTop =
    document.documentElement.scrollHeight -
    window.innerHeight;

  if (maxScrollTop <= 0) return;

  const scrollFraction =
    Math.max(0, Math.min(1, scrollTop / maxScrollTop));

  const targetFrame = Math.round(scrollFraction * (FRAME_COUNT - 1));

  if (!renderScheduled) {
    renderScheduled = true;

    requestAnimationFrame(() => {
      renderScheduled = false;
      drawFrame(targetFrame);
    });
  }
}


// ------------------------------------------------------------
// Load all 4 sheets in parallel
// ------------------------------------------------------------

function initHeroAnimation() {
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;

  SPRITE_SHEET_SRCS.forEach((src, i) => {
    const img = new Image();

    img.onload = () => {
      sheetImages[i] = img;

      // Show frame 0 the moment the first sheet is ready, so the
      // hero isn't blank while the rest load in the background.
      if (i === 0) {
        drawFrame(0);
      }

      // Re-attempt whatever frame scrolling last asked for, in
      // case it was waiting on this sheet.
      drawFrame(pendingTargetFrame);
    };

    img.onerror = () => {
      console.error("Hero sprite sheet failed to load:", src);
    };

    img.src = src;
  });
}


window.addEventListener(
  "scroll",
  updateAnimationFromScroll,
  { passive: true }
);

initHeroAnimation();


// ============================================================
// PROJECT CARD ACCORDION
// ============================================================

// Project card accordion — expands details under the clicked card,
// collapses if the same card is clicked again, and only allows one
// card open at a time.

function toggleAccordion(id) {

  const clicked = document.getElementById(id);

  const allPanels =
    document.querySelectorAll(".accordion-content");

  allPanels.forEach((panel) => {

    if (panel.id === id) {
      panel.classList.toggle("open");
    } else {
      panel.classList.remove("open");
    }

  });
}
const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");

const frameCount = 240;

const currentFrame = (index) =>
  `frames/frame_${index.toString().padStart(6, "0")}.png`;


// ============================================================
// FRAME ANIMATION
// ============================================================

const images = new Array(frameCount);
const loading = new Set();
const loaded = new Set();
const failed = new Set();

let currentFrameIndex = 0;
let displayedFrameIndex = 0;

let canvasReady = false;
let renderScheduled = false;

const MAX_CONCURRENT_LOADS = 4;
let activeLoads = 0;

const LOAD_AHEAD = 8;
const LOAD_BEHIND = 3;

const retryCount = new Array(frameCount).fill(0);
const MAX_RETRIES = 2;


// ------------------------------------------------------------
// Draw a frame
// ------------------------------------------------------------

function drawFrame(index) {
  const image = images[index];

  if (!image || !image.complete || image.naturalWidth === 0) {
    return false;
  }

  if (!canvasReady) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvasReady = true;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  displayedFrameIndex = index;

  return true;
}


// ------------------------------------------------------------
// Load a single frame
// ------------------------------------------------------------

function loadFrame(index) {
  if (index < 0 || index >= frameCount) return;

  if (loaded.has(index) || loading.has(index)) {
    return;
  }

  if (failed.has(index) && retryCount[index] >= MAX_RETRIES) {
    return;
  }

  if (activeLoads >= MAX_CONCURRENT_LOADS) {
    return;
  }

  loading.add(index);
  activeLoads++;

  const image = new Image();

  image.decoding = "async";

  image.onload = async () => {
    try {
      // Wait until the image is decoded and ready to draw.
      if (image.decode) {
        try {
          await image.decode();
        } catch (decodeError) {
          // The image may already be usable despite decode() rejection.
        }
      }

      images[index] = image;

      loading.delete(index);
      loaded.add(index);
      failed.delete(index);

      activeLoads--;

      // If this is the first frame, initialize the canvas.
      if (index === 0 && !canvasReady) {
        drawFrame(0);
      }

      // If this is the frame currently requested by scroll,
      // render it immediately when available.
      if (index === currentFrameIndex) {
        scheduleRender();
      }

      processLoadQueue();

    } catch (error) {
      loading.delete(index);
      activeLoads--;

      handleLoadFailure(index);
      processLoadQueue();
    }
  };

  image.onerror = () => {
    loading.delete(index);
    activeLoads--;

    handleLoadFailure(index);
    processLoadQueue();
  };

  image.src = currentFrame(index);
}


// ------------------------------------------------------------
// Handle failed frame
// ------------------------------------------------------------

function handleLoadFailure(index) {
  retryCount[index]++;

  if (retryCount[index] >= MAX_RETRIES) {
    failed.add(index);

    console.warn(
      `Failed to load frame ${index} after ${MAX_RETRIES} attempts`
    );
  } else {
    // Retry after a short delay.
    setTimeout(() => {
      loadFrame(index);
    }, 500 * retryCount[index]);
  }
}


// ------------------------------------------------------------
// Loading priority queue
// ------------------------------------------------------------

const requestedFrames = new Set();

function requestFrameLoad(index) {
  if (index < 0 || index >= frameCount) return;

  if (
    loaded.has(index) ||
    loading.has(index) ||
    requestedFrames.has(index)
  ) {
    return;
  }

  requestedFrames.add(index);
}


// ------------------------------------------------------------
// Process queued frame requests
// ------------------------------------------------------------

function processLoadQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && requestedFrames.size > 0) {

    let bestIndex = null;
    let bestDistance = Infinity;

    requestedFrames.forEach((index) => {
      const distance = Math.abs(index - currentFrameIndex);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex === null) break;

    requestedFrames.delete(bestIndex);

    loadFrame(bestIndex);
  }
}


// ------------------------------------------------------------
// Request nearby frames
// ------------------------------------------------------------

function preloadAround(index) {

  // Current frame first
  requestFrameLoad(index);

  // Frames ahead
  for (let i = 1; i <= LOAD_AHEAD; i++) {
    requestFrameLoad(index + i);
  }

  // A few frames behind
  for (let i = 1; i <= LOAD_BEHIND; i++) {
    requestFrameLoad(index - i);
  }

  processLoadQueue();
}


// ------------------------------------------------------------
// Find nearest already-loaded frame
// ------------------------------------------------------------

function findNearestLoadedFrame(targetIndex) {

  if (loaded.has(targetIndex)) {
    return targetIndex;
  }

  // Search nearby frames first.
  for (let distance = 1; distance < frameCount; distance++) {

    const previous = targetIndex - distance;

    if (previous >= 0 && loaded.has(previous)) {
      return previous;
    }

    const next = targetIndex + distance;

    if (next < frameCount && loaded.has(next)) {
      return next;
    }
  }

  return null;
}


// ------------------------------------------------------------
// Render requested frame
// ------------------------------------------------------------

function renderCurrentFrame() {

  renderScheduled = false;

  const target = currentFrameIndex;

  // If target is ready, draw it.
  if (loaded.has(target)) {
    drawFrame(target);
    return;
  }

  // Otherwise keep the last available frame.
  const nearest = findNearestLoadedFrame(target);

  if (nearest !== null) {
    drawFrame(nearest);
  }

  // Make sure the requested frame is being loaded.
  requestFrameLoad(target);

  processLoadQueue();
}


// ------------------------------------------------------------
// Schedule rendering using requestAnimationFrame
// ------------------------------------------------------------

function scheduleRender() {

  if (renderScheduled) return;

  renderScheduled = true;

  requestAnimationFrame(renderCurrentFrame);
}


// ============================================================
// SCROLL HANDLING
// ============================================================

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

  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * (frameCount - 1))
  );

  currentFrameIndex = frameIndex;

  // Load target + nearby frames.
  preloadAround(frameIndex);

  // Render without doing multiple canvas updates
  // during the same browser frame.
  scheduleRender();
}


// ------------------------------------------------------------
// Passive scroll listener
// ------------------------------------------------------------

window.addEventListener(
  "scroll",
  updateAnimationFromScroll,
  { passive: true }
);


// ============================================================
// INITIAL LOAD
// ============================================================

// Load first frame immediately.
requestFrameLoad(0);

// Load first few frames after the first one.
for (let i = 1; i <= 10; i++) {
  requestFrameLoad(i);
}

processLoadQueue();


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
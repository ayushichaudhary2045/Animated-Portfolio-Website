const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");

const video = document.getElementById("scroll-animation-video");


// ============================================================
// SCROLL VIDEO ANIMATION
// ============================================================

let videoReady = false;
let renderScheduled = false;
let targetTime = 0;
let lastRenderedTime = -1;


// ------------------------------------------------------------
// Prepare video
// ------------------------------------------------------------

video.addEventListener("loadedmetadata", () => {
  if (!video.videoWidth || !video.videoHeight) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  videoReady = true;

  video.currentTime = 0;
});


// ------------------------------------------------------------
// Draw video frame on canvas
// ------------------------------------------------------------

function drawVideoFrame() {
  renderScheduled = false;

  if (!videoReady) return;

  if (video.readyState >= 2) {
    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    lastRenderedTime = video.currentTime;
  }
}


// ------------------------------------------------------------
// Draw after video seeks to requested frame
// ------------------------------------------------------------

video.addEventListener("seeked", () => {
  if (!videoReady) return;

  if (!renderScheduled) {
    requestAnimationFrame(() => {
      drawVideoFrame();
    });
  }
});


// ------------------------------------------------------------
// Scroll → video time
// ------------------------------------------------------------

function updateAnimationFromScroll() {
  if (!videoReady || !video.duration) return;

  const scrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    0;

  const maxScrollTop =
    document.documentElement.scrollHeight -
    window.innerHeight;

  if (maxScrollTop <= 0) return;

  const scrollFraction =
    Math.max(
      0,
      Math.min(1, scrollTop / maxScrollTop)
    );

  targetTime =
    scrollFraction * video.duration;

  if (!renderScheduled) {
    renderScheduled = true;

    requestAnimationFrame(() => {
      renderScheduled = false;

      if (!videoReady || !video.duration) return;

      // Only seek when there is an actual change.
      if (
        Math.abs(video.currentTime - targetTime) > 0.01
      ) {
        video.currentTime = targetTime;
      } else {
        drawVideoFrame();
      }
    });
  }
}


// ------------------------------------------------------------
// Passive scroll listener
// ------------------------------------------------------------

window.addEventListener(
  "scroll",
  updateAnimationFromScroll,
  { passive: true }
);


// ------------------------------------------------------------
// Initial video loading
// ------------------------------------------------------------

video.preload = "auto";
video.muted = true;
video.playsInline = true;

video.load();


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
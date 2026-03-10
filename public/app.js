// ===== CONFIGURATION =====
const SHOWPIC_IMAGES = [
  './images/showpic/pic1.jfif',
  './images/showpic/pic2.jfif',
  './images/showpic/pic3.jfif',
  './images/showpic/pic4.jfif',
  './images/showpic/pic5.jfif',
  './images/showpic/pic6.jfif',
  './images/showpic/pic7.jfif',
  './images/showpic/pic8.jfif',
  './images/showpic/pic9.jfif',
  './images/showpic/pic10.jfif',
  './images/showpic/pic11.jfif',
  './images/showpic/pic12.jfif',
  './images/showpic/pic13.jfif',
  './images/showpic/pic14.jfif',
  './images/showpic/pic15.jfif',
  './images/showpic/pic16.png',
];

const COURTS = [1, 2, 3, 4];
const HOURS = [15, 16, 17, 18, 19, 20, 21, 22];

// ===== STATE =====
let currentSlide = 0;
let totalSlides = 0;
let slideshowTimer = null;
let bookingsData = null;
let selectedDate = getTodayDateString();

// ===== DATE UTILITIES =====
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatThaiDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Use constructor without timezone shift
  const date = new Date(y, m - 1, d);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  try {
    return date.toLocaleDateString('th-TH', options);
  } catch (e) {
    return dateStr;
  }
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('th-TH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

// ===== SLIDESHOW =====
function initSlideshow() {
  const track = document.getElementById('slideshow-track');
  const dotsContainer = document.getElementById('slideshow-dots');
  if (!track || !dotsContainer) return;

  // Clear existing
  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  let loadedSlides = [];

  function addSlide(src, index) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.dataset.index = index;

    const img = document.createElement('img');
    img.src = src;
    img.alt = `สนามแบดมินตันหลังสวน - ภาพที่ ${index + 1}`;
    img.loading = index === 0 ? 'eager' : 'lazy';

    img.onerror = function () {
      // Remove broken slide
      const idx = loadedSlides.indexOf(slide);
      if (idx !== -1) loadedSlides.splice(idx, 1);
      slide.remove();

      // Re-index dots
      rebuildDots();

      // Adjust current slide if needed
      if (totalSlides > 0) {
        totalSlides = loadedSlides.length;
        if (currentSlide >= totalSlides) {
          currentSlide = 0;
        }
        if (loadedSlides.length > 0) {
          showSlide(currentSlide);
        }
      }
    };

    slide.appendChild(img);
    track.appendChild(slide);
    loadedSlides.push(slide);

    // Dot
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.setAttribute('aria-label', `ภาพที่ ${index + 1}`);
    dot.addEventListener('click', () => goToSlide(loadedSlides.indexOf(slide)));
    dotsContainer.appendChild(dot);
  }

  SHOWPIC_IMAGES.forEach((src, i) => addSlide(src, i));

  function rebuildDots() {
    dotsContainer.innerHTML = '';
    loadedSlides.forEach((slide, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === currentSlide ? ' active' : '');
      dot.setAttribute('aria-label', `ภาพที่ ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  function showSlide(index) {
    const slides = loadedSlides;
    if (!slides.length) return;

    currentSlide = ((index % slides.length) + slides.length) % slides.length;
    totalSlides = slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });

    // Update dots
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function goToSlide(index) {
    clearInterval(slideshowTimer);
    showSlide(index);
    startAutoAdvance();
  }

  function startAutoAdvance() {
    clearInterval(slideshowTimer);
    slideshowTimer = setInterval(() => {
      if (loadedSlides.length > 1) {
        showSlide(currentSlide + 1);
      }
    }, 4000);
  }

  // Make navigation functions global
  window._slideshowNext = () => goToSlide(currentSlide + 1);
  window._slideshowPrev = () => goToSlide(currentSlide - 1);

  // Initial show
  setTimeout(() => {
    showSlide(0);
    startAutoAdvance();
  }, 100);
}

// ===== BOOKINGS =====
async function loadBookings() {
  showGridLoading();
  try {
    // Try live API first (works when served from the same FastAPI server locally)
    const isLocalServer = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalServer) {
      const res = await fetch(`/api/public/bookings?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        bookingsData = { generated_at: data.generated_at, bookings: data.bookings };
        renderGrid(bookingsData, selectedDate);
        return;
      }
    }
    // Fallback: static JSON (for GitHub Pages)
    const url = `./data/bookings.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bookingsData = await res.json();
    renderGrid(bookingsData, selectedDate);
  } catch (err) {
    console.warn('Failed to load bookings:', err);
    bookingsData = { generated_at: null, bookings: [] };
    renderGrid(bookingsData, selectedDate);
  }
}

function showGridLoading() {
  const container = document.getElementById('grid-container');
  if (!container) return;
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูลคอร์ท...</span>
    </div>
  `;
}

// ===== KWON DETECTION =====
/**
 * Returns 'kwon_light', 'kwon_heavy', or null
 * - kwon_light: Mon-Fri, courts 2 & 3, hour >= 17
 * - kwon_heavy: Mon-Fri, all courts, hour >= 19
 * weekday: 0=Sun, 1=Mon...5=Fri, 6=Sat
 */
function getKwonStatus(dateStr, court, hour) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const isWeekday = weekday >= 1 && weekday <= 5; // Mon-Fri

  if (!isWeekday) return null;

  // kwon_heavy takes priority over kwon_light
  if (hour >= 19) return 'kwon_heavy';
  if (hour >= 17 && (court === 2 || court === 3)) return 'kwon_light';

  return null;
}

/**
 * Returns 'booked', 'kwon_light', 'kwon_heavy', or 'available'
 * Booked takes priority over ก๊วน
 */
function getSlotStatus(bookings, date, court, hour) {
  const bookingList = bookings?.bookings || [];

  // Check if this slot is booked
  const isBooked = bookingList.some((b) => {
    if (b.court !== court || b.date !== date) return false;
    const startH = parseInt(b.start_time.split(':')[0], 10);
    const endH = parseInt(b.end_time.split(':')[0], 10);
    return hour >= startH && hour < endH;
  });

  if (isBooked) return 'booked';

  // Check kwon
  const kwon = getKwonStatus(date, court, hour);
  if (kwon) return kwon;

  return 'available';
}

// ===== RENDER GRID =====
function renderGrid(bookings, date) {
  const container = document.getElementById('grid-container');
  if (!container) return;

  // Update date display
  const dateDisplay = document.getElementById('date-display-text');
  if (dateDisplay) {
    dateDisplay.textContent = formatThaiDate(date);
  }

  const statusConfig = {
    available: { label: 'ว่าง', className: 'slot-available' },
    booked: { label: 'จอง', className: 'slot-booked' },
    kwon_light: { label: 'ก๊วนมือเบา', className: 'slot-kwon-light' },
    kwon_heavy: { label: 'จอยก๊วน', className: 'slot-kwon-heavy' },
  };

  // Header: คอร์ท | 15:00-16:00 | 16:00-17:00 | ... | 22:00-23:00
  const hourHeaders = HOURS.map(h =>
    `<th class="time-col-header">${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00</th>`
  ).join('');

  let html = `
    <div class="grid-wrapper">
      <table class="availability-table">
        <thead>
          <tr>
            <th class="court-col-header">คอร์ท</th>
            ${hourHeaders}
          </tr>
        </thead>
        <tbody>
  `;

  COURTS.forEach((court) => {
    html += `<tr><td class="court-label">คอร์ท ${court}</td>`;

    HOURS.forEach((hour) => {
      const status = getSlotStatus(bookings, date, court, hour);
      const config = statusConfig[status];
      html += `<td><span class="slot ${config.className}">${config.label}</span></td>`;
    });

    html += '</tr>';
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Timestamp
  if (bookings?.generated_at) {
    try {
      const genDate = new Date(bookings.generated_at);
      const genStr = genDate.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      html += `<p class="data-timestamp">ข้อมูล ณ วันที่ ${genStr}</p>`;
    } catch (e) {
      html += `<p class="data-timestamp">ข้อมูล ณ วันที่ ${bookings.generated_at}</p>`;
    }
  }

  container.innerHTML = html;
  container.classList.add('fade-in-up');
  setTimeout(() => container.classList.remove('fade-in-up'), 600);
}

// ===== DATE NAVIGATION =====
function changeDate(days) {
  selectedDate = addDays(selectedDate, days);
  const picker = document.getElementById('date-picker');
  if (picker) picker.value = selectedDate;
  loadBookings();
}

function goToToday() {
  selectedDate = getTodayDateString();
  const picker = document.getElementById('date-picker');
  if (picker) picker.value = selectedDate;
  loadBookings();
}

function onDatePickerChange(value) {
  if (!value) return;
  selectedDate = value;
  loadBookings();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Init date picker
  const picker = document.getElementById('date-picker');
  if (picker) {
    picker.value = selectedDate;
    picker.addEventListener('change', (e) => onDatePickerChange(e.target.value));
  }

  // Init clock
  updateClock();
  setInterval(updateClock, 1000);

  // Init slideshow
  initSlideshow();

  // Load bookings
  loadBookings();
});

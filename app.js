// =========================
// Nosh Navigator - app.js
// =========================

// -------- Global state --------
let currentPage = 'home';
let cart = [];
let isSignedIn = false;

// =============================================================
// MAP & LOCATION (Leaflet + HTML5 Geolocation, no Google key)
// =============================================================
let map;
let userMarker;
let restaurantMarkers = [];

// Seed demo restaurants (adjust coords for your city)
const SEED_RESTAURANTS = [
  {
    id: 1,
    name: "Mario's Pizzeria",
    cuisine: ["Italian", "Pizza"],
    priceLevel: "$$",
    rating: 4.8,
    eta: "25-35 min",
    lat: 37.781,
    lng: -122.41,
    featuredItem: { name: "Margherita Pizza", price: 18.99 }
  },
  {
    id: 2,
    name: "Green Garden",
    cuisine: ["Healthy", "Salads"],
    priceLevel: "$$$",
    rating: 4.9,
    eta: "15-25 min",
    lat: 37.786,
    lng: -122.407,
    featuredItem: { name: "Caesar Salad", price: 14.99 }
  },
  {
    id: 3,
    name: "Spice Route",
    cuisine: ["Indian", "Spicy"],
    priceLevel: "$",
    rating: 4.6,
    eta: "30-40 min",
    lat: 37.776,
    lng: -122.415,
    featuredItem: { name: "Chicken Curry", price: 12.99 }
  }
];

// Haversine distance (miles)
function haversineMi(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 3958.761; // earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Cache user location for 5 minutes
function getCachedLocation() {
  try {
    const raw = localStorage.getItem('nn_loc_cache');
    if (!raw) return null;
    const { lat, lng, ts } = JSON.parse(raw);
    if (Date.now() - ts > 5 * 60 * 1000) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
function setCachedLocation(pos) {
  try {
    localStorage.setItem('nn_loc_cache', JSON.stringify({ ...pos, ts: Date.now() }));
  } catch {}
}

// Get device location (Promise)
function getUserLocation() {
  return new Promise((resolve, reject) => {
    const cached = getCachedLocation();
    if (cached) return resolve(cached);

    if (!('geolocation' in navigator)) {
      return reject(new Error('Geolocation not supported'));
    }
    navigator.geolocation.getCurrentPosition(
      p => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCachedLocation(coords);
        resolve(coords);
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

function initMap() {
  const el = document.getElementById('map');
  if (!el) return; // map not on this page

  // Only initialize once per page visit
  if (map && map._loaded) {
    // Still refresh markers with latest location if available
    getUserLocation()
      .then(coords => {
        setUserMarker(coords);
        addRestaurantMarkers(SEED_RESTAURANTS, coords);
      })
      .catch(() => addRestaurantMarkers(SEED_RESTAURANTS, null));
    return;
  }

  // Fallback center (San Francisco)
  map = L.map('map', { zoomControl: true }).setView([37.783, -122.41], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Render restaurants first (no distance yet)
  addRestaurantMarkers(SEED_RESTAURANTS, null);

  // Try to get user location
  getUserLocation()
    .then(coords => {
      setUserMarker(coords);
      map.setView([coords.lat, coords.lng], 14);
      addRestaurantMarkers(SEED_RESTAURANTS, coords);
    })
    .catch(() => {
      // optional: showToast('info', 'Location denied. Showing default area.');
    });
}

function setUserMarker(coords) {
  if (!map) return;
  if (userMarker) userMarker.remove();
  userMarker = L.marker([coords.lat, coords.lng], { title: 'You are here' })
    .addTo(map)
    .bindPopup('You are here');
}

function addRestaurantMarkers(restaurants, userCoords) {
  if (!map) return;

  // Clear old markers
  restaurantMarkers.forEach(m => m.remove());
  restaurantMarkers = [];

  const group = L.featureGroup();

  restaurants.forEach(r => {
    const distanceMi =
      userCoords ? haversineMi(userCoords, { lat: r.lat, lng: r.lng }) : null;
    const distTxt =
      distanceMi != null ? `${distanceMi.toFixed(distanceMi < 1 ? 2 : 1)} mi` : '—';

    const popupHtml = `
      <div class="font-poppins text-slate">
        <div class="font-semibold">${r.name} <span class="text-gray-500">${r.priceLevel}</span></div>
        <div class="text-sm text-gray-600 mb-1">${r.cuisine.join(' • ')}</div>
        <div class="text-sm text-gray-600 mb-2">⭐ ${r.rating} • ${r.eta} • ${distTxt}</div>
        <button
          onclick="addToCart('${r.name.replace(/'/g, "\\'")}', '${r.featuredItem.name.replace(/'/g, "\\'")}', ${r.featuredItem.price})"
          class="bg-emerald hover:bg-emerald/90 text-white text-sm font-medium py-1.5 px-3 rounded-xl transition-colors"
        >
          Add ${r.featuredItem.name} - $${r.featuredItem.price.toFixed(2)}
        </button>
      </div>
    `;

    const marker = L.marker([r.lat, r.lng], { title: r.name }).bindPopup(popupHtml, {
      maxWidth: 260
    });

    marker.addTo(map);
    restaurantMarkers.push(marker);
    group.addLayer(marker);
  });

  if (restaurants.length) {
    map.fitBounds(group.getBounds().pad(0.2));
    if (userCoords) map.panTo([userCoords.lat, userCoords.lng]);
  }
}

// ---------------- Page navigation ----------------
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page')?.classList.add('active');
  currentPage = page;

  if (page === 'cart') updateCartDisplay();
  if (page === 'deals') {
    // Ensure container is visible before Leaflet measures it
    setTimeout(() => initMap(), 0);
  }
}

// ---------------- Authentication ----------------
function switchTab(tab) {
  const signInTab = document.getElementById('signInTab');
  const registerTab = document.getElementById('registerTab');
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');

  if (tab === 'signIn') {
    signInTab.classList.add('border-emerald', 'text-emerald');
    signInTab.classList.remove('border-gray-200', 'text-gray-500');
    registerTab.classList.add('border-gray-200', 'text-gray-500');
    registerTab.classList.remove('border-emerald', 'text-emerald');
    signInForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTab.classList.add('border-emerald', 'text-emerald');
    registerTab.classList.remove('border-gray-200', 'text-gray-500');
    signInTab.classList.add('border-gray-200', 'text-gray-500');
    signInTab.classList.remove('border-emerald', 'text-emerald');
    registerForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
  }
}

function signIn() {
  isSignedIn = true;
  showToast('success', "Welcome back! You're now signed in.");
  showPage('deals');
}

function register() {
  isSignedIn = true;
  showToast('success', 'Account created successfully! Welcome to Nosh Navigator.');
  showPage('deals');
}

// ---------------- Search ----------------
function performSearch() {
  const query = document.getElementById('searchInput')?.value || '';
  if (query.trim()) {
    showToast('info', `Searching for "${query}"...`);
    setTimeout(() => {
      showPage('deals');
      showToast('success', 'Found great matches for your search!');
    }, 1000);
  }
}

// ---------------- Cart ----------------
function addToCart(restaurant, item, price) {
  const existingItem = cart.find(
    ci => ci.restaurant === restaurant && ci.item === item
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: Date.now(),
      restaurant,
      item,
      price,
      quantity: 1
    });
  }

  updateCartCount();
  showToast('success', `${item} added to cart!`);
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCartCount();
  updateCartDisplay();
  showToast('info', 'Item removed from cart');
}

function updateQuantity(id, change) {
  const item = cart.find(ci => ci.id === id);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      updateCartCount();
      updateCartDisplay();
    }
  }
}

function updateCartCount() {
  const count = cart.reduce((t, i) => t + i.quantity, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = String(count);
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const payButton = document.getElementById('payButton');

  if (!cartItems || !emptyCart || !payButton) return;

  if (cart.length === 0) {
    cartItems.innerHTML = '';
    emptyCart.style.display = 'block';
    payButton.disabled = true;
    updateOrderSummary(0);
    return;
  }

  emptyCart.style.display = 'none';
  payButton.disabled = false;

  cartItems.innerHTML = cart
    .map(
      item => `
      <div class="bg-white rounded-2xl shadow-soft p-6">
        <div class="flex items-start gap-4">
          <div class="w-20 h-20 bg-gradient-to-br from-emerald to-lime rounded-xl flex-shrink-0"></div>
          <div class="flex-1">
            <h4 class="font-poppins font-semibold text-slate mb-1">${item.item}</h4>
            <p class="text-sm text-gray-600 mb-3">${item.restaurant}</p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <button onclick="updateQuantity(${item.id}, -1)" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                <span class="font-medium text-slate w-8 text-center">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
              <div class="text-right">
                <p class="font-poppins font-semibold text-slate">$${(item.price * item.quantity).toFixed(2)}</p>
                <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-600 text-sm transition-colors">Remove</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
    )
    .join('');

  const subtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  updateOrderSummary(subtotal);
}

function updateOrderSummary(subtotal) {
  const deliveryFee = subtotal > 0 ? 2.99 : 0;
  const tax = subtotal * 0.08875; // 8.875% tax
  const total = subtotal + deliveryFee + tax;

  const s = v => `$${v.toFixed(2)}`;
  const subEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const totEl = document.getElementById('total');

  if (subEl) subEl.textContent = s(subtotal);
  if (taxEl) taxEl.textContent = s(tax);
  if (totEl) totEl.textContent = s(total);
}

function processPayment() {
  if (cart.length === 0) return;

  const total = parseFloat(
    (document.getElementById('total')?.textContent || '$0').replace('$', '')
  );

  const orderNumber = `#NS-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 1000)
  ).padStart(3, '0')}`;

  const orderNumEl = document.getElementById('orderNumber');
  const paidEl = document.getElementById('paidAmount');

  if (orderNumEl) orderNumEl.textContent = orderNumber;
  if (paidEl) paidEl.textContent = `$${total.toFixed(2)}`;

  cart = [];
  updateCartCount();

  showPage('confirmation');
  showToast('success', 'Payment processed successfully!');
}

function trackOrder() {
  showToast('info', 'Order tracking feature coming soon!');
}

function reorder() {
  showPage('deals');
  showToast('success', 'Browse our menu to place a new order!');
}
// ===== Minimal Chatbot (fresh start) =====
let chatHistory = [
  { role: 'assistant', content: "Hi! I’m your assistant. Ask me anything, or say 'help'." }
];

function renderChat() {
  const box = document.getElementById('chatMessages');
  if (!box) return;

  box.innerHTML = chatHistory.map(m => {
    const isUser = m.role === 'user';
    return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'} gap-2">
        ${isUser ? '' : `
          <div class="w-7 h-7 rounded-full bg-emerald/15 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 48 48" class="text-emerald">
              <path d="M24 12l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor"/>
            </svg>
          </div>`}
        <div class="${isUser ? 'chat-user' : 'chat-bot'} px-3 py-2 max-w-[80%]">
          ${isUser ? escapeHtml(m.content) : m.content}
        </div>
        ${isUser ? `
          <div class="w-7 h-7 rounded-full bg-emerald text-white flex items-center justify-center text-xs font-medium flex-shrink-0">U</div>
        ` : ''}
      </div>`;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

// Typewriter: keep dots visible, then type the reply
let _typingRunId = 0;
function typeReplyAt(index, reply, { msPerChar = 22, initialDelay = 600, chunk = 2 } = {}) {
  // prepare safe HTML
  const full = escapeHtml(String(reply ?? '')).replace(/\n/g, '<br>');
  const runId = ++_typingRunId;

  // IMPORTANT: do NOT clear the bubble yet — leave the dots showing
  // We only start typing after the delay:
  setTimeout(() => {
    if (runId !== _typingRunId) return; // canceled by newer send

    // now replace the dots with an empty bubble and start typing
    chatHistory[index] = { role: 'assistant', content: '' };
    renderChat();

    let i = 0;
    const tick = () => {
      if (runId !== _typingRunId) return; // canceled by newer send
      i = Math.min(i + chunk, full.length);
      chatHistory[index].content = full.slice(0, i);
      renderChat();
      if (i < full.length) {
        setTimeout(tick, msPerChar * chunk);
      }
    };
    tick();
  }, initialDelay);
}


function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]
  ));
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = (input.value || '').trim();
  if (!text) return;

  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  renderChat();
  
  chatHistory.push({ 
    role: 'assistant', 
    content: '<span class="typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>' 
  });
  const placeholderIndex = chatHistory.length - 1;

  renderChat();

  try {
    const reply = await Chat.process(text);
    typeReplyAt(placeholderIndex, reply, {
      msPerChar: 22,
      initialDelay: 600,
      chunk: 2
    });
  } catch (e) {
    chatHistory[placeholderIndex] = { role: 'assistant', content: "Sorry — I couldn't reply just now." };
    console.error(e);
  }
  renderChat();
}
function clearChat() {
  chatHistory = [
    { role: 'assistant', content: "Chat cleared 👌 What would you like to do next?" }
  ];
  renderChat();
}


// ===== Smart Chat: intent, entities, ranking, cart glue =====
const Chat = {
  lastResults: [],

  async process(text) {
    const q = text.trim();
    const ql = q.toLowerCase();

    // Clear chat
    if (ql === 'clear' || ql === 'reset') {
      clearChat();
      return "I’ve cleared our conversation.";
    }

    // Help
    if (/^(help|\?)\b|what can you do|how (to|do)\b/.test(ql)) {
      return "I can search by cuisine (pizza, indian), price ($, $$, $$$ or 'cheap'), speed ('fastest'), and spicy. Try: ‘cheapest italian’, ‘fastest salad’, or ‘add #1’. Say ‘view cart’ anytime.";
    }

    // View cart
    if (/(show|view|open).*(cart)/.test(ql)) {
      showPage('cart');
      return "Opened your cart.";
    }

    // Add to cart from chat: “add #1”, “add margherita from mario’s”
    if (/(^|\b)(add|order|buy|put)\b/.test(ql)) {
      const msg = this.tryAddFromText(ql);
      return msg || "Tell me which item — e.g., ‘add Margherita from Mario’s’ or ‘add #1’.";
    }

    // Otherwise: search & recommend
    const filters = this.parseFilters(ql);
    const coords = getCachedLocation(); // already in your app:contentReference[oaicite:2]{index=2}
    const ranked = this.search(filters, coords);
    this.lastResults = ranked.map(x => x.r);

    if (!ranked.length) return "I didn't find a great match. Try a different cuisine or budget.";

    const lines = ranked.map((x, i) => {
      const r = x.r;
      const distTxt = x.distanceMi != null ? `${x.distanceMi.toFixed(x.distanceMi < 1 ? 2 : 1)} mi` : '—';
      const [minEta, maxEta] = (r.eta || "").split('-');
      return `${i + 1}) ${r.name} • ${r.cuisine.join(', ')} • ${r.priceLevel} • ⭐ ${r.rating} • ${minEta ?? ''}${maxEta ? '–' + maxEta : ''} min • ${distTxt}. Try their ${r.featuredItem.name} for $${r.featuredItem.price.toFixed(2)}.`;
    });

    lines.push("Type ‘add #1’ or ‘add Margherita from Mario’s’. Say ‘view cart’ anytime.");
    return lines.join('\n');
  },

  parseFilters(q) {
    // cuisines & traits
    const CUIS = ['italian','pizza','indian','salad','healthy','spicy'];
    const cuisines = CUIS.filter(c => q.includes(c));
    const canon = cuisines.map(c => {
      if (c === 'pizza') return 'Pizza';
      if (c === 'italian') return 'Italian';
      if (c === 'indian') return 'Indian';
      if (c === 'salad' || c === 'healthy') return 'Healthy';
      if (c === 'spicy') return 'Spicy';
      return c;
    });

    // price
    let price = null;
    if (/\bcheap(est)?|\b\$\b/.test(q)) price = '$';
    else if (/\bmoderate|\$\$\b/.test(q)) price = '$$';
    else if (/\bpremium|expensive|\$\$\$\b/.test(q)) price = '$$$';

    const fastest = /\bfast(est)?|quick(est)?\b/.test(q);
    const spicy = /\bspicy|heat\b/.test(q);

    return { cuisines: Array.from(new Set(canon)), price, fastest, spicy };
  },

  search(filters, coords) {
    // Use your SEED_RESTAURANTS (already in file):contentReference[oaicite:3]{index=3}
    let arr = SEED_RESTAURANTS.filter(r => {
      const cuisineOk = !filters.cuisines.length || filters.cuisines.some(c => r.cuisine.map(x => x.toLowerCase()).includes(c.toLowerCase()));
      const priceOk = !filters.price || r.priceLevel === filters.price;
      const spicyOk = !filters.spicy || r.cuisine.includes('Spicy') || /spice/i.test(r.name);
      return cuisineOk && priceOk && spicyOk;
    }).map(r => {
      const distanceMi = coords ? haversineMi(coords, { lat: r.lat, lng: r.lng }) : null; // haversineMi already in file:contentReference[oaicite:4]{index=4}
      const etaMin = parseInt((r.eta || '').split('-')[0], 10) || 999;
      return { r, distanceMi, etaMin, price: r.featuredItem.price };
    });

    // Sort strategy
    if (filters.fastest) {
      arr.sort((a, b) => a.etaMin - b.etaMin || b.r.rating - a.r.rating || (a.distanceMi ?? 99) - (b.distanceMi ?? 99));
    } else if (filters.price === '$') {
      arr.sort((a, b) => a.price - b.price || b.r.rating - a.r.rating || (a.distanceMi ?? 99) - (b.distanceMi ?? 99));
    } else {
      arr.sort((a, b) => b.r.rating - a.r.rating || (a.distanceMi ?? 99) - (b.distanceMi ?? 99));
    }

    return arr.slice(0, 3);
  },

  tryAddFromText(q) {
    // “add #1/2/3”
    const idx = q.match(/#?\b([1-3])\b/);
    if (idx && this.lastResults[Number(idx[1]) - 1]) {
      const r = this.lastResults[Number(idx[1]) - 1];
      addToCart(r.name, r.featuredItem.name, r.featuredItem.price); // uses your cart code:contentReference[oaicite:5]{index=5}
      return `Added ${r.featuredItem.name} from ${r.name} to your cart.`;
    }

    // by restaurant name (quick fuzzy-ish contains)
    const byName = SEED_RESTAURANTS.find(r => q.includes(r.name.toLowerCase()));
    if (byName) {
      addToCart(byName.name, byName.featuredItem.name, byName.featuredItem.price);
      return `Added ${byName.featuredItem.name} from ${byName.name} to your cart.`;
    }

    // by item keywords
    if (/margherita|pizza/.test(q)) {
      const r = SEED_RESTAURANTS.find(r => /pizzeria|pizza/i.test(r.name));
      if (r) { addToCart(r.name, r.featuredItem.name, r.featuredItem.price); return `Added ${r.featuredItem.name} from ${r.name}.`; }
    }
    if (/salad|caesar/.test(q)) {
      const r = SEED_RESTAURANTS.find(r => /garden/i.test(r.name));
      if (r) { addToCart(r.name, r.featuredItem.name, r.featuredItem.price); return `Added ${r.featuredItem.name} from ${r.name}.`; }
    }
    if (/curry|chicken curry/.test(q)) {
      const r = SEED_RESTAURANTS.find(r => /spice route/i.test(r.name));
      if (r) { addToCart(r.name, r.featuredItem.name, r.featuredItem.price); return `Added ${r.featuredItem.name} from ${r.name}.`; }
    }

    return null;
  }
};



// ---------------- Chatbot ----------------
function toggleChatbot(forceOpen) {
  const widget = document.getElementById('chatWidget');
  const bubble = document.getElementById('chatbotBubble');
  if (!widget || !bubble) return;

  const willOpen = forceOpen !== undefined ? !!forceOpen : !widget.classList.contains('chat-open');
  widget.classList.toggle('chat-open', willOpen);

  // keep a11y in sync
  bubble.setAttribute('aria-hidden', (!willOpen).toString());

  if (willOpen) {
    renderChat();
    setTimeout(() => document.getElementById('chatInput')?.focus(), 0);
  }
}


function chatbotSuggest(type) {
  const suggestions = {
    pizza: "Great choice! I found Mario's Pizzeria with amazing deals on pizza.",
    healthy: 'Perfect! Green Garden has the best healthy options nearby.',
    deals: 'Awesome! Check out our deals page for the best offers today.'
  };

  showToast('success', suggestions[type] || 'Let’s explore!');
  if (type === 'deals') showPage('deals');
  toggleChatbot();
}
async function sendQuick(text) {
  const input = document.getElementById('chatInput');
  if (input) input.value = text;
  await sendChatMessage();
}

// ---------------- Toasts ----------------
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const config = {
    success: {
      bg: 'bg-emerald',
      icon:
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>'
    },
    error: {
      bg: 'bg-red-500',
      icon:
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    },
    info: {
      bg: 'bg-blue-500',
      icon:
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    }
  };

  const { bg, icon } = config[type] || config.info;

  toast.className = `toast ${bg} text-white p-4 rounded-2xl shadow-soft-lg flex items-center gap-3 min-w-80 max-w-md`;
  toast.innerHTML = `
    ${icon}
    <span class="font-medium flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="hover:opacity-70 transition-opacity">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.parentElement && toast.remove(), 5000);
}

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', function () {
  // Ensure one page is active (in case class was lost)
  const pages = document.querySelectorAll('.page');
  const hasActive = Array.from(pages).some(p => p.classList.contains('active'));
  if (!hasActive) document.getElementById('homePage')?.classList.add('active');

  updateCartCount();

  // Enter-to-search
  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Close chatbot when clicking outside
  document.addEventListener('click', function (e) {
    const widget = document.getElementById('chatWidget');
    const chatbot = document.getElementById('chatbotBubble');
    const launcher = document.getElementById('chatLauncher');
    if (!widget || !chatbot || !launcher) return;

    const clickInsideBubble = chatbot.contains(e.target);
    const clickOnLauncher   = launcher.contains(e.target);

    if (!clickInsideBubble && !clickOnLauncher && widget.classList.contains('chat-open')) {
      widget.classList.remove('chat-open');
      chatbot.setAttribute('aria-hidden', 'true');
    }
  });

  // Chat: Enter-to-send
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // Initial chat render (in case bubble is initially open)
  renderChat();

  // "Use my location" button
  const useBtn = document.getElementById('useLocationBtn');
  if (useBtn) {
    useBtn.addEventListener('click', async () => {
      try {
        const coords = await getUserLocation();
        if (!map) initMap();
        setUserMarker(coords);
        map.setView([coords.lat, coords.lng], 14);
        addRestaurantMarkers(SEED_RESTAURANTS, coords);
        showToast('success', 'Location updated ✔');
      } catch (e) {
        showToast('error', 'Could not access location. Allow permission and try again.');
      }
    });
  }
});

// Expose functions used by inline HTML handlers
window.showPage = showPage;
window.switchTab = switchTab;
window.signIn = signIn;
window.register = register;
window.performSearch = performSearch;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.processPayment = processPayment;
window.trackOrder = trackOrder;
window.reorder = reorder;
window.toggleChatbot = toggleChatbot;
window.chatbotSuggest = chatbotSuggest;
window.showToast = showToast;
window.sendChatMessage = sendChatMessage;
window.clearChat = clearChat;
window.sendQuick = sendQuick;


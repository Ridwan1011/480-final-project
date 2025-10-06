// Simple state
let cart = [];

// ----- Page switching -----
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(id+'Page');
  if(el){ el.classList.remove('hidden'); el.classList.add('active'); }
  // map needs to be visible to render; init if needed
  if(id==='deals'){ ensureMap(); }
}

// Header nav
document.getElementById('dealsNav').addEventListener('click', () => showPage('deals'));
document.getElementById('cartNav').addEventListener('click', () => alert('Cart coming soon'));

// ----- Auth tabs -----
const signInTab = document.getElementById('signInTab');
const registerTab = document.getElementById('registerTab');
const signInForm = document.getElementById('signInForm');
const registerForm = document.getElementById('registerForm');

signInTab.addEventListener('click', () => {
  signInTab.classList.add('border-b-2','border-emerald-600','text-[#111827]');
  registerTab.classList.remove('border-b-2','border-emerald-600');
  signInForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
});
registerTab.addEventListener('click', () => {
  registerTab.classList.add('border-b-2','border-emerald-600','text-[#111827]');
  signInTab.classList.remove('border-b-2','border-emerald-600');
  registerForm.classList.remove('hidden');
  signInForm.classList.add('hidden');
});

document.getElementById('signInBtn').addEventListener('click', () => {
  alert('Signed in (demo)');
  showPage('deals');
});
document.getElementById('registerBtn').addEventListener('click', () => {
  alert('Account created (demo)');
  showPage('deals');
});

// ----- Search wiring -----
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keydown', e=>{
  if(e.key==='Enter'){ performSearch(); }
});

function performSearch(){
  const q = (document.getElementById('searchInput').value||'').trim();
  if(!q) return;
  showPage('deals');
  // If Places is available, run a text search around the current map center.
  if(typeof google==='object' && google.maps && placesService){
    const req = { query:q, location: map.getCenter(), radius: 4000, type:'restaurant' };
    placesService.textSearch(req,(results,status)=>{
      if(status!==google.maps.places.PlacesServiceStatus.OK || !results?.length){
        renderResults([]);
        alert('No results from Places for: '+q);
        return;
      }
      renderPlaces(results);
    });
  } else {
    // Fallback demo items
    renderResults([
      {name:'Mario’s Pizzeria', price:'$$', rating:4.8, eta:'25–35 min'},
      {name:'Green Garden', price:'$$$', rating:4.9, eta:'15–25 min'}
    ]);
  }
}

// ----- Map + Places -----
let map, placesService, userMarker;
function ensureMap(){
  if(map) return;
  const el = document.getElementById('map');
  // fallback center (SF)
  const center = {lat:37.783, lng:-122.41};
  if(typeof google==='object' && google.maps){
    map = new google.maps.Map(el, {center, zoom:13, mapTypeControl:false, streetViewControl:false});
    placesService = new google.maps.places.PlacesService(map);
    // Try geolocation
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const p = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        map.setCenter(p);
        userMarker = new google.maps.Marker({map, position:p, title:'You'});
      },()=>{});
    }
  } else {
    // no maps SDK loaded, just leave the box visible
    el.innerHTML = '<div class="w-full h-full grid place-items-center text-gray-500">Map unavailable (API key / SDK blocked)</div>';
  }
}

function renderPlaces(results){
  const items = results.slice(0,9).map(r=>({
    name: r.name,
    price: typeof r.price_level==='number' ? '$$$$'.slice(0,Math.max(1,Math.min(4,r.price_level))) : '$$',
    rating: r.rating ?? '—',
    eta: '20–40 min'
  }));
  renderResults(items);
}

function renderResults(items){
  const list = document.getElementById('resultsList');
  if(!items.length){
    list.innerHTML = '<div class="col-span-full p-6 bg-white rounded-2xl border text-gray-600">No results. Try another search.</div>';
    return;
  }
  list.innerHTML = items.map(it=>`
    <div class="bg-white rounded-2xl border p-4 shadow-soft">
      <div class="font-poppins font-semibold">${it.name} <span class="text-gray-500">${it.price}</span></div>
      <div class="text-sm text-gray-600 mb-3">⭐ ${it.rating} • ${it.eta}</div>
      <button class="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 py-2" onclick="addToCart('${it.name.replace(/'/g,'\\\'')}','Recommended',14.99)">Add Recommended - $14.99</button>
    </div>
  `).join('');
}

// ----- Cart (minimal) -----
function addToCart(restaurant,item,price){
  cart.push({id:Date.now(), restaurant,item,price,qty:1});
  const cc = document.getElementById('cartCount');
  const total = cart.reduce((t,i)=>t+i.qty,0);
  if(total>0){ cc.textContent = total; cc.classList.remove('hidden'); }
  alert(`${item} from ${restaurant} added!`);
}
window.addToCart = addToCart;

// ----- Chat demo -----
const chatBtn = document.getElementById('chatLauncher');
const chatPanel = document.getElementById('chatPanel');
const chatSend = document.getElementById('chatSend');
const chatInput = document.getElementById('chatInput');
const chatBox = document.getElementById('chatMessages');

chatBtn.addEventListener('click', ()=>{
  chatPanel.classList.toggle('hidden');
  if(!chatPanel.classList.contains('hidden')) chatInput.focus();
});

chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(); });

function sendChat(){
  const t = (chatInput.value||'').trim();
  if(!t) return;
  appendMsg('user', t);
  chatInput.value = '';
  // local demo reply
  setTimeout(()=>{
    if(/pizza|salad|indian|deal|cheap|fast|spicy/i.test(t)){
      appendMsg('bot', "Got it! Tap **Deals** or use the search box and I'll look nearby.");
    } else {
      appendMsg('bot', "I'm best with food queries. Try 'cheapest pizza' or 'fastest salad'.");
    }
  }, 400);
}

function appendMsg(role, text){
  const bubble = document.createElement('div');
  bubble.className = role==='user' ? 'text-right' : 'text-left';
  bubble.innerHTML = `<div class="${role==='user'?'bg-emerald-600 text-white':'bg-gray-100 text-gray-800'} inline-block px-3 py-2 rounded-xl max-w-[85%]">${text}</div>`;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// default show home
showPage('home');

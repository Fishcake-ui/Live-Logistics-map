// Credits: 9e2fdb788f7d0cefa8a65613d780f676bea82fddbb7cc9a066edd8122ddec245
const map = L.map('map').setView([0, 0], 2);

const lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors & CartoDB'
});
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri'
});
let heatLayer = null;

lightLayer.addTo(map);

const featureGroup = new L.FeatureGroup();
map.addLayer(featureGroup);

const drawControl = new L.Control.Draw({
  draw: {
    polygon: false,
    circle: false,
    circlemarker: false,
    rectangle: false,
    marker: false,
    polyline: {
      shapeOptions: {
        color: '#f357a1',
        weight: 4
      }
    }
  },
  edit: {
    featureGroup: featureGroup
  }
});

map.addControl(drawControl);

// Prompt for tags when a line is created
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  if (event.layerType === 'polyline') {
    const tagString = prompt('Enter tags for this route (comma separated):', '');
    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t.length) : [];
    layer.bindPopup(tags.length ? 'Tags: ' + tags.join(', ') : 'No tags');
    layer.tags = tags; // store tags on layer for later reference
  }
  featureGroup.addLayer(layer);
});

// Example: click a line to show its tags in alert
featureGroup.on('click', e => {
  if (e.layer && e.layer.tags) {
    alert('Tags: ' + e.layer.tags.join(', '));
  }
});

// Up to 15 reliable logistics-related RSS feeds
const RSS_SOURCES = [
  { name: 'The Loadstar', url: 'https://theloadstar.com/feed/' },
  { name: 'Port Technology', url: 'https://www.porttechnology.org/news/feed/' },
  { name: 'Supply Chain Digital', url: 'https://www.supplychaindigital.com/rss' },
  { name: 'Maritime Executive', url: 'https://www.maritime-executive.com/rss' },
  { name: 'FreightWaves', url: 'https://www.freightwaves.com/feed' },
  { name: 'Container News', url: 'https://container-news.com/feed/' },
  { name: 'Seatrade Maritime', url: 'https://www.seatrade-maritime.com/rss.xml' },
  { name: 'Hellenic Shipping News', url: 'https://www.hellenicshippingnews.com/feed/' },
  { name: 'gCaptain', url: 'https://gcaptain.com/feed/' },
  { name: 'Splash 247', url: 'https://splash247.com/feed/' },
  { name: 'Journal of Commerce', url: 'https://www.joc.com/rssfeed' },
  { name: 'Inbound Logistics', url: 'https://www.inboundlogistics.com/rss' },
  { name: 'DC Velocity', url: 'https://www.dcvelocity.com/rss' },
  { name: 'Logistics Management', url: 'https://www.logisticsmgmt.com/rss' },
  { name: 'Transport Topics', url: 'https://www.ttnews.com/rssfeed/ttnews.xml' }
];
const MAX_SOURCES = 15; // safeguard against overloading

const KEYWORDS = ['logistic', 'supply chain', 'port', 'terminal'];

// Extract possible place names from text using the compromise NLP library
function extractLocations(text) {
  try {
    return nlp(text).places().out('array');
  } catch {
    return [];
  }
}

// Geocode a list of place names and return the most probable match
async function geocodeBest(places) {
  let best = null;
  for (const place of places) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length) {
        const { lat, lon, address, importance } = data[0];
        if (!best || (importance || 0) > (best.importance || 0)) {
          best = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            country: address && address.country ? address.country : 'Unknown',
            importance: importance || 0
          };
        }
      }
    } catch (e) {
      console.error('Geocoding failed', e);
    }
  }
  return best;
}

const newsMarkers = [];
const countrySelect = document.getElementById('country-filter');
const timeSelect = document.getElementById('time-filter');
const applyBtn = document.getElementById('apply-filters');
const themeSelect = document.getElementById('theme-select');
const logoVideo = document.getElementById('logo-video');

if (logoVideo) {
  logoVideo.addEventListener('mouseenter', () => logoVideo.play());
  logoVideo.addEventListener('mouseleave', () => {
    logoVideo.pause();
    logoVideo.currentTime = 0;
  });
}

function populateCountryOptions() {
  if (!countrySelect) return;
  const countries = [...new Set(newsMarkers.map(n => n.country))];
  countrySelect.innerHTML = '<option value="all">All Countries</option>';
  countries.forEach(c => {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    countrySelect.appendChild(option);
  });
}

function showFilteredMarkers() {
  newsMarkers.forEach(n => {
    if (n.visible) {
      if (!map.hasLayer(n.marker)) n.marker.addTo(map);
    } else if (map.hasLayer(n.marker)) {
      map.removeLayer(n.marker);
    }
  });
}

function applyFilters() {
  if (!countrySelect || !timeSelect) return;
  const country = countrySelect.value;
  const time = timeSelect.value;
  const now = Date.now();
  const ranges = {
    day: 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  };
  const cutoff = now - (ranges[time] || ranges.month);
  newsMarkers.forEach(n => {
    const matchesCountry = country === 'all' || n.country === country;
    const matchesDate = n.date.getTime() >= cutoff;
    n.visible = matchesCountry && matchesDate;
  });
  if (themeSelect && themeSelect.value === 'heatmap') {
    applyTheme();
  } else {
    showFilteredMarkers();
  }
}

if (applyBtn) {
  applyBtn.addEventListener('click', applyFilters);
}

function applyTheme() {
  if (!themeSelect) return;
  const theme = themeSelect.value;
  [lightLayer, darkLayer, satelliteLayer].forEach(l => map.removeLayer(l));
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
  switch (theme) {
    case 'dark':
      darkLayer.addTo(map);
      showFilteredMarkers();
      break;
    case 'satellite':
      satelliteLayer.addTo(map);
      showFilteredMarkers();
      break;
    case 'heatmap':
      lightLayer.addTo(map);
      newsMarkers.forEach(n => { if (map.hasLayer(n.marker)) map.removeLayer(n.marker); });
      heatLayer = L.heatLayer(
        newsMarkers.filter(n => n.visible).map(n => {
          const { lat, lng } = n.marker.getLatLng();
          return [lat, lng];
        }),
        { radius: 25 }
      );
      heatLayer.addTo(map);
      break;
    default:
      lightLayer.addTo(map);
      showFilteredMarkers();
      break;
  }
}

if (themeSelect) {
  themeSelect.addEventListener('change', applyTheme);
}

async function fetchNews() {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = '<li>Loading...</li>';
  try {
    const results = await Promise.all(
      RSS_SOURCES.slice(0, MAX_SOURCES).map(src =>
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}`)
          .then(r => r.json())
          .then(data => data.items
            .filter(item => {
              const text = `${item.title} ${(item.description || '')}`.toLowerCase();
              return KEYWORDS.some(k => text.includes(k));
            })
            .slice(0, 5)
            .map(item => ({
              source: src.name,
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              description: item.description
            })))
          .catch(() => [])
      )
    );
    list.innerHTML = '';
    // remove old markers
    newsMarkers.forEach(n => map.removeLayer(n.marker));
    newsMarkers.length = 0;
    if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }

    for (const item of results.flat()) {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.source}:</strong> <a href="${item.link}" target="_blank">${item.title}</a>`;
      list.appendChild(li);

      const places = extractLocations(`${item.title} ${item.description || ''}`);
      const geo = places.length ? await geocodeBest(places) : null;
      let marker = null;
      if (geo) {
        marker = L.marker([geo.lat, geo.lon]).bindPopup(
          `<strong>${item.source}</strong><br><a href="${item.link}" target="_blank">${item.title}</a>`
        );
        marker.addTo(map);
        newsMarkers.push({ marker, country: geo.country, date: new Date(item.pubDate) });
      }

      li.addEventListener('click', e => {
        if (marker && e.target.tagName.toLowerCase() !== 'a') {
          map.setView(marker.getLatLng(), 6);
          marker.openPopup();
        }
      });
    }
    populateCountryOptions();
    applyFilters();
  } catch (err) {
    list.innerHTML = '<li>Failed to load news.</li>';
  }
}

fetchNews();
setInterval(fetchNews, 6 * 60 * 60 * 1000);

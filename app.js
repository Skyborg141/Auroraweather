// ===== SkyPulse Weather App =====
// Uses Open-Meteo API (free, no API key required)

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    loadingScreen: $('#loading-screen'),
    mainContent: $('#main-content'),
    errorScreen: $('#error-screen'),
    errorMessage: $('#error-message'),
    retryBtn: $('#retry-btn'),
    searchInput: $('#search-input'),
    searchSuggestions: $('#search-suggestions'),
    locationBtn: $('#location-btn'),
    cityName: $('#city-name'),
    heroDate: $('#hero-date'),
    heroTemp: $('#hero-temp'),
    heroDesc: $('#hero-desc'),
    heroHigh: $('#hero-high'),
    heroLow: $('#hero-low'),
    feelsLike: $('#feels-like'),
    humidity: $('#humidity'),
    wind: $('#wind'),
    pressure: $('#pressure'),
    visibility: $('#visibility'),
    uvIndex: $('#uv-index'),
    hourlyScroll: $('#hourly-scroll'),
    dailyForecast: $('#daily-forecast'),
    sunriseTime: $('#sunrise-time'),
    sunsetTime: $('#sunset-time'),
    weatherAnimation: $('#weather-animation'),
    bgCanvas: $('#bg-canvas'),
    sunArcProgress: $('#sun-arc-progress'),
    sunPosition: $('#sun-position'),
};

// ===== State =====
let currentLocation = { lat: null, lon: null, name: '' };
let searchTimeout = null;

// ===== Weather Code Mapping =====
const WEATHER_CODES = {
    0: { desc: 'Clear sky', icon: '☀️', nightIcon: '🌙', type: 'clear' },
    1: { desc: 'Mainly clear', icon: '🌤️', nightIcon: '🌙', type: 'clear' },
    2: { desc: 'Partly cloudy', icon: '⛅', nightIcon: '☁️', type: 'cloudy' },
    3: { desc: 'Overcast', icon: '☁️', nightIcon: '☁️', type: 'cloudy' },
    45: { desc: 'Foggy', icon: '🌫️', nightIcon: '🌫️', type: 'fog' },
    48: { desc: 'Depositing rime fog', icon: '🌫️', nightIcon: '🌫️', type: 'fog' },
    51: { desc: 'Light drizzle', icon: '🌦️', nightIcon: '🌧️', type: 'rain' },
    53: { desc: 'Moderate drizzle', icon: '🌦️', nightIcon: '🌧️', type: 'rain' },
    55: { desc: 'Dense drizzle', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    56: { desc: 'Freezing drizzle', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    57: { desc: 'Dense freezing drizzle', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    61: { desc: 'Slight rain', icon: '🌦️', nightIcon: '🌧️', type: 'rain' },
    63: { desc: 'Moderate rain', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    65: { desc: 'Heavy rain', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    66: { desc: 'Freezing rain', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    67: { desc: 'Heavy freezing rain', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    71: { desc: 'Slight snowfall', icon: '🌨️', nightIcon: '🌨️', type: 'snow' },
    73: { desc: 'Moderate snowfall', icon: '🌨️', nightIcon: '🌨️', type: 'snow' },
    75: { desc: 'Heavy snowfall', icon: '❄️', nightIcon: '❄️', type: 'snow' },
    77: { desc: 'Snow grains', icon: '🌨️', nightIcon: '🌨️', type: 'snow' },
    80: { desc: 'Slight showers', icon: '🌦️', nightIcon: '🌧️', type: 'rain' },
    81: { desc: 'Moderate showers', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    82: { desc: 'Violent showers', icon: '🌧️', nightIcon: '🌧️', type: 'rain' },
    85: { desc: 'Slight snow showers', icon: '🌨️', nightIcon: '🌨️', type: 'snow' },
    86: { desc: 'Heavy snow showers', icon: '❄️', nightIcon: '❄️', type: 'snow' },
    95: { desc: 'Thunderstorm', icon: '⛈️', nightIcon: '⛈️', type: 'thunder' },
    96: { desc: 'Thunderstorm with hail', icon: '⛈️', nightIcon: '⛈️', type: 'thunder' },
    99: { desc: 'Thunderstorm with heavy hail', icon: '⛈️', nightIcon: '⛈️', type: 'thunder' },
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', init);

function init() {
    createBackgroundParticles();
    setupEventListeners();
    loadDefaultLocation();
}

function createBackgroundParticles() {
    const canvas = DOM.bgCanvas;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'bg-particle';
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 20 + 15}s`;
        particle.style.animationDelay = `${Math.random() * 20}s`;
        canvas.appendChild(particle);
    }
}

function setupEventListeners() {
    // Search input
    DOM.searchInput.addEventListener('input', handleSearchInput);
    DOM.searchInput.addEventListener('focus', () => {
        if (DOM.searchSuggestions.children.length > 0) {
            DOM.searchSuggestions.classList.add('active');
        }
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-wrapper')) {
            DOM.searchSuggestions.classList.remove('active');
        }
    });

    // Keyboard navigation for search
    DOM.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            DOM.searchSuggestions.classList.remove('active');
            DOM.searchInput.blur();
        }
    });

    // Location button
    DOM.locationBtn.addEventListener('click', getUserLocation);

    // Retry button
    DOM.retryBtn.addEventListener('click', () => {
        if (currentLocation.lat && currentLocation.lon) {
            fetchWeather(currentLocation.lat, currentLocation.lon, currentLocation.name);
        } else {
            loadDefaultLocation();
        }
    });
}

// ===== Location =====
function loadDefaultLocation() {
    // Try geolocation first, fallback to Dhaka (user's timezone suggests Bangladesh)
    if ('geolocation' in navigator) {
        getUserLocation();
    } else {
        fetchWeather(23.8103, 90.4125, 'Dhaka');
    }
}

function getUserLocation() {
    showLoading();
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                // Reverse geocode to get city name
                const name = await reverseGeocode(latitude, longitude);
                fetchWeather(latitude, longitude, name);
            },
            (err) => {
                console.warn('Geolocation denied:', err.message);
                // Fallback to Dhaka
                fetchWeather(23.8103, 90.4125, 'Dhaka');
            },
            { timeout: 8000, enableHighAccuracy: false }
        );
    } else {
        fetchWeather(23.8103, 90.4125, 'Dhaka');
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const resp = await fetch(`${GEOCODING_API}?latitude=${lat}&longitude=${lon}&count=1`);
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].name;
        }
    } catch (e) {
        console.warn('Reverse geocode failed:', e);
    }
    return 'Your Location';
}

// ===== Search =====
function handleSearchInput(e) {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
        DOM.searchSuggestions.classList.remove('active');
        DOM.searchSuggestions.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(() => searchCities(query), 350);
}

async function searchCities(query) {
    try {
        const resp = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en`);
        const data = await resp.json();

        if (!data.results || data.results.length === 0) {
            DOM.searchSuggestions.innerHTML = `
                <div class="suggestion-item" style="cursor:default; opacity:0.5;">
                    <span class="suggestion-name">No cities found</span>
                </div>
            `;
            DOM.searchSuggestions.classList.add('active');
            return;
        }

        DOM.searchSuggestions.innerHTML = data.results.map(city => `
            <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="suggestion-name">${city.name}</span>
                <span class="suggestion-country">${city.admin1 ? city.admin1 + ', ' : ''}${city.country || ''}</span>
            </div>
        `).join('');

        // Add click handlers
        DOM.searchSuggestions.querySelectorAll('.suggestion-item[data-lat]').forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat);
                const lon = parseFloat(item.dataset.lon);
                const name = item.dataset.name;
                DOM.searchInput.value = name;
                DOM.searchSuggestions.classList.remove('active');
                fetchWeather(lat, lon, name);
            });
        });

        DOM.searchSuggestions.classList.add('active');
    } catch (e) {
        console.error('Search failed:', e);
    }
}

// ===== Fetch Weather =====
async function fetchWeather(lat, lon, name) {
    showLoading();
    currentLocation = { lat, lon, name };

    try {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility,is_day,uv_index',
            hourly: 'temperature_2m,weather_code,is_day',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max',
            timezone: 'auto',
            forecast_days: 7,
        });

        const resp = await fetch(`${WEATHER_API}?${params}`);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        const data = await resp.json();

        renderWeather(data, name);
        showMain();
    } catch (err) {
        console.error('Weather fetch failed:', err);
        showError(err.message);
    }
}

// ===== Render =====
function renderWeather(data, cityName) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    // City & Date
    DOM.cityName.textContent = cityName;
    const now = new Date();
    DOM.heroDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Current Weather
    const temp = Math.round(current.temperature_2m);
    DOM.heroTemp.textContent = temp;

    const weatherInfo = WEATHER_CODES[current.weather_code] || WEATHER_CODES[0];
    DOM.heroDesc.textContent = weatherInfo.desc;

    // High / Low
    const todayHigh = Math.round(daily.temperature_2m_max[0]);
    const todayLow = Math.round(daily.temperature_2m_min[0]);
    DOM.heroHigh.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        ${todayHigh}°
    `;
    DOM.heroLow.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        ${todayLow}°
    `;

    // Detail cards
    DOM.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;
    DOM.humidity.textContent = `${current.relative_humidity_2m}%`;
    DOM.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    DOM.pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
    DOM.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    DOM.uvIndex.textContent = current.uv_index !== undefined ? current.uv_index.toFixed(1) : '--';

    // Weather animation
    renderWeatherAnimation(weatherInfo.type, current.is_day);

    // Hourly forecast (next 24 hours)
    renderHourlyForecast(hourly);

    // Daily forecast
    renderDailyForecast(daily);

    // Sunrise & Sunset
    renderSunArc(daily.sunrise[0], daily.sunset[0], data.timezone);

    // Update background gradient based on weather
    updateBackgroundTheme(weatherInfo.type, current.is_day);
}

function renderWeatherAnimation(type, isDay) {
    const container = DOM.weatherAnimation;
    container.innerHTML = '';

    switch (type) {
        case 'clear':
            if (isDay) {
                container.innerHTML = '<div class="weather-sun"></div>';
            } else {
                container.innerHTML = '<div class="weather-moon"></div>';
            }
            break;

        case 'cloudy':
            let cloudsHTML = '<div class="weather-cloud cloud-1"></div><div class="weather-cloud cloud-2"></div><div class="weather-cloud cloud-3"></div>';
            if (isDay) {
                cloudsHTML = '<div class="weather-sun" style="width:60px;height:60px;top:25%;left:60%;transform:none;"></div>' + cloudsHTML;
            }
            container.innerHTML = cloudsHTML;
            break;

        case 'rain':
            let rainHTML = '<div class="weather-cloud cloud-1" style="background:linear-gradient(180deg, rgba(140,150,170,0.9), rgba(100,110,130,0.8));"></div>';
            rainHTML += '<div class="weather-cloud cloud-2" style="background:linear-gradient(180deg, rgba(130,140,160,0.8), rgba(90,100,120,0.7));"></div>';
            rainHTML += '<div class="weather-rain-container">';
            for (let i = 0; i < 20; i++) {
                const left = 10 + Math.random() * 80;
                const delay = Math.random() * 2;
                const duration = 0.6 + Math.random() * 0.4;
                rainHTML += `<div class="rain-drop" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
            }
            rainHTML += '</div>';
            container.innerHTML = rainHTML;
            break;

        case 'snow':
            let snowHTML = '<div class="weather-cloud cloud-1" style="background:linear-gradient(180deg, rgba(200,210,230,0.9), rgba(180,190,210,0.8));"></div>';
            snowHTML += '<div class="weather-cloud cloud-2" style="background:linear-gradient(180deg, rgba(190,200,220,0.8), rgba(170,180,200,0.7));"></div>';
            for (let i = 0; i < 15; i++) {
                const left = 5 + Math.random() * 90;
                const delay = Math.random() * 4;
                const duration = 2 + Math.random() * 3;
                const size = 3 + Math.random() * 5;
                snowHTML += `<div class="snow-flake" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;width:${size}px;height:${size}px;"></div>`;
            }
            container.innerHTML = snowHTML;
            break;

        case 'thunder':
            let thunderHTML = '<div class="weather-cloud cloud-1" style="background:linear-gradient(180deg, rgba(80,85,100,0.95), rgba(50,55,70,0.9));"></div>';
            thunderHTML += '<div class="weather-cloud cloud-2" style="background:linear-gradient(180deg, rgba(70,75,90,0.9), rgba(40,45,60,0.8));"></div>';
            thunderHTML += '<div class="thunder-flash"></div>';
            thunderHTML += '<div class="weather-rain-container">';
            for (let i = 0; i < 25; i++) {
                const left = 5 + Math.random() * 90;
                const delay = Math.random() * 2;
                const duration = 0.5 + Math.random() * 0.3;
                thunderHTML += `<div class="rain-drop" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
            }
            thunderHTML += '</div>';
            container.innerHTML = thunderHTML;
            break;

        case 'fog':
            let fogHTML = '';
            for (let i = 0; i < 5; i++) {
                const top = 20 + i * 25;
                const delay = i * 1.5;
                fogHTML += `<div class="fog-layer" style="top:${top}%;animation-delay:${delay}s;"></div>`;
            }
            container.innerHTML = fogHTML;
            break;

        default:
            container.innerHTML = '<div class="weather-sun"></div>';
    }
}

function renderHourlyForecast(hourly) {
    const container = DOM.hourlyScroll;
    container.innerHTML = '';

    const now = new Date();
    const currentHourIndex = hourly.time.findIndex(t => new Date(t) >= now);
    const startIndex = Math.max(0, currentHourIndex);

    for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]);
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const isDay = hourly.is_day[i];
        const weatherInfo = WEATHER_CODES[code] || WEATHER_CODES[0];
        const icon = isDay ? weatherInfo.icon : weatherInfo.nightIcon;

        const isNow = i === startIndex;
        const timeLabel = isNow ? 'Now' : time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

        const item = document.createElement('div');
        item.className = `hourly-item${isNow ? ' active' : ''}`;
        item.innerHTML = `
            <span class="hourly-time">${timeLabel}</span>
            <span class="hourly-icon">${icon}</span>
            <span class="hourly-temp">${temp}°</span>
        `;
        container.appendChild(item);
    }
}

function renderDailyForecast(daily) {
    const container = DOM.dailyForecast;
    container.innerHTML = '';

    // Find overall min/max for temperature bar scaling
    const allTemps = [...daily.temperature_2m_max, ...daily.temperature_2m_min];
    const overallMin = Math.min(...allTemps);
    const overallMax = Math.max(...allTemps);
    const range = overallMax - overallMin || 1;

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i] + 'T00:00:00');
        const code = daily.weather_code[i];
        const high = Math.round(daily.temperature_2m_max[i]);
        const low = Math.round(daily.temperature_2m_min[i]);
        const weatherInfo = WEATHER_CODES[code] || WEATHER_CODES[0];

        const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

        // Calculate bar position
        const barLeft = ((daily.temperature_2m_min[i] - overallMin) / range) * 100;
        const barWidth = ((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / range) * 100;

        const item = document.createElement('div');
        item.className = 'daily-item';
        item.style.animationDelay = `${i * 0.05}s`;
        item.innerHTML = `
            <span class="daily-day">${dayName}</span>
            <span class="daily-icon">${weatherInfo.icon}</span>
            <div class="daily-temp-bar">
                <div class="daily-bar-track">
                    <div class="daily-bar-fill" style="left:${barLeft}%;width:${Math.max(barWidth, 8)}%"></div>
                </div>
            </div>
            <div class="daily-temps">
                <span class="daily-high">${high}°</span>
                <span class="daily-low">${low}°</span>
            </div>
        `;
        container.appendChild(item);
    }
}

function renderSunArc(sunriseISO, sunsetISO, timezone) {
    const sunrise = new Date(sunriseISO);
    const sunset = new Date(sunsetISO);

    DOM.sunriseTime.textContent = sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    DOM.sunsetTime.textContent = sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Calculate sun position on arc
    const now = new Date();
    const totalDaylight = sunset - sunrise;
    const elapsed = now - sunrise;
    let progress = Math.max(0, Math.min(1, elapsed / totalDaylight));

    // If before sunrise or after sunset
    if (now < sunrise || now > sunset) {
        progress = now < sunrise ? 0 : 1;
    }

    // Animate arc and sun position
    updateSunArc(progress);
}

function updateSunArc(progress) {
    const arcPath = DOM.sunArcProgress;
    const sunCircle = DOM.sunPosition;

    if (!arcPath || !sunCircle) return;

    // Get total path length
    const totalLength = arcPath.getTotalLength();
    arcPath.style.strokeDasharray = totalLength;
    arcPath.style.strokeDashoffset = totalLength * (1 - progress);

    // Position sun along the path
    const point = arcPath.getPointAtLength(totalLength * progress);
    sunCircle.setAttribute('cx', point.x);
    sunCircle.setAttribute('cy', point.y);

    // Hide sun if before sunrise or after sunset
    if (progress <= 0 || progress >= 1) {
        sunCircle.style.opacity = '0.3';
    } else {
        sunCircle.style.opacity = '1';
    }
}

function updateBackgroundTheme(type, isDay) {
    const root = document.documentElement;

    if (!isDay) {
        root.style.setProperty('--bg-primary', '#060a14');
        root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(30, 40, 80, 0.2), rgba(20, 20, 50, 0.15))');
        return;
    }

    switch (type) {
        case 'clear':
            root.style.setProperty('--bg-primary', '#0a0e1a');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(167, 139, 250, 0.08))');
            break;
        case 'cloudy':
            root.style.setProperty('--bg-primary', '#0d1120');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(120, 140, 170, 0.1), rgba(90, 100, 130, 0.08))');
            break;
        case 'rain':
            root.style.setProperty('--bg-primary', '#080c18');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(60, 100, 180, 0.12), rgba(40, 60, 120, 0.1))');
            break;
        case 'snow':
            root.style.setProperty('--bg-primary', '#0e1225');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(150, 170, 210, 0.1), rgba(130, 150, 190, 0.08))');
            break;
        case 'thunder':
            root.style.setProperty('--bg-primary', '#060810');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(80, 60, 120, 0.12), rgba(40, 30, 70, 0.1))');
            break;
        case 'fog':
            root.style.setProperty('--bg-primary', '#0c1020');
            root.style.setProperty('--gradient-hero', 'linear-gradient(135deg, rgba(140, 150, 170, 0.1), rgba(110, 120, 140, 0.08))');
            break;
    }
}

// ===== UI State Management =====
function showLoading() {
    DOM.loadingScreen.classList.remove('hidden');
    DOM.mainContent.classList.add('hidden');
    DOM.errorScreen.classList.add('hidden');
}

function showMain() {
    DOM.loadingScreen.classList.add('hidden');
    DOM.mainContent.classList.remove('hidden');
    DOM.errorScreen.classList.add('hidden');
}

function showError(msg) {
    DOM.loadingScreen.classList.add('hidden');
    DOM.mainContent.classList.add('hidden');
    DOM.errorScreen.classList.remove('hidden');
    DOM.errorMessage.textContent = msg || 'Unable to fetch weather data. Please try again.';
}

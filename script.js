// CONFIG
const API_KEY = "3ba3f46fbd03d9327098f532c6d4d4b3";
const DEFAULT_CITY = "Chandigarh";

// HELPERS
function $(id) { return document.getElementById(id); }

function formatTime(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDateLine(unixSeconds, timezoneOffsetSeconds) {
    // City's local time, not the visitor's
    const d = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
    return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    });
}

function weatherEmoji(icon) {
    const code = (icon || "").slice(0, 2);
    const isNight = (icon || "").endsWith("n");
    const map = {
        "01": isNight ? "🌙" : "☀️",
        "02": isNight ? "☁️" : "🌤️",   // few clouds — partly cloudy
        "03": "⛅",                     // scattered clouds — cloudy
        "04": "☁️",                     // broken/overcast clouds
        "09": "🌦️",                     // shower rain / drizzle
        "10": "🌧️",                     // rain
        "11": "⛈️",                     // thunderstorm
        "13": "❄️",                     // snow
        "50": "🌫️"                      // mist/haze/fog/smoke/dust
    };
    return map[code] || "🌡️";
}

function skyState(weather) {
    const icon = weather && weather.icon;
    const main = weather && weather.main;
    const code = (icon || "").slice(0, 2);

    switch (code) {
        case "01": return "clear";
        case "02": return "partlyCloudy";
        case "03": return "cloudy";
        case "04": return "overcast";
        case "09": return "drizzle";
        case "10": return "rain";
        case "11": return "thunderstorm";
        case "13": return "snow";
        case "50": return "mist";
    }

    // Fallback if icon is missing for some reason
    const mainMap = {
        Clear: "clear", Clouds: "cloudy", Drizzle: "drizzle", Rain: "rain",
        Thunderstorm: "thunderstorm", Snow: "snow", Mist: "mist", Haze: "mist",
        Fog: "mist", Smoke: "mist", Dust: "mist", Sand: "mist"
    };
    return mainMap[main] || "clear";
}

// ELEMENTS (only the ones that actually exist in index.html)
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");

const cityNameEl = $("cityName");
const dateEl = $("date");
const weatherIconEl = $("weatherIcon");
const temperatureEl = $("temperature");

const feelsLikeEl = $("feelsLike");
const humidityEl = $("humidity");
const windEl = $("wind");
const pressureEl = $("pressure");

const sunriseEl = $("sunrise");
const sunsetEl = $("sunset");
const uvEl = $("uv");
const airEl = $("air");
const visibilityEl = $("visibility");
const rainEl = $("rain");

const dayBoxes = document.querySelectorAll("#days .date");

// STATE
let lastWeatherData = null;

// CURRENT WEATHER (by city name)
async function getWeather(city) {

    city = (city || "").trim();
    if (city === "") {
        alert("Please enter a city.");
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod != 200) {
            throw new Error(data.message || "City not found");
        }

        renderWeather(data);

        // Forecast-dependent panels (daily strip + rain chance) and
        // location-dependent panels (UV + air quality) run off the
        // coordinates from the current-weather response.
        getForecast(data.coord.lat, data.coord.lon);
        getAirQuality(data.coord.lat, data.coord.lon);
        getUvIndex(data.coord.lat, data.coord.lon);

        localStorage.setItem("lastCity", data.name);

    } catch (error) {
        console.error(error);
        cityNameEl.innerHTML = "📍 City not found";
        dateEl.innerHTML = "Try a different spelling";
        clearWeatherAnimation();
    }
}

// RENDER CURRENT WEATHER
function renderWeather(data) {

    lastWeatherData = data;

    cityNameEl.innerHTML = `📍 ${data.name}, ${data.sys.country}`;
    dateEl.innerHTML = formatDateLine(data.dt, data.timezone);

    weatherIconEl.innerHTML = weatherEmoji(data.weather[0].icon);
    temperatureEl.innerHTML = Math.round(data.main.temp) + "°C";

    feelsLikeEl.innerHTML = Math.round(data.main.feels_like) + "°C";
    humidityEl.innerHTML = data.main.humidity + "%";

    const windKmh = (data.wind.speed * 3.6).toFixed(1);
    windEl.innerHTML = windKmh + " km/h";

    pressureEl.innerHTML = data.main.pressure + " hPa";
    visibilityEl.innerHTML = (data.visibility / 1000) + " km";

    sunriseEl.innerHTML = formatTime(data.sys.sunrise);
    sunsetEl.innerHTML = formatTime(data.sys.sunset);

    const state = skyState(data.weather[0]);

    createWeatherAnimation(state);
}

function clearWeatherAnimation() {
    const box = $("weatherAnimation");
    if (box) box.innerHTML = "";
}

function spawnClouds(box, count, opacity, sizePx) {
    for (let i = 0; i < count; i++) {
        const cloud = document.createElement("div");
        cloud.className = "cloud";
        cloud.textContent = "☁️";
        cloud.style.top = (6 + Math.random() * 55) + "%";
        cloud.style.fontSize = sizePx + "px";
        cloud.style.opacity = opacity;
        cloud.style.animationDuration = (28 + Math.random() * 22) + "s";
        cloud.style.animationDelay = (i * 2.5) + "s";
        box.appendChild(cloud);
    }
}

function spawnRain(box, count) {
    for (let i = 0; i < count; i++) {
        const drop = document.createElement("div");
        drop.className = "raindrop";
        drop.style.left = Math.random() * 100 + "vw";
        drop.style.animationDuration = (0.5 + Math.random()) + "s";
        drop.style.animationDelay = Math.random() * 2 + "s";
        box.appendChild(drop);
    }
}

function createWeatherAnimation(state, cloudPct) {

    clearWeatherAnimation();

    const box = $("weatherAnimation");
    if (!box) return;

    switch (state) {

        case "clear": {
            const sun = document.createElement("div");
            sun.className = "sun-glow";
            box.appendChild(sun);
            break;
        }

        case "partlyCloudy": {
            // Sun still visible behind a couple of light, small clouds
            const sun = document.createElement("div");
            sun.className = "sun-glow sun-glow--soft";
            box.appendChild(sun);
            spawnClouds(box, 2, 0.45, 40);
            break;
        }

        case "cloudy": {
            // Sun hidden, moderate cloud cover
            spawnClouds(box, 5, 0.6, 46);
            break;
        }

        case "overcast": {
            // Dense, larger, darker cloud cover, no sun at all
            spawnClouds(box, 8, 0.8, 54);
            break;
        }

        case "mist": {
            spawnClouds(box, 3, 0.35, 60);
            const fog = document.createElement("div");
            fog.className = "fog-layer";
            box.appendChild(fog);
            break;
        }

        case "drizzle": {
            spawnClouds(box, 4, 0.55, 44);
            spawnRain(box, 35);
            break;
        }

        case "rain": {
            spawnClouds(box, 5, 0.65, 48);
            spawnRain(box, 90);
            break;
        }

        case "thunderstorm": {
            spawnClouds(box, 6, 0.75, 50);
            spawnRain(box, 90);
            const flash = document.createElement("div");
            flash.className = "lightning";
            box.appendChild(flash);
            break;
        }

        case "snow": {
            spawnClouds(box, 4, 0.5, 46);
            for (let i = 0; i < 60; i++) {
                const flake = document.createElement("div");
                flake.className = "snow";
                flake.textContent = "❄";
                flake.style.left = Math.random() * 100 + "vw";
                flake.style.fontSize = (10 + Math.random() * 10) + "px";
                flake.style.animationDuration = (6 + Math.random() * 5) + "s";
                flake.style.animationDelay = Math.random() * 5 + "s";
                box.appendChild(flake);
            }
            break;
        }
    }
}

// 5-DAY FORECAST STRIP (fills the .date boxes in #days) + rain chance
async function getForecast(lat, lon) {

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (String(data.cod) !== "200") return;

        // Today's rain chance = the very next forecast slot
        const chance = Math.round((data.list[0].pop || 0) * 100);
        rainEl.innerHTML = chance + "%";

        renderDayBoxes(data);

    } catch (error) {
        console.error(error);
    }
}

function renderDayBoxes(data) {

    // The free forecast API only guarantees ~5 distinct days; pick the
    // midday slot of each day so the icon/temp is representative.
    const byDate = {};
    data.list.forEach(item => {
        const [date, time] = item.dt_txt.split(" ");
        if (!byDate[date] || time === "12:00:00") {
            byDate[date] = item;
        }
    });

    const days = Object.values(byDate).slice(0, dayBoxes.length);

    dayBoxes.forEach((box, i) => {
        const item = days[i];

        if (!item) {
            box.innerHTML = "";
            return;
        }

        const label = new Date(item.dt_txt).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        });

        box.innerHTML = `
            <div class="date-content">
                <p class="date-label">${label}</p>
                <div class="date-icon">${weatherEmoji(item.weather[0].icon)}</div>
                <p class="date-temp">${Math.round(item.main.temp)}°C</p>
            </div>
        `;
    });
}

// AIR QUALITY (single label into #air)
async function getAirQuality(lat, lon) {

    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.list || !data.list[0]) throw new Error("Air quality unavailable");

        const aqi = data.list[0].main.aqi;
        const labels = {
            1: "Good",
            2: "Fair",
            3: "Moderate",
            4: "Poor",
            5: "Very Poor"
        };
        airEl.innerHTML = labels[aqi] || "--";

    } catch (error) {
        console.error(error);
        airEl.innerHTML = "--";
    }
}

// UV INDEX
// Note: OpenWeatherMap retired /data/2.5/uvi in 2021 — it always fails,
// which is why UV showed "--" no matter what. Their replacement (One Call
// 3.0/4.0) needs a separate paid-tier subscription, so we use Open-Meteo's
// current-weather endpoint instead: free, no API key, no billing signup.
async function getUvIndex(lat, lon) {

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const value = data && data.current && data.current.uv_index;
        if (typeof value !== "number") throw new Error("UV unavailable");

        uvEl.innerHTML = Math.round(value * 10) / 10;

    } catch (error) {
        console.error(error);
        uvEl.innerHTML = "--";
    }
}

// SEARCH
if (searchBtn) {
    searchBtn.addEventListener("click", () => {
        getWeather(cityInput.value);
    });
}
if (cityInput) {
    cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") getWeather(cityInput.value);
    });
}

// START APP
const savedCity = localStorage.getItem("lastCity");
if (savedCity) {
    cityInput.value = savedCity;
    getWeather(savedCity);
} else {
    getWeather(DEFAULT_CITY);
}
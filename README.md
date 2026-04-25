# Weather Website - Project Summary

A full-stack weather web application built with **React + TypeScript** frontend and **Python FastAPI** backend, delivering real-time weather insights with a modern, responsive design. The website integrates with OpenWeatherMap API to provide accurate forecasts, current conditions, and weather alerts for locations worldwide. Access it directly from your browser - no installation needed.

**Core Features:**
- Real-time weather search by city with autocomplete suggestions
- 5-day weather forecast with hourly breakdowns
- Dark mode/light mode toggle with persistent preferences
- Weather alerts and severe weather notifications
- Air quality index (AQI) tracking with pollution data
- Geolocation support for automatic weather at user's location
- Compare weather across multiple cities side-by-side
- Responsive design optimized for mobile and desktop

**Tech Stack:**
- **Frontend:** React 18, TypeScript, Tailwind CSS, Axios
- **Backend:** Python FastAPI, Uvicorn, CORS middleware
- **APIs:** OpenWeatherMap (weather, forecasts, AQI, alerts)
- **Deployment:** Vercel (frontend), Railway/Render (backend)
- **Database:** SQLite/PostgreSQL (optional, for historical data & user preferences)

**Upcoming Features:**
30+ planned enhancements including ML-based weather prediction, interactive maps, activity recommendations, gamification (streaks & badges), Google Calendar integration, and WebSocket-based real-time alerts system.

**Getting Started:**
```bash
# Frontend
npm install && npm start

# Backend
pip install -r requirements.txt && uvicorn main:app --reload
```

# 🪐 Valles: Interplanetary Survival Guide & Mission Planner

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-Challenge%20Project-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![React](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite%205-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python%203.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

> **Valles** is a dual-mode Martian exploration platform built for the **NASA Space Apps Challenge**. It bridges the gap between gamified astronaut survival education and authentic, science-grounded Extravehicular Activity (EVA) mission planning powered by real NASA Rover Environmental Monitoring Station (REMS) data and Google Gemini AI.

---

## 📑 Table of Contents

- [Vision & Architecture](#-vision--architecture)
- [Two Distinct Modes](#-two-distinct-modes)
  - [1. Mars Survival (The Game)](#1-mars-survival-the-game)
  - [2. Mission Planner (Professional Decision-Support Tool)](#2-mission-planner-professional-decision-support-tool)
- [Scientific Foundation & Real NASA Data](#-scientific-foundation--real-nasa-data)
- [System Architecture](#-system-architecture)
- [Core Pathfinding & Resource Engine](#-core-pathfinding--resource-engine)
- [Directory Structure](#-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI + Gemini)](#backend-setup-fastapi--gemini)
  - [Frontend Setup (React + Vite + Three.js)](#frontend-setup-react--vite--threejs)
  - [Supabase Setup (Auth & Database)](#supabase-setup-auth--database)
- [API Reference (Realistic Mode)](#-api-reference-realistic-mode)
- [Testing](#-testing)
- [Scientific References & Citations](#-scientific-references--citations)
- [License](#-license)

---

## 🔭 Vision & Architecture

Human exploration of Mars requires navigating hazardous, unyielding terrain where every step impacts consumable margins (oxygen, thermal regulation, battery power, and radiation shielding). 

**Valles** demonstrates that an identical physics-and-terrain engine can serve two essential audiences:
1. **The Public & Students:** An engaging, narrative-driven 3D survival game teaching resource management, orbital mechanics, and Martian topography.
2. **Mission Specialists & Planners:** A rigorous EVA decision-support tool providing multi-criteria path optimization, safety check corridors, and environmental reality checks based on empirical NASA rover datasets.

```
                      ┌───────────────────────────────────────────┐
                      │     Shared Martian Terrain & Cost Engine   │
                      │   (A* Pathfinder, 8-Way Grid, Energy Sim) │
                      └─────────────────────┬─────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │    Product A: Mars Survival │                 │  Product B: Mission Planner │
     │         (Gamified)          │                 │        (Professional)       │
     ├─────────────────────────────┤                 ├─────────────────────────────┤
     │ • 14 Story Missions         │                 │ • Multi-Profile EVA Solver  │
     │ • Levels 1–10 + Progression │                 │ • Hazard & Slope Contours   │
     │ • 3D Player & World Viewer  │                 │ • NASA REMS Realistic Mode  │
     │ • Earth Delay Communications│                 │ • Natural Language Mission  │
     │ • Weekly Challenges         │                 │   Briefing via Gemini AI    │
     └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 🚀 Two Distinct Modes

### 1. Mars Survival (The Game)
A persistent, level-and-XP-based progression experience:
- **Five Authentic Martian Regions:** Explore *Jezero Crater* (Perseverance landing site), *Valles Marineris*, *Olympus Mons*, *Arcadia Planitia*, and *Hellas Basin*.
- **Resource Simulation:** Dynamic telemetry tracking Oxygen ($O_2$), Suit Battery, Thermal Load, Suit Integrity, and Hydration/Calories.
- **Interactive 3D Environment:** Powered by Three.js with real-time astronaut viewer, dynamic atmospheric dust haze, terrain mesh rendering, and ambient Martian lighting.
- **Earth Communications System:** Experience realistic radio propagation delays (3 to 22 minutes depending on orbital alignment) for telemetry broadcasts and mission logs.
- **Progression & Gear:** Unlock suit upgrades (Scout $\rightarrow$ Pioneer $\rightarrow$ Vanguard), rover mobility attachments, and scientific instruments up to the Level 10 Extraction finale.

### 2. Mission Planner (Professional Decision-Support Tool)
A high-fidelity tool designed around mission constraints:
- **Four Distinct Traverse Profiles:**
  - `Fastest`: Prioritizes traverse velocity and distance reduction.
  - `Safest`: Heavily penalizes steep slopes, loose regolith, and high-risk hazard zones.
  - `Balanced`: Optimal trade-off between battery drain and time of flight.
  - `Planner Default`: Calibrated safety envelope with mandatory rest checkpoints.
- **Survivability & Return-to-Base Safety Checks:** Automated validation ensuring astronauts never exceed the **Point of No Return (PNR)** before suit consumables exhaust.
- **NASA REMS Realistic Mode:** Integrates real diurnal temperature swings, surface pressure, atmospheric dust optical depth ($\tau$), ultraviolet radiation, and wind vectors.

---

## 🔬 Scientific Foundation & Real NASA Data

### NASA MSL Curiosity / REMS Instrument
Environmental variables in Realistic Mode are derived from the **Rover Environmental Monitoring Station (REMS)** aboard NASA's Curiosity Rover operating in Gale Crater ($4.59^\circ\text{S}, 137.44^\circ\text{E}$):

* **Diurnal Surface & Air Temperature:** Models the Martian boundary layer with temperature fluctuations ranging between $-85^\circ\text{C}$ at night to $-5^\circ\text{C}$ at midday.
* **Atmospheric Pressure:** Reflects seasonal $CO_2$ polar cap condensation/sublimation cycles ($700\text{ Pa}$ to $950\text{ Pa}$).
* **Dust Optical Depth ($\tau$):** Parameterized baseline conditions ($\tau \approx 0.35$ to $0.6$) scaling up to global dust storms ($\tau > 2.5$) that dramatically suppress solar power output.
* **UV & Solar Flux:** Diurnal UV flux tracking based on solar longitude ($L_s$).

### Gemini AI Grounding Architecture
Unlike naive generative agents that fabricate environmental parameters, Valles uses a **Strict Semantic Split**:
1. **Gemini 2.5 Flash** interprets only user intent (e.g., *"Midday EVA during late autumn dust devil activity"* $\rightarrow$ maps to `season: autumn`, `sol_time: 12:30`, `dust: elevated`).
2. **REMS Empirical Database (`rems_lookup.py`)** supplies 100% of the physical telemetry values.
3. **Gemini** writes the mission executive briefing strictly using the confirmed, grounded REMS telemetry.

---

## 🛠 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│  React 18 + Vite + TypeScript + Three.js + Framer Motion + MapLibre    │
│                                                                        │
│  [3D Explorer] ──── [Route Comparison] ──── [EVA Telemetry HUD]        │
└───────────────┬───────────────────────────────────────┬────────────────┘
                │                                       │
     REST / API Requests                         Supabase Client
                │                                       │
                ▼                                       ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│       FASTAPI BACKEND         │       │       SUPABASE POSTGRES        │
│  • /realistic/parse           │       │  • 12 Relational Tables (RLS)  │
│  • /realistic/generate        │       │  • Auth & User State           │
│  • Gemini 2.5 NLP Parser      │       │  • Story Missions & Seed Data  │
│  • REMS MODRDR Data Lookup    │       │  • Weekly Challenge Rotator    │
└───────────────────────────────┘       └────────────────────────────────┘
```

---

## 📐 Core Pathfinding & Resource Engine

Located in `Valles-frontend/src/engine/`:
* **Pathfinder (`pathfinder.ts`):** Optimized A* algorithm over an 8-connected grid with Euclidean diagonal correction:
  $$\text{Diagonal Step} = \sqrt{2} \times \text{Cell Distance}$$
* **Terrain Cost Function (`costFunction.ts`):** 
  $$\text{Cost} = w_{\text{dist}} \cdot D + w_{\text{slope}} \cdot S^2 + w_{\text{roughness}} \cdot R + w_{\text{hazard}} \cdot H$$
  *Impassable barriers (slopes $> 25^\circ$ or dense boulder fields) evaluate to infinite cost.*
* **Consumables Simulator (`resourceSim.ts`):** Calculates per-step consumption of:
  * Oxygen ($O_2$) based on grade exertion ($m \cdot \text{slope}$).
  * Suit Battery based on life support heating and mechanical mobility.
  * Thermal regulation load against ambient REMS temperature differentials.

---

## 📁 Directory Structure

```text
MarsSim/
├── README.md                          # Project master documentation
├── backend/                           # Realistic Mode FastAPI backend
│   ├── main.py                        # Server entry point & CORS
│   ├── gemini_parser.py               # Gemini 2.5 Flash parser & briefing generator
│   ├── rems_lookup.py                 # NASA REMS MODRDR statistical lookup engine
│   ├── schema.py                      # Pydantic data contracts (Parse/Generate)
│   ├── requirements.txt               # Python package dependencies
│   └── data_pipeline/
│       └── build_lookup.py            # PDS .tab parser for raw REMS archives
├── Valles-frontend/                   # React + Vite application
│   ├── src/
│   │   ├── api/                       # Supabase client & API wrappers
│   │   ├── components/
│   │   │   ├── game/                  # MarsWorld3D, AstronautModel, RealisticModePanel
│   │   │   ├── map/                   # RouteComparisonCards, MapLibre layers
│   │   │   └── ui/                    # Error boundaries, HUD cards, toasts
│   │   ├── config/                    # Game progression tiers & suit specifications
│   │   ├── engine/                    # Pure TypeScript pathfinder & physics simulator
│   │   │   ├── pathfinder.ts          # A* pathfinding with binary min-heap
│   │   │   ├── costFunction.ts        # Slope, hazard, and profile weighting
│   │   │   ├── resourceSim.ts         # Oxygen, battery, and metabolic simulation
│   │   │   └── engine.test.ts         # 30-case Vitest suite
│   │   ├── pages/                     # Simulation, Planner, Missions, Comms pages
│   │   └── main.jsx                   # Application bootstrap
│   ├── public/data/regions/           # Synthetic/MOLA terrain matrices (JSON)
│   ├── supabase/                      # PostgreSQL migrations & Edge Functions
│   │   ├── migrations/                # Schema tables, RLS policies, seed missions
│   │   └── functions/                 # Deno edge function for weekly challenge
│   └── package.json
└── package-lock.json
```

---

## ⚡ Getting Started & Local Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **Git**: Installed and configured
* **Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

### Backend Setup (FastAPI + Gemini)

1. Open your terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   CORS_ORIGIN=http://localhost:5173
   PORT=8000
   ```

5. Launch the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   * The API is live at `http://localhost:8000`.
   * Interactive Swagger documentation is at `http://localhost:8000/docs`.

---

### Frontend Setup (React + Vite + Three.js)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd Valles-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase URL and Anon key (or start in local mock mode):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_REALISTIC_API_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Supabase Setup (Auth & Database)

1. Create a free project on [Supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql` (Creates 12 tables, indexes, and Row Level Security policies).
   - `supabase/migrations/002_seed_missions.sql` (Populates 14 story missions across all regions).
   - `supabase/migrations/003_fix_auth_trigger.sql` (Configures automatic profile creation upon signup).

---

## 📡 API Reference (Realistic Mode)

### `GET /realistic/health`
Checks server status and REMS lookup database readiness.

### `POST /realistic/parse`
Extracts scenario variables from natural language prompts using Gemini 2.5.
* **Request:**
  ```json
  {
    "text": "Plan an EVA at Jezero crater during winter at dawn with elevated dust."
  }
  ```
* **Response:**
  ```json
  {
    "scenario": {
      "region": "jezero",
      "season": "winter",
      "sol_time": "06:00",
      "dust_storm": "moderate",
      "duration_minutes": 120
    },
    "confidence": 0.95
  }
  ```

### `POST /realistic/generate`
Generates minute-by-minute REMS telemetry time series and an AI mission briefing grounded strictly in the environmental data.
* **Request:**
  ```json
  {
    "scenario": {
      "season": "winter",
      "sol_time": "06:00",
      "dust_storm": "moderate",
      "duration_minutes": 60
    }
  }
  ```
* **Response:**
  ```json
  {
    "telemetry": [
      {
        "minute": 0,
        "air_temp_c": -74.2,
        "ground_temp_c": -78.1,
        "pressure_pa": 845.0,
        "wind_speed_ms": 4.2,
        "dust_opacity_tau": 0.85,
        "uv_index": 0.1
      }
    ],
    "briefing": "EVA Authorization Advisory: Ambient temperatures will remain below -70C. High suit heating draw predicted..."
  }
  ```

---

## 🧪 Testing

The core pathfinding algorithm and consumable simulation engine are rigorously verified with unit tests:

```bash
cd Valles-frontend
npm run test
```

**Coverage includes 30 unit tests:**
- ✅ Cost Function & Profile Weighting
- ✅ Obstacle & Impassable Slope Avoidance
- ✅ Boundary Constraints & Connected Traversability
- ✅ Metabolic & Oxygen Depletion Accuracy
- ✅ Point-of-No-Return Safety Margin Validation

---

## 📚 Scientific References & Citations

1. **Gómez-Elvira, J., et al. (2012 / 2014)** — *REMS: The Rover Environmental Monitoring Station for the Mars Science Laboratory Mission*. Space Science Reviews & JGR Planets, [doi:10.1029/2012JE004282](https://doi.org/10.1029/2012JE004282).
2. **Martínez, G. M., et al. (2017)** — *The Modern Near-Surface Martian Climate: A Review of In-situ Meteorological Data from Viking to Curiosity*. Space Science Reviews, [doi:10.1002/2016JE005157](https://doi.org/10.1002/2016JE005157).
3. **NASA Planetary Data System (PDS)** — *MSL REMS Reduced Data Record (MODRDR) Archive*, Atmospheres Node, New Mexico State University.
4. **Smith, M. D. (2004)** — *Interannual variability in THEMIS atmospheric observations of Mars*. J. Geophys. Res., 109, E11004.

---

## 📄 License

This project was built for the **NASA Space Apps Challenge**. Code is made available under the [MIT License](LICENSE). Planetary datasets and citations belong to their respective NASA/JPL-Caltech missions and research teams.

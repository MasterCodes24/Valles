# Realistic Mode Backend

## Quick start

```powershell
# 1. Enter backend directory
cd c:\Users\ayaan\Downloads\Valles\backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Copy env file and add your Gemini key
cp .env.example .env
# Then open .env and set GEMINI_API_KEY=your_key

# 4. Start the server
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`.
Open `http://localhost:8000/docs` for the interactive Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/realistic/health` | Liveness check |
| `POST` | `/realistic/parse` | Gemini parses user text → ScenarioQuery |
| `POST` | `/realistic/generate` | REMS lookup → conditions time series + briefing |

## How it works

```
User text
   │
   ▼
POST /realistic/parse
   │  Gemini 2.5 Flash reads ONLY intent (season, time, severity, dust…)
   │  NEVER invents environmental numbers
   │
   ▼
ScenarioQuery JSON  ──→  User reviews & edits in browser
   │
   ▼
POST /realistic/generate
   │  rems_lookup.py samples REMS season×hour statistics
   │  Returns per-minute time series for session duration
   │  Gemini writes mission briefing from confirmed numbers only
   │
   ▼
3D Explorer receives realisticConditions prop
   • REMS HUD panel: air temp, ground temp, pressure, UV, wind, dust τ, radiation
   • Hover any HUD cell to see the REMS source citation
   • Fog density updates live as dust opacity changes over time
   • Mode label reads "REALISTIC MODE · REMS" in top bar
```

## Data source

REMS MODRDR v1.0 — MSL/Curiosity rover, Gale Crater (4.59°S, 137.44°E)

Values parameterized from published statistics:
- Gómez-Elvira et al. (2014) doi:10.1029/2012JE004282
- Martínez et al. (2017) doi:10.1002/2016JE005157
- Hamilton et al. (2014) doi:10.1002/2013JE004596
- Haberle et al. (2014) doi:10.1002/2014JE004626
- Simonsen et al. (2015) doi:10.1016/j.icarus.2015.09.025

PDS archive: https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars_lander.html

## Upgrade to real PDS data (Phase 1)

Run `data_pipeline/build_lookup.py` after downloading REMS MODRDR `.tab` files:

```powershell
pip install pandas numpy scipy tqdm
python data_pipeline/build_lookup.py --input data_pipeline/pds_raw/MODRDR --output rems_precise.json
```

Then update `rems_lookup.py` to load from `rems_precise.json` instead of `_SP`.

## ⚠️ Important limitations

- **Gale Crater only** — REMS is a single-site instrument. Other Mars locations will differ.
- **Parameterized values** — until you run the pipeline with real PDS data, values are derived from published statistics, not raw measurements.
- **Gemini parsing** — the AI can misread ambiguous prompts; the review/edit step lets you correct this.
- **Not certified training** — this is a data-driven simulation, not a NASA-certified tool.


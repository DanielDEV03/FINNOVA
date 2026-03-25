# FINNOVA 🚀

**Tu copiloto financiero impulsado por IA** — Predicciones, simulaciones y análisis automático de tus finanzas personales.

> Hecho con pasión en Colombia 🇨🇴 por **CTS Labs Cartagena** · ctslabscartagena@gmail.com

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | .NET 10, ASP.NET Core, EF Core |
| IA | Python, FastAPI, scikit-learn, XGBoost |
| DB | PostgreSQL 16 |
| Deploy | Render (Docker) |

---

## Funcionalidades

- **Dashboard** — balance, ingresos, gastos y deudas en tiempo real
- **Predicciones IA** — proyecciones de balance a 3/6/12 meses
- **Simulador** — compara 5 escenarios financieros
- **Análisis** — patrones de gasto y tendencias
- **Gamificación** — puntos, niveles y rachas diarias
- **Alertas** — notificaciones inteligentes de riesgo
- **Emails** — bienvenida y notificaciones de login via Gmail
- **Panel Admin** — métricas globales, gestión de usuarios, audit log

---

## Deploy en Render

```bash
# 1. Fork o clona este repo
# 2. En render.com → New → Blueprint → conecta el repo
# 3. Render lee render.yaml y crea los 4 servicios automáticamente
# 4. Actualiza las URLs en las env vars una vez creados los servicios
```

**Primer admin** — después del deploy, en Render → `finnova-backend` → Environment:
```
AdminBootstrap__Email    = tu@email.com
AdminBootstrap__Password = TuPassword123!
```
Redeploya, loguéate, luego elimina esas variables.

---

## Local con Docker

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| AI Engine | http://localhost:8000 |

---

## Variables de entorno clave (backend)

```
ConnectionStrings__DefaultConnection  → PostgreSQL
Jwt__Key                              → Clave secreta JWT
AiEngine__Url                         → URL del AI engine
Email__SmtpUser                       → Gmail
Email__SmtpPassword                   → App Password de Gmail
AdminBootstrap__Email/Password        → Solo para crear el primer admin
```

---

## Estructura

```
finnova/
├── frontend/     → Next.js
├── backend/      → .NET API
├── ai-engine/    → FastAPI + ML
├── database/     → Migraciones SQL
└── render.yaml   → Deploy config
```

---

## Soporte

✉️ ctslabscartagena@gmail.com

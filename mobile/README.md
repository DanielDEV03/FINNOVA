# FINNOVA Mobile — React Native

App móvil de FINNOVA para iOS y Android.

## Stack

- React Native + Expo
- TypeScript
- React Navigation
- Axios

## Setup

```bash
cd mobile
npm install
npx expo start
```

## Estructura

```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        → Dashboard
│   │   ├── transactions.tsx → Transacciones
│   │   ├── predictions.tsx  → Predicciones IA
│   │   └── profile.tsx      → Perfil
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx
├── components/
├── lib/
│   └── api.ts               → Mismo backend que el web
└── package.json
```

## Conectar al backend

El mismo backend de FINNOVA sirve tanto la web como la app móvil.
Configura la URL en `lib/api.ts`:

```typescript
const API_URL = 'https://finnova-backend-hquh.onrender.com/api'
```

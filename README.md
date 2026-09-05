# Funerales Los Trinitarios S.A.S. — Sistema interno

Sistema de gestión de afiliados, servicios y facturación por convenio para
Funerales Los Trinitarios S.A.S. (Pailitas, Tamalameque, Pelaya y Curumaní — Cesar).

## Estructura

```
docs/         Modelo de datos y decisiones — de referencia mientras se construye
backend/      Firebase Cloud Functions (Node.js + TypeScript, Clean Architecture)
  src/
    domain/         Entidades y reglas de negocio puras, sin dependencias externas
    application/     Casos de uso (qué hace el sistema) + puertos (interfaces)
    infrastructure/  Adaptadores concretos: Firestore, Firebase Auth
    interfaces/      Puntos de entrada: admin-api (dashboard), whatsapp-webhook (futuro)
frontend/     Dashboard admin en React + TypeScript + Tailwind (Vite)
  src/
    pages/      Una página por colección (Afiliados, Servicios, Convenios, etc.)
    components/ Sidebar, Topbar, tabla de datos reutilizable
    api/        Únicamente aquí se llama al backend — el frontend NUNCA escribe
                directo a Firestore (así el campo modificadoPor siempre es confiable)
```

## Por qué el frontend no escribe directo a Firestore

Todas las escrituras (crear/editar/borrar) pasan por Cloud Functions
(`backend/src/interfaces/admin-api`). Eso es lo que permite que el campo
`metadata.modificadoPor` (¿lo escribió la IA o un humano?) sea confiable:
solo el backend lo puede fijar, nunca el navegador ni el bot directamente.
El frontend solo lee de Firestore en tiempo real (para que la tabla se
actualice sola), pero toda escritura va por el backend.

## Cómo correr cada carpeta

### 1. Requisitos previos (una sola vez)

```bash
npm install -g firebase-tools
firebase login
```

Crea el proyecto en https://console.firebase.google.com (o usa uno existente),
habilita Firestore, Storage, Functions y Authentication (Email/Password para
el staff que usará el dashboard).

Luego, en la raíz de este proyecto:

```bash
firebase use --add
# selecciona tu proyecto y ponle el alias "default"
```

### 2. Backend (Cloud Functions)

```bash
cd backend
npm install
npm run build       # compila TypeScript
npm run serve        # corre el emulador local de Functions + Firestore
```

Para desplegar a producción:

```bash
npm run deploy       # = firebase deploy --only functions
```

### 3. Frontend (dashboard)

```bash
cd frontend
cp .env.example .env.local   # y llena tus credenciales de Firebase (ver abajo)
npm install
npm run dev           # http://localhost:5173
```

Para desplegar el dashboard (Firebase Hosting):

```bash
npm run build
cd ..
firebase deploy --only hosting
```

### 4. Correr todo junto en local (recomendado mientras desarrollas)

Desde la raíz del proyecto:

```bash
firebase emulators:start
```

Esto levanta Firestore, Functions y Auth emulados, para que puedas probar
sin tocar datos reales ni gastar cuota de producción.

## Variables de entorno del frontend

Copia `frontend/.env.example` a `frontend/.env.local` y llena los valores
que te da la consola de Firebase (Configuración del proyecto → Tus apps → SDK
de Firebase):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Estado actual

- ✅ Estructura completa de carpetas (backend Clean Architecture + frontend dashboard)
- ✅ Módulo de `afiliados` completo de punta a punta (entidad → caso de uso →
  repositorio Firestore → función admin-api → página React) — úsalo como
  plantilla para los demás módulos (servicios, convenios, cofres, inventario,
  flores, planes, bóvedas, reportes), que están dejados como páginas base
  (`TODO` marcado) siguiendo exactamente el mismo patrón.
- ✅ Reglas de seguridad de Firestore: lectura autenticada, escritura SOLO
  desde Cloud Functions.
- ⬜ Módulos de servicios/convenios/reportes: siguiente paso, replicando el
  patrón de `afiliados`.
- ⬜ Bot de WhatsApp (Twilio) y agente de voz (ElevenLabs): fase posterior,
  una vez esté sólido el registro manual.

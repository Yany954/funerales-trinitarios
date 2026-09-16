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
- ✅ Roles y sedes: custom claims (`admin` / `empleado` + sede asignada), reglas
  de Firestore/Storage que filtran por sede, selector de sede en el header
  para el admin (`RolContext`, `RutaSoloAdmin`)
- ✅ Módulo de **Usuarios** (solo admin): invitación por enlace (sin necesidad
  de servicio de correo), asignar rol/sede, deshabilitar acceso
- ✅ Módulo de **Afiliados**: alta, búsqueda de personas cubiertas
  (`personas_cubiertas`, titulares y beneficiarios) por nombre o cédula,
  filtrado por sede
- ✅ Módulo de **Servicios**: alta y edición, ítems con precio automático
  desde el catálogo de cofres/flores (con opción de sobrescribir el valor),
  documentos adjuntos, ID copiable para referenciar en Bóvedas
- ✅ Módulo de **Convenios**: alta, tarifas por año (histórico 2025/2026),
  gráfica de precios por convenio con recharts
- ✅ Módulo de **Cofres**: catálogo con nivel, precio, foto subida desde
  dispositivo (cámara o galería) — solo admin
- ✅ Módulo de **Flores**: catálogo con precio costo/público y foto — solo admin
- ✅ Módulo de **Inventario**: cantidad de cofres por sede
- ✅ Módulo de **Bóvedas**: registro con cálculo automático de vencimiento a
  4 años, función programada diaria que actualiza el estado
  (`vigente` / `por vencer` / `vencida`)
- ✅ Módulo de **Pagos**: comprobante con foto, historial por afiliado,
  función programada diaria que marca mora automáticamente
- ✅ Módulo de **Reportes**: servicios pendientes por facturar, filtrable por
  Alcaldía / Convenio / Sede con rango de fechas
- ✅ Dashboard con métricas reales (servicios del mes, pendientes por
  facturar, bóvedas por vencer)
- ✅ Trazabilidad IA/humano (`metadata.modificadoPor`) en todos los registros
- ✅ Reglas de seguridad de Firestore y Storage por sede/rol; toda escritura
  pasa por Cloud Functions, nunca directo desde el cliente
- ✅ Desplegado en producción (Firestore, Storage, Functions, Hosting)
- ⬜ Recuperar contraseña ("olvidé mi contraseña") — en progreso
- ⬜ Bot de WhatsApp (Twilio) y agente de voz (ElevenLabs): fase posterior,
  una vez esté sólido el uso diario del registro manual
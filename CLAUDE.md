# CLAUDE.md — App móvil de afiliados · Funerales Los Trinitarios S.A.S.

> Instrucciones para Claude Code. **Trabaja SIEMPRE en Plan Mode**: primero explora y propone un plan, espera aprobación, y solo entonces edita archivos.

---

## 0. Cómo trabajar (Plan Mode)

1. Antes de tocar código: lee el código existente relacionado y presenta un plan con: objetivo, archivos a crear/modificar, riesgos, y qué NO se va a tocar.
2. **Una fase a la vez** (ver sección 8). No avances a la siguiente sin que Yany lo apruebe.
3. Entrega archivos **completos**, no fragmentos. Si reordenas código, no cambies su lógica.
4. Explica brevemente el *porqué* de cada decisión (a Yany le interesa entender los conceptos).
5. Responde en español, directo y práctico. El código y los nombres de dominio siguen en español (como ya están).
6. Al terminar cada fase: corre build de backend y frontend/app. **Nunca despliegues si el build falla.**
7. Si algo es ambiguo o irreversible (reglas de pago, datos de afiliados, reglas de Firestore), pregunta antes.

## 1. Contexto del negocio

- Empresa: **Funerales Los Trinitarios S.A.S.** — Pailitas, Cesar, Colombia. Sedes: Pailitas, Tamalameque, Pelaya, Curumaní.
- Usuario principal del dashboard: la mamá de Yany, con muy poco tiempo → todo debe ser simple y visible de un vistazo.
- Idioma: español por defecto, inglés después (preparar i18n desde el inicio).
- Proyecto Firebase: `funerales-trinitarios`. Repo: `Yany954/funerales-trinitarios`. Carpetas: `/backend`, `/frontend` (dashboard web) y la nueva `/mobile` (app de afiliados).

## 2. Qué se va a construir: App de afiliados (Android + iOS)

Una app para los **afiliados (titulares)** que les permita:

- Ver su **plan, estado (activo / en mora / inactivo)** y beneficios.
- Ver y **solicitar cambios de beneficiarios** (ingreso/retiro).
- **Solicitar cambio de plan**.
- Ver el **contrato** a la mano (PDF/imagen en Storage).
- Ver historial de **pagos** y **pagar desde la app**; el pago actualiza la base de datos del dashboard en tiempo real.
- Recibir **avisos de mora** y recordatorios de vencimiento (push).
- **Chatbot de preguntas frecuentes** personalizado con los datos del afiliado (fase final).

Todo debe reflejarse en la misma base de datos que usa el Dashboard.

## 3. Stack y arquitectura

- **App:** React Native + **Expo** (TypeScript), una sola base de código para Android e iOS. Navegación con Expo Router. Estado con hooks + `onSnapshot` para lecturas.
- **Backend:** mismo Firebase (Firestore, Functions TS, Auth, Storage). Notificaciones con FCM (Expo Notifications).
- **Clean Architecture en backend** (respetar la existente):
  - `domain/` (entities, value-objects) → `application/` (usecases + ports) → `infrastructure/firebase/` (repositorios) → `interfaces/`.
  - Nueva interfaz: `backend/src/interfaces/afiliados-api/` (callables que usa la app del afiliado), separada de `admin-api/` y `scheduled/`.
  - Todo se exporta desde `interfaces/index.ts`.
- **Reglas de oro:**
  - **Toda escritura va por Cloud Functions callable (`onCall`)**; el cliente solo lee con `onSnapshot`. Firestore rules: `write: false`.
  - Un afiliado **solo puede leer SUS propios datos** (rules + validación en la función).
  - `metadata.modificadoPor` se arma **solo en el backend**. Agregar canal nuevo `app-afiliado` (tipo `humano`).
  - Nunca enviar `Date`/`Timestamp` crudos por onCall: usar strings ISO. Fechas sin hora se guardan en UTC medianoche y se muestran con `timeZone: "UTC"`.
  - Firestore con `ignoreUndefinedProperties: true`.

## 4. Modelo de datos existente (NO romper)

- `afiliados`: titular, `cedula`, `numeroContrato`, `planId`, `sede`, `estadoPlan`, `valorCuotaMensual` (cuota manual, NO se calcula de plan+año), `periodoCubiertoHasta`, `beneficiarios[]` (con `novedades[]`, `fechaNacimiento`, `fechaAdicion`, `fallecido`), `vereda`, `tieneSeguroVida`.
- `personas_cubiertas`: índice de búsqueda con `palabrasNombre` (minúsculas, sin tildes).
- `pagos`, `planes_funerarios`, `servicios`, `convenios`, etc.
- Roles por custom claims: `rol` = admin | empleado, `sede`. **Los afiliados son un tercer tipo**: claim `rol: "afiliado"` + `afiliadoId`. Nunca deben poder entrar al dashboard (revisar `RutaSoloAdmin` y checks del backend).

## 5. Reglas de negocio que se deben respetar

- Máximo **7 beneficiarios por año**. Retirar libera cupo; fallecido mantiene el cupo hasta el año siguiente. Reutilizar `cupo-beneficiarios.ts`.
- **Mora:** cada mes pagado cubre hasta el mismo día del mes siguiente, +1 día de gracia; después "en mora". "inactivo" **nunca** se cambia automáticamente. Reutilizar `value-objects/mora.ts` y `recalcularAfiliadoDesdePagos`.
- **No se permite pago duplicado del mismo mes.**
- Beneficiario sin cédula se identifica por nombre.
- Novedades de beneficiario: solo `ingreso` / `retiro`.
- **Cambios del afiliado = solicitudes, no ediciones directas.** El afiliado crea una solicitud en `solicitudes_afiliado` (tipo: `beneficiario_ingreso | beneficiario_retiro | cambio_plan`, estado: `pendiente | aprobada | rechazada`, datos, fecha). Un admin/empleado la aprueba en el dashboard y ahí se aplica con los usecases existentes. Esto protege el cupo de 7 y la facturación.
- Pagos desde la app: el pago se registra **solo cuando la pasarela confirma** (webhook), usando el mismo usecase `registrarPago`, con `metadata` canal `app-afiliado` y referencia de la transacción.

## 6. Autenticación de afiliados (DECISIÓN PENDIENTE — proponer en el plan)

Opciones a evaluar y recomendar una:
1. **OTP por SMS** al celular registrado del afiliado (Firebase Phone Auth).
2. **Cédula + número de contrato** (verificado en una Cloud Function que crea el custom token).
3. **Invitación** enviada por el staff desde el dashboard (enlace/código).

Criterios: adultos mayores con poca tecnología, costo del SMS, facilidad de soporte. Hay que agregar `celular` al afiliado si no existe.

## 7. Seguridad y legal (Colombia)

- **Ley 1581 de 2012 (Habeas Data):** pantalla de autorización de tratamiento de datos al primer ingreso; guardar fecha/versión aceptada.
- Datos sensibles (cédulas, certificados de defunción): nunca en logs ni en el cliente más de lo necesario.
- Reglas de Firestore/Storage estrictas por `afiliadoId`. Escribir tests con el emulador.
- Pagos: **no manejar datos de tarjeta en la app ni en nuestro backend**; usar checkout/SDK de la pasarela. Candidatas en Colombia: **Wompi**, PayU, Mercado Pago, ePayco (soporte PSE y Nequi). Proponer una con pros/contras, comisiones y cómo confirma el webhook.
- Publicación: Google Play y App Store (política de privacidad pública, cuenta de desarrollador, revisión de pagos/datos).

## 8. Fases (una a la vez, con aprobación)

**Fase 0 — Preparación (Dashboard):**
- Corregir que la página web **se refresque sola** y no quede "cargando": revisar `onSnapshot` (callbacks de error, `setCargando(false)` en todos los caminos, limpieza de listeners en `useEffect`, índices faltantes en consola).
- Mejorar visualmente **Planes funerarios** y **Convenios** (mantener paleta vino/buganvilla y componentes existentes; la gráfica de convenios se queda como está).
- Eliminar el código temporal de reindexado (`reindexarPersonasCubiertasFn`, botón "Reindexar (temporal)", `reindexarPersonasCubiertas` en `api/client.ts`) una vez confirmado que se ejecutó.
- Revisar posible código muerto: `actualizarEstadoFacturacion` en `client.ts`.

**Fase 1 — Base de la app:** proyecto Expo en `/mobile`, i18n es/en, tema, navegación, conexión a Firebase (emuladores en dev), login (según decisión de sección 6), claims `afiliado`, reglas.

**Fase 2 — Solo lectura:** inicio con estado del plan, beneficios, beneficiarios, historial de pagos, contrato.

**Fase 3 — Solicitudes:** cambio de beneficiarios y de plan → `solicitudes_afiliado` + bandeja de aprobación en el dashboard.

**Fase 4 — Pagos en la app:** integración con la pasarela, webhook, registro automático del pago, actualización de mora en tiempo real.

**Fase 5 — Notificaciones:** push (FCM) por mora, próximo vencimiento y estado de solicitudes; función programada (Scheduler) que reutiliza `actualizarEstadosMora`.

**Fase 6 — Chatbot de preguntas frecuentes:** empezar con reglas/plantillas sobre los datos reales del afiliado (estado, próximo pago, beneficiarios, cupos, cómo pagar). **Nunca inventar datos**; si no sabe, ofrecer contacto por WhatsApp/teléfono de la sede. Solo después evaluar un LLM, con contexto limitado al afiliado autenticado.

**Fase 7 — Publicación:** builds con EAS, Play Store y App Store.

## 9. Convenciones de código

- TypeScript estricto; sin `noUnusedLocals` rotos. Hooks de React: sin `return` temprano entre hooks; no usar `key` dinámica que haga perder foco en formularios.
- Dinero con `formatoPesos`; fechas con `formatoFecha` (dd/mm/aaaa, UTC); campos de precio con `CampoPrecio` (en móvil, equivalente).
- Confirmaciones destructivas con el patrón existente (SweetAlert en web; `Alert` nativo en app).
- Callables: `iso()` para fechas, `serializarAfiliado`, `autorizar`, `ejecutar` como en `admin-api`.
- Índices de campo único no se declaran en `firestore.indexes.json`; las consultas collectionGroup necesitan reglas `match /{path=**}/...`.

## 10. Comandos

```bash
# Backend
cd backend && npm run build
firebase emulators:start          # auth, firestore, functions, storage
firebase deploy --only functions  # solo si el build pasó

# Dashboard
cd frontend && npm run build && firebase deploy --only hosting

# App móvil
cd mobile && npx expo start
eas build --platform all          # fase de publicación
```
Verificar siempre `firebase use` = `funerales-trinitarios` antes de desplegar.

## 11. NO hagas

- No escribir en Firestore desde el cliente.
- No cambiar reglas de mora, cupo ni estados sin preguntar.
- No tocar la gráfica de convenios ni reestructurar el dashboard fuera de lo pedido.
- No guardar ni procesar datos de tarjetas.
- No desplegar con build fallido ni a otro proyecto de Firebase.
- No entregar zips ni fragmentos sueltos.

## 12. Preguntas abiertas para Yany (resolver en el plan de la Fase 0/1)

1. ¿Método de login para afiliados: SMS, cédula+contrato o invitación? ¿Tienen celular registrado?
2. ¿Qué pasarela de pagos prefieres (Wompi, PayU, Mercado Pago, ePayco)? ¿Ya tienes cuenta/comercio?
3. ¿Se permite pagar varios meses a la vez o adelantados? ¿Y pagos parciales?
4. ¿Quién aprueba las solicitudes (solo admin o también empleados de sede)?
5. ¿Dónde está el contrato hoy (PDF, foto)? ¿Hay que subirlo por afiliado?
6. ¿Zona horaria: dejar `UTC` o pasar a `America/Bogota` para mostrar fechas?
7. ¿Cuentas de desarrollador de Google Play y Apple ya creadas?

## 13. Primer prompt sugerido (pegar en Plan Mode)

> Lee este CLAUDE.md y el código de `/backend` y `/frontend`. Propón el plan de la **Fase 0** (refresco automático del dashboard, mejora visual de Planes y Convenios, limpieza del reindexado) y la **decisión de autenticación** de la Fase 1 con pros/contras. No edites nada hasta que apruebe el plan.

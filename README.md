# 🎮 GameDeck

Plataforma web centralizada para gestionar tu colección personal de videojuegos y acabar con el caos del backlog repartido entre Steam, PlayStation, Nintendo, Epic/GOG y demás plataformas.

A centralized web platform for managing your personal video game collection — putting an end to the backlog chaos spread across Steam, PlayStation, Nintendo, Epic/GOG and other platforms.

> Trabajo de Fin de Ciclo (DAW) — Vicente Aparicio Hernández & Gonzalo Bernal López
> Final Degree Project (DAW) — Vicente Aparicio Hernández & Gonzalo Bernal López

🔗 **Demo**: [gamedeck-tfg.vercel.app](https://gamedeck-tfg.vercel.app) · **API**: `gamedeck-backend-production.up.railway.app`

---

## 🇪🇸 Español

### El problema
Los jugadores acumulan títulos en múltiples plataformas, olvidan lo que tienen y pierden el control sobre su afición. Las soluciones actuales para llevar un registro son rudimentarias o tienen interfaces anticuadas.

### La solución
- **Biblioteca unificada**: añade juegos de cualquier plataforma en un único lugar, con estados personalizados para tu backlog.
- **Metadatos automáticos**: integración con la API de [RAWG.io](https://rawg.io/apidocs) para obtener carátulas, descripciones, géneros y fechas sin teclear nada.
- **Diseño moderno**: interfaz glassmorphism con tema claro/oscuro, skeleton loaders y diseño responsive.

### Stack tecnológico
| Capa | Tecnologías |
| --- | --- |
| Frontend | React 18, TypeScript 5.6, Vite 5.4, CSS puro, Recharts, Lucide React |
| Backend | Java 21, Spring Boot 3.3.5, Spring Security, Spring Data JPA, JJWT 0.12.6, Lombok |
| Base de datos | MySQL, Flyway (7 migraciones, 10 tablas), Hibernate ORM |
| API externa | RAWG.io (búsqueda, carátulas, metadatos de juegos) |

### Arquitectura
Arquitectura desacoplada en dos capas, comunicadas exclusivamente vía JSON + JWT:
- **Frontend (SPA)**: `App.tsx` con estado global, varias páginas (inicio, biblioteca/perfil, ficha de juego, calendario, listado de juegos, login, panel admin), componentes reutilizables y autenticación vía `localStorage`.
- **Backend (API REST)**: arquitectura por capas Controller → Service → Repository, ~9 módulos funcionales (auth, usuarios, juegos, biblioteca, reseñas, listas, actividad/social, admin, health), protegida con Spring Security + filtro JWT, y `RawgClient` para consumir la API externa.

### Base de datos
10 tablas versionadas con Flyway (`V1_auth` → `V7_admin_data`), con integridad referencial mediante claves foráneas en cascada y restricciones `CHECK`:
- `users`, `roles`, `user_roles`
- `games` (snapshot de datos de RAWG: carátula, metacritic, plataformas/géneros)
- `user_game_entries` (estado, puntuación, horas, notas, favoritos, visibilidad)
- `reviews`
- `user_lists`, `user_list_items`
- `user_follows`
- `user_activity_events` (feed de actividad social)

### Funcionalidades principales
- 🔐 **Autenticación**: registro/login con JWT, contraseñas con BCrypt, panel de administración protegido con `ROLE_ADMIN`.
- 📚 **Biblioteca**: 6 estados de backlog (pendiente, jugando, completado, rejugando, en pausa, abandonado), puntuación 0–10, horas jugadas, plataforma, notas privadas/públicas y favoritos.
- 🔎 **API externa**: búsqueda de juegos en tiempo real (con debounce) sobre RAWG.io, con carátulas, géneros, Metacritic y descripción.
- 👥 **Social**: seguir usuarios, feed de actividad, ranking de jugadores destacados y reseñas públicas.
- 🛡️ **Administración**: gestión de usuarios, reseñas, entradas y estadísticas globales de la plataforma.
- 🎨 **UX**: scroll infinito, calendario de próximos lanzamientos, tema claro/oscuro y diseño adaptado a móvil, tablet y escritorio.

### Estructura del proyecto
```
.
├── backend/   # API REST con Spring Boot (Java 21)
├── frontend/  # SPA React + TypeScript (Vite)
└── .env.example
```

### Requisitos previos
- Java 21 + Maven
- Node.js + npm
- MySQL (por ejemplo, vía XAMPP)
- API key de [RAWG](https://rawg.io/apidocs)

### Puesta en marcha
1. Clona el repositorio.
2. Copia `.env.example` a `.env` (raíz) y `frontend/.env.example` a `frontend/.env`, y completa los valores (API key de RAWG, credenciales de BD, JWT secret...).
3. Crea la base de datos `gamedeck` en MySQL. Las tablas se crean automáticamente con las migraciones de Flyway al arrancar el backend.
4. Arranca el backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
5. Arranca el frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Abre la URL que indique Vite (por defecto `http://localhost:5173`).

### Variables de entorno principales
| Variable | Descripción |
| --- | --- |
| `RAWG_API_KEY` / `RAWG_BASE_URL` | Credenciales y URL base de la API de RAWG |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a MySQL |
| `JWT_SECRET`, `JWT_EXPIRATION_MINUTES` | Configuración del token JWT |
| `VITE_API_BASE_URL` | URL del backend para el frontend (frontend/.env) |

Más detalle en [`backend/README.md`](backend/README.md) y [`frontend/README.md`](frontend/README.md).

### Despliegue
- **Frontend**: Vercel (build de React/Vite, CDN global) → [gamedeck-tfg.vercel.app](https://gamedeck-tfg.vercel.app)
- **Backend**: Railway (despliegue automático con Maven, MySQL como volumen) → `gamedeck-backend-production.up.railway.app`
- **Control de versiones**: Git/GitHub con flujo de ramas `dev` → `release` → `master`

### Seguridad
- Nunca subas API keys, contraseñas ni secretos reales a Git.
- Usa siempre variables de entorno (`.env`, ignorado por Git) para credenciales y claves.

---

## 🇬🇧 English

### The problem
Players accumulate titles across multiple platforms, lose track of what they own, and lose control over their hobby. Existing tracking solutions are either too basic or have outdated interfaces.

### The solution
- **Unified library**: add games from any platform in a single place, with custom statuses for your backlog.
- **Automatic metadata**: integration with the [RAWG.io](https://rawg.io/apidocs) API to fetch covers, descriptions, genres and release dates without manual entry.
- **Modern design**: glassmorphism UI with light/dark theme, skeleton loaders and a responsive layout.

### Tech stack
| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript 5.6, Vite 5.4, plain CSS, Recharts, Lucide React |
| Backend | Java 21, Spring Boot 3.3.5, Spring Security, Spring Data JPA, JJWT 0.12.6, Lombok |
| Database | MySQL, Flyway (7 migrations, 10 tables), Hibernate ORM |
| External API | RAWG.io (search, covers, game metadata) |

### Architecture
A decoupled two-layer architecture, communicating exclusively via JSON + JWT:
- **Frontend (SPA)**: `App.tsx` holds global state, with several pages (home, library/profile, game detail, calendar, games list, login, admin dashboard), reusable components and `localStorage`-based authentication.
- **Backend (REST API)**: layered Controller → Service → Repository architecture, ~9 functional modules (auth, users, games, library, reviews, lists, social/activity, admin, health), secured with Spring Security + a JWT filter, and a `RawgClient` for the external API.

### Database
10 tables versioned with Flyway (`V1_auth` → `V7_admin_data`), with referential integrity via cascading foreign keys and `CHECK` constraints:
- `users`, `roles`, `user_roles`
- `games` (snapshot of RAWG data: cover, metacritic score, platforms/genres)
- `user_game_entries` (status, score, hours, notes, favorites, visibility)
- `reviews`
- `user_lists`, `user_list_items`
- `user_follows`
- `user_activity_events` (social activity feed)

### Main features
- 🔐 **Authentication**: registration/login with JWT, BCrypt-hashed passwords, admin dashboard protected with `ROLE_ADMIN`.
- 📚 **Library**: 6 backlog statuses (plan to play, playing, completed, replaying, on hold, dropped), 0–10 score, hours played, platform, private/public notes and favorites.
- 🔎 **External API**: real-time game search (debounced) over RAWG.io, with covers, genres, Metacritic score and description.
- 👥 **Social**: follow users, activity feed, leaderboard of top players and public reviews.
- 🛡️ **Administration**: manage users, reviews, library entries and view global platform stats.
- 🎨 **UX**: infinite scroll, upcoming releases calendar, light/dark theme and a responsive design for mobile, tablet and desktop.

### Project structure
```
.
├── backend/   # REST API built with Spring Boot (Java 21)
├── frontend/  # React + TypeScript SPA (Vite)
└── .env.example
```

### Prerequisites
- Java 21 + Maven
- Node.js + npm
- MySQL (e.g. via XAMPP)
- A [RAWG](https://rawg.io/apidocs) API key

### Getting started
1. Clone the repository.
2. Copy `.env.example` to `.env` (project root) and `frontend/.env.example` to `frontend/.env`, then fill in the values (RAWG API key, DB credentials, JWT secret, etc.).
3. Create the `gamedeck` database in MySQL. Tables are created automatically by Flyway migrations on backend startup.
4. Start the backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
5. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open the URL printed by Vite (default `http://localhost:5173`).

### Main environment variables
| Variable | Description |
| --- | --- |
| `RAWG_API_KEY` / `RAWG_BASE_URL` | RAWG API credentials and base URL |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection |
| `JWT_SECRET`, `JWT_EXPIRATION_MINUTES` | JWT token configuration |
| `VITE_API_BASE_URL` | Backend URL for the frontend (frontend/.env) |

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for more details.

### Deployment
- **Frontend**: Vercel (React/Vite build, global CDN) → [gamedeck-tfg.vercel.app](https://gamedeck-tfg.vercel.app)
- **Backend**: Railway (automatic Maven deploys, MySQL volume) → `gamedeck-backend-production.up.railway.app`
- **Version control**: Git/GitHub with a `dev` → `release` → `master` branching flow

### Security
- Never commit real API keys, passwords or secrets to Git.
- Always use environment variables (`.env`, git-ignored) for credentials and keys.

---

## Autores / Authors
- Vicente Aparicio Hernández — [@vicenttto](https://github.com/vicenttto)
- Gonzalo Bernal López — [@gzbl-dev](https://github.com/gzbl-dev)

# Backend (Spring Boot)

## Requisitos
- Java 21
- Maven (mvn en PATH)
- MySQL en XAMPP

## Variables de entorno
Usa las del archivo raiz `.env.example`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `RAWG_API_KEY`, `RAWG_BASE_URL`
- `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`

## Ejecutar
```bash
mvn spring-boot:run
```

## Base de datos y migraciones
- El esquema se versiona con Flyway en `src/main/resources/db/migration`.
- Migraciones incluidas:
  - `V1__core.sql` (usuarios, juegos snapshot, entries y reviews)
  - `V2__social.sql` (comments, reactions, follows, activity)
  - `V3__notifications_moderation.sql` (listas custom, notificaciones, reports, blocks)
- Usa `DB_NAME=gamedeck` para el entorno local.

## Endpoints iniciales
- `GET /api/health`
- `GET /api/games/search?query=zelda&page=1&size=10`

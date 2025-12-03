# Backend - Elemental Battlecards

Instrucciones rápidas para poner en marcha el backend localmente:

1. Instalar dependencias

```powershell
cd Backend; npm install
```

2. Crear archivo `.env` a partir de `.env.example` y ajustar valores (por ejemplo `DB_URI` y `JWT_SECRET`).

3. Ejecutar en desarrollo (con nodemon):

```powershell
npm run dev
```

4. El servidor escucha en `PORT` (por defecto `3000`). Socket.io está disponible en la misma URL.

Eventos socket relevantes:
- `create_room` -> callback recibirá `{ success: true, code }`.
- `join_room` with `{ code }` -> callback `{ success: true }` o `{ success: false, message }`.
- `game_event` -> reenviado al otro jugador en la sala.

Modo rápido sin Postgres
 - Para pruebas locales sin instalar Postgres puedes usar SQLite en memoria. En `Backend/.env` activa:
	 ```
	 DB_USE_SQLITE=true
	 ```
 - Con eso el backend usará una base en memoria (no persistente) y te permitirá probar sockets y autenticación básica.
 - Para pruebas rápidas: `npm run dev` y luego abre el frontend. Cuando termines, la base se perderá al apagar el servidor.

Endpoints HTTP de autenticación:
- `POST /api/auth/register` -> { username, email, password }
- `POST /api/auth/login` -> { email, password }

Notas:
- Por simplicidad la gestión de salas está en memoria (no persistida). Para producción, usar un almacenamiento compartido (Redis) si se escala a múltiples instancias.

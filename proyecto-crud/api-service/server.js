// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Support DATABASE_URL (render / Heroku style) or individual env vars
const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })
  : new Pool({
      host: process.env.DB_HOST || 'postgres-db',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'crud_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

// Ensure table exists
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        correo TEXT NOT NULL
      );
    `);
    console.log('Tabla users lista');
  } catch (err) {
    console.error('Error creando tabla:', err);
  }
}
ensureTable();

// Routes

// GET /api/users - Obtener todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id - Obtener usuario por id
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/users - Crear usuario
app.post('/users', async (req, res) => {
  try {
    const { nombre, correo } = req.body;
    if (!nombre || !correo) return res.status(400).json({ error: 'Faltan datos (nombre, correo)' });
    const result = await pool.query(
      'INSERT INTO users (nombre, correo) VALUES ($1, $2) RETURNING *',
      [nombre, correo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - Actualizar usuario
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo } = req.body;
    if (!nombre || !correo) return res.status(400).json({ error: 'Faltan datos (nombre, correo)' });
    const result = await pool.query(
      'UPDATE users SET nombre=$1, correo=$2 WHERE id=$3 RETURNING *',
      [nombre, correo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id - Eliminar usuario
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado', usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

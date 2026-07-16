const { Pool } = require("pg");
const mock = require("../mock/mockData");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─────────────────────────────────────────────────────────────
// REPORTES (en memoria por ahora)
// ─────────────────────────────────────────────────────────────
const reportes = new Map();

function reportarMensaje(msgId, chatId) {
  const key = `${chatId}_${msgId}`;
  const actual = (reportes.get(key) || 0) + 1;
  reportes.set(key, actual);
  return { eliminado: actual >= 5, reportes: actual };
}

// ─────────────────────────────────────────────────────────────
// CHATS / CONTACTOS
// ─────────────────────────────────────────────────────────────
async function getChatsDeUsuario(userId) {
  // Siempre devuelve el mock por ahora
  return mock.contactos;
}

// ─────────────────────────────────────────────────────────────
// MENSAJES
// ─────────────────────────────────────────────────────────────
async function getMensajes(chatId) {
  // Si es el grupo General UTP+ → carga desde BD
  if (String(chatId) === "4") {
    const res = await pool.query(
      `SELECT 
        m.id_mensaje AS id,
        m.id_chat AS "chatId",
        m.contenido AS texto,
        TO_CHAR(m.fecha_envio, 'HH12:MI AM') AS hora,
        m.codigo_usu AS "remitenteId",
        u.username AS remitente,
        m.eliminado,
        false AS mio
      FROM mensajes m
      JOIN usuarios u ON u.codigo_usu = m.codigo_usu
      WHERE m.id_chat = $1 AND m.eliminado = false
      ORDER BY m.fecha_envio ASC
      LIMIT 50`,
      [chatId]
    );
    return res.rows;
  }

  // Para los demás chats → mock
  return mock.conversaciones[chatId] || mock.conversaciones.default;
}

async function guardarMensaje({ chatId, texto, remitenteId, remitente }) {
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  // Si es el grupo General UTP+ → guarda en BD
  if (String(chatId) === "4") {
    const res = await pool.query(
      `INSERT INTO mensajes (id_chat, codigo_usu, contenido, tipo_mensaje)
       VALUES ($1, $2, $3, 'texto')
       RETURNING id_mensaje AS id, id_chat AS "chatId", contenido AS texto,
                 TO_CHAR(fecha_envio, 'HH12:MI AM') AS hora, codigo_usu AS "remitenteId"`,
      [chatId, remitenteId, texto]
    );
    const msg = res.rows[0];
    return {
      ...msg,
      remitente: remitente || "Usuario",
      mio: false,
      eliminado: false,
    };
  }

  // Para los demás chats → mock
  return {
    id: Date.now(),
    chatId,
    texto,
    hora,
    mio: false,
    remitente: remitente || "Usuario",
    remitenteId: remitenteId || null,
  };
}

// ─────────────────────────────────────────────────────────────
// BÚSQUEDA DE USUARIOS
// ─────────────────────────────────────────────────────────────
async function buscarUsuarios(query) {
  const res = await pool.query(
    `SELECT codigo_usu AS id, username, estado
     FROM usuarios
     WHERE LOWER(username) LIKE $1
     LIMIT 20`,
    [`%${(query || "").toLowerCase()}%`]
  );
  return res.rows;
}

// ─────────────────────────────────────────────────────────────
// PRESENCIA
// ─────────────────────────────────────────────────────────────
async function actualizarPresencia(userId, estado) {
  await pool.query(
    `UPDATE usuarios SET ultima_conexion = NOW(), estado = $1 WHERE codigo_usu = $2`,
    [estado === "En línea" ? "activo" : "inactivo", userId]
  );
}

module.exports = {
  getChatsDeUsuario,
  getMensajes,
  guardarMensaje,
  buscarUsuarios,
  actualizarPresencia,
  reportarMensaje,
};
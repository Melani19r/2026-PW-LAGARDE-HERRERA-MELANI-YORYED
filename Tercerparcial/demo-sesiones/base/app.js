// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');
const { crearModeloTokens } = require('./modelos/tokens.modelo');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-jwt-solo-para-la-demo';
const NOMBRE_COOKIE = 'connect.sid';

// Regresa todas las sesiones guardadas en el almacén (callback o promesa)
function todasLasSesiones(almacen) {
  return new Promise((resolve, reject) => {
    const promesa = almacen.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then === 'function') promesa.then(resolve, reject);
  });
}

function crearApp(config, pool) {
  const app = express();
  app.use(express.json());

  const usuarios = crearModeloUsuarios(pool);
  const tokens = crearModeloTokens(pool);

  const maxAge = config.maxAge || config.maxAgeMs || 1000 * 60 * 60 * 24;
  const revocar = config.jwtRevocar !== false;

  const almacen = config.almacen === 'memoria'
    ? new session.MemoryStore()
    : new MySQLStore({ createDatabaseTable: false, clearExpired: false }, pool);
  app.locals.almacen = almacen;

  app.use(
    session({
      name: NOMBRE_COOKIE,
      secret: process.env.SESSION_SECRET || 'secreto-solo-para-demo',
      store: almacen,
      resave: false,
      saveUninitialized: false,
      rolling: config.rolling,
      cookie: {
        maxAge,
        httpOnly: config.httpOnly !== false,
        sameSite: config.sameSite || 'lax',
        secure: config.secure || false,
      },
    })
  );

  const idCorto = (id) => (id ? `${id.slice(0, 8)}...` : null);

  // El servidor decide si la sesión venció (no confía solo en la cookie)
  function vencida(sesion) {
    const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
    return Date.now() - desde > maxAge;
  }

  // 401: no estás autenticado
  function requiereSesion(req, res, next) {
    if (req.session.usuario && vencida(req.session)) {
      return req.session.destroy(() => {
        res.clearCookie(NOMBRE_COOKIE);
        res.status(401).json({ error: '401 · Tu sesión venció, vuelve a iniciar sesión' });
      });
    }
    if (!req.session.usuario) {
      return res.status(401).json({ error: '401 · No has iniciado sesión' });
    }
    req.session.ultimoUso = Date.now();
    next();
  }

  // 403: estás autenticado pero no tienes permiso
  function requiereRol(rol) {
    return (req, res, next) => {
      if (req.session.usuario.rol !== rol) {
        return res.status(403).json({ error: `403 · Eres ${req.session.usuario.usuario}, pero esta ruta es para ${rol}` });
      }
      next();
    };
  }

  app.get('/api/config', (req, res) => {
    res.json(config);
  });

  app.post('/api/visita', (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({ visitas: req.session.visitas, sesion: idCorto(req.sessionID) });
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      const antes = req.session.visitas !== undefined ? idCorto(req.sessionID) : null;
      const visitas = req.session.visitas || 0;

      const guardar = () => {
        req.session.usuario = datos;
        req.session.visitas = visitas;
        req.session.creada = Date.now();
        req.session.ultimoUso = Date.now();
        req.session.save((error) => {
          if (error) return next(error);
          res.json({ usuario: datos, sesionAntes: antes, sesionDespues: idCorto(req.sessionID) });
        });
      };

      if (config.regenerarAlEntrar) {
        req.session.regenerate((error) => (error ? next(error) : guardar()));
      } else {
        guardar();
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(NOMBRE_COOKIE);
      res.json({ mensaje: 'Sesión cerrada' });
    });
  });

  app.get('/api/sesion', requiereSesion, (req, res) => {
    const desde = config.rolling ? req.session.ultimoUso : req.session.creada;
    res.json({
      usuario: req.session.usuario,
      sesion: idCorto(req.sessionID),
      expiraEnSegundos: Math.max(0, Math.round((desde + maxAge - Date.now()) / 1000)),
    });
  });

  app.get('/api/perfil', requiereSesion, (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({
      mensaje: `Hola ${req.session.usuario.nombre}`,
      rol: req.session.usuario.rol,
      visitas: req.session.visitas,
    });
  });

  app.get('/api/admin/reporte', requiereSesion, requiereRol('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3' });
  });

  app.get('/api/diagnostico/sesiones', async (req, res, next) => {
    try {
      const sesiones = await todasLasSesiones(almacen);
      const pares = Array.isArray(sesiones)
        ? sesiones.map((s) => [s.id, s])
        : Object.entries(sesiones || {});
      const lista = pares.map(([id, s]) => ({
        sesion: idCorto(id),
        esLaTuya: id === req.sessionID,
        usuario: s.usuario ? s.usuario.usuario : null,
        visitas: s.visitas || 0,
        expira: s.cookie && s.cookie.expires ? new Date(s.cookie.expires).toISOString() : null,
      }));
      res.json({ almacen: config.almacen, sesiones: lista });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(path.join(__dirname, 'public')));

  // ---------- Implementación de JWT ----------
  const SECRETO_JWT = config.jwtSecreto || JWT_SECRET;

  // Firma el token con los datos del usuario
  function firmarToken(usuario) {
    return jwt.sign(
      {
        sub: String(usuario.id),
        usuario: usuario.usuario,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      SECRETO_JWT,
      {
        algorithm: 'HS256',
        expiresIn: config.jwtExpiraSeg || 900,
        jwtid: crypto.randomUUID(),
      }
    );
  }

  // Middleware: valida el token que llega en Authorization: Bearer <token>
  async function requiereJWT(req, res, next) {
    const encabezado = req.headers.authorization || '';
    if (!encabezado.startsWith('Bearer ')) {
      return res.status(401).json({ error: '401 · Falta el token (Authorization: Bearer ...)' });
    }
    const token = encabezado.slice('Bearer '.length);

    let datos;
    try {
      datos = jwt.verify(token, SECRETO_JWT, { algorithms: ['HS256'] });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '401 · Token expirado, renuévalo' });
      }
      return res.status(401).json({ error: '401 · Token inválido' });
    }

    try {
      if (revocar && (await tokens.estaRevocado(datos.jti))) {
        return res.status(401).json({ error: '401 · Token revocado (ya hiciste logout)' });
      }
    } catch (error) {
      return next(error);
    }

    req.jwt = datos;
    next();
  }

  // 403: el token es válido pero el rol no alcanza
  function requireRolJWT(rol) {
    return (req, res, next) => {
      if (req.jwt.rol !== rol) {
        return res.status(403).json({ error: `403 · Eres ${req.jwt.usuario}, pero esta ruta es solo para ${rol}` });
      }
      next();
    };
  }

  app.post('/api/jwt/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      res.json({ token: firmarToken(datos), usuario: datos });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/jwt/perfil', requiereJWT, (req, res) => {
    res.json({
      mensaje: `Hola ${req.jwt.nombre}`,
      rol: req.jwt.rol,
      expiraEnSegundos: Math.max(0, req.jwt.exp - Math.floor(Date.now() / 1000)),
    });
  });

  app.get('/api/jwt/admin/reporte', requiereJWT, requireRolJWT('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3' });
  });

  app.post('/api/jwt/refresh', requiereJWT, (req, res) => {
    const { sub, usuario, nombre, rol } = req.jwt;
    res.json({ token: firmarToken({ id: sub, usuario, nombre, rol }) });
  });

  app.post('/api/jwt/logout', requiereJWT, async (req, res, next) => {
    try {
      if (revocar) {
        await tokens.revocar(req.jwt.jti, req.jwt.usuario, req.jwt.exp);
        return res.json({ mensaje: 'Token revocado en el servidor, se registra en la lista negra' });
      }
      res.json({ mensaje: 'El servidor no guarda nada' });
    } catch (error) {
      next(error);
    }
  });

  // El 404 y el manejador de errores SIEMPRE van al final, después de todas las rutas
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  });

  return app;
}

module.exports = { crearApp, NOMBRE_COOKIE };
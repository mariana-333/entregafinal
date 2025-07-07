require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { engine } = require('express-handlebars') 
const path = require('path');
const bodyParser = require('body-parser')
const { movimientosCaballo, movimientosAlfil, movimientosTorre, movimientosReina, movimientosRey, movimientosPeon } = require('./chess');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const User = require('./models/User');
const session = require('express-session');
const Game = require('./models/Game');
const Invitation = require('./models/Invitation');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express()
const port = process.env.PORT || 3000
const usuarios = []

// Conexión a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chessdb';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// VARIABLES DE ESTADO DEL JUEGO
let turnoActual = 'blanca'; 
let estadoJuego = 'en-curso';
let estadoTablero = null;
let ultimoMovimiento = null;
let contadorMovimientos = 0;
let historialMovimientos = [];

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// CONFIGURACIÓN DE HANDLEBARS
app.engine('handlebars', engine({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    helpers: {
        baseUrl: () => '',
        increment: value => value + 1,
        eq: (a, b) => a === b,
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, 'views'))

// FUNCIÓN PARA GENERAR TABLERO
const generarTablero = () => {
    const files = [8, 7, 6, 5, 4, 3, 2, 1];
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const piezas = {
        a8: { tipo: 'torre', color: 'negra' },
        b8: { tipo: 'caballo', color: 'negra' },
        c8: { tipo: 'alfil', color: 'negra' },
        d8: { tipo: 'reina', color: 'negra' },
        e8: { tipo: 'rey', color: 'negra' },
        f8: { tipo: 'alfil', color: 'negra' },
        g8: { tipo: 'caballo', color: 'negra' },
        h8: { tipo: 'torre', color: 'negra' },
        a7: { tipo: 'peon', color: 'negra' },
        b7: { tipo: 'peon', color: 'negra' },
        c7: { tipo: 'peon', color: 'negra' },
        d7: { tipo: 'peon', color: 'negra' },
        e7: { tipo: 'peon', color: 'negra' },
        f7: { tipo: 'peon', color: 'negra' },
        g7: { tipo: 'peon', color: 'negra' },
        h7: { tipo: 'peon', color: 'negra' },
        a2: { tipo: 'peon', color: 'blanca' },
        b2: { tipo: 'peon', color: 'blanca' },
        c2: { tipo: 'peon', color: 'blanca' },
        d2: { tipo: 'peon', color: 'blanca' },
        e2: { tipo: 'peon', color: 'blanca' },
        f2: { tipo: 'peon', color: 'blanca' },
        g2: { tipo: 'peon', color: 'blanca' },
        h2: { tipo: 'peon', color: 'blanca' },
        a1: { tipo: 'torre', color: 'blanca' },
        b1: { tipo: 'caballo', color: 'blanca' },
        c1: { tipo: 'alfil', color: 'blanca' },
        d1: { tipo: 'reina', color: 'blanca' },
        e1: { tipo: 'rey', color: 'blanca' },
        f1: { tipo: 'alfil', color: 'blanca' },
        g1: { tipo: 'caballo', color: 'blanca' },
        h1: { tipo: 'torre', color: 'blanca' }
    };

    const tablero = [];
    for (let i = 0; i < 8; i++) {
        const fila = [];
        for (let j = 0; j < 8; j++) {
            const pos = cols[j] + files[i];
            const color = (i + j) % 2 ? 'negro' : 'blanco';
            const pieza = piezas[pos] ? piezas[pos] : null;
            fila.push({ pos, color, pieza });
        }
        tablero.push(fila);
    }
    return tablero;
};

// Inicializar el estado del tablero
estadoTablero = generarTablero();

// Función para actualizar el estado del tablero en memoria
function actualizarEstadoTablero(inicial, final, pieza, color) {
    const [colInicial, filaInicial] = [inicial[0], parseInt(inicial[1])];
    const [colFinal, filaFinal] = [final[0], parseInt(final[1])];
    
    const xInicial = colInicial.charCodeAt(0) - 'a'.charCodeAt(0);
    const yInicial = 8 - filaInicial;
    const xFinal = colFinal.charCodeAt(0) - 'a'.charCodeAt(0);
    const yFinal = 8 - filaFinal;
    
    console.log('🔄 Actualizando tablero en memoria:', {
        desde: `${inicial} (${xInicial},${yInicial})`,
        hacia: `${final} (${xFinal},${yFinal})`,
        pieza,
        color
    });
    
    // Verificar que las coordenadas sean válidas
    if (!estadoTablero[yInicial] || !estadoTablero[yFinal]) {
        console.error('❌ Coordenadas de tablero inválidas');
        return;
    }
    
    // Mover la pieza
    const piezaMovida = estadoTablero[yInicial][xInicial].pieza;
    
    // Limpiar casilla inicial
    estadoTablero[yInicial][xInicial].pieza = null;
    
    // Colocar pieza en casilla final
    estadoTablero[yFinal][xFinal].pieza = piezaMovida;
    
    console.log('✅ Tablero actualizado en memoria');
}

// Función para convertir estado de BD al formato de vista
function convertirTableroDeDB(boardState) {
    if (!boardState) {
        return generarTablero(); // Si no hay estado, usar tablero inicial
    }
    const files = [8, 7, 6, 5, 4, 3, 2, 1];
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const tablero = [];
    for (let i = 0; i < 8; i++) {
        const fila = [];
        for (let j = 0; j < 8; j++) {
            const pos = cols[j] + files[i];
            const color = (i + j) % 2 ? 'negro' : 'blanco';
            const pieza = boardState[pos] ? boardState[pos] : null;
            fila.push({ pos, color, pieza });
        }
        tablero.push(fila);
    }
    return tablero;
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'chess-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Cambia a true si usas HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware para variables globales
app.use((req, res, next) => {
    res.locals.isLoggedIn = !!req.session.user;
    res.locals.currentUser = req.session.user;
    next();
});

// Middleware de autenticación para API (devuelve JSON en lugar de redirigir)
const validateApiAccess = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            error: 'No autorizado',
            mensaje: 'Debes iniciar sesión para acceder a esta API' 
        });
    }
    next();
};

// ===== RUTAS API =====
app.get('/api/turno-actual', validateApiAccess, async (req, res) => {
    const gameId = req.query.gameId;
    let turnoRespuesta = turnoActual; // Default al turno global
    
    // Si hay gameId, obtener el turno desde la base de datos
    if (gameId) {
        try {
            const game = await Game.findOne({ gameId });
            if (game && game.currentTurn) {
                turnoRespuesta = game.currentTurn;
                console.log(`🎮 Turno desde BD para juego ${gameId}: ${turnoRespuesta}`);
            } else {
                console.log(`⚠️ Juego ${gameId} no encontrado, usando turno global: ${turnoActual}`);
            }
        } catch (error) {
            console.error('Error obteniendo turno desde BD:', error);
        }
    }
    
    console.log('Turno actual solicitado:', turnoRespuesta);
    res.json({ turno: turnoRespuesta });
});

app.get('/api/estado-juego', validateApiAccess, async (req, res) => {
    const gameId = req.query.gameId;
    let turnoRespuesta = turnoActual;
    let estadoTableroRespuesta = estadoTablero;
    
    // Si hay gameId, obtener el estado desde la base de datos
    if (gameId) {
        try {
            const game = await Game.findOne({ gameId });
            if (game) {
                turnoRespuesta = game.currentTurn || turnoActual;
                // Convertir boardState de BD al formato del frontend si existe
                if (game.boardState) {
                    estadoTableroRespuesta = convertirTableroDeDB(game.boardState);
                }
                console.log(`🎮 Estado desde BD para juego ${gameId}: turno=${turnoRespuesta}`);
            }
        } catch (error) {
            console.error('Error obteniendo estado desde BD:', error);
        }
    }
    
    res.json({
        turnoActual: turnoRespuesta,
        tablero: estadoTableroRespuesta,
        estadoJuego: estadoJuego
    });
});

app.post('/api/rendirse', validateApiAccess, async (req, res) => {
    // Debug para ver qué está llegando
    console.log('req.body completo:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { jugador } = req.body;
    
    // Validar que jugador no esté vacío
    if (!jugador) {
        return res.status(400).json({
            success: false,
            mensaje: 'El campo jugador es requerido'
        });
    }
    
    try {
        console.log('Solicitud de rendición recibida:', { 
            jugador, 
            estadoActual: estadoJuego, 
            turnoActual 
        });
        
        if (estadoJuego !== 'en-curso') {
            return res.json({
                success: false,
                mensaje: 'La partida ya ha terminado'
            });
        }
        
        if (jugador !== turnoActual) {
            return res.json({
                success: false,
                mensaje: 'Solo puedes rendirte en tu turno'
            });
        }
        
        const ganador = jugador === 'blanca' ? 'negras' : 'blancas';
        estadoJuego = `${ganador}-ganan`;
        
        console.log(`${jugador} se ha rendido. Ganador: ${ganador}`);
        
        res.json({
            success: true,
            mensaje: `${jugador === 'blanca' ? 'Blancas' : 'Negras'} se han rendido`,
            ganador: ganador,
            estadoJuego: estadoJuego
        });
        
    } catch (error) {
        console.error('Error al procesar rendición:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

app.post('/api/validar-movimiento', validateApiAccess, async (req, res) => {
    console.log('Datos recibidos:', req.body);
    
    const { pieza, color, inicial, final, gameId } = req.body;


    // Validar datos y gameId
    if (!pieza || !color || !inicial || !final) {
        return res.status(400).json({ 
            valido: false, 
            mensaje: 'Datos incompletos' 
        });
    }
    // Si es partida online, el gameId es obligatorio
    if (req.body.hasOwnProperty('gameId') && !gameId) {
        return res.status(400).json({
            valido: false,
            mensaje: 'Falta gameId para partida online'
        });
    }


    let game = null;
    let turnoActualPartida = turnoActual; // Usar turno global por defecto
    let boardStateFromDB = null;

    // Si hay gameId, cargar el estado del juego desde la base de datos
    if (gameId) {
        try {
            game = await Game.findOne({ gameId });
            if (game) {
                turnoActualPartida = game.currentTurn;
                if (game.boardState) {
                    boardStateFromDB = game.boardState;
                }
                // Sincronizar el tablero en memoria con el de la BD
                if (boardStateFromDB) {
                    estadoTablero = convertirTableroDeDB(boardStateFromDB);
                }
                console.log(`🎮 Cargando turno y tablero desde BD para juego ${gameId}: ${turnoActualPartida}`);
            } else {
                console.log(`⚠️ Juego ${gameId} no encontrado, usando turno global`);
            }
        } catch (error) {
            console.error('Error cargando juego:', error);
        }
    }

    // El repo original compara el color tal cual, no lo normaliza
    if (color !== turnoActualPartida) {
        return res.json({ 
            valido: false, 
            mensaje: `No es tu turno. Turno actual: ${turnoActualPartida}` 
        });
    }

    const [colInicial, filaInicial] = [inicial[0], parseInt(inicial[1])];
    const [colFinal, filaFinal] = [final[0], parseInt(final[1])];

    const xInicial = colInicial.charCodeAt(0) - 'a'.charCodeAt(0);
    const yInicial = 8 - filaInicial; // Usar el mismo sistema que chess.js
    const xFinal = colFinal.charCodeAt(0) - 'a'.charCodeAt(0);
    const yFinal = 8 - filaFinal; // Usar el mismo sistema que chess.js

    console.log('Posiciones convertidas:', {
        inicial: [xInicial, yInicial],
        final: [xFinal, yFinal]
    });

    let movimientosValidos = [];

    try {
        switch (pieza) {
            case 'caballo':
                movimientosValidos = movimientosCaballo(xInicial, yInicial);
                break;
            case 'alfil':
                movimientosValidos = movimientosAlfil(xInicial, yInicial);
                break;
            case 'torre':
                movimientosValidos = movimientosTorre(xInicial, yInicial);
                break;
            case 'reina':
                movimientosValidos = movimientosReina(xInicial, yInicial);
                break;
            case 'rey':
                movimientosValidos = movimientosRey(xInicial, yInicial);
                break;
            case 'peon':
                movimientosValidos = movimientosPeon(xInicial, yInicial, color);
                break;
            default:
                return res.json({ 
                    valido: false, 
                    mensaje: 'Tipo de pieza no válido' 
                });
        }

        console.log('Movimientos válidos:', movimientosValidos);
        console.log('Posición destino:', final);

        const esValido = movimientosValidos.includes(final);

        // --- DETECCIÓN DE CAPTURA DE REY ---
        let reyCapturado = false;
        let colorReyCapturado = null;
        if (esValido) {
            // Buscar la pieza en la casilla destino antes de mover
            let piezaDestino = null;
            if (estadoTablero) {
                const xFinalTab = xFinal;
                const yFinalTab = yFinal;
                if (estadoTablero[yFinalTab] && estadoTablero[yFinalTab][xFinalTab]) {
                    piezaDestino = estadoTablero[yFinalTab][xFinalTab].pieza;
                }
            }
            if (piezaDestino && piezaDestino.tipo === 'rey') {
                reyCapturado = true;
                colorReyCapturado = piezaDestino.color;
            }
        }


        if (esValido) {
            // Alternar turno
            const nuevoTurno = turnoActualPartida === 'blanca' ? 'negra' : 'blanca';

            if (gameId && game) {
                try {
                    // Actualizar el estado del tablero en memoria
                    actualizarEstadoTablero(inicial, final, pieza, color);

                    // Convertir el tablero a formato de BD
                    const boardStateForDB = {};
                    for (let i = 0; i < estadoTablero.length; i++) {
                        for (let j = 0; j < estadoTablero[i].length; j++) {
                            const casilla = estadoTablero[i][j];
                            if (casilla.pieza) {
                                boardStateForDB[casilla.pos] = casilla.pieza;
                            }
                        }
                    }

                    // Siempre actualizar currentTurn, excepto si se capturó el rey (fin de partida)
                    let updateFields = {
                        boardState: boardStateForDB,
                        currentTurn: reyCapturado ? undefined : nuevoTurno
                    };
                    if (reyCapturado) {
                        updateFields.status = 'finished';
                        updateFields.result = color === 'blanca' ? 'victory' : 'defeat';
                        updateFields.winner = color;
                        updateFields.finishedAt = new Date();
                        delete updateFields.currentTurn; // No hay turno si terminó la partida
                    }


                    await Game.updateOne(
                        { gameId },
                        updateFields
                    );
                    if (reyCapturado) {
                        estadoJuego = `${color}-ganan`;
                    }
                    console.log(`✅ Estado guardado en BD para juego ${gameId}: turno=${reyCapturado ? 'fin' : nuevoTurno}`);
                } catch (error) {
                    console.error('❌ Error guardando estado en BD:', error);
                }
            } else {
                // Solo modo práctica/local
                actualizarEstadoTablero(inicial, final, pieza, color);
                if (reyCapturado) {
                    estadoJuego = `${color}-ganan`;
                } else {
                    turnoActual = nuevoTurno;
                }
            }
            contadorMovimientos++;

            // Almacenar el último movimiento para sincronización
            ultimoMovimiento = {
                id: contadorMovimientos,
                pieza,
                color: color,
                inicial,
                final,
                timestamp: new Date().getTime(),
                reyCapturado: reyCapturado ? colorReyCapturado : null
            };
            historialMovimientos.push(ultimoMovimiento);
            console.log('Nuevo turno:', reyCapturado ? 'fin' : nuevoTurno);
            console.log('Último movimiento:', ultimoMovimiento);
        }

        // Determinar el nuevo turno correctamente para la respuesta
        // Si la partida terminó, no hay nuevo turno
        let nuevoTurnoRespuesta = null;
        if (reyCapturado) {
            nuevoTurnoRespuesta = null;
        } else if (gameId && game) {
            // Leer el turno actualizado desde la base de datos para evitar desincronización
            try {
                const updatedGame = await Game.findOne({ gameId });
                if (updatedGame && typeof updatedGame.currentTurn === 'string') {
                    nuevoTurnoRespuesta = updatedGame.currentTurn;
                    turnoActual = updatedGame.currentTurn;
                } else {
                    nuevoTurnoRespuesta = turnoActualPartida === 'blanca' ? 'negra' : 'blanca';
                    turnoActual = nuevoTurnoRespuesta;
                }
            } catch (e) {
                nuevoTurnoRespuesta = turnoActualPartida === 'blanca' ? 'negra' : 'blanca';
                turnoActual = nuevoTurnoRespuesta;
            }
        } else {
            // Partida local
            nuevoTurnoRespuesta = turnoActual;
        }

        res.json({
            valido: esValido,
            mensaje: esValido ? (reyCapturado ? '¡Rey capturado! Fin de la partida.' : 'Movimiento válido') : 'Movimiento inválido',
            nuevoTurno: nuevoTurnoRespuesta,
            movimiento: esValido ? ultimoMovimiento : null,
            contadorMovimientos: contadorMovimientos,
            finPartida: reyCapturado,
            ganador: reyCapturado ? color : null
        });
    } catch (error) {
        console.error('Error en validación:', error);
        res.status(500).json({
            valido: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

// Endpoint alternativo sin parámetros para inicialización
app.get('/api/ultimo-movimiento', validateApiAccess, (req, res) => {
    res.json({
        hayNuevoMovimiento: false,
        turnoActual: turnoActual,
        contadorMovimientos: contadorMovimientos,
        estadoJuego: estadoJuego,
        ultimoMovimiento: ultimoMovimiento
    });
});

app.post('/api/nueva-partida', validateApiAccess, (req, res) => {
    try {
        turnoActual = 'blanca';
        estadoJuego = 'en-curso';
        estadoTablero = generarTablero();
        ultimoMovimiento = null;
        contadorMovimientos = 0;
        historialMovimientos = [];
        
        console.log('Nueva partida iniciada - Turno actual:', turnoActual);
        
        res.json({ 
            success: true, 
            mensaje: 'Nueva partida iniciada',
            turnoActual: turnoActual,
            estadoJuego: estadoJuego,
            contadorMovimientos: contadorMovimientos
        });
    } catch (error) {
        console.error('Error al iniciar nueva partida:', error);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error interno del servidor' 
        });
    }
});

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
    res.render('register');
});

// Ruta para procesar el registro
app.post('/register', upload.single('profilepicture'), async (req, res) => {
    try {
        const {
            nombres,
            apellidos,
            fecha,
            username,
            email,
            password,
            'confirm-password': confirmPassword
        } = req.body;

        // Verificar si las contraseñas coinciden
        if (password !== confirmPassword) {
            return res.render('register', {
                error: 'Las contraseñas no coinciden'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.render('register', {
                error: 'El usuario o email ya existe'
            });
        }

        // Hashear la contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            nombres,
            apellidos,
            fechaNacimiento: fecha,
            username,
            email,
            password: hashedPassword,
            profilePicture: req.file ? `/uploads/${req.file.filename}` : null
        });

        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Error en registro:', error);
        res.render('register', {
            error: 'Error al registrar usuario'
        });
    }
});

// Modifica la ruta de login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Buscar usuario por username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.render('login', {
                error: 'Usuario o contraseña incorrectos'
            });
        }

        // Verificar contraseña usando bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.render('login', {
                error: 'Usuario o contraseña incorrectos'
            });
        }

        // Guardar usuario en sesión
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email,         
            nombres: user.nombres,        
            apellidos: user.apellidos   
        };

        console.log('✅ Login exitoso para usuario:', username);
        res.redirect('/');
    } catch (error) {
        console.error('Error en login:', error);
        res.render('login', {
            error: 'Error al iniciar sesión'
        });
    }
});

// Añade la ruta de logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/');
    });
});

// Middleware de autenticación
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// ===== RUTAS DE VISTAS =====
app.get('/', (req, res) => {
    res.render('index', {
        titulo: 'Hello World!',
        mensaje: 'Bienvenido a mi app usando Handlebars 😎'
    })
})

app.get('/play', (req, res) => {
    res.render('play')
})

app.get('/chessboard', async (req, res) => {
    try {
        const gameId = req.query.game;
        const userId = req.session.user?.id;
        let tableroData = generarTablero(); // Tablero por defecto
        let gameInfo = null;
        let jugadorColor = 'blanca'; // Por defecto
        
        if (gameId && userId) {
            console.log(`🎮 Cargando partida ${gameId} desde base de datos para usuario ${userId}`);
            
            // Buscar el juego en la base de datos
            const game = await Game.findOne({ gameId }).populate('owner').populate('opponent');
            
            // Buscar la invitación para obtener información de colores
            const invitation = await Invitation.findOne({ gameId });
            
            if (game) {
                console.log('📋 Juego encontrado:', {
                    gameId: game.gameId,
                    owner: game.owner?.username,
                    opponent: game.opponent?.username,
                    ownerColor: invitation?.ownerColor
                });
                
                // Determinar si el usuario actual es el propietario
                const isOwner = game.owner && game.owner._id.toString() === userId;
                
                // Determinar el color del jugador basado en la invitación
                if (invitation) {
                    jugadorColor = isOwner ? invitation.ownerColor : 
                                  (invitation.ownerColor === 'blanca' ? 'negra' : 'blanca');
                }
                
                // Cargar estado del tablero si existe
                if (game.boardState) {
                    console.log('📋 Cargando tablero desde base de datos');
                    tableroData = convertirTableroDeDB(game.boardState);
                }
                
                gameInfo = {
                    gameId: game.gameId,
                    currentTurn: game.currentTurn || 'blanca',
                    status: game.status,
                    isOwner: isOwner,
                    opponent: isOwner ? game.opponent?.username : game.owner?.username,
                    ownerColor: invitation?.ownerColor
                };
                
                console.log('🎨 Color determinado para el jugador:', {
                    userId,
                    isOwner,
                    ownerColor: invitation?.ownerColor,
                    jugadorColor
                });
            } else {
                console.log('❌ Juego no encontrado, usando modo práctica');
            }
        } else {
            console.log('🆕 Sin gameId o usuario, usando modo práctica');
        }
        
        res.render('chessboard', { 
            filas: tableroData,
            gameId: gameId,
            gameInfo: gameInfo,
            jugadorColor: jugadorColor
        });
        
    } catch (error) {
        console.error('Error cargando partida:', error);
        res.render('chessboard', { 
            filas: generarTablero(),
            jugadorColor: 'blanca'
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/publicgameplay', (req, res) => {
    res.render('publicgameplay')
})

app.get('/creategame', (req, res) => {
    res.render('creategame')
})

// Ruta POST para procesar la creación de partida
app.post('/creategame', requireLogin, async (req, res) => {
    try {
        const { color, email } = req.body;
        const userId = req.session.user.id;

        // Generar IDs únicos
        const gameId = uuidv4().substring(0, 8);
        const invitationId = uuidv4();

        // Crear nueva invitación
        const newInvitation = new Invitation({
            invitationId,
            gameId,
            owner: userId,
            ownerColor: color,
            invitedEmail: email || null
        });

        await newInvitation.save();

        // Generar enlace de invitación
        const invitationLink = `${req.protocol}://${req.get('host')}/join-game/${invitationId}`;

        console.log('Partida creada:', {
            gameId,
            invitationId,
            owner: userId,
            ownerColor: color,
            invitationLink
        });

        // Mostrar el enlace al usuario
        res.render('creategame', {
            success: true,
            invitationLink,
            gameId,
            ownerColor: color,
            message: email ? 
                `Partida creada. Enlace de invitación generado para ${email}` : 
                'Partida creada. Comparte el enlace para que alguien se una'
        });

    } catch (error) {
        console.error('Error al crear partida:', error);
        res.render('creategame', {
            error: 'Error al crear la partida. Inténtalo de nuevo.'
        });
    }
});

// Ruta para unirse a una partida usando el enlace de invitación
app.get('/join-game/:invitationId', requireLogin, async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.session.user.id;

        // Buscar la invitación
        const invitation = await Invitation.findOne({ 
            invitationId, 
            status: 'pending' 
        }).populate('owner');

        if (!invitation) {
            return res.render('invitation-status', {
                error: 'Invitación no encontrada o ya expirada'
            });
        }

        // Verificar que no sea el propietario de la partida
        if (invitation.owner._id.toString() === userId) {
            return res.render('invitation-status', {
                error: 'No puedes unirte a tu propia partida',
                gameId: invitation.gameId,
                ownerColor: invitation.ownerColor
            });
        }

        // Aceptar la invitación
        invitation.status = 'accepted';
        invitation.acceptedBy = userId;
        await invitation.save();

        // Crear el juego en la base de datos
        const newGame = new Game({
            gameId: invitation.gameId,
            owner: invitation.owner._id,
            opponent: userId,
            status: 'playing'
        });

        await newGame.save();

        console.log('Jugador se unió a la partida:', {
            gameId: invitation.gameId,
            owner: invitation.owner.username,
            opponent: req.session.user.username,
            ownerColor: invitation.ownerColor
        });

        // Mostrar página de éxito
        res.render('invitation-status', {
            success: true,
            gameId: invitation.gameId,
            opponentName: invitation.owner.username,
            playerColor: invitation.ownerColor === 'blanca' ? 'negra' : 'blanca'
        });

    } catch (error) {
        console.error('Error al unirse a la partida:', error);
        res.render('invitation-status', {
            error: 'Error al unirse a la partida. Inténtalo de nuevo.'
        });
    }
});

app.get('/register', (req, res) => {
    res.render('register')
})

app.get('/rulesandhistory', (req, res) => {
    res.render('rulesandhistory')
})

app.get('/developers', (req, res) => {
    res.render('developers')
})

app.get('/privategame', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Buscar invitaciones pendientes dirigidas al usuario
        const pendingInvitations = await Invitation.find({
            $or: [
                { invitedEmail: req.session.user.email, status: 'pending' },
                { invitedEmail: null, status: 'pending', owner: { $ne: userId } }
            ]
        }).populate('owner');

        // Buscar partidas activas donde el usuario participa
        const activeGames = await Game.find({
            $or: [
                { owner: userId, status: 'playing' },
                { opponent: userId, status: 'playing' }
            ]
        }).populate('owner').populate('opponent');

        // Formatear invitaciones pendientes
        const formattedInvitations = pendingInvitations.map(inv => ({
            invitationId: inv.invitationId,
            ownerName: inv.owner.username,
            ownerColor: inv.ownerColor,
            createdDate: new Date(inv.createdAt).toLocaleDateString()
        }));

        // Formatear partidas activas
        const formattedGames = activeGames.map(game => {
            const isOwner = game.owner._id.toString() === userId;
            const opponent = isOwner ? game.opponent : game.owner;
            
            return {
                gameId: game.gameId,
                opponentName: opponent?.username || 'Esperando oponente',
                status: game.status === 'playing' ? 'En curso' : 'Esperando',
                userColor: isOwner ? 'Propietario' : 'Invitado',
                startDate: new Date(game.createdAt).toLocaleDateString()
            };
        });

        console.log('Invitaciones pendientes:', formattedInvitations);
        console.log('Partidas activas:', formattedGames);

        res.render('privategame', {
            pendingInvitations: formattedInvitations,
            activeGames: formattedGames
        });

    } catch (error) {
        console.error('Error al cargar partidas privadas:', error);
        res.render('privategame', {
            error: 'Error al cargar las partidas privadas'
        });
    }
})

// Ruta para rechazar una invitación
app.post('/decline-invitation/:invitationId', requireLogin, async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.session.user.id;

        const invitation = await Invitation.findOne({
            invitationId,
            status: 'pending'
        });

        if (!invitation) {
            return res.json({
                success: false,
                message: 'Invitación no encontrada'
            });
        }

        // Verificar que la invitación es para este usuario
        if (invitation.invitedEmail && invitation.invitedEmail !== req.session.user.email) {
            return res.json({
                success: false,
                message: 'No tienes permiso para rechazar esta invitación'
            });
        }

        // Marcar como expirada (es como rechazarla)
        invitation.status = 'expired';
        await invitation.save();

        res.json({
            success: true,
            message: 'Invitación rechazada exitosamente'
        });

    } catch (error) {
        console.error('Error al rechazar invitación:', error);
        res.json({
            success: false,
            message: 'Error al rechazar la invitación'
        });
    }
});

// Ruta para eliminar una partida (solo el creador)
app.delete('/delete-game/:gameId', requireLogin, async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.session.user.id;

        console.log('Solicitud de eliminación de partida:', { gameId, userId });

        // Buscar la invitación asociada al gameId
        const invitation = await Invitation.findOne({ gameId }).populate('owner');

        if (!invitation) {
            return res.json({
                success: false,
                message: 'Partida no encontrada'
            });
        }

        // Verificar que el usuario es el creador de la partida
        if (invitation.owner._id.toString() !== userId) {
            return res.json({
                success: false,
                message: 'Solo el creador puede eliminar la partida'
            });
        }

        // Verificar que la partida no esté en curso con oponente activo
        const game = await Game.findOne({ gameId });
        if (game && game.opponent && game.status === 'playing') {
            return res.json({
                success: false,
                message: 'No puedes eliminar una partida en curso con oponente'
            });
        }

        // Eliminar la invitación
        await Invitation.deleteOne({ gameId });

        // Eliminar el juego si existe
        if (game) {
            await Game.deleteOne({ gameId });
        }

        console.log('Partida eliminada exitosamente:', gameId);

        res.json({
            success: true,
            message: 'Partida eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar partida:', error);
        res.json({
            success: false,
            message: 'Error al eliminar la partida'
        });
    }
});

// Ruta para ver las partidas creadas por el usuario
app.get('/my-games', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Buscar invitaciones creadas por el usuario
        const myInvitations = await Invitation.find({
            owner: userId
        }).populate('acceptedBy').sort({ createdAt: -1 });

        // Buscar partidas donde el usuario es el propietario
        const myGames = await Game.find({
            owner: userId
        }).populate('opponent').sort({ createdAt: -1 });

        // Formatear invitaciones
        const formattedInvitations = myInvitations.map(inv => ({
            invitationId: inv.invitationId,
            gameId: inv.gameId,
            status: inv.status,
            ownerColor: inv.ownerColor,
            invitedEmail: inv.invitedEmail,
            acceptedByName: inv.acceptedBy?.username,
            createdDate: new Date(inv.createdAt).toLocaleDateString(),
            invitationLink: `${req.protocol}://${req.get('host')}/join-game/${inv.invitationId}`,
            isExpired: inv.status === 'expired' || inv.expiresAt < new Date()
        }));

        // Formatear partidas
        const formattedGames = myGames.map(game => ({
            gameId: game.gameId,
            opponentName: game.opponent?.username || 'Sin oponente',
            status: game.status,
            result: game.result,
            createdDate: new Date(game.createdAt).toLocaleDateString(),
            finishedDate: game.finishedAt ? new Date(game.finishedAt).toLocaleDateString() : null
        }));

        res.render('my-games', {
            invitations: formattedInvitations,
            games: formattedGames
        });

    } catch (error) {
        console.error('Error al cargar mis partidas:', error);
        res.render('my-games', {
            error: 'Error al cargar las partidas'
        });
    }
});

app.get('/publicgamever', (req, res) => {
    res.render('publicgamever')
})

app.get('/edit', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('edit', {
            currentUser: user
        });
    } catch (error) {
        console.error('Error al cargar datos de usuario:', error);
        res.status(500).render('error', {
            error: 'Error al cargar datos de usuario'
        });
    }
});

// Ruta para procesar la edición
app.post('/edit', requireLogin, upload.single('profilepicture'), async (req, res) => {
    try {
        const { nombres, apellidos, fecha, email, password, 'confirm-password': confirmPassword } = req.body;
        const userId = req.session.user.id;

        // Debug para ver los datos
        console.log('Datos recibidos:', req.body);
        console.log('Usuario actual:', req.session.user);

        // Solo verificar si el email ha cambiado
        const currentUser = await User.findById(userId);
        if (email !== currentUser.email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.render('edit', {
                    error: 'El email ya está en uso por otro usuario',
                    currentUser: currentUser
                });
            }
        }

        // Preparar datos actualizados
        const updateData = {
            nombres,
            apellidos,
            fechaNacimiento: fecha,
            email
        };

        if (req.file) {
            updateData.profilePicture = `/uploads/${req.file.filename}`;
        }

        if (password) {
            if (password !== confirmPassword) {
                return res.render('edit', {
                    error: 'Las contraseñas no coinciden',
                    currentUser: currentUser
                });
            }
            updateData.password = password;
        }

        // Actualizar usuario
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );

        // Actualizar sesión
        req.session.user = {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            nombres: updatedUser.nombres,
            apellidos: updatedUser.apellidos
        };

        res.redirect('/profile');
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        const user = await User.findById(req.session.user.id);
        res.render('edit', {
            error: 'Error al actualizar datos',
            currentUser: user
        });
    }
});

app.post('/api/game/finish', requireLogin, async (req, res) => {
    try {
        const { ganador, estadoJuego } = req.body;
        const userId = req.session.user.id;

        console.log('Finalizando partida:', { ganador, estadoJuego, userId });

        // Crear nueva partida con el resultado
        const newGame = new Game({
            gameId: uuidv4().substring(0, 8),
            owner: userId,
            status: 'finished',
            result: estadoJuego === 'empate' ? 'draw' : 
                   ganador === 'blanca' ? 'victory' : 'defeat',
            winner: estadoJuego === 'empate' ? null : userId,
            finishedAt: new Date()
        });

        await newGame.save();
        console.log('Partida guardada:', newGame);

        res.json({ 
            success: true,
            message: 'Partida guardada correctamente'
        });
    } catch (error) {
        console.error('Error al finalizar partida:', error);
        res.status(500).json({ 
            error: 'Error al guardar la partida',
            details: error.message 
        });
    }
});

app.get('/profile', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        
        // Obtener partidas donde el usuario participó
        const games = await Game.find({
            $or: [
                { owner: user._id },
                { opponent: user._id }
            ]
        }).sort({ finishedAt: -1, createdAt: -1 });

        console.log('Partidas encontradas:', games);

        // Calcular estadísticas
        const stats = {
            wins: games.filter(g => g.result === 'victory').length,
            losses: games.filter(g => g.result === 'defeat').length,
            draws: games.filter(g => g.result === 'draw').length
        };

        // Formatear historial
        const gameHistory = games.map(game => ({
            opponent: 'Oponente',  // Por ahora dejamos un valor fijo
            result: game.result,
            date: game.finishedAt ? 
                  new Date(game.finishedAt).toLocaleDateString() : 
                  new Date(game.createdAt).toLocaleDateString(),
            gameId: game.gameId
        }));

        console.log('Estadísticas:', stats);
        console.log('Historial formateado:', gameHistory);

        res.render('profile', {
            currentUser: {
                ...user.toObject(),
                stats
            },
            gameHistory
        });
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        res.status(500).render('error', {
            error: 'Error al cargar el perfil'
        });
    }
});
// app.listen()

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`)
    
    // Mostrar rutas después de que el servidor esté corriendo
    setTimeout(() => {
        console.log('\nRutas disponibles después del inicio:');
        if (app._router && app._router.stack) {
            app._router.stack.forEach(function(r){
                if (r.route && r.route.path){
                    console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
                }
            });
        }
    }, 100);
});

# ♟️ Proyecto de Ajedrez Online

Una aplicación web completa de ajedrez desarrollada con Node.js, Express y MongoDB que permite a los usuarios jugar partidas de ajedrez en línea.

## 🚀 Características

- **Juego de ajedrez completo** con validación de movimientos
- **Sistema de usuarios** con registro, login y perfiles
- **Partidas públicas y privadas**
- **Sistema de invitaciones** para partidas privadas
- **Historial de partidas** y estadísticas de usuario
- **Interfaz responsiva** y moderna

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js, Express.js
- **Base de Datos:** MongoDB con Mongoose
- **Plantillas:** Handlebars
- **Frontend:** HTML5, CSS3, JavaScript
- **Autenticación:** Express Sessions
- **Subida de archivos:** Multer
- **Gestión de procesos:** PM2

## 📦 Instalación

### Requisitos previos
- Node.js (v16 o superior)
- MongoDB
- PM2 (para producción)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Instalar PM2 globalmente
```bash
npm install -g pm2
```

### 3. Configurar variables de entorno
```bash
# Crea un archivo .env en la raíz del proyecto
MONGODB_URI=mongodb://localhost:27017/chessdb
SESSION_SECRET=tu-clave-secreta-aqui
PORT=3000
NODE_ENV=production
```

## 🎮 Comandos de Arranque

### Desarrollo local
```bash
npm start
```

### Producción con PM2

#### Proceso único (recomendado)
```bash
# Iniciar la aplicación
pm2 start server.js --name chess

# O usando npm script
npm run pm2:start
```

#### Comandos de gestión PM2
```bash
# Ver estado de procesos
pm2 status

# Detener la aplicación
pm2 stop chess

# Reiniciar la aplicación
pm2 restart chess

# Recargar sin downtime
pm2 reload chess

# Ver logs en tiempo real
pm2 logs chess

# Monitoreo en tiempo real
pm2 monit

# Eliminar proceso
pm2 delete chess
```

### Scripts NPM disponibles
```bash
npm run pm2:start    # Iniciar con PM2
npm run pm2:stop     # Detener PM2
npm run pm2:restart  # Reiniciar PM2
npm run pm2:reload   # Recargar PM2
npm run pm2:delete   # Eliminar proceso PM2
npm run pm2:logs     # Ver logs PM2
npm run pm2:monitor  # Monitor PM2
npm run pm2:status   # Estado de procesos PM2
npm run dev          # Modo desarrollo con PM2
npm run prod         # Modo producción con PM2
```

## 📋 Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo (si tienes nodemon)

## 🎮 Funcionalidades del Juego

### Sistema de Usuarios
- Registro con foto de perfil
- Login y logout
- Edición de perfil
- Estadísticas personales

### Partidas de Ajedrez
- Validación completa de movimientos para todas las piezas
- Turnos alternados automáticos
- Sistema de rendición
- Partidas públicas para práctica
- Partidas privadas con invitaciones por enlace

### Gestión de Partidas
- Crear partidas privadas con enlace de invitación
- Ver partidas pendientes y activas
- Historial completo de partidas jugadas
- Estadísticas de victorias, derrotas y empates

## 🗂️ Estructura del Proyecto

```
proyecto/
├── models/             # Modelos de MongoDB
│   ├── User.js
│   ├── Game.js
│   └── Invitation.js
├── views/              # Plantillas Handlebars
│   ├── layouts/
│   ├── partials/
│   └── *.handlebars
├── public/             # Archivos estáticos
│   ├── css/
│   ├── js/
│   ├── img/
│   └── uploads/
├── chess.js            # Lógica de movimientos del ajedrez
├── index.js            # Servidor principal
└── package.json
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Mariana** - *Desarrollo inicial* - [mariana-333](https://github.com/mariana-333)

## 🙏 Agradecimientos

- Inspirado en el juego clásico de ajedrez
- Comunidad de desarrolladores de Node.js
- Contribuidores de las librerías utilizadas

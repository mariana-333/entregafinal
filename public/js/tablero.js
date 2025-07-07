class TableroAjedrez {
    constructor() {
        this.piezaArrastrada = null;
        this.posicionInicial = null;
        this.turnoActual = 'blanca';
        this.contadorMovimientos = 0;
        this.estadoJuego = 'en-curso';
        this.piezasCapturadas = {
            blanca: [],
            negra: []
        };
        this.valoresPiezas = {
            peon: 1,
            caballo: 3,
            alfil: 3,
            torre: 5,
            reina: 9,
            rey: 0
        };
        this.contadorMovimientosServidor = 0;
        this.intervaloSincronizacion = null;
        this.jugadorColor = window.jugadorColor || 'blanca';
        this.inicializar();
    }

    // === UTILIDADES PARA MANEJO DE ERRORES ===
    manejarErrorAPI(error, contexto = 'operación') {
        console.error(`Error en ${contexto}:`, error);
        
        if (error.message.includes('JSON.parse') || error.message.includes('JSON válido')) {
            alert('Error de comunicación con el servidor. Por favor, verifica tu sesión.');
        } else if (error.message.includes('401')) {
            alert('Tu sesión ha expirado. Ve a la página de login para continuar.');
        } else {
            alert(`Error al realizar ${contexto}. Por favor, intenta de nuevo.`);
        }
    }

    async validarRespuestaAPI(response, contexto = 'operación') {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401: Sesión expirada');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Respuesta del servidor no es JSON válido');
        }

        return await response.json();
    }

    async inicializar() {
        console.log('🚀 Iniciando TableroAjedrez...');
        console.log('👤 Color del jugador:', this.jugadorColor);
        console.log('🎮 GameId:', window.gameId || 'Modo práctica');
        
        // Añadir estilos CSS para el overlay
        this.añadirEstilosOverlay();
        
        this.verificarElementos();
        this.configurarNuevaPartida();
        console.log('🔧 Configurando botón de rendición...');
        this.configurarRendicion();
        console.log('🔧 Configurando modales...');
        this.configurarModales();
        await this.sincronizarEstado();
        this.configurarDragAndDrop();
        this.iniciarSincronizacion();
        
        setTimeout(() => {
            this.actualizarTurno(this.turnoActual);
            this.actualizarContador();
            this.actualizarEstadoJuego();
        }, 100);
        console.log('✅ TableroAjedrez inicializado completamente');
        console.log('📊 Estado inicial: Turno=', this.turnoActual, 'Mi color=', this.jugadorColor, 'Es mi turno=', this.turnoActual === this.jugadorColor);
    }

    // Verificar que todos los elementos existen
    verificarElementos() {
        // Solo verificar si estamos en la página del tablero
        const tablero = document.querySelector('.tablero');
        if (!tablero) {
            console.log('📍 No hay tablero en esta página, saltando verificación de elementos');
            return;
        }
        
        console.log('✅ Página del tablero detectada, verificando elementos...');

        const elementos = [
            'nueva-partida',
            'turno-display', 
            'contador-movimientos'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (!elemento) {
                console.warn(`⚠️ Elemento con ID '${id}' no encontrado`);
            } else {
                console.log(`✅ Elemento '${id}' encontrado correctamente`);
            }
        });
    }

    // Sincronizar el turno con el servidor
    async sincronizarTurno() {
        try {
            let url = '/api/turno-actual';
            
            // Agregar gameId si existe
            if (window.gameId) {
                url += `?gameId=${window.gameId}`;
            }
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            const data = await this.validarRespuestaAPI(response, 'sincronización de turno');
            
            if (data.turno) {
                this.actualizarTurno(data.turno);
                console.log('Turno sincronizado desde servidor:', data.turno);
            }
        } catch (error) {
            if (error.message.includes('401')) {
                console.warn('Sesión expirada durante sincronización de turno.');
                return;
            }
            this.manejarErrorAPI(error, 'sincronización de turno');
        }
    }

    configurarNuevaPartida() {
        const botonNuevaPartida = document.getElementById('nueva-partida');
        if (botonNuevaPartida) {
            botonNuevaPartida.addEventListener('click', () => {
                const confirmacion = confirm('¿Estás seguro de que quieres iniciar una nueva partida? Se perderá el progreso actual.');
                
                if (confirmacion) {
                    this.iniciarNuevaPartida();
                }
            });
        } else {
            console.error('Botón nueva-partida no encontrado');
        }
    }

    configurarRendicion() {
        console.log('🔧 Configurando botón de rendición...');
        const botonRendirse = document.getElementById('rendirse');
        console.log('🔍 Botón de rendirse encontrado:', botonRendirse);
        
        if (botonRendirse) {
            console.log('✅ Agregando event listener al botón de rendirse');
            botonRendirse.addEventListener('click', () => {
                console.log('🖱️ Botón de rendirse clickeado!');
                console.log('📊 Estado actual del juego:', this.estadoJuego);
                
                if (this.estadoJuego !== 'en-curso') {
                    alert('La partida ya ha terminado');
                    return;
                }
                console.log('🔄 Mostrando modal de rendición...');
                this.mostrarModalRendicion();
            });
        } else {
            console.error('❌ No se encontró el botón con ID "rendirse"');
        }
    }

    configurarModales() {
        // Modal de confirmación de rendición
        const confirmSurrender = document.getElementById('confirm-surrender');
        const cancelSurrender = document.getElementById('cancel-surrender');
        
        if (confirmSurrender) {
            confirmSurrender.addEventListener('click', () => {
                this.confirmarRendicion();
            });
        }
        
        if (cancelSurrender) {
            cancelSurrender.addEventListener('click', () => {
                this.ocultarModal('surrender-modal');
            });
        }

        // Modal de fin de juego
        const newGameFromModal = document.getElementById('new-game-from-modal');
        const closeModal = document.getElementById('close-modal');
        
        if (newGameFromModal) {
            newGameFromModal.addEventListener('click', () => {
                this.iniciarNuevaPartida();
                this.ocultarModal('game-over-modal');
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.ocultarModal('game-over-modal');
            });
        }
    }

    mostrarModalRendicion() {
        console.log('🔄 Intentando mostrar modal de rendición...');
        const modal = document.getElementById('surrender-modal');
        console.log('🔍 Modal encontrado:', modal);
        
        if (modal) {
            console.log('✅ Agregando clase "show" al modal');
            modal.classList.add('show');
            console.log('📋 Clases actuales del modal:', modal.className);
        } else {
            console.error('❌ No se encontró el modal con ID "surrender-modal"');
        }
    }

    ocultarModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async confirmarRendicion() {
        try {
            console.log('Intentando rendirse. Jugador actual:', this.turnoActual);
            
            const response = await fetch('/api/rendirse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    jugador: this.turnoActual
                })
            });

            console.log('Respuesta HTTP status:', response.status);
            
            const data = await this.validarRespuestaAPI(response, 'rendición');

            if (data.success) {
                this.estadoJuego = data.estadoJuego;
                this.actualizarEstadoJuego();
                this.deshabilitarTablero();
                this.ocultarModal('surrender-modal');
                this.mostrarModalFinJuego(data.ganador, 'rendición');
            } else {
                alert(data.mensaje || 'Error al rendirse');
            }
        } catch (error) {
            this.manejarErrorAPI(error, 'rendición');
        }
    }

    mostrarModalFinJuego(ganador, motivo) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (modal && title && message) {
            title.textContent = '🏆 Fin del juego';
            
            let mensajeCompleto;
            if (motivo === 'rendición') {
                const perdedor = ganador === 'blancas' ? 'negras' : 'blancas';
                mensajeCompleto = `¡${ganador.charAt(0).toUpperCase() + ganador.slice(1)} ganan por rendición de ${perdedor}!`;
            } else {
                mensajeCompleto = `¡${ganador.charAt(0).toUpperCase() + ganador.slice(1)} ganan!`;
            }
            
            message.textContent = mensajeCompleto;
            modal.classList.add('show');

            // Guardar el resultado
            finalizarPartida(ganador, motivo);
        }
    }

    actualizarEstadoJuego() {
        const estadoElement = document.getElementById('estado-juego');
        const botonRendirse = document.getElementById('rendirse');
        
        if (estadoElement) {
            estadoElement.className = ''; // Limpiar clases
            
            switch (this.estadoJuego) {
                case 'en-curso':
                    estadoElement.textContent = 'Partida en curso';
                    estadoElement.classList.add('en-curso');
                    if (botonRendirse) botonRendirse.disabled = false;
                    break;
                case 'blancas-ganan':
                    estadoElement.textContent = '🏆 Blancas ganan';
                    estadoElement.classList.add('ganador');
                    if (botonRendirse) botonRendirse.disabled = true;
                    break;
                case 'negras-ganan':
                    estadoElement.textContent = '🏆 Negras ganan';
                    estadoElement.classList.add('ganador');
                    if (botonRendirse) botonRendirse.disabled = true;
                    break;
                default:
                    estadoElement.textContent = 'Partida terminada';
                    estadoElement.classList.add('terminado');
                    if (botonRendirse) botonRendirse.disabled = true;
            }
        }
    }

    deshabilitarTablero() {
        const tablero = document.querySelector('.tablero');
        if (tablero) {
            tablero.classList.add('disabled');
        }
    }

    habilitarTablero() {
        const tablero = document.querySelector('.tablero');
        if (tablero) {
            tablero.classList.remove('disabled');
        }
    }

    async sincronizarEstado() {
        try {
            let url = '/api/estado-juego';
            
            // Agregar gameId si existe
            if (window.gameId) {
                url += `?gameId=${window.gameId}`;
            }
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            const data = await this.validarRespuestaAPI(response, 'sincronización de estado');
            
            if (data.turnoActual) {
                this.actualizarTurno(data.turnoActual);
            }
            
            if (data.estadoJuego) {
                this.estadoJuego = data.estadoJuego;
                this.actualizarEstadoJuego();
                
                if (data.estadoJuego !== 'en-curso') {
                    this.deshabilitarTablero();
                }
            }
        } catch (error) {
            if (error.message.includes('401')) {
                console.warn('Sesión expirada durante sincronización de estado.');
                return;
            }
            this.manejarErrorAPI(error, 'sincronización de estado');
        }
    }

    async iniciarNuevaPartida() {
        const boton = document.getElementById('nueva-partida');
        try {
            if (boton) {
                boton.textContent = '⏳ Reiniciando...';
                boton.disabled = true;
            }

            const response = await fetch('/api/nueva-partida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            const data = await this.validarRespuestaAPI(response, 'nueva partida');
            
            if (data.success) {
                this.contadorMovimientos = 0;
                this.contadorMovimientosServidor = 0;
                this.piezasCapturadas = { blanca: [], negra: [] };
                this.estadoJuego = data.estadoJuego || 'en-curso';
                
                this.actualizarContador();
                this.actualizarTurno('blanca');
                this.actualizarEstadoJuego();
                this.habilitarTablero();
                
                // Reiniciar sincronización
                this.detenerSincronizacion();
                this.iniciarSincronizacion();
                
                // Limpiar bandejas de capturas
                const bandejas = ['white-captured-pieces', 'black-captured-pieces'];
                bandejas.forEach(id => {
                    const bandeja = document.getElementById(id);
                    if (bandeja) {
                        bandeja.innerHTML = '';
                        bandeja.classList.remove('has-pieces');
                    }
                });
                
                // Reinicializar el tablero sin recargar la página
                this.crearTableroVacio();
                this.configurarDragAndDrop();
                
                console.log('✅ Nueva partida iniciada exitosamente');
            }
        } catch (error) {
            this.manejarErrorAPI(error, 'nueva partida');
        } finally {
            if (boton) {
                boton.textContent = '🔄 Nueva Partida';
                boton.disabled = false;
            }
        }
    }
    actualizarTurno(turno) {
        const turnoAnterior = this.turnoActual;
        this.turnoActual = turno;
        const turnoDisplay = document.getElementById('turno-display');
        
        if (!turnoDisplay) {
            console.log('Elemento turno-display no encontrado, saltando actualización');
            return;
        }

        const esMiTurno = turno === this.jugadorColor;
        const colorTexto = turno === 'blanca' ? 'Blancas' : 'Negras';
        
        if (esMiTurno) {
            turnoDisplay.innerHTML = `
                <div class="turno-info mi-turno">
                    <div class="turno-texto">
                        <span class="turno-label">🎯 ES TU TURNO</span>
                        <span class="turno-color">Juegas con ${colorTexto}</span>
                    </div>
                    <div class="turno-indicator pulse"></div>
                </div>
            `;
            turnoDisplay.className = 'turno-display mi-turno';
            
            // Mostrar notificación solo si cambió el turno
            if (turnoAnterior && turnoAnterior !== turno) {
                this.mostrarNotificacionTurno('¡Es tu turno!', 'success');
            }
        } else {
            turnoDisplay.innerHTML = `
                <div class="turno-info esperar-turno">
                    <div class="turno-texto">
                        <span class="turno-label">⏳ Esperando turno</span>
                        <span class="turno-color">Turno de ${colorTexto}</span>
                    </div>
                    <div class="turno-indicator waiting"></div>
                </div>
            `;
            turnoDisplay.className = 'turno-display esperar-turno';
            
            // Mostrar notificación solo si cambió el turno
            if (turnoAnterior && turnoAnterior !== turno) {
                this.mostrarNotificacionTurno('Turno del oponente', 'info');
            }
        }
        
        console.log(`Turno actualizado: ${turno}, Es mi turno: ${esMiTurno}`);
        this.actualizarBloqueoTablero();

        // Reconfigurar drag and drop tras cada cambio de turno
        this.configurarDragAndDrop();
    }

    mostrarNotificacionTurno(mensaje, tipo = 'info') {
        // Remover notificaciones existentes
        const notificacionExistente = document.querySelector('.turno-notification');
        if (notificacionExistente) {
            notificacionExistente.remove();
        }

        // Crear nueva notificación
        const notificacion = document.createElement('div');
        notificacion.className = `turno-notification ${tipo}`;
        notificacion.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${tipo === 'success' ? '🎯' : '⏳'}</span>
                <span class="notification-text">${mensaje}</span>
            </div>
        `;

        // Agregar al DOM
        document.body.appendChild(notificacion);

        // Mostrar con animación
        setTimeout(() => {
            notificacion.classList.add('show');
        }, 100);

        // Ocultar después de 3 segundos
        setTimeout(() => {
            notificacion.classList.remove('show');
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.remove();
                }
            }, 300);
        }, 3000);
    }

    actualizarContador() {
        const contadorElement = document.getElementById('contador-movimientos');
        if (contadorElement) {
            contadorElement.textContent = this.contadorMovimientos;
            console.log('Contador actualizado a:', this.contadorMovimientos);
        } else {
            console.log('Elemento contador-movimientos no encontrado, saltando actualización');
        }
    }
    actualizarBloqueoTablero() {
        const tablero = document.querySelector('.tablero');
        const esMiTurno = this.turnoActual === this.jugadorColor;
        const juegoEnCurso = this.estadoJuego === 'en-curso';
        
        if (!tablero) return;
        
        // Actualizar overlay de bloqueo
        let overlay = document.getElementById('tablero-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tablero-overlay';
            overlay.className = 'tablero-overlay';
            tablero.parentNode.insertBefore(overlay, tablero.nextSibling);
        }
        
        if (!esMiTurno || !juegoEnCurso) {
            // Solo mostrar overlay visual, NO bloquear el tablero físicamente
            // Mostrar overlay con mensaje y MÁS TRANSPARENCIA
            if (!esMiTurno && juegoEnCurso) {
                overlay.innerHTML = `
                    <div class="overlay-content">
                        <div class="overlay-icon">⏳</div>
                        <div class="overlay-text">Esperando al otro jugador</div>
                        <div class="overlay-subtext">No es tu turno</div>
                    </div>
                `;
                overlay.className = 'tablero-overlay waiting-turn show';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                overlay.style.backdropFilter = 'blur(4px)';
            } else if (!juegoEnCurso) {
                overlay.innerHTML = `
                    <div class="overlay-content">
                        <div class="overlay-icon">🎮</div>
                        <div class="overlay-text">Juego terminado</div>
                        <div class="overlay-subtext">Inicia una nueva partida</div>
                    </div>
                `;
                overlay.className = 'tablero-overlay game-ended show';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                overlay.style.backdropFilter = 'blur(4px)';
            }
        } else {
            // Habilitar tablero - remover overlay
            overlay.className = 'tablero-overlay';
            overlay.style.backgroundColor = '';
            overlay.style.backdropFilter = '';
        }
        
        console.log(`Tablero ${esMiTurno && juegoEnCurso ? 'habilitado' : 'bloqueado'} - Es mi turno: ${esMiTurno}, Juego en curso: ${juegoEnCurso}`);
    }
    configurarDragAndDrop() {
        console.log('🔧 Configurando drag and drop...');
        console.log('🎨 Mi color:', this.jugadorColor);
        console.log('🎮 Turno actual:', this.turnoActual);
        console.log('🎯 Estado del juego:', this.estadoJuego);
        
        // Eliminar listeners previos clonando nodos
        document.querySelectorAll('.pieza').forEach(pieza => {
            const nuevaPieza = pieza.cloneNode(true);
            pieza.parentNode.replaceChild(nuevaPieza, pieza);
        });
        document.querySelectorAll('.casilla').forEach(casilla => {
            const nuevaCasilla = casilla.cloneNode(true);
            casilla.parentNode.replaceChild(nuevaCasilla, casilla);
        });

        // Reagregar listeners a piezas
        document.querySelectorAll(".pieza").forEach(pieza => {
            pieza.addEventListener("dragstart", (e) => {
                const colorPieza = pieza.getAttribute('data-color');
                console.log('🖱️ Intentando arrastrar pieza:');
                console.log('  - Color pieza:', colorPieza);
                console.log('  - Mi color:', this.jugadorColor);
                console.log('  - Turno actual:', this.turnoActual);
                console.log('  - Estado juego:', this.estadoJuego);
                console.log('  - Puede mover:', this.estadoJuego === 'en-curso' && this.turnoActual === this.jugadorColor && colorPieza === this.jugadorColor);
                if (this.estadoJuego !== 'en-curso') {
                    console.log('❌ Juego no está en curso');
                    e.preventDefault();
                    this.piezaArrastrada = null;
                    return false;
                }
                if (this.turnoActual !== this.jugadorColor) {
                    console.log('❌ No es mi turno. Mi color:', this.jugadorColor, 'Turno actual:', this.turnoActual);
                    e.preventDefault();
                    this.piezaArrastrada = null;
                    return false;
                }
                if (colorPieza !== this.jugadorColor) {
                    console.log('❌ Intentando mover pieza del color incorrecto. Pieza:', colorPieza, 'Mi color:', this.jugadorColor);
                    e.preventDefault();
                    this.piezaArrastrada = null;
                    return false;
                }
                console.log('✅ Pieza válida para arrastrar');
                this.piezaArrastrada = pieza;
                const casillaPadre = pieza.parentElement;
                this.posicionInicial = casillaPadre.getAttribute('data-pos');
                setTimeout(() => pieza.style.display = "none", 0);
            });
            pieza.addEventListener("dragend", (e) => {
                pieza.style.display = "";
            });
        });

        // Reagregar listeners a casillas
        document.querySelectorAll(".casilla").forEach(casilla => {
            casilla.addEventListener("dragover", (e) => {
                e.preventDefault();
            });
            casilla.addEventListener("drop", (e) => {
                e.preventDefault();
                if (this.piezaArrastrada) {
                    this.manejarMovimiento(casilla);
                }
            });
        });

        this.actualizarBloqueoTablero();
        console.log('✅ Drag and drop configurado completamente');
    }

    async manejarMovimiento(casilla) {
        // Verificar que el juego esté en curso
        if (this.estadoJuego !== 'en-curso') {
            this.piezaArrastrada = null;
            return;
        }

        // Verificar que sea el turno del jugador antes de permitir mover
        if (this.turnoActual !== this.jugadorColor) {
            alert('No es tu turno. Espera a que el oponente juegue.');
            this.piezaArrastrada = null;
            return;
        }

        const posicionFinal = casilla.getAttribute('data-pos');
        const piezaArrastrada = this.piezaArrastrada;
        const tipoPieza = piezaArrastrada ? piezaArrastrada.getAttribute('data-tipo') : null;
        const colorPieza = piezaArrastrada ? piezaArrastrada.getAttribute('data-color') : null;
        const posicionInicial = this.posicionInicial;

        // Validación estricta de datos
        if (!piezaArrastrada || !tipoPieza || !colorPieza || !posicionInicial || !posicionFinal) {
            alert('Error interno: datos de movimiento incompletos. Intenta recargar la página.');
            this.piezaArrastrada = null;
            return;
        }

        // Normalizar color a lo que espera el backend ('blanca' o 'negra')
        let color = colorPieza;
        if (color === 'blancas') color = 'blanca';
        if (color === 'negras') color = 'negra';

        // Normalizar tipo de pieza si es necesario
        let pieza = tipoPieza;
        if (pieza === 'pawn') pieza = 'peon';
        if (pieza === 'knight') pieza = 'caballo';
        if (pieza === 'bishop') pieza = 'alfil';
        if (pieza === 'rook') pieza = 'torre';
        if (pieza === 'queen') pieza = 'reina';
        if (pieza === 'king') pieza = 'rey';

        // Solo incluir gameId si existe y es válido
        const movimientoData = {
            pieza,
            color,
            inicial: posicionInicial,
            final: posicionFinal
        };
        if (window.gameId) {
            movimientoData.gameId = window.gameId;
        }

        try {
            const response = await fetch('/api/validar-movimiento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(movimientoData)
            });

            const data = await this.validarRespuestaAPI(response, 'validación de movimiento');

            if (data.valido) {
                // Si hay una pieza capturada, agregarla a la bandeja
                const piezaCapturada = casilla.querySelector('.pieza');
                if (piezaCapturada) {
                    this.capturarPieza(piezaCapturada);
                }

                // Mover la pieza si el movimiento es válido
                casilla.innerHTML = "";
                casilla.appendChild(this.piezaArrastrada);

                // Actualizar el turno local con el turno del servidor
                if (data.nuevoTurno) {
                    this.actualizarTurno(data.nuevoTurno);
                }

                // Refuerza la sincronización del turno desde el backend
                await this.sincronizarTurno();

                // Actualizar contadores
                this.contadorMovimientos++;
                if (data.contadorMovimientos) {
                    this.contadorMovimientosServidor = data.contadorMovimientos;
                }

                this.actualizarContador();
            } else {
                // Si el movimiento es inválido por turno, sincronizar con el servidor
                if (data.mensaje && data.mensaje.includes('No es tu turno')) {
                    await this.sincronizarTurno();
                }
            }
        } catch (error) {
            this.manejarErrorAPI(error, 'validación de movimiento');
        } finally {
            this.piezaArrastrada = null;
        }
    }

    capturarPieza(pieza) {
        const colorCapturado = pieza.getAttribute('data-color');
        const tipoPieza = pieza.dataset.tipo;
        const colorCapturador = colorCapturado === 'blanca' ? 'negra' : 'blanca';

        // Agregar a la lista de piezas capturadas
        this.piezasCapturadas[colorCapturador].push({
            tipo: tipoPieza,
            color: colorCapturado,
            svg: pieza.innerHTML
        });

        // Crear elemento para la bandeja
        this.agregarPiezaABandeja(tipoPieza, colorCapturado, pieza.innerHTML, colorCapturador);
        
        // Actualizar contadores y ventaja material
        this.actualizarEstadisticasCaptura();
    }

    agregarPiezaABandeja(tipoPieza, colorPieza, svgContent, colorCapturador) {
        const bandejaId = colorCapturador === 'blanca' ? 'white-captured-pieces' : 'black-captured-pieces';
        const bandeja = document.getElementById(bandejaId);

        if (bandeja) {
            // Crear elemento de pieza capturada
            const piezaCapturada = document.createElement('div');
            piezaCapturada.className = 'captured_piece new-capture';
            piezaCapturada.innerHTML = `
                ${svgContent}
                <div class="piece-value-indicator">${this.valoresPiezas[tipoPieza]}</div>
            `;

            // Agregar con animación
            bandeja.appendChild(piezaCapturada);
            bandeja.classList.add('has-pieces');

            // Efecto de destello
            setTimeout(() => {
                piezaCapturada.classList.add('glow-effect');
            }, 100);

            // Limpiar clases de animación
            setTimeout(() => {
                piezaCapturada.classList.remove('new-capture', 'glow-effect');
            }, 1500);

            // Agregar tooltip con información
            this.agregarTooltipPieza(piezaCapturada, tipoPieza, colorPieza);
        }
    }

    agregarTooltipPieza(elemento, tipo, color) {
        elemento.title = `${color === 'blanca' ? 'Blanca' : 'Negra'} ${this.nombresPiezas[tipo]} (Valor: ${this.valoresPiezas[tipo]})`;
    }

    actualizarEstadisticasCaptura() {
        // Actualizar contadores
        const whiteCount = document.getElementById('white-captures-count');
        const blackCount = document.getElementById('black-captures-count');
        
        if (whiteCount) whiteCount.textContent = this.piezasCapturadas.blanca.length;
        if (blackCount) blackCount.textContent = this.piezasCapturadas.negra.length;

        // Calcular ventaja material
        const ventajaBlanca = this.calcularVentajaMaterial('blanca');
        const ventajaNegra = this.calcularVentajaMaterial('negra');

        this.actualizarVentajaMaterial('white', ventajaBlanca);
        this.actualizarVentajaMaterial('black', ventajaNegra);
    }

    calcularVentajaMaterial(color) {
        return this.piezasCapturadas[color].reduce((total, pieza) => {
            return total + this.valoresPiezas[pieza.tipo];
        }, 0);
    }

    actualizarVentajaMaterial(color, ventaja) {
        const ventajaElement = document.getElementById(`${color}-advantage-value`);
        if (ventajaElement) {
            const ventajaOpuesta = color === 'white' ? 
                this.calcularVentajaMaterial('negra') : 
                this.calcularVentajaMaterial('blanca');
            
            const diferencia = ventaja - ventajaOpuesta;
            
            ventajaElement.textContent = diferencia > 0 ? `+${diferencia}` : 
                                       diferencia < 0 ? `${diferencia}` : '0';
            
            // Aplicar clases de color
            ventajaElement.className = 'advantage-value';
            if (diferencia > 0) {
                ventajaElement.classList.add('advantage-positive');
            } else if (diferencia < 0) {
                ventajaElement.classList.add('advantage-negative');
            }
        }
    }

    // === MÉTODOS DE SINCRONIZACIÓN EN TIEMPO REAL ===
    
    iniciarSincronizacion() {
        // Verificar movimientos nuevos cada 2 segundos
        this.intervaloSincronizacion = setInterval(() => {
            // Solo verificar si no estamos moviendo actualmente
            if (!this.piezaArrastrada) {
                this.verificarMovimientosNuevos();
            }
        }, 2000);
        
        console.log('✅ Sincronización en tiempo real iniciada');
    }

    detenerSincronizacion() {
        if (this.intervaloSincronizacion) {
            clearInterval(this.intervaloSincronizacion);
            this.intervaloSincronizacion = null;
            console.log('🛑 Sincronización detenida');
        }
    }

    async verificarMovimientosNuevos() {
        try {
            this.mostrarIndicadorSinc('syncing', '🔄 Verificando...');
            
            const response = await fetch(`/api/ultimo-movimiento/${this.contadorMovimientosServidor}`, {
                credentials: 'include'
            });
            
            const data = await this.validarRespuestaAPI(response, 'verificación de movimientos nuevos');
            
            if (data.hayNuevoMovimiento && data.movimiento) {
                console.log('🔄 Nuevo movimiento detectado:', data.movimiento);
                this.mostrarIndicadorSinc('success', '📥 Movimiento recibido');
                await this.aplicarMovimientoRemoto(data.movimiento);
                this.contadorMovimientosServidor = data.contadorMovimientos;
            } else {
                this.mostrarIndicadorSinc('success', '✅ Sincronizado');
            }

            // Actualizar estado del juego
            if (data.turnoActual !== this.turnoActual) {
                this.actualizarTurno(data.turnoActual);
            }

            if (data.estadoJuego !== this.estadoJuego) {
                this.estadoJuego = data.estadoJuego;
                this.actualizarEstadoJuego();
            }

        } catch (error) {
            if (error.message.includes('401')) {
                this.mostrarIndicadorSinc('error', '🔒 Sesión expirada');
                this.detenerSincronizacion();
                console.warn('Sesión expirada. Por favor, inicia sesión manualmente.');
                return;
            }
            
            this.mostrarIndicadorSinc('error', '❌ Error de conexión');
            console.error('Error al verificar movimientos nuevos:', error);
        }
    }

    async aplicarMovimientoRemoto(movimiento) {
        const { pieza, color, inicial, final } = movimiento;
        
        console.log(`🎮 Aplicando movimiento remoto: ${pieza} ${color} de ${inicial} a ${final}`);

        // Buscar la pieza en la posición inicial
        const casillaInicial = document.querySelector(`[data-pos="${inicial}"]`);
        const casillaFinal = document.querySelector(`[data-pos="${final}"]`);
        
        if (!casillaInicial || !casillaFinal) {
            console.error('No se encontraron las casillas para el movimiento remoto');
            this.mostrarIndicadorSinc('error', '❌ Error aplicando movimiento');
            return;
        }

        const piezaElement = casillaInicial.querySelector('.pieza');
        if (!piezaElement) {
            console.error('No se encontró la pieza en la casilla inicial');
            this.mostrarIndicadorSinc('error', '❌ Pieza no encontrada');
            return;
        }

        // Verificar si hay captura
        const piezaCapturada = casillaFinal.querySelector('.pieza');
        if (piezaCapturada) {
            this.capturarPieza(piezaCapturada);
            console.log('💥 Pieza capturada remotamente');
            this.mostrarIndicadorSinc('success', '💥 Captura del oponente');
        }

        // Mover la pieza
        casillaFinal.innerHTML = '';
        casillaFinal.appendChild(piezaElement);
        
        // Agregar efecto visual para indicar movimiento remoto
        this.resaltarMovimientoRemoto(casillaInicial, casillaFinal);
        
        // Actualizar contador local
        this.contadorMovimientos++;
        this.actualizarContador();
        
        console.log('✅ Movimiento remoto aplicado exitosamente');
        this.mostrarIndicadorSinc('success', '🎯 Turno del oponente');
    }

    resaltarMovimientoRemoto(casillaInicial, casillaFinal) {
        // Efecto visual para mostrar el movimiento del oponente
        const efectoInicial = document.createElement('div');
        efectoInicial.className = 'efecto-movimiento-inicial';
        casillaInicial.appendChild(efectoInicial);

        const efectoFinal = document.createElement('div');
        efectoFinal.className = 'efecto-movimiento-final';
        casillaFinal.appendChild(efectoFinal);

        // Remover efectos después de 2 segundos
        setTimeout(() => {
            if (efectoInicial.parentNode) efectoInicial.remove();
            if (efectoFinal.parentNode) efectoFinal.remove();
        }, 2000);
    }

    mostrarIndicadorSinc(tipo, mensaje) {
        const indicador = document.getElementById('sync-indicator');
        if (indicador) {
            indicador.textContent = mensaje;
            indicador.className = `sync-indicator ${tipo}`;
            
            // Ocultar después de 3 segundos si no es 'syncing'
            if (tipo !== 'syncing') {
                setTimeout(() => {
                    indicador.textContent = '🔄 Sincronizado';
                    indicador.className = 'sync-indicator';
                }, 3000);
            }
        }
    }

    get nombresPiezas() {
        return {
            peon: 'Peón',
            caballo: 'Caballo',
            alfil: 'Alfil',
            torre: 'Torre',
            reina: 'Reina',
            rey: 'Rey'
        };
    }

    // Crear tablero vacío y reinicializar piezas
    crearTableroVacio() {
        // Limpiar todas las casillas
        const casillas = document.querySelectorAll('.casilla');
        casillas.forEach(casilla => {
            const pieza = casilla.querySelector('.pieza');
            if (pieza) {
                pieza.remove();
            }
        });
        
        // Recrear las piezas en posición inicial
        this.colocarPiezasIniciales();
    }
    
    // Colocar piezas en posición inicial
    colocarPiezasIniciales() {
        const piezasIniciales = {
            // Piezas negras
            'a8': { tipo: 'torre', color: 'negra' },
            'b8': { tipo: 'caballo', color: 'negra' },
            'c8': { tipo: 'alfil', color: 'negra' },
            'd8': { tipo: 'reina', color: 'negra' },
            'e8': { tipo: 'rey', color: 'negra' },
            'f8': { tipo: 'alfil', color: 'negra' },
            'g8': { tipo: 'caballo', color: 'negra' },
            'h8': { tipo: 'torre', color: 'negra' },
            // Peones negros
            'a7': { tipo: 'peon', color: 'negra' },
            'b7': { tipo: 'peon', color: 'negra' },
            'c7': { tipo: 'peon', color: 'negra' },
            'd7': { tipo: 'peon', color: 'negra' },
            'e7': { tipo: 'peon', color: 'negra' },
            'f7': { tipo: 'peon', color: 'negra' },
            'g7': { tipo: 'peon', color: 'negra' },
            'h7': { tipo: 'peon', color: 'negra' },
            // Piezas blancas
            'a1': { tipo: 'torre', color: 'blanca' },
            'b1': { tipo: 'caballo', color: 'blanca' },
            'c1': { tipo: 'alfil', color: 'blanca' },
            'd1': { tipo: 'reina', color: 'blanca' },
            'e1': { tipo: 'rey', color: 'blanca' },
            'f1': { tipo: 'alfil', color: 'blanca' },
            'g1': { tipo: 'caballo', color: 'blanca' },
            'h1': { tipo: 'torre', color: 'blanca' },
            // Peones blancos
            'a2': { tipo: 'peon', color: 'blanca' },
            'b2': { tipo: 'peon', color: 'blanca' },
            'c2': { tipo: 'peon', color: 'blanca' },
            'd2': { tipo: 'peon', color: 'blanca' },
            'e2': { tipo: 'peon', color: 'blanca' },
            'f2': { tipo: 'peon', color: 'blanca' },
            'g2': { tipo: 'peon', color: 'blanca' },
            'h2': { tipo: 'peon', color: 'blanca' }
        };
        
        // Colocar cada pieza en su casilla
        Object.entries(piezasIniciales).forEach(([posicion, pieza]) => {
            const casilla = document.querySelector(`.casilla[data-pos="${posicion}"]`);
            if (casilla) {
                const elementoPieza = document.createElement('span');
                elementoPieza.className = `pieza ${pieza.color}`;
                elementoPieza.draggable = true;
                elementoPieza.setAttribute('data-tipo', pieza.tipo);
                elementoPieza.setAttribute('data-color', pieza.color);
                
                // Agregar el símbolo de la pieza (esto depende de cómo manejes los símbolos)
                const simbolos = {
                    'rey': { 'blanca': '♔', 'negra': '♚' },
                    'reina': { 'blanca': '♕', 'negra': '♛' },
                    'torre': { 'blanca': '♖', 'negra': '♜' },
                    'alfil': { 'blanca': '♗', 'negra': '♝' },
                    'caballo': { 'blanca': '♘', 'negra': '♞' },
                    'peon': { 'blanca': '♙', 'negra': '♟' }
                };
                
                elementoPieza.textContent = simbolos[pieza.tipo][pieza.color];
                casilla.appendChild(elementoPieza);
            }
        });
    }

    // Añadir estilos CSS dinámicos para el overlay
    añadirEstilosOverlay() {
        const style = document.createElement('style');
        style.id = 'tablero-overlay-styles';
        
        // Solo añadir si no existe ya
        if (!document.getElementById('tablero-overlay-styles')) {
            style.textContent = `
                .tablero-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.1);
                    display: none;
                    z-index: 10;
                    transition: all 0.3s ease;
                }
                
                .tablero-overlay.show {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .tablero-overlay.waiting-turn {
                    background-color: rgba(0, 0, 0, 0.8) !important;
                    backdrop-filter: blur(4px);
                }
                
                .tablero-overlay.game-ended {
                    background-color: rgba(0, 0, 0, 0.8) !important;
                    backdrop-filter: blur(4px);
                }
                
                .overlay-content {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 2rem;
                    border-radius: 15px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    border: 2px solid #ddd;
                    max-width: 300px;
                }
                
                .overlay-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .overlay-text {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                
                .overlay-subtext {
                    font-size: 1rem;
                    color: #666;
                }
                
                .tablero.disabled {
                    opacity: 0.7;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

async function finalizarPartida(ganador) {
    const tablero = window.tablero;
    
    try {
        const response = await fetch('/api/game/finish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                ganador: ganador === 'blancas' ? 'blanca' : 'negra',
                estadoJuego: ganador === 'empate' ? 'empate' : `${ganador}-ganan`
            })
        });

        let data;
        if (tablero && typeof tablero.validarRespuestaAPI === 'function') {
            data = await tablero.validarRespuestaAPI(response, 'finalización de partida');
        } else {
            // Fallback para cuando tablero no está disponible
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('401: Sesión expirada');
                }
                throw new Error('Error al guardar resultado');
            }
            data = await response.json();
        }

        if (data.success) {
            // Redirigir al perfil después de guardar
            window.location.href = '/profile';
        }
    } catch (error) {
        if (tablero && typeof tablero.manejarErrorAPI === 'function') {
            tablero.manejarErrorAPI(error, 'finalización de partida');
        } else {
            // Fallback para cuando tablero no está disponible
            console.error('Error:', error);
            if (error.message.includes('JSON.parse') || error.message.includes('JSON válido')) {
                alert('Error de comunicación con el servidor. Por favor, verifica tu sesión.');
            } else if (error.message.includes('401')) {
                alert('Tu sesión ha expirado. Ve a la página de login para continuar.');
            } else {
                alert('Error al guardar el resultado de la partida');
            }
        }
    }
}

// Inicializar cuando el DOM esté listo, pero solo en páginas con tablero
document.addEventListener("DOMContentLoaded", function () {
    // Verificar si estamos en una página que tiene tablero
    const tablero = document.querySelector('.tablero');
    if (!tablero) {
        console.log('📍 No hay tablero en esta página, saltando inicialización de TableroAjedrez');
        return;
    }
    
    console.log('🚀 DOM listo - Creando instancia de TableroAjedrez...');
    window.tablero = new TableroAjedrez();
    console.log('✅ Instancia creada y asignada a window.tablero');
});

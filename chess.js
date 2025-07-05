// chess.js - Lógica de movimientos del ajedrez

/**
 * Convierte una posición de ajedrez (ej: 'a1') a coordenadas numéricas
 */
function posicionACoord(posicion) {
    const letra = posicion.charAt(0);
    const numero = parseInt(posicion.charAt(1));
    const x = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = 8 - numero; // Invertir para que a1 = (0,7) y h8 = (7,0)
    return { x, y };
}

/**
 * Convierte coordenadas numéricas a posición de ajedrez
 */
function coordAPosicion(x, y) {
    const letra = String.fromCharCode('a'.charCodeAt(0) + x);
    const numero = 8 - y; // Convertir de vuelta al sistema de ajedrez
    return letra + numero;
}

/**
 * Verifica si una posición está dentro del tablero
 */
function posicionValida(x, y) {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

/**
 * Movimientos válidos para el caballo
 */
function movimientosCaballo(x, y) {
    const movimientos = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    
    const posicionesValidas = [];
    
    for (const [dx, dy] of movimientos) {
        const nuevaX = x + dx;
        const nuevaY = y + dy;
        
        if (posicionValida(nuevaX, nuevaY)) {
            posicionesValidas.push(coordAPosicion(nuevaX, nuevaY));
        }
    }
    
    return posicionesValidas;
}

/**
 * Movimientos válidos para el alfil
 */
function movimientosAlfil(x, y) {
    const posicionesValidas = [];
    const direcciones = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    for (const [dx, dy] of direcciones) {
        for (let i = 1; i < 8; i++) {
            const nuevaX = x + (dx * i);
            const nuevaY = y + (dy * i);
            
            if (posicionValida(nuevaX, nuevaY)) {
                posicionesValidas.push(coordAPosicion(nuevaX, nuevaY));
            } else {
                break;
            }
        }
    }
    
    return posicionesValidas;
}

/**
 * Movimientos válidos para la torre
 */
function movimientosTorre(x, y) {
    const posicionesValidas = [];
    const direcciones = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    
    for (const [dx, dy] of direcciones) {
        for (let i = 1; i < 8; i++) {
            const nuevaX = x + (dx * i);
            const nuevaY = y + (dy * i);
            
            if (posicionValida(nuevaX, nuevaY)) {
                posicionesValidas.push(coordAPosicion(nuevaX, nuevaY));
            } else {
                break;
            }
        }
    }
    
    return posicionesValidas;
}

/**
 * Movimientos válidos para la reina (combinación de torre y alfil)
 */
function movimientosReina(x, y) {
    return [...movimientosTorre(x, y), ...movimientosAlfil(x, y)];
}

/**
 * Movimientos válidos para el rey
 */
function movimientosRey(x, y) {
    const posicionesValidas = [];
    const direcciones = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    
    for (const [dx, dy] of direcciones) {
        const nuevaX = x + dx;
        const nuevaY = y + dy;
        
        if (posicionValida(nuevaX, nuevaY)) {
            posicionesValidas.push(coordAPosicion(nuevaX, nuevaY));
        }
    }
    
    return posicionesValidas;
}

/**
 * Movimientos válidos para el peón
 */
function movimientosPeon(x, y, color) {
    const posicionesValidas = [];
    const direccion = color === 'blanca' ? -1 : 1; // Blancas van hacia arriba (y menor), negras hacia abajo (y mayor)
    const filaInicial = color === 'blanca' ? 6 : 1; // Fila inicial para cada color
    
    // Movimiento hacia adelante (1 casilla)
    const nuevaY = y + direccion;
    if (posicionValida(x, nuevaY)) {
        posicionesValidas.push(coordAPosicion(x, nuevaY));
        
        // Movimiento inicial (2 casillas) - solo si la primera casilla está libre
        if (y === filaInicial) {
            const nuevaY2 = y + (direccion * 2);
            if (posicionValida(x, nuevaY2)) {
                posicionesValidas.push(coordAPosicion(x, nuevaY2));
            }
        }
    }
    
    // Capturas diagonales
    const capturas = [
        [x - 1, y + direccion],
        [x + 1, y + direccion]
    ];
    
    for (const [capturaX, capturaY] of capturas) {
        if (posicionValida(capturaX, capturaY)) {
            posicionesValidas.push(coordAPosicion(capturaX, capturaY));
        }
    }
    
    return posicionesValidas;
}

module.exports = {
    movimientosCaballo,
    movimientosAlfil,
    movimientosTorre,
    movimientosReina,
    movimientosRey,
    movimientosPeon,
    posicionACoord,
    coordAPosicion,
    posicionValida
};

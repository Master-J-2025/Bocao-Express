/* ============================================
   ACTUALIZACIÓN EN TIEMPO REAL - BOCAO EXPRESS
   ============================================ */

/**
 * Sistema de actualización en tiempo real para cocina y caja
 * Usa polling para actualizar sin recargar la página
 */

class ActualizadorTiempoReal {
    constructor(opciones = {}) {
        this.intervalo = opciones.intervalo || 5000; // 5 segundos
        this.url = opciones.url || '/bocao_express/api/obtener_pedidos.php';
        this.contenedor = opciones.contenedor || '.cocina-grid';
        this.activo = false;
        this.sonido = opciones.sonido !== false;
    }
    
    /**
     * Inicia la actualización automática
     */
    iniciar() {
        if (this.activo) return;
        
        this.activo = true;
        console.log('Actualizador iniciado - Intervalo:', this.intervalo + 'ms');
        
        // Primera actualización inmediata
        this.actualizar();
        
        // Actualización periódica
        this.id_intervalo = setInterval(() => this.actualizar(), this.intervalo);
    }
    
    /**
     * Detiene la actualización automática
     */
    detener() {
        if (!this.activo) return;
        
        this.activo = false;
        clearInterval(this.id_intervalo);
        console.log('Actualizador detenido');
    }
    
    /**
     * Realiza una actualización
     */
    async actualizar() {
        try {
            const respuesta = await fetch(this.url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!respuesta.ok) throw new Error('Error en la solicitud');
            
            const datos = await respuesta.json();
            this.procesarDatos(datos);
            
        } catch (error) {
            console.error('Error en actualización:', error);
        }
    }
    
    /**
     * Procesa los datos recibidos y actualiza el DOM
     */
    procesarDatos(datos) {
        const contenedor = document.querySelector(this.contenedor);
        if (!contenedor) return;
        
        // Verificar si hay nuevos pedidos (para sonido)
        const pedidosAntes = contenedor.querySelectorAll('.pedido-card').length;
        const pedidosAhora = datos.pedidos?.length || 0;
        
        if (pedidosAhora > pedidosAntes && this.sonido) {
            this.reproducirSonido();
        }
        
        // Actualizar contenido
        contenedor.innerHTML = datos.html || '';
    }
    
    /**
     * Reproduce un sonido de notificación
     */
    reproducirSonido() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscilador = audioContext.createOscillator();
            const ganancia = audioContext.createGain();
            
            oscilador.connect(ganancia);
            ganancia.connect(audioContext.destination);
            
            oscilador.frequency.value = 800;
            oscilador.type = 'sine';
            
            ganancia.gain.setValueAtTime(0.3, audioContext.currentTime);
            ganancia.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscilador.start(audioContext.currentTime);
            oscilador.stop(audioContext.currentTime + 0.5);
        } catch(e) {
            console.warn('No se pudo reproducir sonido:', e);
        }
    }
}

/**
 * Actualizar estado de pedido sin recargar
 */
async function cambiarEstadoPedidoAjax(evento, id, nuevoEstado) {
    evento.preventDefault();
    
    try {
        const formData = new FormData();
        formData.append('action', 'cambiar_estado');
        formData.append('id', id);
        formData.append('nuevo_estado', nuevoEstado);
        
        const respuesta = await fetch('/bocao_express/api/pedidos_api.php', {
            method: 'POST',
            body: formData
        });
        
        if (respuesta.ok) {
            // Mostrar notificación
            mostrarNotificacion('✓ Estado actualizado', 'success');
            
            // Actualizar elemento en la página (opcional)
            const elemento = document.querySelector(`[data-pedido-id="${id}"]`);
            if (elemento) {
                elemento.classList.add('actualizado');
                setTimeout(() => elemento.classList.remove('actualizado'), 500);
            }
        }
    } catch(error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al actualizar estado', 'error');
    }
}

/**
 * Mostrar notificación temporal
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${tipo === 'success' ? '#28A745' : tipo === 'error' ? '#DC3545' : '#17A2B8'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

/**
 * Inicializar cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', function() {
    // Detectar si estamos en la página de cocina
    if (document.querySelector('.cocina-grid')) {
        const actualizador = new ActualizadorTiempoReal({
            intervalo: 5000, // Actualizar cada 5 segundos
            url: '/bocao_express/api/obtener_pedidos.php?tipo=cocina',
            contenedor: '.cocina-grid',
            sonido: true
        });
        
        // Exponer globalmente para controlar desde consola
        window.actualizador = actualizador;
        
        // Iniciar actualización
        actualizador.iniciar();
    }
    
    // Agregar estilos de animación
    if (!document.querySelector('style[data-actualizado]')) {
        const style = document.createElement('style');
        style.setAttribute('data-actualizado', 'true');
        style.innerHTML = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            
            .pedido-card.actualizado {
                animation: pulse 0.5s ease;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    }
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActualizadorTiempoReal;
}

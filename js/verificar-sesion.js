document.addEventListener('DOMContentLoaded', function() {
    const sesionActiva = localStorage.getItem('sesionActivaCliente');
    
    // Si NO hay sesión → va directo a login, sin mostrar nada
    if (sesionActiva !== 'true') {
        const paginaActual = encodeURIComponent(window.location.href);
        window.location.href = 'login.html?destino=' + paginaActual;
    }
});
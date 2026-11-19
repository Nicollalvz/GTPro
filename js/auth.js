// ========================================================
// RINES Y LLANTAS GT PRO — CONTROLADOR DE AUTENTICACIÓN
// ========================================================

document.addEventListener('DOMContentLoaded', async function () {
    const pagina = window.location.pathname;
    const parametros = new URLSearchParams(window.location.search);
    const destino = parametros.get('destino');

    // 1. Verificar sesión activa con el servidor
    try {
        const res = await fetch('api/auth.php?accion=sesion');
        const data = await res.json();

        if (data.exito && data.usuario) {
            const u = data.usuario;
            if (u.rol === 'admin') {
                localStorage.setItem('sesionActiva', 'true');
                localStorage.setItem('nombreCompleto', u.nombre || 'Administrador');
                if (pagina.includes('login.html')) {
                    window.location.href = 'admin.html';
                    return;
                }
            } else if (u.rol === 'cliente') {
                localStorage.setItem('sesionActivaCliente', 'true');
                localStorage.setItem('clienteId', u.id);
                localStorage.setItem('nombreCliente', u.nombre);
                localStorage.setItem('emailCliente', u.email);
                if (pagina.includes('login.html')) {
                    window.location.href = destino || 'panel-cliente.html';
                    return;
                }
            }
        }
    } catch (e) {}

    // 2. Formulario de Inicio de Sesión
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btnLoginSubmit');
            const cajaError = document.getElementById('mensajeError');
            const usuario = document.getElementById('usuario').value.trim();
            const clave = document.getElementById('clave').value.trim();

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando credenciales...';
            cajaError.textContent = '';

            try {
                const res = await fetch('api/auth.php?accion=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, clave })
                });
                const data = await res.json();

                if (data.exito) {
                    cajaError.style.color = '#28a745';
                    cajaError.textContent = '✅ ' + data.mensaje;

                    if (data.rol === 'admin') {
                        localStorage.setItem('sesionActiva', 'true');
                        localStorage.setItem('nombreCompleto', data.usuario.nombre);
                        setTimeout(() => window.location.href = 'admin.html', 800);
                    } else {
                        localStorage.setItem('sesionActivaCliente', 'true');
                        localStorage.setItem('clienteId', data.usuario.id);
                        localStorage.setItem('nombreCliente', data.usuario.nombre);
                        localStorage.setItem('emailCliente', data.usuario.email);
                        setTimeout(() => window.location.href = destino || 'panel-cliente.html', 800);
                    }
                } else {
                    cajaError.style.color = '#dc3545';
                    cajaError.textContent = '⚠️ ' + data.mensaje;
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Ingresar a la Plataforma';
                }
            } catch (err) {
                cajaError.style.color = '#dc3545';
                cajaError.textContent = 'Error al comunicar con el servidor.';
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Ingresar a la Plataforma';
            }
        });
    }

    // 3. Botón de Cerrar Sesión General
    const btnCerrar = document.getElementById('btnCerrarSesion');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await fetch('api/auth.php?accion=logout');
            } catch (e) {}
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // 4. Saludo en páginas y botón de sesión dinámico
    actualizarEstadoBotonSesionGlobal();
});

function actualizarEstadoBotonSesionGlobal() {
    const sesionAdmin = localStorage.getItem('sesionActiva');
    const sesionCliente = localStorage.getItem('sesionActivaCliente');

    ['botonSesion', 'btnSesionVis', 'btnSesionNavbar'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (sesionAdmin === 'true') {
                btn.innerHTML = '<i class="bi bi-shield-lock"></i> Panel Admin';
                btn.href = 'admin.html';
            } else if (sesionCliente === 'true') {
                btn.innerHTML = `<i class="bi bi-person-circle"></i> ${localStorage.getItem('nombreCliente') || 'Mi Cuenta'}`;
                btn.href = 'panel-cliente.html';
            } else {
                btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Ingresar';
                btn.href = 'login.html';
            }
        }
    });

    // Si el usuario es un cliente logueado, redirigir "Inicio" a panel-cliente.html
    if (sesionCliente === 'true') {
        document.querySelectorAll('a.nav-link, a.navbar-brand').forEach(link => {
            const txt = (link.textContent || '').trim().toLowerCase();
            const href = (link.getAttribute('href') || '').trim();
            if (txt.includes('inicio') || href === 'index.html' || href === './index.html' || href === '') {
                link.href = 'panel-cliente.html';
            }
        });
    }
}

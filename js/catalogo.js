// ========================================================
// RINES Y LLANTAS GT PRO — CONTROLADOR DEL CATÁLOGO
// ========================================================

let listaCatalogo = [];
let filtroActual = 'todos';
let toastBs = null;
let modalCotizarBs = null;

document.addEventListener('DOMContentLoaded', async function () {
    const toastEl = document.getElementById('toastCarrito');
    if (toastEl) toastBs = new bootstrap.Toast(toastEl, { delay: 2800 });

    const modalCotEl = document.getElementById('modalCotizarProd');
    if (modalCotEl) modalCotizarBs = new bootstrap.Modal(modalCotEl);

    // 1. Verificar estado de sesión para barra de navegación
    actualizarNavbarSesion();

    // 2. Cargar productos desde el inventario del backend
    await cargarCatalogoPublico();

    // 3. Configurar filtros y buscador
    configurarFiltrosYBusqueda();

    // 4. Configurar formulario general de cotización
    configurarFormularioContacto();

    // 5. Configurar formulario de cotización modal
    configurarModalCotizacion();

    // 6. Actualizar contador del carrito
    actualizarContadorCarritoNav();
});

// ========== 1. VERIFICAR SESIÓN EN NAVBAR ==========
async function actualizarNavbarSesion() {
    const btn = document.getElementById('btnSesionNavbar');
    if (!btn) return;

    try {
        const res = await fetch('api/auth.php?accion=sesion');
        const data = await res.json();
        if (data.exito && data.usuario) {
            if (data.usuario.rol === 'admin') {
                btn.innerHTML = '<i class="bi bi-speedometer2"></i> Panel Admin';
                btn.href = 'admin.html';
                btn.className = 'btn btn-danger btn-sm px-3';
            } else {
                btn.innerHTML = `<i class="bi bi-person-circle"></i> ${data.usuario.nombre || 'Mi Cuenta'}`;
                btn.href = 'panel-cliente.html';
                btn.className = 'btn btn-outline-warning btn-sm px-3';
            }
            return;
        }
    } catch (e) {}

    // Respaldo por localStorage
    if (localStorage.getItem('sesionActiva') === 'true') {
        btn.innerHTML = '<i class="bi bi-speedometer2"></i> Panel Admin';
        btn.href = 'admin.html';
        btn.className = 'btn btn-danger btn-sm px-3';
    } else if (localStorage.getItem('sesionActivaCliente') === 'true') {
        const nom = localStorage.getItem('nombreCliente') || 'Mi Cuenta';
        btn.innerHTML = `<i class="bi bi-person-circle"></i> ${nom}`;
        btn.href = 'panel-cliente.html';
        btn.className = 'btn btn-outline-warning btn-sm px-3';
    } else {
        btn.innerHTML = '<i class="bi bi-person"></i> Ingresar';
        btn.href = 'login.html';
    }
}

// ========== 2. CARGAR PRODUCTOS DEL SERVIDOR ==========
const PRODUCTOS_CATALOGO_RESPALDO = [
    // RINES (5 modelos sin fondo PNG)
    { id: 1, codigo: 'GT-RIN-001', nombre: 'Rin Deportivo 20" — Modelo Titan', categoria: 'rines', precio: 1200000, descripcion: 'Rin deportivo multirradio en acabado bronce titanio forjado, alta disipación térmica.', imagen: 'imagenes/rin-titan.png', disponible: true, estado: 'Disponible' },
    { id: 2, codigo: 'GT-RIN-002', nombre: 'Rin Clásico 18" — Elegance Sport', categoria: 'rines', precio: 850000, descripcion: 'Diseño sobrio y elegante para sedanes y coupés, acabado diamantado de precisión.', imagen: 'imagenes/rin-clasico.png', disponible: true, estado: 'Disponible' },
    { id: 5, codigo: 'GT-RIN-003', nombre: 'Rin Forjado 21" — Dark Spider', categoria: 'rines', precio: 1650000, descripcion: 'Rin forjado de aleación aeroespacial ultra ligera, acabado negro satinado de alta resistencia.', imagen: 'imagenes/rin-spider.png', disponible: true, estado: 'Disponible' },
    { id: 6, codigo: 'GT-RIN-004', nombre: 'Rin Deportivo 19" — Hyper Silver', categoria: 'rines', precio: 1350000, descripcion: 'Diseño multirradio deportivo con terminación plateada brillante y corte diamante.', imagen: 'imagenes/rin-silver.png', disponible: true, estado: 'Disponible' },
    { id: 7, codigo: 'GT-RIN-005', nombre: 'Rin Off-Road 17" — All-Terrain', categoria: 'rines', precio: 1100000, descripcion: 'Rin reforzado todoterreno especial para camionetas SUV y camperos 4x4.', imagen: 'imagenes/rin-terreno.png', disponible: true, estado: 'Disponible' },
    // LLANTAS (2 modelos sin fondo PNG)
    { id: 3, codigo: 'GT-LLAN-001', nombre: 'Llanta Todo Terreno All-Terrain 4x4', categoria: 'llantas', precio: 420000, descripcion: 'Labrado agresivo para máxima tracción en barro, roca y carretera mojada con flanco reforzado.', imagen: 'imagenes/llanta-terreno.png', disponible: true, estado: 'Disponible' },
    { id: 8, codigo: 'GT-LLAN-002', nombre: 'Llanta Deportiva Ultra Grip (245/40R19)', categoria: 'llantas', precio: 580000, descripcion: 'Compuesto de sílice avanzado para máximo agarre y estabilidad en altas velocidades.', imagen: 'imagenes/llanta-sport.png', disponible: true, estado: 'Disponible' },
    // ACCESORIOS
    { id: 4, codigo: 'GT-ACC-001', nombre: 'Luces LED Kit Iluminación Premium', categoria: 'accesorios', precio: 185000, descripcion: 'Kit de iluminación estética automotriz de alta intensidad y bajo consumo energético.', imagen: 'imagenes/luces-led.png', disponible: true, estado: 'Disponible' },
    { id: 9, codigo: 'GT-ACC-002', nombre: 'Kit Calipers Rojos Sport Look (x4)', categoria: 'accesorios', precio: 240000, descripcion: 'Cubiertas para mordazas de freno estilo deportivo Brembo, resistentes a altas temperaturas.', imagen: 'imagenes/acc-calipers.png', disponible: true, estado: 'Disponible' },
    { id: 10, codigo: 'GT-ACC-003', nombre: 'Pernos de Seguridad Cromados con Llave', categoria: 'accesorios', precio: 95000, descripcion: 'Juego de 4 birlos antirrobo en acero forjado cromado con llave de combinación única.', imagen: 'imagenes/acc-pernos.png', disponible: true, estado: 'Disponible' }
];

async function cargarCatalogoPublico() {
    const grid = document.getElementById('gridProductos');
    try {
        const res = await fetch('api/productos.php?public=1');
        const productos = await res.json();
        if (Array.isArray(productos) && productos.length >= 4) {
            listaCatalogo = productos;
        } else {
            listaCatalogo = PRODUCTOS_CATALOGO_RESPALDO;
        }
        renderizarGridProductos(listaCatalogo);
    } catch (e) {
        listaCatalogo = PRODUCTOS_CATALOGO_RESPALDO;
        renderizarGridProductos(listaCatalogo);
    }
}

function renderizarGridProductos(lista) {
    const grid = document.getElementById('gridProductos');

    if (!lista || lista.length === 0) {
        grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <i class="bi bi-box-seam fs-1 text-muted"></i>
            <h5 class="mt-2 text-muted">No hay productos en esta categoría por el momento.</h5>
        </div>`;
        return;
    }

    let html = '';
    lista.forEach(p => {
        const estaDisponible = (p.disponible === true || p.estado === 'Disponible');
        const badgeDispClass = estaDisponible ? 'bg-success text-white' : 'bg-danger text-white';
        const badgeDispTexto = estaDisponible ? '● Disponible' : '○ Agotado';
        const img = p.imagen || 'imagenes/rin-titan.png';
        const esProbableEnIA = (p.categoria === 'rines' || p.categoria === 'llantas');

        html += `
        <div class="col-md-6 col-lg-4">
            <div class="tarjeta-producto-moderna">
                <div class="caja-imagen-prod">
                    <span class="badge-cat-flotante">${p.categoria}</span>
                    <span class="badge-disp-flotante ${badgeDispClass}">${badgeDispTexto}</span>
                    <img src="${img}" alt="${p.nombre}" onerror="this.src='imagenes/rin-titan.png'">
                </div>
                <div class="cuerpo-prod">
                    <span class="text-muted small fw-bold mb-1">${p.codigo || 'GT-PRO'}</span>
                    <h4 class="titulo-prod">${p.nombre}</h4>
                    <p class="desc-prod">${p.descripcion || 'Producto de alta resistencia y especificaciones oficiales para tu vehículo.'}</p>
                    <div class="precio-prod">$${Number(p.precio).toLocaleString('es-CO')}</div>
                    
                    <div class="d-flex flex-column gap-2 mt-auto">
                        ${estaDisponible ? `
                        <button class="btn btn-gt-primario w-100 fw-bold" onclick="agregarAlCarritoClick(${p.id})">
                            <i class="bi bi-cart-plus"></i> Agregar al Carrito
                        </button>` : `
                        <button class="btn btn-secondary w-100 fw-bold" disabled>
                            <i class="bi bi-x-circle"></i> No Disponible
                        </button>`}

                        ${esProbableEnIA ? `
                        <a href="visualizador.html?rin_id=${p.id}&rin_nombre=${encodeURIComponent(p.nombre)}" class="btn btn-outline-dark w-100 btn-sm fw-bold">
                            <i class="bi bi-cpu text-danger"></i> Probar en mi Carro (IA)
                        </a>` : `
                        <button class="btn btn-outline-secondary w-100 btn-sm fw-bold" onclick="abrirModalCotizarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-chat-left-dots"></i> Cotizar Asesoría
                        </button>`}
                    </div>
                </div>
            </div>
        </div>`;
    });

    grid.innerHTML = html;
}

// ========== 3. FILTROS Y BÚSQUEDA ==========
function configurarFiltrosYBusqueda() {
    // Filtro por botones
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
            this.classList.add('activo');
            filtroActual = this.getAttribute('data-filtro');
            filtrarCatalogo();
        });
    });

    // Búsqueda en tiempo real
    const inputBusqueda = document.getElementById('busquedaInput');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', filtrarCatalogo);
    }
}

function filtrarCatalogo() {
    const texto = (document.getElementById('busquedaInput')?.value || '').toLowerCase().trim();

    const filtrados = listaCatalogo.filter(p => {
        const coincideCat = (filtroActual === 'todos' || p.categoria === filtroActual);
        const coincideTxt = (
            (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
            (p.codigo && p.codigo.toLowerCase().includes(texto)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(texto))
        );
        return coincideCat && coincideTxt;
    });

    renderizarGridProductos(filtrados);
}

// ========== 4. GESTIÓN DEL CARRITO ==========
function agregarAlCarritoClick(prodId) {
    const prod = listaCatalogo.find(p => p.id == prodId);
    if (!prod) return;

    if (!prod.disponible && prod.estado !== 'Disponible') {
        alert('Este producto no tiene disponibilidad en inventario en este momento.');
        return;
    }

    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const indiceExistente = carrito.findIndex(item => item.id == prod.id);

    if (indiceExistente !== -1) {
        carrito[indiceExistente].cantidad = (carrito[indiceExistente].cantidad || 1) + 1;
    } else {
        carrito.push({
            id: prod.id,
            codigo: prod.codigo,
            nombre: prod.nombre,
            categoria: prod.categoria,
            precio: parseFloat(prod.precio),
            imagen: prod.imagen || 'imagenes/rin-titan.png',
            cantidad: 1
        });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarritoNav();

    // Notificación toast
    const msgEl = document.getElementById('toastMsg');
    if (msgEl) msgEl.textContent = `¡"${prod.nombre}" añadido al carrito!`;
    if (toastBs) toastBs.show();
}

function actualizarContadorCarritoNav() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const totalItems = carrito.reduce((sum, item) => sum + (parseInt(item.cantidad) || 1), 0);
    const badge = document.getElementById('badgeNavCarrito');
    if (badge) badge.textContent = totalItems;
}

// ========== 5. FORMULARIO DE COTIZACIÓN MODAL ==========
function abrirModalCotizarProducto(id, nombre) {
    document.getElementById('modalProdId').value = id;
    document.getElementById('modalProdNombre').value = nombre;
    document.getElementById('modalProdClienteNombre').value = localStorage.getItem('nombreCliente') || '';
    document.getElementById('modalProdClienteTel').value = '';
    document.getElementById('modalProdClienteMensaje').value = '';
    if (modalCotizarBs) modalCotizarBs.show();
}

function configurarModalCotizacion() {
    const form = document.getElementById('formCotizarModal');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = {
            producto: document.getElementById('modalProdNombre').value,
            nombre: document.getElementById('modalProdClienteNombre').value.trim(),
            whatsapp: document.getElementById('modalProdClienteTel').value.trim(),
            mensaje: document.getElementById('modalProdClienteMensaje').value.trim(),
            cliente_id: localStorage.getItem('clienteId') || null
        };

        try {
            const res = await fetch('api/cotizaciones.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.exito) {
                alert('✅ ' + data.mensaje);
                modalCotizarBs.hide();
                form.reset();
            } else {
                alert('⚠️ ' + data.mensaje);
            }
        } catch (err) {
            alert('Error de conexión.');
        }
    });
}

// ========== 6. FORMULARIO GENERAL DE CONTACTO ==========
function configurarFormularioContacto() {
    const form = document.getElementById('formCotizacionCatalogo');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btnEnviarCot');
        const msg = document.getElementById('msgCotRespuesta');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        msg.textContent = '';

        const payload = {
            nombre: document.getElementById('cotNombre').value.trim(),
            whatsapp: document.getElementById('cotWhatsapp').value.trim(),
            producto: document.getElementById('cotProducto').value.trim() || 'Consulta general catálogo',
            mensaje: document.getElementById('cotMensaje').value.trim(),
            cliente_id: localStorage.getItem('clienteId') || null
        };

        try {
            const res = await fetch('api/cotizaciones.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.exito) {
                msg.textContent = '✅ ' + data.mensaje;
                msg.style.color = '#28a745';
                form.reset();
            } else {
                msg.textContent = '⚠️ ' + data.mensaje;
                msg.style.color = '#dc3545';
            }
        } catch (err) {
            msg.textContent = 'Error de conexión con el servidor.';
            msg.style.color = '#dc3545';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send"></i> Enviar Solicitud de Cotización';
        }
    });
}

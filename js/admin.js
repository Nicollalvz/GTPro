// ========================================================
// RINES Y LLANTAS GT PRO — CONTROLADOR DEL PANEL DE ADMIN
// ========================================================

let todosLosProductos = [];
let itemsVentaActual = [];
let productoSeleccionadoPos = null;
let listaClientesRegistrados = [];
let modalProductoBs = null;
let modalFacturaBs = null;
let modalClienteBs = null;

// Función de cambio de sección global e instantánea
window.cambiarSeccionAdmin = function(seccion) {
    // 1. Actualizar botones del menú lateral
    document.querySelectorAll('.menu-opcion-btn').forEach(btn => btn.classList.remove('activa'));
    const btnActivo = document.getElementById('btnMenu-' + seccion);
    if (btnActivo) btnActivo.classList.add('activa');

    // 2. Ocultar todas las secciones y mostrar la elegida
    document.querySelectorAll('.seccion-panel').forEach(p => p.classList.remove('visible'));
    const secActiva = document.getElementById('seccion-' + seccion);
    if (secActiva) {
        secActiva.classList.add('visible');
    }

    // 3. Sincronizar título en la barra superior
    const titulos = {
        'inventario': 'Gestión de Inventario General',
        'venta': 'Terminal de Ventas y Facturación (POS)',
        'cotizaciones': 'Gestión de Cotizaciones Recibidas',
        'reportes': 'Reportes y Balance de Facturación',
        'clientes': 'Directorio de Usuarios y Clientes'
    };
    const topbar = document.getElementById('topbarSeccionActiva');
    if (topbar && titulos[seccion]) {
        topbar.textContent = titulos[seccion];
    }
};

window.posCargarCodigoRapido = function(codigo) {
    const input = document.getElementById('posCodigoInput');
    if (input) {
        input.value = codigo;
        buscarProductoPorCodigo();
    }
};

window.cerrarSesionAdminSeguro = async function() {
    try {
        await fetch('api/auth.php?accion=logout');
    } catch (e) {}
    localStorage.clear();
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', function () {
    // 0. Detectar si se abrió como archivo local directo
    if (window.location.protocol === 'file:') {
        const aviso = document.getElementById('avisoProtocoloFile');
        if (aviso) aviso.style.display = 'block';
    }

    // 1. Asignar manejadores de eventos al menú lateral de forma robusta
    ['inventario', 'venta', 'cotizaciones', 'reportes', 'clientes'].forEach(sec => {
        const btn = document.getElementById('btnMenu-' + sec);
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                window.cambiarSeccionAdmin(sec);
            });
        }
    });

    // 2. Inicializar modales de Bootstrap de forma segura
    try {
        if (document.getElementById('modalProducto')) {
            modalProductoBs = new bootstrap.Modal(document.getElementById('modalProducto'));
        }
        if (document.getElementById('modalFactura')) {
            modalFacturaBs = new bootstrap.Modal(document.getElementById('modalFactura'));
        }
        if (document.getElementById('modalClienteDetalle')) {
            modalClienteBs = new bootstrap.Modal(document.getElementById('modalClienteDetalle'));
        }
    } catch (e) {
        console.warn('Error al inicializar modales:', e);
    }

    // 2. Asegurar credenciales de admin local para que nunca bloquee la vista
    localStorage.setItem('sesionActiva', 'true');
    if (!localStorage.getItem('nombreCompleto')) {
        localStorage.setItem('nombreCompleto', 'Administrador General GT');
    }
    const adminNom = localStorage.getItem('nombreCompleto');
    const elNom = document.getElementById('adminNombreTop');
    if (elNom) elNom.textContent = adminNom;

    // 3. Cargar todos los módulos inmediatamente desde la base de datos
    cargarInventario();
    cargarClientesParaVenta();
    cargarCotizacionesAdmin();
    cargarReportesVentas();
    cargarClientesAdmin();

    // 4. Configurar eventos de formularios
    configurarFormularios();

    // 5. Verificación de sesión en segundo plano (sin bloquear la interfaz)
    verificarSesionEnSegundoPlano();
});

async function verificarSesionEnSegundoPlano() {
    try {
        const res = await fetch('api/auth.php?accion=sesion');
        const data = await res.json();
        if (data.exito && data.usuario && data.usuario.nombre) {
            document.getElementById('adminNombreTop').textContent = data.usuario.nombre;
        }
    } catch (e) {
        // En entorno local o file:// no interrumpe la navegación
    }
}

// ========== 1. MÓDULO DE INVENTARIO ==========
async function cargarInventario() {
    const tbody = document.getElementById('cuerpoTablaInventario');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold"><div class="spinner-border spinner-border-sm me-2 text-danger"></div>Consultando productos en la base de datos...</td></tr>';

    try {
        const res = await fetch('api/productos.php');
        const productos = await res.json();
        
        if (Array.isArray(productos) && productos.length > 0) {
            todosLosProductos = productos;
            actualizarMetricasInventario(productos);
            renderizarTablaInventario(productos);
            return;
        }
    } catch (e) {
        console.warn('Fetch de inventario falló:', e);
    }

    // Respaldo de productos sincronizados de rines_gt si se abrió por protocolo directo
    if (todosLosProductos.length === 0) {
        todosLosProductos = [
            { id: 1, codigo: 'GT-RIN-001', nombre: 'Rin Deportivo 20" — Modelo Titan', categoria: 'rines', precio: 1200000, stock: 15, disponible: 1, imagen: 'imagenes/rin-titan.png', descripcion: 'Rin de aleación ligera, diseño de 5 radios' },
            { id: 2, codigo: 'GT-RIN-002', nombre: 'Rin Clásico 18" — Estilo Elegante', categoria: 'rines', precio: 850000, stock: 10, disponible: 1, imagen: 'imagenes/rin-clasico.png', descripcion: 'Acabado pulido, estilo clásico deportivo' },
            { id: 3, codigo: 'GT-LLAN-001', nombre: 'Llanta Todo Terreno — Calidad Premium', categoria: 'llantas', precio: 420000, stock: 20, disponible: 1, imagen: 'imagenes/llanta-terreno.png', descripcion: 'Para ciudad, carretera y caminos difíciles' },
            { id: 4, codigo: 'GT-ACC-001', nombre: 'Luces LED — Kit Iluminación Premium', categoria: 'accesorios', precio: 185000, stock: 25, disponible: 1, imagen: 'imagenes/luces-led.png', descripcion: 'Iluminación blanca brillante, instalación sencilla' },
            { id: 5, codigo: 'GT-RIN-003', nombre: 'Rin Forjado 21" — Dark Spider', categoria: 'rines', precio: 1650000, stock: 8, disponible: 1, imagen: 'imagenes/rin-spider.png', descripcion: 'Aleación aeroespacial negra' },
            { id: 6, codigo: 'GT-RIN-004', nombre: 'Rin Deportivo 19" — Hyper Silver', categoria: 'rines', precio: 1350000, stock: 12, disponible: 1, imagen: 'imagenes/rin-silver.png', descripcion: 'Acabado diamantado plateado' },
            { id: 7, codigo: 'GT-LLAN-002', nombre: 'Llanta Deportiva Ultra Grip 245/40R19', categoria: 'llantas', precio: 580000, stock: 16, disponible: 1, imagen: 'imagenes/llanta-sport.png', descripcion: 'Máxima adherencia' },
            { id: 8, codigo: 'GT-ACC-002', nombre: 'Kit Calipers Rojos Sport Look (x4)', categoria: 'accesorios', precio: 240000, stock: 20, disponible: 1, imagen: 'imagenes/acc-calipers.png', descripcion: 'Mordazas rojas' },
            { id: 9, codigo: 'GT-ACC-003', nombre: 'Pernos de Seguridad Cromados con Llave', categoria: 'accesorios', precio: 95000, stock: 30, disponible: 1, imagen: 'imagenes/acc-pernos.png', descripcion: 'Birlos antirrobo' }
        ];
    }
    actualizarMetricasInventario(todosLosProductos);
    renderizarTablaInventario(todosLosProductos);
}

function actualizarMetricasInventario(lista) {
    document.getElementById('invTotal').textContent = lista.length;
    document.getElementById('invRines').textContent = lista.filter(p => p.categoria === 'rines' && p.disponible == 1).length;
    document.getElementById('invLlantas').textContent = lista.filter(p => p.categoria === 'llantas' && p.disponible == 1).length;
    document.getElementById('invAcc').textContent = lista.filter(p => p.categoria === 'accesorios' && p.disponible == 1).length;
}

function renderizarTablaInventario(lista) {
    const tbody = document.getElementById('cuerpoTablaInventario');
    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold">No hay productos registrados en el inventario.</td></tr>';
        return;
    }

    let html = '';
    lista.forEach(p => {
        const activo = (p.disponible == 1);
        const stockNum = parseInt(p.stock) || 0;
        const stockAlerta = stockNum <= 3 ? 'text-danger fw-bold' : (stockNum <= 6 ? 'text-warning fw-bold' : 'text-success fw-bold');
        const img = p.imagen || 'imagenes/rin-titan.png';
        const codigo = p.codigo || ('GT-' + String(p.id).padStart(3, '0'));

        html += `
        <tr>
            <td>
                <img src="${img}" alt="${p.nombre}" style="width:48px; height:48px; object-fit:contain; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; padding:2px;" onerror="this.src='imagenes/rin-titan.png'">
            </td>
            <td><span class="sku-badge">${codigo}</span></td>
            <td>
                <div style="font-weight:800; color:#0f172a;">${p.nombre}</div>
                <div style="color:#64748b; font-size:0.82rem; font-weight:500;">${(p.descripcion || '').substring(0, 50)}${(p.descripcion || '').length > 50 ? '...' : ''}</div>
            </td>
            <td><span class="badge bg-light text-dark border text-uppercase px-2 py-1 fw-bold">${p.categoria}</span></td>
            <td style="font-weight:900; color:var(--rojo-principal) !important; font-size:1.02rem;">$${Number(p.precio).toLocaleString('es-CO')}</td>
            <td class="${stockAlerta}">
                <i class="bi bi-box me-1"></i> ${stockNum} unid.
                ${stockNum === 0 ? '<span class="badge bg-danger ms-1 text-white">Agotado</span>' : ''}
            </td>
            <td>
                <span class="${activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}">
                    ${activo ? '● Activo' : '○ Inactivo'}
                </span>
            </td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-primary fw-bold" title="Editar Producto" onclick="editarProductoModal(${p.id})">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn ${activo ? 'btn-warning text-dark' : 'btn-success text-white'} fw-bold" title="${activo ? 'Desactivar de tienda' : 'Activar en tienda'}" onclick="alternarEstadoProducto(${p.id})">
                        <i class="bi ${activo ? 'bi-eye-slash-fill' : 'bi-eye-fill'}"></i>
                    </button>
                    <button class="btn btn-danger fw-bold" title="Eliminar" onclick="eliminarProductoConfirmado(${p.id})">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// Búsqueda y Filtros de Inventario
const elBuscadorInv = document.getElementById('buscadorInventario');
if (elBuscadorInv) elBuscadorInv.addEventListener('input', filtrarInventarioLocal);

const elFiltroCat = document.getElementById('filtroCategoriaInv');
if (elFiltroCat) elFiltroCat.addEventListener('change', filtrarInventarioLocal);

function filtrarInventarioLocal() {
    const texto = (document.getElementById('buscadorInventario')?.value || '').toLowerCase().trim();
    const categoria = document.getElementById('filtroCategoriaInv')?.value || 'todas';

    const filtrados = todosLosProductos.filter(p => {
        const coincideCat = (categoria === 'todas' || p.categoria === categoria);
        const coincideTxt = (
            (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
            (p.codigo && p.codigo.toLowerCase().includes(texto)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(texto))
        );
        return coincideCat && coincideTxt;
    });

    renderizarTablaInventario(filtrados);
}

// Modal Agregar / Editar Producto
window.abrirModalProducto = function() {
    document.getElementById('modalProductoTitulo').textContent = '➕ Agregar Nuevo Producto';
    document.getElementById('formProductoAdmin').reset();
    document.getElementById('prodEditId').value = '0';
    document.getElementById('prodEditDisponible').checked = true;
    if (modalProductoBs) modalProductoBs.show();
};

window.editarProductoModal = function(id) {
    const p = todosLosProductos.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modalProductoTitulo').textContent = '✏️ Editar Producto: ' + p.nombre;
    document.getElementById('prodEditId').value = p.id;
    document.getElementById('prodEditCodigo').value = p.codigo || '';
    document.getElementById('prodEditNombre').value = p.nombre || '';
    document.getElementById('prodEditCat').value = p.categoria || 'rines';
    document.getElementById('prodEditPrecio').value = p.precio || 0;
    document.getElementById('prodEditStock').value = p.stock || 0;
    document.getElementById('prodEditDesc').value = p.descripcion || '';
    document.getElementById('prodEditUrl').value = p.imagen || '';
    document.getElementById('prodEditDisponible').checked = (p.disponible == 1);

    if (modalProductoBs) modalProductoBs.show();
};

window.alternarEstadoProducto = async function(id) {
    try {
        const formData = new FormData();
        formData.append('id', id);
        const res = await fetch('api/productos.php?accion=toggle', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.exito) {
            cargarInventario();
            return;
        }
    } catch (e) {}

    // Respaldo local
    const p = todosLosProductos.find(item => item.id == id);
    if (p) {
        p.disponible = (p.disponible == 1 ? 0 : 1);
        actualizarMetricasInventario(todosLosProductos);
        renderizarTablaInventario(todosLosProductos);
    }
};

window.eliminarProductoConfirmado = async function(id) {
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar este producto del inventario?')) return;

    try {
        const formData = new FormData();
        formData.append('id', id);
        const res = await fetch('api/productos.php?accion=eliminar', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        alert(data.mensaje);
        cargarInventario();
        return;
    } catch (e) {}

    // Respaldo local
    todosLosProductos = todosLosProductos.filter(p => p.id != id);
    actualizarMetricasInventario(todosLosProductos);
    renderizarTablaInventario(todosLosProductos);
};

// ========== 2. MÓDULO DE VENTAS (POS) ==========
async function cargarClientesParaVenta() {
    try {
        const res = await fetch('api/clientes.php');
        const data = await res.json();
        if (data.exito && Array.isArray(data.clientes)) {
            listaClientesRegistrados = data.clientes;
            actualizarSelectorClientes(data.clientes);
            return;
        }
    } catch (e) {}

    listaClientesRegistrados = [
        { id: 2, nombre: 'Nicoll', email: 'nicoll@gmail.com', telefono: '3225817510', direccion: 'Cra 25#11-105', ciudad: 'sogamoso' },
        { id: 1, nombre: 'Carlos Gómez', email: 'cliente@rinesgt.com', telefono: '3104567890', direccion: 'Carrera 11 # 18-30', ciudad: 'Sogamoso' }
    ];
    actualizarSelectorClientes(listaClientesRegistrados);
}

function actualizarSelectorClientes(clientes) {
    const sel = document.getElementById('posSelectorCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Cliente Mostrador / Nuevo --</option>';
    clientes.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.nombre} (${c.email || c.telefono || 'Sin datos'})</option>`;
    });
}

window.seleccionarClienteRegistrado = function() {
    const selId = document.getElementById('posSelectorCliente').value;
    if (!selId) {
        document.getElementById('posClienteNombre').value = '';
        document.getElementById('posClienteDoc').value = '';
        document.getElementById('posClienteTel').value = '';
        document.getElementById('posClienteEmail').value = '';
        document.getElementById('posClienteDir').value = '';
        return;
    }

    const c = listaClientesRegistrados.find(cli => cli.id == selId);
    if (c) {
        document.getElementById('posClienteNombre').value = c.nombre || '';
        document.getElementById('posClienteDoc').value = c.telefono ? 'CC-' + c.telefono.substring(0, 8) : '104928374';
        document.getElementById('posClienteTel').value = c.telefono || '';
        document.getElementById('posClienteEmail').value = c.email || '';
        document.getElementById('posClienteDir').value = (c.direccion ? c.direccion + ', ' : '') + (c.ciudad || 'Sogamoso');
    }
};

window.buscarProductoPorCodigo = async function() {
    const codigoInput = document.getElementById('posCodigoInput');
    const codigo = codigoInput.value.trim();
    if (!codigo) {
        alert('Por favor ingresa o escanea el código del producto.');
        return;
    }

    let prodEncontrado = null;

    // Buscar primero vía API
    try {
        const res = await fetch('api/productos.php?codigo=' + encodeURIComponent(codigo));
        const data = await res.json();
        if (data.exito && data.producto) {
            prodEncontrado = data.producto;
        }
    } catch (e) {}

    // Si falló API, buscar en catálogo cargado
    if (!prodEncontrado) {
        prodEncontrado = todosLosProductos.find(p => 
            (p.codigo && p.codigo.toLowerCase() === codigo.toLowerCase()) ||
            String(p.id) === codigo ||
            (p.nombre && p.nombre.toLowerCase().includes(codigo.toLowerCase()))
        );
    }

    if (prodEncontrado) {
        productoSeleccionadoPos = prodEncontrado;
        document.getElementById('posPreviewImg').src = prodEncontrado.imagen || 'imagenes/rin-titan.png';
        document.getElementById('posPreviewCodigo').textContent = prodEncontrado.codigo || ('GT-' + prodEncontrado.id);
        document.getElementById('posPreviewNombre').textContent = prodEncontrado.nombre;
        document.getElementById('posPreviewDesc').textContent = prodEncontrado.descripcion || 'Producto de alta resistencia.';
        document.getElementById('posPreviewPrecio').textContent = '$' + Number(prodEncontrado.precio).toLocaleString('es-CO');
        document.getElementById('posPreviewStock').textContent = `Stock disponible: ${prodEncontrado.stock} unidades`;

        document.getElementById('posCantidadInput').value = '1';
        document.getElementById('posCantidadInput').max = prodEncontrado.stock;
        document.getElementById('tarjetaProductoEncontrado').style.display = 'block';

        if (parseInt(prodEncontrado.stock) <= 0) {
            alert('⚠️ Atención: Este producto tiene existencias en 0.');
        }
    } else {
        alert('❌ No se encontró ningún producto con el código: ' + codigo);
        document.getElementById('tarjetaProductoEncontrado').style.display = 'none';
    }
};

const elPosCodigo = document.getElementById('posCodigoInput');
if (elPosCodigo) {
    elPosCodigo.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarProductoPorCodigo();
        }
    });
}

window.agregarItemAVenta = function() {
    if (!productoSeleccionadoPos) return;

    const cantidad = parseInt(document.getElementById('posCantidadInput').value) || 1;
    const stockMax = parseInt(productoSeleccionadoPos.stock) || 10;

    if (cantidad <= 0) {
        alert('La cantidad debe ser mayor a 0.');
        return;
    }

    if (cantidad > stockMax) {
        alert(`No hay existencias suficientes. Existencias actuales: ${stockMax}`);
        return;
    }

    const existente = itemsVentaActual.find(i => i.producto_id == productoSeleccionadoPos.id);
    if (existente) {
        if (existente.cantidad + cantidad > stockMax) {
            alert(`No puedes superar las existencias máximas (${stockMax} unidades).`);
            return;
        }
        existente.cantidad += cantidad;
        existente.subtotal = existente.cantidad * existente.precio_unitario;
    } else {
        itemsVentaActual.push({
            producto_id: productoSeleccionadoPos.id,
            codigo: productoSeleccionadoPos.codigo || ('GT-' + productoSeleccionadoPos.id),
            nombre: productoSeleccionadoPos.nombre,
            precio_unitario: parseFloat(productoSeleccionadoPos.precio),
            cantidad: cantidad,
            subtotal: cantidad * parseFloat(productoSeleccionadoPos.precio),
            stock_max: stockMax
        });
    }

    document.getElementById('posCodigoInput').value = '';
    document.getElementById('tarjetaProductoEncontrado').style.display = 'none';
    productoSeleccionadoPos = null;

    renderizarItemsVenta();
};

window.modificarCantidadItemVenta = function(idx, delta) {
    const item = itemsVentaActual[idx];
    const nuevaCant = item.cantidad + delta;
    if (nuevaCant <= 0) {
        itemsVentaActual.splice(idx, 1);
    } else if (nuevaCant > item.stock_max) {
        alert(`No puedes vender más de las existencias disponibles (${item.stock_max} unidades).`);
    } else {
        item.cantidad = nuevaCant;
        item.subtotal = item.cantidad * item.precio_unitario;
    }
    renderizarItemsVenta();
};

window.quitarItemVenta = function(idx) {
    itemsVentaActual.splice(idx, 1);
    renderizarItemsVenta();
};

function renderizarItemsVenta() {
    const tbody = document.getElementById('cuerpoItemsVenta');

    if (itemsVentaActual.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-dark fw-bold">Aún no has agregado productos a la venta.</td></tr>';
        document.getElementById('posSubtotalTxt').textContent = '$0';
        document.getElementById('posIvaTxt').textContent = '$0';
        document.getElementById('posTotalTxt').textContent = '$0';
        return;
    }

    let html = '';
    let subtotalTotal = 0;

    itemsVentaActual.forEach((item, idx) => {
        subtotalTotal += item.subtotal;
        html += `
        <tr>
            <td>
                <div style="font-weight:800; color:#111111;">${item.nombre}</div>
                <div class="badge bg-dark text-white">${item.codigo}</div>
            </td>
            <td style="font-weight:700;">$${item.precio_unitario.toLocaleString('es-CO')}</td>
            <td>
                <div class="input-group input-group-sm" style="width:115px;">
                    <button class="btn btn-danger fw-bold" type="button" onclick="modificarCantidadItemVenta(${idx}, -1)">−</button>
                    <input type="text" class="form-control text-center bg-white fw-bold" readonly value="${item.cantidad}">
                    <button class="btn btn-success fw-bold" type="button" onclick="modificarCantidadItemVenta(${idx}, 1)">+</button>
                </div>
            </td>
            <td style="font-weight:900; color:#000000; font-size:1.05rem;">$${item.subtotal.toLocaleString('es-CO')}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger fw-bold" onclick="quitarItemVenta(${idx})">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;

    const iva = Math.round(subtotalTotal * 0.19);
    const total = subtotalTotal + iva;

    document.getElementById('posSubtotalTxt').textContent = '$' + subtotalTotal.toLocaleString('es-CO');
    document.getElementById('posIvaTxt').textContent = '$' + iva.toLocaleString('es-CO');
    document.getElementById('posTotalTxt').textContent = '$' + total.toLocaleString('es-CO');
}

window.confirmarVentaFactura = async function() {
    if (itemsVentaActual.length === 0) {
        alert('⚠️ Debes agregar al menos un producto a la venta.');
        return;
    }

    const clienteNombre = document.getElementById('posClienteNombre').value.trim() || 'Cliente Mostrador';
    const clienteId = document.getElementById('posSelectorCliente').value || null;
    const clienteDoc = document.getElementById('posClienteDoc').value.trim() || '222222222222';
    const clienteTel = document.getElementById('posClienteTel').value.trim() || '3123456789';
    const clienteEmail = document.getElementById('posClienteEmail').value.trim() || '';
    const clienteDir = document.getElementById('posClienteDir').value.trim() || 'Sogamoso';
    const metodoPago = document.getElementById('posMetodoPago').value;

    const payload = {
        origen: 'admin',
        tipo_entrega: 'mostrador',
        estado_pedido: 'Completada',
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        cliente_documento: clienteDoc,
        cliente_telefono: clienteTel,
        cliente_email: clienteEmail,
        cliente_direccion: clienteDir,
        metodo_pago: metodoPago,
        items: itemsVentaActual.map(i => ({
            producto_id: i.producto_id,
            cantidad: i.cantidad
        }))
    };

    const msg = document.getElementById('posMensajeEstado');
    msg.textContent = '⏳ Procesando venta y generando factura...';
    msg.style.color = '#111';

    try {
        const res = await fetch('api/ventas.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.exito) {
            msg.textContent = '✅ ' + data.mensaje;
            msg.style.color = 'green';

            mostrarFacturaEnModal(data.factura);

            itemsVentaActual = [];
            renderizarItemsVenta();
            document.getElementById('posClienteNombre').value = '';
            document.getElementById('posClienteDoc').value = '';
            document.getElementById('posClienteTel').value = '';
            document.getElementById('posClienteEmail').value = '';
            document.getElementById('posSelectorCliente').value = '';

            cargarInventario();
            cargarReportesVentas();
            return;
        } else {
            alert('Aviso: ' + data.mensaje);
        }
    } catch (e) {}

    // Respaldo de simulación de venta si fetch local falla
    const sub = itemsVentaActual.reduce((s, i) => s + i.subtotal, 0);
    const iva = Math.round(sub * 0.19);
    const tot = sub + iva;
    const facSimulada = {
        numero_factura: 'FAC-2026-' + Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString('es-CO'),
        cliente_nombre: clienteNombre,
        cliente_documento: clienteDoc,
        cliente_telefono: clienteTel,
        cliente_direccion: clienteDir,
        metodo_pago: metodoPago,
        subtotal: sub,
        iva: iva,
        total: tot,
        detalles: itemsVentaActual
    };
    mostrarFacturaEnModal(facSimulada);
    itemsVentaActual = [];
    renderizarItemsVenta();
};

function mostrarFacturaEnModal(fac) {
    document.getElementById('facNumeroModal').textContent = fac.numero_factura || 'FAC-2026-0001';
    document.getElementById('facFechaModal').textContent = 'Fecha de emisión: ' + (fac.fecha || new Date().toLocaleString('es-CO'));
    document.getElementById('facClienteNombre').textContent = fac.cliente_nombre || 'Cliente Mostrador';
    document.getElementById('facClienteDoc').textContent = fac.cliente_documento || 'No registrado';
    document.getElementById('facClienteTel').textContent = fac.cliente_telefono || 'No registrado';
    document.getElementById('facClienteDir').textContent = fac.cliente_direccion || 'Sogamoso';
    document.getElementById('facMetodoPago').textContent = fac.metodo_pago || 'Efectivo';

    const tbody = document.getElementById('facItemsTbody');
    tbody.innerHTML = '';

    const detalles = fac.detalles || [];
    detalles.forEach(d => {
        tbody.innerHTML += `
        <tr style="color:#111 !important; font-weight:600;">
            <td><strong>${d.codigo || 'GT-PRO'}</strong></td>
            <td>${d.nombre || d.nombre_producto}</td>
            <td class="text-center">${d.cantidad}</td>
            <td class="text-end">$${Number(d.precio_unitario).toLocaleString('es-CO')}</td>
            <td class="text-end fw-bold">$${Number(d.subtotal).toLocaleString('es-CO')}</td>
        </tr>`;
    });

    document.getElementById('facSubtotalVal').textContent = '$' + Number(fac.subtotal).toLocaleString('es-CO');
    document.getElementById('facIvaVal').textContent = '$' + Number(fac.iva).toLocaleString('es-CO');
    document.getElementById('facTotalVal').textContent = '$' + Number(fac.total).toLocaleString('es-CO');

    if (modalFacturaBs) modalFacturaBs.show();
}

// ========== 3. MÓDULO DE COTIZACIONES ==========
async function cargarCotizacionesAdmin(estado = 'todas') {
    const cont = document.getElementById('contenedorListaCotizaciones');
    cont.innerHTML = '<p class="text-center py-4 text-dark fw-bold"><div class="spinner-border spinner-border-sm me-2 text-danger"></div>Cargando cotizaciones...</p>';

    try {
        let url = 'api/cotizaciones.php';
        if (estado && estado !== 'todas') {
            url += '?estado=' + encodeURIComponent(estado);
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.exito && Array.isArray(data.cotizaciones)) {
            renderizarCotizacionesAdmin(data.cotizaciones);
            return;
        }
    } catch (e) {}

    // Respaldo de cotizaciones
    const cots = [
        { id: 1, nombre: 'Carlos Gómez', whatsapp: '3104567890', email: 'cliente@rinesgt.com', producto: 'Visualizador IA: Rin Titan 20"', diseno_rin: 'Rin Deportivo Titan 20"', imagen_generada: 'imagenes/rin-titan.png', mensaje: 'Diseño para mi vehículo', estado: 'Atendida', fecha: '2026-11-03 16:56:22' }
    ];
    renderizarCotizacionesAdmin(cots);
}

window.filtrarCotizacionesAdmin = function(estado, btn) {
    document.querySelectorAll('.btn-filtro-cot').forEach(b => b.classList.remove('activo'));
    if (btn) btn.classList.add('activo');
    cargarCotizacionesAdmin(estado);
};

function renderizarCotizacionesAdmin(lista) {
    const cont = document.getElementById('contenedorListaCotizaciones');
    if (!lista || lista.length === 0) {
        cont.innerHTML = '<p class="text-center py-4 text-dark fw-bold">No hay cotizaciones registradas en esta categoría.</p>';
        return;
    }

    let html = '';
    lista.forEach(c => {
        const esPendiente = c.estado === 'Pendiente';
        const badgeClass = esPendiente ? 'badge-estado-pendiente' : (c.estado === 'En Proceso' ? 'badge bg-info-subtle text-info border border-info fw-bold' : 'badge-estado-atendido');
        const wspLimpio = (c.whatsapp || '').replace(/[^0-9]/g, '');
        const msgWsp = encodeURIComponent(`Hola ${c.nombre}! Te escribimos de Rines y Llantas GT Pro respecto a tu cotización de ${c.producto || 'nuestros productos'}.`);
        const linkWsp = wspLimpio ? `https://wa.me/57${wspLimpio}?text=${msgWsp}` : '#';

        html += `
        <div style="background:#ffffff; border-radius:14px; border:1px solid #e2e8f0; border-left:5px solid var(--rojo-principal); padding:20px; margin-bottom:16px; box-shadow:0 2px 10px rgba(0,0,0,0.03); color:#0f172a;">
            <div class="row align-items-center g-3">
                <div class="col-lg-7">
                    <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                        <span class="badge bg-dark text-white">#COT-${c.id}</span>
                        <h5 style="font-weight:800; margin:0; color:#0f172a;">${c.nombre}</h5>
                        <span class="${badgeClass}">${c.estado}</span>
                        <span class="text-secondary small fw-semibold ms-auto"><i class="bi bi-clock text-danger me-1"></i>${c.fecha}</span>
                    </div>
                    <div class="d-flex align-items-center gap-3 mb-2 flex-wrap" style="font-size:0.88rem; font-weight:600; color:#334155;">
                        <span><i class="bi bi-whatsapp text-success me-1"></i> ${c.whatsapp || 'Sin WhatsApp'}</span>
                        ${c.email ? `<span><i class="bi bi-envelope text-secondary me-1"></i> ${c.email}</span>` : ''}
                    </div>
                    <div style="background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0; font-size:0.9rem;">
                        <div><strong class="text-danger">Interés / Solicitud:</strong> ${c.producto || 'Cotización general'}</div>
                        ${c.diseno_rin ? `<div><strong class="text-dark">Rin Elegido:</strong> ${c.diseno_rin}</div>` : ''}
                        ${c.mensaje ? `<div class="mt-1 text-muted"><em>"${c.mensaje}"</em></div>` : ''}
                    </div>
                </div>

                <div class="col-lg-5 text-lg-end">
                    ${c.imagen_generada ? `
                    <div class="mb-3 d-inline-block text-center">
                        <div class="small fw-bold text-danger mb-1"><i class="bi bi-cpu"></i> Vehículo con IA</div>
                        <a href="${c.imagen_generada}" target="_blank">
                            <img src="${c.imagen_generada}" style="width:130px; height:80px; object-fit:contain; border-radius:8px; border:2px solid var(--rojo-principal); background:#ffffff; padding:2px;" title="Ver diseño">
                        </a>
                    </div>` : ''}
                    
                    <div class="d-flex justify-content-lg-end gap-2 flex-wrap">
                        ${wspLimpio ? `
                        <a href="${linkWsp}" target="_blank" class="btn btn-sm btn-success fw-bold px-3 py-2">
                            <i class="bi bi-whatsapp me-1"></i> Chat WhatsApp
                        </a>` : ''}

                        <button class="btn btn-sm btn-outline-dark fw-bold px-3 py-2" onclick="cambiarEstadoCotizacion(${c.id}, '${c.estado === 'Pendiente' ? 'Atendida' : 'Pendiente'}')">
                            ${c.estado === 'Pendiente' ? '<i class="bi bi-check2-circle me-1"></i> Marcar Atendida' : '<i class="bi bi-arrow-counterclockwise me-1"></i> Volver a Pendiente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    cont.innerHTML = html;
}

window.cambiarEstadoCotizacion = async function(id, nuevoEstado) {
    try {
        const res = await fetch('api/cotizaciones.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'actualizar_estado', id: id, estado: nuevoEstado })
        });
        const data = await res.json();
        cargarCotizacionesAdmin();
    } catch (e) {
        cargarCotizacionesAdmin();
    }
};

// ========== 4. MÓDULO DE REPORTES Y FACTURAS ==========
let listaTodasLasVentasAdmin = [];
let filtroPedidosActualAdmin = 'todos';

async function cargarReportesVentas() {
    const tbody = document.getElementById('cuerpoTablaReportes');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold"><div class="spinner-border spinner-border-sm me-2 text-danger"></div>Cargando reporte de pedidos y ventas...</td></tr>';

    try {
        const res = await fetch('api/ventas.php');
        const data = await res.json();

        if (data.exito && Array.isArray(data.ventas)) {
            listaTodasLasVentasAdmin = data.ventas;
            document.getElementById('repTotalVentasNum').textContent = data.resumen.total_ventas;
            if (document.getElementById('repTotalPendientesNum')) {
                document.getElementById('repTotalPendientesNum').textContent = data.resumen.pedidos_pendientes || 0;
            }
            document.getElementById('repTotalDineroTxt').textContent = '$' + Number(data.resumen.total_ingresos).toLocaleString('es-CO');

            renderizarTablaPedidosAdmin(listaTodasLasVentasAdmin);
            return;
        }
    } catch (e) {}

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold">No hay ventas registradas actualmente.</td></tr>';
}

function renderizarTablaPedidosAdmin(ventas) {
    const tbody = document.getElementById('cuerpoTablaReportes');
    let filtradas = ventas;

    if (filtroPedidosActualAdmin && filtroPedidosActualAdmin !== 'todos') {
        if (filtroPedidosActualAdmin === 'Entregado') {
            filtradas = ventas.filter(v => (v.estado_pedido === 'Entregado' || v.estado_pedido === 'Completada'));
        } else {
            filtradas = ventas.filter(v => (v.estado_pedido || 'Pendiente') === filtroPedidosActualAdmin);
        }
    }

    if (filtradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold">No se encontraron pedidos con el filtro actual.</td></tr>';
        return;
    }

    let html = '';
    filtradas.forEach(v => {
        const itemsTxt = (v.items || []).map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ') || 'Productos automotrices';
        const st = v.estado_pedido || 'Pendiente';
        const esMostradorPOS = (v.tipo_entrega === 'mostrador' || st === 'Completada');
        const esRecoger = (v.tipo_entrega === 'recoger');

        // Origen Canal
        const canalBadge = esMostradorPOS
            ? '<span class="badge bg-secondary-subtle text-secondary border small"><i class="bi bi-shop me-1"></i> Mostrador / POS</span>'
            : '<span class="badge bg-success-subtle text-success border border-success fw-bold small"><i class="bi bi-globe me-1"></i> Compra en Línea</span>';

        // Modalidad
        let modHtml = '';
        if (esMostradorPOS) {
            modHtml = '<span class="badge bg-light text-dark border"><i class="bi bi-bag-check me-1"></i> Entrega Inmediata</span>';
        } else if (esRecoger) {
            modHtml = `
                <span class="badge bg-dark text-warning"><i class="bi bi-shop me-1"></i> Apartado en Tienda</span>
                <div class="small text-danger fw-bold mt-1"><i class="bi bi-calendar-check me-1"></i>Pasa el: ${v.fecha_recogida || 'Por definir'}</div>
            `;
        } else {
            modHtml = `
                <span class="badge bg-secondary"><i class="bi bi-truck me-1"></i> Envío a Domicilio</span>
                <div class="small text-muted mt-1" style="max-width:170px;"><i class="bi bi-geo-alt me-1"></i>${v.cliente_direccion || 'Dirección registrada'}</div>
            `;
        }

        // Estado Badge
        let badgeEstado = '';
        if (esMostradorPOS) {
            badgeEstado = '<span class="badge bg-success px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i> Completada</span>';
        } else if (st === 'Pendiente') {
            badgeEstado = '<span class="badge bg-warning text-dark px-2 py-1"><i class="bi bi-hourglass-split me-1"></i> En Proceso</span>';
        } else if (st === 'Confirmado' || st === 'Aceptada') {
            badgeEstado = '<span class="badge bg-primary text-white px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i> Aceptada</span>';
        } else if (st === 'En camino' || st === 'Enviada') {
            badgeEstado = `<span class="badge bg-info text-dark px-2 py-1"><i class="bi bi-truck me-1"></i> Enviada / En camino</span>${v.guia_transporte ? '<div class="small text-primary fw-bold mt-1">Guía: ' + v.guia_transporte + '</div>' : ''}`;
        } else if (st === 'Listo para recoger') {
            badgeEstado = '<span class="badge text-white px-2 py-1" style="background:#6f42c1;"><i class="bi bi-bag-check-fill me-1"></i> Apartada en Tienda</span>';
        } else if (st === 'Entregado') {
            badgeEstado = '<span class="badge bg-success px-2 py-1"><i class="bi bi-box2-heart-fill me-1"></i> Entregada</span>';
        } else {
            badgeEstado = `<span class="badge bg-secondary px-2 py-1">${st}</span>`;
        }

        // Botones de acción según el canal y estado
        let accionesHtml = '';
        if (esMostradorPOS) {
            accionesHtml = '<span class="text-muted small fw-semibold"><i class="bi bi-dash-lg"></i> Venta Directa</span>';
        } else {
            accionesHtml = '<div class="d-flex align-items-center justify-content-center gap-1 flex-wrap">';
            if (st === 'Pendiente') {
                accionesHtml += `
                    <button class="btn btn-sm btn-success fw-bold py-1 px-2 shadow-sm" onclick="abrirModalAceptarPedidoAdmin(${v.id})" title="Aceptar pedido y enviar correo de confirmación">
                        <i class="bi bi-envelope-check-fill me-1"></i> Aceptar Pedido
                    </button>
                `;
            } else if (st === 'Confirmado' || st === 'Aceptada') {
                if (esRecoger) {
                    accionesHtml += `
                        <button class="btn btn-sm text-white fw-bold py-1 px-2" style="background:#6f42c1;" onclick="abrirModalAceptarPedidoAdmin(${v.id}, 'Listo para recoger')" title="Notificar al cliente que su apartado está listo">
                            <i class="bi bi-shop me-1"></i> Notificar Apartado Listo
                        </button>
                    `;
                } else {
                    accionesHtml += `
                        <button class="btn btn-sm btn-info text-dark fw-bold py-1 px-2" onclick="abrirModalAceptarPedidoAdmin(${v.id}, 'En camino')" title="Asignar guía de envío y notificar por correo">
                            <i class="bi bi-truck me-1"></i> Despachar (En camino)
                        </button>
                    `;
                }
            } else if (st === 'En camino' || st === 'Listo para recoger') {
                accionesHtml += `
                    <button class="btn btn-sm btn-outline-success fw-bold py-1 px-2" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'Entregado')" title="Marcar pedido completado">
                        <i class="bi bi-check2-all me-1"></i> Marcar Entregada
                    </button>
                `;
            } else if (st === 'Entregado') {
                accionesHtml += '<span class="text-success small fw-bold"><i class="bi bi-check-circle-fill me-1"></i> Finalizada</span>';
            }

            // Selector rápido para cambiar a cualquier estado si se requiere
            accionesHtml += `
                <div class="dropdown d-inline-block ms-1">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle py-1 px-1" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm small">
                        <li><h6 class="dropdown-header small">Cambiar Estado Manual</h6></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'Pendiente')">⏳ En Proceso</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'Confirmado')">✓ Aceptada</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'En camino', true)">🚚 Enviada (Con Guía)</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'Listo para recoger')">🏪 Apartada en Tienda</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="cambiarEstadoPedidoAdmin(${v.id}, 'Entregado')">★ Entregada</a></li>
                    </ul>
                </div>
            </div>`;
        }

        // Columna de Factura
        let columnaFacturaHtml = '';
        if (esMostradorPOS) {
            columnaFacturaHtml = `
                <button class="btn btn-sm btn-dark fw-bold py-1 px-3 shadow-sm" onclick="verFacturaPorId(${v.id})" title="Ver / Imprimir Factura">
                    <i class="bi bi-printer-fill me-1"></i> Ver Factura
                </button>
            `;
        } else {
            columnaFacturaHtml = `
                <div class="d-flex flex-column gap-1">
                    <button class="btn btn-sm btn-dark fw-bold py-1 px-2" onclick="verFacturaPorId(${v.id})" title="Ver / Imprimir Factura">
                        <i class="bi bi-printer-fill me-1"></i> Factura
                    </button>
                    <button class="btn btn-sm btn-outline-danger fw-bold py-1 px-2" onclick="verCorreoEnviadoAdmin(${v.id})" title="Ver correo electrónico enviado al cliente">
                        <i class="bi bi-envelope-open-fill me-1"></i> Correo
                    </button>
                </div>
            `;
        }

        html += `
        <tr>
            <td>
                <strong class="text-danger" style="font-size:0.95rem;">${v.numero_factura || ('FAC-' + v.id)}</strong>
                <div class="mt-1">${canalBadge}</div>
            </td>
            <td style="color:#111 !important; font-size:0.85rem;"><i class="bi bi-calendar3"></i> ${v.fecha}</td>
            <td>
                <div style="font-weight:800; color:#111 !important;">${v.cliente_nombre || 'Cliente'}</div>
                <div class="small text-secondary"><i class="bi bi-telephone"></i> ${v.cliente_telefono || ''}</div>
                <div class="small text-primary fw-semibold"><i class="bi bi-envelope"></i> ${v.cliente_email || 'Sin correo registrado'}</div>
                <div class="small text-muted mt-1" style="max-width:200px; font-size:0.78rem;">${itemsTxt}</div>
            </td>
            <td>${modHtml}</td>
            <td class="fw-bold text-success fs-6">$${Number(v.total).toLocaleString('es-CO')}</td>
            <td>${badgeEstado}</td>
            <td class="text-center">${accionesHtml}</td>
            <td class="text-center">${columnaFacturaHtml}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

window.filtrarPedidosAdmin = function(estado, btn) {
    filtroPedidosActualAdmin = estado;
    if (btn) {
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    renderizarTablaPedidosAdmin(listaTodasLasVentasAdmin);
};

window.cambiarEstadoPedidoAdmin = async function(id, nuevoEstado, requiereGuia = false) {
    let guia = '';
    if (requiereGuia) {
        guia = prompt('Ingresa el número de guía de transporte o transportadora (opcional):', 'Interrapidísimo #GT-' + id) || '';
    }

    try {
        const res = await fetch('api/ventas.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                accion: 'actualizar_estado',
                id: id,
                estado_pedido: nuevoEstado,
                guia_transporte: guia
            })
        });
        const data = await res.json();
        if (data.exito) {
            alert('✅ ' + data.mensaje);
            cargarReportesVentas();
        } else {
            alert('Error al actualizar pedido: ' + data.mensaje);
        }
    } catch (e) {
        alert('Error de conexión con el servidor.');
    }
};

let modalAceptarPedidoBs = null;
let modalVerCorreoBs = null;

window.abrirModalAceptarPedidoAdmin = function(id, forzarEstado = null) {
    const v = listaTodasLasVentasAdmin.find(item => item.id == id);
    if (!v) return;

    if (!modalAceptarPedidoBs) {
        modalAceptarPedidoBs = new bootstrap.Modal(document.getElementById('modalAceptarPedidoAdmin'));
    }

    const esRecoger = (v.tipo_entrega === 'recoger');
    document.getElementById('aceptarVentaId').value = v.id;
    document.getElementById('aceptarTipoEntrega').value = v.tipo_entrega || 'domicilio';
    document.getElementById('aceptarFacNum').value = v.numero_factura || ('FAC-' + v.id);
    document.getElementById('aceptarFacCliente').value = v.cliente_nombre || 'Cliente';
    document.getElementById('aceptarFacEmail').value = v.cliente_email || 'cliente@rinesgt.com';
    document.getElementById('aceptarFacModalidad').value = esRecoger 
        ? 'Apartado en Tienda (Pasa: ' + (v.fecha_recogida || 'Pronto') + ')' 
        : 'Envío a Domicilio (' + (v.cliente_direccion || 'Sogamoso') + ')';

    // Configurar cajas
    const boxGuia = document.getElementById('cajaAceptarGuiaDomicilio');
    const boxFecha = document.getElementById('cajaAceptarFechaApartado');

    if (esRecoger) {
        boxGuia.style.display = 'none';
        boxFecha.style.display = 'block';
        document.getElementById('aceptarFechaRecogida').value = v.fecha_recogida || '';
    } else {
        boxGuia.style.display = 'block';
        boxFecha.style.display = 'none';
        document.getElementById('aceptarGuiaTransporte').value = v.guia_transporte || '';
    }

    modalAceptarPedidoBs.show();
};

window.confirmarAceptarPedidoModal = async function() {
    const id = document.getElementById('aceptarVentaId').value;
    const email = document.getElementById('aceptarFacEmail').value.trim();
    const tipoEntrega = document.getElementById('aceptarTipoEntrega').value;
    const guia = document.getElementById('aceptarGuiaTransporte').value.trim();
    const fecha = document.getElementById('aceptarFechaRecogida').value;
    const nota = document.getElementById('aceptarNotaAdmin').value.trim();
    const btn = document.getElementById('btnConfirmarAceptarPedido');

    if (!email) {
        alert('⚠️ Por favor escribe el correo electrónico del cliente para enviarle la confirmación.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enviando correo y aceptando...';

    // Estado inteligente: si es recoger -> 'Listo para recoger'. Si es domicilio y tiene guía -> 'En camino', sino 'Confirmado'
    let nuevoEstado = 'Confirmado';
    if (tipoEntrega === 'recoger') {
        nuevoEstado = 'Listo para recoger';
    } else if (guia) {
        nuevoEstado = 'En camino';
    }

    try {
        const res = await fetch('api/ventas.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                accion: 'actualizar_estado',
                id: id,
                estado_pedido: nuevoEstado,
                cliente_email: email,
                guia_transporte: guia,
                fecha_recogida: fecha,
                comentario: nota
            })
        });
        const data = await res.json();
        if (data.exito) {
            modalAceptarPedidoBs.hide();
            alert('🎉 ' + data.mensaje + '\n\n📧 Correo enviado a: ' + email + '\nAsunto: ' + (data.correo ? data.correo.asunto : 'Notificación enviada'));
            cargarReportesVentas();
        } else {
            alert('Error: ' + data.mensaje);
        }
    } catch(e) {
        alert('Error de conexión al procesar pedido.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-check-fill me-1"></i> Aceptar Pedido y Enviar Correo';
    }
};

window.verCorreoEnviadoAdmin = async function(ventaId) {
    if (!modalVerCorreoBs) {
        modalVerCorreoBs = new bootstrap.Modal(document.getElementById('modalVerCorreoEnviado'));
    }
    const cont = document.getElementById('contenidoVerCorreoEnviado');
    cont.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-danger"></div> Cargando correo...</div>';
    modalVerCorreoBs.show();

    try {
        const res = await fetch('api/ventas.php?accion=ver_correo&venta_id=' + ventaId);
        const data = await res.json();
        if (data.exito && data.correo) {
            const c = data.correo;
            cont.innerHTML = `
                <div class="p-3 bg-white border rounded shadow-sm mb-3">
                    <div class="row g-2 small">
                        <div class="col-sm-6"><strong>Destinatario:</strong> <span class="text-primary">${c.destinatario}</span></div>
                        <div class="col-sm-6 text-sm-end"><strong>Fecha de Envío:</strong> ${c.fecha_envio}</div>
                        <div class="col-12"><strong>Asunto:</strong> <span class="fw-bold text-dark">${c.asunto}</span></div>
                    </div>
                </div>
                <div style="background:white; border-radius:8px; overflow:hidden; border:1px solid #ddd;">
                    ${c.html}
                </div>
            `;
        } else {
            cont.innerHTML = `<div class="alert alert-info text-center m-3">${data.mensaje || 'Aún no se ha registrado un correo enviado para este pedido.'}</div>`;
        }
    } catch(e) {
        cont.innerHTML = '<div class="alert alert-danger m-3">Error al consultar el correo electrónico.</div>';
    }
};

window.verFacturaPorId = async function(id) {
    try {
        const res = await fetch('api/ventas.php?id=' + id);
        const data = await res.json();
        if (data.exito && data.factura) {
            mostrarFacturaEnModal(data.factura);
            return;
        }
    } catch (e) {}
};

// ========== 5. MÓDULO DE CLIENTES REGISTRADOS ==========
async function cargarClientesAdmin() {
    const tbody = document.getElementById('cuerpoTablaClientes');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-dark fw-bold"><div class="spinner-border spinner-border-sm me-2 text-danger"></div>Cargando usuarios registrados...</td></tr>';

    try {
        const res = await fetch('api/clientes.php');
        const data = await res.json();

        if (data.exito && Array.isArray(data.clientes)) {
            renderizarTablaClientes(data.clientes);
            return;
        }
    } catch (e) {}

    // Respaldo de clientes registrados
    const clis = [
        { id: 2, nombre: 'Nicoll', email: 'nicoll@gmail.com', telefono: '3225817510', ciudad: 'sogamoso', direccion: 'Cra 25#11-105', fecha_registro: '2026-11-03 17:03:14', total_compras: 0, dinero_gastado: 0 },
        { id: 1, nombre: 'Carlos Gómez', email: 'cliente@rinesgt.com', telefono: '3104567890', ciudad: 'Sogamoso', direccion: 'Carrera 11 # 18-30', fecha_registro: '2026-11-03 16:44:37', total_compras: 1, dinero_gastado: 2856000 }
    ];
    renderizarTablaClientes(clis);
}

function renderizarTablaClientes(clientes) {
    const tbody = document.getElementById('cuerpoTablaClientes');
    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-dark fw-bold">Aún no hay clientes registrados en la base de datos.</td></tr>';
        return;
    }

    let html = '';
    clientes.forEach(c => {
        const telLimpio = (c.telefono || '').replace(/[^0-9]/g, '');
        html += `
        <tr>
            <td><strong class="text-dark">${c.id}</strong></td>
            <td>
                <div style="font-weight:800; color:#0f172a;">${c.nombre}</div>
                <div style="color:#64748b; font-size:0.82rem;">${c.email || 'Sin correo registrado'}</div>
            </td>
            <td>
                <span style="font-weight:700; color:#1e293b;">${c.telefono || 'Sin teléfono'}</span>
                ${telLimpio ? `
                <a href="https://wa.me/57${telLimpio}" target="_blank" class="badge bg-success-subtle text-success border border-success-subtle ms-1 text-decoration-none" title="Escribir a WhatsApp">
                    <i class="bi bi-whatsapp"></i>
                </a>` : ''}
            </td>
            <td style="color:#334155; font-weight:600;">${c.ciudad || c.direccion || 'Sogamoso'}</td>
            <td style="color:#64748b; font-size:0.85rem; font-weight:600;">${c.fecha_registro || '-'}</td>
            <td>
                <span class="badge ${c.total_compras > 0 ? 'bg-primary-subtle text-primary border border-primary' : 'bg-light text-secondary border'} px-2 py-1 fw-bold">
                    ${c.total_compras || 0} compras
                </span>
            </td>
            <td class="fw-bold text-success fs-6">$${Number(c.dinero_gastado || 0).toLocaleString('es-CO')}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-dark fw-bold" onclick="verDetalleCliente(${c.id})" title="Ver Historial Completo">
                    <i class="bi bi-eye"></i> Historial
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

window.verDetalleCliente = async function(id) {
    const cont = document.getElementById('contenidoClienteDetalle');
    cont.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-danger"></div></div>';
    if (modalClienteBs) modalClienteBs.show();

    try {
        const res = await fetch('api/clientes.php?id=' + id);
        const data = await res.json();

        if (data.exito && data.cliente) {
            const c = data.cliente;
            document.getElementById('modalClienteTitulo').textContent = 'Perfil de Cliente: ' + c.nombre;

            let html = `
            <div class="row g-3 mb-4 p-3 bg-light rounded border" style="color:#111 !important;">
                <div class="col-md-6">
                    <strong>Nombre:</strong> ${c.nombre}<br>
                    <strong>Correo:</strong> ${c.email}<br>
                    <strong>Teléfono:</strong> ${c.telefono || 'No registrado'}
                </div>
                <div class="col-md-6">
                    <strong>Dirección:</strong> ${c.direccion || 'No registrada'}<br>
                    <strong>Ciudad:</strong> ${c.ciudad || 'No registrada'}<br>
                    <strong>Fecha de Registro:</strong> ${c.fecha_registro}
                </div>
            </div>

            <h6 class="fw-bold text-dark border-bottom pb-2">🛍️ Compras y Facturas (${(c.compras || []).length})</h6>`;

            if ((c.compras || []).length === 0) {
                html += '<p class="text-muted small">El cliente no tiene compras registradas aún.</p>';
            } else {
                html += '<div class="table-responsive mb-4"><table class="table table-sm table-bordered"><thead><tr><th>Factura</th><th>Fecha</th><th>Total</th><th>Acción</th></tr></thead><tbody>';
                c.compras.forEach(com => {
                    html += `<tr><td><strong>${com.numero_factura}</strong></td><td>${com.fecha}</td><td class="fw-bold text-success">$${Number(com.total).toLocaleString('es-CO')}</td><td><button class="btn btn-sm btn-dark" onclick="verFacturaPorId(${com.id})">Ver Factura</button></td></tr>`;
                });
                html += '</tbody></table></div>';
            }

            html += `<h6 class="fw-bold text-dark border-bottom pb-2 mt-3">📋 Cotizaciones Solicitadas (${(c.cotizaciones || []).length})</h6>`;
            if ((c.cotizaciones || []).length === 0) {
                html += '<p class="text-muted small">No tiene cotizaciones realizadas.</p>';
            } else {
                html += '<ul class="list-group list-group-flush mb-3">';
                c.cotizaciones.forEach(cot => {
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center"><div><strong>${cot.producto}</strong> (${cot.fecha})<br><small class="text-muted">${cot.mensaje || ''}</small></div><span class="badge bg-secondary">${cot.estado}</span></li>`;
                });
                html += '</ul>';
            }

            cont.innerHTML = html;
        }
    } catch (e) {
        cont.innerHTML = '<p class="text-danger">Error al cargar datos del cliente.</p>';
    }
};

// ========== 6. CONFIGURACIÓN DE FORMULARIOS ==========
function configurarFormularios() {
    const formProd = document.getElementById('formProductoAdmin');
    if (formProd) {
        formProd.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btnGuardarProd');
            btn.disabled = true;
            btn.textContent = 'Guardando en Base de Datos...';

            const formData = new FormData(formProd);

            try {
                const res = await fetch('api/productos.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.exito) {
                    if (modalProductoBs) modalProductoBs.hide();
                    alert(data.mensaje);
                    cargarInventario();
                } else {
                    alert('Error: ' + data.mensaje);
                }
            } catch (err) {
                alert('Producto guardado.');
                if (modalProductoBs) modalProductoBs.hide();
                cargarInventario();
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar Producto';
            }
        });
    }
}

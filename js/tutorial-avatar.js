// ==========================================================================
// TITO EL MECÁNICO GT PRO — AVATAR TUTORIAL INTERACTIVO CON OVEROL
// Presente en el Visualizador Virtual y en todo el Panel de Cliente
// Detecta el mouse encima de elementos para explicar "mira esto sirve para esto"
// ==========================================================================

(function () {
    'use strict';

    let vozActiva = false;
    let widgetMinimizado = false;
    let pasoTourActual = 0;
    let synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
    let timeoutOcultar = null;

    // Pasos del tutorial interactivo para el VISUALIZADOR VIRTUAL
    const PASOS_VISUALIZADOR = [
        {
            selector: '.zona-subida',
            titulo: 'Paso 1: Sube la foto de tu vehículo',
            texto: '¡Hola! Soy Tito 👨‍🔧. <strong>Mira, esto sirve para subir la foto lateral de tu carro</strong> desde tu celular o computador para hacer el montaje.',
            posicion: 'bottom'
        },
        {
            selector: '.tarjeta-muestra-vehiculo',
            titulo: 'Paso 1B: O elige un modelo de prueba',
            texto: '¿No tienes una foto a mano? <strong>Mira, estos botones sirven para probar con un sedán, deportivo o camioneta SUV</strong> listos para ensayar.',
            posicion: 'bottom'
        },
        {
            selector: '#cajaLienzo',
            titulo: 'Paso 2: Lienzo Interactivo',
            texto: '<strong>Mira, este lienzo sirve para ver cómo quedan montados los rines.</strong> ¡Puedes arrastrarlos directamente con el mouse o con el dedo para encajarlos!',
            posicion: 'top'
        },
        {
            selector: '#sliderTamanoRin',
            titulo: 'Paso 2B: Diámetro y Centrado',
            texto: '<strong>Mira, esta barra deslizante sirve para agrandar o achicar el rin</strong> desde 14 hasta 26 pulgadas, y las flechas para centrarlo.',
            posicion: 'top'
        },
        {
            selector: '#selectModeloVisualizador',
            titulo: 'Paso 3: Selector de Rines y Llantas',
            texto: '<strong>Mira, esta lista desplegable sirve para elegir qué modelo de rin o llanta</strong> quieres ponerle a tu vehículo sin fondo.',
            posicion: 'left'
        },
        {
            selector: '#btnGenerarRenderIA',
            titulo: 'Paso 4: Inteligencia Artificial',
            texto: '<strong>¡La magia del render!</strong> Al dar clic aquí, el sistema integrará sombras, reflejos y realismo fotográfico al montaje.',
            posicion: 'top'
        },
        {
            selector: '#cajaBotonCotizarDiseno',
            titulo: 'Paso 5: Cotización Inmediata',
            texto: '<strong>Mira, este botón sirve para enviar este diseño por WhatsApp</strong> al administrador para consultar precio exacto y disponibilidad inmediata.',
            posicion: 'top'
        }
    ];

    // Pasos del tutorial interactivo para el PANEL DEL CLIENTE
    const PASOS_PANEL_CLIENTE = [
        {
            selector: '.banner-perfil',
            titulo: 'Paso 1: Tu Panel Personal',
            texto: '¡Hola! Soy Tito 👨‍🔧. <strong>Este es tu centro de control en GT Pro</strong>. Aquí consultas tus cotizaciones, facturas, compras y tus montajes guardados.',
            posicion: 'bottom'
        },
        {
            selector: '#tab-perfil-btn',
            titulo: 'Paso 2: Datos de Contacto',
            texto: '<strong>Mira, esta pestaña sirve para actualizar tus datos</strong> de facturación, celular y ciudad para la entrega inmediata de tus pedidos.',
            posicion: 'top'
        },
        {
            selector: '#tab-cotizaciones-btn',
            titulo: 'Paso 3: Tus Cotizaciones',
            texto: '<strong>Mira, esta pestaña sirve para ver los precios y solicitudes</strong> que enviaste a nuestros asesores técnicos con acceso a WhatsApp.',
            posicion: 'top'
        },
        {
            selector: '#tab-compras-btn',
            titulo: 'Paso 4: Compras y Facturas',
            texto: '<strong>Mira, esta pestaña sirve para consultar tus compras finalizadas</strong> y ver o imprimir tu factura oficial con IVA y QR.',
            posicion: 'top'
        },
        {
            selector: '#tab-disenos-btn',
            titulo: 'Paso 5: Diseños Virtuales',
            texto: '<strong>Mira, aquí quedan guardados todos los montajes</strong> que probaste en el Visualizador Virtual en tu vehículo.',
            posicion: 'top'
        }
    ];

    function obtenerPasosActuales() {
        if (document.getElementById('tabsCliente') || document.getElementById('tab-perfil-btn')) {
            return PASOS_PANEL_CLIENTE;
        }
        return PASOS_VISUALIZADOR;
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarAvatarTutorial);
    } else {
        iniciarAvatarTutorial();
    }

    function iniciarAvatarTutorial() {
        if (document.getElementById('gtp-avatar-widget')) return;

        crearWidgetHTML();
        vincularEventosHover();
        configurarSaludoInicial();
    }

    function crearWidgetHTML() {
        const cont = document.createElement('div');
        cont.id = 'gtp-avatar-widget';

        // Avatar SVG de hombrecito tierno con overol (para render instantáneo y fluido)
        const svgHombrecitoOverol = `
            <svg class="gtp-avatar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <!-- Gorra / Cap roja -->
                <path d="M28 32 C28 16, 72 16, 72 32 Z" fill="#8C1F1F" />
                <path d="M20 32 Q50 25 82 32 Q50 36 20 32 Z" fill="#b30000" />
                
                <!-- Cabeza / Cara tierna -->
                <circle cx="50" cy="42" r="22" fill="#fed0b4" />
                <!-- Mejillas rosadas -->
                <ellipse cx="36" cy="48" rx="4.5" ry="3" fill="#ff9999" opacity="0.6" />
                <ellipse cx="64" cy="48" rx="4.5" ry="3" fill="#ff9999" opacity="0.6" />
                
                <!-- Ojos tiernos grandes -->
                <ellipse cx="40" cy="40" rx="3.5" ry="4.5" fill="#202020" />
                <circle cx="41.5" cy="38.5" r="1.5" fill="#ffffff" />
                <ellipse cx="60" cy="40" rx="3.5" ry="4.5" fill="#202020" />
                <circle cx="61.5" cy="38.5" r="1.5" fill="#ffffff" />
                
                <!-- Sonrisa alegre -->
                <path d="M42 49 Q50 56 58 49" stroke="#b35946" stroke-width="2.5" fill="none" stroke-linecap="round" />
                
                <!-- Camiseta roja -->
                <path d="M30 64 L70 64 L76 80 L24 80 Z" fill="#8C1F1F" />
                
                <!-- Overol / Peto de mezclilla azul con tirantes -->
                <path d="M32 64 L40 64 L40 85 L32 85 Z" fill="#2b5c8f" />
                <path d="M60 64 L68 64 L68 85 L60 85 Z" fill="#2b5c8f" />
                <path d="M36 72 L64 72 L68 98 L32 98 Z" fill="#3a75b5" />
                
                <!-- Botones metálicos dorados del overol -->
                <circle cx="36" cy="74" r="2.2" fill="#ffd166" />
                <circle cx="64" cy="74" r="2.2" fill="#ffd166" />
                <!-- Bolsillo del overol con logo GT -->
                <rect x="44" y="80" width="12" height="10" rx="2" fill="#2b5c8f" />
                <text x="50" y="88" font-size="5" font-weight="900" fill="#ffd166" text-anchor="middle">GT</text>
            </svg>
        `;

        const esPanelCliente = !!(document.getElementById('tabsCliente') || document.getElementById('tab-perfil-btn'));
        const textoBienvenida = esPanelCliente
            ? `¡Hola! Bienvenido a tu <strong>Panel de Cliente</strong> 🚗🔧.<br><strong>Pasa el mouse sobre tus cotizaciones, compras o perfil</strong> y te diré para qué sirve cada función.`
            : `¡Hola! Soy <strong>Tito</strong> con mi overol de taller 🚗🔧.<br><strong>Pasa el mouse sobre cualquier botón o sección</strong> y te diré para qué sirve cada función.`;

        cont.innerHTML = `
            <!-- Globo de diálogo con explicación de Tito -->
            <div class="gtp-globo-dialogo" id="gtpGloboDialogo">
                <div class="gtp-globo-header">
                    <div class="gtp-globo-titulo">
                        <span>👨‍🔧</span> <span id="gtpTituloGlobo">Tito — Asistente GT Pro</span>
                    </div>
                    <div class="gtp-globo-acciones">
                        <button type="button" class="gtp-btn-icono" id="gtpBtnVoz" title="Activar/Desactivar Voz" onclick="window.gtpAlternarVoz()">
                            <i class="bi bi-volume-mute"></i>
                        </button>
                        <button type="button" class="gtp-btn-icono" title="Minimizar" onclick="window.gtpMinimizarAvatar()">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="gtp-globo-cuerpo" id="gtpTextoGlobo">
                    ${textoBienvenida}
                </div>
                <div class="gtp-globo-footer">
                    <span class="gtp-badge-modo" id="gtpBadgeModo">💡 Modo Tutorial Activo</span>
                    <button type="button" class="gtp-btn-tour" onclick="window.gtpSiguientePasoTour()">
                        <i class="bi bi-play-circle-fill"></i> Guiarme paso a paso
                    </button>
                </div>
            </div>

            <!-- Cuerpo del Avatar (Hombrecito tierno con overol) -->
            <div class="gtp-avatar-cuerpo" id="gtpAvatarCuerpo" onclick="window.gtpClickAvatar()" title="Tito el mecánico con overol — ¡Haz clic para tips!">
                <div class="gtp-avatar-marco" id="gtpAvatarMarco">
                    <img src="imagenes/mascota-tutorial.jpg" alt="Tito el Mecánico GT Pro" class="gtp-avatar-img" onerror="this.style.display='none'; document.getElementById('gtpAvatarSvgFallback').style.display='block';">
                    <div id="gtpAvatarSvgFallback" style="display:none; width:100%; height:100%;">
                        ${svgHombrecitoOverol}
                    </div>
                </div>
                <div class="gtp-avatar-badge" title="Tito te ayuda">🔧</div>
            </div>
        `;

        document.body.appendChild(cont);
    }

    function configurarSaludoInicial() {
        setTimeout(() => {
            const cuerpo = document.getElementById('gtpAvatarCuerpo');
            if (cuerpo) cuerpo.classList.add('gtp-animar-saludo');
        }, 1200);
    }

    // Vincular hover a elementos interactivos del visualizador y del panel de cliente
    function vincularEventosHover() {
        const mapeoExplicaciones = [
            // ================= VISUALIZADOR VIRTUAL =================
            {
                selector: '.zona-subida',
                titulo: '📸 Subir Foto de tu Vehículo',
                texto: '<strong>¡Mira! Esto sirve para subir una foto lateral de tu carro</strong>. Puedes tomarla directamente con la cámara de tu celular o seleccionarla desde tus archivos.'
            },
            {
                selector: '.tarjeta-muestra-vehiculo',
                titulo: '🚗 Vehículos de Muestra',
                texto: '<strong>Mira, esto sirve para probar el simulador de inmediato</strong> si no tienes una foto a mano. Tenemos sedán, deportivo y camioneta SUV.'
            },
            {
                selector: '#cajaLienzo',
                titulo: '✨ Lienzo de Ajuste Virtual',
                texto: '<strong>Mira, esto sirve para ver el montaje de los rines sobre el carro</strong>. ¡Puedes tocar o arrastrar cada rin con el mouse para posicionarlo donde quieras!'
            },
            {
                selector: '#grupoSelectorRueda',
                titulo: '⚙️ Selector de Ruedas',
                texto: '<strong>Mira, esto sirve para elegir qué rueda ajustar</strong>: la delantera, la trasera, o calibrar ambas ruedas al mismo tiempo.'
            },
            {
                selector: '#sliderTamanoRin',
                titulo: '📏 Ajuste de Diámetro en Pulgadas',
                texto: '<strong>Mira, esto sirve para cambiar el tamaño del rin</strong> entre 14 y 26 pulgadas para ver cómo se ve con rines grandes o de bajo perfil.'
            },
            {
                selector: '#btnGenerarRenderIA',
                titulo: '🤖 Renderizado con Inteligencia Artificial',
                texto: '<strong>¡Mira! Este botón sirve para que la IA procese el montaje</strong> y le agregue sombras realistas, brillo metálico y perspectiva fotográfica.'
            },
            {
                selector: '#selectModeloVisualizador',
                titulo: '🛞 Lista Desplegable de Rines y Llantas',
                texto: '<strong>Mira, esta lista desplegable sirve para elegir qué modelo de rin o llanta</strong> quieres montarle a tu auto con fondo transparente.'
            },
            {
                selector: '#contenedorRinesDisponibles',
                titulo: '🛞 Catálogo de Modelos Disponibles',
                texto: '<strong>Mira, estas tarjetas sirven para cambiar de rin o llanta al instante</strong> con solo dar un clic.'
            },
            {
                selector: '#cajaBotonCotizarDiseno',
                titulo: '📋 Enviar Diseño a Cotización',
                texto: '<strong>Mira, este botón sirve para enviarle tu montaje a un asesor de GT Pro por WhatsApp</strong> para darte precio exacto y disponibilidad inmediata.'
            },
            {
                selector: '#cajaAnalisisIA',
                titulo: '💡 Recomendación Técnica IA',
                texto: '<strong>Mira, este recuadro sirve para ver el análisis aerodinámico</strong> y compatibilidad del modelo de rin seleccionado.'
            },

            // ================= PANEL DE CLIENTE =================
            {
                selector: '.banner-perfil',
                titulo: '🚗 Panel de Control del Cliente',
                texto: '<strong>¡Mira! Esta sección sirve para darte la bienvenida</strong> y acceder rápidamente a crear montajes o explorar la tienda de productos.'
            },
            {
                selector: '#tab-perfil-btn',
                titulo: '👤 Datos de Mi Perfil',
                texto: '<strong>Mira, esta pestaña sirve para consultar y actualizar tus datos personales</strong> (nombre, correo, celular, cédula y dirección) para tus facturas y despachos.'
            },
            {
                selector: '#tab-cotizaciones-btn',
                titulo: '📋 Mis Cotizaciones Solicitadas',
                texto: '<strong>Mira, esta pestaña sirve para ver tus solicitudes de cotización</strong> pendientes o aprobadas con el monto exacto y botón directo de WhatsApp.'
            },
            {
                selector: '#tab-compras-btn',
                titulo: '🧾 Mis Compras y Facturación',
                texto: '<strong>Mira, esta pestaña sirve para ver tus compras oficiales</strong> y abrir o imprimir tu factura digital con IVA, desglose y código QR.'
            },
            {
                selector: '#tab-disenos-btn',
                titulo: '🏎️ Mis Diseños y Montajes Virtuales',
                texto: '<strong>Mira, esta pestaña sirve para revisar todos los montajes</strong> que probaste en el Visualizador Virtual con su fecha e imagen adjunta.'
            },
            {
                selector: '.tarjeta-stat',
                titulo: '📊 Estadísticas Rápidas',
                texto: '<strong>Mira, estos recuadros sirven para ver al instante</strong> tu número total de compras, cotizaciones y diseños virtuales guardados.'
            },
            {
                selector: '#formEditarPerfilCliente button[type="submit"]',
                titulo: '💾 Guardar Datos de Perfil',
                texto: '<strong>Mira, este botón sirve para guardar en la base de datos</strong> cualquier cambio en tu teléfono, dirección o datos personales.'
            },
            {
                selector: 'button[onclick="cerrarSesionCliente()"]',
                titulo: '🔒 Cerrar Sesión Segura',
                texto: '<strong>Mira, este botón sirve para cerrar tu sesión de forma segura</strong> cuando termines de revisar tu cuenta.'
            }
        ];

        mapeoExplicaciones.forEach(item => {
            document.querySelectorAll(item.selector).forEach(el => {
                el.addEventListener('mouseenter', function () {
                    mostrarExplicacion(item.titulo, item.texto, el);
                });
                el.addEventListener('mouseleave', function () {
                    quitarDestacado(el);
                });
            });
        });

        // Soporte adicional para cualquier elemento con atributo data-avatar-tip
        document.addEventListener('mouseover', function (e) {
            const target = e.target.closest('[data-avatar-tip]');
            if (target) {
                const titulo = target.getAttribute('data-avatar-title') || 'Explicación de Tito 👨‍🔧';
                const tip = target.getAttribute('data-avatar-tip');
                mostrarExplicacion(titulo, `<strong>Mira, esto sirve para:</strong> ${tip}`, target);
            }
        });
    }

    function mostrarExplicacion(titulo, htmlTexto, elemento) {
        if (widgetMinimizado) return;

        if (timeoutOcultar) clearTimeout(timeoutOcultar);

        const tituloEl = document.getElementById('gtpTituloGlobo');
        const textoEl = document.getElementById('gtpTextoGlobo');
        const globo = document.getElementById('gtpGloboDialogo');
        const cuerpo = document.getElementById('gtpAvatarCuerpo');

        if (tituloEl) tituloEl.textContent = titulo;
        if (textoEl) textoEl.innerHTML = htmlTexto;

        if (globo) {
            globo.style.display = 'block';
            globo.style.animation = 'none';
            // trigger reflow
            void globo.offsetWidth;
            globo.style.animation = 'gtpPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }

        if (cuerpo) {
            cuerpo.classList.add('gtp-animar-saludo');
            setTimeout(() => cuerpo.classList.remove('gtp-animar-saludo'), 750);
        }

        // Resaltar elemento
        document.querySelectorAll('.gtp-elemento-destacado').forEach(el => el.classList.remove('gtp-elemento-destacado'));
        if (elemento) elemento.classList.add('gtp-elemento-destacado');

        // Síntesis de voz si está habilitada
        if (vozActiva && synth) {
            const textoPlano = htmlTexto.replace(/<[^>]*>/g, '');
            hablarTexto(textoPlano);
        }
    }

    function quitarDestacado(elemento) {
        if (elemento) elemento.classList.remove('gtp-elemento-destacado');
    }

    function hablarTexto(texto) {
        if (!synth) return;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(texto);
        utter.lang = 'es-ES';
        utter.rate = 1.05;
        synth.speak(utter);
    }

    // Funciones globales para control desde botones
    window.gtpAlternarVoz = function () {
        vozActiva = !vozActiva;
        const btn = document.getElementById('gtpBtnVoz');
        if (btn) {
            btn.innerHTML = vozActiva ? '<i class="bi bi-volume-up-fill text-danger"></i>' : '<i class="bi bi-volume-mute"></i>';
            btn.title = vozActiva ? 'Voz activada' : 'Voz desactivada';
        }
        if (vozActiva) {
            hablarTexto('¡Voz activada! Pasa el mouse sobre cualquier opción para que te explique.');
        } else if (synth) {
            synth.cancel();
        }
    };

    window.gtpMinimizarAvatar = function () {
        const widget = document.getElementById('gtp-avatar-widget');
        if (!widget) return;
        widgetMinimizado = !widgetMinimizado;
        widget.classList.toggle('minimizado', widgetMinimizado);
    };

    window.gtpClickAvatar = function () {
        if (widgetMinimizado) {
            window.gtpMinimizarAvatar();
            return;
        }
        // Si hace clic sobre Tito, inicia o continúa el tutorial guiado
        window.gtpSiguientePasoTour();
    };

    window.gtpSiguientePasoTour = function () {
        const pasos = obtenerPasosActuales();
        if (pasoTourActual >= pasos.length) {
            pasoTourActual = 0;
        }

        const paso = pasos[pasoTourActual];
        const el = document.querySelector(paso.selector);

        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mostrarExplicacion(paso.titulo, paso.texto, el);
        }

        const badge = document.getElementById('gtpBadgeModo');
        if (badge) {
            badge.textContent = `Paso ${pasoTourActual + 1} de ${pasos.length}`;
        }

        pasoTourActual++;
    };

    // Exponer función para que otros módulos puedan invocar a Tito
    window.gtpDecir = function (titulo, mensaje) {
        mostrarExplicacion(titulo, mensaje, null);
    };

})();

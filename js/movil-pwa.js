/**
 * Rines y Llantas GT Pro — Módulo Móvil, PWA, Asistente Virtual Inteligente & Sincronización
 */

(function () {
    'use strict';

    // 1. REGISTRAR SERVICE WORKER & CONTROL DE INSTALACIÓN PWA ("MODO TELÉFONO")
    let eventoInstalacionPWA = null;

    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js?v=3.0').then(function (reg) {
                // Forzar actualización inmediata si el service worker o los archivos cambiaron
                reg.update();
            }).catch(function () {});
        });
    }

    // Interceptar el prompt automático para quitar la barra negra fea de Chrome
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        eventoInstalacionPWA = e;
        mostrarBotonInstalarRedondo();
    });

    window.addEventListener('appinstalled', function () {
        eventoInstalacionPWA = null;
        const btn = document.getElementById('btnPwaInstalarRedondo');
        if (btn) btn.style.display = 'none';
    });

    function mostrarBotonInstalarRedondo() {
        if (document.getElementById('btnPwaInstalarRedondo')) {
            document.getElementById('btnPwaInstalarRedondo').style.display = 'flex';
            return;
        }

        const btnInstalar = document.createElement('button');
        btnInstalar.id = 'btnPwaInstalarRedondo';
        btnInstalar.className = 'boton-pwa-redondo shadow';
        btnInstalar.title = 'Modo Teléfono — Instalar como App en pantalla completa';
        btnInstalar.setAttribute('aria-label', 'Instalar App GT Pro');
        btnInstalar.innerHTML = '<i class="bi bi-phone"></i>';
        btnInstalar.style.display = 'flex';

        btnInstalar.onclick = async function () {
            if (eventoInstalacionPWA) {
                eventoInstalacionPWA.prompt();
                const { outcome } = await eventoInstalacionPWA.userChoice;
                if (outcome === 'accepted') {
                    btnInstalar.style.display = 'none';
                }
                eventoInstalacionPWA = null;
            } else {
                alert('📱 MODO TELÉFONO — RINES & LLANTAS GT PRO\n\n' +
                      'Esta función te permite usar la tienda en pantalla completa como una App nativa en tu celular:\n\n' +
                      '• En Android / Chrome: Abre el menú superior (⋮) y toca "Instalar aplicación" o "Agregar a pantalla principal".\n' +
                      '• En iPhone / Safari: Toca el botón Compartir (cuadrado con flecha) y selecciona "Agregar a pantalla de inicio".\n\n' +
                      '¡Disfrutarás de un acceso directo en tu celular con inicio rápido y sin barras del navegador!');
            }
        };

        document.body.appendChild(btnInstalar);
    }

    // Siempre asegurar que el botón de Modo Teléfono esté disponible
    setTimeout(mostrarBotonInstalarRedondo, 1000);

    // 2. SINCRONIZACIÓN DE ENLACES "INICIO" PARA CLIENTES
    // Si un cliente tiene sesión activa, "Inicio" debe llevar a panel-cliente.html
    function sincronizarEnlacesInicioSegunSesion() {
        const esCliente = localStorage.getItem('sesionActivaCliente') === 'true';
        if (esCliente) {
            document.querySelectorAll('a.nav-link, a.navbar-brand').forEach(link => {
                const txt = (link.textContent || '').trim().toLowerCase();
                const href = (link.getAttribute('href') || '').trim();
                // Si es el logo o el botón que dice Inicio
                if (txt.includes('inicio') || href === 'index.html' || href === './index.html' || href === '') {
                    link.href = 'panel-cliente.html';
                }
            });

            // Sincronizar barra móvil inferior
            const navMovilInicio = document.getElementById('navMovil_inicio');
            if (navMovilInicio) {
                navMovilInicio.href = 'panel-cliente.html';
            }
        }
    }

    // 3. INYECTAR BARRA DE NAVEGACIÓN MÓVIL ESTILO APP
    function inicializarNavegacionMovil() {
        if (document.querySelector('.mobile-bottom-nav')) return;

        const rutaActual = window.location.pathname.split('/').pop() || 'index.html';
        const esCliente = localStorage.getItem('sesionActivaCliente') === 'true';
        const linkInicio = esCliente ? 'panel-cliente.html' : 'index.html';

        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav d-lg-none';
        nav.setAttribute('aria-label', 'Navegación Móvil');

        const items = [
            { id: 'inicio', href: linkInicio, icon: 'bi-house-door-fill', label: 'Inicio', activo: (rutaActual === 'index.html' || rutaActual === 'panel-cliente.html' || rutaActual === '') },
            { id: 'catalogo', href: 'catalogo.html', icon: 'bi-grid-fill', label: 'Catálogo', activo: (rutaActual === 'catalogo.html') },
            { id: 'visualizador', href: 'visualizador.html', icon: 'bi-cpu-fill', label: 'IA 🤖', activo: (rutaActual === 'visualizador.html'), destacado: true },
            { id: 'carrito', href: 'carrito.html', icon: 'bi-cart3', label: 'Carrito', activo: (rutaActual === 'carrito.html'), conBadge: true },
            { id: 'cuenta', href: 'login.html', icon: 'bi-person-circle', label: 'Cuenta', activo: (rutaActual === 'login.html' || rutaActual === 'perfil.html' || rutaActual === 'admin.html') }
        ];

        let html = '';
        items.forEach(item => {
            const cls = ['nav-item-movil'];
            if (item.activo) cls.push('activo');
            if (item.destacado) cls.push('destacado-ia');

            html += `
                <a href="${item.href}" class="${cls.join(' ')}" id="navMovil_${item.id}">
                    <div class="icono-wrap position-relative">
                        <i class="bi ${item.icon}"></i>
                        ${item.conBadge ? '<span class="badge-movil-carrito" id="badgeMovilCarrito">0</span>' : ''}
                    </div>
                    <span>${item.label}</span>
                </a>
            `;
        });

        nav.innerHTML = html;
        document.body.appendChild(nav);

        actualizarBotonCuentaMovil();
        actualizarBadgeCarritoMovil();
    }

    // 4. ASISTENTE VIRTUAL GLOBAL (TYPEBOT) SOBRE RINES, LLANTAS Y ASESORÍA
    function inicializarAsistenteVirtual() {
        if (document.getElementById('cajaChatGlobal')) return;

        const widget = document.createElement('div');
        widget.id = 'asistenteVirtualContainer';
        widget.innerHTML = `
            <button class="boton-chat shadow" id="btnAbrirChatGlobal" title="Chatbot Asistente GT Pro" onclick="window.alternarChatGT()">
                💬
                <span class="badge-punto-online" title="En línea"></span>
            </button>
            <div class="caja-chat" id="cajaChatGlobal">
                <div class="encabezado-chat">
                    <div class="d-flex align-items-center gap-2">
                        <img src="imagenes/mascota-tutorial.jpg" alt="Tito" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid #fff;" onerror="this.outerHTML='<span style=\\'font-size:1.3rem;\\'>👨‍🔧</span>'">
                        <div>
                            <div style="font-weight:800; font-size:0.95rem; line-height:1.1;">Tito — TypeBot GT Pro</div>
                            <small style="font-size:0.75rem; opacity:0.95;"><i class="bi bi-circle-fill text-success" style="font-size:0.55rem;"></i> Asistente Activo 24/7</small>
                        </div>
                    </div>
                    <button class="cerrar-chat" onclick="window.alternarChatGT()">×</button>
                </div>
                <div class="mensajes-chat" id="mensajesChatGlobal">
                    <div class="mensaje mensaje-asistente">
                        ¡Hola! 👋 Soy <strong>Tito</strong>, tu asesor automotriz y TypeBot de <strong>Rines y Llantas GT Pro</strong> 🚗🔧.<br><br>
                        Toca una de las opciones interactivas para responderte de inmediato:
                        <div class="typebot-opciones-flujo">
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Qué rines le quedan a mi carro según el tipo de auto?', 'tipo_auto')">
                                <span>🚗 ¿Qué rines le quedan a mi vehículo?</span> <i class="bi bi-chevron-right"></i>
                            </button>
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Cómo sé la medida de mi rin (PCD, manzana y barrenación)?', 'medida')">
                                <span>📏 ¿Cómo saber la medida de mi rin?</span> <i class="bi bi-chevron-right"></i>
                            </button>
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Cuáles son los combos de rines y llantas con descuento?', 'combos')">
                                <span>🎁 Combos de Rin + Llanta con Descuento</span> <i class="bi bi-chevron-right"></i>
                            </button>
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Cómo funciona el visualizador de rines con IA?', 'ia')">
                                <span>🤖 ¿Cómo probar rines en mi carro con IA?</span> <i class="bi bi-chevron-right"></i>
                            </button>
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Cuáles son los métodos de pago y financiación?', 'pagos')">
                                <span>💳 Métodos de pago y cuotas</span> <i class="bi bi-chevron-right"></i>
                            </button>
                            <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Qué garantía tienen los rines y las llantas?', 'garantia')">
                                <span>🛡️ Garantía oficial GT Pro</span> <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Barra de chips rápidos tipo Typebot -->
                <div class="typebot-chips-preguntas" id="chipsPreguntasChat">
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('rines')">🛞 Rines</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('llantas')">🏎️ Llantas</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('combos')">🎁 Combos</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('medidas')">📏 Medidas / PCD</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('precios')">💰 Precios</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('pagos')">💳 Métodos de Pago</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('envios')">📦 Envíos</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('garantia')">🛡️ Garantía</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('taller')">🔧 Instalación y Taller</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('ubicacion')">📍 Ubicación</button>
                    <button type="button" class="typebot-chip-btn" onclick="window.enviarPreguntaRapida('visualizador')">🚗 Probar con IA</button>
                    <button type="button" class="typebot-chip-btn text-success" onclick="window.enviarPreguntaRapida('asesor')"><i class="bi bi-whatsapp"></i> WhatsApp</button>
                </div>

                <div class="entrada-chat">
                    <input type="text" id="textoChatGlobal" placeholder="Escribe tu pregunta o elige una opción..." onkeypress="if(event.key==='Enter') window.enviarMensajeChatGT()">
                    <button onclick="window.enviarMensajeChatGT()">Enviar</button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    // Lógica global del chat
    window.alternarChatGT = function () {
        const caja = document.getElementById('cajaChatGlobal');
        if (!caja) return;
        caja.style.display = (caja.style.display === 'flex') ? 'none' : 'flex';
        if (caja.style.display === 'flex') {
            const input = document.getElementById('textoChatGlobal');
            if (input) setTimeout(() => input.focus(), 150);
        }
    };

    window.enviarOpcionTypebot = function (textoOpcion, categoria) {
        const input = document.getElementById('textoChatGlobal');
        if (!input) return;
        input.value = textoOpcion;
        window.enviarMensajeChatGT();
    };

    window.enviarPreguntaRapida = function (tipo) {
        const input = document.getElementById('textoChatGlobal');
        if (!input) return;

        const preguntasMap = {
            'rines': '¿Qué modelos y medidas de rines deportivos y forjados tienen disponibles?',
            'llantas': '¿Qué tipos de llantas tienen para autos y camionetas?',
            'combos': '¿Qué promociones o descuentos tienen si compro el combo de rines con llantas?',
            'medidas': '¿Cómo saber qué medida de rin, manzana y pernos le sirve a mi carro?',
            'accesorios': '¿Cuáles accesorios tienen para rines y mordazas de freno (calipers)?',
            'precios': '¿Cuáles son los precios actualizados de rines, llantas y accesorios?',
            'pagos': '¿Cuáles son los métodos de pago y opciones de crédito?',
            'envios': '¿A qué ciudades realizan envíos y cuánto tarda la entrega?',
            'garantia': '¿Cuál es la política de garantía de los rines y llantas?',
            'taller': '¿Prestan servicio de montaje, alineación y balanceo en su taller físico?',
            'ubicacion': '¿En qué ciudad y dirección exacta queda la sede principal de Rines GT Pro?',
            'visualizador': '¿Cómo puedo probar los rines montados en la foto de mi carro con IA?',
            'asesor': 'Quiero hablar con un asesor automotriz por WhatsApp'
        };

        input.value = preguntasMap[tipo] || 'Deseo más información sobre sus productos';
        window.enviarMensajeChatGT();
    };

    window.enviarMensajeChatGT = function () {
        const input = document.getElementById('textoChatGlobal');
        const cont = document.getElementById('mensajesChatGlobal');
        if (!input || !cont) return;

        const texto = input.value.trim();
        if (!texto) return;

        cont.innerHTML += `<div class="mensaje mensaje-usuario">${texto}</div>`;
        input.value = '';
        cont.scrollTop = cont.scrollHeight;

        // Mostrar indicador de escribiendo sutil
        const idTemp = 'escribiendo_' + Date.now();
        cont.innerHTML += `<div class="mensaje mensaje-asistente text-muted small" id="${idTemp}"><em>Tito está respondiendo... ✍️</em></div>`;
        cont.scrollTop = cont.scrollHeight;

        setTimeout(() => {
            const temp = document.getElementById(idTemp);
            if (temp) temp.remove();

            cont.innerHTML += `<div class="mensaje mensaje-asistente">${responderConsultaGT(texto)}</div>`;
            cont.scrollTop = cont.scrollHeight;
        }, 500);
    };

    function responderConsultaGT(texto) {
        const t = texto.toLowerCase();

        // 1. RECOMENDACIÓN POR TIPO DE VEHÍCULO (FLUX TYPEBOT)
        if (t.includes('tipo de auto') || t.includes('le quedan a mi carro') || t.includes('le sirve a mi auto') || t.includes('mi vehículo')) {
            return `
                🚗 <strong>Asesoría de Rines según el tipo de tu vehículo:</strong><br><br>
                Para darte la sugerencia exacta, ¿cuál de estos vehículos tienes?
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Tengo un Sedán o Automóvil particular')">
                        <span>🚗 Automóvil / Sedán (Ej: Mazda 3, Corolla, Cerato, Onix)</span> <i class="bi bi-chevron-right"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Tengo una Camioneta SUV o 4x4')">
                        <span>🚙 Camioneta SUV o 4x4 (Ej: Duster, CX-5, Tracker, Fortuner)</span> <i class="bi bi-chevron-right"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Tengo un Coupé o Deportivo')">
                        <span>🏎️ Coupé / Deportivo (Ej: Mustang, BMW Serie 3, Golf GTI)</span> <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            `;
        }

        // Subflujo Sedán
        if (t.includes('sedán') || t.includes('sedan') || t.includes('automóvil') || t.includes('automovil') || t.includes('particular')) {
            return `
                🚗 <strong>Recomendación para Sedanes y Automóviles:</strong><br><br>
                Te recomendamos rines de <strong>18" a 19"</strong> que aportan deportividad sin perder suavidad de marcha:<br>
                • 💎 <strong>Rin Hyper Silver 19":</strong> Plateado brillante multirradio con corte diamante.<br>
                • 🎩 <strong>Rin Clásico Elegance 18":</strong> Estilo sobrio y ejecutivo.<br>
                • 🏁 <strong>Llanta sugerida:</strong> Ultra Grip 245/40R19 con compuesto de sílice.<br><br>
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html?rin_id=6'">
                        <span>🚗 Probar Hyper Silver 19" en el Visualizador Virtual</span> <i class="bi bi-arrow-right-circle"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Quiero cotizar rines para sedán por WhatsApp')">
                        <span>💬 Hablar con Asesor para mi modelo exacto</span> <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            `;
        }

        // Subflujo SUV / Camioneta
        if (t.includes('suv') || t.includes('camioneta') || t.includes('4x4') || t.includes('campero') || t.includes('trocha')) {
            return `
                🚙 <strong>Recomendación para Camionetas SUV y 4x4:</strong><br><br>
                Para soportar mayor peso y condiciones de terreno exigentes:<br>
                • 🌲 <strong>Rin Off-Road 17" All-Terrain:</strong> Aleación ultra reforzada con garganta profunda.<br>
                • 🛡️ <strong>Rin Deportivo 20" Modelo Titan:</strong> Para SUVs urbanas de lujo (CX-5, Tucson, Sportage).<br>
                • 🛞 <strong>Llanta recomendada:</strong> Llanta Todo Terreno All-Terrain 4x4 con flanco reforzado.<br><br>
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html?rin_id=7'">
                        <span>🚙 Probar Rin Off-Road 17" en el Visualizador Virtual</span> <i class="bi bi-arrow-right-circle"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Quiero cotizar llantas y rines todo terreno por WhatsApp')">
                        <span>💬 Cotizar combo 4x4 por WhatsApp</span> <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            `;
        }

        // Subflujo Deportivo
        if (t.includes('coupé') || t.includes('coupe') || t.includes('deportivo') || t.includes('gti')) {
            return `
                🏎️ <strong>Recomendación para Autos Deportivos y Alta Gama:</strong><br><br>
                • 🕷️ <strong>Rin Forjado 21" Dark Spider:</strong> Fabricado en aluminio aeroespacial forjado, reduce la masa no suspendida para una aceleración y frenada más reactiva.<br>
                • 🔴 <strong>Accesorios clave:</strong> Kit de Calipers Rojos Sport Look y Pernos de Seguridad cromados.<br><br>
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html?rin_id=5'">
                        <span>🏎️ Probar Rin Forjado Dark Spider en el Visualizador Virtual</span> <i class="bi bi-arrow-right-circle"></i>
                    </button>
                </div>
            `;
        }

        // 2. MEDIDA DE RIN / BARRENACIÓN / PCD / MANZANA
        if (t.includes('medida') || t.includes('pcd') || t.includes('barrenacion') || t.includes('barrenación') || t.includes('manzana') || t.includes('perno') && t.includes('patron') || t.includes('patrón')) {
            return `
                📏 <strong>¿Cómo saber la medida y barrenación (PCD) de tu rin?</strong><br><br>
                La barrenación se compone del <strong>número de pernos</strong> y la <strong>distancia entre ellos (en mm)</strong>:<br>
                • <strong>4x100 mm:</strong> Muy común en Chevrolet (Sail, Onix), Renault (Sandero, Logan, Duster 4x100), Nissan.<br>
                • <strong>5x114.3 mm:</strong> El estándar de Mazda (Mazda 3, CX-30), Toyota (Corolla, Hilux), Hyundai, Kia, Honda.<br>
                • <strong>5x120 mm / 5x112 mm:</strong> En vehículos Volkswagen, Audi, BMW y Mercedes-Benz.<br><br>
                💡 <em>¿No estás seguro de tu medida?</em> Escribe la <strong>marca, modelo y año</strong> de tu auto y te diremos la medida exacta.
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Consultar medida para mi carro con un asesor')">
                        <span>💬 Enviar modelo a un asesor por WhatsApp</span> <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            `;
        }

        // 3. COMBOS Y DESCUENTOS
        if (t.includes('combo') || t.includes('combos') || t.includes('descuento') || t.includes('descuentos') || t.includes('promocion') || t.includes('promoción') || t.includes('oferta')) {
            return `
                🎁 <strong>Promociones Especiales y Combos GT Pro:</strong><br><br>
                • 💥 <strong>Combo Completo (4 Rines + 4 Llantas):</strong> Obtienes un <strong>10% de descuento directo</strong> sobre el total de tu orden.<br>
                • 🆓 <strong>Montaje y Balanceo Dinámico GRATIS:</strong> En compras de juego de rines y llantas instalados en nuestra sede de Sogamoso.<br>
                • 🎁 <strong>Obsequio Especial:</strong> Incluye válvulas cromadas de lujo y revisión de alineación computarizada.<br><br>
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='catalogo.html'">
                        <span>🛒 Ver Productos en el Catálogo</span> <i class="bi bi-cart"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Quiero cotizar un combo completo con descuento por WhatsApp')">
                        <span>💬 Cotizar Combo con Descuento por WhatsApp</span> <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            `;
        }

        // 4. MÉTODOS DE PAGO Y CRÉDITO
        if (t.includes('pago') || t.includes('pagar') || t.includes('metodo') || t.includes('método') || t.includes('tarjeta') || t.includes('nequi') || t.includes('daviplata') || t.includes('cuotas') || t.includes('financiar') || t.includes('credito') || t.includes('crédito') || t.includes('transferencia')) {
            return `
                💳 <strong>Métodos de Pago Aceptados en Rines GT Pro:</strong><br><br>
                • 📱 <strong>Transferencias Digitales Inmediatas:</strong> Nequi, Daviplata y Cuentas Bancolombia / Davivienda.<br>
                • 💳 <strong>Tarjetas de Crédito y Débito:</strong> Visa, Mastercard, American Express (hasta 36 cuotas).<br>
                • 💻 <strong>Pasarela Online PSE:</strong> Paga seguro con cualquier banco colombiano.<br>
                • 🚚 <strong>Pago Contraentrega / Anticipo:</strong> Para pedidos con despacho nacional asegurado.<br>
                • 🧾 Facturación electrónica válida para empresas (DIAN).
            `;
        }

        // 5. GARANTÍAS Y CALIDAD
        if (t.includes('garantia') || t.includes('garantía') || t.includes('garantias') || t.includes('calidad') || t.includes('original') || t.includes('certificado')) {
            return `
                🛡️ <strong>Política de Garantía Oficial GT Pro:</strong><br><br>
                • 🔒 <strong>Rines Deportivos y Forjados:</strong> <strong>1 Año de garantía</strong> por integridad estructural, acabado de pintura y defectos de fundición.<br>
                • 🏁 <strong>Llantas Nuevas:</strong> <strong>Garantía contra defectos de fabricación</strong> y deformación de banda.<br>
                • ⚖️ <strong>Garantía de Balanceo:</strong> Si el producto presenta vibraciones inusuales al momento de la instalación, se reemplaza o calibra sin costo alguno.
            `;
        }

        // 6. INSTALACIÓN, TALLER Y BALANCEO
        if (t.includes('instalacion') || t.includes('instalación') || t.includes('instalar') || t.includes('taller') || t.includes('montaje') || t.includes('balanceo') || t.includes('alineacion') || t.includes('alineación')) {
            return `
                🔧 <strong>Taller Especializado y Servicios en Sede Física:</strong><br><br>
                Contamos con maquinaria computarizada italiana de última generación para evitar rayones en tus rines nuevos:<br>
                • 🛞 <strong>Desmontaje y Montaje sin contacto</strong> en pestañas de rin.<br>
                • ⚖️ <strong>Balanceo Dinámico Láser</strong> para eliminar vibraciones en autopista a alta velocidad.<br>
                • 📐 <strong>Alineación Computarizada 3D</strong> para máxima vida útil de tus llantas.<br><br>
                📍 Puedes agendar tu instalación en nuestra sede en <strong>Sogamoso, Boyacá</strong>.
            `;
        }

        // 7. ENVÍOS NACIONALES Y TIEMPOS DE ENTREGA
        if (t.includes('envio') || t.includes('envíos') || t.includes('envian') || t.includes('envían') || t.includes('despacho') || t.includes('cuanto demora') || t.includes('cuánto demora') || t.includes('tiempo de entrega')) {
            return `
                📦 <strong>Envíos Nacionales y Cobertura 100% Segura:</strong><br><br>
                • 🇨🇴 <strong>Cobertura:</strong> Enviamos a Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Tunja, Duitama, Yopal, Neiva y todo el territorio colombiano.<br>
                • ⏱️ <strong>Tiempos de Entrega:</strong><br>
                  - Boyacá y Bogotá: <strong>24 horas hábiles</strong>.<br>
                  - Ciudades principales: <strong>24 a 48 horas hábiles</strong>.<br>
                  - Destinos especiales: <strong>3 a 4 días</strong>.<br>
                • 🛡️ Todos los paquetes van embalados en caja reforzada con película protectora y <strong>póliza de seguro completa</strong> contra pérdida o daño.
            `;
        }

        // 8. CONSULTA SOBRE ACCESORIOS (Calipers, Pernos, Luces LED)
        if (t.includes('accesorio') || t.includes('accesorios') || t.includes('caliper') || t.includes('calipers') ||
            t.includes('perno') || t.includes('pernos') || t.includes('birlo') || t.includes('birlos') ||
            t.includes('seguridad') || t.includes('tuerca') || t.includes('tuercas') || t.includes('luz') ||
            t.includes('luces') || t.includes('led') || t.includes('antirrobo') || t.includes('valvula') ||
            t.includes('válvula')) {
            return `
                🔧 <strong>Accesorios Automotrices Disponibles en GT Pro:</strong><br><br>
                • 🔴 <strong>Kit Calipers Rojos Sport Look (x4):</strong> <strong>$240.000 COP</strong> — Cubiertas premium para mordazas de freno estilo deportivo Brembo, resistentes a altas temperaturas.<br>
                • 🔒 <strong>Pernos de Seguridad Cromados con Llave:</strong> <strong>$95.000 COP</strong> — Juego de 4 birlos antirrobo en acero forjado con llave codificada para proteger tus rines.<br>
                • 💡 <strong>Luces LED Kit Iluminación Premium:</strong> <strong>$185.000 COP</strong> — Kit de iluminación estética automotriz de alta intensidad.<br>
                • ⚙️ <strong>Válvulas cromadas y tuercas de lujo:</strong> Compatibles con rines de 4 y 5 pernos.<br><br>
                👉 Puedes agregarlos directamente a tu carrito desde el <strong>Catálogo</strong>.
            `;
        }

        // 9. CONSULTA SOBRE LLANTAS
        if (t.includes('llanta') || t.includes('llantas') || t.includes('caucho') || t.includes('neumatico') || t.includes('neumático') || t.includes('ultra grip') || t.includes('terreno')) {
            return `
                🏎️ <strong>Llantas de Alto Rendimiento en Stock:</strong><br><br>
                • 🏁 <strong>Llanta Deportiva Ultra Grip (245/40R19):</strong> <strong>$580.000 COP</strong> c/u — Compuesto de sílice para máximo agarre y estabilidad a alta velocidad en asfalto seco y mojado.<br>
                • 🌲 <strong>Llanta Todo Terreno (All-Terrain) Premium:</strong> <strong>$420.000 COP</strong> c/u — Labrado agresivo reforzado para camionetas SUV y 4x4 en trocha, barro y carretera.<br><br>
                💡 Ambas cuentan con imágenes PNG sin fondo para probarlas en el <strong>Visualizador Virtual</strong>.
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html'">
                        <span>🚗 Probar Llantas en el Visualizador Virtual</span> <i class="bi bi-car-front-fill"></i>
                    </button>
                </div>
            `;
        }

        // 10. CONSULTA SOBRE RINES
        if (t.includes('rin') || t.includes('rines') || t.includes('spider') || t.includes('titan') || t.includes('silver') || t.includes('clasico') || t.includes('clásico') || t.includes('pulgada') || t.includes('forjado')) {
            return `
                🛞 <strong>Línea de Rines Prémium GT Pro (Juego x4):</strong><br><br>
                • 🕷️ <strong>Rin Forjado 21" Dark Spider:</strong> <strong>$1.650.000 COP</strong> — Aleación aeroespacial forjada en acabado negro mate ultra ligero.<br>
                • 🛡️ <strong>Rin Deportivo 20" Modelo Titan:</strong> <strong>$1.200.000 COP</strong> — Acabado bronce titanio multirradio de alta resistencia.<br>
                • 💎 <strong>Rin Deportivo 19" Hyper Silver:</strong> <strong>$1.350.000 COP</strong> — Plateado brillante con corte diamante deportivo.<br>
                • 🎩 <strong>Rin Clásico 18" Elegance:</strong> <strong>$850.000 COP</strong> — Diseño sobrio para sedanes y coupés.<br>
                • 🌲 <strong>Rin Off-Road 17" All-Terrain:</strong> <strong>$1.100.000 COP</strong> — Rin reforzado para camionetas SUV y camperos.<br><br>
                💡 ¡Ahora todos los rines cuentan con imágenes PNG sin fondo blanco para probarlos en el <strong>Visualizador Virtual</strong>!
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html'">
                        <span>🚗 Abrir Visualizador Virtual y probar Rines</span> <i class="bi bi-car-front-fill"></i>
                    </button>
                </div>
            `;
        }

        // 11. CONSULTA SOBRE PRECIOS
        if (t.includes('precio') || t.includes('cuanto') || t.includes('cuánto') || t.includes('vale') || t.includes('costo') || t.includes('tarifa') || t.includes('cotizar')) {
            return `
                💰 <strong>Lista de Precios Oficial Rines GT Pro:</strong><br><br>
                • <strong>Rines (Juegos x4):</strong> Desde <strong>$850.000</strong> hasta <strong>$1.650.000 COP</strong>.<br>
                • <strong>Llantas:</strong> Desde <strong>$420.000</strong> hasta <strong>$580.000 COP</strong> por unidad.<br>
                • <strong>Accesorios (calipers, pernos, luces):</strong> Desde <strong>$95.000</strong> hasta <strong>$240.000 COP</strong>.<br><br>
                Todos los precios incluyen IVA y factura electrónica oficial.
            `;
        }

        // 12. CONSULTA SOBRE VISUALIZADOR CON IA
        if (t.includes('ia') || t.includes('visualizador') || t.includes('probar') || t.includes('foto') || t.includes('simulador')) {
            return `
                🚗 <strong>¿Cómo funciona el Visualizador Virtual con IA?</strong><br><br>
                1. 📸 <strong>Sube una foto lateral de tu carro</strong> (o selecciona un sedán, deportivo o camioneta de muestra).<br>
                2. 🛞 <strong>Elige tu rin o llanta</strong> desde la nueva lista desplegable.<br>
                3. 🖐️ <strong>Ajusta el tamaño y la posición</strong> arrastrando con el dedo o con las flechitas.<br>
                4. 🤖 <strong>Pulsa "Generar Imagen Realista con IA"</strong> para unificar sombras, reflejos y profundidad fotográfica.<br>
                5. 📋 ¡Y envíalo a cotización directa por WhatsApp con un solo clic!
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.location.href='visualizador.html'">
                        <span>🚀 Ir al Visualizador con IA ahora</span> <i class="bi bi-arrow-right-circle"></i>
                    </button>
                </div>
            `;
        }

        // 13. CONSULTA SOBRE UBICACIÓN Y DESPACHOS
        if (t.includes('donde') || t.includes('dónde') || t.includes('ubicacion') || t.includes('ubicación') || t.includes('direccion') || t.includes('dirección') || t.includes('sogamoso') || t.includes('boyaca') || t.includes('boyacá')) {
            return `
                📍 <strong>Sede Principal y Taller Físico:</strong><br><br>
                • <strong>Dirección:</strong> Carrera 11 # 18-30, Sogamoso, Boyacá, Colombia.<br>
                • <strong>Horario de Atención:</strong> Lunes a Sábado de 8:00 AM a 6:30 PM.<br>
                • <strong>Servicios en Sede:</strong> Montaje computarizado, balanceo dinámico, inflado con nitrógeno y asesoría técnica personalizada.<br>
                • 📦 <em>¿No estás en Boyacá?</em> Realizamos despachos diarios asegurados a todo el país.
            `;
        }

        // 14. SALUDOS GENERALES
        if (t.includes('hola') || t.includes('buenas') || t.includes('buenos dias') || t.includes('buenas tardes')) {
            return `
                ¡Hola! Bienvenido a <strong>Rines y Llantas GT Pro</strong>. 😊 Soy <strong>Tito</strong>, tu asistente TypeBot.<br><br>
                ¿En qué te puedo asesorar hoy?
                <div class="typebot-opciones-flujo">
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Qué rines le quedan a mi carro según el tipo de auto?', 'tipo_auto')">
                        <span>🚗 ¿Qué rines le quedan a mi carro?</span> <i class="bi bi-chevron-right"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('¿Cuáles son los combos de rines y llantas con descuento?', 'combos')">
                        <span>🎁 Ver Combos con Descuento</span> <i class="bi bi-chevron-right"></i>
                    </button>
                    <button type="button" class="typebot-btn-opcion" onclick="window.enviarOpcionTypebot('Quiero hablar con un asesor automotriz por WhatsApp')">
                        <span>💬 Hablar por WhatsApp</span> <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            `;
        }

        // 15. CONSULTA ESPECÍFICA / ASESORÍA PERSONALIZADA -> ESCALAMIENTO A WHATSAPP
        const textoEscapado = encodeURIComponent(`Hola Tito y equipo GT Pro! Deseo una asesoría específica: ${texto}`);
        return `
            <div>
                💬 Para preguntas específicas sobre medidas exactas para tu modelo de auto, descuentos especiales o disponibilidad personalizada, <strong>te voy a comunicar directamente con nuestro equipo de asesores por WhatsApp</strong>:
                <div class="tarjeta-wsp-escalado mt-2">
                    <p class="small mb-2 fw-bold text-success"><i class="bi bi-headset"></i> Asesoría Especializada Inmediata</p>
                    <a href="https://wa.me/573225817510?text=${textoEscapado}" target="_blank" class="btn btn-success btn-sm w-100 fw-bold shadow-sm">
                        <i class="bi bi-whatsapp me-1"></i> Continuar por WhatsApp con un Asesor
                    </a>
                </div>
            </div>
        `;
    }

    // 5. AUXILIARES DE CARRITO Y CUENTA
    function actualizarBadgeCarritoMovil() {
        try {
            const raw = localStorage.getItem('carrito') || localStorage.getItem('carrito_gt_pro');
            const carrito = raw ? JSON.parse(raw) : [];
            const cant = carrito.reduce((acc, item) => acc + (parseInt(item.cantidad) || 1), 0);
            const badge = document.getElementById('badgeMovilCarrito');
            if (badge) {
                badge.innerText = cant;
                badge.style.display = cant > 0 ? 'flex' : 'none';
            }
        } catch (e) {}
    }

    async function actualizarBotonCuentaMovil() {
        const itemCuenta = document.getElementById('navMovil_cuenta');
        if (!itemCuenta) return;

        try {
            const res = await fetch('api/auth.php?accion=sesion');
            const data = await res.json();
            if (data.exito && data.usuario) {
                if (data.usuario.rol === 'admin') {
                    itemCuenta.href = 'admin.html';
                    itemCuenta.querySelector('span').innerText = 'Admin';
                } else {
                    itemCuenta.href = 'panel-cliente.html';
                    itemCuenta.querySelector('span').innerText = 'Mi Perfil';
                }
                return;
            }
        } catch (e) {}

        if (localStorage.getItem('sesionActiva') === 'true') {
            itemCuenta.href = 'admin.html';
            itemCuenta.querySelector('span').innerText = 'Admin';
        } else if (localStorage.getItem('sesionActivaCliente') === 'true') {
            itemCuenta.href = 'panel-cliente.html';
            itemCuenta.querySelector('span').innerText = 'Mi Perfil';
        }
    }

    window.addEventListener('storage', function (e) {
        if (e.key === 'carrito' || e.key === 'carrito_gt_pro') {
            actualizarBadgeCarritoMovil();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        inicializarNavegacionMovil();
        inicializarAsistenteVirtual();
        sincronizarEnlacesInicioSegunSesion();
    }

    window.refrescarBadgeMovil = actualizarBadgeCarritoMovil;
    window.sincronizarEnlacesInicioGT = sincronizarEnlacesInicioSegunSesion;
})();

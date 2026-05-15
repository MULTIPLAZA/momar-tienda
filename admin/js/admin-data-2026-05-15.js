// Datos mock del panel admin
window.MOMAR_ADMIN_USER = {
  nombre: 'Martina',
  apellido: 'Recalde',
  email: 'martina@momar.com.py',
  rol: 'Dueña',
  inicial: 'MR'
};

window.MOMAR_PEDIDOS = [
  {
    num: '#1247', cliente: 'María Benítez', email: 'maria.b@gmail.com', whatsapp: '+595 981 234 567',
    fecha: 'hoy 14:32', total: 3610000, items: 2, pago: 'Bancard', pagoEstado: 'pagado',
    envio: 'Asunción · 24hs', envioEstado: 'pendiente', cdc: '01800123456001000012345',
    direccion: 'Av. España 1234 c/ Brasilia, Asunción · Edif. Marsala 3B', factura: '001-001-12345',
    notas: ''
  },
  {
    num: '#1246', cliente: 'Carolina Vera', email: 'cvera@hotmail.com', whatsapp: '+595 982 111 222',
    fecha: 'hoy 11:08', total: 1420000, items: 1, pago: 'Bancard 3c sin int.', pagoEstado: 'pagado',
    envio: 'Asunción · 24hs', envioEstado: 'enviado', cdc: '01800123456001000012344',
    direccion: 'Aviadores del Chaco 2000, Torre Sur 10A', factura: '001-001-12344',
    notas: 'Pidió packaging de regalo extra (clienta VIP).'
  },
  {
    num: '#1245', cliente: 'Laura Cáceres', email: 'lcaceres@yahoo.com', whatsapp: '+595 983 555 444',
    fecha: 'hoy 09:51', total: 5200000, items: 3, pago: 'Transferencia · Itaú', pagoEstado: 'a_confirmar',
    envio: 'Interior · Encarnación', envioEstado: 'pendiente_pago', cdc: '',
    direccion: 'Mcal. López 850, Encarnación', factura: '',
    notas: 'Envió comprobante por WhatsApp · pendiente confirmar en Itaú.'
  },
  {
    num: '#1244', cliente: 'Andrea López', email: 'andrea@empresa.com.py', whatsapp: '+595 985 333 666',
    fecha: 'ayer', total: 880000, items: 1, pago: 'Bancard', pagoEstado: 'pagado',
    envio: 'Asunción · Retiro', envioEstado: 'entregado', cdc: '01800123456001000012343',
    direccion: 'Showroom MoMar', factura: '001-001-12343',
    notas: 'Retiró personalmente el 13/05.'
  },
  {
    num: '#1243', cliente: 'Sofía Recalde', email: 'sofia.r@gmail.com', whatsapp: '+595 986 222 111',
    fecha: 'ayer', total: 4600000, items: 2, pago: 'Bancard 6c', pagoEstado: 'pagado',
    envio: 'Asunción · 24hs', envioEstado: 'entregado', cdc: '01800123456001000012342',
    direccion: 'Mcal. Estigarribia c/ Brasil 2100', factura: '001-001-12342',
    notas: ''
  },
  {
    num: '#1242', cliente: 'Camila Duarte', email: 'cami.d@gmail.com', whatsapp: '+595 987 100 200',
    fecha: '12 may', total: 2150000, items: 1, pago: 'Wally', pagoEstado: 'pagado',
    envio: 'Asunción · 24hs', envioEstado: 'preparado', cdc: '01800123456001000012341',
    direccion: 'Av. Argentina 1500, Asunción', factura: '001-001-12341',
    notas: 'Cliente nueva, primera compra.'
  },
  {
    num: '#1241', cliente: 'Patricia Núñez', email: 'pati.n@hotmail.com', whatsapp: '+595 991 444 555',
    fecha: '11 may', total: 760000, items: 1, pago: 'Transferencia · Continental', pagoEstado: 'pagado',
    envio: 'Interior · CDE', envioEstado: 'enviado', cdc: '01800123456001000012340',
    direccion: 'Ruta 7 Km 5, Ciudad del Este', factura: '001-001-12340',
    notas: ''
  },
  {
    num: '#1240', cliente: 'Lourdes Aguilera', email: 'lou.aguilera@gmail.com', whatsapp: '+595 994 777 888',
    fecha: '10 may', total: 1180000, items: 1, pago: 'Bancard', pagoEstado: 'reembolsado',
    envio: 'Asunción · 24hs', envioEstado: 'devuelto', cdc: '',
    direccion: 'Defensores del Chaco 900', factura: '001-001-12339',
    notas: 'Devolución por defecto en piedra. Reembolso completo procesado.'
  }
];

window.MOMAR_CLIENTES = [
  { nombre: 'Sofía Recalde', email: 'sofia.r@gmail.com', whatsapp: '+595 986 222 111', pedidos: 12, total: 38400000, ultima: '13 may', vip: true },
  { nombre: 'Carolina Vera', email: 'cvera@hotmail.com', whatsapp: '+595 982 111 222', pedidos: 8, total: 22600000, ultima: '14 may', vip: true },
  { nombre: 'Laura Cáceres', email: 'lcaceres@yahoo.com', whatsapp: '+595 983 555 444', pedidos: 5, total: 14800000, ultima: '14 may', vip: false },
  { nombre: 'María Benítez', email: 'maria.b@gmail.com', whatsapp: '+595 981 234 567', pedidos: 3, total: 8200000, ultima: '14 may', vip: false },
  { nombre: 'Patricia Núñez', email: 'pati.n@hotmail.com', whatsapp: '+595 991 444 555', pedidos: 4, total: 5100000, ultima: '11 may', vip: false },
  { nombre: 'Andrea López', email: 'andrea@empresa.com.py', whatsapp: '+595 985 333 666', pedidos: 2, total: 1750000, ultima: '13 may', vip: false },
  { nombre: 'Camila Duarte', email: 'cami.d@gmail.com', whatsapp: '+595 987 100 200', pedidos: 1, total: 2150000, ultima: '12 may', vip: false },
  { nombre: 'Lourdes Aguilera', email: 'lou.aguilera@gmail.com', whatsapp: '+595 994 777 888', pedidos: 6, total: 9300000, ultima: '10 may', vip: false }
];

window.MOMAR_BANNERS = [
  { id: 1, titulo: 'Colección Otoño 2026', sub: 'Piezas que perduran', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&h=700&fit=crop&q=85', activo: true, ubicacion: 'Hero principal', clicks: 1240 },
  { id: 2, titulo: 'Cápsula Nochebuena', sub: 'Edición limitada · 12 piezas únicas', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&h=700&fit=crop&q=85', activo: true, ubicacion: 'Banner promo home', clicks: 580 },
  { id: 3, titulo: 'Día de la Madre', sub: '15% en alianzas y solitarios', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1600&h=700&fit=crop&q=85', activo: false, ubicacion: 'Hero (programado para mayo)', clicks: 0 }
];

window.MOMAR_OFERTAS = [
  { codigo: 'BIENVENIDA10', tipo: 'Porcentaje', valor: 10, condicion: 'Primera compra', usos: 47, max: null, activo: true, vence: '31/12/2026' },
  { codigo: 'MADRE15', tipo: 'Porcentaje', valor: 15, condicion: 'Categoría: Anillos', usos: 12, max: 100, activo: true, vence: '20/05/2026' },
  { codigo: 'ENVIOGRATIS', tipo: 'Envío', valor: 0, condicion: 'Sobre Gs 1.500.000', usos: 86, max: null, activo: true, vence: '—' },
  { codigo: 'NAVIDAD25', tipo: 'Porcentaje', valor: 25, condicion: 'Outlet', usos: 0, max: 50, activo: false, vence: '24/12/2026' }
];

window.MOMAR_NOTIFS = [
  { texto: '3 pedidos esperan envío', tiempo: 'hace 12 min', tipo: 'envio' },
  { texto: 'Solitario Luna quedó sin stock', tiempo: 'hace 1h', tipo: 'stock' },
  { texto: 'Pago transferencia #1245 a confirmar', tiempo: 'hace 3h', tipo: 'pago' }
];

window.MOMAR_KPIS = {
  ventas_hoy: 4850000,
  ventas_hoy_delta: 18,
  pedidos_hoy: 5,
  pedidos_pendientes: 3,
  ventas_mes: 87400000,
  ventas_mes_delta: 24,
  productos_bajo_stock: 7,
  ticket_promedio: 2450000,
  conversion: 2.8,
  visitas_mes: 8420
};

// Helpers reutilizables
// Helper KPI: separa "Gs" visualmente del número para mejor legibilidad
window.MOMAR_kpiGs = function(n) {
  const num = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '<span class="kpi__currency">Gs</span>' + num;
};

window.MOMAR_pillPago = function(estado) {
  const map = {
    pagado: '<span class="pill pill--green">Pagado</span>',
    a_confirmar: '<span class="pill pill--amber">A confirmar</span>',
    pendiente: '<span class="pill pill--amber">Pendiente</span>',
    reembolsado: '<span class="pill pill--gray">Reembolsado</span>',
    fallido: '<span class="pill pill--red">Fallido</span>'
  };
  return map[estado] || '<span class="pill pill--gray">—</span>';
};

window.MOMAR_pillEnvio = function(estado) {
  const map = {
    pendiente: '<span class="pill pill--amber">Pendiente</span>',
    pendiente_pago: '<span class="pill pill--gray">Esperando pago</span>',
    preparado: '<span class="pill pill--blue">Preparado</span>',
    enviado: '<span class="pill pill--blue">Enviado</span>',
    entregado: '<span class="pill pill--green">Entregado</span>',
    devuelto: '<span class="pill pill--red">Devuelto</span>'
  };
  return map[estado] || '<span class="pill pill--gray">—</span>';
};

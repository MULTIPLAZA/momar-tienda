// Catálogo de MOMAR — datos mock para el mockup
// Reemplazar URLs por fotos reales cuando estén disponibles
window.MOMAR_PRODUCTS = [
  {
    sku: 'AN-001',
    nombre: 'Solitario Luna',
    cat: 'Anillos',
    cat_slug: 'joyeria',
    material: 'Oro 18k · Diamante',
    precio: 2850000,
    precio_antes: null,
    badge: 'new',
    imagen: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    imagenes: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80'
    ],
    es_unica: true,
    stock: 1,
    descripcion_corta: 'Anillo solitario en oro 18k con diamante 0,15 ct',
    descripcion: 'Anillo solitario en oro amarillo 18 quilates con diamante central de 0,15 ct, talla brillante. Banda interior con grabado MOMAR. Una pieza concebida para acompañar momentos que duran toda la vida — y para usarse, todos los días, con la misma delicadeza con la que fue hecha.',
    atributos: {
      Material: 'Oro amarillo 18k',
      Peso: '3.8 gramos',
      Piedra: 'Diamante 0,15 ct · talla brillante',
      Certificado: 'Incluido (GIA)',
      Packaging: 'Caja MOMAR de regalo',
      Stock: '1 disponible · pieza única'
    },
    variantes: { tipo: 'Talle', opciones: ['10', '12', '14', '16', '18'], default: '14' }
  },
  {
    sku: 'CO-001',
    nombre: 'Cadena Lirio',
    cat: 'Collares',
    cat_slug: 'joyeria',
    material: 'Plata 925',
    precio: 760000,
    precio_antes: 950000,
    badge: 'sale',
    imagen: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 8,
    descripcion_corta: 'Cadena de plata 925 con dije lirio',
    descripcion: 'Cadena fina de 45 cm en plata 925 sólida con dije lirio. Acabado pulido brillante. Cierre seguro de gancho.',
    atributos: { Material: 'Plata 925', Largo: '45 cm', Peso: '4.2 gramos', Origen: 'Italia' },
    variantes: { tipo: 'Largo', opciones: ['40 cm', '45 cm', '50 cm'], default: '45 cm' }
  },
  {
    sku: 'AR-001',
    nombre: 'Argollas Petite',
    cat: 'Aros',
    cat_slug: 'joyeria',
    material: 'Oro 18k',
    precio: 1420000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 5,
    descripcion_corta: 'Argollas mini en oro 18k para uso diario',
    descripcion: 'Argollas pequeñas en oro 18k, 8mm de diámetro. Pensadas para uso diario, ligeras, hipoalergénicas.',
    atributos: { Material: 'Oro 18k', Diámetro: '8 mm', Peso: '1.4 g el par' },
    variantes: null
  },
  {
    sku: 'HG-001',
    nombre: 'Bandeja Carrara',
    cat: 'Hogar',
    cat_slug: 'hogar',
    material: 'Mármol Carrara',
    precio: 1180000,
    precio_antes: null,
    badge: 'unique',
    imagen: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=800&fit=crop&q=80',
    es_unica: true,
    stock: 1,
    descripcion_corta: 'Bandeja redonda de mármol Carrara italiano',
    descripcion: 'Bandeja redonda de 30 cm en mármol Carrara genuino, importada de Italia. Para uso decorativo o servicio. Cada pieza es única por las vetas naturales del mármol.',
    atributos: { Material: 'Mármol Carrara', Diámetro: '30 cm', Peso: '2.4 kg', Origen: 'Italia' },
    variantes: null
  },
  {
    sku: 'PU-001',
    nombre: 'Rivière Soleil',
    cat: 'Pulseras',
    cat_slug: 'joyeria',
    material: 'Oro 18k',
    precio: 3450000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 3,
    descripcion_corta: 'Pulsera rivière en oro 18k con zirconias',
    descripcion: 'Pulsera tipo rivière en oro 18k con zirconias talla brillante en línea continua. Cierre de seguridad.',
    atributos: { Material: 'Oro 18k', Largo: '17 cm', Piedras: '34 zirconias' },
    variantes: { tipo: 'Largo', opciones: ['16 cm', '17 cm', '18 cm'], default: '17 cm' }
  },
  {
    sku: 'HG-002',
    nombre: 'Florero Saint-Just',
    cat: 'Hogar',
    cat_slug: 'hogar',
    material: 'Cristal soplado',
    precio: 890000,
    precio_antes: null,
    badge: 'new',
    imagen: 'https://images.unsplash.com/photo-1602242813008-d0a5f4d5b3e3?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 4,
    descripcion_corta: 'Florero de cristal soplado a mano',
    descripcion: 'Florero alto de cristal soplado a mano, 35 cm de alto. Pieza minimalista para arreglos florales o como objeto decorativo solo.',
    atributos: { Material: 'Cristal soplado', Alto: '35 cm', Origen: 'Francia' },
    variantes: null
  },
  {
    sku: 'CO-002',
    nombre: 'Gargantilla Étoile',
    cat: 'Collares',
    cat_slug: 'joyeria',
    material: 'Oro blanco 18k',
    precio: 4200000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 2,
    descripcion_corta: 'Gargantilla en oro blanco con diamantes',
    descripcion: 'Gargantilla en oro blanco 18k con tres diamantes en estrella. Largo ajustable 38-42 cm.',
    atributos: { Material: 'Oro blanco 18k', Diamantes: '3 piezas 0,05 ct c/u', Largo: '38-42 cm' },
    variantes: null
  },
  {
    sku: 'AR-002',
    nombre: 'Pendiente Gota',
    cat: 'Aros',
    cat_slug: 'joyeria',
    material: 'Plata 925',
    precio: 578000,
    precio_antes: 680000,
    badge: 'sale',
    imagen: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 6,
    descripcion_corta: 'Pendientes largos forma gota',
    descripcion: 'Pendientes largos en plata 925 con forma de gota pulida. Cierre de pasador.',
    atributos: { Material: 'Plata 925', Largo: '4 cm', Peso: '3 g el par' },
    variantes: null
  },
  {
    sku: 'AN-002',
    nombre: 'Alianza Clásica 3mm',
    cat: 'Anillos',
    cat_slug: 'joyeria',
    material: 'Oro 18k',
    precio: 1950000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 12,
    descripcion_corta: 'Alianza clásica de matrimonio en oro 18k',
    descripcion: 'Alianza clásica en oro 18k, banda lisa pulida de 3mm de ancho. Disponible en oro amarillo, blanco y rosa.',
    atributos: { Material: 'Oro 18k', Ancho: '3 mm' },
    variantes: { tipo: 'Talle', opciones: ['10', '12', '14', '16', '18', '20'], default: '14' }
  },
  {
    sku: 'HG-003',
    nombre: 'Vela Voluspa Maison',
    cat: 'Hogar',
    cat_slug: 'hogar',
    material: 'Cera soja · Tarro porcelana',
    precio: 420000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1602874801007-aa988d6ad04a?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 10,
    descripcion_corta: 'Vela aromática premium en tarro de porcelana',
    descripcion: 'Vela aromática de cera de soja, 50 horas de quemado, en tarro de porcelana negra mate.',
    atributos: { Material: 'Cera de soja', Duración: '50 hs', Aroma: 'Higo + sándalo' },
    variantes: { tipo: 'Aroma', opciones: ['Higo + sándalo', 'Rosa + oud', 'Vainilla + ámbar'], default: 'Higo + sándalo' }
  },
  {
    sku: 'AN-003',
    nombre: 'Trinity Petite',
    cat: 'Anillos',
    cat_slug: 'joyeria',
    material: 'Oro 18k tricolor',
    precio: 3200000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1612035875102-fa12be24c100?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 4,
    descripcion_corta: 'Anillo trinity de tres oros entrelazados',
    descripcion: 'Anillo tipo trinity con tres bandas entrelazadas en oro amarillo, blanco y rosa 18k.',
    atributos: { Material: 'Oro 18k tricolor' },
    variantes: { tipo: 'Talle', opciones: ['10', '12', '14', '16'], default: '14' }
  },
  {
    sku: 'HG-004',
    nombre: 'Set Servilleteros Latón',
    cat: 'Hogar',
    cat_slug: 'hogar',
    material: 'Latón pulido',
    precio: 620000,
    precio_antes: null,
    badge: null,
    imagen: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&h=800&fit=crop&q=80',
    es_unica: false,
    stock: 5,
    descripcion_corta: 'Set de 6 servilleteros en latón pulido',
    descripcion: 'Set de 6 servilleteros tipo aro en latón pulido brillante. Para mesa de servicio formal.',
    atributos: { Material: 'Latón pulido', Cantidad: '6 piezas' },
    variantes: null
  }
];

window.MOMAR_CATEGORIAS = [
  { slug: 'anillos', nombre: 'Anillos', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&h=800&fit=crop&q=80' },
  { slug: 'collares', nombre: 'Collares', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=800&fit=crop&q=80' },
  { slug: 'aros', nombre: 'Aros', img: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=800&fit=crop&q=80' },
  { slug: 'hogar', nombre: 'Hogar', img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&h=800&fit=crop&q=80' }
];

// Fotos lifestyle propias (Instagram MoMar) — no Unsplash mockup
window.MOMAR_HERO = 'img/lifestyle/hero.jpg?v=20260517b';
window.MOMAR_PROMO = 'img/lifestyle/natural.jpg?v=20260517b';

// Helper para encontrar producto
window.MOMAR_findProduct = function(sku) {
  return window.MOMAR_PRODUCTS.find(p => p.sku === sku) || null;
};

// Helper para formatear precio en guaraníes
window.MOMAR_fmtGs = function(n) {
  return 'Gs ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

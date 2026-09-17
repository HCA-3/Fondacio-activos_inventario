/**
 * FONDACIO COLOMBIA - SISTEMA DE GESTIÓN DE ACTIVOS DE HARDWARE
 * Capa de Datos, Persistencia LocalStorage, Gestión Dinámica de Sedes y Equipos Reales
 */

const STORAGE_KEY = 'fondacio_inventory_v4_db';

// Sedes iniciales por defecto de Fondacio Colombia
const DEFAULT_SEDES = [
  {
    id: 'sede-pot',
    name: 'YLDC Potosí',
    fullName: 'Centro de Formación YLDC Potosí',
    code: 'POT',
    address: 'Calle 78A Sur No. 38 - 31',
    city: 'Potosí, Ciudad Bolívar, Bogotá D.C.',
    phone: '+57 320 2383795',
    email: 'contacto@fondacio-co.org',
    color: '#4caf50',
    focus: 'Aulas de informática, robótica y desarrollo juvenil',
    createdAt: '2021-01-01T00:00:00.000Z'
  },
  {
    id: 'sede-cabo',
    name: 'Altos del Cabo',
    fullName: 'Centro de Ecología Integral Altos del Cabo',
    code: 'CABO',
    address: 'Cra. 9 Este #96-74 km 5 vía La Calera',
    city: 'Barrio San Luis, Chapinero, Bogotá D.C.',
    phone: '+57 300 5566591',
    email: 's.guerrero@fondacio-co.org',
    color: '#f59e0b',
    focus: 'Centro de ecología integral, siembras y proyectos comunitarios',
    createdAt: '2021-01-01T00:00:00.000Z'
  },
  {
    id: 'sede-adm',
    name: 'Sede Administrativa',
    fullName: 'Sede Administrativa Nacional Fondacio',
    code: 'ADM',
    address: 'Calle 166 # 20 - 69',
    city: 'Bogotá D.C.',
    phone: '+57 300 1234567',
    email: 'administracion@fondacio-co.org',
    color: '#1565c0',
    focus: 'Dirección ejecutiva, finanzas, voluntariado y proyectos sociales',
    createdAt: '2021-01-01T00:00:00.000Z'
  }
];

// Configuración de temas y colores personalizables
const DEFAULT_THEME_CONFIG = {
  preset: 'fondacio-green',
  mode: 'light',
  primaryColor: '#2e7d32',
  primaryDark: '#1b5e20',
  primaryLight: '#e8f5e9',
  secondaryColor: '#1565c0',
  sidebarBg: '#0f2d18',
  appBg: '#f4f7f6',
  accentColor: '#f59e0b'
};

const INITIAL_SEED_DATA = {
  sedes: DEFAULT_SEDES,
  themeConfig: DEFAULT_THEME_CONFIG,
  assets: [
    // --- EQUIPO 1 (REAL) ---
    {
      id: 'ast-real-001',
      code: 'FND-POT-001',
      area: 'FORMACIÓN JUVENIL / AULA TIC',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Dell',
      model: 'Latitude 7480',
      purchaseDate: '2023-01-15',
      provider: 'Donación Institucional',
      
      serial: '00330-80000-00000-AA332',
      processor: 'Intel® Core™ i5-7200U @ 2.50 GHz (hasta 2.70 GHz, 2 núcleos, 4 hilos)',
      gpu: 'Intel® HD Graphics 620 (128 MB dedicados)',
      ram: '8,00 GB DDR4 SODIMM @ 2133 MHz / 2400 MHz (1 módulo instalado, 1 ranura libre)',
      
      disk1Brand: 'Intel',
      disk1Capacity: '256 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'SSDSCKKF256H6-INTEL',
      disk1Model: 'Intel SSDSCKKF256H6 M.2 SATA de 256 GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Integrada Dell 14" Full HD Antirreflejo',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Retroiluminado Dell Latinoamericano',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad Multitáctil Integrado Dell',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original Dell 65W Punta Redonda',
      
      networkInUse: 'WIFI',
      networkHostname: 'DESKTOP-P5E96FQ',
      ip: '192.168.10.31',
      mac: 'E4:54:E8:29:10:4B',
      networkCardBrand: 'Intel® Dual Band Wireless-AC 8265',
      networkSpeed: '867 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Microsoft Windows 10 Pro 64-Bit',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID de Dispositivo: 15CAF001-785F-4EAB-8D69-3E08556DAC26. ID de Producto: 00330-80000-00000-AA332. Equipo en excelente estado operativo.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Cómputo / Formación',
      assignedRole: 'Uso Compartido Estudiantes',
      location: 'Aula Informática Potosí (Piso 2)',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'Ranura de memoria RAM libre disponible para ampliación futura a 16 GB si se requiere.',
      estimatedValue: 1600000,
      createdAt: '2026-03-10T10:00:00.000Z'
    },

    // --- EQUIPO 2 (REAL) ---
    {
      id: 'ast-real-002',
      code: 'FND-POT-002',
      area: 'COORDINACIÓN / PROYECTOS',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Dell',
      model: 'Latitude 7480',
      purchaseDate: '2023-01-15',
      provider: 'Donación Institucional',
      
      serial: '00331-10000-00001-AA543',
      processor: 'Intel® Core™ i5-7200U @ 2.50 GHz (hasta 2.70 GHz, 2 núcleos, 4 hilos)',
      gpu: 'Intel® HD Graphics 620 (128 MB dedicados)',
      ram: '8,00 GB DDR4 SODIMM @ 2133 MHz (1 módulo instalado, 1 ranura libre)',
      
      disk1Brand: 'Toshiba',
      disk1Capacity: '256 GB',
      disk1Tech: 'NVMe SSD M.2',
      disk1Serial: 'KSG60ZMV256G-TOSH',
      disk1Model: 'Toshiba KSG60ZMV256G M.2 2280 de 256 GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Integrada Dell 14" Full HD',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Integrado Dell Español',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad Integrado / Mouse USB Opcional',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original Dell 65W, Funda protectora',
      
      networkInUse: 'WIFI',
      networkHostname: 'DESKTOP-HUC988P',
      ip: '192.168.10.32',
      mac: 'E4:54:E8:29:10:4C',
      networkCardBrand: 'Intel® Dual Band Wireless-AC 8265',
      networkSpeed: '867 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Windows 10 Pro (64 bits, compilación 22H2)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID de Dispositivo: 83841290-FA2A-4EF1-860D-B57EEFC688F7. ID de Producto: 00331-10000-00001-AA543.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Coordinación de Formación',
      assignedRole: 'Docente / Voluntario',
      location: 'Oficina de Proyectos Potosí',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'Mantener actualizado Windows 10 Pro compilación 22H2 con las actualizaciones acumulativas.',
      estimatedValue: 1600000,
      createdAt: '2026-03-10T10:30:00.000Z'
    },

    // --- EQUIPO 3 (REAL - PENDIENTE DE DESBLOQUEO) ---
    {
      id: 'ast-real-003',
      code: 'FND-POT-003',
      area: 'SOPORTE TÉCNICO / TALLER',
      computerType: 'TORRE / ESCRITORIO',
      category: 'desktop',
      brand: 'Pendiente Verificación',
      model: 'Pendiente de verificación en etiqueta física',
      purchaseDate: '',
      provider: 'Donación Comunitaria',
      
      serial: 'PENDIENTE-VERIF-01',
      processor: 'Pendiente lectura BIOS/Hardware',
      gpu: 'Pendiente',
      ram: 'Pendiente verificación',
      
      disk1Brand: 'Pendiente',
      disk1Capacity: 'Pendiente',
      disk1Tech: 'Mecánico (HDD)',
      disk1Serial: '',
      disk1Model: '',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Sin monitor asignado',
      monitorPlate: '',
      keyboardBrandModel: '',
      keyboardPlate: '',
      mouseBrandModel: '',
      mousePlate: '',
      otherPeripherals: 'Cable de Poder',
      
      networkInUse: 'SIN RED',
      networkHostname: 'BLOQUEADO-USER',
      ip: '',
      mac: '',
      networkCardBrand: '',
      networkSpeed: '',
      domain: '',
      
      os: 'Bloqueado por Contraseña de Usuario',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Equipo bloqueado por contraseña de usuario local. Pendiente de verificación en etiqueta física de marca y modelo.',
      approvedBy: 'Soporte Técnico',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Taller de Soporte Técnico',
      assignedRole: 'En Diagnóstico',
      location: 'Banco de Pruebas / Taller Potosí',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'mantenimiento',
      condition: 'Regular',
      recommendations: 'Requiere formateo a bajo nivel / reinstalación limpia de Sistema Operativo para eliminar bloqueo de contraseña de usuario anterior y levantar datos técnicos de hardware.',
      estimatedValue: 700000,
      createdAt: '2026-03-10T11:00:00.000Z'
    },

    // --- EQUIPO 4 (REAL - FALLO DE BOOTEO Y BATERÍA) ---
    {
      id: 'ast-real-004',
      code: 'FND-POT-004',
      area: 'SOPORTE TÉCNICO / TALLER',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Pendiente Verificación',
      model: 'Pendiente de verificación en etiqueta física / menú de inicio',
      purchaseDate: '',
      provider: 'Donación Comunitaria',
      
      serial: 'PENDIENTE-BOOT-02',
      processor: 'Pendiente menú de inicio / BIOS',
      gpu: 'Pendiente',
      ram: 'Pendiente verificación',
      
      disk1Brand: 'Pendiente (Posible daño)',
      disk1Capacity: 'Pendiente',
      disk1Tech: 'Mecánico (HDD)',
      disk1Serial: '',
      disk1Model: '',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Integrada',
      monitorPlate: '',
      keyboardBrandModel: 'Teclado Integrado',
      keyboardPlate: '',
      mouseBrandModel: 'Touchpad Integrado',
      mousePlate: '',
      otherPeripherals: 'Cargador',
      
      networkInUse: 'SIN RED',
      networkHostname: 'NO-BOOT',
      ip: '',
      mac: '',
      networkCardBrand: '',
      networkSpeed: '',
      domain: '',
      
      os: 'Sin booteo / Error de Sistema de Arranque',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Presenta fallo de booteo (no inicia sistema operativo) y alerta de batería/alimentación.',
      approvedBy: 'Soporte Técnico',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Taller de Reparación',
      assignedRole: 'En Diagnóstico',
      location: 'Taller Técnico Potosí',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'mantenimiento',
      condition: 'Dañado',
      recommendations: '1. Diagnóstico de sector de arranque o reemplazo de disco por SSD nuevo.\n2. Medición de voltaje y calibración/cambio de celda de batería.',
      estimatedValue: 500000,
      createdAt: '2026-03-10T11:15:00.000Z'
    },

    // --- TABLETS (5 UNIDADES REALES) ---
    {
      id: 'ast-real-tab-001',
      code: 'FND-TAB-001',
      area: 'PEDAGOGÍA / LECTURA',
      computerType: 'MINIPC', // Tablet
      category: 'tablet',
      brand: 'Tablet Android (Genérica/Educativa)',
      model: 'Tablet Android 5.0 (Unidad 1 de 5)',
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo',
      
      serial: 'TAB-AND5-001',
      processor: 'ARM Cortex Quad-Core @ 1.30 GHz',
      gpu: 'Mali-400 MP',
      ram: '1,00 GB RAM',
      
      disk1Brand: 'eMMC Interna',
      disk1Capacity: '16 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-01',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0"',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil',
      keyboardPlate: '',
      mouseBrandModel: 'Pantalla Capacitiva',
      mousePlate: '',
      otherPeripherals: 'Cargador Micro-USB 5V/2A, Funda de silicona',
      
      networkInUse: 'WIFI',
      networkHostname: 'TABLET-FND-01',
      ip: '192.168.10.81',
      mac: '00:1A:79:82:11:01',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Android 5.0 (Lollipop)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Lote de 5 tablets. Dispositivo sin soporte para actualización de Android reciente, configurado con acceso directo a Google Drive para lectura de cartillas y guías.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Lectura y Biblioteca Potosí',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Bodega de Dispositivos Móviles / Aulas',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Mantener configuración de acceso directo offline a Google Drive y lector de PDF ligero.',
      estimatedValue: 250000,
      createdAt: '2026-03-10T12:00:00.000Z'
    },
    {
      id: 'ast-real-tab-002',
      code: 'FND-TAB-002',
      area: 'PEDAGOGÍA / LECTURA',
      computerType: 'MINIPC',
      category: 'tablet',
      brand: 'Tablet Android (Genérica/Educativa)',
      model: 'Tablet Android 5.0 (Unidad 2 de 5)',
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo',
      
      serial: 'TAB-AND5-002',
      processor: 'ARM Cortex Quad-Core @ 1.30 GHz',
      gpu: 'Mali-400 MP',
      ram: '1,00 GB RAM',
      
      disk1Brand: 'eMMC Interna',
      disk1Capacity: '16 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-02',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0"',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil',
      keyboardPlate: '',
      mouseBrandModel: 'Pantalla Capacitiva',
      mousePlate: '',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'TABLET-FND-02',
      ip: '192.168.10.82',
      mac: '00:1A:79:82:11:02',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Android 5.0 (Lollipop)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Configurada con acceso directo a Google Drive para material de talleres.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Lectura y Biblioteca Potosí',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Bodega de Dispositivos Móviles / Aulas',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso exclusivo para visualización de documentos y lectura digital.',
      estimatedValue: 250000,
      createdAt: '2026-03-10T12:05:00.000Z'
    },
    {
      id: 'ast-real-tab-003',
      code: 'FND-TAB-003',
      area: 'PEDAGOGÍA / LECTURA',
      computerType: 'MINIPC',
      category: 'tablet',
      brand: 'Tablet Android (Genérica/Educativa)',
      model: 'Tablet Android 5.0 (Unidad 3 de 5)',
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo',
      
      serial: 'TAB-AND5-003',
      processor: 'ARM Cortex Quad-Core @ 1.30 GHz',
      gpu: 'Mali-400 MP',
      ram: '1,00 GB RAM',
      
      disk1Brand: 'eMMC Interna',
      disk1Capacity: '16 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-03',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0"',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil',
      keyboardPlate: '',
      mouseBrandModel: 'Pantalla Capacitiva',
      mousePlate: '',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'TABLET-FND-03',
      ip: '192.168.10.83',
      mac: '00:1A:79:82:11:03',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Android 5.0 (Lollipop)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Configurada con acceso directo a Google Drive.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Lectura y Biblioteca Potosí',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Bodega de Dispositivos Móviles / Aulas',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso exclusivo para visualización de documentos y lectura digital.',
      estimatedValue: 250000,
      createdAt: '2026-03-10T12:10:00.000Z'
    },
    {
      id: 'ast-real-tab-004',
      code: 'FND-TAB-004',
      area: 'PEDAGOGÍA / LECTURA',
      computerType: 'MINIPC',
      category: 'tablet',
      brand: 'Tablet Android (Genérica/Educativa)',
      model: 'Tablet Android 5.0 (Unidad 4 de 5)',
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo',
      
      serial: 'TAB-AND5-004',
      processor: 'ARM Cortex Quad-Core @ 1.30 GHz',
      gpu: 'Mali-400 MP',
      ram: '1,00 GB RAM',
      
      disk1Brand: 'eMMC Interna',
      disk1Capacity: '16 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-04',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0"',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil',
      keyboardPlate: '',
      mouseBrandModel: 'Pantalla Capacitiva',
      mousePlate: '',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'TABLET-FND-04',
      ip: '192.168.10.84',
      mac: '00:1A:79:82:11:04',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Android 5.0 (Lollipop)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Configurada con acceso directo a Google Drive.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Lectura y Biblioteca Potosí',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Bodega de Dispositivos Móviles / Aulas',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso exclusivo para visualización de documentos y lectura digital.',
      estimatedValue: 250000,
      createdAt: '2026-03-10T12:15:00.000Z'
    },
    {
      id: 'ast-real-tab-005',
      code: 'FND-TAB-005',
      area: 'PEDAGOGÍA / LECTURA',
      computerType: 'MINIPC',
      category: 'tablet',
      brand: 'Tablet Android (Genérica/Educativa)',
      model: 'Tablet Android 5.0 (Unidad 5 de 5)',
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo',
      
      serial: 'TAB-AND5-005',
      processor: 'ARM Cortex Quad-Core @ 1.30 GHz',
      gpu: 'Mali-400 MP',
      ram: '1,00 GB RAM',
      
      disk1Brand: 'eMMC Interna',
      disk1Capacity: '16 GB',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-05',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0"',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil',
      keyboardPlate: '',
      mouseBrandModel: 'Pantalla Capacitiva',
      mousePlate: '',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'TABLET-FND-05',
      ip: '192.168.10.85',
      mac: '00:1A:79:82:11:05',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      domain: 'WORKGROUP',
      
      os: 'Android 5.0 (Lollipop)',
      
      inventoryDate: '2026-03-10',
      inventoriedBy: 'Equipo TIC Fondacio',
      inventoryObservations: 'Configurada con acceso directo a Google Drive.',
      approvedBy: 'Coordinación YLDC Potosí',
      
      sede: 'YLDC Potosí',
      assignedTo: 'Sala de Lectura y Biblioteca Potosí',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Bodega de Dispositivos Móviles / Aulas',
      physicalAddress: 'Calle 78A Sur No. 38 - 31, Potosí, Ciudad Bolívar, Bogotá D.C.',
      assignmentDate: '2026-03-10',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso exclusivo para visualización de documentos y lectura digital.',
      estimatedValue: 250000,
      createdAt: '2026-03-10T12:20:00.000Z'
    },

    // --- COMPUTADOR ALL IN ONE (EJEMPLO COMPLETO FONDACIO) ---
    {
      id: 'ast-real-005',
      code: 'FND-CABO-001',
      area: 'PROYECTOS ECOLÓGICOS',
      computerType: 'ALL IN ONE',
      category: 'desktop',
      brand: 'Dell',
      model: 'OptiPlex 5480 AIO 24"',
      purchaseDate: '2022-11-10',
      provider: 'Empresa Aliada Sostenible - Donación',
      
      serial: 'CN-0K791X-74261',
      processor: 'Intel Core i5-10500T @ 2.30GHz (6 Cores / 12 Threads)',
      gpu: 'Intel UHD Graphics 630',
      ram: '16 GB DDR4 2666MHz',
      
      disk1Brand: 'Western Digital',
      disk1Capacity: '500 GB',
      disk1Tech: 'NVMe SSD M.2',
      disk1Serial: 'WD-WXV1A90812',
      disk1Model: 'WDC WDS500G2B0C',
      
      disk2Brand: 'Seagate',
      disk2Capacity: '1 TB',
      disk2Tech: 'Mecánico (HDD)',
      disk2Serial: 'ST1000DM010-2EP102',
      disk2Model: 'Barracuda 7200 RPM',
      
      monitorBrandModel: 'Dell InfinityEdge 23.8" Full HD Integrado',
      monitorPlate: 'MON-CABO-01',
      keyboardBrandModel: 'Dell Multimedia KB216',
      keyboardPlate: 'TEC-CABO-01',
      mouseBrandModel: 'Dell Optical MS116',
      mousePlate: 'MOU-CABO-01',
      otherPeripherals: 'Cámara Web Retráctil Integrada Dell, Cable de Poder',
      
      networkInUse: 'AMBOS (Cable / WiFi)',
      networkHostname: 'ECOLOGIA-CABO-01',
      ip: '192.168.20.10',
      mac: 'B8:85:84:67:AA:32',
      networkCardBrand: 'Intel Ethernet Connection I219-LM / Qualcomm Wireless',
      networkSpeed: '1 Gbps',
      domain: 'FONDACIO.LOCAL',
      
      os: 'Microsoft Windows 10 Pro 64-Bit',
      
      inventoryDate: '2022-11-10',
      inventoriedBy: 'Ing. Santiago Guerrero',
      inventoryObservations: 'Equipo recibido en donación en caja original con todos sus sellos.',
      approvedBy: 'Dirección Fondacio Colombia',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Santiago Guerrero',
      assignedRole: 'Coordinador Altos del Cabo',
      location: 'Oficina de Gestión Ambiental',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2022-11-10',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'Realizar copias de seguridad mensuales de la base de datos de siembras en el disco secundario.',
      notes: 'Equipo principal para diseño de talleres ecológicos y vivero comunitario.',
      estimatedValue: 3200000,
      createdAt: '2022-11-10T09:00:00.000Z'
    }
  ],
  loans: [
    {
      id: 'loan-001',
      assetId: 'ast-real-002',
      assetCode: 'FND-POT-002',
      assetName: 'Dell Latitude 7480 (DESKTOP-HUC988P)',
      borrowerName: 'Laura Vanessa Gómez',
      borrowerId: '1.020.893.412',
      borrowerRole: 'Voluntaria Docente',
      borrowerEmail: 'laura.gomez@fondacio-co.org',
      borrowerPhone: '+57 312 4567890',
      sede: 'YLDC Potosí',
      purpose: 'Preparación de módulos del Diplomado en Liderazgo Juvenil y Transformación Social',
      loanDate: '2026-02-10',
      expectedReturnDate: '2026-04-15',
      actualReturnDate: null,
      status: 'activo',
      conditionOnLoan: 'Equipo Dell Latitude en perfecto estado, incluye cargador original Dell de 65W y estuche.',
      returnNotes: '',
      createdAt: '2026-02-10T10:00:00.000Z'
    }
  ],
  maintenances: [
    {
      id: 'maint-001',
      assetId: 'ast-real-003',
      assetCode: 'FND-POT-003',
      assetName: 'Computador Bloqueado por Contraseña',
      type: 'correctivo',
      status: 'en_progreso',
      requestDate: '2026-03-10',
      scheduledDate: '2026-03-15',
      completionDate: null,
      technician: 'Equipo Técnico Voluntario TIC',
      cost: 0,
      description: 'Restablecimiento de acceso / Formateo a bajo nivel e instalación limpia de Sistema Operativo para habilitar equipo.',
      replacedParts: 'Ninguno (Software)',
      nextScheduledMaintenance: '2026-09-15',
      notes: 'Pendiente verificar marca y modelo en etiqueta física.'
    },
    {
      id: 'maint-002',
      assetId: 'ast-real-004',
      assetCode: 'FND-POT-004',
      assetName: 'Portátil con Fallo de Booteo y Batería',
      type: 'correctivo',
      status: 'en_progreso',
      requestDate: '2026-03-10',
      scheduledDate: '2026-03-16',
      completionDate: null,
      technician: 'Equipo Técnico Voluntario TIC',
      cost: 120000,
      description: 'Diagnóstico de booteo/arranque, reemplazo de unidad de almacenamiento y revisión del circuito de carga/batería.',
      replacedParts: 'Unidad SSD de reemplazo / Batería',
      nextScheduledMaintenance: '2026-09-16',
      notes: 'Presenta alerta de batería en BIOS y no inicia sistema.'
    }
  ],
  settings: {
    orgName: 'Fondacio Colombia',
    nit: '900.384.129-5',
    email: 'contacto@fondacio-co.org',
    website: 'https://www.fondaciocolombia.org'
  }
};

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.sedes || parsed.sedes.length === 0) {
          parsed.sedes = DEFAULT_SEDES;
        }
        if (!parsed.themeConfig) {
          parsed.themeConfig = DEFAULT_THEME_CONFIG;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error al leer datos de LocalStorage:', e);
    }
    this.saveToStorage(INITIAL_SEED_DATA);
    return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  }

  saveToStorage(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Error al guardar en LocalStorage:', e);
    }
  }

  commit() {
    this.saveToStorage(this.data);
  }

  // --- MÉTODOS DE SEDES DINÁMICAS ---
  getSedes() {
    return this.data.sedes || DEFAULT_SEDES;
  }

  getSedeById(id) {
    return (this.data.sedes || []).find(s => s.id === id) || null;
  }

  getSedeByName(name) {
    return (this.data.sedes || []).find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  saveSede(sede) {
    if (!this.data.sedes) this.data.sedes = [...DEFAULT_SEDES];

    if (!sede.id) {
      sede.id = 'sede-' + Date.now().toString(36);
      sede.createdAt = new Date().toISOString();
      this.data.sedes.push(sede);
    } else {
      const index = this.data.sedes.findIndex(s => s.id === sede.id);
      if (index !== -1) {
        this.data.sedes[index] = { ...this.data.sedes[index], ...sede };
      } else {
        this.data.sedes.push(sede);
      }
    }
    this.commit();
    return sede;
  }

  deleteSede(id) {
    if (this.data.sedes.length <= 1) {
      return { success: false, message: 'Debe existir al menos una sede registrada.' };
    }
    this.data.sedes = this.data.sedes.filter(s => s.id !== id);
    this.commit();
    return { success: true };
  }

  // --- MÉTODOS DE TEMA Y PERSONALIZACIÓN DE COLORES ---
  getThemeConfig() {
    return this.data.themeConfig || DEFAULT_THEME_CONFIG;
  }

  saveThemeConfig(config) {
    this.data.themeConfig = { ...DEFAULT_THEME_CONFIG, ...this.data.themeConfig, ...config };
    this.commit();
    return this.data.themeConfig;
  }

  resetThemeConfig() {
    this.data.themeConfig = JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG));
    this.commit();
    return this.data.themeConfig;
  }

  // --- MÉTODOS DE ACTIVOS (HARDWARE) ---
  getAssets(filters = {}) {
    let result = [...this.data.assets];

    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(a => 
        (a.code && a.code.toLowerCase().includes(query)) ||
        (a.brand && a.brand.toLowerCase().includes(query)) ||
        (a.model && a.model.toLowerCase().includes(query)) ||
        (a.serial && a.serial.toLowerCase().includes(query)) ||
        (a.area && a.area.toLowerCase().includes(query)) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(query)) ||
        (a.location && a.location.toLowerCase().includes(query)) ||
        (a.processor && a.processor.toLowerCase().includes(query)) ||
        (a.ip && a.ip.toLowerCase().includes(query)) ||
        (a.mac && a.mac.toLowerCase().includes(query)) ||
        (a.networkHostname && a.networkHostname.toLowerCase().includes(query))
      );
    }

    if (filters.sede && filters.sede !== 'all') {
      result = result.filter(a => a.sede === filters.sede);
    }

    if (filters.computerType && filters.computerType !== 'all') {
      result = result.filter(a => a.computerType === filters.computerType);
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter(a => a.status === filters.status);
    }

    return result;
  }

  getAssetById(id) {
    return this.data.assets.find(a => a.id === id) || null;
  }

  getAssetByCode(code) {
    return this.data.assets.find(a => a.code.toUpperCase() === code.toUpperCase()) || null;
  }

  saveAsset(asset) {
    if (!asset.id) {
      asset.id = 'ast-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      asset.createdAt = new Date().toISOString();
      this.data.assets.unshift(asset);
    } else {
      const index = this.data.assets.findIndex(a => a.id === asset.id);
      if (index !== -1) {
        this.data.assets[index] = { ...this.data.assets[index], ...asset, updatedAt: new Date().toISOString() };
      } else {
        this.data.assets.unshift(asset);
      }
    }
    this.commit();
    return asset;
  }

  deleteAsset(id) {
    this.data.assets = this.data.assets.filter(a => a.id !== id);
    this.commit();
  }

  // --- MÉTODOS DE PRÉSTAMOS / ASIGNACIONES ---
  getLoans(statusFilter = 'all') {
    if (statusFilter === 'all') return [...this.data.loans];
    return this.data.loans.filter(l => l.status === statusFilter);
  }

  getLoanById(id) {
    return this.data.loans.find(l => l.id === id) || null;
  }

  saveLoan(loan) {
    if (!loan.id) {
      loan.id = 'loan-' + Date.now().toString(36);
      loan.createdAt = new Date().toISOString();
      loan.status = 'activo';
      this.data.loans.unshift(loan);

      const asset = this.getAssetById(loan.assetId);
      if (asset) {
        asset.status = 'prestado';
        asset.assignedTo = loan.borrowerName;
        asset.assignedRole = loan.borrowerRole;
      }
    } else {
      const index = this.data.loans.findIndex(l => l.id === loan.id);
      if (index !== -1) {
        this.data.loans[index] = { ...this.data.loans[index], ...loan };
      }
    }
    this.commit();
    return loan;
  }

  returnLoan(loanId, returnNotes = '', newAssetStatus = 'operativo') {
    const loan = this.getLoanById(loanId);
    if (!loan) return false;

    loan.status = 'devuelto';
    loan.actualReturnDate = new Date().toISOString().split('T')[0];
    loan.returnNotes = returnNotes;

    const asset = this.getAssetById(loan.assetId);
    if (asset) {
      asset.status = newAssetStatus;
      asset.assignedTo = asset.location || 'En Sede';
      asset.assignedRole = 'Disponible en Sede';
    }

    this.commit();
    return true;
  }

  // --- MÉTODOS DE MANTENIMIENTO ---
  getMaintenances(statusFilter = 'all') {
    if (statusFilter === 'all') return [...this.data.maintenances];
    return this.data.maintenances.filter(m => m.status === statusFilter);
  }

  getMaintenanceById(id) {
    return this.data.maintenances.find(m => m.id === id) || null;
  }

  saveMaintenance(maint) {
    if (!maint.id) {
      maint.id = 'maint-' + Date.now().toString(36);
      maint.createdAt = new Date().toISOString();
      this.data.maintenances.unshift(maint);

      if (maint.status === 'en_progreso' || maint.status === 'programado') {
        const asset = this.getAssetById(maint.assetId);
        if (asset) {
          asset.status = 'mantenimiento';
        }
      }
    } else {
      const index = this.data.maintenances.findIndex(m => m.id === maint.id);
      if (index !== -1) {
        this.data.maintenances[index] = { ...this.data.maintenances[index], ...maint };
      }
    }
    this.commit();
    return maint;
  }

  completeMaintenance(maintId, notes = '', newAssetStatus = 'operativo') {
    const maint = this.getMaintenanceById(maintId);
    if (!maint) return false;

    maint.status = 'completado';
    maint.completionDate = new Date().toISOString().split('T')[0];
    if (notes) maint.notes = (maint.notes ? maint.notes + '\n' : '') + notes;

    const asset = this.getAssetById(maint.assetId);
    if (asset) {
      asset.status = newAssetStatus;
    }

    this.commit();
    return true;
  }

  // --- MÉTRICAS Y ESTADÍSTICAS ---
  getDashboardStats() {
    const assets = this.data.assets;
    const total = assets.length;
    const operativos = assets.filter(a => a.status === 'operativo').length;
    const prestados = assets.filter(a => a.status === 'prestado').length;
    const mantenimiento = assets.filter(a => a.status === 'mantenimiento').length;
    const bodega = assets.filter(a => a.status === 'bodega').length;
    const baja = assets.filter(a => a.status === 'baja').length;
    
    const totalValue = assets.reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0);

    const sedes = this.getSedes();
    const bySede = {};
    sedes.forEach(s => {
      bySede[s.name] = assets.filter(a => a.sede === s.name).length;
    });

    const byType = {};
    assets.forEach(a => {
      const t = a.computerType || 'Otros';
      byType[t] = (byType[t] || 0) + 1;
    });

    return {
      total,
      operativos,
      prestados,
      mantenimiento,
      bodega,
      baja,
      totalValue,
      bySede,
      byCategory: byType,
      activeLoansCount: this.data.loans.filter(l => l.status === 'activo').length,
      pendingMaintCount: this.data.maintenances.filter(m => m.status !== 'completado').length
    };
  }

  // --- IMPORTACIÓN / EXPORTACIÓN ---
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.assets && Array.isArray(parsed.assets)) {
        this.data = parsed;
        if (!this.data.sedes) this.data.sedes = DEFAULT_SEDES;
        this.commit();
        return { success: true, count: parsed.assets.length };
      }
      return { success: false, message: 'El archivo no tiene la estructura válida.' };
    } catch (e) {
      return { success: false, message: 'Formato JSON inválido.' };
    }
  }

  resetToInitial() {
    this.data = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
    this.commit();
    return true;
  }
}

// Instancia global
const DB = new DataStore();

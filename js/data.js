/**
 * FONDACIO COLOMBIA - SISTEMA DE GESTIÓN DE ACTIVOS DE HARDWARE
 * Capa de Datos, Persistencia LocalStorage, Gestión Dinámica de Sedes y Equipos Reales
 * Actualizado con el Censo Técnico Oficial e Imágenes de Hardware (Septiembre 2026)
 */

const STORAGE_KEY = 'fondacio_inventory_v6_db';

// Sedes oficiales de Fondacio Colombia
const DEFAULT_SEDES = [
  {
    id: 'sede-cabo',
    name: 'Altos del Cabo',
    fullName: 'Centro de Ecología Integral Altos del Cabo (Sede Chapinero)',
    code: 'CABO',
    address: 'Cra. 9 Este #96-74 km 5 vía La Calera',
    city: 'Barrio San Luis, Chapinero, Bogotá D.C.',
    phone: '+57 300 5566591',
    email: 's.guerrero@fondacio-co.org',
    color: '#2e7d32',
    focus: 'Centro de ecología integral, proyectos comunitarios, vivero y formación técnica',
    createdAt: '2021-01-01T00:00:00.000Z'
  },
  {
    id: 'sede-pot',
    name: 'YLDC Potosí',
    fullName: 'Centro de Formación YLDC Potosí',
    code: 'POT',
    address: 'Calle 78A Sur No. 38 - 31',
    city: 'Potosí, Ciudad Bolívar, Bogotá D.C.',
    phone: '+57 320 2383795',
    email: 'contacto@fondacio-co.org',
    color: '#1565c0',
    focus: 'Aulas de informática, robótica, lectura comunitaria y desarrollo juvenil',
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
    color: '#8b5cf6',
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
    // ==========================================
    // EQUIPO PC-01 (DELL LATITUDE 7480)
    // ==========================================
    {
      id: 'ast-real-pc01',
      code: 'PC-01',
      area: 'ADMINISTRACIÓN / OFIMÁTICA',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Dell',
      model: 'Latitude 7480',
      purchaseDate: '2023-01-15',
      provider: 'Donación Institucional Fondacio',
      image: 'img/dell_latitude_7480.jpg',
      
      // Hardware
      serial: '00330-80000-00000-AA332',
      uuid: '15CAF001-785F-4EAB-8D69-3E08556DAC26',
      productId: '00330-80000-00000-AA332',
      processor: 'Intel Core i5-7200U @ 2.50GHz (2.70 GHz)',
      cpuCores: '2 núcleos / 4 hilos',
      cpuSpeed: '2.70 GHz (Base 2.50 GHz)',
      cpuCache: 'L1: 128KB | L2: 512KB | L3: 3.0MB',
      virtualization: 'Habilitada',
      gpu: 'Intel HD Graphics 620',
      vramDedicated: '128 MB',
      gpuSharedMemory: '3.8 GB',
      gpuDriver: '31.0.101.2130 (13/08/2024)',
      directx: 'DirectX 12 (FL 12.1)',
      ram: '8.0 GB DDR4 (2133 MHz)',
      ramUsable: '7.63 GB',
      ramSpeed: '2133 MHz',
      ramSlots: '1 de 2 en uso (1 libre para ampliación)',
      ramType: 'SODIMM DDR4',
      ramHardwareReserved: '373 MB',
      
      // Disco 1
      disk1Brand: 'Intel',
      disk1Capacity: '256 GB',
      disk1Tech: "SATA SSD 2.5'' / M.2",
      disk1Serial: 'SSDSCKKF256H6-INTEL',
      disk1Model: 'INTEL SSDSCKKF256H6 (256 GB SSD SATA)',
      diskFormatted: '238 GB / 239 GB',
      diskUsed: '148 GB',
      diskFree: '90.2 GB',
      diskUsagePct: '62.2%',
      
      // Disco 2
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      // Periféricos
      monitorBrandModel: 'Pantalla Integrada Dell 14" Full HD Antirreflejo',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Retroiluminado Dell Latinoamericano',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad Multitáctil Integrado Dell',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original Dell 65W Punta Redonda',
      
      // Red
      networkInUse: 'WIFI',
      networkHostname: 'DESKTOP-P5E96FQ',
      ip: '192.168.1.7',
      ipv6: 'fe80::c636:faa9:4f11:a13f%18',
      mac: 'E4:54:E8:29:10:4B',
      networkCardBrand: 'Intel Dual Band Wireless-AC 8265',
      networkSpeed: '867 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      // Software & Licenciamiento
      os: 'Windows 10 Pro (64 bits, Versión 22H2 x64)',
      osBuild: '22H2',
      osInstallDate: 'Registro activo previo',
      licenseState: 'Activado',
      licenseType: 'Licencia Digital',
      licenseKeyPartial: 'Vinculada a Hardware',
      licenseAlerts: 'Ninguno reportado (Licencia válida)',
      windowsUpdateStatus: 'Al día en parches de versión',
      securityStatus: 'Microsoft Defender Antivirus (Activo)',
      startupConfig: 'Optimización general de procesos en segundo plano',
      installedSoftware: 'Suite ofimática, Navegadores, Utilidades Dell',
      maintenanceAction: 'Estandarización de ofimática; limpieza preventiva y revisión de espacio disponible (90.2 GB libres).',
      
      // Inventario y Asignación
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID Dispositivo: 15CAF001-785F-4EAB-8D69-3E08556DAC26. ID Producto: 00330-80000-00000-AA332. Operativo con 144 días de uptime registrado.',
      approvedBy: 'Dirección Fondacio Colombia',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Local / Administración',
      assignedRole: 'Uso Administrativo / Formación',
      location: 'Sede Chapinero / Altos del Cabo',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'Operativo / En funcionamiento óptimo. Ranura adicional de RAM libre para ampliación a 16 GB si se requiere.',
      estimatedValue: 1600000,
      createdAt: '2026-09-14T08:00:00.000Z'
    },

    // ==========================================
    // EQUIPO PC-02 (DELL LATITUDE 7480 - CORRECTIVO)
    // ==========================================
    {
      id: 'ast-real-pc02',
      code: 'PC-02',
      area: 'SALA COMUNITARIA / APOYO',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Dell',
      model: 'Latitude 7480',
      purchaseDate: '2023-01-15',
      provider: 'Donación Institucional Fondacio',
      image: 'img/dell_latitude_7480.jpg',
      
      // Hardware
      serial: '00331-10000-00001-AA543',
      uuid: '83841290-FA2A-4EF1-860D-857EEFC688F7',
      productId: '00331-10000-00001-AA543',
      processor: 'Intel Core i5-7200U @ 2.50GHz (2.70 GHz)',
      cpuCores: '2 núcleos / 4 hilos',
      cpuSpeed: '2.70 GHz (Base 2.50 GHz)',
      cpuCache: 'L1: 128KB | L2: 512KB | L3: 3.0MB',
      virtualization: 'Habilitada',
      gpu: 'Intel HD Graphics 620',
      vramDedicated: '128 MB',
      gpuSharedMemory: '3.8 GB',
      gpuDriver: 'Intel Graphics Driver',
      directx: 'DirectX 12',
      ram: '8.0 GB DDR4 (2133 MHz)',
      ramUsable: '7.63 GB',
      ramSpeed: '2133 MHz',
      ramSlots: '1 de 2 en uso (1 libre)',
      ramType: 'SODIMM DDR4',
      ramHardwareReserved: '377 MB',
      
      // Disco 1
      disk1Brand: 'Toshiba',
      disk1Capacity: '256 GB',
      disk1Tech: 'M.2 2280 SATA SSD',
      disk1Serial: 'KSG60ZMV256G-TOSH',
      disk1Model: 'TOSHIBA KSG60ZMV256G (256 GB SSD M.2)',
      diskFormatted: '238 GB',
      diskUsed: '116 GB',
      diskFree: '122 GB',
      diskUsagePct: '48.7%',
      
      // Disco 2
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      // Periféricos
      monitorBrandModel: 'Pantalla Integrada Dell 14" Full HD',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Integrado Dell Español',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad Integrado / Mouse USB Opcional',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original Dell 65W, Estuche protector',
      
      // Red
      networkInUse: 'WIFI',
      networkHostname: 'DESKTOP-HUC988P',
      ip: 'DHCP Asignado (Wi-Fi)',
      ipv6: 'DHCP Asignado',
      mac: 'E4:54:E8:29:10:4C',
      networkCardBrand: 'Intel Dual Band Wireless-AC 8265',
      networkSpeed: '867 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      // Software & Licenciamiento
      os: 'Windows 10 Pro (64 bits, Versión 22H2 x64)',
      osBuild: '22H2 (Build previa)',
      osInstallDate: 'Reinicio pendiente',
      licenseState: 'NO ACTIVADO',
      licenseType: 'KMS / Organización',
      licenseKeyPartial: '...-T83GX',
      licenseAlerts: 'Error 0x80072328 (No contacta servidor KMS)',
      windowsUpdateStatus: 'Pendiente reinicio: ESU Windows 10 22H2 (KB5126256); incompatible Win 11',
      securityStatus: 'Seguridad de Windows activada; Reproductor multimedia en segundo plano desactivado',
      startupConfig: 'Desactivación de apps no esenciales en segundo plano ejecutada',
      installedSoftware: 'Microsoft Office 2013 (Word, Excel, PPT, Publisher), Opera GX, Filmora 13, CapCut, Biblioteca, CCleaner',
      maintenanceAction: 'CORRECTIVO URGENTE: Regularizar activación de licencia Windows; reiniciar para aplicar KB5126256; evaluar desinstalación de CCleaner/antivirus redundantes.',
      
      // Inventario y Asignación
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID Dispositivo: 83841290-FA2A-4EF1-860D-857EEFC688F7. ID Producto: 00331-10000-00001-AA543. Licencia KMS no contacta servidor. Reinicio pendiente para parche de seguridad.',
      approvedBy: 'Soporte TIC Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Local / Apoyo',
      assignedRole: 'Equipo de Apoyo Comunitario',
      location: 'Sede Chapinero / Altos del Cabo',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'mantenimiento',
      condition: 'Bueno',
      recommendations: 'CORRECTIVO URGENTE: 1. Regularizar clave de activación de Windows 10 Pro. 2. Reiniciar para instalar parche KB5126256. 3. Desinstalar CCleaner y herramientas innecesarias de inicio.',
      estimatedValue: 1550000,
      createdAt: '2026-09-14T08:30:00.000Z'
    },

    // ==========================================
    // EQUIPO PC-03 (DELL LATITUDE 5490)
    // ==========================================
    {
      id: 'ast-real-pc03',
      code: 'PC-03',
      area: 'COORDINACIÓN / PROYECTOS',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'Dell',
      model: 'Latitude 5490',
      purchaseDate: '2024-02-20',
      provider: 'Donación Institucional Fondacio',
      image: 'img/dell_latitude_5490.jpg',
      
      // Hardware
      serial: '00330-51787-98301-AAOEM',
      uuid: '68A9FC6B-83AC-4FD7-9CAE-A1D0A784CA6D',
      productId: '00330-51787-98301-AAOEM',
      processor: 'Intel Core i5-8250U @ 1.60GHz (Turbo 3.40 GHz)',
      cpuCores: '4 núcleos / 8 hilos',
      cpuSpeed: '1.80 GHz (Turbo 3.40 GHz)',
      cpuCache: 'L1: 256KB | L2: 1.0MB | L3: 6.0MB',
      virtualization: 'Habilitada',
      gpu: 'Intel UHD Graphics 620',
      vramDedicated: '128 MB',
      gpuSharedMemory: '5.9 GB',
      gpuDriver: '31.0.101.2134 (20/11/2024)',
      directx: 'DirectX 12 (FL 12.1)',
      ram: '12.0 GB DDR4 (2400 MT/s)',
      ramUsable: '11.9 GB',
      ramSpeed: '2400 MT/s',
      ramSlots: '2 de 2 en uso (8GB + 4GB)',
      ramType: 'SODIMM DDR4',
      ramHardwareReserved: '142 MB',
      
      // Disco 1
      disk1Brand: 'Western Digital (WD Green)',
      disk1Capacity: '240 GB',
      disk1Tech: 'SSD M.2 SATA (RAID)',
      disk1Serial: 'WDC WDS240G2G0B-00EPW0',
      disk1Model: 'WDC WDS240G2G0B-00EPW0 (WD Green 240 GB)',
      diskFormatted: '224 GB',
      diskUsed: '86 GB',
      diskFree: '138 GB',
      diskUsagePct: '38.4%',
      
      // Disco 2
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      // Periféricos
      monitorBrandModel: 'Pantalla Integrada Dell 14" Antirreflejo HD',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Dell Latinoamericano',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad Integrado / Mouse Óptico USB',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original Dell 65W Punta Redonda, Impresora Epson vinculada',
      
      // Red
      networkInUse: 'WIFI',
      networkHostname: 'DESKTOP-UIK4E1Q',
      ip: '192.168.1.9',
      ipv6: 'fe80::d645:75a0:58bd:91ef%16',
      mac: 'E4:54:E8:29:10:4E',
      networkCardBrand: 'Intel Dual Band Wireless-AC 8265',
      networkSpeed: '867 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      // Software & Licenciamiento
      os: 'Windows 11 Pro (64 bits, Comp. 26200.8875)',
      osBuild: '25H2 (Comp. 26200.8875)',
      osInstallDate: '10/04/2026',
      licenseState: 'ACTIVADO',
      licenseType: 'OEM Digital',
      licenseKeyPartial: 'Vinculada OEM de fábrica',
      licenseAlerts: 'Ninguno (Licencia válida)',
      windowsUpdateStatus: 'Totalmente actualizado (Comprobado 14/09/2026)',
      securityStatus: 'Seguridad de Windows (Todas las protecciones en verde: Virus, Cuentas, Firewall, SmartScreen, Integridad memoria)',
      startupConfig: '13 apps desactivadas del inicio: Chrome, Edge, Teams, OneDrive, Epson Status, Copilot, Terminal, MaxxAudio, Xbox',
      installedSoftware: 'Microsoft 365 Copilot, Epson Event Manager, Google Chrome, Microsoft Edge, Teams, Terminal, Paint, Recorte',
      maintenanceAction: 'MANTENIMIENTO PREVENTIVO ÓPTIMO: Arranque acelerado desactivando servicios secundarios; seguridad Defender 100% activa; actualización de parches completada.',
      
      // Inventario y Asignación
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID Dispositivo: 68A9FC6B-83AC-4FD7-9CAE-A1D0A784CA6D. ID Producto: 00330-51787-98301-AAOEM. Equipo con Windows 11 Pro 25H2 actualizado y 12GB RAM.',
      approvedBy: 'Coordinación Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Dell (Local) / Coordinación',
      assignedRole: 'Coordinador de Proyectos',
      location: 'Sede Chapinero / Altos del Cabo',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'MANTENIMIENTO PREVENTIVO ÓPTIMO: Arranque acelerado y optimizado. Protección Defender completa al 100%. Equipo ideal para labores de diseño y gestión.',
      estimatedValue: 2100000,
      createdAt: '2026-09-14T09:00:00.000Z'
    },

    // ==========================================
    // EQUIPO PC-04 (ASUS VIVOBOOK X1504ZA)
    // ==========================================
    {
      id: 'ast-real-pc04',
      code: 'PC-04',
      area: 'CENTRO ECOLOGÍA INTEGRAL (CEI ALTOS)',
      computerType: 'PORTÁTIL',
      category: 'laptop',
      brand: 'ASUS',
      model: 'Vivobook X1504ZA',
      purchaseDate: '2025-09-16',
      provider: 'Adquisición Institucional Fondacio',
      image: 'img/asus_vivobook_15.jpg',
      
      // Hardware
      serial: '00327-60000-00000-AA118',
      uuid: '3907B42F-B5E5-4946-BA18-F11009052489',
      productId: '00327-60000-00000-AA118',
      processor: '12th Gen Intel Core i5-1235U (1.30 GHz Turbo 4.40 GHz)',
      cpuCores: '10 núcleos (2P+8E) / 12 hilos',
      cpuSpeed: '1.30 GHz (Turbo 4.40 GHz)',
      cpuCache: 'L1: 928KB | L2: 6.5MB | L3: 12.0MB',
      virtualization: 'Habilitada',
      gpu: 'Intel Iris Xe Graphics',
      vramDedicated: '128 MB',
      gpuSharedMemory: '7.9 GB',
      gpuDriver: '31.0.101.4255 (16/03/2023)',
      directx: 'DirectX 12 (FL 12.1)',
      ram: '16.0 GB DDR4 (3200 MT/s)',
      ramUsable: '15.7 GB',
      ramSpeed: '3200 MT/s',
      ramSlots: '2 de 2 en uso (Dual Channel)',
      ramType: 'SODIMM DDR4',
      ramHardwareReserved: '306 MB',
      
      // Disco 1
      disk1Brand: 'Micron',
      disk1Capacity: '512 GB',
      disk1Tech: 'SSD NVMe PCIe Gen4',
      disk1Serial: 'Micron_2400_MTFDKBA512QFM',
      disk1Model: 'Micron 2400 NVMe PCIe 4.0 SSD 512GB',
      diskFormatted: '477 GB',
      diskUsed: '82 GB',
      diskFree: '395 GB',
      diskUsagePct: '17.2%',
      
      // Disco 2
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      // Periféricos
      monitorBrandModel: 'Pantalla Integrada ASUS NanoEdge 15.6" Full HD OLED/IPS',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado ASUS ErgoSense con Bloque Numérico',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Touchpad ASUS de Precisión / AsusMouseAgent',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Original ASUS 45W/65W Type-C / Punta Redonda',
      
      // Red
      networkInUse: 'WIFI',
      networkHostname: 'CEIALTOSFONDACIO',
      ip: '192.168.1.20',
      ipv6: 'fe80::b910:bbb6:182:3961%13',
      mac: '38:87:D5:19:4A:20',
      networkCardBrand: 'MediaTek Wi-Fi 6E MT7902 Wireless',
      networkSpeed: '1.2 Gbps (Wi-Fi 6E)',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      // Software & Licenciamiento
      os: 'Windows 11 Home Single Lang. (64 bits, Comp. 26100.8117)',
      osBuild: '24H2 (Comp. 26100.8117)',
      osInstallDate: '16/09/2025',
      licenseState: 'ACTIVADO',
      licenseType: 'Digital Original',
      licenseKeyPartial: 'Vinculada a cuenta/equipo',
      licenseAlerts: 'Ninguno (Licencia válida)',
      windowsUpdateStatus: 'Actualizado a 24H2 / Descargando actualización 25H2 (al 99%)',
      securityStatus: 'Seguridad de Windows (Notificaciones activas, protección en tiempo real)',
      startupConfig: 'Arranque optimizado: Desactivados Copilot, Teams, OneDrive, Terminal, Xbox, AsusMouseAgent; Edge y Security en inicio',
      installedSoftware: 'Microsoft Store actualizado (13 apps al día: Clipchamp, Power Automate, Enlace Móvil, Recortar y anotar, AV1)',
      maintenanceAction: 'MANTENIMIENTO PREVENTIVO EXITOSO: Dispositivo de mayor potencia (i5 12th Gen, 16GB RAM, NVMe 512GB); actualización de sistema y apps de la Store completadas.',
      
      // Inventario y Asignación
      inventoryDate: '2026-09-16',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'ID Dispositivo: 3907B42F-B5E5-4946-BA18-F11009052489. ID Producto: 00327-60000-00000-AA118. Equipo de máximo rendimiento institucional (i5 12th Gen 10 núcleos, 16GB RAM, 512GB SSD NVMe Gen4, Wi-Fi 6E).',
      approvedBy: 'Dirección Fondacio Colombia',
      
      sede: 'Altos del Cabo',
      assignedTo: 'FONDACIO CEI ALTOS',
      assignedRole: 'Coordinador CEI Altos del Cabo',
      location: 'Oficina Central Altos del Cabo / CEI',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-16',
      
      status: 'operativo',
      condition: 'Excelente',
      recommendations: 'MANTENIMIENTO PREVENTIVO EXITOSO: Equipo principal para edición de video, diseño gráfico, analítica de proyectos comunitarios y gestión ambiental.',
      estimatedValue: 3200000,
      createdAt: '2026-09-16T09:30:00.000Z'
    },

    // ==========================================
    // DISPOSITIVOS MÓVILES (5 TABLETS REALES)
    // ==========================================
    {
      id: 'ast-real-tab01',
      code: 'TAB-01',
      area: 'AULA TIC / LECTURA COMUNITARIA',
      computerType: 'TABLET',
      category: 'tablet',
      brand: 'Genérica / Institucional',
      model: "Tablet 7''-10'' (Tablet Fondacio 01)",
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo Fondacio',
      image: 'img/tablet_educativa_android.jpg',
      
      serial: 'TAB-AND5-01-FND',
      processor: 'Quad-Core ARM Cortex @ 1.30 GHz',
      gpu: 'GPU Mali-400 Integrada',
      ram: '1 GB / 2 GB RAM',
      
      disk1Brand: 'eMMC Flash Interna',
      disk1Capacity: '8 GB / 16 GB eMMC',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-01',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0" Capacitiva',
      monitorPlate: 'N/A Integrada',
      keyboardBrandModel: 'Teclado Virtual Táctil Android',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Pantalla Multitáctil Capacitiva',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Micro-USB 5V/2A, Funda protectora de silicona',
      
      networkInUse: 'WIFI',
      networkHostname: 'Tablet Fondacio 1',
      ip: 'Wi-Fi (ALTINET FONDACIO)',
      mac: '00:1A:79:82:11:01',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      os: 'Android OS 5.0 (Lollipop)',
      osBuild: 'Android 5.0 Lollipop',
      licenseState: 'N/A (Open Source)',
      licenseType: 'Cuenta Institucional Google Fondacio',
      licenseAlerts: 'Obsolescencia por fin de ciclo Android 5.0 mitigada con entorno web',
      obsolescenceStrategy: 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
      installedSoftware: 'Navegador Web Ligero, Acceso Directo Google Drive, Visor de Documentos PDF, Google Docs/Sheets Web',
      maintenanceAction: 'Adecuación exitosa con acceso directo web a Drive / Suite Google Institucional.',
      
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'Censo de 5 tablets para talleres comunitarios. Estrategia de mitigación de obsolescencia aplicada.',
      approvedBy: 'Coordinación Pedagógica Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Institucional Google Fondacio',
      assignedRole: 'Beneficiarios Niñez y Juventud / Talleres',
      location: 'Aula de Apoyo Pedagógico / Biblioteca',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso destinado: Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo.',
      estimatedValue: 250000,
      createdAt: '2026-09-14T10:00:00.000Z'
    },
    {
      id: 'ast-real-tab02',
      code: 'TAB-02',
      area: 'AULA TIC / LECTURA COMUNITARIA',
      computerType: 'TABLET',
      category: 'tablet',
      brand: 'Genérica / Institucional',
      model: "Tablet 7''-10'' (Tablet Fondacio 02)",
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo Fondacio',
      image: 'img/tablet_educativa_android.jpg',
      
      serial: 'TAB-AND5-02-FND',
      processor: 'Quad-Core ARM Cortex @ 1.30 GHz',
      gpu: 'GPU Mali-400 Integrada',
      ram: '1 GB / 2 GB RAM',
      
      disk1Brand: 'eMMC Flash Interna',
      disk1Capacity: '8 GB / 16 GB eMMC',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-02',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0" Capacitiva',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil Android',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Pantalla Multitáctil',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'Tablet Fondacio 2',
      ip: 'Wi-Fi (ALTINET FONDACIO)',
      mac: '00:1A:79:82:11:02',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      os: 'Android OS 5.0 (Lollipop)',
      osBuild: 'Android 5.0 Lollipop',
      licenseState: 'N/A (Open Source)',
      licenseType: 'Cuenta Institucional Google Fondacio',
      licenseAlerts: 'Obsolescencia por fin de ciclo Android 5.0 mitigada con entorno web',
      obsolescenceStrategy: 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
      installedSoftware: 'Navegador Web Ligero, Acceso Directo Google Drive, Visor de Documentos PDF, Google Docs/Sheets Web',
      maintenanceAction: 'Adecuación exitosa con acceso directo web a Drive / Suite Google Institucional.',
      
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'Configurada con acceso web directo a Google Workspace para lectura de cartillas y apoyo pedagógico.',
      approvedBy: 'Coordinación Pedagógica Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Institucional Google Fondacio',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Aula de Apoyo Pedagógico / Biblioteca',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso destinado: Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo.',
      estimatedValue: 250000,
      createdAt: '2026-09-14T10:05:00.000Z'
    },
    {
      id: 'ast-real-tab03',
      code: 'TAB-03',
      area: 'AULA TIC / LECTURA COMUNITARIA',
      computerType: 'TABLET',
      category: 'tablet',
      brand: 'Genérica / Institucional',
      model: "Tablet 7''-10'' (Tablet Fondacio 03)",
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo Fondacio',
      image: 'img/tablet_educativa_android.jpg',
      
      serial: 'TAB-AND5-03-FND',
      processor: 'Quad-Core ARM Cortex @ 1.30 GHz',
      gpu: 'GPU Mali-400 Integrada',
      ram: '1 GB / 2 GB RAM',
      
      disk1Brand: 'eMMC Flash Interna',
      disk1Capacity: '8 GB / 16 GB eMMC',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-03',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0" Capacitiva',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil Android',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Pantalla Multitáctil',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'Tablet Fondacio 3',
      ip: 'Wi-Fi (ALTINET FONDACIO)',
      mac: '00:1A:79:82:11:03',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      os: 'Android OS 5.0 (Lollipop)',
      osBuild: 'Android 5.0 Lollipop',
      licenseState: 'N/A (Open Source)',
      licenseType: 'Cuenta Institucional Google Fondacio',
      licenseAlerts: 'Obsolescencia por fin de ciclo Android 5.0 mitigada con entorno web',
      obsolescenceStrategy: 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
      installedSoftware: 'Navegador Web Ligero, Acceso Directo Google Drive, Visor de Documentos PDF, Google Docs/Sheets Web',
      maintenanceAction: 'Adecuación exitosa con acceso directo web a Drive / Suite Google Institucional.',
      
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'Configurada con acceso web directo a Google Workspace para lectura de cartillas y apoyo pedagógico.',
      approvedBy: 'Coordinación Pedagógica Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Institucional Google Fondacio',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Aula de Apoyo Pedagógico / Biblioteca',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso destinado: Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo.',
      estimatedValue: 250000,
      createdAt: '2026-09-14T10:10:00.000Z'
    },
    {
      id: 'ast-real-tab04',
      code: 'TAB-04',
      area: 'AULA TIC / LECTURA COMUNITARIA',
      computerType: 'TABLET',
      category: 'tablet',
      brand: 'Genérica / Institucional',
      model: "Tablet 7''-10'' (Tablet Fondacio 04)",
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo Fondacio',
      image: 'img/tablet_educativa_android.jpg',
      
      serial: 'TAB-AND5-04-FND',
      processor: 'Quad-Core ARM Cortex @ 1.30 GHz',
      gpu: 'GPU Mali-400 Integrada',
      ram: '1 GB / 2 GB RAM',
      
      disk1Brand: 'eMMC Flash Interna',
      disk1Capacity: '8 GB / 16 GB eMMC',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-04',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0" Capacitiva',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil Android',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Pantalla Multitáctil',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'Tablet Fondacio 4',
      ip: 'Wi-Fi (ALTINET FONDACIO)',
      mac: '00:1A:79:82:11:04',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      os: 'Android OS 5.0 (Lollipop)',
      osBuild: 'Android 5.0 Lollipop',
      licenseState: 'N/A (Open Source)',
      licenseType: 'Cuenta Institucional Google Fondacio',
      licenseAlerts: 'Obsolescencia por fin de ciclo Android 5.0 mitigada con entorno web',
      obsolescenceStrategy: 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
      installedSoftware: 'Navegador Web Ligero, Acceso Directo Google Drive, Visor de Documentos PDF, Google Docs/Sheets Web',
      maintenanceAction: 'Adecuación exitosa con acceso directo web a Drive / Suite Google Institucional.',
      
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'Configurada con acceso web directo a Google Workspace para lectura de cartillas y apoyo pedagógico.',
      approvedBy: 'Coordinación Pedagógica Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Institucional Google Fondacio',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Aula de Apoyo Pedagógico / Biblioteca',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso destinado: Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo.',
      estimatedValue: 250000,
      createdAt: '2026-09-14T10:15:00.000Z'
    },
    {
      id: 'ast-real-tab05',
      code: 'TAB-05',
      area: 'AULA TIC / LECTURA COMUNITARIA',
      computerType: 'TABLET',
      category: 'tablet',
      brand: 'Genérica / Institucional',
      model: "Tablet 7''-10'' (Tablet Fondacio 05)",
      purchaseDate: '2022-05-10',
      provider: 'Donación Proyecto Educativo Fondacio',
      image: 'img/tablet_educativa_android.jpg',
      
      serial: 'TAB-AND5-05-FND',
      processor: 'Quad-Core ARM Cortex @ 1.30 GHz',
      gpu: 'GPU Mali-400 Integrada',
      ram: '1 GB / 2 GB RAM',
      
      disk1Brand: 'eMMC Flash Interna',
      disk1Capacity: '8 GB / 16 GB eMMC',
      disk1Tech: 'SSD SATA',
      disk1Serial: 'EMMC-TAB-05',
      disk1Model: 'Almacenamiento Flash Integrado 16GB',
      
      disk2Brand: '',
      disk2Capacity: '',
      disk2Tech: '',
      disk2Serial: '',
      disk2Model: '',
      
      monitorBrandModel: 'Pantalla Táctil IPS 7.0" Capacitiva',
      monitorPlate: 'N/A',
      keyboardBrandModel: 'Teclado Virtual Táctil Android',
      keyboardPlate: 'N/A',
      mouseBrandModel: 'Pantalla Multitáctil',
      mousePlate: 'N/A',
      otherPeripherals: 'Cargador Micro-USB 5V/2A',
      
      networkInUse: 'WIFI',
      networkHostname: 'Tablet Fondacio 5',
      ip: 'Wi-Fi (ALTINET FONDACIO)',
      mac: '00:1A:79:82:11:05',
      networkCardBrand: 'Wi-Fi 802.11 b/g/n Integrado',
      networkSpeed: '72 Mbps',
      wifiSSID: 'ALTINET FONDACIO',
      domain: 'WORKGROUP',
      
      os: 'Android OS 5.0 (Lollipop)',
      osBuild: 'Android 5.0 Lollipop',
      licenseState: 'N/A (Open Source)',
      licenseType: 'Cuenta Institucional Google Fondacio',
      licenseAlerts: 'Obsolescencia por fin de ciclo Android 5.0 mitigada con entorno web',
      obsolescenceStrategy: 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
      installedSoftware: 'Navegador Web Ligero, Acceso Directo Google Drive, Visor de Documentos PDF, Google Docs/Sheets Web',
      maintenanceAction: 'Adecuación exitosa con acceso directo web a Drive / Suite Google Institucional.',
      
      inventoryDate: '2026-09-14',
      inventoriedBy: 'Equipo de Inventario TIC Fondacio',
      inventoryObservations: 'Configurada con acceso web directo a Google Workspace para lectura de cartillas y apoyo pedagógico.',
      approvedBy: 'Coordinación Pedagógica Fondacio',
      
      sede: 'Altos del Cabo',
      assignedTo: 'Cuenta Institucional Google Fondacio',
      assignedRole: 'Beneficiarios Niñez y Juventud',
      location: 'Aula de Apoyo Pedagógico / Biblioteca',
      physicalAddress: 'Cra. 9 Este #96-74 km 5 vía La Calera, Barrio San Luis, Chapinero, Bogotá D.C.',
      assignmentDate: '2026-09-14',
      
      status: 'operativo',
      condition: 'Bueno',
      recommendations: 'Uso destinado: Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo.',
      estimatedValue: 250000,
      createdAt: '2026-09-14T10:20:00.000Z'
    }
  ],
  loans: [
    {
      id: 'loan-001',
      assetId: 'ast-real-pc04',
      assetCode: 'PC-04',
      assetName: 'ASUS Vivobook X1504ZA (CEIALTOSFONDACIO)',
      borrowerName: 'Santiago Guerrero',
      borrowerId: '1.014.283.901',
      borrowerRole: 'Coordinador CEI Altos del Cabo',
      borrowerEmail: 's.guerrero@fondacio-co.org',
      borrowerPhone: '+57 300 5566591',
      sede: 'Altos del Cabo',
      purpose: 'Gestión y coordinación de proyectos ambientales, siembras y diplomado en ecología integral.',
      loanDate: '2026-09-16',
      expectedReturnDate: '2026-12-20',
      actualReturnDate: null,
      status: 'activo',
      conditionOnLoan: 'Equipo ASUS Vivobook i5 12th Gen 16GB RAM en excelente estado, incluye cargador original ASUS y funda protectora.',
      returnNotes: '',
      createdAt: '2026-09-16T10:00:00.000Z'
    },
    {
      id: 'loan-002',
      assetId: 'ast-real-tab01',
      assetCode: 'TAB-01',
      assetName: 'Tablet Fondacio 01 (Android 5.0)',
      borrowerName: 'Laura Vanessa Gómez',
      borrowerId: '1.020.893.412',
      borrowerRole: 'Voluntaria Docente',
      borrowerEmail: 'laura.gomez@fondacio-co.org',
      borrowerPhone: '+57 312 4567890',
      sede: 'Altos del Cabo',
      purpose: 'Talleres de lectura y guías pedagógicas interactivas con niños de la comunidad.',
      loanDate: '2026-09-15',
      expectedReturnDate: '2026-10-30',
      actualReturnDate: null,
      status: 'activo',
      conditionOnLoan: 'Tablet con acceso a Google Workspace configurado, cargador micro-USB y funda de silicona.',
      returnNotes: '',
      createdAt: '2026-09-15T11:00:00.000Z'
    }
  ],
  maintenances: [
    {
      id: 'maint-real-001',
      assetId: 'ast-real-pc02',
      assetCode: 'PC-02',
      assetName: 'Dell Latitude 7480 (DESKTOP-HUC988P)',
      type: 'correctivo',
      status: 'en_progreso',
      requestDate: '2026-09-14',
      scheduledDate: '2026-09-18',
      completionDate: null,
      technician: 'Equipo Técnico Voluntariado TIC Fondacio',
      cost: 0,
      description: 'CORRECTIVO URGENTE: Regularizar activación de licencia Windows 10 Pro (Error KMS 0x80072328). Reiniciar equipo para aplicar actualización de seguridad KB5126256. Desinstalar CCleaner y optimizar inicio.',
      replacedParts: 'Licencia Digital / Parche de Seguridad KB5126256',
      nextScheduledMaintenance: '2026-10-15',
      notes: 'Requiere regularizar activación de licencia y reiniciar para completar parches de seguridad.'
    },
    {
      id: 'maint-real-002',
      assetId: 'ast-real-pc03',
      assetCode: 'PC-03',
      assetName: 'Dell Latitude 5490 (DESKTOP-UIK4E1Q)',
      type: 'preventivo',
      status: 'completado',
      requestDate: '2026-09-10',
      scheduledDate: '2026-09-14',
      completionDate: '2026-09-14',
      technician: 'Equipo Técnico TIC Fondacio',
      cost: 0,
      description: 'MANTENIMIENTO PREVENTIVO ÓPTIMO: Desactivación de 13 apps innecesarias en el inicio (Copilot, Teams, OneDrive, Chrome, Xbox...). Comprobación de actualización completa a Windows 11 25H2 (Comp. 26200.8875). Verificación de Microsoft Defender con todas las protecciones en verde.',
      replacedParts: 'Ninguno (Optimización de Software)',
      nextScheduledMaintenance: '2027-03-14',
      notes: 'Equipo en estado de rendimiento óptimo y arranque acelerado.'
    },
    {
      id: 'maint-real-003',
      assetId: 'ast-real-pc04',
      assetCode: 'PC-04',
      assetName: 'ASUS Vivobook X1504ZA (CEIALTOSFONDACIO)',
      type: 'preventivo',
      status: 'completado',
      requestDate: '2026-09-12',
      scheduledDate: '2026-09-16',
      completionDate: '2026-09-16',
      technician: 'Equipo Técnico TIC Fondacio',
      cost: 0,
      description: 'MANTENIMIENTO PREVENTIVO EXITOSO: Optimización de arranque en equipo de alta potencia (i5 12th Gen, 16GB RAM, NVMe 512GB). Desactivación de Copilot, Teams, OneDrive y AsusMouseAgent del inicio. Actualización de 13 apps de Microsoft Store y descarga de actualización 25H2 al 99%.',
      replacedParts: 'Ninguno (Actualización y Puesta a Punto)',
      nextScheduledMaintenance: '2027-03-16',
      notes: 'Equipo verificado y configurado con máximo rendimiento operativo.'
    },
    {
      id: 'maint-real-004',
      assetId: 'ast-real-pc01',
      assetCode: 'PC-01',
      assetName: 'Dell Latitude 7480 (DESKTOP-P5E96FQ)',
      type: 'preventivo',
      status: 'completado',
      requestDate: '2026-09-10',
      scheduledDate: '2026-09-14',
      completionDate: '2026-09-14',
      technician: 'Equipo Técnico TIC Fondacio',
      cost: 0,
      description: 'MANTENIMIENTO PREVENTIVO: Estandarización de suite ofimática, limpieza física preventiva y revisión de espacio disponible en disco SSD (90.2 GB libres / 62.2% en uso). Uptime verificado.',
      replacedParts: 'Limpieza térmica preventiva',
      nextScheduledMaintenance: '2027-03-14',
      notes: 'Equipo operativo y estable.'
    },
    {
      id: 'maint-real-005',
      assetId: 'ast-real-tab01',
      assetCode: 'TAB-01 a TAB-05',
      assetName: 'Lote de 5 Tablets Android (Mitigación de Obsolescencia)',
      type: 'upgrade',
      status: 'completado',
      requestDate: '2026-09-12',
      scheduledDate: '2026-09-15',
      completionDate: '2026-09-15',
      technician: 'Equipo de Adecuación Tecnológica Fondacio',
      cost: 0,
      description: 'ADECUACIÓN Y MITIGACIÓN DE OBSOLESCENCIA: Habilitación de entorno colaborativo en lote de 5 tablets Android 5.0 (Lollipop). Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets) con cuenta institucional Fondacio para talleres pedagógicos.',
      replacedParts: 'Configuración Web Directa Google Workspace',
      nextScheduledMaintenance: '2027-01-15',
      notes: 'Las 5 tablets quedaron plenamente habilitadas para uso de lectura y consulta comunitaria.'
    }
  ],
  settings: {
    orgName: 'Fundación Fondacio Colombia',
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
        // Verificar si los activos tienen imágenes asignadas
        const hasImages = (parsed.assets || []).some(a => a.image);
        if (!hasImages) {
          console.info('Actualizando catálogo con imágenes y valores de hardware...');
          this.saveToStorage(INITIAL_SEED_DATA);
          return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
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
        (a.networkHostname && a.networkHostname.toLowerCase().includes(query)) ||
        (a.os && a.os.toLowerCase().includes(query))
      );
    }

    if (filters.sede && filters.sede !== 'all') {
      result = result.filter(a => a.sede === filters.sede);
    }

    if (filters.computerType && filters.computerType !== 'all') {
      if (filters.computerType === 'TABLET') {
        result = result.filter(a => a.category === 'tablet' || (a.computerType && a.computerType.toLowerCase().includes('tablet')) || (a.code && a.code.startsWith('TAB')));
      } else {
        result = result.filter(a => a.computerType === filters.computerType);
      }
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
      const t = a.category === 'tablet' || (a.code && a.code.startsWith('TAB')) ? 'TABLETS' : (a.computerType || 'Otros');
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

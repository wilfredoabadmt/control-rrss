/**
 * Catálogo Oficial del Organigrama del Gobierno Autónomo Municipal de El Alto (GAMEA 2026)
 * Estructurado jerárquicamente: Dirección / Dependencia Superior -> Unidades Organizacionales.
 * Fuente: extras/Organigrama.pdf y extras/plantilla_funcionarios.csv
 */

export const ORGANIGRAMA_GAMEA: Record<string, string[]> = {
  'Despacho Alcaldesa': [
    'Unidad de Relaciones Públicas y Protocolo',
    'Unidad Sumariante',
    'Unidad de Auditoria Interna',
    'Despacho Central de la Alcaldesa',
  ],
  'Dirección de Comunicación': [
    'Unidad de Prensa',
    'Unidad de Imagen Corporativa',
    'Unidad de Comunicación Digital',
    'Dirección Central de Comunicación',
  ],
  'Dirección General de Asesoría Legal': [
    'Unidad de Transparencia y Lucha Contra la Corrupción',
    'Unidad de Normas Municipales y Asuntos Administrativos',
    'Unidad de Asuntos Jurisdiccionales',
    'Unidad de Defensa y Regularización de Bienes de Dominio Municipal',
  ],
  'Dirección de Planificación': [
    'Unidad de Planificación Estratégica',
    'Unidad de Programación de Operaciones',
    'Unidad de Inversión Pública y Seguimiento',
    'Unidad de Ordenamiento Territorial',
  ],
  'Dirección de Atención Ciudadana': [
    'Unidad de Coordinación con Sub Alcaldías',
    'Unidad de Archivo Central',
    'Unidad de Prevención de Conflictos',
    'Unidad de Sistema Único de Trámites',
  ],
  'Secretaría Municipal de Gestión Institucional': [
    'Unidad del Observatorio Municipal',
    'Unidad de Gestión Social',
    'Secretaría Central de Gestión Institucional',
  ],
  'Dirección de Regulación de la Movilidad Urbana': [
    'Unidad de Regulación del Transporte',
    'Unidad de Señalización y Semaforización',
  ],
  'Secretaría Municipal de Movilidad Urbana': [
    'Unidad de Planificación de la Movilidad Urbana Sostenible',
    'Unidad Guardia Municipal de Transporte',
    'Secretaría Central de Movilidad Urbana',
  ],
  'Dirección Municipal de Transporte Público – Bus Municipal': [
    'Unidad de Mantenimiento',
    'Unidad de Operaciones',
    'Unidad de Administración y Recaudo',
  ],
  'Dirección de Contrataciones': [
    'Unidad de Adquisiciones y Contrataciones Menores',
    'Unidad Jurídica de Contrataciones',
    'Unidad de Licitaciones',
  ],
  'Dirección Administrativa': [
    'Unidad de Activos Fijos',
    'Unidad de Servicios Generales y Mantenimiento',
    'Unidad de Almacenes',
    'Unidad de Administración de Sistemas de Información',
  ],
  'Dirección de Talento Humano': [
    'Unidad de Registro',
    'Unidad de Asesoría Legal DTH',
    'Unidad de Planillas y Control',
    'Unidad de Selección y Contratación',
    'Unidad de Capacitación y Evaluación',
    'Unidad de Desarrollo Organizacional',
  ],
  'Dirección del Tesoro Municipal': [
    'Unidad de Tesorería',
    'Unidad de Presupuesto',
    'Unidad de Contabilidad',
    'Unidad de Crédito Público y Gestión de Financiamiento',
  ],
  'Dirección de Administración Tributaria Municipal': [
    'Unidad de Ingresos y Control Tributario',
    'Unidad de Asesoría Jurídica y Cobranza Coactiva',
    'Unidad de Fiscalización y Recaudaciones',
  ],
  'Dirección de Administración Territorial y Catastro': [
    'Unidad de Catastro Municipal y Cartografía',
    'Unidad de Vialidad',
    'Unidad de Administración Territorial',
    'Unidad Jurídica de Administración Territorial',
    'Unidad de Límites',
  ],
  'Dirección de Deportes': [
    'Unidad de Infraestructura',
    'Unidad de Fortalecimiento Deportivo',
  ],
  'Dirección de Cultura Escuela Municipal de Artes': [
    'Unidad de Fomento a Iniciativas Artísticas y Culturales',
    'Unidad de Administración de Espacios Culturales',
  ],
  'Secretaría Municipal de Educación y Cultura': [
    'Unidad de Turismo',
    'Secretaría Central de Educación y Cultura',
  ],
  'Dirección de Atención Servicios de Educación': [
    'Unidad de Programas Educativos',
  ],
  'Dirección de Adm. y Mejora de la Infraestructura y Equipamiento Educativo': [
    'Unidad de Mejora de la Infraestructura y Equipamiento Educativo',
    'Unidad de Regularización Bienes Inmuebles Sector de Educación',
  ],
  'Dirección de Niñez Género y Atención Social': [
    'Unidad de la Mujer',
    'Unidad de la Infancia Niñez y Adolescencia',
    'Unidad de Atención Integral a la Familia',
  ],
  'Secretaría Municipal de Desarrollo Humano y Social Integral': [
    'Unidad de Poblaciones Diversas',
    'Secretaría Central de Desarrollo Humano',
  ],
  'Dirección de Desarrollo Integral': [
    'Unidad de Adultos Mayores',
    'Unidad de la Juventud',
    'Unidad de Atención a Personas con Discapacidad',
  ],
  'Dirección de Seguridad Pública Programas de Seguridad Ciudadana y Soluciones Tecnológicas': [
    'Intendencia Guardia y Banda Municipal',
    'Unidad de Programas de Seguridad Ciudadana y Soluciones Tecnológicas',
  ],
  'Dirección de Gestión en Salud': [
    'Unidad de Promoción y Prevención',
    'Unidad de Epidemiología',
  ],
  'Dirección de Gestión Servicios de Salud Nivel Desconcentrado': [
    'Unidad de Programas y Proyectos',
  ],
  'Dirección de Establecimientos de Salud de Primer Nivel': [
    'Unidad de Planificación Municipal en Salud',
  ],
  'Secretaría Municipal de Salud': [
    'Unidad Técnica de Administración del S.U.S.',
    'Secretaría Central de Salud',
  ],
  'Dirección de Proyectos Municipales': [
    'Unidad de Proyectos Municipales',
    'Unidad de Proyectos Estratégicos',
  ],
  'Dirección de Supervisión de Obras': [
    'Unidad de Supervisión de Obras Municipales',
    'Unidad de Supervisión de Obras Estratégicas',
    'Unidad de Cierre de Proyectos',
  ],
  'Dirección de Fiscalización de Obras': [
    'Unidad de Fiscalización de Proyectos Estratégicos',
    'Unidad de Fiscalización de Proyectos Municipales',
  ],
  'Dirección de Obras Municipales': [
    'Unidad de Infraestructura Vial',
    'Unidad de Infraestructura Municipal',
    'Unidad de Pavimentos',
    'Unidad de Mantenimiento y Bacheo',
    'Unidad de Administración de Maquinarias',
  ],
  'Dirección de Alumbrado Público': [
    'Unidad de Programas y Proyectos de Alumbrado Público',
    'Unidad Operativa de Alumbrado Público',
  ],
  'Dirección de Gestión Integral de Residuos': [
    'Unidad de Gestión de Residuos',
    'Unidad de Seguimiento y Control',
  ],
  'Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental': [
    'Unidad de Saneamiento Básico',
    'Unidad de Recursos Hídricos y Drenaje Pluvial',
    'Unidad de Control y Monitoreo Ambiental',
  ],
  'Secretaría Municipal de Agua Saneamiento Gestión Ambiental y Riesgos': [
    'Unidad de Prevención y Calidad Ambiental',
    'Secretaría Central de Agua y Gestión Ambiental',
  ],
  'Dirección de Gestión de Riesgos': [
    'Unidad de Prevención de Riesgos',
    'Centro de Operaciones de Emergencia',
  ],
  'Dirección de Forestación y Áreas Protegidas': [
    'Unidad de Áreas Verdes Protegidas y Bofedales',
    'Unidad de Forestación',
  ],
  'Dirección de Desarrollo Productivo Artesanal': [
    'Unidad de Promoción Artesanal',
    'Unidad de Desarrollo Productivo Artesanal',
  ],
  'Dirección de Agropecuaria y Seguridad Alimentaria': [
    'Unidad de Fortalecimiento Agropecuario',
    'Unidad de Gestión de Proyectos Agropecuarios',
  ],
  'Dirección de Desarrollo Productivo de Pequeñas y Medianas Empresas': [
    'Unidad de Competitividad y Productividad',
    'Unidad de Innovación y Emprendimiento',
  ],
  'Dirección de Servicios Municipales e Iniciativas Económicas': [
    'Unidad de Administración de Servicios Municipales',
    'Unidad de Iniciativas Económicas',
  ],
  'Dirección de Ferias y Mercados': [
    'Unidad de Ferias',
    'Unidad de Mercados',
  ],
};

export const LISTA_DIRECCIONES = Object.keys(ORGANIGRAMA_GAMEA).sort((a, b) =>
  a.localeCompare(b, 'es')
);

/**
 * Catálogo Oficial del Organigrama del Gobierno Autónomo Municipal de El Alto (GAMEA 2026)
 * Estructurado jerárquicamente en 3 niveles:
 * Nivel 1: Secretaría Municipal / Despacho Alcalde
 * Nivel 2: Dirección Institucional
 * Nivel 3: Unidades Organizacionales
 *
 * Fuente: extras/Organigrama.pdf y estructura administrativa municipal de El Alto.
 */

export interface DireccionOrganica {
  nombre: string;
  unidades: string[];
}

export interface SecretariaOrganica {
  nombre: string;
  direcciones: DireccionOrganica[];
}

export const ESTRUCTURA_ORGANICA_GAMEA: SecretariaOrganica[] = [
  {
    nombre: 'Despacho Alcalde',
    direcciones: [
      {
        nombre: 'Dirección de Comunicación',
        unidades: [
          'Unidad de Prensa',
          'Unidad de Imagen Corporativa',
          'Unidad de Comunicación Digital',
          'Prensa',
          'Post Producción',
          'Dirección Central de Comunicación',
        ],
      },
      {
        nombre: 'Dirección General de Asesoría Legal',
        unidades: [
          'Unidad de Transparencia y Lucha Contra la Corrupción',
          'Unidad de Normas Municipales y Asuntos Administrativos',
          'Unidad de Asuntos Jurisdiccionales',
          'Unidad de Defensa y Regularización de Bienes de Dominio Municipal',
        ],
      },
      {
        nombre: 'Dirección de Planificación',
        unidades: [
          'Unidad de Planificación Estratégica',
          'Unidad de Programación de Operaciones',
          'Unidad de Inversión Pública y Seguimiento',
          'Unidad de Ordenamiento Territorial',
        ],
      },
      {
        nombre: 'Despacho Central del Alcalde',
        unidades: [
          'Unidad de Relaciones Públicas y Protocolo',
          'Unidad Sumariante',
          'Unidad de Auditoria Interna',
          'Despacho Central del Alcalde',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Gestión Institucional',
    direcciones: [
      {
        nombre: 'Dirección de Atención Ciudadana',
        unidades: [
          'Unidad de Coordinación con Sub Alcaldías',
          'Unidad de Archivo Central',
          'Unidad de Prevención de Conflictos',
          'Unidad de Sistema Único de Trámites',
        ],
      },
      {
        nombre: 'Secretaría Central de Gestión Institucional',
        unidades: [
          'Unidad del Observatorio Municipal',
          'Unidad de Gestión Social',
          'Secretaría Central de Gestión Institucional',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Movilidad Urbana',
    direcciones: [
      {
        nombre: 'Dirección de Regulación de la Movilidad Urbana',
        unidades: [
          'Unidad de Regulación del Transporte',
          'Unidad de Señalización y Semaforización',
        ],
      },
      {
        nombre: 'Dirección Municipal de Transporte Público – Bus Municipal',
        unidades: [
          'Unidad de Mantenimiento',
          'Unidad de Operaciones',
          'Unidad de Administración y Recaudo',
        ],
      },
      {
        nombre: 'Secretaría Central de Movilidad Urbana',
        unidades: [
          'Unidad de Planificación de la Movilidad Urbana Sostenible',
          'Unidad Guardia Municipal de Transporte',
          'Secretaría Central de Movilidad Urbana',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Administración y Finanzas',
    direcciones: [
      {
        nombre: 'Dirección de Contrataciones',
        unidades: [
          'Unidad de Adquisiciones y Contrataciones Menores',
          'Unidad Jurídica de Contrataciones',
          'Unidad de Licitaciones',
        ],
      },
      {
        nombre: 'Dirección Administrativa',
        unidades: [
          'Unidad de Activos Fijos',
          'Unidad de Servicios Generales y Mantenimiento',
          'Unidad de Almacenes',
          'Unidad de Administración de Sistemas de Información',
        ],
      },
      {
        nombre: 'Dirección de Talento Humano',
        unidades: [
          'Unidad de Registro',
          'Unidad de Asesoría Legal DTH',
          'Unidad de Planillas y Control',
          'Unidad de Selección y Contratación',
          'Unidad de Capacitación y Evaluación',
          'Unidad de Desarrollo Organizacional',
        ],
      },
      {
        nombre: 'Dirección del Tesoro Municipal',
        unidades: [
          'Unidad de Tesorería',
          'Unidad de Presupuesto',
          'Unidad de Contabilidad',
          'Unidad de Crédito Público y Gestión de Financiamiento',
        ],
      },
      {
        nombre: 'Dirección de Administración Tributaria Municipal',
        unidades: [
          'Unidad de Ingresos y Control Tributario',
          'Unidad de Asesoría Jurídica y Cobranza Coactiva',
          'Unidad de Fiscalización y Recaudaciones',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Educación y Cultura',
    direcciones: [
      {
        nombre: 'Dirección de Deportes',
        unidades: [
          'Unidad de Infraestructura',
          'Unidad de Fortalecimiento Deportivo',
        ],
      },
      {
        nombre: 'Dirección de Cultura Escuela Municipal de Artes',
        unidades: [
          'Unidad de Fomento a Iniciativas Artísticas y Culturales',
          'Unidad de Administración de Espacios Culturales',
        ],
      },
      {
        nombre: 'Dirección de Atención Servicios de Educación',
        unidades: [
          'Unidad de Programas Educativos',
        ],
      },
      {
        nombre: 'Dirección de Adm. y Mejora de la Infraestructura y Equipamiento Educativo',
        unidades: [
          'Unidad de Mejora de la Infraestructura y Equipamiento Educativo',
          'Unidad de Regularización Bienes Inmuebles Sector de Educación',
        ],
      },
      {
        nombre: 'Secretaría Central de Educación y Cultura',
        unidades: [
          'Unidad de Turismo',
          'Secretaría Central de Educación y Cultura',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Desarrollo Humano y Social Integral',
    direcciones: [
      {
        nombre: 'Dirección de Niñez Género y Atención Social',
        unidades: [
          'Unidad de la Mujer',
          'Unidad de la Infancia Niñez y Adolescencia',
          'Unidad de Atención Integral a la Familia',
        ],
      },
      {
        nombre: 'Dirección de Desarrollo Integral',
        unidades: [
          'Unidad de Adultos Mayores',
          'Unidad de la Juventud',
          'Unidad de Atención a Personas con Discapacidad',
        ],
      },
      {
        nombre: 'Dirección de Seguridad Pública Programas de Seguridad Ciudadana y Soluciones Tecnológicas',
        unidades: [
          'Intendencia Guardia y Banda Municipal',
          'Unidad de Programas de Seguridad Ciudadana y Soluciones Tecnológicas',
        ],
      },
      {
        nombre: 'Secretaría Central de Desarrollo Humano',
        unidades: [
          'Unidad de Poblaciones Diversas',
          'Secretaría Central de Desarrollo Humano',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Salud',
    direcciones: [
      {
        nombre: 'Dirección de Gestión en Salud',
        unidades: [
          'Unidad de Promoción y Prevención',
          'Unidad de Epidemiología',
        ],
      },
      {
        nombre: 'Dirección de Gestión Servicios de Salud Nivel Desconcentrado',
        unidades: [
          'Unidad de Programas y Proyectos',
        ],
      },
      {
        nombre: 'Dirección de Establecimientos de Salud de Primer Nivel',
        unidades: [
          'Unidad de Planificación Municipal en Salud',
        ],
      },
      {
        nombre: 'Secretaría Central de Salud',
        unidades: [
          'Unidad Técnica de Administración del S.U.S.',
          'Secretaría Central de Salud',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Infraestructura Pública',
    direcciones: [
      {
        nombre: 'Dirección de Proyectos Municipales',
        unidades: [
          'Unidad de Proyectos Municipales',
          'Unidad de Proyectos Estratégicos',
        ],
      },
      {
        nombre: 'Dirección de Supervisión de Obras',
        unidades: [
          'Unidad de Supervisión de Obras Municipales',
          'Unidad de Supervisión de Obras Estratégicas',
          'Unidad de Cierre de Proyectos',
        ],
      },
      {
        nombre: 'Dirección de Fiscalización de Obras',
        unidades: [
          'Unidad de Fiscalización de Proyectos Estratégicos',
          'Unidad de Fiscalización de Proyectos Municipales',
        ],
      },
      {
        nombre: 'Dirección de Obras Municipales',
        unidades: [
          'Unidad de Infraestructura Vial',
          'Unidad de Infraestructura Municipal',
          'Unidad de Pavimentos',
          'Unidad de Mantenimiento y Bacheo',
          'Unidad de Administración de Maquinarias',
        ],
      },
      {
        nombre: 'Dirección de Alumbrado Público',
        unidades: [
          'Unidad de Programas y Proyectos de Alumbrado Público',
          'Unidad Operativa de Alumbrado Público',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Agua Saneamiento Gestión Ambiental y Riesgos',
    direcciones: [
      {
        nombre: 'Dirección de Gestión Integral de Residuos',
        unidades: [
          'Unidad de Gestión de Residuos',
          'Unidad de Seguimiento y Control',
        ],
      },
      {
        nombre: 'Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental',
        unidades: [
          'Unidad de Saneamiento Básico',
          'Unidad de Recursos Hídricos y Drenaje Pluvial',
          'Unidad de Control y Monitoreo Ambiental',
        ],
      },
      {
        nombre: 'Dirección de Gestión de Riesgos',
        unidades: [
          'Unidad de Prevención de Riesgos',
          'Centro de Operaciones de Emergencia',
        ],
      },
      {
        nombre: 'Dirección de Forestación y Áreas Protegidas',
        unidades: [
          'Unidad de Áreas Verdes Protegidas y Bofedales',
          'Unidad de Forestación',
        ],
      },
      {
        nombre: 'Secretaría Central de Agua y Gestión Ambiental',
        unidades: [
          'Unidad de Prevención y Calidad Ambiental',
          'Secretaría Central de Agua y Gestión Ambiental',
        ],
      },
    ],
  },
  {
    nombre: 'Secretaría Municipal de Desarrollo Económico',
    direcciones: [
      {
        nombre: 'Dirección de Desarrollo Productivo Artesanal',
        unidades: [
          'Unidad de Promoción Artesanal',
          'Unidad de Desarrollo Productivo Artesanal',
        ],
      },
      {
        nombre: 'Dirección de Agropecuaria y Seguridad Alimentaria',
        unidades: [
          'Unidad de Fortalecimiento Agropecuario',
          'Unidad de Gestión de Proyectos Agropecuarios',
        ],
      },
      {
        nombre: 'Dirección de Desarrollo Productivo de Pequeñas y Medianas Empresas',
        unidades: [
          'Unidad de Competitividad y Productividad',
          'Unidad de Innovación y Emprendimiento',
        ],
      },
      {
        nombre: 'Dirección de Servicios Municipales e Iniciativas Económicas',
        unidades: [
          'Unidad de Administración de Servicios Municipales',
          'Unidad de Iniciativas Económicas',
        ],
      },
      {
        nombre: 'Dirección de Ferias y Mercados',
        unidades: [
          'Unidad de Ferias',
          'Unidad de Mercados',
        ],
      },
      {
        nombre: 'Dirección de Administración Territorial y Catastro',
        unidades: [
          'Unidad de Catastro Municipal y Cartografía',
          'Unidad de Vialidad',
          'Unidad de Administración Territorial',
          'Unidad Jurídica de Administración Territorial',
          'Unidad de Límites',
        ],
      },
    ],
  },
];

export const LISTA_SECRETARIAS: string[] = ESTRUCTURA_ORGANICA_GAMEA.map((s) => s.nombre);

// Diccionario plano retrocompatible: Dirección -> Unidades
export const ORGANIGRAMA_GAMEA: Record<string, string[]> = {};
for (const sec of ESTRUCTURA_ORGANICA_GAMEA) {
  for (const dir of sec.direcciones) {
    ORGANIGRAMA_GAMEA[dir.nombre] = dir.unidades;
  }
}

export const LISTA_DIRECCIONES = Object.keys(ORGANIGRAMA_GAMEA).sort((a, b) =>
  a.localeCompare(b, 'es')
);

// Helpers de resolución jerárquica
export function getDireccionesBySecretaria(secretaria: string): string[] {
  if (!secretaria || secretaria === 'ALL') {
    return LISTA_DIRECCIONES;
  }
  const sec = ESTRUCTURA_ORGANICA_GAMEA.find(
    (s) => s.nombre.toLowerCase() === secretaria.toLowerCase()
  );
  if (!sec) return [];
  return sec.direcciones.map((d) => d.nombre).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getUnidadesByDireccion(secretaria: string, direccion: string): string[] {
  if (!direccion || direccion === 'ALL') {
    if (!secretaria || secretaria === 'ALL') return [];
    // Si hay secretaría pero no dirección, retornar todas las unidades de esa secretaría
    const sec = ESTRUCTURA_ORGANICA_GAMEA.find(
      (s) => s.nombre.toLowerCase() === secretaria.toLowerCase()
    );
    if (!sec) return [];
    const allUnits = sec.direcciones.flatMap((d) => d.unidades);
    return Array.from(new Set(allUnits)).sort((a, b) => a.localeCompare(b, 'es'));
  }

  // Buscar unidades de la dirección específica
  for (const sec of ESTRUCTURA_ORGANICA_GAMEA) {
    const dir = sec.direcciones.find(
      (d) => d.nombre.toLowerCase() === direccion.toLowerCase()
    );
    if (dir) {
      return [...dir.unidades].sort((a, b) => a.localeCompare(b, 'es'));
    }
  }

  // Fallback al diccionario plano
  return (ORGANIGRAMA_GAMEA[direccion] || []).slice().sort((a, b) => a.localeCompare(b, 'es'));
}

export function findSecretariaForDireccion(direccion: string): string | null {
  if (!direccion || direccion === 'ALL') return null;
  const dirNorm = direccion.trim().toLowerCase();
  for (const sec of ESTRUCTURA_ORGANICA_GAMEA) {
    if (sec.nombre.toLowerCase() === dirNorm) return sec.nombre;
    for (const d of sec.direcciones) {
      if (d.nombre.toLowerCase() === dirNorm) return sec.nombre;
    }
  }
  return null;
}

export function findDireccionForUnidad(unidad: string): string | null {
  if (!unidad || unidad === 'ALL') return null;
  const uNorm = unidad.trim().toLowerCase();
  for (const sec of ESTRUCTURA_ORGANICA_GAMEA) {
    for (const d of sec.direcciones) {
      if (d.unidades.some((u) => u.toLowerCase() === uNorm)) {
        return d.nombre;
      }
    }
  }
  return null;
}

export function findSecretariaForUnidad(unidad: string): string | null {
  if (!unidad || unidad === 'ALL') return null;
  const uNorm = unidad.trim().toLowerCase();
  for (const sec of ESTRUCTURA_ORGANICA_GAMEA) {
    for (const d of sec.direcciones) {
      if (d.unidades.some((u) => u.toLowerCase() === uNorm)) {
        return sec.nombre;
      }
    }
  }
  return null;
}

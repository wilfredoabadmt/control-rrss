import { apiClient } from './client';

export interface EmployeeItem {
  id: string;
  first_name: string;
  last_name: string;
  id_document?: string; // masked or unmasked based on role
  document_number?: string;
  email?: string;
  phone?: string;
  org_unit_id?: string;
  org_unit_name?: string;     // Unidad
  parent_unit_name?: string;  // Dirección
  position_id?: string;
  position_title?: string;
  facebook_account?: string;  // Cuenta Facebook
  tiktok_account?: string;    // Cuenta TikTok
  is_active: boolean;
  hire_date?: string;
  created_at: string;
}

export interface EmployeeImportResult {
  total_processed: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{ row: number; reason: string }>;
}

export interface OrgUnitNode {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  children?: OrgUnitNode[];
}

export const listEmployeesApi = async (params: {
  page?: number;
  page_size?: number;
  search?: string;
  org_unit_id?: string;
}): Promise<{ items: EmployeeItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/employees/', { params });
  return res.data;
};

export const createEmployeeApi = async (data: Partial<EmployeeItem>): Promise<EmployeeItem> => {
  const res = await apiClient.post('/employees/', data);
  return res.data;
};

export const importPayrollExcelApi = async (file: File): Promise<EmployeeImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateEmployeeApi = async (id: string, data: Partial<EmployeeItem> & { change_reason?: string; status?: string }): Promise<EmployeeItem> => {
  const res = await apiClient.patch(`/employees/${id}`, data);
  return res.data;
};

export const deleteEmployeeApi = async (id: string, permanent: boolean = false, reason?: string): Promise<{ detail: string }> => {
  const res = await apiClient.delete(`/employees/${id}`, {
    params: {
      permanent,
      reason: reason || (permanent ? 'Eliminación administrativa definitiva' : 'Desvinculación institucional'),
    },
  });
  return res.data;
};

export const getEmployeeHistoryApi = async (id: string): Promise<any[]> => {
  const res = await apiClient.get(`/employees/${id}/history`);
  return res.data;
};

export const getOrgUnitsTreeApi = async (): Promise<OrgUnitNode[]> => {
  const res = await apiClient.get('/org-units/tree');
  return res.data;
};

export const RAW_CSV_TEMPLATE = `nombres,apellidos,unidad,direccion,cuenta_facebook,cuenta_tiktok
Juan Carlos,Mamani Quispe,Unidad de Prensa,Dirección de Comunicación,facebook.com/juancarlos.mamani,@jcmamani
María Elena,Condori Flores,Unidad de Imagen Corporativa,Dirección de Comunicación,facebook.com/mariaelena.condori,@mecondori
Pedro,Huanca Ticona,Unidad de Comunicación Digital,Dirección de Comunicación,facebook.com/pedro.huanca,@phuanca
Rosa,Apaza Mamani,Unidad de Relaciones Públicas y Protocolo,Despacho Alcaldesa,facebook.com/rosa.apaza,@rapaza
Carlos,Quispe Choque,Unidad Sumariante,Despacho Alcaldesa,,
Ana,Flores Torres,Unidad de Auditoria Interna,Despacho Alcaldesa,,
Roberto,Choque Limachi,Unidad de Transparencia y Lucha Contra la Corrupción,Dirección General de Asesoría Legal,facebook.com/roberto.choque,
Luis Fernando,Tarqui Condori,Unidad de Normas Municipales y Asuntos Administrativos,Dirección General de Asesoría Legal,,
Martha,Poma Quisbert,Unidad de Asuntos Jurisdiccionales,Dirección General de Asesoría Legal,,
Diego,Callisaya Huanca,Unidad de Defensa y Regularización de Bienes de Dominio Municipal,Dirección General de Asesoría Legal,,
Silvia,Mamani Gutierrez,Unidad de Planificación Estratégica,Dirección de Planificación,facebook.com/silvia.mamani,@smamani
José,Ramos Flores,Unidad de Programación de Operaciones,Dirección de Planificación,,
Edwin,Copa Ticona,Unidad de Inversión Pública y Seguimiento,Dirección de Planificación,,
Patricia,Quispe Ramos,Unidad de Ordenamiento Territorial,Dirección de Planificación,,
Fernando,Limachi Torres,Unidad de Coordinación con Sub Alcaldías,Dirección de Atención Ciudadana,,
Carmen,Huanca Flores,Unidad de Archivo Central,Dirección de Atención Ciudadana,,
Miguel,Condori Poma,Unidad de Prevención de Conflictos,Dirección de Atención Ciudadana,,
Sandra,Apaza Quispe,Unidad de Sistema Único de Trámites,Dirección de Atención Ciudadana,,
Rodrigo,Mamani Callisaya,Unidad del Observatorio Municipal,Secretaría Municipal de Gestión Institucional,,
Daniela,Flores Condori,Unidad de Gestión Social,Secretaría Municipal de Gestión Institucional,facebook.com/daniela.flores,@dflores
Alberto,Ticona Huanca,Unidad de Regulación del Transporte,Dirección de Regulación de la Movilidad Urbana,,
Noemí,Choque Apaza,Unidad de Señalización y Semaforización,Dirección de Regulación de la Movilidad Urbana,,
Andrés,Ramos Limachi,Unidad de Planificación de la Movilidad Urbana Sostenible,Secretaría Municipal de Movilidad Urbana,,
Gloria,Quispe Mamani,Unidad Guardia Municipal de Transporte,Secretaría Municipal de Movilidad Urbana,,
Héctor,Copa Flores,Unidad de Mantenimiento,Dirección Municipal de Transporte Público – Bus Municipal,,
Lucía,Tarqui Apaza,Unidad de Operaciones,Dirección Municipal de Transporte Público – Bus Municipal,,
Oscar,Huanca Condori,Unidad de Administración y Recaudo,Dirección Municipal de Transporte Público – Bus Municipal,,
Verónica,Poma Torres,Unidad de Adquisiciones y Contrataciones Menores,Dirección de Contrataciones,,
Rafael,Callisaya Quispe,Unidad Jurídica de Contrataciones,Dirección de Contrataciones,,
Isabel,Mamani Ramos,Unidad de Licitaciones,Dirección de Contrataciones,,
Julio,Limachi Condori,Unidad de Activos Fijos,Dirección Administrativa,,
Teresa,Flores Huanca,Unidad de Servicios Generales y Mantenimiento,Dirección Administrativa,,
Mario,Condori Limachi,Unidad de Almacenes,Dirección Administrativa,,
Gabriela,Apaza Torres,Unidad de Administración de Sistemas de Información,Dirección Administrativa,facebook.com/gabriela.apaza,@gapaza
Ernesto,Quispe Flores,Unidad de Registro,Dirección de Talento Humano,,
Carla,Huanca Poma,Unidad de Asesoría Legal DTH,Dirección de Talento Humano,,
Raúl,Choque Mamani,Unidad de Planillas y Control,Dirección de Talento Humano,,
Mónica,Ticona Callisaya,Unidad de Selección y Contratación,Dirección de Talento Humano,,
David,Ramos Apaza,Unidad de Capacitación y Evaluación,Dirección de Talento Humano,,
Yolanda,Copa Condori,Unidad de Desarrollo Organizacional,Dirección de Talento Humano,,
Sergio,Tarqui Huanca,Unidad de Tesorería,Dirección del Tesoro Municipal,,
Elisa,Poma Flores,Unidad de Presupuesto,Dirección del Tesoro Municipal,,
Nelson,Callisaya Quispe,Unidad de Contabilidad,Dirección del Tesoro Municipal,,
Adriana,Mamani Torres,Unidad de Crédito Público y Gestión de Financiamiento,Dirección del Tesoro Municipal,,
Iván,Limachi Apaza,Unidad de Ingresos y Control Tributario,Dirección de Administración Tributaria Municipal,,
Paola,Flores Choque,Unidad de Asesoría Jurídica y Cobranza Coactiva,Dirección de Administración Tributaria Municipal,,
Gonzalo,Condori Ramos,Unidad de Fiscalización y Recaudaciones,Dirección de Administración Tributaria Municipal,,
Sonia,Apaza Huanca,Unidad de Catastro Municipal y Cartografía,Dirección de Administración Territorial y Catastro,,
Marcos,Quispe Poma,Unidad de Vialidad,Dirección de Administración Territorial y Catastro,,
Beatriz,Huanca Limachi,Unidad de Administración Territorial,Dirección de Administración Territorial y Catastro,,
Víctor,Choque Flores,Unidad Jurídica de Administración Territorial,Dirección de Administración Territorial y Catastro,,
Lorena,Ticona Mamani,Unidad de Límites,Dirección de Administración Territorial y Catastro,,
Fabián,Ramos Condori,Unidad de Infraestructura,Dirección de Deportes,,
Claudia,Copa Apaza,Unidad de Fortalecimiento Deportivo,Dirección de Deportes,,
Hugo,Tarqui Quispe,Unidad de Fomento a Iniciativas Artísticas y Culturales,Dirección de Cultura Escuela Municipal de Artes,,
Alicia,Poma Huanca,Unidad de Administración de Espacios Culturales,Dirección de Cultura Escuela Municipal de Artes,,
Ricardo,Callisaya Flores,Unidad de Turismo,Secretaría Municipal de Educación y Cultura,,
Natalia,Mamani Choque,Unidad de Programas Educativos,Dirección de Atención Servicios de Educación,,
Walter,Limachi Ticona,Unidad de Mejora de la Infraestructura y Equipamiento Educativo,Dirección de Adm. y Mejora de la Infraestructura y Equipamiento Educativo,,
Jimena,Flores Ramos,Unidad de Regularización Bienes Inmuebles Sector de Educación,Dirección de Adm. y Mejora de la Infraestructura y Equipamiento Educativo,,
Ramiro,Condori Copa,Unidad de la Mujer,Dirección de Niñez Género y Atención Social,,
Elizabeth,Apaza Tarqui,Unidad de la Infancia Niñez y Adolescencia,Dirección de Niñez Género y Atención Social,,
Pablo,Quispe Callisaya,Unidad de Atención Integral a la Familia,Dirección de Niñez Género y Atención Social,,
Mariana,Huanca Mamani,Unidad de Poblaciones Diversas,Secretaría Municipal de Desarrollo Humano y Social Integral,,
Alfredo,Choque Limachi,Unidad de Adultos Mayores,Dirección de Desarrollo Integral,,
Viviana,Ticona Flores,Unidad de la Juventud,Dirección de Desarrollo Integral,,
Enrique,Ramos Poma,Unidad de Atención a Personas con Discapacidad,Dirección de Desarrollo Integral,,
Susana,Copa Quispe,Intendencia Guardia y Banda Municipal,Dirección de Seguridad Pública Programas de Seguridad Ciudadana y Soluciones Tecnológicas,facebook.com/susana.copa,@scopa
Germán,Tarqui Condori,Unidad de Programas de Seguridad Ciudadana y Soluciones Tecnológicas,Dirección de Seguridad Pública Programas de Seguridad Ciudadana y Soluciones Tecnológicas,,
Cecilia,Poma Apaza,Unidad de Promoción y Prevención,Dirección de Gestión en Salud,,
Freddy,Callisaya Huanca,Unidad de Epidemiología,Dirección de Gestión en Salud,,
Roxana,Mamani Flores,Unidad de Programas y Proyectos,Dirección de Gestión Servicios de Salud Nivel Desconcentrado,,
Aldo,Limachi Choque,Unidad de Planificación Municipal en Salud,Dirección de Establecimientos de Salud de Primer Nivel,,
Miriam,Flores Ticona,Unidad Técnica de Administración del S.U.S.,Secretaría Municipal de Salud,,
Rolando,Condori Ramos,Unidad de Proyectos Municipales,Dirección de Proyectos Municipales,,
Estela,Apaza Poma,Unidad de Proyectos Estratégicos,Dirección de Proyectos Municipales,,
Jaime,Quispe Copa,Unidad de Supervisión de Obras Municipales,Dirección de Supervisión de Obras,,
Margarita,Huanca Tarqui,Unidad de Supervisión de Obras Estratégicas,Dirección de Supervisión de Obras,,
Felipe,Choque Callisaya,Unidad de Cierre de Proyectos,Dirección de Supervisión de Obras,,
Diana,Ticona Mamani,Unidad de Fiscalización de Proyectos Estratégicos,Dirección de Fiscalización de Obras,,
Leonardo,Ramos Limachi,Unidad de Fiscalización de Proyectos Municipales,Dirección de Fiscalización de Obras,,
Antonia,Copa Flores,Unidad de Infraestructura Vial,Dirección de Obras Municipales,,
Gustavo,Tarqui Apaza,Unidad de Infraestructura Municipal,Dirección de Obras Municipales,,
Olga,Poma Condori,Unidad de Pavimentos,Dirección de Obras Municipales,,
Rubén,Callisaya Choque,Unidad de Mantenimiento y Bacheo,Dirección de Obras Municipales,,
Alejandra,Mamani Ticona,Unidad de Administración de Maquinarias,Dirección de Obras Municipales,,
Jorge,Limachi Flores,Unidad de Programas y Proyectos de Alumbrado Público,Dirección de Alumbrado Público,,
Soledad,Flores Poma,Unidad Operativa de Alumbrado Público,Dirección de Alumbrado Público,,
Cristian,Condori Huanca,Unidad de Gestión de Residuos,Dirección de Gestión Integral de Residuos,,
Ingrid,Apaza Callisaya,Unidad de Seguimiento y Control,Dirección de Gestión Integral de Residuos,,
Manuel,Quispe Tarqui,Unidad de Saneamiento Básico,Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental,,
Pilar,Huanca Copa,Unidad de Recursos Hídricos y Drenaje Pluvial,Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental,,
Wilfredo,Choque Ramos,Unidad de Control y Monitoreo Ambiental,Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental,,
Aurora,Ticona Poma,Unidad de Prevención y Calidad Ambiental,Secretaría Municipal de Agua Saneamiento Gestión Ambiental y Riesgos,,
Arturo,Ramos Mamani,Unidad de Prevención de Riesgos,Dirección de Gestión de Riesgos,,
Marisol,Copa Limachi,Centro de Operaciones de Emergencia,Dirección de Gestión de Riesgos,,
Nicolás,Tarqui Flores,Unidad de Áreas Verdes Protegidas y Bofedales,Dirección de Forestación y Áreas Protegidas,,
Juana,Poma Choque,Unidad de Forestación,Dirección de Forestación y Áreas Protegidas,,
Samuel,Callisaya Apaza,Unidad de Promoción Artesanal,Dirección de Desarrollo Productivo Artesanal,,
Catalina,Mamani Condori,Unidad de Desarrollo Productivo Artesanal,Dirección de Desarrollo Productivo Artesanal,,
René,Limachi Quispe,Unidad de Fortalecimiento Agropecuario,Dirección de Agropecuaria y Seguridad Alimentaria,,
Elvira,Flores Huanca,Unidad de Gestión de Proyectos Agropecuarios,Dirección de Agropecuaria y Seguridad Alimentaria,,
Álvaro,Condori Ticona,Unidad de Competitividad y Productividad,Dirección de Desarrollo Productivo de Pequeñas y Medianas Empresas,,
Lidia,Apaza Ramos,Unidad de Innovación y Emprendimiento,Dirección de Desarrollo Productivo de Pequeñas y Medianas Empresas,,
Hernán,Quispe Copa,Unidad de Administración de Servicios Municipales,Dirección de Servicios Municipales e Iniciativas Económicas,,
Valeria,Huanca Tarqui,Unidad de Iniciativas Económicas,Dirección de Servicios Municipales e Iniciativas Económicas,,
Óscar,Choque Poma,Unidad de Ferias,Dirección de Ferias y Mercados,,
Delia,Ticona Callisaya,Unidad de Mercados,Dirección de Ferias y Mercados,`;

export const triggerBlobDownload = (blobData: BlobPart, filename: string) => {
  const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadImportTemplateApi = async (): Promise<void> => {
  try {
    const res = await apiClient.get('/employees/import/template', {
      responseType: 'blob',
    });
    triggerBlobDownload(res.data, 'plantilla_funcionarios_gamea.csv');
  } catch (err) {
    // Fallback garantizado sin interrupción para el usuario
    triggerBlobDownload(RAW_CSV_TEMPLATE, 'plantilla_funcionarios_gamea.csv');
  }
};

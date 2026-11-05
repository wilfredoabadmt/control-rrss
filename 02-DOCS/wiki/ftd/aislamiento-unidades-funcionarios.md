---
author: GAMEA DevSecOps
branch: main
status: done
---
# Aislamiento Estricto de Funcionarios por Unidad Organizacional

## Intent
Garantizar que los usuarios creados y asignados a una unidad organizacional específica (`workspace_type == 'UNIT'`, `assigned_unit != null`) solo puedan registrar, visualizar, modificar y gestionar funcionarios que pertenezcan a su propia unidad asignada, evitando categóricamente la visibilidad o manipulación de personal perteneciente a otras unidades municipales.

## Scope
- **Dentro del alcance (IN):**
  - **Backend (`EmployeeService.has_global_visibility`)**: Asegurar que cualquier usuario con `assigned_unit` o `workspace_type == 'UNIT'` tenga visibilidad restringida a su unidad (`has_global_visibility == False`), sin importar si posee roles como `VIEWER` o `MAE`.
  - **Backend (`main.py`)**: Corregir la consulta de sincronización de arranque para no sobreescribir `workspace_type` a `GLOBAL` en usuarios que tengan `assigned_unit` definido.
  - **Backend (`EmployeeService.create_employee`)**: Forzar de manera inmutable que cualquier funcionario registrado por un usuario con unidad asignada quede estrictamente vinculado a dicha unidad (`ou_id`) y su dirección correspondiente.
  - **Backend (`EmployeeService.update_employee` & `is_accessible_by_user`)**: Prohibir transferencias no autorizadas y bloquear el acceso si un funcionario pertenece a una unidad diferente.
  - **Backend (`EmployeeService.list_employees` & `MonitoringHubService.get_audience`)**: Asegurar que las consultas paginadas solo devuelvan funcionarios de la unidad asignada `u_norm`, impidiendo que la condición de creador filtre personal de otras unidades.
  - **Backend (`EmployeePayrollImporter`)**: Forzar que la importación de archivos de nómina (Excel/CSV) ejecutada por un usuario de unidad asigne inequívocamente a todos los funcionarios importados a la unidad del operador.
  - **Frontend (`EmployeesPage.tsx`)**: Bloquear en los modales de creación y edición los campos de Dirección y Unidad para usuarios de unidad asignada, fijando el valor de su unidad.
  - **Frontend (`EmployeesPage.tsx`)**: Bloquear o restringir la barra de filtros para que no permita seleccionar otras direcciones municipales y refleje con claridad la unidad activa.
  - **Frontend (`AdminPage.tsx`)**: Ajustar roles por defecto al crear usuarios de unidad a `OPERATOR`.
  - **Pruebas de Aislamiento (`test_workspace_isolation.py`)**: Extender la suite de pruebas unitarias y de integración para validar todos los escenarios de blindaje.
- **Fuera del alcance (OUT):**
  - Modificación de la estructura jerárquica municipal (organigrama base intacto).
  - Aislamiento de superadministradores centrales (`admin@elalto.gob.bo`) o visores institucionales globales sin unidad (`assigned_unit is None`).

## Checklist
- [x] 1. Documentar intención y alcance en el FTD (`02-DOCS/wiki/ftd/aislamiento-unidades-funcionarios.md`).
- [x] 2. Backend: Ajustar `EmployeeService.has_global_visibility` y `is_accessible_by_user` en `backend/modules/employees/service.py`.
- [x] 3. Backend: Ajustar `create_employee`, `update_employee` y `list_employees` en `backend/modules/employees/service.py`.
- [x] 4. Backend: Ajustar migración en `backend/main.py` para preservar `workspace_type = 'UNIT'`.
- [x] 5. Backend: Ajustar `EmployeePayrollImporter.import_payroll_file` en `backend/modules/employees/importer.py`.
- [x] 6. Backend: Ajustar `MonitoringHubService.get_audience` en `backend/modules/monitoring/service.py`.
- [x] 7. Frontend: Bloquear selectores de Dirección y Unidad en modales de creación y edición en `frontend/src/pages/EmployeesPage.tsx`.
- [x] 8. Frontend: Ajustar barra de filtros y defaults en `frontend/src/pages/EmployeesPage.tsx` y `frontend/src/pages/AdminPage.tsx`.
- [x] 9. Verificación: Ejecutar pruebas de aislamiento (`test_workspace_isolation.py`), suite completa y build frontend.

## Evidence
- `backend/tests/test_workspace_isolation.py`: 4 pruebas ejecutadas y superadas al 100%, incluyendo `test_unit_user_with_viewer_role_is_strictly_confined_to_assigned_unit`.
- `backend/tests/test_analytics_dashboard.py`: 11 pruebas ejecutadas y superadas (el visor global municipal conserva su acceso institucional intacto).
- Suite global backend: 103 pruebas superadas sin regresiones en 10.33s.
- Build frontend (`npm run build`): compilación limpia de Vite/React en 2.20s con 0 errores de TypeScript o empaquetado.

## Next steps
- El sistema se encuentra blindado tanto a nivel API/ORM como en interfaz de usuario.
- Cualquier usuario añadido a una unidad operará estrictamente dentro de su propia unidad organizacional.

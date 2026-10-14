import re, io

fe = io.open('frontend/src/data/organigrama.ts', encoding='utf-8').read()
catalog = fe.split('export const ESTRUCTURA_ORGANICA_GAMEA', 1)[1].split('export const LISTA_SECRETARIAS', 1)[0]

units = []
for m in re.finditer(r"unidades:\s*\[(.*?)\]", catalog, re.S):
    units += [s.strip() for s in re.findall(r"'([^']*)'", m.group(1))]

dirs = [m.group(1).strip() for m in re.finditer(r"nombre:\s*'([^']*)'", catalog)]
secs = [m.group(1).strip() for m in re.finditer(r"nombre:\s*'([^']*)',\s*direcciones:", catalog, re.S)]

print('frontend unidades raw:', len(units), 'distinct:', len(set(units)))
print('frontend direcciones/secretarias nombres distinct:', len(set(dirs)))
print('frontend secretarias:', len(secs))

be = io.open('backend/modules/analytics/service.py', encoding='utf-8').read()
blk = be.split('ORGANIGRAMA_HIERARCHY', 1)[1].split('# ', 1)[0] if False else be.split('ORGANIGRAMA_HIERARCHY', 1)[1].split('ALL_SECRETARIAS', 1)[0]

# structure: "direccion": [ "unidad", ... ]
be_dirs = set()
be_units = set()
for m in re.finditer(r'"([^"]+)"\s*:\s*\[(.*?)\]', blk, re.S):
    be_dirs.add(m.group(1))
    for u in re.findall(r'"([^"]+)"', m.group(2)):
        be_units.add(u)
be_secs = set(re.findall(r'"secretaria"\s*:\s*"([^"]+)"', blk))
print('backend direcciones:', len(be_dirs), 'distinct units:', len(be_units), 'secretarias:', len(be_secs))

fe_all = set(dirs) | set(units) | set(secs)
be_all = be_dirs | be_units | be_secs
print('\nIN BACKEND NOT FRONTEND:', sorted(be_all - fe_all))
print('\nIN FRONTEND NOT BACKEND:', sorted(fe_all - be_all))

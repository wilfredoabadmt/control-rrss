import json
import yaml

y = yaml.safe_load(open('contracts/openapi.yaml', encoding='utf-8'))
j = json.load(open('contracts/openapi.json', encoding='utf-8'))


def walk(a, b, path=''):
    diffs = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                diffs.append(('ONLY-IN-JSON', path + '/' + k))
            elif k not in b:
                diffs.append(('ONLY-IN-YAML', path + '/' + k))
            else:
                diffs += walk(a[k], b[k], path + '/' + k)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append(('LEN', path, len(a), len(b)))
        else:
            for i, (x, yy) in enumerate(zip(a, b)):
                diffs += walk(x, yy, path + '/' + str(i))
    else:
        if a != b:
            diffs.append(('VAL', path, repr(a)[:80], repr(b)[:80]))
    return diffs


print('=== DIFF YAML vs JSON ===')
for x in walk(y, j):
    print(x)

raw_j = open('contracts/openapi.json', 'rb').read()
raw_y = open('contracts/openapi.yaml', 'rb').read()
good = 'Direcci\u00f3n'.encode('utf-8')
bad = 'Direcci\u00f3n'.encode('utf-8').decode('latin-1').encode('utf-8')
print('=== ENCODING ===')
print('correct utf8 in JSON:', good in raw_j, ' in YAML:', good in raw_y)
print('mojibake in JSON:', bad in raw_j, ' in YAML:', bad in raw_y)
print('JSON bytes:', len(raw_j), 'YAML bytes:', len(raw_y))
print('JSON decodes utf8 ok:', bool(raw_j.decode('utf-8')))
print('YAML decodes utf8 ok:', bool(raw_y.decode('utf-8')))

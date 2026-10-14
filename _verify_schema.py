import json

s = json.load(open('_live_openapi.json', encoding='utf-8'))
c = json.load(open('contracts/openapi.json', encoding='utf-8'))

METHODS = ('get', 'post', 'put', 'delete', 'patch')


def iter_ops(spec):
    for path, item in spec['paths'].items():
        for m, op in item.items():
            if m in METHODS:
                yield m, path, op


print('=== LIVE: ops WITHOUT security (or security None) ===')
for m, p, op in iter_ops(s):
    if not op.get('security'):
        print(' ', m.upper(), p)

print()
print('=== CONTRACT: ops WITHOUT security ===')
for m, p, op in iter_ops(c):
    if not op.get('security'):
        print(' ', m.upper(), p)

print()
print('=== LIVE: 200 response media types / empty schemas ===')
for m, p, op in iter_ops(s):
    r = op.get('responses', {}).get('200', {})
    content = r.get('content', {})
    for mt, spec in content.items():
        sch = spec.get('schema', 'MISSING')
        flag = 'EMPTY' if sch == {} else 'ok'
        if flag == 'EMPTY' or mt != 'application/json':
            print(f'  {m.upper()} {p}: {mt} -> {flag} {json.dumps(sch)[:80]}')

print()
print('=== LIVE: responses codes distribution ===')
from collections import Counter
cnt = Counter()
for m, p, op in iter_ops(s):
    cnt[tuple(sorted(op.get('responses', {}).keys()))] += 1
for k, v in cnt.most_common():
    print(' ', k, v)

print()
print('=== LIVE: ops without description ===')
n = 0
for m, p, op in iter_ops(s):
    if not op.get('description'):
        n += 1
print('  count without description:', n, 'of', sum(1 for _ in iter_ops(s)))

print()
print('=== LIVE: top-level keys ===', sorted(s.keys()))
print('=== CONTRACT: top-level keys ===', sorted(c.keys()))
print('info JSON:', json.dumps(c['info'], ensure_ascii=False))
print('servers live:', s.get('servers'), 'contract:', c.get('servers'))
print('tags live:', s.get('tags'), 'contract:', c.get('tags'))

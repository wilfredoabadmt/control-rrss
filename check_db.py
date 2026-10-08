import sqlite3
conn = sqlite3.connect('gamea_local.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('=== TABLES ===')
for t in tables:
    print(f'  {t[0]}')

# Check employees schema
cursor.execute('PRAGMA table_info(employees)')
print('\n=== EMPLOYEES SCHEMA ===')
for col in cursor.fetchall():
    print(f'  {col}')

# Check social_accounts schema
cursor.execute('PRAGMA table_info(social_accounts)')
print('\n=== SOCIAL ACCOUNTS SCHEMA ===')
for col in cursor.fetchall():
    print(f'  {col}')

# Check publications schema
cursor.execute('PRAGMA table_info(publications)')
print('\n=== PUBLICATIONS SCHEMA ===')
for col in cursor.fetchall():
    print(f'  {col}')

# Check interactions schema
cursor.execute('PRAGMA table_info(interactions)')
print('\n=== INTERACTIONS SCHEMA ===')
for col in cursor.fetchall():
    print(f'  {col}')

# Check verifications schema
cursor.execute('PRAGMA table_info(verifications)')
print('\n=== VERIFICATIONS SCHEMA ===')
for col in cursor.fetchall():
    print(f'  {col}')

# Check employees data
cursor.execute('SELECT employee_id, first_name, last_name, status FROM employees')
employees = cursor.fetchall()
print('\n=== EMPLOYEES DATA ===')
for e in employees:
    print(f'  {e[0]}: {e[1]} {e[2]} ({e[3]})')

# Check social_accounts data
cursor.execute('SELECT employee_id, platform_id, current_username, binding_status FROM social_accounts')
accounts = cursor.fetchall()
print('\n=== SOCIAL ACCOUNTS DATA ===')
for a in accounts:
    print(f'  {a[0]}: platform={a[1]}, user={a[2]}, status={a[3]}')

# Check publications data
cursor.execute('SELECT id, external_post_id, content_text, platform_id FROM publications')
pubs = cursor.fetchall()
print('\n=== PUBLICATIONS DATA ===')
for p in pubs:
    print(f'  {p[0]}: {p[1]} - {p[2][:50] if p[2] else None} (platform={p[3]})')

# Check interactions data
cursor.execute('SELECT id, publication_id, external_author_id, external_author_name, reaction_type, interaction_type FROM interactions')
interactions = cursor.fetchall()
print('\n=== INTERACTIONS DATA ===')
for i in interactions:
    print(f'  {i[0]}: pub={i[1]}, author_id={i[2]}, author_name={i[3]}, reaction={i[4]}, type={i[5]}')

# Check verifications data
cursor.execute('SELECT id, interaction_id, employee_id, verification_status FROM verifications')
verifications = cursor.fetchall()
print('\n=== VERIFICATIONS DATA ===')
for v in verifications:
    print(f'  {v[0]}: interaction={v[1]}, emp={v[2]}, status={v[3]}')

conn.close()
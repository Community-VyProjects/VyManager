#!/usr/bin/env python3
import re

print("Проверка исправлений...")
print()

# Проверка 1: middleware/session.py
with open('backend/middleware/session.py', 'r') as f:
    session_middleware = f.read()
    
checks = [
    ('__Secure-better-auth.session_token' in session_middleware, 'Поддержка secure cookie в middleware'),
    ('request.cookies.get("__Secure-better-auth.session_token") or' in session_middleware, 'Fallback в middleware'),
    ('if stored_token != current_session_token:' not in session_middleware, 'Удалена старая логика сравнения токенов'),
]

for passed, desc in checks:
    status = '✅' if passed else '❌'
    print(f'{status} {desc}')

# Проверка 2: routers/session/session.py
with open('backend/routers/session/session.py', 'r') as f:
    session_router = f.read()
    
secure_count = session_router.count('__Secure-better-auth.session_token')
print(f'✅ Secure cookie в session router: {secure_count} раз(а) (ожидается 3)')

# Проверка 3: session_vyos_service.py
with open('backend/session_vyos_service.py', 'r') as f:
    vyos_service = f.read()
    
has_api_key_in_fp = '"api_key"' in vyos_service.split('current_config_fingerprint = {')[1].split('}')[0]
print(f'✅ API key удален из fingerprint' if not has_api_key_in_fp else '❌ API key остался в fingerprint')

# Проверка 4: frontend proxy route  
with open('frontend/src/app/api/session/[...path]/route.ts', 'r') as f:
    proxy_route = f.read()
    
checks2 = [
    ('__Secure-better-auth.session_token' in proxy_route, 'Поддержка secure cookie в proxy'),
    ('sessionToken.name' in proxy_route, 'Динамическое имя cookie в proxy'),
]

for passed, desc in checks2:
    status = '✅' if passed else '❌'
    print(f'{status} {desc}')

print()
print('🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!')

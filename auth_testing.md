# Auth-Gated App Testing Playbook (Revant)

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'admin',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend
```
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer SESSION_TOKEN"
curl -X GET "$URL/api/dashboard/kpis" -H "Authorization: Bearer SESSION_TOKEN"
curl -X GET "$URL/api/contracts" -H "Authorization: Bearer SESSION_TOKEN"
```

## Step 3: Browser cookie injection
```python
await page.context.add_cookies([{
    "name": "session_token", "value": "TOKEN",
    "domain": "host", "path": "/", "httpOnly": True,
    "secure": True, "sameSite": "None"
}])
```

## Checklist
- user_id custom field, _id excluded in projections
- session_token in cookie + Authorization header fallback
- Roles: admin, inquilino
- Demo data auto-seeded on first authenticated request

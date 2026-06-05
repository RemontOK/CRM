# Timeweb PHP/MySQL Integration Plan

Frontend already expects the API base URL from `VITE_API_URL`.

Recommended first PHP endpoints:

1. `POST /auth/login`
Returns:
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "1",
      "email": "admin@nekservice.ru",
      "name": "Администратор",
      "role": "admin"
    }
  }
}
```

2. `GET /clients`
Returns:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "firstName": "Иван",
      "lastName": "Петров",
      "phone": "+79990000000",
      "email": "client@example.com",
      "address": "Екатеринбург",
      "notes": "",
      "totalOrders": 3,
      "totalSpent": 24000,
      "lastOrderDate": "2026-04-21T10:00:00.000Z",
      "createdAt": "2026-04-01T10:00:00.000Z",
      "updatedAt": "2026-04-21T10:00:00.000Z"
    }
  ]
}
```

3. `POST /clients`
Accepts:
```json
{
  "firstName": "Иван",
  "lastName": "Петров",
  "phone": "+79990000000",
  "email": "client@example.com",
  "address": "Екатеринбург",
  "notes": "Постоянный клиент"
}
```

4. `PUT /clients/:id`

5. `DELETE /clients/:id`

6. `GET /orders`

7. `POST /orders`

MySQL starter tables:

- `users`
- `clients`
- `devices`
- `orders`
- `order_parts`
- `payments`

Recommended next step:

1. Raise a minimal PHP API on Timeweb with auth + clients CRUD.
2. Switch `authService` and `clientService` from localStorage mocks to axios.
3. Then move orders and payments.

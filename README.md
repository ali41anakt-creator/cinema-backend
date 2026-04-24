# 🎬 CoreI9 Cinema — Backend Project (PostgreSQL)

## 📌 Жоба туралы

Бұл жоба — кинотеатрға арналған веб-қосымша.
Пайдаланушылар:

* тіркеле алады және жүйеге кіре алады 🔐
* фильмдерді қарай алады 🎬
* сеанстарды таңдай алады 🕒
* билет бронь жасай алады 🎟️
* баланс арқылы төлем жасай алады 💳

Админ:

* фильмдер қосады
* сеанстарды басқарады
* пайдаланушыларға ақша жібереді

---

## 🗄️ Database Schema (ERD)

Жобада 7 негізгі кесте бар:

* users
* movies
* sessions
* bookings
* payments
* subscriptions
* admins

### 🔗 Байланыстар:

* users → bookings (One-to-Many)
* movies → sessions (One-to-Many)
* sessions → bookings (One-to-Many)
* users → payments (One-to-Many)

### 📊 ERD диаграмма:

![ERD](./docs/erd.png)

---

## ⚙️ Іске қосу нұсқаулығы

### 1. PostgreSQL базасын жасау

```sql
CREATE DATABASE cinema_db;
```

---

### 2. .env файлын жасау

```bash
cp .env.example .env
```

`.env` ішіне:

```
PG_HOST=localhost
PG_PORT=5432
PG_DB=cinema_db
PG_USER=postgres
PG_PASSWORD=your_password
```

---

### 3. Пакеттерді орнату

```bash
npm install
```

---

### 4. Миграция (кестелерді жасау)

```bash
npm run migrate
```

---

### 5. Seed (тест деректер)

```bash
npm run seed
```

---

### 6. Серверді іске қосу

```bash
npm start
# немесе
npm run dev
```

🌐 Сайт: http://localhost:3000

---

## 🔐 Аутентификация

* Тіркелу (Register)
* Кіру (Login)
* Парольдер **bcrypt арқылы хэштеледі**

---

## 🚀 API Documentation

Толық API құжаттамасы:

👉 [API_DOCS.md](./API_DOCS.md)

---

## 📌 Негізгі эндпоинттар

### 🔐 Auth

* POST /api/auth/register
* POST /api/auth/login

---

### 🎬 Movies

* GET /api/movies
* POST /api/movies
* PUT /api/movies/:id
* DELETE /api/movies/:id

---

### 🕒 Sessions

* GET /api/sessions
* POST /api/sessions

---

### 🎟️ Bookings

* POST /api/bookings
* GET /api/bookings

---

### 💳 Payments

* POST /api/payments
* GET /api/payments

---

## 🔍 Іздеу және фильтр

Қолдау бар:

```
GET /api/movies?title=avatar
GET /api/movies?category=action
```

---

## ✅ Валидация

* Email формат тексеріледі
* Міндетті өрістер тексеріледі
* Қате деректерде сервер құламайды

---

## ❌ Қате кодтары

| Code | Description  |
| ---- | ------------ |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 404  | Not Found    |
| 500  | Server Error |

---

## 💳 Оплата жүйесі

* Админ ақша жібере алады
* Баланс сақталады
* Төлем тарихы бар
* Header-де баланс көрінеді

---

## 📷 Фото жүйесі

* Base64 қолдау бар
* `/uploads` папка
* Cache өшірілген
* fallback жұмыс істейді

---

## 🐘 PostgreSQL

* SQLite → PostgreSQL ауыстырылды
* Параметрленген сұраулар ($1, $2)
* Transaction қолданылады

---

## 👤 Демо аккаунттар

| Рөл   | Email                                     | Пароль   |
| ----- | ----------------------------------------- | -------- |
| Admin | [admin@cinema.kz](mailto:admin@cinema.kz) | admin123 |
| User  | [asel@mail.kz](mailto:asel@mail.kz)       | user123  |

---

## 🧪 Тестілеу

* Postman арқылы тексерілді
* Барлық CRUD жұмыс істейді
* Auth жұмыс істейді

---

## 🌐 Деплой

Жоба Render платформасында орналастырылған (егер бар болса сілтемені қос):

👉 https://your-app.onrender.com

---

## 👨‍💻 Авторлар

* Команда мүшелері (аты-жөніңді жаз)

---

## 📊 Қорытынды

Бұл жоба:
✔ Backend
✔ PostgreSQL
✔ REST API
✔ Auth
✔ CRUD
✔ Deploy

барлық пән талаптарына толық сәйкес келеді.

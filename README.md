# NOTES REST API

### НИТУ МИСИС, Институт компьютерных наук
**Учебный проект:** *Веб-приложение заметок + REST API (CRUD заметок + авторизация Session/JWT)*  
**Выполнили:** Руслан Шафиков, Никита Белов, Георгий Горин  
**Группа:** БИВТ-24-1

---

## 1) Описание
Django-приложение заметок с веб-интерфейсом и REST API:
- Web UI: логин/регистрация/профиль + основной экран заметок;
- REST API: CRUD заметок и управление пользователем;
- авторизация:
  - **SessionAuth** для web UI (cookies + CSRF);
  - **JWT** для API-клиентов;
- Swagger/OpenAPI документация: `/api/docs/`, `/api/schema/`;
- CI/CD: GitHub Actions (сборка Docker и артефактов).

---

## 2) Функционал
- Регистрация (web + API)
- Подтверждение email кодом (учебный режим: “письмо” пишется в файл `src/send_email/*.txt`)
- Логин/логаут (web)
- Профиль: просмотр/удаление
- Заметки: создать/открыть/редактировать/удалить
- Доступ только к своим заметкам (owner-based)
- Автосохранение в web UI (PATCH + CSRF)

---

## 3) Технологии
- Python 3.12
- Django, Django REST Framework
- SimpleJWT
- drf-spectacular (OpenAPI/Swagger)
- pytest + pytest-django
- pre-commit (black/isort/flake8)
- Docker
- GitHub Actions

---

## 4) Структура репозитория (логическая)
- `src/`
  - `config/` — settings/urls
  - `authorization/` — логин/регистрация/подтверждение email/профиль (+ API)
  - `notes/` — модель заметок + DRF viewset + web page
  - `api/` — router API + JWT + schema/docs
  - `templates/` — HTML
  - `static/` — JS/CSS/изображения + `instruction.html`
- `docs/` — документация
- `.github/workflows/` — CI/CD

---

## 5) Запуск локально (venv)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
python src/manage.py migrate
python src/manage.py runserver
```
Открыть:  
Web UI: http://127.0.0.1:8000/login/  
Swagger: http://127.0.0.1:8000/api/docs/


### 6) Подтверждение email (учебный режим)
После регистрации код подтверждения записывается в файлы:
src/send_email/*.txt

Подтвердить:  
Web: /confirm-email/  
API: POST /api/auth/email/confirm/

### 7) API
OpenAPI:  
GET /api/schema/  
GET /api/docs/

Auth:  
POST /api/auth/register/
POST /api/auth/email/confirm/  
POST /api/auth/jwt/create/  
GET/PATCH/DELETE /api/auth/profile/  

Notes:  
GET/POST /api/notes/  
GET/PATCH/DELETE /api/notes/{id}/  

### 8) Тесты и проверки
```bash
pytest

pre-commit run --all-files
python src/manage.py check
python src/manage.py makemigrations --check --dry-run
pytest
```

### 9) Docker
Сборка:

```bash
docker build -t notes-rest-api:local .
```

```bash
docker run --rm -p 8000:8000 notes-rest-api:local \
  sh -lc "python /app/src/manage.py migrate --noinput && python /app/src/manage.py runserver 0.0.0.0:8000"
```

### 10) CI/CD
CI: .github/workflows/ci.yml - pre-commit + pytest + checks  
CD: .github/workflows/cd.yml - сборка Docker, smoke check /api/schema/, артефакты; релиз по тегу v*.*.*

### 11) Авторы и вклад
Руслан Шафиков - бэкенд, тимлид  
Никита Белов - фронтенд, документации  
Георгий Горин - CI/CD, QA

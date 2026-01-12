FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && pip install -r /app/requirements.txt

COPY src/ /app/src/

ENV DJANGO_SECRET_KEY="docker-build" \
    DJANGO_DEBUG="false" \
    DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0" \
    PYTHONPATH="/app/src" \
    DJANGO_SETTINGS_MODULE="config.settings"

RUN python /app/src/manage.py collectstatic --noinput

EXPOSE 8000

CMD ["python", "/app/src/manage.py", "runserver", "0.0.0.0:8000"]

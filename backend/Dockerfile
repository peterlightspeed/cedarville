# --- Build context is the REPO ROOT, not backend/ ---
# docker build -f backend/Dockerfile -t cedarville-api .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

# Content is baked into the image so the API works with no extra volume.
# When you move content into Postgres this COPY becomes unnecessary.
COPY site/data ./content

ENV CONTENT_DIR=/app/content \
    APP_ENV=production \
    APP_DEBUG=false

EXPOSE 8000

# Fail the deploy if the API cannot start.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

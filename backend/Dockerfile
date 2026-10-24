FROM ghcr.io/astral-sh/uv:0.6.14 AS uv
FROM python:3.12-slim

WORKDIR /app
COPY --from=uv /uv /uvx /bin/
COPY pyproject.toml requirements.lock ./
RUN uv pip install --system --no-cache -r requirements.lock
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN useradd --create-home --uid 10001 matchline && chown -R matchline:matchline /app
USER matchline
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

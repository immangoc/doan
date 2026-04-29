FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY ml_service_requirements.txt .
RUN pip install --no-cache-dir -r ml_service_requirements.txt

COPY ml_service_app.py ml_db_repository.py ./
COPY warehouse_ranker_lgbm.txt warehouse_ranker_meta.joblib ./

EXPOSE 8000

CMD ["uvicorn", "ml_service_app:app", "--host", "0.0.0.0", "--port", "8000"]

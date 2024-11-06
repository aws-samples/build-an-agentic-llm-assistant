FROM python:3.11-slim

COPY requirements.txt .
RUN pip3 install -r requirements.txt

ENV PYTHONUNBUFFERED=TRUE
ENTRYPOINT ["python3"]
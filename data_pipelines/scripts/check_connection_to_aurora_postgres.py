import json
import os

import boto3
import psycopg2

secretsmanager = boto3.client("secretsmanager")

secret_response = secretsmanager.get_secret_value(
    SecretId=os.environ["SQL_DB_SECRET_ID"]
)

database_secrets = json.loads(secret_response["SecretString"])

# Extract credentials
host = database_secrets['host']
dbname = database_secrets['dbname']
username = database_secrets['username']
password = database_secrets['password']


def test_db_connection():
    # Connect to the database
    conn = psycopg2.connect(
        host=host,
        database=dbname,
        user=username,
        password=password
    )
    # Get cursor
    cur = conn.cursor()

    # Query to get all tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")

    # Fetch all the tables
    tables = cur.fetchall()

    # Print the table names
    print(f"SQL tables: {tables}")

    # Close connection
    conn.close()


if __name__ == "__main__":
    test_db_connection()

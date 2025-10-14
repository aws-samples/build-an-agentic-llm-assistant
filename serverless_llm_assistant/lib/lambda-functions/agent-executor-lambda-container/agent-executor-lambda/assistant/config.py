import json
import os
from dataclasses import dataclass

import boto3
import sqlalchemy

ssm = boto3.client("ssm")
secretsmanager_client = boto3.client("secretsmanager")

# TODO: put in parameter store and read with a default factory in the dataclass
SQL_TABLE_NAMES = ["extracted_entities"]

@dataclass
class AgenticAssistantConfig:
    bedrock_region: str = ssm.get_parameter(
        Name=os.environ["BEDROCK_REGION_PARAMETER"]
    )["Parameter"]["Value"]

    llm_model_id: str = ssm.get_parameter(Name=os.environ["LLM_MODEL_ID_PARAMETER"])[
        "Parameter"
    ]["Value"]

    chat_message_history_table_name: str = os.environ["CHAT_MESSAGE_HISTORY_TABLE"]
    agent_db_secret_id: str = os.environ.get("AGENT_DB_SECRET_ID", "NOSECRET")

    if agent_db_secret_id != "NOSECRET":
        _db_secret_string = secretsmanager_client.get_secret_value(
            SecretId=agent_db_secret_id
        )["SecretString"]
        _db_secret = json.loads(_db_secret_string)

        # PostgreSQL connection string for Labs 4 & 5 (RAG and SQL)
        postgres_connection_string: str = f"postgresql+psycopg2://{_db_secret['username']}:{_db_secret['password']}@{_db_secret['host']}:{_db_secret['port']}/{_db_secret['dbname']}"

        collection_name: str = "agentic_assistant_vector_store"
        embedding_model_id: str = "amazon.titan-embed-text-v1"

        sqlalchemy_connection_url: str = sqlalchemy.URL.create(
            "postgresql+psycopg2",
            username=_db_secret["username"],
            password=_db_secret["password"],
            host=_db_secret["host"],
            database=_db_secret["dbname"],
        )

        # number of sample rows to include in the prompt from the SQL table.
        num_sql_table_sample_rows: int = 2

        sql_engine = sqlalchemy.create_engine(sqlalchemy_connection_url)

        # Lab 5 - SQL Database setup (placeholder)
        # TODO: Add SQL database setup in Lab 5
        # try:
        #     entities_db = SQLDatabase(
        #         engine=sql_engine,
        #         include_tables=SQL_TABLE_NAMES,
        #         sample_rows_in_table_info=num_sql_table_sample_rows,
        #     )
        # except ValueError as e:
        #     if "include_tables" in str(e):
        #         print(f"Warning: Table {SQL_TABLE_NAMES[0]} not found in the database. Proceeding without including this table.")
        #         entities_db = SQLDatabase(
        #             engine=sql_engine,
        #             include_tables=[],  # Include all tables
        #             sample_rows_in_table_info=num_sql_table_sample_rows,
        #         )
        #     else:
        #         raise e

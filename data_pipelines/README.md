We define the following SageMaker notebooks:

- `01-validate-sagemaker-jobs-connection-to-postgreSQL.ipynb`: Defines a SageMaker Processing Job that determines whether you can connect to your PostgreSQL database from within a SageMaker Processing Job. This is a test that you can run before moving on to the next jobs.
- `02-download-raw-pdf-documents.ipynb`: Downloads the raw PDF documents from a specified source and stores them in an S3 bucket.
- `03-document-extraction.ipynb`: Extracts text and metadata from the raw PDF documents and stores the processed data in a JSON file.
- `04-create-and-load-embeddings-into-aurora-postgreSQL.ipynb`: Defines a SageMaker Processing Job which, when provided with the extracted text from your PDF documents as an input, embeds this text using Bedrock and creates a vector store in the PostgreSQL database that can then be used as a tool by the AI agent hosted in AWS Lambda and accessible through Streamlit. By default, the script uses the processed documents in the `documents_processed.json` file at the root level of the S3 bucket, which is created when you deploy the solution.
- `05-load-sql-tables-into-aurora-postgreSQL.ipynb`: Defines a SageMaker Processing Job which, when provided with structured metadata containing the extracted entities, loads this metadata into the PostgreSQL database such that it can be used by the AI agent to answer questions involving the metadata.
- `06-sagemaker-pipeline-for-documents-processing.ipynb`: Defines a SageMaker Pipeline which contains the SageMaker Processing Jobs from `04-create-and-load-embeddings-into-aurora-postgreSQL` and `05-load-sql-tables-into-aurora-postgreSQL` as steps, essentially allowing you to update your agent with the latest data from S3 in a single click.

The data processing pipeline consists of the following steps:

1. Download raw PDF documents using `02-download-raw-pdf-documents.ipynb`.
2. Extract text and metadata from the raw PDF documents using `03-document-extraction.ipynb`.
3. Create and load embeddings into the PostgreSQL database using `04-create-and-load-embeddings-into-aurora-postgreSQL.ipynb`.
4. Load structured metadata into SQL tables in the PostgreSQL database using `05-load-sql-tables-into-aurora-postgreSQL.ipynb`.
5. (Optional) Run the SageMaker Pipeline defined in `06-sagemaker-pipeline-for-documents-processing.ipynb` to update the data in a single click.

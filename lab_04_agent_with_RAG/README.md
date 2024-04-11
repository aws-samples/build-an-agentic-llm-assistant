
## Goal

Extend the agentic LLM assistant built in the previous lab with the ability to answer questions from an internal knowledge base of documents using the Retrieval Augmented Generation (RAG) design pattern.

## Concepts

* Remember the RAG design pattern, covered in the slides.
* Understand how to build a tool that handles question answering using RAG.
* Extend the agent with the RAG QA tool.

## Lab

In order to extend the agent with the RAG design pattern, we need to:

1. Understand the different options for creating a vector search db,
    * [Knowledge Bases for Amazon Bedrock](https://aws.amazon.com/bedrock/knowledge-bases/)
    * [Amazon Aurora PostgreSQL with pgvector](https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-aurora-postgresql-pgvector-vector-storage-similarity-search/)
    * [Amazon OpenSearch with vector search](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html)
2. Update the CDK to create a vector DB using Amazon aurora PostgreSQL
3. Update the AWS Lambda function to create a tool that allows question answering with RAG through semantic search.
4. Extend the agent tools with the RAG QA new tool.

Throughout this lab, you will focus on the resources highlighted in red below, namely adding Amazon Aurora PostgreSQL as the vector search database and ingesting the documents into it.

![Agentic Assistant workshop Architecture](/assets/agentic-assistant-workshop-architecture-lab-04.png)


#### Step 1: Understand the different options for creating a vector search db

Explained in the slides.

#### Step 2: Create a vector DB using Amazon Aurora PostgreSQL

Here, your task is to update the CDK stack to create a database with a vector search feature. This will enable us to index and search through embedding vectors that represent document chunks.
As outlined above, there are multiple database options to choose from. In this lab, we will use the Amazon Aurora PostgreSQL with pgvector.
To add the database, follow the instructions below:

1. To ensure that the DB is secure, we need to create a VPC with a private subnet, where we will be putting the database. The VPC has already been defined in the file `serverless_llm_assistant/lib/vpc-stack.ts` and imported in the main stack file `serverless_llm_assistant/lib/serverless_llm_assistant-stack.ts`. You task is to review the VPC definition, then uncomment the vpc stack instance in line 25.
```typescript
const vpc = new Vpc(this, "Vpc");
```
2. Now, you will add the actual database resources definition. Review the following resources definition, read through the comments to understand the various parameter, then add this code to the CDK stack inside the file `serverless_llm_assistant/lib/serverless_llm_assistant-stack.ts`. You can put this code immediately after the parameters definition around line 64.
```typescript
    // -----------------------------------------------------------------------
    // Add an Amazon Aurora PostgreSQL database with PGvector for semantic search.
    // Create an Aurora PostgreSQL database, to serve as the semantic search
    // engine using the pgvector extension https://github.com/pgvector/pgvector
    // https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-aurora-postgresql-pgvector-vector-storage-similarity-search/
    const AgentDBSecret = rds.Credentials.fromGeneratedSecret("AgentDBAdmin");

    const AgentDB = new rds.DatabaseCluster(this, "AgentDB", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // We use this specific db version because it comes with pgvector extension.
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      defaultDatabaseName: AGENT_DB_NAME,
      storageEncrypted: true,
      // Switch to cdk.RemovalPolicy.RETAIN when installing production
      // to avoid accidental data deletions.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // We attach the credentials created above, to the database.
      credentials: AgentDBSecret,
      // Writer must be provided.
      writer: rds.ClusterInstance.serverlessV2("ServerlessInstanceWriter"),
      // Put the database in the vpc created above.
      vpc: vpc.vpc,
      // Put the database in the private subnet of the VPC.
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
    });
```
3. Next, you need to provide the Lambda function with the vpc configuration by uncommenting the `vpc` parameter, then add an environment variable that stores the `AgentDB.secret?.secretArn`. These changes will allow the Lambda function access to the database.
```typescript
    const agent_executor_lambda = new lambda.DockerImageFunction(
        // ...
        vpc: vpc.vpc,
        environment: {
          // ...
          AGENT_DB_SECRET_ID: AgentDB.secret?.secretArn as string
        },
      }
    );
```
4. Finally, you need to grant the Lambda function permission to read the db secret credentials, and to access the private subnet in which the database resides. To achieve this, add the following after the Lambda resources definition
```typescript
    // Allow Lambda to read the secret for Aurora DB connection.
    AgentDB.secret?.grantRead(agent_executor_lambda);

    // Allow network access to/from Lambda
    AgentDB.connections.allowDefaultPortFrom(agent_executor_lambda);
```

Now, you can run `npx cdk deploy` to deploy these changes. Note that the database setup typically takes around 659.9s ~ 10-11mins.

By the end of this stage, you have the underlying infrastructure to perform the vector search. Next, you will learn how to create the RAG tool that leverages this database, and how to prepare and ingest the data into the database.

#### Step 3: Extend the agent with a tool for question answering with RAG through semantic search

As you have seen in the Bedrock workshop, the essence of the RAG design pattern is to augment the LLM prompt with context that we extract from an external source such as a vector db using semantic search.
To implement this design pattern, we need to be able to convert the user question into an embedding vector, use this embedding to find similar document chunks from the vector database, then include the relevant chunks into the LLM prompt.
To implement the RAG design pattern and integrate it as a tool into the agent, follow the instructions below.

1. Add a RAG question-answering chain by creating a new file called `rag.py` within the Lambda function code under the `assistant` folder, explore and understand the following code which creates the RAG chain, then paste into the `rag.py` file.
```python
from langchain.chains import RetrievalQA
from langchain.embeddings import BedrockEmbeddings
from langchain.vectorstores import PGVector


def get_rag_chain(config, llm, bedrock_runtime):
    """Prepare a RAG question answering chain.

      Note: Must use the same embedding model used for creating the semantic search index
      to be used for real-time semantic search.
    """
    embedding_model = BedrockEmbeddings(
        model_id=config.embedding_model_id, client=bedrock_runtime
    )

    vector_store = PGVector.from_existing_index(
        embedding=embedding_model,
        collection_name=config.collection_name,
        connection_string=config.postgres_connection_string,
    )

    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(k=5, fetch_k=50),
        return_source_documents=False,
        input_key="question",
    )
```
2. Then, inside the `tools.py` file, import the `get_rag_chain` using `from .rag import get_rag_chain` and create an instance of it after the `custom_calculator`.
```python
rag_qa_chain = get_rag_chain(config, claude_llm, bedrock_runtime)
```
3. Finally, extend the agent tools with this new RAG tool. In this case, we will call the tool `SemanticSearch` to quickly distinguish the type of augmentation we are relying on.
```python
LLM_AGENT_TOOLS = [
    # ...
    ,
    Tool(
        name="SemanticSearch",
        func=lambda query: rag_qa_chain({"question": query}),
        description=(
            "Use when you are asked questions about financial reports of companies."
            " The Input should be a correctly formatted question."
        ),
    )
]
```

#### Step 4: Setup the vector database

Now, your task is to create the data pipelines necessary for preparing and ingesting documents into the vector search database. These data pipelines include:

1. Downloading a set of PDF document to use, and extracting text from them using Amazon Textract.
2. Chuncking the documents and generate the embedding vectors for the chunk.
3. Indexing the embeddings into PostgreSQL pgvector to prepare the semantic search index.

To achieve these data processing tasks, we can leverage SageMaker Processing Jobs.
Before that, since the database is within an isolated private subnet, we need to update the CDK stack to configure the correct access for SageMaker to the db.
To summarize your tasks for this step:

1. Update the CDK stack to configure SageMaker access to the DB.
2. Explore and execute the notebooks inside the data-pipelines folder to prepare and ingest the data.
3. Finally, interact with the Lambda function to test the RAG tool within the LLM agent.


Let's start.

1. First, open the CDK stack file, explore, then add the following resources to the CDK immediately after the DB resources definition. Notice how the code is creating a security group that we can attach to a SageMaker Processing job so it can access the db. We also store the db secret ARN in the IDs of the subnets in SSM parameters so that we can read them programmatically in SageMaker jobs.
```typescript
    // -----------------------------------------------------------------------
    // Create a security group to allow access to the DB from a SageMaker processing job
    // which will be used to index embedding vectors.
    const processingSecurityGroup = new ec2.SecurityGroup(
      this,
      "ProcessingSecurityGroup",
      {
        vpc: vpc.vpc,
        // Allow outbound traffic to the Aurora security group on PostgreSQL port
        allowAllOutbound: true,
      }
    );

    // Allow connection to SageMaker processing jobs security group on the specified port
    AgentDB.connections.allowTo(
      processingSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow outbound traffic to RDS from SageMaker jobs"
    );

    // Allow inbound traffic to the RDS security group from the SageMaker processing security group
    AgentDB.connections.allowFrom(
      processingSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow inbound traffic from SageMaker to RDS"
    );

    // Store the security group ID in Parameter Store
    const securityGroupParameterName =
      "/AgenticLLMAssistantWorkshop/SMProcessingJobSecurityGroupId";
    const sagemaker_security_group_name_parameter = new ssm.StringParameter(
      this,
      "ProcessingSecurityGroupIdParameter",
      {
        parameterName: securityGroupParameterName,
        stringValue: processingSecurityGroup.securityGroupId,
      }
    );

    // -----------------------------------------------------------------------
    // Save the required credentials and parameter that would allow SageMaker Jobs
    // to access the database and add the required IAM permissions to a managed
    // IAM policy that must be attached to the SageMaker execution role.
    const sagemaker_db_secret_arn_parameter = new ssm.StringParameter(
      this,
      "DBSecretArnParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/DBSecretARN",
        stringValue: AgentDB.secret?.secretArn as string,
      }
    );

    // Retrieve the subnet IDs from the VPC
    const subnetIds = vpc.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnetIds;

    // Convert the subnet IDs to a JSON format
    const subnetIdsJson = JSON.stringify(subnetIds);
    // Store the JSON data as an SSM parameter
    const subnetIdsParameter = new ssm.StringParameter(
      this,
      "SubnetIdsParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/SubnetIds",
        stringValue: subnetIdsJson,
      }
    );
```

2. Now, to be able to use SageMaker for these data tasks, we need to prepare the necessary IAM permissions to access the SSM parameters, invoke the Lambda function, and access the DB credentials. We have already added the managed IAM policy `SageMakerPostgresDBAccessIAMPolicy` which you can use with SageMaker. Your task is to update this managed policy to grant access to the required SSM parameters and DB credentials.
```typescript
  new iam.PolicyStatement({
            actions: ["ssm:GetParameter"],
            resources: [
              ssm_bedrock_region_parameter.parameterArn,
              ssm_llm_model_id_parameter.parameterArn,
              sagemaker_security_group_name_parameter.parameterArn,
              sagemaker_db_secret_arn_parameter.parameterArn,
              subnetIdsParameter.parameterArn,
              agentLambdaNameParameter.parameterArn,
              agentDataBucketParameter.parameterArn,
            ],
          }),
```
```typescript
    const SageMakerPostgresDBAccessIAMPolicy = new iam.ManagedPolicy(
          //..
          new iam.PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [
              // Add permission to get only the DB secret
              AgentDB.secret?.secretArn as string,
            ],
          // ..
    );
```
3. Next, you can run `npx cdk deploy` to deploy these changes.

#### Step 5: Prepare documents and load embeddings into the database.

Great job! You have now set up the database. Now, we need to prepare the documents of interest, extract text and metadata, chunk the text, create embeddings, and load these embeddings into the database. This will allow us to query the database and identify the most relevant document chunks for a user question, which we can use to augment the LLM context with relevant documents to answer user questions.

To achieve all of these data processing steps, we will use SageMaker features, such as:

* SageMaker Studio environment to run the notebooks
* SageMaker Processing Jobs to execute the individual jobs defined in the `data-pipelines`
* SageMaker Pipelines to orchestrate the jobs into a workflow

1. Create or use an existing SageMaker environment to run the notebooks. To create one, you can use the quick **Set up for a single user** option through the [SageMaker Console](https://console.aws.amazon.com/sagemaker/home?).
2. Inside the SageMaker environment, create a JupyterLab space and run it. Then open it once it is ready.
3. Inside the JupyterLab environment, clone the `data_pipelines` folder using the terminal.
4. Update the SageMaker execution role attached to your SageMaker environment with the IAM policy created by the CDK stack above, which follows the pattern `ServerlessLlmAssistantStack-sageMakerPostgresDBAccessIAMPolicyXXXXXXX-XXXXXXXXX`. This will give SageMaker permission to access the database.
5. Now, run the notebook `data_pipelines/01-validate-sagemaker-jobs-connection-to-postgreSQL.ipynb` which will validate that a SageMaker job is able to connect to the database and query it.
6. If the job runs successfully, you can move to the next step; otherwise, investigate the issue to ensure that SageMaker Jobs can access the DB.
7. Run the notebook `data_pipelines/02-download-raw-pdf-documents.ipynb` to download the raw PDF documents from a specified source and store them in an S3 bucket.
8. Run the notebook `data_pipelines/03-document-extraction.ipynb` to extract text and metadata from the raw PDF documents and store the processed data in a JSON file.
9. Run the notebook `data_pipelines/04-create-and-load-embeddings-into-aurora-postgreSQL.ipynb` to generate embeddings for the extracted text using Bedrock and create a vector store in the PostgreSQL database.

## Step 6: Interact with the Assistant by asking questions that leverage RAG

Now, we have the RAG component with semantic search ready to answer questions.
You can test it by asking questions about Amazon's financial reports through the Web UI or by calling Lambda, as you did in lab 2.

Here are some ideas of questions to ask:

* What was Amazon's total revenue for the year 2021?
* What were the main drivers of Amazon's revenue growth in 2022?
* How much did Amazon spend on research and development in 2021?
* What is Amazon's strategy for expanding its cloud computing business (AWS)?
* How did supply chain issues impact Amazon's operations in 2021 and 2022?
* What are Amazon's plans for sustainability and reducing its carbon footprint?
* How does Amazon's subscription services revenue (e.g., Prime) compare to its product sales revenue?
* What is Amazon's competitive advantage in the e-commerce market?
* How has Amazon's international expansion progressed in recent years?

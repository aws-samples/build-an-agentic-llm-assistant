import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";
import { NetworkMode } from "aws-cdk-lib/aws-ecr-assets";

import { Vpc } from "./assistant-vpc";
import { AssistantApiConstruct } from "./assistant-api-gateway";
import { CognitoConstruct } from "./assistant-authorizer";
import { SageMakerRdsAccessConstruct } from "./assistant-sagemaker-postgres-acess";
import { SageMakerIAMPolicyConstruct } from "./assistant-sagemaker-iam-policy";
import { SageMakerProcessor } from "./assistant-sagemaker-processor";

const AGENT_DB_NAME = "AgentSQLDBandVectorStore";

export class ServerlessLlmAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------------------
    // VPC Construct
    // Create subnets and VPC endpoints
    // const vpc = new Vpc(this, "Vpc");

    // -----------------------------------------------------------------------
    // Create relevant SSM parameters
    const parameters = this.node.tryGetContext("parameters") || {
      bedrock_region: "us-west-2",
      llm_model_id: "anthropic.claude-v2",
    };

    const BEDROCK_REGION = parameters["bedrock_region"];
    const LLM_MODEL_ID = parameters["llm_model_id"];

    // Note: the SSM parameters for Bedrock region and endpoint are used
    // to setup a boto3 bedrock client for programmatic access to Bedrock APIs.

    // Add an SSM parameter for the Bedrock region.
    const ssm_bedrock_region_parameter = new ssm.StringParameter(
      this,
      "ssmBedrockRegionParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/bedrock_region",
        // This is the default region.
        // The user can update it in parameter store.
        stringValue: BEDROCK_REGION,
      }
    );

    // Add an SSM parameter for the llm model id.
    const ssm_llm_model_id_parameter = new ssm.StringParameter(
      this,
      "ssmLLMModelIDParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/llm_model_id",
        // This is the default region.
        // The user can update it in parameter store.
        stringValue: LLM_MODEL_ID,
      }
    );

    // -----------------------------------------------------------------------
    // Placeholder for Lab 4, step 2.2 - Put the database resource definition here.

    // -----------------------------------------------------------------------
    // Lab 4. Step 4.1 - configure sagemaker access to the database.
    // Create a security group to allow access to the DB from a SageMaker processing job
    // which will be used to index embedding vectors.

    // const sagemaker_rds_access = new SageMakerRdsAccessConstruct(this, 'SageMakerRdsAccess', {
    //   vpc: vpc.vpc,
    //   rdsCluster: AgentDB,
    // });

    // -----------------------------------------------------------------------
    // Add a DynamoDB table to store chat history per session id.

    // When you see a need for it, consider configuring autoscaling to the table
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html#configure-autoscaling-for-your-table
    const ChatMessageHistoryTable = new dynamodb.Table(
      this,
      "ChatHistoryTable",
      {
        // consider activating the encryption by uncommenting the code below.
        // encryption: dynamodb.TableEncryption.AWS_MANAGED,
        partitionKey: {
          name: "SessionId",
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        // Considerations when choosing a table class
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.tableclasses.html
        tableClass: dynamodb.TableClass.STANDARD,
        // When moving to production, use cdk.RemovalPolicy.RETAIN instead
        // which will keep the database table when destroying the stack.
        // this avoids accidental deletion of user data.
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
      }
    );

    // -----------------------------------------------------------------------
    var currentNetworkMode = NetworkMode.DEFAULT;
    // if you run the cdk stack in SageMaker editor, you need to pass --network sagemaker
    // for docker build to work. The following achieve that.
    if (process.env.SAGEMAKER_APP_TYPE) {
      currentNetworkMode = NetworkMode.custom("sagemaker");
    }

    // Add AWS Lambda container and function to serve as the agent executor.
    const agent_executor_lambda = new lambda.DockerImageFunction(
      this,
      "LambdaAgentContainer",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(
            __dirname,
            "lambda-functions/agent-executor-lambda-container"
          ),
          {
            networkMode: currentNetworkMode,
            buildArgs: { "--platform": "linux/amd64" },
          }
        ),
        description: "Lambda function with bedrock access created via CDK",
        timeout: cdk.Duration.minutes(5),
        memorySize: 2048,
        // vpc: vpc.vpc,
        environment: {
          BEDROCK_REGION_PARAMETER: ssm_bedrock_region_parameter.parameterName,
          LLM_MODEL_ID_PARAMETER: ssm_llm_model_id_parameter.parameterName,
          CHAT_MESSAGE_HISTORY_TABLE: ChatMessageHistoryTable.tableName,
          // AGENT_DB_SECRET_ID: AgentDB.secret?.secretArn as string
        },
      }
    );

    // Placeholder Step 2.4 - grant Lambda permission to access db credentials

    // Allow Lambda to read SSM parameters.
    ssm_bedrock_region_parameter.grantRead(agent_executor_lambda);
    ssm_llm_model_id_parameter.grantRead(agent_executor_lambda);

    // Allow Lambda read/write access to the chat history DynamoDB table
    // to be able to read and update it as conversations progress.
    ChatMessageHistoryTable.grantReadWriteData(agent_executor_lambda);

    // Allow the Lambda function to use Bedrock
    agent_executor_lambda.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonBedrockFullAccess")
    );

    // Save the Lambda ARN in an SSM parameter to simplify invoking the lambda
    // from a SageMaker notebook, without having to copy it manually.
    const agentLambdaNameParameter = new ssm.StringParameter(
      this,
      "AgentLambdaNameParameter",
      {
        parameterName:
          "/AgenticLLMAssistantWorkshop/AgentExecutorLambdaNameParameter",
        stringValue: agent_executor_lambda.functionName,
      }
    );

    //------------------------------------------------------------------------
    // Create an S3 bucket for intermediate data staging
    // and allow SageMaker to read and write to it.
    const agent_data_bucket = new s3.Bucket(this, "AgentDataBucket", {
      // Warning, swith DESTROY to RETAIN to avoid accidental deletion
      // of important data.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Save the bucket name as an SSM parameter to simplify using it in
    // SageMaker processing jobs without having to copy the name manually.
    const agentDataBucketParameter = new ssm.StringParameter(
      this,
      "AgentDataBucketParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/AgentDataBucketParameter",
        stringValue: agent_data_bucket.bucketName,
      }
    );

    // -----------------------------------------------------------------------
    // Create a managed IAM policy to be attached to a SageMaker execution role
    // to allow the required permissions to retrieve the information to access the database.
    // new SageMakerIAMPolicyConstruct(this, 'SageMakerIAMPolicy', {
    //   bedrockRegionParameter: ssm_bedrock_region_parameter,
    //   llmModelIdParameter: ssm_llm_model_id_parameter,
    //   agentDataBucketParameter: agentDataBucketParameter,
    //   agentLambdaNameParameter: agentLambdaNameParameter,
    //   agentDataBucket: agent_data_bucket,
    //   agentExecutorLambda: agent_executor_lambda,
    //   rdsCluster: AgentDB,
    //   sagemaker_rds_access: sagemaker_rds_access,
    // });

    // -----------------------------------------------------------------------
    // Create a new Cognito user pool and add an app client to the user pool

    const cognito_authorizer = new CognitoConstruct(this, "Cognito");
    // -------------------------------------------------------------------------
    // Add an Amazon API Gateway with AWS cognito auth and an AWS lambda as a backend
    new AssistantApiConstruct(this, "AgentApi", {
      cognitoUserPool: cognito_authorizer.userPool,
      lambdaFunction: agent_executor_lambda,
    });

    new SageMakerProcessor(this, "SagemakerProcessor");
  }
}

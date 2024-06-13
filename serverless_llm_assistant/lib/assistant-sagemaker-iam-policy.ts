import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SageMakerRdsAccessConstruct } from './assistant-sagemaker-postgres-acess';

interface SageMakerIAMPolicyConstructProps {
  bedrockRegionParameter: ssm.StringParameter;
  llmModelIdParameter: ssm.StringParameter;
  agentDataBucketParameter: ssm.StringParameter;
  agentLambdaNameParameter: ssm.StringParameter;
  agentDataBucket: s3.Bucket;
  agentExecutorLambda: lambda.Function;
  rdsCluster: rds.DatabaseCluster;
  sagemaker_rds_access: SageMakerRdsAccessConstruct;
}

export class SageMakerIAMPolicyConstruct extends Construct {
  public readonly sageMakerPostgresDBAccessIAMPolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: SageMakerIAMPolicyConstructProps) {
    super(scope, id);

    this.sageMakerPostgresDBAccessIAMPolicy = new iam.ManagedPolicy(this, 'SageMakerPostgresDBAccessIAMPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: ['ssm:GetParameter'],
          resources: [
            props.bedrockRegionParameter.parameterArn,
            props.llmModelIdParameter.parameterArn,
            props.agentDataBucketParameter.parameterArn,
            props.agentLambdaNameParameter.parameterArn,
            props.sagemaker_rds_access.processingSecurityGroupIdParameter.parameterArn,
            props.sagemaker_rds_access.dbSecretArnParameter.parameterArn,
            props.sagemaker_rds_access.subnetIdsParameter.parameterArn,
          ],
        }),
        new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [props.agentDataBucket.bucketArn, props.agentDataBucket.arnForObjects('*')],
        }),
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [props.agentExecutorLambda.functionArn],
        }),
        new iam.PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          resources: [props.rdsCluster.secret?.secretArn as string],
        }),
      ],
    });

    new cdk.CfnOutput(this, "sageMakerPostgresDBAccessIAMPolicyARN", {
      value: this.sageMakerPostgresDBAccessIAMPolicy.managedPolicyArn,
    });
  }
}
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class S3CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get current AWS account ID
    const accountId = cdk.Stack.of(this).account;

    // Get current AWS region
    const region = cdk.Stack.of(this).region;

    // Create an S3 bucket with the specified pattern
    const bucketName = `genai-bootcamp-cdk-bucket-${accountId}-${region}`;

    // Create an S3 bucket with the current account ID in the name
    new s3.Bucket(this, 'MyS3Bucket', {
      bucketName: bucketName,
      // In production you should update the removal policy to RETAIN to avoid accidental data loss.
      removalPolicy: cdk.RemovalPolicy.DESTROY ,
      encryption: s3.BucketEncryption.KMS_MANAGED
    });

  }
}

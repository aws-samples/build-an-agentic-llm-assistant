import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface SageMakerRdsAccessConstructProps {
  vpc: ec2.Vpc;
  rdsCluster: rds.DatabaseCluster;
}

export class SageMakerRdsAccessConstruct extends Construct {
  public readonly processingSecurityGroup: ec2.SecurityGroup;
  public readonly processingSecurityGroupIdParameter: ssm.StringParameter;
  public readonly dbSecretArnParameter: ssm.StringParameter;
  public readonly subnetIdsParameter: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: SageMakerRdsAccessConstructProps) {
    super(scope, id);

    // Create a security group to allow access to the DB from a SageMaker processing job
    this.processingSecurityGroup = new ec2.SecurityGroup(this, 'ProcessingSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true, // Allow outbound traffic to the Aurora security group on PostgreSQL port
    });

    // Allow connection to SageMaker processing jobs security group on the specified port
    props.rdsCluster.connections.allowTo(
      this.processingSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow outbound traffic to RDS from SageMaker jobs'
    );

    // Allow inbound traffic to the RDS security group from the SageMaker processing security group
    props.rdsCluster.connections.allowFrom(
      this.processingSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow inbound traffic from SageMaker to RDS'
    );

    // Store the security group ID in Parameter Store
    this.processingSecurityGroupIdParameter = new ssm.StringParameter(this, 'ProcessingSecurityGroupIdParameter', {
      parameterName: '/AgenticLLMAssistantWorkshop/SMProcessingJobSecurityGroupId',
      stringValue: this.processingSecurityGroup.securityGroupId,
    });

    // Save the required credentials and parameter that would allow SageMaker Jobs
    // to access the database and add the required IAM permissions to a managed
    // IAM policy that must be attached to the SageMaker execution role.
    this.dbSecretArnParameter = new ssm.StringParameter(this, 'DBSecretArnParameter', {
      parameterName: '/AgenticLLMAssistantWorkshop/DBSecretARN',
      stringValue: props.rdsCluster.secret?.secretArn as string,
    });

    // Retrieve the subnet IDs from the VPC
    const subnetIds = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnetIds;

    // Convert the subnet IDs to a JSON format
    const subnetIdsJson = JSON.stringify(subnetIds);

    // Store the JSON data as an SSM parameter
    this.subnetIdsParameter = new ssm.StringParameter(this, 'SubnetIdsParameter', {
      parameterName: '/AgenticLLMAssistantWorkshop/SubnetIds',
      stringValue: subnetIdsJson,
    });

  }
}
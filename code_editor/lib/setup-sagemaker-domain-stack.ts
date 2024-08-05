import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SagemakerDomainWithCodeEditorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // import existing default VPC
    const existingDefaultVpc = ec2.Vpc.fromLookup(this, 'ExistingDefaultVPC', {isDefault: true});

     // Create a SageMaker execution role
    const sagemakerExecutionRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        // required to work with CDK from vscode in SageMaker
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
      ],
      inlinePolicies: {
        AssumeDeployRole: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sts:AssumeRole'],
              resources: [
                `arn:aws:iam::${this.account}:role/cdk-*-deploy-role-${this.account}-${this.region}`,
                `arn:aws:iam::${this.account}:role/cdk-*-file-publishing-role-${this.account}-${this.region}`,
              ],
            }),
          ],
        }),
      },
    });

    // Create a SageMaker Domain
    const domain = new sagemaker.CfnDomain(this, 'SageMakerDomain', {
      vpcId: existingDefaultVpc.vpcId,
      authMode: 'IAM',
      domainName: 'agentic-assistant-domain',
      // Use private subnets
      subnetIds: existingDefaultVpc.publicSubnets.map(subnet => subnet.subnetId),
      defaultUserSettings: {
        executionRole: sagemakerExecutionRole.roleArn
      },
      domainSettings: {
        dockerSettings: {
          enableDockerAccess: "ENABLED"
        }
      }
    });

    const userProfile = new sagemaker.CfnUserProfile(this, 'DefaultUserProfile', {
      domainId: domain.attrDomainId,
      userProfileName: "default-profile"
    })

    const space = new sagemaker.CfnSpace(this, 'EditorSpace', {
      spaceName: 'agentic-assistant-code-editor',
      domainId: domain.attrDomainId,
      ownershipSettings: {
        ownerUserProfileName: userProfile.userProfileName
      },
      spaceSharingSettings: {
        sharingType: 'Private'
      },
      spaceSettings: {
        appType: 'CodeEditor',
        spaceStorageSettings: {
          ebsStorageSettings: {
            ebsVolumeSizeInGb: 30
          }
        },
        codeEditorAppSettings: {
          defaultResourceSpec: {
            instanceType: 'ml.m5.large'
          }
        }
      }
    })

    // Resources a provisioned in Parallel by CloudFormation.
    // we need this explicit dependency to avoid cases where
    // the space creation is attempted before the user profile is ready.
    space.addDependency(userProfile);

    new cdk.CfnOutput(this, 'SageMakerDomainOutput', {
      value: domain.attrDomainArn,
      description: 'The ARN of the SageMaker Domain',
      // exportName: 'SageMakerDomainWithCodeEditorARN',
    });

  }
}

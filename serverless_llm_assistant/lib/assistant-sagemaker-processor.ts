import { DockerImageAsset, NetworkMode} from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as ssm from "aws-cdk-lib/aws-ssm";


export class SageMakerProcessor extends Construct {
  public image: DockerImageAsset;

  constructor(scope: Construct, id: string) {
    super(scope, id);

   const processor_image = new DockerImageAsset(this, "processor_image", {
    assetName: "processor",
    directory: "../data_pipelines/docker",
    networkMode: NetworkMode.custom("sagemaker")
   })

    this.image = processor_image

    new ssm.StringParameter(
      this,
      "ScriptProcessorContainerParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/ScriptProcessorContainer",
        stringValue: this.image.imageUri
      }
    );

    new CfnOutput(this, "i", {
      description: "ScriptProcessorImageURI",
      value: this.image.imageUri
    })

  }
}
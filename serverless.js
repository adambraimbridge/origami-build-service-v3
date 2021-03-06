"use strict";

module.exports = {
  service: "${opt:service, 'origami-build-service'}",
  frameworkVersion: "=1.58.0",
  provider: {
    apiGateway: {
      binaryMediaTypes: ["*/*"],
    },
    environment: {
      REGION: "${self:provider.region}",
      COMPONENT_TABLE: "${self:service}-${self:provider.stage}-components",
      MODULE_BUCKET_NAME: "${self:custom.bucketName}",
      NODE_ENV: "production",
      NPM_WEBHOOK_SECRET_DEV: "${env:NPM_WEBHOOK_SECRET_DEV}",
      ORIGAMI_REPO_DATA_KEY_ID: "${env:ORIGAMI_REPO_DATA_KEY_ID}",
      ORIGAMI_REPO_DATA_SECRET_KEY: "${env:ORIGAMI_REPO_DATA_SECRET_KEY}",
      SENTRY_DSN: "${env:SENTRY_DSN}",
      STAGE: "${self:provider.stage}",
    },
    name: "aws",
    region: "${opt:region, 'us-east-1'}",
    role:
      "arn:aws:iam::${env:AWS_ACCOUNT_ID}:role/ApplicationRoleFor_${self:service}",
    runtime: "nodejs12.x",
    stackTags: {
      systemCode: "${self:service}",
      teamDL: "origami.support@ft.com",
      environment: "${self:custom.tags.${self:provider.stage}.environment}",
    },
    stage: "${opt:stage, self:custom.defaultStage}",
    timeout: 30,
    versionFunctions: false,
  },
  package: {
    individually: true,
  },
  custom: {
    additionalStacks: {
      "permanent-dynamo": {
        Resources: {
          ComponentsDynamoDBTable: {
            Type: "AWS::DynamoDB::Table",
            Properties: {
              TableName: "${self:provider.environment.COMPONENT_TABLE}",
              AttributeDefinitions: [
                {
                  AttributeName: "name",
                  AttributeType: "S",
                },
                {
                  AttributeName: "version",
                  AttributeType: "S",
                },
              ],
              KeySchema: [
                {
                  AttributeName: "name",
                  KeyType: "HASH",
                },
                {
                  AttributeName: "version",
                  KeyType: "RANGE",
                },
              ],
              PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true,
              },
              BillingMode: "PAY_PER_REQUEST",
              StreamSpecification: {
                StreamViewType: "NEW_AND_OLD_IMAGES",
              },
              Tags: [
                {
                  Key: "systemCode",
                  Value: "${self:service}",
                },
                {
                  Key: "teamDL",
                  Value: "origami.support@ft.com",
                },
                {
                  Key: "environment",
                  Value:
                    "${self:custom.tags.${self:provider.stage}.environment}",
                },
              ],
            },
          },
        },
      },
      "permanent-s3": {
        Resources: {
          S3ModuleBucketPolicy: {
            Type: "AWS::S3::BucketPolicy",
            Properties: {
              Bucket: {
                Ref: "S3ModuleBucket",
              },
              PolicyDocument: {
                Id: "S3ModuleBucketPolicy",
                Statement: [
                  {
                    Sid: "AllowOnlyApplicationToPutObject",
                    Effect: "Allow",
                    Principal: {
                      AWS: ["${self:provider.role}"],
                    },
                    Action: "s3:PutObject",
                    Resource: [
                      "arn:aws:s3:::${self:custom.additionalStacks.permanent-s3.Resources.S3ModuleBucket.Properties.BucketName}/*",
                    ],
                  },
                  {
                    Sid: "AllowOnlyApplicationToGetObject",
                    Effect: "Allow",
                    Principal: {
                      AWS: ["${self:provider.role}"],
                    },
                    Action: "s3:PutObject",
                    Resource: [
                      "arn:aws:s3:::${self:custom.additionalStacks.permanent-s3.Resources.S3ModuleBucket.Properties.BucketName}/*",
                    ],
                  },
                ],
              },
            },
          },
          S3ModuleBucket: {
            Type: "AWS::S3::Bucket",
            Properties: {
              BucketName: "${self:custom.bucketName}",
            },
          },
        },
      },
    },
    bucketName: "${self:service}-${self:provider.stage}-modules",
    defaultStage: "local",
    remover: {
      buckets: ["${self:custom.bucketName}"],
    },
    sentry: {
      dsn: "${env:SENTRY_DSN}",
      organization: "${env:SENTRY_ORGANISATION}",
      project: "${env:SENTRY_PROJECT}",
      authToken: "${env:SENTRY_AUTH_TOKEN}",
      release: {
        version: "git",
      },
    },
    scriptHooks: {
      "after:deploy:deploy":
        'if [ "${self:custom.tags.${self:provider.stage}.environment}" != "l" ]; then aws dynamodb create-global-table --global-table-name ${self:provider.environment.COMPONENT_TABLE} --replication-group RegionName=eu-west-1 RegionName=us-west-1 --region eu-west-1; echo done; else echo "Did not create global table as running in local mode"; fi',
    },
    tags: {
      int: {
        environment: "d",
      },
      local: {
        environment: "l",
      },
      qa: {
        environment: "t",
      },
      prod: {
        environment: "p",
      },
    },
    webpack: {
      includeModules: true,
    },
  },
  plugins: [
    "serverless-webpack",
    "serverless-deployment-bucket",
    "serverless-plugin-additional-stacks",
    "serverless-sentry",
    "serverless-s3-remover",
    "serverless-scriptable-plugin",
  ],
  functions: {
    "create-javascript-bundle": {
      handler: "functions/create-javascript-bundle.handler",
      events: [
        {
          http: {
            path: "/v3/bundles/js",
            method: "get",
          },
        },
      ],
    },
    "update-origami-component-list": {
      handler: "functions/update-origami-component-list.handler",
      events: [
        {
          http: {
            path: "/v3/update-origami-component-list",
            method: "get",
          },
        },
        {
          schedule: "rate(1 day)",
        },
      ],
    },
  },
};

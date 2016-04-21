#IAM Role Configuration

Since Servo manages _many_ AWS resources, the permissions will be fairly open.

**NOTE**: `[PREFIX]` currently is fixed to `servo`. 
We've broken up the permissions as follows:

The first policy will allow Servo to manipulate the required AWS resources:
```
{{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "cloudwatch:*",
                "elasticloadbalancing:*",
                "autoscaling:*",
                "ses:*",
                "sns:*",
                "sqs:*",
                "route53:*",
                "logs:*",
                "lambda:*",
                "dynamodb:*",
                "sdb:*"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

* Servo generates an IAM role for each app. Since IAM is very sensitive, we only allow certain permissions

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:AddRoleToInstanceProfile",
        "iam:CreateAccessKey",
        "iam:CreateInstanceProfile",
        "iam:CreateRole",
        "iam:CreateSAMLProvider",
        "iam:GetInstanceProfile",
        "iam:GetServerCertificate",
        "iam:GetRole",
        "iam:DeleteAccessKey",
        "iam:DeleteInstanceProfile",
        "iam:DeleteRole",
        "iam:DeleteRolePolicy",
        "iam:DeleteSAMLProvider",
        "iam:GetInstanceProfile",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:GetSAMLProvider",
        "iam:ListAccessKeys",
        "iam:ListInstanceProfiles",
        "iam:ListInstanceProfilesForRole",
        "iam:ListRoles",
        "iam:ListSAMLProviders",
        "iam:ListServerCertificates",
        "iam:ListSigningCertificates",
        "iam:PassRole",
        "iam:PutRolePolicy",
        "iam:UpdateServerCertificate",
        "iam:UpdateSigningCertificate",
        "iam:UploadServerCertificate",
        "iam:UploadSigningCertificate",
        "iam:RemoveRoleFromInstanceProfile"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
```

* Servo uses S3 to store build artifacts and other build/deploy related information. The buckets should be named `[PREFIX]-[ORG]-[REGION]`. The following rules only allow servo access to buckets with the appropriate `[PREFIX]`.

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketLocation",
                "s3:ListAllMyBuckets"
            ],
            "Resource": "arn:aws:s3:::*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::[PREFIX]-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::[PREFIX]-*/*"
        }
    ]
}
```

Since all deploys will be using the large buckets, we can explicitly disallow servo from accessing config objects that do not belong to it.
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [ "s3:GetObject"],
      "Resource": "arn:aws:s3:::[PREFIX]-*/configs/*"
    }
  ]
}

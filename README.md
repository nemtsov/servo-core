Servo Core
==========

##The PaaS
`servo-core` is the fundamental piece of the Platform as a Service (PaaS). This application directly interacts with AWS to stand up the required AWS resources for a web application in AWS.

## [AWS Setup Documentation](docs/README.md)

## Setup local development environment
Set the proper environment variables in a `.env` file in the root directory (use `.env.example` for defaults).

| env variable  |Description|
|-------|--------|
| `BASE_HANDLE`| In the format `[ORG]:[REGION]`. Core uses this to determine names of the VPC, SQS, & SNS topics. |
| `BUILDERS` | Number of builder to handle the build process|
|`AWS_ACCOUNT_ID`| Account number needed for `ARN`s|
|`PORT`| Port for core to listen to for requests|
|`ROUTE53_DOMAIN`| Custom hosted zone in Route53|
|`KEY`|Random Encryption KEY unique for the core|
|`NODE_ENV`| Dictates amount of logging |
|`DEBUG`|*optional* Generates verbose logs if present|
|`AWS_ACCESS_KEY_ID`| \*(*Optional*)\* Useful for local dev & conection to AWS services without IAM roles|
|`AWS_SECRET_ACCESS_KEY`| \*(*Optional*)\* Used for local dev, where IAM roles cannot be used|

Simply run the following to start a local copy of servo.
```
node server.js
```

## [Contributors](https://github.com/dowjones/servo-docs/blob/master/Contributors.md)

## Related Repos
* [servo-docs](https://github.com/dowjones/servo-docs/)
* [servo-console](https://github.com/dowjones/servo-console/)
* [servo-gateway](https://github.com/dowjones/servo-gateway/)

## License
[MIT](LICENSE)

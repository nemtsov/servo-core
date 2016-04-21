#Route53 Setup

Servo gives each deployed stack a unique DNS entry within Route53. In order to do this, a Hosted Zone needs to be created within Route 53 first. The name of this zone will be passed via environment variables to Servo.

1. Create a hosted zone in the AWS console.

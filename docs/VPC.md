#VPC Configuration

This is the most intensive setup for Servo. However, this only has to be once every time you deploy a `servo-core` to a new region/org.

Servo operates in a VPC. (You can setup a VPN back to your own data centers)
For each region, there will be a VPC dedicated to `servo-gateway`, and each `servo-core` will deploy within its own VPC.

1. The VPC for `servo-gateway` will be named `servo:virginia`. Create this VPC with a small CIDR block because only `servo-gateway` instances will live on this VPC. Example: `10.1.2.0/24`.

2. Create another VPC for `servo-core` named `[ORG]:virginia` and all of the apps you deploy. `[ORG]` is an identifier that you can set.
  * Set DNS Resolution to `YES`
  * Set DNS Hostnames to `YES`
3. Crate two subnets, one in each AZ, that split the VPC in half.
  * Enable auto-assign IP for subnets. This avoids the need for NAT instances
  * Example subnet range 1 for `servo:virginia`: `10.1.2.0/25`
  * Example subnet range 2 for `servo:virginia`: `10.1.2.128/25`
  * *YOUR CIDR RANGES WILL BE DIFFERENT*
4. Create Internet Gateways for both VPCs
5. Modify the default route tables on both VPCs to route internet traffic (`0.0.0.0/0`) to the respective Internet Gateway.
6. Create a peering connection between the two VPC (note the ID).
7. Add route table entries that to each VPC so that traffic targeted to the others CIDR range will go to the Peering connection ID we obtained in step 6.
8. (Optional) Modify the default Security Group on the VPCs to only allow connections from your Jumpbox.
9. Your network should be set!

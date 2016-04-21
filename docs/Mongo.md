#Mongo Setup

`servo-core` uses MongoDB as its DB to store all app related information and this part is fairly simple. You can have a simple, single instance, MongoDB (not recommended), or you can create a cluster.

1. Create the cluster or instance and attach the default SG.
2. Create a user called `servo-user`
3. Create a DB named `servo-core`
4. Ensure the SG for the mongo cluster/instance allows inbound access from servo-core.

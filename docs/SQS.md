# SQS

Servo uses SQS to deliver events as well as manage builds & deploys.
Currently the queues need to be manually created.

There are 3 queues:
  * Builder queue
  * Main queue (for deploys)
  * Events queue

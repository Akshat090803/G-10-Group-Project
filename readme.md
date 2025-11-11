Microservices Fault Tolerance Demo (Local DB Setup)

Welcome! This project demonstrates key fault tolerance patterns. This guide is updated to use your local PostgreSQL and MongoDB installations, and only uses Docker for RabbitMQ.

Features Implemented

API Gateway: Single entry point (localhost:3000).

Load Balancing: Round-robin load balancing for the Rating Service.

Circuit Breaker: User Service uses opossum when calling the (flaky) Rating Service.

Asynchronous Communication: User Service sends bookings to Hotel Service via RabbitMQ.

Health Checks: /health endpoints and a /breaker-state endpoint to monitor the circuit.

Architecture

[User] --> [API Gateway (Port 3000)]
               |
     /users    |    /hotels     |    /ratings
       |           |           |
       |           |           +--> [Load Balancer]
       |           |                      |
       |           |                      +--> [Rating Service (3003)]
       |           |                      +--> [Rating Service (3004)]
       |           |
       |           +--------------------> [Hotel Service (3002)]
       |                                      | (Reads from Queue)
       |                                      ^
       |                                      | [RabbitMQ (Docker)]
       +-------------------------------------> [User Service (3001)]
           | (Sync + Circuit Breaker)         | (Async Publish)
           |                                  |
           +-----> [Rating Service]           +-----> [RabbitMQ]
           |
           +-----> [Local PostgreSQL]


Folder Structure

fault-tolerance-demo/
|
|-- docker-compose.yml     # (New file, RabbitMQ only)
|-- README.md              # (This file)
|
|-- api-gateway/
|   |-- package.json
|   |-- server.js
|
|-- user-service/
|   |-- package.json
|   |-- server.js
|   |-- db.js             # (Connects to local Postgres)
|   |-- message-queue.js  # (Connects to RabbitMQ)
|
|-- hotel-service/
|   |-- package.json
|   |-- server.js
|   |-- db.js             # (Connects to local Mongo)
|   |-- message-consumer.js # (Connects to RabbitMQ)
|
|-- rating-service/
|   |-- package.json
|   |-- server.js
|   |-- db.js             # (Connects to local Mongo)


Step-by-Step Setup

Step 1: Prerequisites

Install Node.js

Install Docker

You have PostgreSQL and MongoDB installed and running locally.

Step 2: Set Up Local PostgreSQL

The User Service needs a specific user and database.

Open psql or pgAdmin and connect as a superuser (like postgres).

Run the following SQL commands:

-- 1. Create the user with a password
CREATE USER useradmin WITH PASSWORD 'userpass';

-- 2. Create the database
CREATE DATABASE user_service_db;

-- 3. Give the new user full control over the new database
GRANT ALL PRIVILEGES ON DATABASE user_service_db TO useradmin;


(If useradmin already exists from a failed Docker attempt, you can run DROP USER useradmin; first).

Step 3: Set Up Local MongoDB

This is easy. Your local MongoDB is likely running on localhost:27017 without authentication. The code will automatically create the databases (hotel_service_db and rating_service_db) when it first connects.

Step 4: Launch RabbitMQ

Place the new, simplified docker-compose.yml in your fault-tolerance-demo/ directory. Open a terminal in this directory and run:

docker-compose up -d


This will start only RabbitMQ. You can see its dashboard at http://localhost:15672 (user: guest, pass: guest).

Step 5: Set Up Each Service

Create the folders from the structure above. Copy all the code files provided into their correct places.

Crucially, in 4 separate terminals:

Terminal for api-gateway:

cd api-gateway
npm install


Terminal for user-service:

cd user-service
npm install


Terminal for hotel-service:

cd hotel-service
npm install


Terminal for rating-service:

cd rating-service
npm install


Step 6: Run the Services

You need 5 separate terminals for this.

Terminal 1 (Gateway):

cd api-gateway
npm start


(Runs on localhost:3000)

Terminal 2 (User):

cd user-service
npm start


(Runs on localhost:3001)

Terminal 3 (Hotel):

cd hotel-service
npm start


(Runs on localhost:3002)

Terminal 4 (Rating - Instance 1):

cd rating-service
npm start


(Runs on localhost:3003)

Terminal 5 (Rating - Instance 2 - For Load Balancing):

cd rating-service
# We run the same service on a different port
PORT=3004 npm start


(Runs on localhost:3004)

Your entire system is now running! All services are using your local databases and the Docker-based RabbitMQ.

How to Test Fault Tolerance

(These steps are unchanged and will work perfectly with the new setup.)

Test 1: Load Balancing

Hit http://localhost:3000/ratings in your browser.

Watch the logs in Terminal 4 and Terminal 5. You'll see requests alternate between port 3003 and 3004.

Test 2: Asynchronous Communication (Resilience)

Send a POST request to http://localhost:3000/users/1/book-hotel with a JSON body:

{ "hotelId": "hotel-123", "days": 3 }


The User Service (Terminal 2) logs Sent booking... and the Hotel Service (Terminal 3) logs Received booking...

Stop the Hotel Service (Terminal 3, CTRL+C).

Send the POST request again. The request finishes instantly! The message is now waiting in RabbitMQ (check the dashboard at http://localhost:15672).

Restart the Hotel Service (npm start in Terminal 3). It will immediately pick up the missed message and log Received booking....

Test 3: Circuit Breaker

The Rating Service is built to fail 50% of the time.

Refresh http://localhost:3000/users/1/details several times. It will sometimes work and sometimes show an error.

Refresh quickly 5-10 times.

The circuit will OPEN! You will suddenly get a fast, clean response:

{
  "user": { "id": "1", "name": "Alice" },
  "ratings": "Rating service is down, returning cached/fallback data."
}


The User Service (Terminal 2) will log [User Service] Circuit OPEN. Using fallback.

Check breaker health at http://localhost:3000/users/breaker-state. You will see state: "OPEN".

Wait 30 seconds. The breaker will move to HALF_OPEN. The next request will try again. If it succeeds, the circuit will CLOSE and the system auto-recovers.
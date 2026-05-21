1. Create new database on mongoDB compass named "rnmces"
2. RUN: npm install
2. RUN:
    docker build -t rabbit-nursery-be .
    docker run --rm -p 4000:4000 -e MONGO_URI='mongodb://host.docker.internal:27017/arduino_iot' rabbit-nursery-be
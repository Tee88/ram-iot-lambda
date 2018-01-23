
'use strict'

var MongoClient = require('mongodb').MongoClient;
const dbName = 'ramUsage';

let atlas_connection_uri;
let cachedDb = null;

exports.handler = (event, context, callback) => {
    var uri = process.env['MONGODB_ATLAS_CLUSTER_URI'];
    
    if (atlas_connection_uri != null) {
        processEvent(event, context, callback);
    } 
    else {
        atlas_connection_uri = uri;
        console.log('the Atlas connection string is ' + atlas_connection_uri);
        processEvent(event, context, callback);
    } 
};

function processEvent(event, context, callback) {
    console.log('Calling MongoDB Atlas from AWS Lambda with event: ' + JSON.stringify(event));
    var jsonContents = JSON.parse(JSON.stringify(event));
    
    //date conversion for grades array
    if(jsonContents != null) {
        jsonContents.timeStamp = new Date();
    }
    
    //the following line is critical for performance reasons to allow re-use of database connections across calls to this Lambda function and avoid closing the database connection. The first call to this lambda function takes about 5 seconds to complete, while subsequent, close calls will only take a few hundred milliseconds.
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        if (cachedDb == null) {
            console.log('=> connecting to database');
            MongoClient.connect(atlas_connection_uri, function (err, client) {
                cachedDb = client.db(dbName);
                return createDoc(cachedDb, jsonContents, callback);
            });
        }
        else {
            createDoc(cachedDb, jsonContents, callback);
        }
    }
    catch (err) {
        console.error('an error occurred', err);
    }
}

function createDoc (db, json, callback) {
  db.collection('ramReadings').insertOne( json, function(err, result) {
      if(err!=null) {
          console.error("an error occurred in createDoc", err);
          callback(null, JSON.stringify(err));
      }
      else {
        console.log("Kudos! You just created an entry into the ramReadings collection with id: " + result.insertedId);
        callback(null, "SUCCESS");
      }
      //we don't need to close the connection thanks to context.callbackWaitsForEmptyEventLoop = false (above)
      //this will let our function re-use the connection on the next called (if it can re-use the same Lambda container)
      //db.close();
  });
};

//run this interminal to execute lambda locally
//lambda-local -l app.js -e event.json -E {\"MONGODB_ATLAS_CLUSTER_URI\":\"mongodb://admin:<PASSWORD>@iot-shard-00-00-gj7ll.mongodb.net:27017\,iot-shard-00-01-gj7ll.mongodb.net:27017\,iot-shard-00-02-gj7ll.mongodb.net:27017/ramUsage?ssl=true\&replicaSet=IoT-shard-0\&authSource=admin\"}
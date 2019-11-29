'use strict';

const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();
const mysql = require('serverless-mysql')()

mysql.config({
  host: 34.217.176.147,
  database : 'chatscrum'
  user :'root',
  password: '8iu7*IU&'
 })

require('aws-sdk/clients/apigatewaymanagementapi');

const CHATCONNECTION_TABLE = 'chatIdTable';
const MESSAGE_TABLE = 'MessageTable';

const successfullResponse = {
  statusCode: 200,
  body: 'everything is alright'
};

module.exports.connectionHandler = (event, context, callback) => {
  console.log(event);

  if (event.requestContext.eventType === 'CONNECT') {
    //Handle Connection
    addConnection(event.requestContext.connectionId)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch(err => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  } else if (event.requestContext.eventType === 'MESSAGE') {
          sendInit(event).then(() => {
               callback(null, successfullResponse)
           }).catch(err => {
               callback(null, JSON.stringify(err));
          });
  }

 else if (event.requestContext.eventType === 'DISCONNECT') {
    //Handle disconnection
    deleteConnection(event.requestContext.connectionId)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch(err => {
        console.log(err);
        callback(null, {
          statusCode: 500,
          body: 'Failed to connect: ' + JSON.stringify(err)
        });
      });
  }

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

// THIS ONE DOESNT DO ANYHTING
module.exports.defaultHandler = (event, context, callback) => {
  console.log('defaultHandler was called');
  console.log(event);

  callback(null, {
    statusCode: 200,
    body: 'defaultHandler'
  });
};

module.exports.sendMessageHandler = (event, context, callback) => {
  sendMessageToAllConnected(event).then(() => {
    callback(null, successfullResponse)
  }).catch (err => {
    callback(null, JSON.stringify(err));
  });
}

module.exports.initHandler = (event, context, callback) => {

  sendInit(event).then(() => { 
    callback(null, successfullResponse)   
  }).catch(err => {
    callback(null, JSON.stringify(err));
  });

};

const sendMessageToAllConnected = (event) => {
  return getConnectionIds().then(connectionData => {
    return connectionData.Items.map(connectionId => {
      return send(event, connectionId.connectionId);
    });
  });
}

const sendInit = (event) => {
 return  getConnectionIds().then(connectionData => {
     return  connectionData.Items.map(connectionId => {
        return  getMessages().then(result => {
             console.log(result)
             const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
             const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                apiVersion: "2018-11-29",
                endpoint: endpoint
               });

                const params = {
                  ConnectionId: connectionId.connectionId,
                  Data:JSON.stringify(result)
                };

                return apigwManagementApi.postToConnection(params).promise();
            });
         });

    })
}

const PostMessages = () => {
  return getMessages().then(data => {
     console.log(data)
   });
}

const getConnectionIds = () => {  
  const params = {
    TableName: CHATCONNECTION_TABLE,
    ProjectionExpression: 'connectionId'
  };

  return dynamo.scan(params).promise();
}

const getMessages = () => {
  const params = {
     TableName: MESSAGE_TABLE,
     ProjectionExpression: 'messageid, message',
    };
    return dynamo.scan(params).promise()
}

const send = (event, connectionId) => {
  console.log(event)
  const body = JSON.parse(event.body);
  console.log(body)
  const postData = body.data;
  const message = body.data;
  const messageid = body.messageid

  /*
  getId(messageid).then(result => {
   console.log(result.Items)
  });
  */


  PostMessages()
  storemessage(message,messageid)




  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: endpoint
  });

  const params = {
    ConnectionId: connectionId,
    Data: postData
  };





  return apigwManagementApi.postToConnection(params).promise();
};

const addConnection = connectionId => {
  const params = {
    TableName: CHATCONNECTION_TABLE,
    Item: {
      connectionId: connectionId 
    }
  };

  return dynamo.put(params).promise();
};

const storemessage = (message,messageid) => {
  const params = {
    TableName: MESSAGE_TABLE,
    Item: {
      messageid:messageid,
      message:message
    }
  }

  return dynamo.put(params).promise();
}

const updateMessage = (messageid, paramName, paramsValue) => {
  const params = {
    TableName: MESSAGE_TABLE,
    Key: {
      messageid
    },
    ConditionalExpression: 'attribute_exists(messageid)',
    UpdateExpression: 'set ' + paramName + ' = :v',
    ExpressionAttributeValues: {
      ':v' : paramValue
    },
    ReturnValues: 'ALL_NEW'
  };
  return dynamo.update(params).promise();    
}

const getId = (messageid) => {
   const params = {
     Key: {
       messageid:messageid
     },
     TableName: MESAAGE_TABLE
   };
   return dynamo.get(params).promise().then(result => {
     console.log(result.Items)
     });

} 


const deleteConnection = connectionId => {
  const params = {
    TableName: CHATCONNECTION_TABLE,
    Key: {
      connectionId: connectionId 
    }
  };

  return dynamo.delete(params).promise();
};

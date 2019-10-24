'use strict';
const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();

require('aws-sdk/clients/apigatewaymanagementapi'); 

const CHATCONNECTION_TABLE = 'chatIdTable';

const successfullResponse = {
  statusCode: 200,
  body: 'everything is alright WKIMDEV~'
};


module.exports.connectionManagement = (event, context, callback) => {
  console.log(event);

  if (event.requestContext.eventType === 'CONNECT') {
     // Handle connection
     addConnection(event.requestContext.connectionId)
     .then(() => {
       callback(null, successfullResponse);
     })
     .catch(err => {
       console.log(err);
       callback(null, JSON.stringify(err));
     });
  } else if (event.requestContext.eventType === 'DISCONNECT') {
      // Handle disconnection
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

// message를 보내면 lambda에 트리거가 걸린다. 
module.exports.sendMessageHandler = (event, context, callback) => {
  sendMessageToAllConnected(event).then(() => {
    callback(null, successfullResponse)
  }).catch (err => {
    callback(null, JSON.stringify(err));
  });
}

// 내 어플에 접근한 모든 사용자에게 메세지를 보냄
const sendMessageToAllConnected = (event) => {
  return getConnectionIds().then(connectionData => {
    return connectionData.Items.map(connectionId => {
      return send(event, connectionId.connectionId);
    });
  });
}

const send = (event, connectionId) => {
  const body = JSON.parse(event.body);
  const postData = body.data;  

  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2019-10-24",
    endpoint: endpoint
  });

  const params = {
    ConnectionId: connectionId,
    Data: postData
  };
  // repeat every resource connected
  return apigwManagementApi.postToConnection(params).promise();
};

// 웹소켓 커넥션이 연결되어있을때 connectionId를 add
const addConnection = connectionId => {
  const params = {
    TableName: CHATCONNECTION_TABLE,
    Item: {
      connectionId: connectionId 
    }
  };

  return dynamo.put(params).promise();
};

// 웹소켓 커넥션이 끊겼을때 connectionId를 삭제
const deleteConnection = connectionId => {
  const params = {
    TableName: CHATCONNECTION_TABLE,
    Key: {
      connectionId: connectionId 
    }
  };

  return dynamo.delete(params).promise();
};
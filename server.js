const WebSocket = require('ws');

const server = new WebSocket.Server({
  port: 8080,
  clientTracking: true
});
const users = {
  type: 'allUsers',
  allUsers: []
};
const history = {
  type: 'history',
  messages: []
};

server.on('connection', function connection(ws) {
  if (users.allUsers.length) {
    ws.send(JSON.stringify(users));
  }
  ws.on('message', function incoming(message) {
    let messageBody = JSON.parse(message);

    if (messageBody.type == 'oldUser') {
      ws.user = messageBody.data;
      users.allUsers.forEach(user => {
        if (user.nick == messageBody.data.nick) {
          user.online = true;
        }
      });

      server.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(users));
        }
        if (client == ws && client.readyState === ws.OPEN) {
          client.send(JSON.stringify(history));
        }
      });
    } else if (messageBody.type == 'newUser') {
      ws.user = messageBody.data;
      users.allUsers.push(ws.user);

      server.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ content: messageBody, client: ws.user }));
          client.send(JSON.stringify(users));
        }
      });
    } else if (messageBody.type == 'photo') {
      ws.user.photo = messageBody.data;

      server.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ content: messageBody, client: ws.user }));
        }
      });
    } else if (messageBody.type == 'message') {
      const date = new Date();
      let time = date.toLocaleTimeString("ru", {
        hour12: false,
        hour: "numeric",
        minute: "numeric"
      });
      messageBody.time = time;

      history.messages.push({ content: messageBody, client: ws.user });

      server.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ content: messageBody, client: ws.user }));
        }
      });
    }
  });
  
  ws.on('close', (e) => {
    users.allUsers.forEach(function (user) {
      if (ws.user && user.name == ws.user.name) {
        user.online = false;
      }
    });

    server.clients.forEach(function each(client) {
      client.send(JSON.stringify(users));
    });
  });
});
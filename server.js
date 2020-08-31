const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
var formatMessage = require('./utils/messages');
var formatDataBaseEntry = require('./utils/messages');
var formatHistory = require('./utils/history');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'chat_app';
let db;

//Connect to the DataBase Server
MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
  if (err) return console.log(err);

  // Storing a reference to the database so you can use it later
  db = client.db(dbName);
  console.log(`Connected MongoDB: ${url}`);
  console.log(`Database: ${dbName}`);

  var messageCollection = db.collection('messages');

  // Run when client connects
  io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room);

      socket.join(user.room);

      // Get room chat history
      var history = messageCollection;
      history.find({room:user.room}).toArray(function(err, results){
        var n = results.length;
        for (var i = 0; i < n; i++) {
          history = results[i];
          console.log(formatMessage(history.username, history.text, history.time));
          socket.emit('history', formatMessage(history.username, history.text, history.time));
        }

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));
        
      });

      // Broadcast when a user connects    
      socket.broadcast
        .to(user.room)
        .emit(
          'message',
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
      const user = getCurrentUser(socket.id);      

      io.to(user.room).emit('message', formatMessage(user.username, msg));

      // Save message in DataBase
      messageCollection.insertMany([formatDataBaseEntry(user.username, msg, user.room)]);
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
      const user = userLeave(socket.id);

      if (user) {
        io.to(user.room).emit(
          'message',
          formatMessage(botName, `${user.username} has left the chat`)
        );

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  });
})

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

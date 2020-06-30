require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/dibujio'

const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const words = require('./data/palabras.json')
const wordsLength = words.length

const express = require('express')
const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

require('./configs/db.config')

const app = express()
const cors = require('cors')
app.use(cors())
app.use(
    session({
      secret: 'pictionario1234',
      saveUninitialized: true,
      resave: true,
      cookie: {
        maxAge: 60 * 60 * 24 * 1000, //60 sec * 60 min * 24hrs = 1 day (in milliseconds)
      },
      store: new MongoStore({
        url: MONGODB_URI,
        // mongooseConnection: mongoose.connection
        //time to live (in seconds)
        ttl: 60 * 60 * 24,
        autoRemove: 'disabled',
      }),
    })
)
// a body parser to allow us to parse form submissions
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()) //crucial for post requests from client

//api routes
const apiRoutes = require('./routes/api.routes')
app.use('/api', apiRoutes)
//auth routes
const authRoutes = require('./routes/auth.routes')
app.use('/profile', authRoutes);
//auth upload image routes
const fileUploads = require('./routes/file-upload.routes')
app.use('/profile', fileUploads)

const server = app.listen(process.env.PORT, () => {
    console.log('Server is running on ',process.env.PORT)
})

const dbLogic = require('./logic/dbLogic')
const { db } = require('./models/Room.model')
const io = require('socket.io')(server)

let newLeaderTimeout, serverRooms = {};
dbLogic.dropRooms()
    .then( res => console.log('droped rooms'))
    .catch( err => console.log(err))
dbLogic.dropClients()
    .then( res => console.log('droped clients'))
    .catch( err => console.log(err))
io.on('connect', socket => {
    socket.emit('welcome', { greet: 'hello there'})
    socket.on('join room', ({selectedRoom, clientName, isLeader}) => {
        socket.selectedRoom = selectedRoom
        dbLogic.createClient(clientName, socket.id)
            .then( client => {
                socket.clientName = client.name
                socket.clientId = client._id
                socket.emit('assigned name', client.name)
                socket.join(selectedRoom, ()=> {
                    dbLogic.updateRoom(selectedRoom, client._id, client.name, isLeader)
                        .then( room => {
                            socket.emit('joined', {currentLeader: room.leader.name, timeFinish: room.timeFinish})
                            socket.to(selectedRoom).emit('new client', client)
                        })
                        .catch( err => console.error(err))
                })
            })
            .catch( err => console.error(err))
    })
    socket.on('forward signal', (signal, clientName, socketTo) => {
        socket.to(socketTo).emit('signal', signal, clientName, socket.id)
    })
    socket.on('2 clients connected', clients => {
        startRoom(socket.selectedRoom)
    })
    socket.on('chose word', word => {
        setWord(socket.clientName, socket.selectedRoom, word)
    })
    socket.on('message', message =>{
        dbLogic.getWord(socket.selectedRoom)
            .then( ({word, _id}) => {
                if(word === message){
                    io.in(socket.selectedRoom).emit('correct guess', socket.clientName)
                    updateRanking(socket.clientName, _id)
                }
                else{
                    console.log(word,'!==', message)
                    io.in(socket.selectedRoom).emit('message', socket.clientName, message)
                }
            })
    })
    socket.on('disconnect', () => {
        dbLogic.deleteClient(socket.clientId, socket.selectedRoom)
        .then( room => {
            if(room.clients.length < 2){
                pauseRoom(room.name)
            }
            else if(room.leader._id === socket.clientId){
                clearTimeout(newLeaderTimeout)
                sendNewLeader(socket.selectedRoom)
            }
            io.to(room.name).emit('user disconnected', socket.clientName)
            console.log('disconnRoom.clients.length: ',room.clients.length)
            console.log('disconnRoom.clients: ', room.clients)
            io.to(room.name).emit('user disconnnected', socket.clientName)
        })
        .catch( err => console.error(err) )
    })
})
const startRoom = (room) => {
    console.log('startRoom(',room,') called!')
    dbLogic.isRoomPlaying(room)
    .then( foundRoom => {
        if(!foundRoom.isPlaying){
            dbLogic.startRoom(room)
                .then( () => {

                io.to(room).emit('game starts')
                sendNewLeader(room)
                })
        }
    })
    .catch( err => console.error(err))
}
const pauseRoom = (roomName) => {
    io.to(roomName).emit('room paused', roomName)
    serverRooms[roomName].isPlaying = false
    dbLogic.pauseRoom(roomName)
        .then(res => console.log(res))
        .catch(err => console.error(err))
}
const sendNewLeader = (roomName) => {
    dbLogic.newLeader(roomName)
        .then( updatedRoom => {
            updatedRoom.ranking.sort( (a,b) => a.points - b.points)
            const threeWords = randomWords(3)
            if(updatedRoom.totalRounds === updatedRoom.playedRounds-1){
                io.to(roomName).emit('game ended', updatedRoom.ranking)
            }
            else{
                io.to(roomName).emit('new leader', {leader: updatedRoom.leader.name, ranking: updatedRoom.ranking})
                io.to(roomName).emit('finish time', updatedRoom.timeFinish)
                io.to(updatedRoom.leader.socket).emit('choose word', threeWords)
                newLeaderTimeout = setTimeout(() => {sendNewLeader(roomName)}, updatedRoom.roundSeconds * 1000)
            }
        })
        .catch( err => console.error(err))

}
const updateRanking = (clientName, roomId) => {
    console.log('update ranking clientName', clientName)
    dbLogic.updateRanking(clientName, roomId)
        .then( res => console.log(res))
        .catch( err => console.log(err))
}
const setWord = (clientName, roomName, word) => {
    dbLogic.getLeader(roomName)
        .then( ({leader}) => {
            if(leader.name === clientName){
                dbLogic.setWord(word, roomName)
                    .then( res => console.log(res))
                    .catch( err => console.log(err))
            }
            else{
                console.log('someone who is not a leader tried to set the word')
            }
        })
        .catch( err => console.error(err) )
}
const randomWords = (returnLength) => {
    const returnArray = []
    for(let i = 0; i < returnLength; i++){
        returnArray.push(words[Math.floor(Math.random() * wordsLength)])
    }
    return returnArray
}
module.exports = app
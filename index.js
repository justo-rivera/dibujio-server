require('dotenv').config()

const words = require('./data/palabras.json')
const wordsLength = words.length

const express = require('express')
const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

const apiRoutes = require('./routes/api.routes')
require('./configs/db.config')

const app = express()
const cors = require('cors')
app.use(cors())

// a body parser to allow us to parse form submissions
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//api routes
app.use("/api", apiRoutes)

const server = app.listen(process.env.PORT, () => {
    console.log('Server is running on ',process.env.PORT)
})

const dbLogic = require('./logic/dbLogic')
const { db } = require('./models/Room.model')
const io = require('socket.io')(server)


io.on('connect', socket => {
    socket.emit('welcome', { greet: 'hello there'})
    socket.on('join room', ({selectedRoom, clientName, isLeader}) => {
        socket.selectedRoom = selectedRoom
        console.log('clientName.......',clientName)
        dbLogic.createClient(clientName, socket.id)
            .then( client => {
                socket.clientName = client.name
                socket.clientId = client._id
                socket.emit('assigned name', client.name)
                socket.join(selectedRoom, ()=> {
                    dbLogic.updateRoom(selectedRoom, client._id, isLeader)
                        .then( (res) => {
                            socket.emit('joined', Object.keys(socket.rooms))
                            socket.to(selectedRoom).emit('new client', {client})
                        })
                        .catch( err => console.error(err))
                })
            })
            .catch( err => console.error(err))
    })
    socket.on('forward signal', (signal, clientName, socketTo) => {
        console.log(socketTo)
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
            .then( ({word}) => {
                if(word === message){
                    io.in(socket.selectedRoom).emit('correct guess', socket.clientName)
                }
                else{
                    console.log(word,'!==', message)
                    io.in(socket.selectedRoom).emit('message', socket.clientName, message)
                }
            })
    })
    socket.on('disconnect', () => {
        console.log('disconnecting ', socket.clientId)
        dbLogic.deleteClient(socket.clientId)
        .then( res => console.log(res) )
        .catch( err => console.error(err) )
    })
})
io.on("disconnect", socket => {
    dbLogic.deleteClient(socket.clientId)
        .then( res => console.log(res) )
        .catch( err => console.error(err) )
})
const sendNewLeader = (room) => {
    dbLogic.newLeader(room)
        .then( updatedRoom => {
            console.log('updatedRoom: ',updatedRoom)
            const nowTime = new Date()
            const timeFinish = new Date(nowTime.getTime() + 90 * 1000)
            const threeWords = randomWords(3)
            io.to(room).emit('new leader', updatedRoom.leader.name)
            io.to(room).emit('finish time', timeFinish)
            io.to(updatedRoom.leader.socket).emit('choose word', threeWords)
            setTimeout(() => {sendNewLeader(room)}, 90 * 1000)
        })
        .catch( err => console.error(err))

}
const setWord = (clientName, room, word) => {
    dbLogic.getLeader(room)
        .then( ({leader}) => {
            if(leader.name === clientName){
                dbLogic.setWord(word, room)
                    .then( res => console.log(res))
                    .catch( err => console.log(err))
            }
            else{
                console.log('someone who is not a leader tried to set the word')
            }
        })
        .catch( err => console.error(err) )
}
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
const randomWords = (returnLength) => {
    const returnArray = []
    for(let i = 0; i < returnLength; i++){
        returnArray.push(words[Math.floor(Math.random() * wordsLength)])
    }
    return returnArray
}
module.exports = app
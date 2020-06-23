require('dotenv').config()
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
            const timeFinish = new Date(nowTime.getTime() + 30 * 1000)
            io.to(room).emit('new leader', updatedRoom.leader.name)
            io.to(room).emit('finish time', timeFinish)
            console.log(timeFinish)
            setTimeout(() => {sendNewLeader(room)}, 30 * 1000)
        })
        .catch( err => console.error(err))

}
const startRoom = (room) => {
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
}
module.exports = app
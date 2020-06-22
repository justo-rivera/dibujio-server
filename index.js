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
const io = require('socket.io')(server)


io.on('connect', socket => {
    socket.emit('welcome', { greet: 'hello there'})
    socket.on('join room', ({selectedRoom, clientName, isLeader}) => {
        socket.clientName = clientName
        socket.selectedRoom = selectedRoom
        socket.isLeader = isLeader
        console.log('clientName.......',clientName)
        dbLogic.createClient(clientName, socket.id)
            .then( client => {
                socket.join(selectedRoom, ()=> {
                    dbLogic.updateRoom(selectedRoom, client._id, isLeader)
                        .then( (res) => {
                            console.log(res)
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
})

module.exports = app
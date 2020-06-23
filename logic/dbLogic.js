const RoomModel = require('../models/Room.model')
const ClientModel = require('../models/Client.model')
const mongoose = require('mongoose')

const updateRoom = (roomName, clientId, changeLeader) => {
    const updateQuery = {$push: {clients: clientId}}
    if(changeLeader) updateQuery.$set = {leader: clientId}
    console.log(updateQuery,changeLeader)
    return RoomModel.findOneAndUpdate({name: roomName}, updateQuery, {new: true, upsert: true, setDefaultsOnInsert: true})
}
const createClient = (clientName, socket) => {
    const pattern = `^${clientName}`
    console.log(pattern)
    return ClientModel.countDocuments({name: {$regex: pattern}})
        .then( (sameNames) => {
            if(sameNames>0) clientName+=sameNames
            console.log(sameNames)
            return ClientModel.create({name: clientName, socket})
        }
        )
        .catch( err => console.error(err))
}
const deleteClient = (clientId) => {
    console.log(mongoose.Types.ObjectId(clientId))
    RoomModel.updateMany({}, {$pull: {clients: clientId}})
        .then( res => console.error(res))
        .catch( res => console.error(res))
    return ClientModel.findByIdAndDelete(clientId)
}
const newLeader = (roomName) => {
    return RoomModel.findOne({name: roomName})
        .populate('clients')
        .populate('leader')
        .then( room => {
            console.log(room)
            const leader = room.clients[Math.floor(Math.random() * room.clients.length)]._id
            return RoomModel.findByIdAndUpdate(room._id, {$set: {leader}}, {new: true}).populate('leader').populate('client')
        })
        .catch( err => console.error('dbLogic.newLeader(',roomName,')... ',err))
}
const isRoomPlaying = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'isPlaying')
}
const startRoom = (roomName) => {
    return RoomModel.update({name: roomName}, {$set: {isPlaying: true}})
}
    

module.exports = { updateRoom, createClient, deleteClient, newLeader, isRoomPlaying, startRoom }
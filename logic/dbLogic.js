const RoomModel = require('../models/Room.model')
const ClientModel = require('../models/Client.model')
const mongoose = require('mongoose')

const updateRoom = (roomName, clientId, changeLeader) => {
    const updateQuery = {$push: {clients: clientId}}
    if(changeLeader) updateQuery.$set = {leader: clientId}
    console.log(updateQuery,changeLeader)
    return RoomModel.findOneAndUpdate({name: roomName}, updateQuery, {new: true, upsert: true, setDefaultsOnInsert: true}).populate('leader').populate('clients')
}
const createClient = (clientName, socket) => {
    const pattern = `^${clientName}[0-9]*`
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
            if(!room.leader){
                const leader = room.clients[Math.floor(Math.random() * room.clients.length)]._id
            }
            else{
            const leader = room.clients.filter(c => c._id !== room.leader._id)[Math.floor(Math.random() * room.clients.length-1)]._id
            }
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
const pauseRoom = (roomName) => {
    return RoomModel.update({name: roomName}, {$set: {isPlaying: false}})
}
const getLeader = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'leader').populate('leader')
}
const setWord = (word, roomName) => {
    console.log('RoomModel.updateOne({name: ',roomName,'}, {$set: {word: ',word,'}})')
    return RoomModel.updateOne({name: roomName}, {$set: {word: word}})
}
const getWord = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'word')
}
    

module.exports = { updateRoom, createClient, deleteClient, newLeader, isRoomPlaying, startRoom, getLeader, setWord, getWord, pauseRoom }
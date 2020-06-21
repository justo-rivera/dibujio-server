const RoomModel = require('../models/Room.model')
const ClientModel = require('../models/Client.model')

const updateRoom = (roomName, clientId, changeLeader) => {
    const updateQuery = {$push: {clients: clientId}}
    if(changeLeader) updateQuery.$set = {leader: clientId}
    console.log(updateQuery,changeLeader)
    return RoomModel.findOneAndUpdate({name: roomName}, updateQuery, {new: true, upsert: true})
}
const createClient = (clientName, socket) => {
    return ClientModel.create({name: clientName, socket})
}

module.exports = { updateRoom, createClient }
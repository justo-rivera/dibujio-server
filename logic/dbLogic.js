const RoomModel = require('../models/Room.model')
const ClientModel = require('../models/Client.model')
const mongoose = require('mongoose')

const dropRooms = () => {
    return RoomModel.remove({})
}
const dropClients = () => {
    return ClientModel.remove({})
}
const updateRoom = (roomName, clientId, clientName, changeLeader) => {
    const ranking = {client: clientName, points: 0}
    const updateQuery = {$push: {clients: clientId, ranking}}
    return RoomModel.findOneAndUpdate({name: roomName}, updateQuery, {new: true, upsert: true, setDefaultsOnInsert: true}).populate('leader').populate('clients')
}
const createClient = (clientName, socket) => {
    const pattern = `^${clientName}[0-9]*`
    return ClientModel.countDocuments({name: {$regex: pattern}})
        .then( (sameNames) => {
            if(sameNames>0) clientName+=sameNames
            return ClientModel.create({name: clientName, socket})
        }
        )
        .catch( err => console.error(err))
}
const deleteClient = (clientId, roomName) => {
    RoomModel.updateMany({}, {$pull: {clients: clientId, roundLeaders: clientId}}, {new: true})
    .then( res => console.log(res))
    .catch( res => console.error(res))
    ClientModel.findByIdAndDelete(clientId)
    .then( res => console.error(res))
    .catch( res => console.error(res))
    return RoomModel.findOne({name: roomName})
}
const updateRanking = (clientName, roomId) => {
    let clientFound = false, leaderFound = false
    return RoomModel.findById(roomId)
        .populate('leader')
        .then( ({ranking, timeFinish, roundSeconds, leader}) => {
            let now = new Date()
            const points = Math.floor((timeFinish - now.getTime())/1000 )
            ranking = ranking.map( clientRanking => {
                if(clientRanking.client === clientName){
                    clientRanking.points += points
                    clientFound = true
                }
                if(clientRanking.client === leader.name){
                    clientRanking.points += 10
                    leaderFound = true
                }
                return clientRanking
            })
            if(!clientFound) ranking.push({client: clientName, points})
            if(!leaderFound) ranking.push({client: leader.name, points: 10})
            return RoomModel.findByIdAndUpdate(roomId, {$set: {ranking}}, {new: true})
        })
}
const newLeader = (roomName) => {
    return RoomModel.findOne({name: roomName})
        .populate('clients')
        .populate('leader')
        .then( room => {
            const nowTime = new Date()
            const timeFinish = new Date(nowTime.getTime() + room.roundSeconds * 1000)
            let roundLeaders = room.roundLeaders
            let clientsToGo = room.clients.filter(c => !roundLeaders.includes(c._id))
            let playedRounds = room.playedRounds
            if(clientsToGo.length === 0){
                playedRounds++
                roundLeaders = []
                clientsToGo = room.clients
            }
            const leader = clientsToGo[Math.floor(Math.random() * clientsToGo.length)]
            roundLeaders = [leader._id, ...roundLeaders]
            return RoomModel.findByIdAndUpdate(room._id, {$set: {leader: leader, roundLeaders: roundLeaders, playedRounds: playedRounds, timeFinish: timeFinish}}, {new: true}).populate('leader').populate('client')
        })
        .catch( err => console.error('dbLogic.newLeader(',roomName,')... ',err))
}
const isRoomPlaying = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'isPlaying')
}
const startRoom = (roomName) => {
    return RoomModel.updateOne({name: roomName}, {$set: {isPlaying: true}})
}
const pauseRoom = (roomName) => {
    return RoomModel.updateOne({name: roomName}, {$set: {isPlaying: false, word: '', leader: null, timeFinish: null, playedRounds: 0, roundLeaders: [], ranking: []}})
}
const getLeader = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'leader').populate('leader')
}
const setWord = (word, roomName) => {
    return RoomModel.updateOne({name: roomName}, {$set: {word}})
}
const getWord = (roomName) => {
    return RoomModel.findOne({name: roomName}, 'word _id leader')
}
const endRoom = (roomName) => {
    return RoomModel.updateOne({name: roomName}, {$set: {isPlaying: false, word: '', leader: null, timeFinish: null, playedRounds: 0, roundLeaders: [], ranking: [], clients: []}})
}
    

module.exports = { updateRoom, createClient, deleteClient, newLeader, isRoomPlaying, startRoom, getLeader, setWord, getWord, pauseRoom, updateRanking, dropRooms, dropClients, endRoom }
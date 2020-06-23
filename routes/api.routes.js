const express = require('express')
const router = express.Router()
const RoomModel = require('../models/Room.model')

router.get('/rooms', (req, res) => {
    RoomModel.find()
        .then( rooms => {
            res.send( rooms )
        })

})
router.get('/room/:roomName', (req, res) => {
    RoomModel.findOne({name: req.params.roomName})
        .populate('clients')
        .populate('leader')
        .then( room => {
            console.log('searching for......', room)
            res.send( room )
        })
})

module.exports = router
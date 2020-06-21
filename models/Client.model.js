const { Schema, model } = require('mongoose')

const clientSchema = new Schema(
    {
    name: {
        type: String,
        required: true,
        unique: true
    },
    socket: String
    },
    {
        timestamps: true
    })

module.exports = model('Client', clientSchema)
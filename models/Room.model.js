const { Schema, model } = require('mongoose')

const roomSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        isPlaying: {
            type: Boolean,
            default: false
        },
        leader: {
            type: Schema.Types.ObjectId,
            ref: 'Client'
        },
        word: {
            type: String,
            default: ''
        },
        clients: [{
            type: Schema.Types.ObjectId,
            ref: 'Client'
        }]
    },
    {
        timestamps: true
    }
)

module.exports = model('Room', roomSchema)
const { Schema, model } = require('mongoose')

const roomSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        leader: {
            type: Schema.Types.ObjectId,
            ref: 'Client'
        },
        isPlaying: {
            type: Boolean,
            default: false
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
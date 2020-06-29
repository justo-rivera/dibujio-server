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
        }],
        totalRounds: {
            type: Number,
            default: 3
        },
        playedRounds: {
            type: Number,
            default: 0
        },
        roundLeaders: [{
            type: Schema.Types.ObjectId,
            ref: 'Client'
        }],
        roundSeconds: {
            type: Number,
            default: 80
        },
        timeFinish: {
            type: Date,
            default: null
        },
        ranking: [{
            client: {
                type: Schema.Types.ObjectId,
                ref: 'Client'
            },
            points: {
                type: Number,
                default: 0
            }
        }]
    },
    {
        timestamps: true
    }
)

module.exports = model('Room', roomSchema)
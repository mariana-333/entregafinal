const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    invitationId: {
        type: String,
        required: true,
        unique: true
    },
    gameId: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerColor: {
        type: String,
        enum: ['blanca', 'negra'],
        required: true
    },
    invitedEmail: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired'],
        default: 'pending'
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    }
});

// Índice para que las invitaciones expiren automáticamente
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);

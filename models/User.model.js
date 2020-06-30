const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
     name: {
      type: String,
      required: [true, 'Please enter name']
    },
     passwordHash: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);
userSchema.index({ 'name': 1}, {unique: true});
 module.exports = model('User', userSchema);

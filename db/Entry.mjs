import mongoose from 'mongoose';

export default mongoose.model('Entry', {
  _id: String,

  title: String,
  source: String,
  ref: String,

  dlTime: String, // ISO TS
  content: String, // Path
  art: String, // Path

  inactive: {
    type: Boolean,
    default: false,
  },

  status: {
    type: String,
    enum: [
      'preparing',
      'downloading',
      'converting',
      'ready',
    ],
    default: 'preparing',
  }
});

// TODO: multiple versions

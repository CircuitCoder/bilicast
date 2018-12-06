import mongoose from 'mongoose';

export default mongoose.model('Entry', {
  title: String,
  uploader: String,
  category: String,
  source: String,
  ref: String,

  dlTime: String, // ISO TS

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

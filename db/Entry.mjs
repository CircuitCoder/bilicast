import mongoose from 'mongoose';

export default mongoose.model('Entry', {
  title: String,
  subtitle: String,
  uploader: String,
  category: String,

  single: Boolean,

  source: String,
  page: Number,
  ref: String,

  desc: Object, // Backlog
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

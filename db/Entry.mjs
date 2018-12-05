import mongoose from 'mongoose';

export default mongoose.model('Entry', {
  _id: String,

  title: String,
  source: String,

  dlTime: String, // ISO TS
  content: String, // Path
  art: String, // Path

  inactive: {
    type: Boolean,
    default: false,
  },
});

// TODO: multiple versions

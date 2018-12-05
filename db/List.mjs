import mongoose from 'mongoose';

export default mongoose.model('List', {
  _id: String,

  name: String,
  entries: [String],
});

// TODO: types

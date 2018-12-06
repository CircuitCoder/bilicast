import mongoose from 'mongoose';

export default mongoose.model('List', {
  name: String,
  entries: [String],
});

// TODO: types

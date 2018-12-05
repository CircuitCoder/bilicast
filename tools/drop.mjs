import mongoose from 'mongoose';

const dburi = process.env.DBURI || 'mongodb://localhost/bilicast';
mongoose.connect(dburi);

mongoose.connection.dropDatabase().then(() => {
  mongoose.connection.close();
});

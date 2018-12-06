import mongoose from 'mongoose';

const dburi = process.env.DBURI || 'mongodb://localhost/bilicast';
mongoose.connect(dburi, { useNewUrlParser: true });

mongoose.connection.dropDatabase().then(() => {
  mongoose.connection.close();
});

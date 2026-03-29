const express = require('express');
const cors = require('cors');
const usersRouter = require('./routes/users');
const profilesRouter = require('./routes/profiles');
const managerRouter = require('./routes/manager');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server running');
});

app.use('/api/users', usersRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/manager', managerRouter);

module.exports = app;
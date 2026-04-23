const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const profilesRouter = require('./routes/profiles');
const managerRouter = require('./routes/manager');
const aiRouter = require('./routes/ai');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Server running');
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/manager', managerRouter);
app.use('/api/ai', aiRouter);

module.exports = app;
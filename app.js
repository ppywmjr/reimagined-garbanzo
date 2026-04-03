var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Database errors
  if (err.code && err.code.startsWith('PGSQL')) {
    return res.status(500).json({
      success: false,
      error: 'Database error',
    });
  }

  // Validation errors
  if (err.status === 400) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Bad request',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;

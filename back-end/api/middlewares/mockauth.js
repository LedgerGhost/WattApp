module.exports = (req, res, next) => {
  req.user = { id: 1 }; // mock authenticated user
  next();
};

//for testing
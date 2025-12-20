require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 9876;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}!`));
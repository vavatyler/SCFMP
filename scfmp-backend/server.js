require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✔ Database connection established');

    app.listen(PORT, () => {
      console.log(`✔ AgriBridge API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✘ Unable to start server:', err.message);
    process.exit(1);
  }
};

start();

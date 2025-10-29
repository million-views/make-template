module.exports = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/complex_test_app',
    dialect: 'postgres'
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    ssl: true
  }
};
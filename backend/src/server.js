const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Verificadora API corriendo en puerto ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

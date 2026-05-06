require('dotenv').config();

const express = require('express');

const warehousesRouter = require('./routes/warehouses');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/warehouses', warehousesRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
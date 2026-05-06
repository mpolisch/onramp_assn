require('dotenv').config();

const express = require('express');

const warehousesRouter = require('./routes/warehouses');
const partsRouter = require('./routes/parts')
const locationsRouter = require('./routes/locations');
const inventoryRouter = require('./routes/inventory');
const auditRouter = require('./routes/audit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/warehouses', warehousesRouter);
app.use('/parts', partsRouter)
app.use('/locations', locationsRouter);
app.use('/inventory', inventoryRouter);
app.use('/audit', auditRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
    const result = await pool.query(
        `SELECT l.*, w.name AS warehouse_name
            FROM locations l
            JOIN warehouses w ON w.id = l.warehouse_id
            ORDER BY l.created_at DESC`
    );
    res.json(result.rows);
});

router.post('/', async (req, res) => {
    const name = req.body.name?.toLowerCase().trim();
    const warehouse_id = parseInt(req.body.warehouse_id);

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    if (isNaN(warehouse_id)) {
        return res.status(400).json({ error: 'warehouse_id is required and must be an integer'});
    }

    const warehouse = await pool.query('SELECT id FROM warehouses WHERE id = $1', [warehouse_id]);
    if (!warehouse.rows[0]) {
        return res.status(404).json({ error: 'Warehouse not found'});
    }

    
    const result = await pool.query(
        `INSERT INTO locations (warehouse_id, name) VALUES ($1, $2) RETURNING *`,
        [warehouse_id, name],
    );
 

    res.status(201).json(result.rows[0]); 
});

module.exports = router;
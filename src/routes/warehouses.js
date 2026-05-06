const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
    const result = await pool.query(
        `SELECT * FROM warehouses ORDER BY created_at DESC`
    );
    res.json(result.rows);
});

router.post('/', async (req, res) => {
    const name = req.body.name?.toLowerCase().trim();

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
        `INSERT INTO warehouses (name) VALUES ($1) RETURNING *`,
        [name],
    );
    
    res.status(201).json(result.rows[0]); 
});

module.exports = router;
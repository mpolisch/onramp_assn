const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
    const result = await pool.query(
        `SELECT * FROM parts ORDER BY created_at DESC`
    );
    res.json(result.rows);
});

router.post('/', async (req, res) => {
    const { part_number, name, description, cost } = req.body;

    if (!name || !part_number) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
        `INSERT INTO parts (part_number, name, description, cost) VALUES ($1, $2, $3, $4) RETURNING *`,
        [part_number.toLowerCase().trim(), name.trim(), description, cost],
    );
    
    res.status(201).json(result.rows[0]); 
});

module.exports = router;
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
    const { description, cost } = req.body;
    // Normalize part_number to prevent duplicate entries with different casing
    const part_number = req.body.part_number?.toLowerCase().trim();
    const name = req.body.name?.trim();

    if (!name || !part_number) {
        return res.status(400).json({ error: 'Name and part number are required' });
    }

    if (cost !== undefined && cost < 0) {
        return res.status(400).json({ error: 'Cost must be a positive number'});
    }
    
    const result = await pool.query(
        `INSERT INTO parts (part_number, name, description, cost) VALUES ($1, $2, $3, $4) RETURNING *`,
        [part_number.toLowerCase().trim(), name, description, cost],
    );
    
    res.status(201).json(result.rows[0]); 
});

module.exports = router;
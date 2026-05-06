const { Router } = require('express');
const pool = require('../db');
const router = Router();

router.get('/', async (req, res) => {
    const part_id = req.query.part_id ? parseInt(req.query.part_id) : null;

    if (req.query.part_id && isNaN(part_id)) {
        return res.status(400).json({ error: 'part_id must be an integer' });
    }

    const result = part_id
        ? await pool.query(
            `SELECT * FROM audit_log WHERE part_id = $1 ORDER BY created_at DESC`,
            [part_id]
          )
        : await pool.query(
            `SELECT * FROM audit_log ORDER BY created_at DESC`
          );

    res.json(result.rows);
});

module.exports = router;
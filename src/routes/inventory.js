const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
    const result = await pool.query(`SELECT * FROM inventory_overall`);
    res.json(result.rows);
});

router.get('/by-location', async (req, res) => {
    const result = await pool.query(`SELECT * FROM inventory_by_location`);
    res.json(result.rows);
});

router.post('/adjust', async (req, res) => {
    const { reason, created_by } = req.body;
    const part_id = parseInt(req.body.part_id);
    const location_id = parseInt(req.body.location_id);
    const delta = parseInt(req.body.delta);

    if (isNaN(part_id) || isNaN(location_id) || !delta) {
        return res.status(400).json({ error: 'part_id, location_id, and delta are required and must be integers' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const upsert = await client.query(
            `INSERT INTO inventory (part_id, location_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (part_id, location_id)
             DO UPDATE SET quantity = inventory.quantity + $3
             RETURNING quantity`,
             [part_id, location_id, delta]
        );

        const quantity_after = upsert.rows[0].quantity;
        const quantity_before = quantity_after - delta;

        await client.query(
            `INSERT INTO audit_log
             (part_id, location_id, delta, quantity_before, quantity_after, action_type, reason, created_by)
             VALUES ($1, $2, $3, $4, $5, 'adjustment', $6, $7)`,
             [part_id, location_id, delta, quantity_before, quantity_after, reason, created_by]
        );

        await client.query('COMMIT');
        res.status(201).json({ part_id, location_id, delta, quantity_after });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

});

router.post('/move', async (req, res) => {
    const { reason, created_by } = req.body;
    const part_id = parseInt(req.body.part_id);
    const from_location_id = parseInt(req.body.from_location_id);
    const to_location_id = parseInt(req.body.to_location_id);
    const quantity = parseInt(req.body.quantity);

    if (isNaN(part_id) || isNaN(from_location_id) || isNaN(to_location_id) || isNaN(quantity)) {
        return res.status(400).json({ error: 'part_id, from_location_id, to_location_id, and quantity must be integers' });
    }

    if (quantity <= 0) {
        return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    if (from_location_id === to_location_id) {
        return res.status(400).json({ error: 'Source and destination locations must be different'});
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if source has enough quantity
        const source = await client.query(
            `SELECT quantity FROM inventory
            WHERE part_id = $1 AND location_id = $2`,
            [part_id, from_location_id]
        );

        if (!source.rows[0]) {
            const err = new Error('No inventory found at source location');
            err.status = 404;
            throw err;
        }

        if (source.rows[0].quantity < quantity) {
            const err = new Error('Insufficient quantity at source location');
            err.status = 400;
            throw err;
        }

        // Deduct amount from source
        const sourceUpdate = await client.query(
            `UPDATE inventory SET quantity = quantity - $1
             WHERE part_id = $2 AND location_id = $3
             RETURNING quantity`,
             [quantity, part_id, from_location_id]
        );

        // Add to the destination
        const destUpdate = await client.query(
            `INSERT INTO inventory (part_id, location_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (part_id, location_id)
             DO UPDATE SET quantity = inventory.quantity + $3
             RETURNING quantity`,
             [part_id, to_location_id, quantity]
        );

        // Generate shared transfer_id to link the two audit log entries
        const transferResult = await client.query('SELECT gen_random_uuid() AS id');
        const transfer_id = transferResult.rows[0].id;

        // Audit log: source (negative delta)
        await client.query(
            `INSERT INTO audit_log
             (part_id, location_id, delta, quantity_before, quantity_after, action_type, transfer_id, reason, created_by)
             VALUES ($1, $2, $3, $4, $5, 'move', $6, $7, $8)`,
            [
                part_id,
                from_location_id,
                -quantity,
                source.rows[0].quantity,
                sourceUpdate.rows[0].quantity,
                transfer_id,
                reason,
                created_by
            ]
        );

        // Audit log: destination (positive delta)
        await client.query(
            `INSERT INTO audit_log
             (part_id, location_id, delta, quantity_before, quantity_after, action_type, transfer_id, reason, created_by)
             VALUES ($1, $2, $3, $4, $5, 'move', $6, $7, $8)`,
            [
                part_id,
                to_location_id,
                quantity,
                destUpdate.rows[0].quantity - quantity,
                destUpdate.rows[0].quantity,
                transfer_id,
                reason,
                created_by
            ]
        );

        await client.query('COMMIT');
        res.status(201).json({
            transfer_id,
            part_id,
            from_location_id,
            to_location_id,
            quantity
        });

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

});

module.exports = router;
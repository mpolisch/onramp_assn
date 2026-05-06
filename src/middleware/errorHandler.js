const errorHandler = (err, req, res, next) => {
    console.error(err.message);

    // pg: UNIQUE constraint error code
    if (err.code === '23505') {
        return res.status(409).json({ error: 'A record with that value already exists'});
    }

    if (err.code === '23514') {
        return res.status(400).json({error: 'A value was set as negative'});
    }

    res.status(err.status || 500).json({ error: 'An internal server error occurred' });
};

module.exports = errorHandler
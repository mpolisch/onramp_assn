const errorHandler = (err, req, res, next) => {
    console.error(err.message);

    // pg: UNIQUE constraint error code
    if (err.code === '23505') {
        return res.status(409).json({ error: 'A record with that value already exists'});
    }
    
    const status = err.status || 500;
    res.status(status).json({ error: status === 500 ? 'An internal server error occurred' : err.message });
};

module.exports = errorHandler
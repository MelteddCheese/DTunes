const errorHandler = (err, req, res, next) => {
    if (err.status) {
        res.status(err.status).send(err.message);
    }
    else {
        res.status(404).send("Error !");
    }
}

module.exports = errorHandler;
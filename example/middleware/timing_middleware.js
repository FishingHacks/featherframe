module.exports = async (req, res, next) => {
    res.set({
        "incoming-time": Date.now()
    })
    await next();
}
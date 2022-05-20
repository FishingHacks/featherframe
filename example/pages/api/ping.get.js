module.exports = (req, res) => {
    res.json({
        success: true,
        time: Date.now()
    });
}
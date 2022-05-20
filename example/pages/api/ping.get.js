module.exports = (req, res) => {
    console.log("ping")
    res.json({
        success: true,
        time: Date.now()
    });
}
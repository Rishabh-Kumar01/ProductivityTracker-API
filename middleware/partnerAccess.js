const partnerAccess = (req, res, next) => {
    // For partner sessions: resolve the target user ID
    if (req.user.role === 'partner') {
        req.targetUserId = req.user.linkedUserId;
    } else {
        req.targetUserId = req.user.id;
    }
    next();
};

const ownerOnly = (req, res, next) => {
    if (req.user.role === 'partner') {
        return res.status(403).json({
            status: 'forbidden',
            message: 'This feature is only available to the account owner'
        });
    }
    next();
};

module.exports = { partnerAccess, ownerOnly };

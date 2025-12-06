const User = require('../models/User');

// Get Dashboard Stats
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const tierStats = await User.aggregate([
            { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } }
        ]);

        const recentUsers = await User.find(
            {},
            { name: 1, email: 1, subscriptionTier: 1, createdAt: 1, role: 1 }
        )
            .sort({ createdAt: -1 })
            .limit(5);

        // Simple revenue estimation (mock calculation based on tiers)
        // In reality, you'd pull this from Stripe/Razorpay or a Transaction model
        const revenueMap = {
            'free': 0,
            'monthly': 9.99,
            'quarterly': 24.99,
            'biannual': 45.99,
            'annual': 89.99
        };

        let estimatedMRR = 0;
        const allUsers = await User.find({}, { subscriptionTier: 1 });
        allUsers.forEach(u => {
            estimatedMRR += revenueMap[u.subscriptionTier] || 0;
        });

        res.json({
            totalUsers,
            tierStats: tierStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            recentUsers,
            estimatedMRR: Math.round(estimatedMRR * 100) / 100,
            activeSubscriptions: allUsers.filter(u => u.subscriptionTier !== 'free').length
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

// Get All Users (Paginated)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const users = await User.find({}, '-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalUsers: total
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Delete User
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Promote to Admin (Optional helper)
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

module.exports = {
    getStats,
    getAllUsers,
    deleteUser,
    updateUserRole
};

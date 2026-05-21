const express = require('express');
const cors = require('cors');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

const sequelize = require('./config/database');


const app = express();
const authRoutes = require('./routes/authRoute');
const accountRoutes = require('./routes/accountRoute');
const transferRoutes = require('./routes/transferRoute');

app.use(express.json());
app.use(cors());

const logger = (req, res, next) => {
    console.log("Request received at", new Date().toLocaleString());
    next();
};

app.use(logger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', accountRoutes);

app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL successfully.');
        
        // 2. USE ALTER TO PATCH THE MISSING AUTO-INCREMENT SEQUENCE IN THE DB
        await sequelize.sync({ alter: true });
        console.log('🔄 Database synced & sequence tables updated!');
        
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    } catch (err) {
        console.error('❌ Unable to connect to database:', err);
    }
});
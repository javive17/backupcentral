const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM settings ORDER BY setting_key');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

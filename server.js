
// server.js
import express from 'express';
import dotenv from 'dotenv';
import { body, query, validationResult } from 'express-validator';
import pool from './database.js';

dotenv.config();

const app = express();
app.use(express.json());

// --- API Endpoints ---

/**
 * API to add a new school
 * Endpoint: /addSchool
 * Method: POST
 */
app.post('/addSchool',
  [
    body('name').notEmpty().withMessage('Name is required.'),
    body('address').notEmpty().withMessage('Address is required.'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required.'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, latitude, longitude } = req.body;
    
    const sql = 'INSERT INTO schools (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id';

    try {
      
      const { rows } = await pool.query(sql, [name, address, latitude, longitude]);
      res.status(201).json({
        message: 'School added successfully!',
        schoolId: rows[0].id 
      });
    } catch (error) {
      console.error('Database Error:', error);
      res.status(500).json({ error: 'Failed to add school to the database.' });
    }
  }
);

/**
 * API to list schools sorted by proximity
 * Endpoint: /listSchools
 * Method: GET
 */
app.get('/listSchools',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid user latitude (lat) is required.'),
    query('lon').isFloat({ min: -180, max: 180 }).withMessage('Valid user longitude (lon) is required.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lon } = req.query;

    
    const sql = `
      SELECT id, name, address, latitude, longitude,
        ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians($2) ) + sin( radians($3) ) * sin( radians( latitude ) ) ) ) AS distance
      FROM schools
      ORDER BY distance ASC;
    `;

    try {
      
      const { rows: schools } = await pool.query(sql, [lat, lon, lat]);
      res.status(200).json(schools);
    } catch (error) {
      console.error('Database Error:', error);
      res.status(500).json({ error: 'Failed to retrieve schools.' });
    }
  }
);

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
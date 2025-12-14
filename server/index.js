import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM players WHERE club_id = c.id) as player_count,
        (SELECT COUNT(*) FROM staff WHERE club_id = c.id) as staff_count
      FROM clubs c
      ORDER BY c.reputation DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

app.get('/api/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clubs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, position, club_id, min_ca, max_ca, min_age, max_age, sort_by = 'current_ability', sort_order = 'desc' } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const filterParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (LOWER(p.first_name) LIKE LOWER($${paramIndex}) OR LOWER(p.last_name) LIKE LOWER($${paramIndex}))`;
      filterParams.push(`%${search}%`);
      paramIndex++;
    }

    if (position) {
      whereClause += ` AND p.primary_position = $${paramIndex}`;
      filterParams.push(position);
      paramIndex++;
    }

    if (club_id) {
      whereClause += ` AND p.club_id = $${paramIndex}`;
      filterParams.push(parseInt(club_id));
      paramIndex++;
    }

    if (min_ca) {
      whereClause += ` AND p.current_ability >= $${paramIndex}`;
      filterParams.push(parseInt(min_ca));
      paramIndex++;
    }

    if (max_ca) {
      whereClause += ` AND p.current_ability <= $${paramIndex}`;
      filterParams.push(parseInt(max_ca));
      paramIndex++;
    }

    if (min_age) {
      whereClause += ` AND p.age >= $${paramIndex}`;
      filterParams.push(parseInt(min_age));
      paramIndex++;
    }

    if (max_age) {
      whereClause += ` AND p.age <= $${paramIndex}`;
      filterParams.push(parseInt(max_age));
      paramIndex++;
    }

    const validSortColumns = ['current_ability', 'potential_ability', 'age', 'value', 'wage', 'first_name', 'last_name'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'current_ability';
    const order = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    const dataQuery = `
      SELECT p.*, c.name as club_name, c.short_name as club_short_name
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      ${whereClause}
      ORDER BY p.${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataParams = [...filterParams, parseInt(limit), parseInt(offset)];

    const countQuery = `SELECT COUNT(*) FROM players p ${whereClause}`;
    
    const [result, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, filterParams)
    ]);
    
    res.json({
      players: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.get('/api/players/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, c.name as club_name, c.short_name as club_short_name
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

app.get('/api/staff', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, role, club_id, sort_by = 'current_ability', sort_order = 'desc' } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const filterParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (LOWER(s.first_name) LIKE LOWER($${paramIndex}) OR LOWER(s.last_name) LIKE LOWER($${paramIndex}))`;
      filterParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND s.role = $${paramIndex}`;
      filterParams.push(role);
      paramIndex++;
    }

    if (club_id) {
      whereClause += ` AND s.club_id = $${paramIndex}`;
      filterParams.push(parseInt(club_id));
      paramIndex++;
    }

    const validSortColumns = ['current_ability', 'age', 'wage', 'first_name', 'last_name'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'current_ability';
    const order = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    const dataQuery = `
      SELECT s.*, c.name as club_name, c.short_name as club_short_name
      FROM staff s
      LEFT JOIN clubs c ON s.club_id = c.id
      ${whereClause}
      ORDER BY s.${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataParams = [...filterParams, parseInt(limit), parseInt(offset)];

    const countQuery = `SELECT COUNT(*) FROM staff s ${whereClause}`;
    
    const [result, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, filterParams)
    ]);
    
    res.json({
      staff: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

app.get('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT s.*, c.name as club_name, c.short_name as club_short_name
      FROM staff s
      LEFT JOIN clubs c ON s.club_id = c.id
      WHERE s.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const clubs = await pool.query('SELECT COUNT(*) FROM clubs');
    const players = await pool.query('SELECT COUNT(*) FROM players');
    const staff = await pool.query('SELECT COUNT(*) FROM staff');
    const avgCA = await pool.query('SELECT AVG(current_ability)::int as avg FROM players');
    const topPlayers = await pool.query(`
      SELECT p.first_name, p.last_name, p.current_ability, p.potential_ability, p.primary_position, c.short_name as club
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      ORDER BY p.current_ability DESC
      LIMIT 5
    `);
    
    res.json({
      clubs: parseInt(clubs.rows[0].count),
      players: parseInt(players.rows[0].count),
      staff: parseInt(staff.rows[0].count),
      averageAbility: avgCA.rows[0].avg || 0,
      topPlayers: topPlayers.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT primary_position, COUNT(*) as count 
      FROM players 
      GROUP BY primary_position 
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

app.get('/api/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM staff 
      GROUP BY role 
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
});

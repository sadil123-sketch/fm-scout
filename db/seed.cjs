const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// English first names
const firstNames = [
  'Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Charlie', 'Thomas', 'Oscar', 'William', 'James',
  'Henry', 'Alexander', 'Leo', 'Alfie', 'Joshua', 'Noah', 'Ethan', 'Archie', 'Daniel', 'Max',
  'Lucas', 'Freddie', 'Isaac', 'Edward', 'Samuel', 'Joseph', 'Benjamin', 'Sebastian', 'Theo', 'Adam',
  'Ryan', 'Luke', 'Nathan', 'Connor', 'Kyle', 'Jordan', 'Jamie', 'Aaron', 'Callum', 'Scott',
  'Marcus', 'Tyler', 'Brandon', 'Lewis', 'Declan', 'Reece', 'Bradley', 'Harvey', 'Ellis', 'Rhys',
  'Dylan', 'Mason', 'Logan', 'Jayden', 'Cody', 'Evan', 'Cameron', 'Liam', 'Matthew', 'Michael',
  'David', 'Andrew', 'Robert', 'Paul', 'John', 'Stephen', 'Gary', 'Mark', 'Peter', 'Richard',
  'Simon', 'Christopher', 'Anthony', 'Stuart', 'Philip', 'Kevin', 'Neil', 'Craig', 'Wayne', 'Dean',
  'Finley', 'Toby', 'Harrison', 'Zachary', 'Reuben', 'Jude', 'Arthur', 'Stanley', 'Louie', 'Felix',
  'Hugo', 'Elliot', 'Jasper', 'Ollie', 'Frankie', 'Reggie', 'Teddy', 'Blake', 'Dexter', 'Louis'
];

// English last names
const lastNames = [
  'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Johnson',
  'Roberts', 'Robinson', 'Thompson', 'Wright', 'Walker', 'White', 'Edwards', 'Hughes', 'Green', 'Hall',
  'Lewis', 'Harris', 'Clarke', 'Patel', 'Jackson', 'Wood', 'Turner', 'Martin', 'Cooper', 'Hill',
  'Ward', 'Morris', 'Moore', 'Clark', 'Lee', 'King', 'Baker', 'Harrison', 'Morgan', 'Allen',
  'James', 'Scott', 'Ellis', 'Bennett', 'Gray', 'Collins', 'Cox', 'Richardson', 'Russell', 'Shaw',
  'Watson', 'Brooks', 'Kelly', 'Butler', 'Barnes', 'Fisher', 'Marshall', 'Mason', 'Hunt', 'Simpson',
  'Graham', 'Henderson', 'Powell', 'Young', 'Price', 'Mitchell', 'Howard', 'Murphy', 'Carter', 'Phillips',
  'Barker', 'Palmer', 'Cole', 'Chapman', 'Mills', 'Spencer', 'West', 'Reed', 'Bell', 'Stone',
  'Andrews', 'Walsh', 'Burton', 'Stanley', 'Foster', 'Dixon', 'Arnold', 'Fox', 'Holmes', 'Jenkins',
  'Perry', 'Stevens', 'Knight', 'Harvey', 'Reynolds', 'Gibson', 'Murray', 'Rose', 'Austin', 'Gardner'
];

// English clubs data
const clubs = [
  { name: 'Manchester City', short_name: 'Man City', league: 'Premier League', reputation: 195, balance: 150000000, wage_budget: 4500000, transfer_budget: 200000000, training: 20, youth: 20, recruitment: 20, stadium: 'Etihad Stadium', capacity: 53400, primary: '#6CABDD', secondary: '#1C2C5B' },
  { name: 'Liverpool', short_name: 'Liverpool', league: 'Premier League', reputation: 193, balance: 100000000, wage_budget: 4200000, transfer_budget: 150000000, training: 20, youth: 19, recruitment: 19, stadium: 'Anfield', capacity: 61276, primary: '#C8102E', secondary: '#F6EB61' },
  { name: 'Arsenal', short_name: 'Arsenal', league: 'Premier League', reputation: 188, balance: 80000000, wage_budget: 3800000, transfer_budget: 120000000, training: 19, youth: 18, recruitment: 18, stadium: 'Emirates Stadium', capacity: 60704, primary: '#EF0107', secondary: '#FFFFFF' },
  { name: 'Chelsea', short_name: 'Chelsea', league: 'Premier League', reputation: 185, balance: 60000000, wage_budget: 4000000, transfer_budget: 180000000, training: 19, youth: 19, recruitment: 18, stadium: 'Stamford Bridge', capacity: 40853, primary: '#034694', secondary: '#FFFFFF' },
  { name: 'Manchester United', short_name: 'Man Utd', league: 'Premier League', reputation: 190, balance: 70000000, wage_budget: 4300000, transfer_budget: 150000000, training: 18, youth: 20, recruitment: 19, stadium: 'Old Trafford', capacity: 74310, primary: '#DA291C', secondary: '#FBE122' },
  { name: 'Tottenham Hotspur', short_name: 'Spurs', league: 'Premier League', reputation: 180, balance: 50000000, wage_budget: 3200000, transfer_budget: 100000000, training: 18, youth: 17, recruitment: 17, stadium: 'Tottenham Hotspur Stadium', capacity: 62850, primary: '#132257', secondary: '#FFFFFF' },
  { name: 'Newcastle United', short_name: 'Newcastle', league: 'Premier League', reputation: 175, balance: 120000000, wage_budget: 3000000, transfer_budget: 150000000, training: 17, youth: 16, recruitment: 17, stadium: 'St. James\' Park', capacity: 52305, primary: '#241F20', secondary: '#FFFFFF' },
  { name: 'Aston Villa', short_name: 'Villa', league: 'Premier League', reputation: 168, balance: 40000000, wage_budget: 2500000, transfer_budget: 80000000, training: 17, youth: 16, recruitment: 16, stadium: 'Villa Park', capacity: 42657, primary: '#670E36', secondary: '#95BFE5' },
  { name: 'Leeds United', short_name: 'Leeds', league: 'Championship', reputation: 155, balance: 25000000, wage_budget: 1800000, transfer_budget: 40000000, training: 15, youth: 15, recruitment: 15, stadium: 'Elland Road', capacity: 37890, primary: '#FFCD00', secondary: '#1D428A' },
  { name: 'Nottingham Forest', short_name: 'Forest', league: 'Premier League', reputation: 160, balance: 30000000, wage_budget: 2200000, transfer_budget: 60000000, training: 16, youth: 14, recruitment: 15, stadium: 'City Ground', capacity: 30332, primary: '#DD0000', secondary: '#FFFFFF' }
];

// Player positions with weights
const positions = [
  { code: 'GK', weight: 0.08 },
  { code: 'DC', weight: 0.16 },
  { code: 'DL', weight: 0.06 },
  { code: 'DR', weight: 0.06 },
  { code: 'DM', weight: 0.08 },
  { code: 'MC', weight: 0.14 },
  { code: 'ML', weight: 0.06 },
  { code: 'MR', weight: 0.06 },
  { code: 'AMC', weight: 0.08 },
  { code: 'AML', weight: 0.06 },
  { code: 'AMR', weight: 0.06 },
  { code: 'ST', weight: 0.10 }
];

// Staff roles
const staffRoles = [
  { role: 'Assistant Manager', weight: 0.10 },
  { role: 'First Team Coach', weight: 0.15 },
  { role: 'Goalkeeping Coach', weight: 0.08 },
  { role: 'Fitness Coach', weight: 0.10 },
  { role: 'Youth Coach', weight: 0.12 },
  { role: 'Scout', weight: 0.20 },
  { role: 'Physio', weight: 0.10 },
  { role: 'Data Analyst', weight: 0.08 },
  { role: 'Sports Scientist', weight: 0.07 }
];

// Personality types
const personalities = [
  'Model Citizen', 'Perfectionist', 'Professional', 'Resolute', 'Driven', 'Ambitious',
  'Determined', 'Spirited', 'Light-Hearted', 'Fairly Professional', 'Fairly Determined',
  'Fairly Ambitious', 'Fairly Loyal', 'Balanced', 'Casual', 'Low Determination', 'Unambitious'
];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * total;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function generateDateOfBirth(minAge, maxAge) {
  const now = new Date();
  const age = randomInt(minAge, maxAge);
  const birthYear = now.getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateAttribute(base, variance = 5) {
  return Math.max(1, Math.min(20, base + randomInt(-variance, variance)));
}

function calculateValue(ca, age) {
  const baseValue = ca * ca * 500;
  const ageFactor = age < 24 ? 1.5 : age > 30 ? 0.6 : 1.0;
  return Math.round(baseValue * ageFactor);
}

function calculateWage(ca, age) {
  const baseWage = ca * 100;
  const ageFactor = age < 24 ? 0.8 : age > 30 ? 1.2 : 1.0;
  return Math.round(baseWage * ageFactor);
}

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seed...\n');
    
    // Read and execute schema
    console.log('Creating schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema created successfully.\n');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await client.query('TRUNCATE clubs, players, staff RESTART IDENTITY CASCADE');
    
    // Insert clubs
    console.log('Inserting clubs...');
    const clubIds = [];
    for (const club of clubs) {
      const result = await client.query(`
        INSERT INTO clubs (name, short_name, league, reputation, balance, wage_budget, transfer_budget, 
                          training_facilities, youth_facilities, youth_recruitment, stadium_name, 
                          stadium_capacity, primary_color, secondary_color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [club.name, club.short_name, club.league, club.reputation, club.balance, club.wage_budget, 
          club.transfer_budget, club.training, club.youth, club.recruitment, club.stadium, 
          club.capacity, club.primary, club.secondary]);
      clubIds.push(result.rows[0].id);
    }
    console.log(`Inserted ${clubs.length} clubs.\n`);
    
    // Insert players
    console.log('Inserting 500 players...');
    let playerCount = 0;
    
    // Distribute players across clubs (bigger clubs get more/better players)
    const clubDistribution = [80, 70, 60, 55, 70, 50, 40, 35, 20, 20]; // 500 total
    
    for (let clubIndex = 0; clubIndex < clubIds.length; clubIndex++) {
      const clubId = clubIds[clubIndex];
      const numPlayers = clubDistribution[clubIndex];
      const clubRep = clubs[clubIndex].reputation;
      
      for (let i = 0; i < numPlayers; i++) {
        const position = weightedRandom(positions);
        const age = randomInt(17, 36);
        
        // Ability tier based on club reputation and random factor
        let abilityTier;
        const rand = Math.random();
        if (clubRep >= 185) {
          abilityTier = rand < 0.3 ? 'elite' : rand < 0.7 ? 'good' : 'average';
        } else if (clubRep >= 170) {
          abilityTier = rand < 0.15 ? 'elite' : rand < 0.5 ? 'good' : 'average';
        } else if (clubRep >= 155) {
          abilityTier = rand < 0.05 ? 'elite' : rand < 0.3 ? 'good' : rand < 0.7 ? 'average' : 'developing';
        } else {
          abilityTier = rand < 0.1 ? 'good' : rand < 0.4 ? 'average' : rand < 0.8 ? 'developing' : 'youth';
        }
        
        // Young players more likely to be developing
        if (age < 21) {
          abilityTier = rand < 0.2 ? abilityTier : (rand < 0.5 ? 'developing' : 'youth');
        }
        
        // Calculate CA/PA
        const caRanges = { elite: [160, 190], good: [130, 160], average: [100, 130], developing: [70, 100], youth: [40, 70] };
        const [minCa, maxCa] = caRanges[abilityTier];
        const ca = randomInt(minCa, maxCa);
        const pa = age < 24 ? randomInt(ca, Math.min(200, ca + 40)) : randomInt(ca, ca + 10);
        
        const dob = generateDateOfBirth(age, age);
        const contractYears = randomInt(1, 5);
        const contractExpiry = new Date();
        contractExpiry.setFullYear(contractExpiry.getFullYear() + contractYears);
        
        const value = calculateValue(ca, age);
        const wage = calculateWage(ca, age);
        
        // Base attributes based on ability tier
        const baseAttr = { elite: 16, good: 13, average: 10, developing: 7, youth: 5 }[abilityTier];
        const isGK = position.code === 'GK';
        
        await client.query(`
          INSERT INTO players (
            first_name, last_name, nationality, date_of_birth, age, club_id, primary_position,
            position_gk, position_dc, position_dl, position_dr, position_dm, position_mc,
            position_ml, position_mr, position_amc, position_aml, position_amr, position_st,
            wage, contract_expiry, value, asking_price, current_ability, potential_ability,
            corners, crossing, dribbling, finishing, first_touch, free_kicks, heading,
            long_shots, long_throws, marking, passing, penalty_taking, tackling, technique,
            aggression, anticipation, bravery, composure, concentration, decisions, determination,
            flair, leadership, off_the_ball, positioning, teamwork, vision, work_rate,
            acceleration, agility, balance, jumping_reach, natural_fitness, pace, stamina, strength,
            aerial_reach, command_of_area, communication, eccentricity, handling, kicking,
            one_on_ones, punching, reflexes, rushing_out, throwing,
            adaptability, ambition, consistency, controversy, dirtiness, important_matches,
            injury_proneness, loyalty, pressure, professionalism, sportsmanship, temperament, versatility,
            personality, height, weight, preferred_foot
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25,
            $26, $27, $28, $29, $30, $31, $32,
            $33, $34, $35, $36, $37, $38, $39,
            $40, $41, $42, $43, $44, $45, $46,
            $47, $48, $49, $50, $51, $52, $53,
            $54, $55, $56, $57, $58, $59, $60, $61,
            $62, $63, $64, $65, $66, $67,
            $68, $69, $70, $71, $72,
            $73, $74, $75, $76, $77, $78,
            $79, $80, $81, $82, $83, $84, $85,
            $86, $87, $88, $89
          )
        `, [
          randomElement(firstNames), randomElement(lastNames), 'England', dob, age, clubId, position.code,
          isGK ? 20 : 1, position.code === 'DC' ? 20 : randomInt(1, 5), position.code === 'DL' ? 20 : randomInt(1, 5),
          position.code === 'DR' ? 20 : randomInt(1, 5), position.code === 'DM' ? 20 : randomInt(1, 5), position.code === 'MC' ? 20 : randomInt(1, 5),
          position.code === 'ML' ? 20 : randomInt(1, 5), position.code === 'MR' ? 20 : randomInt(1, 5), position.code === 'AMC' ? 20 : randomInt(1, 5),
          position.code === 'AML' ? 20 : randomInt(1, 5), position.code === 'AMR' ? 20 : randomInt(1, 5), position.code === 'ST' ? 20 : randomInt(1, 5),
          wage, contractExpiry.toISOString().split('T')[0], value, Math.round(value * 1.3), ca, pa,
          generateAttribute(baseAttr - 2), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr - 2), generateAttribute(baseAttr),
          generateAttribute(baseAttr - 1), generateAttribute(baseAttr - 4), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr - 2), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr - 1), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr - 2), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          isGK ? generateAttribute(baseAttr + 2) : generateAttribute(5), isGK ? generateAttribute(baseAttr) : generateAttribute(5),
          isGK ? generateAttribute(baseAttr) : generateAttribute(5), isGK ? generateAttribute(baseAttr - 3) : generateAttribute(5),
          isGK ? generateAttribute(baseAttr + 2) : generateAttribute(5), isGK ? generateAttribute(baseAttr) : generateAttribute(5),
          isGK ? generateAttribute(baseAttr + 1) : generateAttribute(5), isGK ? generateAttribute(baseAttr) : generateAttribute(5),
          isGK ? generateAttribute(baseAttr + 2) : generateAttribute(5), isGK ? generateAttribute(baseAttr) : generateAttribute(5),
          isGK ? generateAttribute(baseAttr) : generateAttribute(5),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr - 4),
          generateAttribute(baseAttr - 3), generateAttribute(baseAttr),
          generateAttribute(baseAttr - 3), generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr),
          generateAttribute(baseAttr), generateAttribute(baseAttr), generateAttribute(baseAttr - 2),
          randomElement(personalities), randomInt(165, 200), randomInt(60, 95), Math.random() < 0.85 ? 'Right' : 'Left'
        ]);
        
        playerCount++;
        if (playerCount % 100 === 0) {
          console.log(`  Inserted ${playerCount} players...`);
        }
      }
    }
    console.log(`Inserted ${playerCount} players.\n`);
    
    // Insert staff
    console.log('Inserting 100 staff...');
    let staffCount = 0;
    const staffDistribution = [15, 14, 12, 12, 14, 10, 8, 7, 4, 4]; // 100 total
    
    for (let clubIndex = 0; clubIndex < clubIds.length; clubIndex++) {
      const clubId = clubIds[clubIndex];
      const numStaff = staffDistribution[clubIndex];
      const clubRep = clubs[clubIndex].reputation;
      
      for (let i = 0; i < numStaff; i++) {
        const staffRole = weightedRandom(staffRoles);
        const age = randomInt(30, 65);
        const dob = generateDateOfBirth(age, age);
        
        // Base ability influenced by club reputation
        const baseAbility = clubRep >= 185 ? randomInt(14, 20) : clubRep >= 170 ? randomInt(12, 18) : randomInt(8, 16);
        
        const contractYears = randomInt(1, 4);
        const contractExpiry = new Date();
        contractExpiry.setFullYear(contractExpiry.getFullYear() + contractYears);
        
        const ca = randomInt(80, 180);
        const wage = Math.round(ca * 50);
        
        await client.query(`
          INSERT INTO staff (
            first_name, last_name, nationality, date_of_birth, age, club_id, role,
            wage, contract_expiry, attacking, defending, fitness, mental, tactical, technical,
            working_with_youngsters, adaptability, determination, discipline,
            judging_player_ability, judging_player_potential, level_of_discipline,
            man_management, motivating, physiotherapy, sports_science, data_analysis,
            goalkeeping_coaching, current_ability
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22,
            $23, $24, $25, $26, $27,
            $28, $29
          )
        `, [
          randomElement(firstNames), randomElement(lastNames), 'England', dob, age, clubId, staffRole.role,
          wage, contractExpiry.toISOString().split('T')[0],
          generateAttribute(baseAbility), generateAttribute(baseAbility), generateAttribute(baseAbility),
          generateAttribute(baseAbility), generateAttribute(baseAbility), generateAttribute(baseAbility),
          generateAttribute(baseAbility), generateAttribute(baseAbility - 2), generateAttribute(baseAbility),
          generateAttribute(baseAbility - 1), generateAttribute(baseAbility), generateAttribute(baseAbility),
          generateAttribute(baseAbility - 1), generateAttribute(baseAbility), generateAttribute(baseAbility),
          staffRole.role === 'Physio' ? generateAttribute(baseAbility + 3) : generateAttribute(baseAbility - 3),
          staffRole.role === 'Sports Scientist' ? generateAttribute(baseAbility + 3) : generateAttribute(baseAbility - 3),
          staffRole.role === 'Data Analyst' ? generateAttribute(baseAbility + 3) : generateAttribute(baseAbility - 3),
          staffRole.role === 'Goalkeeping Coach' ? generateAttribute(baseAbility + 3) : generateAttribute(baseAbility - 3),
          ca
        ]);
        
        staffCount++;
      }
    }
    console.log(`Inserted ${staffCount} staff.\n`);
    
    // Verify data
    const clubCount = await client.query('SELECT COUNT(*) FROM clubs');
    const playerTotal = await client.query('SELECT COUNT(*) FROM players');
    const staffTotal = await client.query('SELECT COUNT(*) FROM staff');
    
    console.log('=== Seed Complete ===');
    console.log(`Clubs: ${clubCount.rows[0].count}`);
    console.log(`Players: ${playerTotal.rows[0].count}`);
    console.log(`Staff: ${staffTotal.rows[0].count}`);
    
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);

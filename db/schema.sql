-- FM Genie Scout Database Schema

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20) NOT NULL,
    nation VARCHAR(50) DEFAULT 'England',
    league VARCHAR(100) NOT NULL,
    reputation INTEGER CHECK (reputation >= 1 AND reputation <= 200),
    balance BIGINT,
    wage_budget BIGINT,
    transfer_budget BIGINT,
    training_facilities INTEGER CHECK (training_facilities >= 1 AND training_facilities <= 20),
    youth_facilities INTEGER CHECK (youth_facilities >= 1 AND youth_facilities <= 20),
    youth_recruitment INTEGER CHECK (youth_recruitment >= 1 AND youth_recruitment <= 20),
    stadium_name VARCHAR(100),
    stadium_capacity INTEGER,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    common_name VARCHAR(100),
    nationality VARCHAR(50) DEFAULT 'England',
    secondary_nationality VARCHAR(50),
    date_of_birth DATE NOT NULL,
    age INTEGER,
    club_id INTEGER REFERENCES clubs(id),
    
    -- Positions (1-20 scale for natural/accomplished/competent)
    position_gk INTEGER DEFAULT 1,
    position_dc INTEGER DEFAULT 1,
    position_dl INTEGER DEFAULT 1,
    position_dr INTEGER DEFAULT 1,
    position_dm INTEGER DEFAULT 1,
    position_mc INTEGER DEFAULT 1,
    position_ml INTEGER DEFAULT 1,
    position_mr INTEGER DEFAULT 1,
    position_amc INTEGER DEFAULT 1,
    position_aml INTEGER DEFAULT 1,
    position_amr INTEGER DEFAULT 1,
    position_st INTEGER DEFAULT 1,
    primary_position VARCHAR(10) NOT NULL,
    
    -- Contract info
    wage INTEGER,
    contract_expiry DATE,
    value BIGINT,
    asking_price BIGINT,
    
    -- Ability ratings (1-200 scale)
    current_ability INTEGER CHECK (current_ability >= 1 AND current_ability <= 200),
    potential_ability INTEGER CHECK (potential_ability >= 1 AND potential_ability <= 200),
    
    -- Technical attributes (1-20)
    corners INTEGER CHECK (corners >= 1 AND corners <= 20),
    crossing INTEGER CHECK (crossing >= 1 AND crossing <= 20),
    dribbling INTEGER CHECK (dribbling >= 1 AND dribbling <= 20),
    finishing INTEGER CHECK (finishing >= 1 AND finishing <= 20),
    first_touch INTEGER CHECK (first_touch >= 1 AND first_touch <= 20),
    free_kicks INTEGER CHECK (free_kicks >= 1 AND free_kicks <= 20),
    heading INTEGER CHECK (heading >= 1 AND heading <= 20),
    long_shots INTEGER CHECK (long_shots >= 1 AND long_shots <= 20),
    long_throws INTEGER CHECK (long_throws >= 1 AND long_throws <= 20),
    marking INTEGER CHECK (marking >= 1 AND marking <= 20),
    passing INTEGER CHECK (passing >= 1 AND passing <= 20),
    penalty_taking INTEGER CHECK (penalty_taking >= 1 AND penalty_taking <= 20),
    tackling INTEGER CHECK (tackling >= 1 AND tackling <= 20),
    technique INTEGER CHECK (technique >= 1 AND technique <= 20),
    
    -- Mental attributes (1-20)
    aggression INTEGER CHECK (aggression >= 1 AND aggression <= 20),
    anticipation INTEGER CHECK (anticipation >= 1 AND anticipation <= 20),
    bravery INTEGER CHECK (bravery >= 1 AND bravery <= 20),
    composure INTEGER CHECK (composure >= 1 AND composure <= 20),
    concentration INTEGER CHECK (concentration >= 1 AND concentration <= 20),
    decisions INTEGER CHECK (decisions >= 1 AND decisions <= 20),
    determination INTEGER CHECK (determination >= 1 AND determination <= 20),
    flair INTEGER CHECK (flair >= 1 AND flair <= 20),
    leadership INTEGER CHECK (leadership >= 1 AND leadership <= 20),
    off_the_ball INTEGER CHECK (off_the_ball >= 1 AND off_the_ball <= 20),
    positioning INTEGER CHECK (positioning >= 1 AND positioning <= 20),
    teamwork INTEGER CHECK (teamwork >= 1 AND teamwork <= 20),
    vision INTEGER CHECK (vision >= 1 AND vision <= 20),
    work_rate INTEGER CHECK (work_rate >= 1 AND work_rate <= 20),
    
    -- Physical attributes (1-20)
    acceleration INTEGER CHECK (acceleration >= 1 AND acceleration <= 20),
    agility INTEGER CHECK (agility >= 1 AND agility <= 20),
    balance INTEGER CHECK (balance >= 1 AND balance <= 20),
    jumping_reach INTEGER CHECK (jumping_reach >= 1 AND jumping_reach <= 20),
    natural_fitness INTEGER CHECK (natural_fitness >= 1 AND natural_fitness <= 20),
    pace INTEGER CHECK (pace >= 1 AND pace <= 20),
    stamina INTEGER CHECK (stamina >= 1 AND stamina <= 20),
    strength INTEGER CHECK (strength >= 1 AND strength <= 20),
    
    -- Goalkeeper attributes (1-20)
    aerial_reach INTEGER CHECK (aerial_reach >= 1 AND aerial_reach <= 20),
    command_of_area INTEGER CHECK (command_of_area >= 1 AND command_of_area <= 20),
    communication INTEGER CHECK (communication >= 1 AND communication <= 20),
    eccentricity INTEGER CHECK (eccentricity >= 1 AND eccentricity <= 20),
    handling INTEGER CHECK (handling >= 1 AND handling <= 20),
    kicking INTEGER CHECK (kicking >= 1 AND kicking <= 20),
    one_on_ones INTEGER CHECK (one_on_ones >= 1 AND one_on_ones <= 20),
    punching INTEGER CHECK (punching >= 1 AND punching <= 20),
    reflexes INTEGER CHECK (reflexes >= 1 AND reflexes <= 20),
    rushing_out INTEGER CHECK (rushing_out >= 1 AND rushing_out <= 20),
    throwing INTEGER CHECK (throwing >= 1 AND throwing <= 20),
    
    -- Hidden attributes (1-20)
    adaptability INTEGER CHECK (adaptability >= 1 AND adaptability <= 20),
    ambition INTEGER CHECK (ambition >= 1 AND ambition <= 20),
    consistency INTEGER CHECK (consistency >= 1 AND consistency <= 20),
    controversy INTEGER CHECK (controversy >= 1 AND controversy <= 20),
    dirtiness INTEGER CHECK (dirtiness >= 1 AND dirtiness <= 20),
    important_matches INTEGER CHECK (important_matches >= 1 AND important_matches <= 20),
    injury_proneness INTEGER CHECK (injury_proneness >= 1 AND injury_proneness <= 20),
    loyalty INTEGER CHECK (loyalty >= 1 AND loyalty <= 20),
    pressure INTEGER CHECK (pressure >= 1 AND pressure <= 20),
    professionalism INTEGER CHECK (professionalism >= 1 AND professionalism <= 20),
    sportsmanship INTEGER CHECK (sportsmanship >= 1 AND sportsmanship <= 20),
    temperament INTEGER CHECK (temperament >= 1 AND temperament <= 20),
    versatility INTEGER CHECK (versatility >= 1 AND versatility <= 20),
    
    -- Personality
    personality VARCHAR(50),
    media_handling VARCHAR(50),
    
    -- Other info
    height INTEGER,
    weight INTEGER,
    preferred_foot VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    nationality VARCHAR(50) DEFAULT 'England',
    date_of_birth DATE NOT NULL,
    age INTEGER,
    club_id INTEGER REFERENCES clubs(id),
    
    -- Role
    role VARCHAR(50) NOT NULL,
    
    -- Contract
    wage INTEGER,
    contract_expiry DATE,
    
    -- Coaching attributes (1-20)
    attacking INTEGER CHECK (attacking >= 1 AND attacking <= 20),
    defending INTEGER CHECK (defending >= 1 AND defending <= 20),
    fitness INTEGER CHECK (fitness >= 1 AND fitness <= 20),
    mental INTEGER CHECK (mental >= 1 AND mental <= 20),
    tactical INTEGER CHECK (tactical >= 1 AND tactical <= 20),
    technical INTEGER CHECK (technical >= 1 AND technical <= 20),
    working_with_youngsters INTEGER CHECK (working_with_youngsters >= 1 AND working_with_youngsters <= 20),
    
    -- Staff attributes (1-20)
    adaptability INTEGER CHECK (adaptability >= 1 AND adaptability <= 20),
    determination INTEGER CHECK (determination >= 1 AND determination <= 20),
    discipline INTEGER CHECK (discipline >= 1 AND discipline <= 20),
    judging_player_ability INTEGER CHECK (judging_player_ability >= 1 AND judging_player_ability <= 20),
    judging_player_potential INTEGER CHECK (judging_player_potential >= 1 AND judging_player_potential <= 20),
    level_of_discipline INTEGER CHECK (level_of_discipline >= 1 AND level_of_discipline <= 20),
    man_management INTEGER CHECK (man_management >= 1 AND man_management <= 20),
    motivating INTEGER CHECK (motivating >= 1 AND motivating <= 20),
    physiotherapy INTEGER CHECK (physiotherapy >= 1 AND physiotherapy <= 20),
    sports_science INTEGER CHECK (sports_science >= 1 AND sports_science <= 20),
    data_analysis INTEGER CHECK (data_analysis >= 1 AND data_analysis <= 20),
    goalkeeping_coaching INTEGER CHECK (goalkeeping_coaching >= 1 AND goalkeeping_coaching <= 20),
    
    -- Overall rating
    current_ability INTEGER CHECK (current_ability >= 1 AND current_ability <= 200),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(primary_position);
CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality);
CREATE INDEX IF NOT EXISTS idx_players_ca ON players(current_ability);
CREATE INDEX IF NOT EXISTS idx_players_pa ON players(potential_ability);
CREATE INDEX IF NOT EXISTS idx_staff_club ON staff(club_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

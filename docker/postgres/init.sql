-- Initial database setup for Nelya
-- This script will be executed when the postgres container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- You can add custom initialization SQL here if needed.
-- Note: Sequelize will sync models automatically in development mode.

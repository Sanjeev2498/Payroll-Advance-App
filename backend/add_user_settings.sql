-- Add settings column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT NULL;

-- Create index for settings column for better performance
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING gin (settings);
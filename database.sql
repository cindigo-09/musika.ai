-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  song_id UUID,
  song_title VARCHAR(255),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create listening_history table
CREATE TABLE IF NOT EXISTS listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  genre_context VARCHAR(255)
);

-- Add genre to songs table if it doesn't exist
ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre VARCHAR(255);

-- Enable RLS and add basic policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own activity" ON activity_log FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own listening history" ON listening_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own listening history" ON listening_history FOR SELECT USING (auth.uid() = user_id);

-- Add mood_tag to songs table if it doesn't exist
ALTER TABLE songs ADD COLUMN IF NOT EXISTS mood_tag VARCHAR(255);

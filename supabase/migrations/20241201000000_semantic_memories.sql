-- Semantic Memories Table
-- Stores cross-session memories for the AI builder
-- Used for persistent user preferences, decisions, and context

-- Create the semantic_memories table
CREATE TABLE IF NOT EXISTS semantic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('preference', 'decision', 'project', 'feature', 'style', 'error_solution')),
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_semantic_memories_user_id ON semantic_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_type ON semantic_memories(type);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_keywords ON semantic_memories USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_importance ON semantic_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_last_accessed ON semantic_memories(last_accessed_at DESC);

-- Enable Row Level Security
ALTER TABLE semantic_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own memories
CREATE POLICY "Users can manage own memories" ON semantic_memories
  FOR ALL USING (auth.uid() = user_id);

-- Function to increment access count atomically
CREATE OR REPLACE FUNCTION increment_access_count(memory_id UUID)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  UPDATE semantic_memories
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = memory_id
  RETURNING access_count;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_access_count(UUID) TO authenticated;

-- Comment on table and columns
COMMENT ON TABLE semantic_memories IS 'Stores cross-session semantic memories for the AI builder';
COMMENT ON COLUMN semantic_memories.type IS 'Category of memory: preference, decision, project, feature, style, or error_solution';
COMMENT ON COLUMN semantic_memories.content IS 'The actual memory content';
COMMENT ON COLUMN semantic_memories.keywords IS 'Extracted keywords for search';
COMMENT ON COLUMN semantic_memories.importance IS 'Importance score between 0 and 1';
COMMENT ON COLUMN semantic_memories.context IS 'Original context where the memory was extracted from';
COMMENT ON COLUMN semantic_memories.access_count IS 'Number of times this memory has been accessed';

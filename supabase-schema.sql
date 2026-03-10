-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'candidate')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  location TEXT,
  subtitle TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  id_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  working_hours INTEGER NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create job_roles table
CREATE TABLE job_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  dress_code TEXT NOT NULL,
  req_male INTEGER NOT NULL DEFAULT 0,
  req_female INTEGER NOT NULL DEFAULT 0,
  budget_male INTEGER NOT NULL DEFAULT 0,
  budget_female INTEGER NOT NULL DEFAULT 0,
  filled_male INTEGER NOT NULL DEFAULT 0,
  filled_female INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create applications table
CREATE TABLE applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(job_role_id, candidate_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create reviews table
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  likert_scale INTEGER NOT NULL CHECK (likert_scale >= 1 AND likert_scale <= 5),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, candidate_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified for prototype)
-- Profiles: Anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events: Anyone can read, organizers can create/update/delete their own
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Organizers can insert events" ON events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update own events" ON events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete own events" ON events FOR DELETE USING (auth.uid() = organizer_id);

-- Job Roles: Anyone can read, organizers can create/update roles for their events
CREATE POLICY "Job roles are viewable by everyone" ON job_roles FOR SELECT USING (true);
CREATE POLICY "Organizers can insert job roles" ON job_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM events WHERE id = job_roles.event_id AND organizer_id = auth.uid())
);
CREATE POLICY "Organizers can update job roles" ON job_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM events WHERE id = job_roles.event_id AND organizer_id = auth.uid())
);

-- Applications: Candidates can read/insert their own, Organizers can read/update apps for their events
CREATE POLICY "Candidates can view own applications" ON applications FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Organizers can view applications for their events" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = applications.event_id AND organizer_id = auth.uid())
);
CREATE POLICY "Candidates can insert applications" ON applications FOR INSERT WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Organizers can update applications for their events" ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM events WHERE id = applications.event_id AND organizer_id = auth.uid())
);

-- Messages: Users can read messages they sent or received, and insert messages they send
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Reviews: Anyone can read, Organizers can insert for their events
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Organizers can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = organizer_id);

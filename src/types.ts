export interface Profile {
  id: string;
  role: 'organizer' | 'candidate';
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  location?: string;
  subtitle?: string;
  is_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified';
  id_proof_url?: string;
  gender?: 'male' | 'female';
  age?: string;
  height?: string;
  education?: string;
}

export interface JobRole {
  id: string;
  event_id: string;
  title: string;
  dress_code: string;
  req_male: number;
  req_female: number;
  budget_male: number;
  budget_female: number;
  filled_male: number;
  filled_female: number;
}

export interface EventPost {
  id: string;
  organizer_id: string;
  name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  working_hours: number;
  location: string;
  description: string;
  status: 'open' | 'closed';
  created_at: string;
  roles?: JobRole[];
}

export interface Application {
  id: string;
  event_id: string;
  job_role_id: string;
  candidate_id: string;
  status: 'pending' | 'accepted' | 'declined';
  applied_at: string;
  gender: 'male' | 'female';
  event?: EventPost;
  job_role?: JobRole;
  candidate?: Profile;
}
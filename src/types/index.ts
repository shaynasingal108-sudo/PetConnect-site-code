export interface Profile {
  id: string;
  user_id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  country?: string;
  city?: string;
  neighborhood?: string;
  pet_type?: string;
  pet_breed?: string;
  experience_level?: string;
  points: number;
  is_business: boolean;
  business_name?: string;
  business_description?: string;
  business_logo?: string;
  business_category?: string;
  business_years?: number;
  theme_color: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  city?: string;
  helpful_count: number;
  group_id?: string;
  boost_until?: string;
  boost_level?: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  likes?: Like[];
  comments?: Comment[];
  helpful_marks?: HelpfulMark[];
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface HelpfulMark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  image_url?: string;
  city?: string;
  tags?: string[];
  is_community: boolean;
  requires_approval: boolean;
  created_at: string;
  profiles?: Profile;
  group_memberships?: GroupMembership[];
}

export interface GroupMembership {
  id: string;
  user_id: string;
  group_id: string;
  status: string;
  role: string;
  created_at: string;
}

export interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  created_by: string;
  created_at: string;
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  saved_posts?: SavedPost[];
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  board_id?: string;
  created_at: string;
  posts?: Post;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content?: string;
  related_id?: string;
  read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_type: string;
  reported_name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface AILifeEntry {
  id: string;
  user_id: string;
  pet_name?: string;
  pet_type?: string;
  pet_breed?: string;
  entry_type: string;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  points: number;
  completed: boolean;
  created_at: string;
}

export type ThemeColor = 'teal' | 'amber' | 'sage' | 'lavender' | 'rose';

export interface BusinessRating {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

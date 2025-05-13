export interface User {
  username: string;
  user_id: string;
  display_name: string;
  avatar: string;
  is_bot: boolean;
  league_id?: string;
  is_owner?: boolean;
}

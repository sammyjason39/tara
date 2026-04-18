export class MentorshipPair {
  id: string;
  tenant_id: string;
  mentorId: string;
  menteeId: string;
  status: string; // ACTIVE, COMPLETED, TERMINATED
  start_date: Date;
  end_date?: Date;
  focusSkills: string[];
  created_at: Date;
  updated_at: Date;

  mentor?: any;
  mentee?: any;
}

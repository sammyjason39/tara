export type RecruitmentStage =
  | "open"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "closed";

export type JobRequisition = {
  id: string;
  tenantId: string;
  title: string;
  departmentId: string;
  openings: number;
  stage: RecruitmentStage;
  createdAt: string;
  updatedAt: string;
};

export type CandidateRecord = {
  id: string;
  tenantId: string;
  requisitionId: string;
  name: string;
  stage: RecruitmentStage;
  createdAt: string;
  updatedAt: string;
};

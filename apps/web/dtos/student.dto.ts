export type StudentStatus = "active" | "inactive";
export type StudentGender = "male" | "female";

export interface StudentListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface StudentClassItem {
  class: {
    id: string;
    name: string;
  };
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
  effectiveTuitionPerSession?: number | null;
  effectiveTuitionPackageTotal?: number | null;
  effectiveTuitionPackageSession?: number | null;
  tuitionPackageSource?: "custom" | "class" | "unset";
}

/** Item from GET /student list */
export interface StudentListItem {
  id: string;
  fullName: string;
  email?: string | null;
  accountBalance?: number | null;
  school?: string | null;
  province?: string | null;
  status?: StudentStatus;
  gender?: StudentGender;
  createdAt?: string;
  updatedAt?: string;
  studentClasses?: StudentClassItem[];
}

export interface StudentListResponse {
  data: StudentListItem[];
  meta: StudentListMeta;
}

/** Detail from GET /student/:id */
export interface StudentDetail extends StudentListItem {
  birthYear?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  goal?: string | null;
  dropOutDate?: string | null;
}

export interface UpdateStudentPayload {
  full_name?: string;
  email?: string;
  school?: string;
  province?: string;
  birth_year?: number;
  parent_name?: string;
  parent_phone?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  goal?: string;
  drop_out_date?: string;
}

export interface UpdateStudentAccountBalancePayload {
  student_id: string;
  amount: number;
}

export interface UpdateStudentClassesPayload {
  class_ids: string[];
}

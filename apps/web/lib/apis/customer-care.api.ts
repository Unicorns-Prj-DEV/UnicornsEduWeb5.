import type {
  CustomerCareStudentItem,
  CustomerCareCommissionItem,
  CustomerCareSessionCommissionItem,
} from "@/dtos/customer-care.dto";
import { api } from "../client";

export async function getCustomerCareStudents(
  staffId: string
): Promise<CustomerCareStudentItem[]> {
  const res = await api.get<CustomerCareStudentItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students`
  );
  return res.data;
}

export async function getCustomerCareCommissions(
  staffId: string,
  days?: number
): Promise<CustomerCareCommissionItem[]> {
  const params = days != null ? { days } : {};
  const res = await api.get<CustomerCareCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/commissions`,
    { params }
  );
  return res.data;
}

export async function getCustomerCareSessionCommissions(
  staffId: string,
  studentId: string,
  days?: number
): Promise<CustomerCareSessionCommissionItem[]> {
  const params = days != null ? { days } : {};
  const res = await api.get<CustomerCareSessionCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students/${encodeURIComponent(studentId)}/session-commissions`,
    { params }
  );
  return res.data;
}

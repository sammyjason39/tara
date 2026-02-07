export const formatDate = (
  date: string | Date,
  withTime: boolean = false,
): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return withTime
    ? d.toLocaleString("id-ID", { hour12: false })
    : d.toLocaleDateString("id-ID");
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isOverdue = (dueDate: string | Date): boolean => {
  const today = new Date();
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return today > due;
};

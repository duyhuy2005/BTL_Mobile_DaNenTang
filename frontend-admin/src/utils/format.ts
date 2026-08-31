export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + ' đ';
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('vi-VN');
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('vi-VN');
};

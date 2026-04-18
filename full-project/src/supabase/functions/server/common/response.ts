// ApiResponse / PageResponse — mirror cấu trúc của warehouse-service
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  errorCode?: string | null;
  timestamp: string;
};

export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { success: true, message, data, errorCode: null, timestamp: new Date().toISOString() };
}

export function fail(message: string, errorCode = 'ERROR'): ApiResponse<null> {
  return { success: false, message, data: null, errorCode, timestamp: new Date().toISOString() };
}

export type PageResponse<T> = {
  content: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export function page<T>(content: T[], pageNo: number, pageSize: number, total: number): PageResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { content, pageNo, pageSize, totalElements: total, totalPages, last: pageNo + 1 >= totalPages };
}

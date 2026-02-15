export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
      };
    };

export type PaginationParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
};

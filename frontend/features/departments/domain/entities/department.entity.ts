export interface Department {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface DepartmentInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly sortOrder?: number;
}

export interface DepartmentUpdate extends Partial<DepartmentInput> {
  readonly isActive?: boolean;
}

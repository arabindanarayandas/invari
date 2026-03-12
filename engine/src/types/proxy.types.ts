export type RequestStatus = 'stable' | 'repaired' | 'blocked';

export interface ValidationError {
  field: string;
  message: string;
  path: string;
  errorType: ErrorType;
}

export const ERROR_TYPE = {
  MISSING_PROPERTY: 'MISSING_PROPERTY',
  ADDITIONAL_PROPERTY: 'ADDITIONAL_PROPERTY',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ERROR_TYPE[keyof typeof ERROR_TYPE];

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export type RepairAction =
  | {
      type: 'field_rename';
      from: string;
      to: string;
      confidence: number;
    }
  | {
      type: 'type_coercion';
      field: string;
      fromType: string;
      toType: string;
      originalValue: any;
      coercedValue: any;
    }
  | {
      type: 'field_removed';
      field: string;
      reason: string;
    }
  | {
      type: 'default_injection';
      field: string;
      value: any;
      source: 'schema_default' | 'smart_inference';
    }
  | {
      type: 'repair_failed';
      field: string;
      reason: string;
    }
  // Legacy format for backwards compatibility
  | {
      field: string;
      originalValue: any;
      correctedValue: any;
      action: 'renamed' | 'type_coerced' | 'default_injected';
      reason: string;
    };

export interface RepairResult {
  success: boolean;
  repairedBody: object;
  repairs: RepairAction[];
}

export interface ProxyLogData {
  agentId: string;
  agentIdentifier?: string;
  timestamp?: Date;
  httpMethod: string;
  endpointPath: string;
  latencyTotalMs: number;
  overheadMs: number;
  status: RequestStatus;
  requestHeaders?: object | null;
  queryParams?: object | null;
  originalBody: object;
  sanitizedBody: object | null;
  responseStatus?: number | null;
  responseHeaders?: object | null;
  responseBody?: object | null;
  driftDetails: RepairAction[] | ValidationError[] | null;
}

export interface RequestLog {
  id: string;
  agentId: string;
  timestamp: Date;
  agentIdentifier: string | null;
  httpMethod: string;
  endpointPath: string;
  latencyTotalMs: number | null;
  overheadMs: number | null;
  status: RequestStatus;
  requestHeaders: object | null;
  queryParams: object | null;
  originalBody: object | null;
  sanitizedBody: object | null;
  responseStatus: number | null;
  responseHeaders: object | null;
  responseBody: object | null;
  driftDetails: object | null;
}

export interface DashboardStats {
  totalRequests: number;
  stableCount: number;
  repairedCount: number;
  blockedCount: number;
  avgLatency: number;
  avgOverhead: number;
}

export interface InvariChange {
  field: string;
  action: 'field_rename' | 'type_coercion' | 'default_injection' | 'field_removed';
  original: any;
  fixed: any;
  reason: string; // Natural language explanation
  spec_ref?: string; // JSON pointer to schema
}

export interface InvariFeedback {
  repaired: boolean;
  changes: InvariChange[];
  confidence: number;
  message: string; // Human-readable summary
}

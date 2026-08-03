import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { MasterPlanningRecord } from '../contracts/master-planning.contract';

export type FilterName = 'rank' | 'vessel' | 'status' | 'recruiter';
export type MovementType = 'SIGN_ON' | 'ROTATIONAL';
export type JsonRecord = Record<string, unknown>;

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectedFilter {
  name: FilterName;
  queryName: string;
  queryValue: string;
  label: string;
  reference: JsonRecord | string;
}

export interface SelectedCrew {
  id?: string;
  name: string;
  contractId?: string;
  movement?: MovementType;
}

export interface PlanningEvaluation {
  recordId: string;
  rankId?: string;
  crewId?: string;
  actualStatus?: string;
  expectedStatus: string;
  contractId?: string;
  contractStatus?: string;
  actualSignOn?: string;
  actualStartDate?: string;
  actualExpectedEndDate?: string;
  expectedEndDate?: string;
  expectedDuration?: number;
  actualDuration?: number;
  expectedExtendedDuration?: number;
  actualExtendedDuration?: number;
  hasActiveCrew: boolean;
  hasValidReliever: boolean;
  reason: string;
}

export interface CrewReplacementTransaction {
  vesselId: string;
  vesselRankId: string;
  originalCrewName: string;
  originalStatus: 'EXPIRED' | 'EXPIRING';
  candidateCrewId?: string;
  candidateCrewName?: string;
  nomineeVesselPlanId?: string;
  proceeded: boolean;
}

export class RemoraWorld extends World {
  request!: APIRequestContext;
  token?: string;
  companyId?: string;
  lastResponse?: APIResponse;
  lastResponseBody?: unknown;
  requestLog: string[] = [];

  companySearchResults: JsonRecord[] = [];
  analytics: Record<string, number> = {};
  masterPlanning?: Pagination;
  onTrackTotal?: number;
  selectedFilters: Partial<Record<FilterName, SelectedFilter>> = {};
  activeFilters: Record<string, string> = {};
  selectedCrew?: SelectedCrew;
  selectedPlanningRecord?: MasterPlanningRecord;
  planningEvaluations: PlanningEvaluation[] = [];
  planningSummary?: Record<'expired' | 'expiring' | 'confirmed' | 'vacant', number>;
  expectedPlanningSummary?: Record<'expired' | 'expiring' | 'confirmed' | 'vacant', number>;
  crewReplacement?: CrewReplacementTransaction;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(RemoraWorld);

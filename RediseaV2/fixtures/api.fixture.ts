import { test as base } from '@playwright/test';
import { ApiClient } from '../utils/api.client';
import { AuthService } from '../services/auth.service';
import { CompanyService } from '../services/company.service';
import { StakeholderService } from '../services/stakeholder.service';
import { CrewService } from '../services/crew.service';
import { CrewTemplateService } from '../services/crewTemplate.service';
import { RankService } from '../services/rank.service';
import { VesselService } from '../services/vessel.service';

type ApiFixtures = {
  apiClient: ApiClient;
  authService: AuthService;
  companyService: CompanyService;
  stakeholderService: StakeholderService;
  crewService: CrewService;
  crewTemplateService: CrewTemplateService;
  rankService: RankService;
  vesselService : VesselService;
};

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ baseURL }, use) => {
    const apiClient = new ApiClient(baseURL!);
    await apiClient.init();
    await use(apiClient);
    await apiClient.dispose();
  },

  authService: async ({ apiClient }, use) => {
    const authService = new AuthService(apiClient);
    await use(authService);
  },

  companyService: async ({ apiClient }, use) => {
    const companyService = new CompanyService(apiClient);
    await use(companyService);
  },

  stakeholderService: async ({ apiClient }, use) => {
    const stakeholderService = new StakeholderService(apiClient);
    await use(stakeholderService);
  },

  crewService: async ({ apiClient }, use) => {
    const crewService = new CrewService(apiClient);
    await use(crewService);
  },

  crewTemplateService: async ({ apiClient }, use) => {
    const service = new CrewTemplateService(apiClient);
    await use(service);
  },

  rankService: async ({ apiClient }, use) => {
    const rankService = new RankService(apiClient);
    await use(rankService);
  },

vesselService: async ({ apiClient }, use) => {
  const vesselService = new VesselService(apiClient);
  await use(vesselService);
}
  
});

export { expect } from '@playwright/test';
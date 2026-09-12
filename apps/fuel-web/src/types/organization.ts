export type CreditType = 'DAILY' | 'MONTHLY' | 'BOTH';

export type OrganizationVehicle = {
  id: string;
  registration: string;
  type?: string | null;
  makeModel?: string | null;
  driver?: string | null;
  notes?: string | null;
  active: boolean;
};

export type Organization = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  creditLimit?: string | number;
  creditType: CreditType;
  active: boolean;
  vehicles: OrganizationVehicle[];
};

export type Vehicle = OrganizationVehicle & {
  organizationId: string;
  organization?: { id: string; name: string; active: boolean };
};

export type OrganizationInput = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditType?: CreditType;
  active?: boolean;
};

export type VehicleInput = {
  registration: string;
  type?: string;
  makeModel?: string;
  driver?: string;
  notes?: string;
  active?: boolean;
};

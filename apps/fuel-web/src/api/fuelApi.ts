const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

export type FuelDashboard = {
  station: { id: string; name: string; code: string };
  today: {
    sales: number;
    litres: number;
    receivedCost: number;
    payments: number;
    expenses: number;
    creditOutstanding: number;
  };
  tanks: Array<{
    id: string;
    name: string;
    currentStock: number;
    capacity: number;
    fuelType: { name: string; sellingPrice: string };
  }>;
};

export async function getFuelDashboard(): Promise<FuelDashboard> {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('auth_token');
  const response = await fetch(`${apiUrl}/fuel/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Unable to load the fuel dashboard.');
  }
  return response.json() as Promise<FuelDashboard>;
}

export interface JobRole {
  id: string;
  title: string;
  dressCode: string;
  reqMale: number;
  reqFemale: number;
  budgetMale: number;
  budgetFemale: number;
  filledMale: number;
  filledFemale: number;
}

export interface EventPost {
  id: string;
  organizerId: string;
  name: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  workingHours: number;
  location: string;
  description: string;
  status: 'open' | 'closed';
  roles: JobRole[];
}

export interface Application {
  id: string;
  eventId: string;
  jobRoleId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'declined';
  appliedAt: string;
  gender: 'male' | 'female';
}

export const mockEvents: EventPost[] = [
  {
    id: 'evt-1',
    organizerId: 'org-1',
    name: 'Tech Conference 2026',
    startDate: '2026-03-15',
    endDate: '2026-03-17',
    startTime: '08:00 AM',
    endTime: '06:00 PM',
    workingHours: 10,
    location: 'Moscone Center, San Francisco',
    description: 'A large tech conference needing runners and ushers.',
    status: 'open',
    roles: [
      {
        id: 'role-1',
        title: 'Runner',
        dressCode: 'Black T-shirt, Jeans',
        reqMale: 5,
        reqFemale: 5,
        budgetMale: 150,
        budgetFemale: 150,
        filledMale: 2,
        filledFemale: 5, // Female requirement full
      },
      {
        id: 'role-2',
        title: 'Usher',
        dressCode: 'Formal Suit',
        reqMale: 2,
        reqFemale: 3,
        budgetMale: 200,
        budgetFemale: 220,
        filledMale: 2, // Male requirement full
        filledFemale: 1,
      }
    ]
  },
  {
    id: 'evt-2',
    organizerId: 'org-1',
    name: 'Music Festival VIP Lounge',
    startDate: '2026-04-10',
    endDate: '2026-04-12',
    startTime: '04:00 PM',
    endTime: '02:00 AM',
    workingHours: 10,
    location: 'Golden Gate Park',
    description: 'VIP lounge staff for the upcoming music festival.',
    status: 'closed',
    roles: [
      {
        id: 'role-3',
        title: 'Bartender',
        dressCode: 'All Black',
        reqMale: 2,
        reqFemale: 2,
        budgetMale: 300,
        budgetFemale: 300,
        filledMale: 2,
        filledFemale: 2,
      }
    ]
  }
];

export const mockApplications: Application[] = [
  {
    id: 'app-1',
    eventId: 'evt-1',
    jobRoleId: 'role-1',
    candidateId: 'cand-1',
    status: 'pending',
    appliedAt: '2026-02-20T10:00:00Z',
    gender: 'female'
  }
];

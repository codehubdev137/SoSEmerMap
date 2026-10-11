export type PinStatus = 'urgent' | 'in_progress' | 'resolved';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface EmergencyPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: 'accident' | 'robbery' | 'fire' | 'medical' | 'other';
  description: string;
  locationName?: string;
  imageUrl?: string;
  contact?: string;
  status: PinStatus;
  createdAt: number; // timestamp
  comments: Comment[];
}

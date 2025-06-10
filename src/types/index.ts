export interface MediaOutlet {
  outlet: string;
  owner: string;
  founding_year: number;
  end_year?: number;
  audience_size: number;
}

export interface OwnershipNode {
  id: string;
  name: string;
  type: 'owner' | 'outlet';
  children?: OwnershipNode[];
  outlet?: MediaOutlet;
}
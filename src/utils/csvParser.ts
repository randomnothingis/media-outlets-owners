import { MediaOutlet } from '../types';

export const parseCSV = async (filePath: string): Promise<MediaOutlet[]> => {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const outlet: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'founding_year' || header === 'end_year') {
          outlet[header] = value ? parseInt(value) : undefined;
        } else if (header === 'audience_size') {
          outlet[header] = parseInt(value);
        } else {
          outlet[header] = value;
        }
      });
      
      return outlet as MediaOutlet;
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export const groupByOwner = (outlets: MediaOutlet[]): OwnershipNode[] => {
  const ownerMap = new Map<string, MediaOutlet[]>();
  
  outlets.forEach(outlet => {
    if (!ownerMap.has(outlet.owner)) {
      ownerMap.set(outlet.owner, []);
    }
    ownerMap.get(outlet.owner)!.push(outlet);
  });
  
  return Array.from(ownerMap.entries()).map(([owner, outlets]) => ({
    id: owner,
    name: owner,
    type: 'owner' as const,
    children: outlets.map(outlet => ({
      id: outlet.outlet,
      name: outlet.outlet,
      type: 'outlet' as const,
      outlet
    }))
  }));
};
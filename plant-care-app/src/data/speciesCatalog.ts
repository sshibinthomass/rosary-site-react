import profiles from './species.generated.json';

export type PlantCategory = 'houseplant' | 'succulent' | 'cactus' | 'balcony';

export interface PlantSpeciesProfile {
  id: string;
  productId: string;
  name: string;
  scientificName: string;
  commonNames: string[];
  category: PlantCategory;
  difficulty: string;
  sunlight: string;
  watering: string;
  soil: string;
  northIndiaNote: string;
  southIndiaNote: string;
}

const species = profiles as PlantSpeciesProfile[];

export function getPublishedSpecies(): PlantSpeciesProfile[] {
  return species;
}

export function searchSpecies(query: string): PlantSpeciesProfile[] {
  const normalized = query.trim().toLocaleLowerCase('en-IN');
  if (!normalized) return species;

  return species.filter((profile) => (
    profile.name.toLocaleLowerCase('en-IN').includes(normalized) ||
    profile.scientificName.toLocaleLowerCase('en-IN').includes(normalized) ||
    profile.commonNames.some((name) => name.toLocaleLowerCase('en-IN').includes(normalized))
  ));
}

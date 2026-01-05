
export type ODataVersion = 'V2' | 'V3' | 'V4' | 'Unknown';

export interface EntityProperty {
    name: string;
    type: string;
    nullable: boolean;
    maxLength?: number;
    fixedLength?: boolean;
    precision?: number;
    scale?: number;
    unicode?: boolean;
    defaultValue?: any;
    concurrencyMode?: string;
    customAttributes?: Record<string, string>;
}

export interface NavigationProperty {
    name: string;
    targetType: string; // e.g., "Collection(Namespace.Type)" or "Namespace.Type"
    sourceMultiplicity?: string; // '1', '0..1', '*'
    targetMultiplicity?: string;
    constraints?: { sourceProperty: string; targetProperty: string }[];
}

export interface EntityType {
    name: string;
    keys: string[];
    properties: EntityProperty[];
    navigationProperties: NavigationProperty[];
    namespace?: string;
}

export interface ComplexType {
    name: string;
    properties: EntityProperty[];
}

export interface EntitySet {
    name: string;
    entityType: string; // Full qualified name
}

export interface ParsedSchema {
    version: ODataVersion;
    namespace: string;
    entities: EntityType[];
    complexTypes: ComplexType[];
    entitySets: EntitySet[];
}

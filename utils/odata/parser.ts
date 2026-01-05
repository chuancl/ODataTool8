
import { ParsedSchema, ODataVersion, EntityType, ComplexType, EntitySet, NavigationProperty, EntityProperty } from './types';

// Helper: Parse Properties
const parseProperties = (element: Element): EntityProperty[] => {
    const properties: EntityProperty[] = [];
    const props = element.getElementsByTagName("Property");
    
    const STANDARD_ATTRS = new Set([
        'Name', 'Type', 'Nullable', 'MaxLength', 'FixedLength', 
        'Precision', 'Scale', 'Unicode', 'DefaultValue', 'ConcurrencyMode'
    ]);

    for (let i = 0; i < props.length; i++) {
        const propNode = props[i];
        const customAttributes: Record<string, string> = {};

        const name = propNode.getAttribute("Name") || "";
        const type = (propNode.getAttribute("Type") || "").trim();
        const nullable = propNode.getAttribute("Nullable") !== "false";
        const maxLength = propNode.getAttribute("MaxLength") ? parseInt(propNode.getAttribute("MaxLength")!) : undefined;
        const fixedLength = propNode.getAttribute("FixedLength") === "true";
        const precision = propNode.getAttribute("Precision") ? parseInt(propNode.getAttribute("Precision")!) : undefined;
        const scale = propNode.getAttribute("Scale") ? parseInt(propNode.getAttribute("Scale")!) : undefined;
        const unicode = propNode.getAttribute("Unicode") !== "false";
        const defaultValue = propNode.getAttribute("DefaultValue") || undefined;
        const concurrencyMode = propNode.getAttribute("ConcurrencyMode") || undefined;

        for (let j = 0; j < propNode.attributes.length; j++) {
            const attr = propNode.attributes[j];
            if (!STANDARD_ATTRS.has(attr.name) && !attr.name.startsWith('xmlns')) {
                customAttributes[attr.name] = attr.value;
            }
        }

        properties.push({
            name, type, nullable, maxLength, fixedLength, precision, scale, unicode, defaultValue, concurrencyMode,
            customAttributes: Object.keys(customAttributes).length > 0 ? customAttributes : undefined
        });
    }
    return properties;
};

// 3. Parse Metadata XML to Schema Object
export const parseMetadataToSchema = (xmlContent: string): ParsedSchema => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");
    
    // Detect Version from XML
    let version: ODataVersion = 'Unknown';
    const edmxNode = doc.getElementsByTagName("edmx:Edmx")[0] || doc.getElementsByTagName("Edmx")[0];
    if (edmxNode) {
        const v = edmxNode.getAttribute("Version");
        if (v === "4.0") version = "V4";
        else if (v === "1.0") version = "V2";
    }

    // Find Schema Node
    const schemaNodes = doc.getElementsByTagName("Schema");
    if (schemaNodes.length === 0) throw new Error("No Schema definition found");
    
    const schemaNode = schemaNodes[0]; // Usually the first one defines the domain model
    const namespace = schemaNode.getAttribute("Namespace") || "";

    const entities: EntityType[] = [];
    const complexTypes: ComplexType[] = [];
    const entitySets: EntitySet[] = [];

    // Parse EntityTypes
    const entityTypeNodes = schemaNode.getElementsByTagName("EntityType");
    for (let i = 0; i < entityTypeNodes.length; i++) {
        const node = entityTypeNodes[i];
        const name = node.getAttribute("Name") || "";
        
        // Keys
        const keys: string[] = [];
        const keyNode = node.getElementsByTagName("Key")[0];
        if (keyNode) {
            const propertyRefs = keyNode.getElementsByTagName("PropertyRef");
            for (let j = 0; j < propertyRefs.length; j++) {
                keys.push(propertyRefs[j].getAttribute("Name") || "");
            }
        }

        // Properties
        const properties = parseProperties(node);

        // Navigation Properties
        const navProps: NavigationProperty[] = [];
        const navNodes = node.getElementsByTagName("NavigationProperty");
        for (let j = 0; j < navNodes.length; j++) {
            const navNode = navNodes[j];
            const navName = navNode.getAttribute("Name") || "";
            let targetType = navNode.getAttribute("Type") || ""; // V4 directly has Type
            
            // V2 uses Relationship + ToRole + AssociationSet lookup (Simplified here)
            if (!targetType && navNode.getAttribute("Relationship")) {
                const relationship = navNode.getAttribute("Relationship");
                const toRole = navNode.getAttribute("ToRole");
                targetType = `[Association: ${relationship} -> ${toRole}]`; 
            }

            // Constraints (ReferentialConstraint)
            const constraints: { sourceProperty: string; targetProperty: string }[] = [];
            const constraintNode = navNode.getElementsByTagName("ReferentialConstraint")[0];
            if (constraintNode) {
                 const principal = constraintNode.getElementsByTagName("Principal")[0];
                 const dependent = constraintNode.getElementsByTagName("Dependent")[0];
                 if (principal && dependent) {
                     const pRefs = principal.getElementsByTagName("PropertyRef");
                     const dRefs = dependent.getElementsByTagName("PropertyRef");
                     for(let k=0; k < Math.min(pRefs.length, dRefs.length); k++) {
                         constraints.push({
                             sourceProperty: dRefs[k].getAttribute("Name") || "",
                             targetProperty: pRefs[k].getAttribute("Name") || ""
                         });
                     }
                 }
            }

            navProps.push({
                name: navName,
                targetType,
                constraints: constraints.length > 0 ? constraints : undefined
            });
        }

        entities.push({ name, keys, properties, navigationProperties: navProps, namespace });
    }

    // Parse ComplexTypes
    const complexTypeNodes = schemaNode.getElementsByTagName("ComplexType");
    for (let i = 0; i < complexTypeNodes.length; i++) {
        const node = complexTypeNodes[i];
        const name = node.getAttribute("Name") || "";
        const properties = parseProperties(node);
        complexTypes.push({ name, properties });
    }

    // Parse EntitySets (from EntityContainer)
    const containerNodes = schemaNode.getElementsByTagName("EntityContainer");
    for (let i = 0; i < containerNodes.length; i++) {
        const sets = containerNodes[i].getElementsByTagName("EntitySet");
        for (let j = 0; j < sets.length; j++) {
            const set = sets[j];
            const name = set.getAttribute("Name") || "";
            const entityType = set.getAttribute("EntityType") || "";
            entitySets.push({ name, entityType });
        }
    }

    return { version, namespace, entities, complexTypes, entitySets };
};
